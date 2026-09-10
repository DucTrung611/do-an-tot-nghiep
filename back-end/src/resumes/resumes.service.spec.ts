import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ResumesService } from './resumes.service';
import { Resume } from './schemas/resume.schema';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE } from 'src/databases/sample';

function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.select = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(items);
    return query;
}

describe('ResumesService', () => {
    let service: ResumesService;
    let resumeModel: {
        create: jest.Mock;
        find: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };

    const actingUser = { _id: 'user1', email: 'user@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        resumeModel = {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResumesService,
                { provide: getModelToken(Resume.name), useValue: resumeModel },
            ],
        }).compile();

        service = module.get<ResumesService>(ResumesService);
    });

    describe('create', () => {
        it('creates a PENDING resume with an initial history entry', async () => {
            resumeModel.create.mockResolvedValue({ _id: 'cv1', createdAt: '2026-01-01' });

            const result = await service.create(
                { url: 'cv.pdf', companyId: 'company1', jobId: 'job1' } as any,
                actingUser,
            );

            expect(resumeModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'cv.pdf',
                    userId: actingUser._id,
                    status: 'PENDING',
                    history: [expect.objectContaining({ status: 'PENDING' })],
                }),
            );
            expect(result).toEqual({ _id: 'cv1', createdAt: '2026-01-01' });
        });
    });

    describe('findAll company scoping', () => {
        it('does not scope by company for the ADMIN role', async () => {
            resumeModel.find.mockReturnValue(makeFindResult([]));
            const admin = { ...actingUser, role: { name: ADMIN_ROLE } } as unknown as IUser;

            await service.findAll(1, 10, '', admin);

            expect(resumeModel.find).toHaveBeenCalledWith(expect.not.objectContaining({ companyId: expect.anything() }));
        });

        it('scopes to the user\'s own company for a non-admin account', async () => {
            resumeModel.find.mockReturnValue(makeFindResult([]));
            const hrUser = { ...actingUser, role: { name: 'HR' }, company: { _id: 'company1' } } as unknown as IUser;

            await service.findAll(1, 10, '', hrUser);

            expect(resumeModel.find).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'company1' }));
        });
    });

    describe('findOne', () => {
        it('throws for an invalid id', async () => {
            await expect(service.findOne('not-an-id')).rejects.toThrow(BadRequestException);
        });

        it('looks up the resume by id', async () => {
            resumeModel.findById.mockResolvedValue({ _id: validId });

            const result = await service.findOne(validId);

            expect(result).toEqual({ _id: validId });
        });
    });

    describe('update', () => {
        it('throws for an invalid id', async () => {
            await expect(service.update('not-an-id', 'APPROVED', actingUser)).rejects.toThrow(BadRequestException);
        });

        it('sets the new status and pushes a history entry', async () => {
            resumeModel.updateOne.mockResolvedValue({ acknowledged: true });

            await service.update(validId, 'APPROVED', actingUser);

            expect(resumeModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                expect.objectContaining({
                    status: 'APPROVED',
                    $push: { history: expect.objectContaining({ status: 'APPROVED' }) },
                }),
            );
        });
    });

    describe('remove', () => {
        it('soft-deletes the resume, stamped with the acting user', async () => {
            resumeModel.updateOne.mockResolvedValue({ acknowledged: true });
            resumeModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(resumeModel.softDelete).toHaveBeenCalledWith({ _id: validId });
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
