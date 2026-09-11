import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: SoftDeleteModel<NotificationDocument>,
        private readonly gateway: NotificationsGateway,
    ) { }

    async createForUser(dto: CreateNotificationDto) {
        const created = await this.notificationModel.create({
            userId: dto.userId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            link: dto.link,
            meta: dto.meta,
        });

        this.gateway.emitToUser(dto.userId, 'notification:new', created.toObject());
        return created;
    }

    async findByUser(currentPage: number, limit: number, qs: string, user: IUser) {
        const { filter, sort } = aqp(qs);
        delete filter.current;
        delete filter.pageSize;

        // luôn ép về chính chủ, không cho xem hộ danh sách người khác
        filter.userId = user._id;

        let offset = (+currentPage - 1) * (+limit);
        let defaultLimit = +limit ? +limit : 10;

        const totalItems = await this.notificationModel.countDocuments(filter);
        const totalPages = Math.ceil(totalItems / defaultLimit);

        const result = await this.notificationModel.find(filter)
            .skip(offset)
            .limit(defaultLimit)
            .sort((sort ?? { createdAt: -1 }) as any)
            .exec();

        return {
            meta: {
                current: currentPage,
                pageSize: limit,
                pages: totalPages,
                total: totalItems
            },
            result
        }
    }

    async countUnread(user: IUser) {
        return this.notificationModel.countDocuments({ userId: user._id, isRead: false });
    }

    async markAsRead(id: string, user: IUser) {
        // scope theo cả _id lẫn userId => không đánh dấu đọc hộ notification của người khác
        return this.notificationModel.updateOne(
            { _id: id, userId: user._id },
            { isRead: true },
        );
    }

    async markAllAsRead(user: IUser) {
        return this.notificationModel.updateMany(
            { userId: user._id, isRead: false },
            { isRead: true },
        );
    }
}
