import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { IUser } from 'src/users/users.interface';
import {
    MAX_CANDIDATE_JOBS,
    MAX_RETURNED_MATCHES,
    MIN_MATCH_SCORE,
    stripHtml,
} from './cv-matching.constants';
import { ICandidateJob, ICvProfile } from './cv-matching.interface';
import { CvParserService } from './cv-parser.service';
import { GeminiService } from './gemini.service';
import { CvAnalysis, CvAnalysisDocument } from './schemas/cv-analysis.schema';

/** Field cần cho việc chấm điểm — không lấy cả document để đỡ tốn RAM và token. */
const JOB_SELECT = 'name skills company location salary level quantity description';

@Injectable()
export class CvMatchingService {
    private readonly logger = new Logger(CvMatchingService.name);

    constructor(
        @InjectModel(CvAnalysis.name)
        private cvAnalysisModel: SoftDeleteModel<CvAnalysisDocument>,
        @InjectModel(Job.name)
        private jobModel: Model<JobDocument>,
        private cvParserService: CvParserService,
        private geminiService: GeminiService,
    ) { }

    /**
     * Luồng chính: đọc file CV -> AI trích xuất profile -> lọc job ứng viên từ DB
     * -> AI chấm điểm -> lưu lịch sử và trả kết quả.
     */
    async analyze(file: Express.Multer.File, user: IUser) {
        const { text, fileType } = await this.cvParserService.extract(file);

        const profile = await this.geminiService.extractProfile(text);

        const candidateJobs = await this.findCandidateJobs(profile);
        this.logger.log(
            `CV của ${user.email}: ${profile.skills.length} skill khớp taxonomy, ${candidateJobs.length} job ứng viên`,
        );

        // Không có job nào để chấm: vẫn lưu lại profile đã phân tích, vì với người
        // dùng thì bản thân profile đã có giá trị.
        const matches = candidateJobs.length
            ? await this.geminiService.rankJobs(profile, candidateJobs)
            : [];

        const rankedMatches = matches
            .filter((match) => match.score >= MIN_MATCH_SCORE)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_RETURNED_MATCHES);

        return this.cvAnalysisModel.create({
            email: user.email,
            userId: user._id,
            fileName: file.originalname,
            fileType,
            model: this.geminiService.modelName,
            candidateJobCount: candidateJobs.length,
            profile,
            matches: rankedMatches,
            createdBy: { _id: user._id, email: user.email },
        });
    }

    /**
     * Lọc job ứng viên theo 3 tầng, nới dần điều kiện.
     *
     * Phải tầng hoá vì dữ liệu thật không sạch: nhiều job trong DB đã hết
     * `endDate`, nên nếu chỉ chạy tầng 1 thì kết quả rất dễ rỗng dù hệ thống vẫn
     * còn tin tuyển dụng đang mở.
     *
     * Lưu ý `isDeleted: false` phải tự thêm — `soft-delete-plugin-mongoose` không
     * tự chèn điều kiện này vào `find()`, nó chỉ set cờ khi gọi `softDelete()`.
     */
    private async findCandidateJobs(profile: ICvProfile): Promise<ICandidateJob[]> {
        const base = { isDeleted: false, isActive: true };
        const hasSkills = profile.skills.length > 0;

        // Tầng 1: khớp skill và còn trong thời hạn tuyển.
        if (hasSkills) {
            const fresh = await this.queryJobs(
                { ...base, endDate: { $gte: new Date() }, skills: { $in: profile.skills } },
                MAX_CANDIDATE_JOBS,
            );
            if (fresh.length) return fresh;

            // Tầng 2: khớp skill, bỏ ràng buộc thời hạn.
            const anyTime = await this.queryJobs(
                { ...base, skills: { $in: profile.skills } },
                MAX_CANDIDATE_JOBS,
            );
            if (anyTime.length) return anyTime;
        }

        // Tầng 3: job đang mở gần nhất. Không khớp skill nào, nhưng để AI tự chấm
        // điểm thấp thì vẫn tốt hơn là trả về màn hình trống.
        return this.queryJobs(base, 20);
    }

    private async queryJobs(
        filter: Record<string, any>,
        limit: number,
    ): Promise<ICandidateJob[]> {
        const jobs = await this.jobModel
            .find(filter)
            .select(JOB_SELECT)
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();

        return jobs.map((job) => ({
            _id: job._id.toString(),
            name: job.name,
            companyName: job.company?.name ?? '',
            skills: job.skills ?? [],
            level: job.level ?? '',
            location: job.location ?? '',
            salary: job.salary ?? 0,
            // description là HTML từ react-quill — phải làm sạch trước khi vào prompt.
            description: stripHtml(job.description),
        }));
    }

    /** Lịch sử phân tích của chính người dùng đang đăng nhập. */
    async findByUser(user: IUser) {
        return this.cvAnalysisModel
            .find({ userId: user._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
    }

    async findOne(id: string, user: IUser) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Id không hợp lệ');
        }

        const analysis = await this.cvAnalysisModel.findOne({ _id: id }).lean();
        if (!analysis || analysis.isDeleted) {
            throw new NotFoundException('Không tìm thấy kết quả phân tích');
        }

        // CV là dữ liệu cá nhân: chỉ chủ sở hữu được xem, nếu không thì bất kỳ ai
        // biết id đều đọc được CV của người khác.
        if (analysis.userId?.toString() !== user._id?.toString()) {
            throw new ForbiddenException(
                'Bạn không có quyền xem kết quả phân tích này',
            );
        }

        return analysis;
    }
}
