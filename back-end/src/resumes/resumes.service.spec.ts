import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ResumesService } from './resumes.service';
import { Resume } from './schemas/resume.schema';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE } from 'src/databases/sample';
import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';

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

// Chain kiểu findById(...).select(...).lean() hoặc findOneAndUpdate(...).populate(...)
// đều không gọi .exec() ở cuối, nên chỉ cần resolve giá trị cuối ở bước chain cuối cùng.
function makeChain(finalValue: any) {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockResolvedValue(finalValue);
    chain.populate = jest.fn().mockResolvedValue(finalValue);
    return chain;
}

describe('ResumesService', () => {
    let service: ResumesService;
    let resumeModel: {
        create: jest.Mock;
        find: jest.Mock;
        findById: jest.Mock;
        findOneAndUpdate: jest.Mock;
        countDocuments: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };
    let mailService: { sendResumeStatusUpdate: jest.Mock };
    let notificationsService: { createForUser: jest.Mock };

    const actingUser = { _id: 'user1', email: 'user@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        resumeModel = {
            create: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };
        mailService = {
            sendResumeStatusUpdate: jest.fn().mockResolvedValue(undefined),
        };
        notificationsService = {
            createForUser: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResumesService,
                { provide: getModelToken(Resume.name), useValue: resumeModel },
                { provide: MailService, useValue: mailService },
                { provide: NotificationsService, useValue: notificationsService },
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

        it('throws when the resume does not exist', async () => {
            resumeModel.findById.mockReturnValue(makeChain(null));

            await expect(service.update(validId, 'APPROVED', actingUser)).rejects.toThrow(BadRequestException);
        });

        it('sets the new status, pushes a history entry, and returns the populated document', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'PENDING' }));
            const updatedDoc = {
                _id: validId,
                email: 'candidate@b.com',
                userId: 'user1',
                jobId: { _id: 'job1', name: 'Backend Dev' },
                companyId: { _id: 'company1', name: 'ACME' },
            };
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain(updatedDoc));

            const result = await service.update(validId, 'APPROVED', actingUser);

            expect(resumeModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: validId },
                expect.objectContaining({
                    status: 'APPROVED',
                    $push: { history: expect.objectContaining({ status: 'APPROVED' }) },
                }),
                { new: true },
            );
            expect(result).toEqual(updatedDoc);
        });

        it('sends a status-change email exactly once when the status actually changes', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'PENDING' }));
            const updatedDoc = {
                _id: validId,
                email: 'candidate@b.com',
                jobId: { name: 'Backend Dev' },
                companyId: { name: 'ACME' },
            };
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain(updatedDoc));

            await service.update(validId, 'APPROVED', actingUser);

            expect(mailService.sendResumeStatusUpdate).toHaveBeenCalledTimes(1);
            expect(mailService.sendResumeStatusUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'candidate@b.com',
                    jobName: 'Backend Dev',
                    companyName: 'ACME',
                    status: 'APPROVED',
                }),
            );
        });

        it('does not send an email when the status is unchanged', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'APPROVED' }));
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain({ _id: validId, email: 'candidate@b.com' }));

            await service.update(validId, 'APPROVED', actingUser);

            expect(mailService.sendResumeStatusUpdate).not.toHaveBeenCalled();
        });

        it('does not fail the update when sending the email rejects', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'PENDING' }));
            resumeModel.findOneAndUpdate.mockReturnValue(
                makeChain({ _id: validId, email: 'candidate@b.com' }),
            );
            mailService.sendResumeStatusUpdate.mockRejectedValue(new Error('SMTP down'));

            await expect(service.update(validId, 'APPROVED', actingUser)).resolves.toBeDefined();
        });

        // Regression test: trước khi đổi updateOne -> findOneAndUpdate({new:true}),
        // service không có cách nào biết userId của resume sau khi cập nhật.
        it('notifies the resume owner using the userId taken from the updated document', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'PENDING' }));
            const updatedDoc = {
                _id: validId,
                email: 'candidate@b.com',
                userId: 'candidate-user-1',
                jobId: { _id: 'job1', name: 'Backend Dev' },
                companyId: { _id: 'company1', name: 'ACME' },
            };
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain(updatedDoc));

            await service.update(validId, 'APPROVED', actingUser);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'candidate-user-1',
                    type: 'RESUME_STATUS',
                    link: '/applied-jobs',
                }),
            );
        });

        it('does not notify when the status is unchanged', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'APPROVED' }));
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain({ _id: validId, email: 'candidate@b.com', userId: 'u1' }));

            await service.update(validId, 'APPROVED', actingUser);

            expect(notificationsService.createForUser).not.toHaveBeenCalled();
        });

        it('does not fail the update when creating the notification rejects', async () => {
            resumeModel.findById.mockReturnValue(makeChain({ status: 'PENDING' }));
            resumeModel.findOneAndUpdate.mockReturnValue(makeChain({ _id: validId, email: 'candidate@b.com', userId: 'u1' }));
            notificationsService.createForUser.mockRejectedValue(new Error('ws down'));

            await expect(service.update(validId, 'APPROVED', actingUser)).resolves.toBeDefined();
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
