import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Job } from 'src/jobs/schemas/job.schema';

export type SavedJobDocument = HydratedDocument<SavedJob>;

@Schema({ timestamps: true })
export class SavedJob {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Job.name, required: true })
    jobId: mongoose.Schema.Types.ObjectId;

    @Prop({ type: Object })
    createdBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);

// Cố ý KHÔNG dùng softDelete cho collection này: unique index + tombstone
// sẽ làm user bỏ lưu rồi lưu lại bị trùng key (E11000). Dùng deleteOne cứng.
SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
SavedJobSchema.index({ userId: 1, createdAt: -1 });
