import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SavedJobsService } from './saved-jobs.service';
import { SavedJob } from './schemas/saved-job.schema';
import { IUser } from 'src/users/users.interface';

function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.select = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(items);
    query.exec = jest.fn().mockResolvedValue(items);
    return query;
}

describe('SavedJobsService', () => {
    let service: SavedJobsService;
    let savedJobModel: {
        findOneAndUpdate: jest.Mock;
        find: jest.Mock;
        countDocuments: jest.Mock;
        deleteOne: jest.Mock;
    };

    const actingUser = { _id: 'user1', email: 'user@b.com' } as IUser;
    const validJobId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        savedJobModel = {
            findOneAndUpdate: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            deleteOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SavedJobsService,
                { provide: getModelToken(SavedJob.name), useValue: savedJobModel },
            ],
        }).compile();

        service = module.get<SavedJobsService>(SavedJobsService);
    });

    describe('create', () => {
        it('upserts by (userId, jobId) so re-saving the same job is idempotent', async () => {
            savedJobModel.findOneAndUpdate.mockResolvedValue({
                _id: 'sj1',
                jobId: validJobId,
                createdAt: '2026-01-01',
            });

            await service.create({ jobId: validJobId }, actingUser);

            expect(savedJobModel.findOneAndUpdate).toHaveBeenCalledWith(
                { userId: 'user1', jobId: validJobId },
                expect.objectContaining({ $setOnInsert: expect.objectContaining({ userId: 'user1', jobId: validJobId }) }),
                { upsert: true, new: true },
            );
        });
    });

    describe('findByUser', () => {
        it('forces filter.userId to the acting user even if the query string spoofs a different one', async () => {
            savedJobModel.countDocuments.mockResolvedValue(0);
            savedJobModel.find.mockReturnValue(makeFindResult([]));

            await service.findByUser(1, 10, 'userId=someone-else', actingUser);

            expect(savedJobModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1' }));
            expect(savedJobModel.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1' }));
        });
    });

    describe('findSavedJobIds', () => {
        it('returns saved job ids as strings', async () => {
            const query: any = {
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([{ jobId: validJobId }]),
            };
            savedJobModel.find.mockReturnValue(query);

            const result = await service.findSavedJobIds(actingUser);

            expect(savedJobModel.find).toHaveBeenCalledWith({ userId: 'user1' });
            expect(result).toEqual([validJobId]);
        });
    });

    describe('remove', () => {
        it('throws for an invalid job id', async () => {
            await expect(service.remove('not-an-id', actingUser)).rejects.toThrow(BadRequestException);
        });

        it('deletes only the saved job scoped to the acting user', async () => {
            savedJobModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const result = await service.remove(validJobId, actingUser);

            expect(savedJobModel.deleteOne).toHaveBeenCalledWith({ userId: 'user1', jobId: validJobId });
            expect(result).toEqual({ deleted: 1 });
        });
    });
});
