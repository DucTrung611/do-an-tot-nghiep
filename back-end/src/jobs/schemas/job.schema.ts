import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true })
export class Job {
    @Prop()
    name: string;

    @Prop()
    skills: string[];

    @Prop({ type: Object })
    company: {
        _id: mongoose.Schema.Types.ObjectId;
        name: string;
        logo: string;
    };

    @Prop()
    location: string;

    @Prop()
    salary: number;

    @Prop()
    quantity: number;

    @Prop()
    level: string;

    @Prop()
    description: string;

    @Prop()
    startDate: Date;

    @Prop()
    endDate: Date;

    @Prop()
    isActive: boolean;

    @Prop()
    jobType: string; // FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP | REMOTE

    @Prop({ default: 0 })
    experienceYears: number; // số năm kinh nghiệm tối thiểu yêu cầu

    @Prop({ type: Object })
    createdBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop({ type: Object })
    updatedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop({ type: Object })
    deletedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    isDeleted: boolean;

    @Prop()
    deletedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Index đầu tiên của codebase. Chỉ được phép có 1 text index / collection,
// và Mongo không có analyzer tiếng Việt nên phải tắt stemming (default_language: 'none')
// để tránh làm hỏng dấu/ký tự khi tách từ.
JobSchema.index(
    { name: 'text', skills: 'text', description: 'text' },
    { name: 'job_text_idx', weights: { name: 5, skills: 3, description: 1 }, default_language: 'none' },
);
JobSchema.index({ isActive: 1, updatedAt: -1 });
JobSchema.index({ skills: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ salary: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ 'company._id': 1 });
JobSchema.index({ createdAt: -1 });

