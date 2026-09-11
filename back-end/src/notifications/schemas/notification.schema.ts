import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId: mongoose.Schema.Types.ObjectId;

    @Prop({ required: true })
    type: string; // RESUME_STATUS | NEW_JOB_MATCH

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop()
    link: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ type: Object })
    meta: Record<string, any>;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    isDeleted: boolean;

    @Prop()
    deletedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
