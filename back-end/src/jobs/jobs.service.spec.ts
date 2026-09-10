import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { JobsService } from './jobs.service';
import { Job } from './schemas/job.schema';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';

function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(items);
    return query;
}

describe('JobsService', () => {
    let service: JobsService;
    let jobModel: {
        create: jest.Mock;
        find: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        jobModel = {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JobsService,
                { provide: getModelToken(Job.name), useValue: jobModel },
            ],
        }).compile();

        service = module.get<JobsService>(JobsService);
    });

    describe('create', () => {
        it('stamps the job with the acting user and returns only id/createdAt', async () => {
            jobModel.create.mockResolvedValue({ _id: 'job1', createdAt: '2026-01-01', name: 'Dev' });

            const result = await service.create({ name: 'Dev' } as any, actingUser);

            expect(jobModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Dev', createdBy: { _id: actingUser._id, email: actingUser.email } }),
            );
            expect(result).toEqual({ _id: 'job1', createdAt: '2026-01-01' });
        });
    });

    describe('findAll company scoping', () => {
        it('does not scope by company for public/unauthenticated browsing', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));

            await service.findAll(1, 10, '');

            expect(jobModel.find).toHaveBeenCalledWith(expect.not.objectContaining({ 'company._id': expect.anything() }));
        });

        it('does not scope by company for the ADMIN role', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));
            const admin = { ...actingUser, role: { name: ADMIN_ROLE } } as unknown as IUser;

            await service.findAll(1, 10, '', admin);

            expect(jobModel.find).toHaveBeenCalledWith(expect.not.objectContaining({ 'company._id': expect.anything() }));
        });

        it('does not scope by company for a normal job-seeking USER', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));
            const normalUser = { ...actingUser, role: { name: USER_ROLE } } as unknown as IUser;

            await service.findAll(1, 10, '', normalUser);

            expect(jobModel.find).toHaveBeenCalledWith(expect.not.objectContaining({ 'company._id': expect.anything() }));
        });

        it('scopes to the user\'s own company for a company-side account', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));
            const hrUser = { ...actingUser, role: { name: 'HR' }, company: { _id: 'company1' } } as unknown as IUser;

            await service.findAll(1, 10, '', hrUser);

            expect(jobModel.find).toHaveBeenCalledWith(expect.objectContaining({ 'company._id': { $in: ['company1'] } }));
        });

        it('matches company._id stored as either a string or an ObjectId', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));
            const validObjectId = '507f1f77bcf86cd799439099';
            const hrUser = { ...actingUser, role: { name: 'HR' }, company: { _id: validObjectId } } as unknown as IUser;

            await service.findAll(1, 10, '', hrUser);

            const calledFilter = jobModel.find.mock.calls[0][0];
            expect(calledFilter['company._id'].$in).toEqual(
                expect.arrayContaining([validObjectId, expect.any(mongoose.Types.ObjectId)]),
            );
        });
    });

    describe('findOne', () => {
        it('returns a not-found message for an invalid id', async () => {
            const result = await service.findOne('not-an-id');

            expect(result).toBe('not found job');
            expect(jobModel.findById).not.toHaveBeenCalled();
        });

        it('looks up the job by id', async () => {
            jobModel.findById.mockResolvedValue({ _id: validId, name: 'Dev' });

            const result = await service.findOne(validId);

            expect(result).toEqual({ _id: validId, name: 'Dev' });
        });
    });

    describe('remove', () => {
        it('returns a not-found message for an invalid id', async () => {
            const result = await service.remove('not-an-id', actingUser);

            expect(result).toBe('not found job');
            expect(jobModel.updateOne).not.toHaveBeenCalled();
        });

        it('soft-deletes the job, stamped with the acting user', async () => {
            jobModel.updateOne.mockResolvedValue({ acknowledged: true });
            jobModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(jobModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                { deletedBy: { _id: actingUser._id, email: actingUser.email } },
            );
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
