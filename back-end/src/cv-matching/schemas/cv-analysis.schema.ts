import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { ICvJobMatch, ICvProfile } from '../cv-matching.interface';

export type CvAnalysisDocument = HydratedDocument<CvAnalysis>;

/**
 * Một lần người dùng upload CV và được AI gợi ý việc làm.
 *
 * Chủ ý KHÔNG lưu file binary và KHÔNG lưu toàn văn CV — chỉ lưu profile đã cấu
 * trúc. Giữ DB nhẹ và hạn chế lưu dữ liệu cá nhân thô không cần thiết.
 */
@Schema({ timestamps: true })
export class CvAnalysis {
    @Prop()
    email: string;

    @Prop()
    userId: mongoose.Schema.Types.ObjectId;

    /** Tên file gốc người dùng upload — chỉ để hiển thị lại trong lịch sử. */
    @Prop()
    fileName: string;

    /** 'pdf' | 'docx' */
    @Prop()
    fileType: string;

    /** Model Gemini đã tạo ra kết quả này — để trace khi đổi model. */
    @Prop()
    model: string;

    /** Số job đã đưa vào bước xếp hạng (trước khi lọc theo điểm). */
    @Prop()
    candidateJobCount: number;

    @Prop({ type: Object })
    profile: ICvProfile;

    @Prop({ type: mongoose.Schema.Types.Array })
    matches: ICvJobMatch[];

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

export const CvAnalysisSchema = SchemaFactory.createForClass(CvAnalysis);
