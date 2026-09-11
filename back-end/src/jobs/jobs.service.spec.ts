import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { JobsService } from './jobs.service';
import { Job } from './schemas/job.schema';
import { Subscriber } from 'src/subscribers/schemas/subscriber.schema';
import { User } from 'src/users/schemas/user.schema';
import { NotificationsService } from 'src/notifications/notifications.service';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';

function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.select = jest.fn().mockReturnValue(query);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(items);
    query.exec = jest.fn().mockResolvedValue(items);
    return query;
}

// Cho một chờ đợi nhỏ để các job fire-and-forget (notifyMatchingSubscribers)
// kịp chạy xong trước khi assert, tránh unhandled rejection rò rỉ sang test khác.
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('JobsService', () => {
    let service: JobsService;
    let jobModel: {
        create: jest.Mock;
        find: jest.Mock;
        findById: jest.Mock;
        countDocuments: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };
    let subscriberModel: { find: jest.Mock };
    let userModel: { find: jest.Mock };
    let notificationsService: { createForUser: jest.Mock };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        jobModel = {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };
        subscriberModel = { find: jest.fn().mockReturnValue(makeFindResult([])) };
        userModel = { find: jest.fn().mockReturnValue(makeFindResult([])) };
        notificationsService = { createForUser: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JobsService,
                { provide: getModelToken(Job.name), useValue: jobModel },
                { provide: getModelToken(Subscriber.name), useValue: subscriberModel },
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: NotificationsService, useValue: notificationsService },
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

        it('passes jobType and experienceYears through to the created document', async () => {
            jobModel.create.mockResolvedValue({ _id: 'job1', createdAt: '2026-01-01' });

            await service.create({ name: 'Dev', jobType: 'REMOTE', experienceYears: 3 } as any, actingUser);

            expect(jobModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ jobType: 'REMOTE', experienceYears: 3 }),
            );
        });

        it('notifies subscribers whose skills match the new job, mapped to their user account', async () => {
            const newJob = { _id: 'job1', createdAt: '2026-01-01', name: 'React Dev', skills: ['REACT.JS'], company: { name: 'ACME' } };
            jobModel.create.mockResolvedValue(newJob);
            subscriberModel.find.mockReturnValue(makeFindResult([{ email: 'sub@b.com' }]));
            userModel.find.mockReturnValue(makeFindResult([{ _id: 'user1' }]));

            await service.create({ name: 'React Dev', skills: ['REACT.JS'] } as any, actingUser);
            await flushPromises();

            expect(subscriberModel.find).toHaveBeenCalledWith(expect.objectContaining({ skills: { $in: ['REACT.JS'] } }));
            expect(userModel.find).toHaveBeenCalledWith(expect.objectContaining({ email: { $in: ['sub@b.com'] } }));
            expect(notificationsService.createForUser).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user1', type: 'NEW_JOB_MATCH' }),
            );
        });

        it('does not fail job creation when notifying subscribers throws', async () => {
            jobModel.create.mockResolvedValue({ _id: 'job1', createdAt: '2026-01-01', name: 'Dev', skills: ['NODEJS'] });
            subscriberModel.find.mockImplementation(() => { throw new Error('db down'); });

            const result = await service.create({ name: 'Dev', skills: ['NODEJS'] } as any, actingUser);
            await flushPromises();

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

    describe('findAll search filters', () => {
        it('counts with countDocuments instead of loading every matching document', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));
            jobModel.countDocuments.mockResolvedValue(42);

            const result = await service.findAll(1, 10, '');

            expect(jobModel.countDocuments).toHaveBeenCalled();
            expect(result.meta.total).toBe(42);
        });

        it('turns a keyword into a $text search and strips the raw key from the filter', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));

            await service.findAll(1, 10, 'keyword=react');

            const calledFilter = jobModel.find.mock.calls[0][0];
            expect(calledFilter.$text).toEqual({ $search: 'react' });
            expect(calledFilter.keyword).toBeUndefined();
            expect(jobModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ $text: { $search: 'react' } }));
        });

        it('turns salaryMin/salaryMax into a $gte/$lte range on the existing salary field', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));

            await service.findAll(1, 10, 'salaryMin=15000000&salaryMax=40000000');

            const calledFilter = jobModel.find.mock.calls[0][0];
            expect(calledFilter.salary).toEqual({ $gte: 15000000, $lte: 40000000 });
            expect(calledFilter.salaryMin).toBeUndefined();
            expect(calledFilter.salaryMax).toBeUndefined();
        });

        it('turns expMin/expMax into a $gte/$lte range on experienceYears', async () => {
            jobModel.find.mockReturnValue(makeFindResult([]));

            await service.findAll(1, 10, 'expMin=1&expMax=3');

            const calledFilter = jobModel.find.mock.calls[0][0];
            expect(calledFilter.experienceYears).toEqual({ $gte: 1, $lte: 3 });
            expect(calledFilter.expMin).toBeUndefined();
            expect(calledFilter.expMax).toBeUndefined();
        });

        it('sorts by textScore when a keyword search has no explicit sort', async () => {
            const findResult = makeFindResult([]);
            jobModel.find.mockReturnValue(findResult);

            await service.findAll(1, 10, 'keyword=react');

            expect(findResult.select).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
            expect(findResult.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
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
