import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SubscribersService } from './subscribers.service';
import { Subscriber } from './schemas/subscriber.schema';
import { MailService } from 'src/mail/mail.service';
import { IUser } from 'src/users/users.interface';

describe('SubscribersService', () => {
    let service: SubscribersService;
    let subscriberModel: {
        findOne: jest.Mock;
        create: jest.Mock;
        findOneAndUpdate: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };
    let mailService: { sendJobsToSubscriber: jest.Mock };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        subscriberModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            findOneAndUpdate: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };
        mailService = { sendJobsToSubscriber: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscribersService,
                { provide: getModelToken(Subscriber.name), useValue: subscriberModel },
                { provide: MailService, useValue: mailService },
            ],
        }).compile();

        service = module.get<SubscribersService>(SubscribersService);
    });

    describe('create', () => {
        it('throws when the email is already subscribed', async () => {
            subscriberModel.findOne.mockResolvedValue({ _id: 'existing' });

            await expect(
                service.create({ name: 'A', email: 'a@b.com', skills: ['nestjs'] } as any, actingUser),
            ).rejects.toThrow(BadRequestException);
            expect(subscriberModel.create).not.toHaveBeenCalled();
        });

        it('creates the subscriber, stamped with the acting user', async () => {
            subscriberModel.findOne.mockResolvedValue(null);
            subscriberModel.create.mockResolvedValue({ _id: 'sub1', createdAt: '2026-01-01' });

            const result = await service.create(
                { name: 'A', email: 'a@b.com', skills: ['nestjs'] } as any,
                actingUser,
            );

            expect(subscriberModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'a@b.com', createdBy: { _id: actingUser._id, email: actingUser.email } }),
            );
            expect(result).toEqual({ _id: 'sub1', createdBy: '2026-01-01' });
        });
    });

    describe('findOne', () => {
        it('returns a not-found message for an invalid id', async () => {
            const result = await service.findOne('not-an-id');

            expect(result).toBe('not found subscribers');
            expect(subscriberModel.findOne).not.toHaveBeenCalled();
        });

        it('looks up the subscriber by id', async () => {
            subscriberModel.findOne.mockResolvedValue({ _id: validId });

            const result = await service.findOne(validId);

            expect(result).toEqual({ _id: validId });
        });
    });

    describe('update', () => {
        it('upserts by email and sends matching jobs when a subscriber comes back', async () => {
            subscriberModel.findOneAndUpdate.mockResolvedValue({ email: actingUser.email, skills: ['nestjs'] });

            const result = await service.update({ skills: ['nestjs'] } as any, actingUser);

            expect(subscriberModel.findOneAndUpdate).toHaveBeenCalledWith(
                { email: actingUser.email },
                expect.objectContaining({ skills: ['nestjs'] }),
                { upsert: true, new: true, setDefaultsOnInsert: true },
            );
            expect(mailService.sendJobsToSubscriber).toHaveBeenCalledWith({ email: actingUser.email, skills: ['nestjs'] });
            expect(result).toEqual({ email: actingUser.email, skills: ['nestjs'] });
        });

        it('still returns the update result when sending the email fails', async () => {
            subscriberModel.findOneAndUpdate.mockResolvedValue({ email: actingUser.email });
            mailService.sendJobsToSubscriber.mockRejectedValue(new Error('smtp down'));

            const result = await service.update({} as any, actingUser);

            expect(result).toEqual({ email: actingUser.email });
        });
    });

    describe('remove', () => {
        it('returns a not-found message for an invalid id', async () => {
            const result = await service.remove('not-an-id', actingUser);

            expect(result).toBe('not found subscribers');
            expect(subscriberModel.updateOne).not.toHaveBeenCalled();
        });

        it('soft-deletes the subscriber, stamped with the acting user', async () => {
            subscriberModel.updateOne.mockResolvedValue({ acknowledged: true });
            subscriberModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(subscriberModel.softDelete).toHaveBeenCalledWith({ _id: validId });
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
