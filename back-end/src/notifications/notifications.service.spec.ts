import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './schemas/notification.schema';
import { IUser } from 'src/users/users.interface';

function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.exec = jest.fn().mockResolvedValue(items);
    return query;
}

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notificationModel: {
        create: jest.Mock;
        find: jest.Mock;
        countDocuments: jest.Mock;
        updateOne: jest.Mock;
        updateMany: jest.Mock;
    };
    let gateway: { emitToUser: jest.Mock };

    const actingUser = { _id: 'user1', email: 'user@b.com' } as IUser;

    beforeEach(async () => {
        notificationModel = {
            create: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
            updateOne: jest.fn(),
            updateMany: jest.fn(),
        };
        gateway = { emitToUser: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                { provide: getModelToken(Notification.name), useValue: notificationModel },
                { provide: NotificationsGateway, useValue: gateway },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    describe('createForUser', () => {
        it('saves the notification then emits it to the target user\'s room', async () => {
            const saved = { toObject: () => ({ _id: 'n1', userId: 'user2', title: 'Hi' }) };
            notificationModel.create.mockResolvedValue(saved);

            await service.createForUser({ userId: 'user2', type: 'NEW_JOB_MATCH', title: 'Hi', message: 'msg' });

            expect(notificationModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user2', type: 'NEW_JOB_MATCH', title: 'Hi', message: 'msg' }),
            );
            expect(gateway.emitToUser).toHaveBeenCalledWith('user2', 'notification:new', { _id: 'n1', userId: 'user2', title: 'Hi' });
        });
    });

    describe('findByUser', () => {
        it('forces filter.userId to the acting user even if the query string spoofs a different one', async () => {
            notificationModel.countDocuments.mockResolvedValue(0);
            notificationModel.find.mockReturnValue(makeFindResult([]));

            await service.findByUser(1, 10, 'userId=someone-else', actingUser);

            expect(notificationModel.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1' }));
            expect(notificationModel.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1' }));
        });
    });

    describe('countUnread', () => {
        it('counts only unread notifications for the acting user', async () => {
            notificationModel.countDocuments.mockResolvedValue(3);

            const result = await service.countUnread(actingUser);

            expect(notificationModel.countDocuments).toHaveBeenCalledWith({ userId: 'user1', isRead: false });
            expect(result).toBe(3);
        });
    });

    describe('markAsRead', () => {
        it('scopes the update to both the notification id and the owning user', async () => {
            notificationModel.updateOne.mockResolvedValue({ matchedCount: 1 });

            await service.markAsRead('n1', actingUser);

            expect(notificationModel.updateOne).toHaveBeenCalledWith(
                { _id: 'n1', userId: 'user1' },
                { isRead: true },
            );
        });

        it('cannot mark another user\'s notification as read (0 matched)', async () => {
            notificationModel.updateOne.mockResolvedValue({ matchedCount: 0 });

            const result = await service.markAsRead('someone-elses-notification', actingUser);

            expect(result.matchedCount).toBe(0);
        });
    });

    describe('markAllAsRead', () => {
        it('marks every unread notification for the acting user only', async () => {
            notificationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

            await service.markAllAsRead(actingUser);

            expect(notificationModel.updateMany).toHaveBeenCalledWith(
                { userId: 'user1', isRead: false },
                { isRead: true },
            );
        });
    });
});
