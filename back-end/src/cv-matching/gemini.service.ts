import {
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    Logger,
    RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
    CANONICAL_LEVELS,
    CANONICAL_LOCATIONS,
    CANONICAL_SKILLS,
} from './cv-matching.constants';
import {
    ICandidateJob,
    ICvJobMatch,
    ICvProfile,
} from './cv-matching.interface';

/**
 * Model mặc định.
 *
 * KHÔNG đặt mặc định là gemini-3.8-flash: trên free tier model đó chỉ được
 * 20 request/ngày, mà mỗi lần phân tích CV gọi Gemini 2 lần (trích xuất + xếp
 * hạng) nên chỉ dùng được 10 CV/ngày rồi toàn bộ tính năng chết vì 429.
 * Các model *-flash-lite có quota free tier cao hơn nhiều và đủ chất lượng cho
 * việc trích xuất CV theo JSON schema.
 */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Bọc mọi lời gọi Google Gemini.
 *
 * Dùng structured output (`response_format` kèm JSON schema) thay vì tự parse
 * text tự do — `enum` trong schema là thứ bảo đảm skill model trả về khớp đúng
 * token đang lưu trong `Job.skills`, không phải fuzzy-match phía sau.
 *
 * Lưu ý: các field của `interactions.create` là snake_case (`system_instruction`,
 * `response_format`), khác với API `models.generateContent` cũ dùng camelCase.
 */
@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private client: GoogleGenAI | null = null;

    constructor(private readonly configService: ConfigService) { }

    /** Model đang dùng — lưu vào kết quả để trace lại khi đổi model. */
    get modelName(): string {
        return this.configService.get<string>('GEMINI_MODEL') || DEFAULT_MODEL;
    }

    /**
     * Khởi tạo lười: thiếu API key thì chỉ endpoint này lỗi, phần còn lại của app
     * vẫn chạy bình thường.
     */
    private getClient(): GoogleGenAI {
        if (this.client) return this.client;

        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new InternalServerErrorException(
                'Server chưa cấu hình GEMINI_API_KEY. Vui lòng liên hệ quản trị viên.',
            );
        }

        this.client = new GoogleGenAI({ apiKey });
        return this.client;
    }

    /** Bước 1: đọc CV thành profile có cấu trúc. */
    async extractProfile(cvText: string): Promise<ICvProfile> {
        const systemInstruction = [
            'Bạn là chuyên gia tuyển dụng, nhiệm vụ là đọc CV và trích xuất thông tin có cấu trúc.',
            'CV có thể viết bằng tiếng Việt hoặc tiếng Anh.',
            'Quy tắc bắt buộc:',
            '- Chỉ dùng thông tin có thật trong CV. Tuyệt đối không suy diễn hay bịa thêm.',
            '- Field không tìm thấy: để chuỗi rỗng hoặc mảng rỗng.',
            '- skills: chỉ được chọn trong danh sách cho phép; skill trong CV không map được thì bỏ qua ở field này.',
            '- rawSkills: ghi lại nguyên văn mọi kỹ năng/công nghệ CV có nêu, kể cả cái không nằm trong danh sách cho phép.',
            '- level: nếu CV không ghi rõ thì suy ra từ số năm kinh nghiệm (sinh viên hoặc 0 năm là INTERN; dưới 1 năm là FRESHER; 1-2 năm là JUNIOR; 3-5 năm là MIDDLE; trên 5 năm là SENIOR).',
            '- yearsOfExperience: số năm kinh nghiệm làm việc, không tính thời gian đi học, làm tròn thành số nguyên. Không có thì để 0.',
            '- locations: nơi ứng viên đang ở hoặc muốn làm việc, map về danh sách cho phép.',
            '- summary: viết bằng tiếng Việt.',
        ].join('\n');

        const schema = {
            type: 'object',
            properties: {
                fullName: { type: 'string', description: 'Họ tên đầy đủ của ứng viên' },
                email: { type: 'string' },
                phone: { type: 'string' },
                currentTitle: {
                    type: 'string',
                    description:
                        'Vị trí hiện tại, hoặc vị trí ứng viên đang nhắm tới nếu chưa có kinh nghiệm',
                },
                summary: {
                    type: 'string',
                    description: 'Tóm tắt về ứng viên, 1-3 câu, bằng tiếng Việt',
                },
                yearsOfExperience: { type: 'integer' },
                level: { type: 'string', enum: CANONICAL_LEVELS },
                skills: {
                    type: 'array',
                    items: { type: 'string', enum: CANONICAL_SKILLS },
                },
                rawSkills: { type: 'array', items: { type: 'string' } },
                locations: {
                    type: 'array',
                    items: { type: 'string', enum: CANONICAL_LOCATIONS },
                },
                education: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            school: { type: 'string' },
                            degree: { type: 'string' },
                            major: { type: 'string' },
                            year: { type: 'string' },
                        },
                        required: ['school'],
                    },
                },
                experiences: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            company: { type: 'string' },
                            title: { type: 'string' },
                            from: { type: 'string' },
                            to: { type: 'string' },
                            description: { type: 'string' },
                        },
                        required: ['company', 'title'],
                    },
                },
                languages: { type: 'array', items: { type: 'string' } },
            },
            required: [
                'fullName',
                'currentTitle',
                'summary',
                'yearsOfExperience',
                'level',
                'skills',
                'rawSkills',
                'locations',
            ],
        };

        const input = `Đây là nội dung CV cần phân tích:\n\n---\n${cvText}\n---`;

        const profile = await this.generateJson<ICvProfile>(
            systemInstruction,
            input,
            schema,
            'extractProfile',
        );

        return this.sanitizeProfile(profile);
    }

    /** Bước 2: chấm điểm từng job so với profile của ứng viên. */
    async rankJobs(
        profile: ICvProfile,
        jobs: ICandidateJob[],
    ): Promise<ICvJobMatch[]> {
        const systemInstruction = [
            'Bạn là chuyên gia tuyển dụng, nhiệm vụ là đánh giá độ phù hợp giữa một ứng viên và từng tin tuyển dụng.',
            'Cho điểm 0-100 theo thứ tự ưu tiên: mức độ khớp kỹ năng (quan trọng nhất), rồi tới level/kinh nghiệm, địa điểm, cuối cùng là lương.',
            'Quy tắc bắt buộc:',
            '- Chấm độc lập từng job so với ứng viên. Không so sánh các job với nhau và không cố phân bổ điểm cho đều.',
            '- Trả về đúng một phần tử cho mỗi job được cung cấp, giữ nguyên jobId như trong dữ liệu vào.',
            '- reason: viết bằng tiếng Việt, 1-2 câu, nêu cụ thể điểm phù hợp và điểm còn thiếu.',
            '- matchedSkills: kỹ năng job yêu cầu mà ứng viên đã có.',
            '- missingSkills: kỹ năng job yêu cầu mà ứng viên chưa có.',
            '- Ứng viên thiếu phần lớn kỹ năng cốt lõi thì phải cho điểm thấp, không nâng điểm vì lịch sự.',
        ].join('\n');

        const schema = {
            type: 'object',
            properties: {
                matches: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            jobId: { type: 'string' },
                            score: {
                                type: 'integer',
                                description: 'Điểm phù hợp từ 0 đến 100',
                            },
                            reason: { type: 'string' },
                            matchedSkills: { type: 'array', items: { type: 'string' } },
                            missingSkills: { type: 'array', items: { type: 'string' } },
                        },
                        required: [
                            'jobId',
                            'score',
                            'reason',
                            'matchedSkills',
                            'missingSkills',
                        ],
                    },
                },
            },
            required: ['matches'],
        };

        const candidateSummary = {
            currentTitle: profile.currentTitle,
            yearsOfExperience: profile.yearsOfExperience,
            level: profile.level,
            skills: profile.skills,
            rawSkills: profile.rawSkills,
            locations: profile.locations,
            summary: profile.summary,
        };

        const input = [
            'ỨNG VIÊN:',
            JSON.stringify(candidateSummary, null, 2),
            '',
            `DANH SÁCH ${jobs.length} TIN TUYỂN DỤNG:`,
            JSON.stringify(jobs, null, 2),
        ].join('\n');

        const result = await this.generateJson<{ matches: ICvJobMatch[] }>(
            systemInstruction,
            input,
            schema,
            'rankJobs',
        );

        const jobById = new Map(jobs.map((job) => [job._id, job]));

        return (result?.matches ?? [])
            // Model có thể trả về jobId không tồn tại — bỏ đi để không sinh link chết.
            .filter((match) => jobById.has(match.jobId))
            .map((match) => {
                const job = jobById.get(match.jobId);
                return {
                    jobId: match.jobId,
                    jobName: job.name,
                    companyName: job.companyName,
                    score: this.clampScore(match.score),
                    reason: match.reason ?? '',
                    matchedSkills: match.matchedSkills ?? [],
                    missingSkills: match.missingSkills ?? [],
                };
            });
    }

    /** Một lời gọi Gemini trả về JSON đúng theo schema. */
    private async generateJson<T>(
        systemInstruction: string,
        input: string,
        schema: Record<string, any>,
        label: string,
    ): Promise<T> {
        const client = this.getClient();
        const startedAt = Date.now();

        let raw: string | undefined;
        try {
            const interaction = await this.withTimeout(
                client.interactions.create({
                    model: this.modelName,
                    input,
                    system_instruction: systemInstruction,
                    response_format: {
                        type: 'text',
                        mime_type: 'application/json',
                        schema,
                    },
                }),
            );
            raw = interaction.output_text;
        } catch (error) {
            if (error instanceof RequestTimeoutException) throw error;
            this.logger.error(`Gemini ${label} thất bại: ${error?.message}`);

            // Tách riêng 429: gộp nó vào "không kết nối được" khiến người dùng
            // và cả người debug hiểu sai thành lỗi mạng, trong khi thực tế là
            // đã hết lượt gọi Gemini (free tier giới hạn theo phút và theo ngày).
            if (error?.status === 429) {
                const perDay = /free_tier_requests/.test(error?.message ?? '');
                throw new HttpException(
                    perDay
                        ? `Đã hết lượt dùng AI trong ngày của model ${this.modelName}. Vui lòng thử lại vào ngày mai, đổi GEMINI_MODEL sang model có quota cao hơn, hoặc nâng cấp gói Gemini API.`
                        : 'Hệ thống đang gọi AI quá nhanh. Vui lòng đợi khoảng một phút rồi thử lại.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            throw new InternalServerErrorException(
                'Không kết nối được tới dịch vụ AI. Vui lòng thử lại sau.',
            );
        }

        this.logger.log(
            `Gemini ${label}: ${Date.now() - startedAt}ms, input ${input.length} ký tự, output ${raw?.length ?? 0} ký tự`,
        );

        if (!raw) {
            // output_text là optional trong SDK: có thể rỗng khi bị safety filter chặn.
            throw new InternalServerErrorException(
                'Dịch vụ AI không trả về kết quả. Vui lòng thử lại.',
            );
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            this.logger.error(
                `Gemini ${label} trả về JSON không hợp lệ: ${raw.slice(0, 500)}`,
            );
            throw new InternalServerErrorException(
                'Kết quả từ dịch vụ AI không đọc được. Vui lòng thử lại.',
            );
        }
    }

    private async withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
        let timer: NodeJS.Timeout;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
                () =>
                    reject(
                        new RequestTimeoutException(
                            'AI xử lý quá lâu, vui lòng thử lại với CV ngắn gọn hơn.',
                        ),
                    ),
                REQUEST_TIMEOUT_MS,
            );
        });

        try {
            return await Promise.race([Promise.resolve(promise), timeout]);
        } finally {
            clearTimeout(timer);
        }
    }

    private clampScore(score: unknown): number {
        const value = Math.round(Number(score));
        if (!Number.isFinite(value)) return 0;
        return Math.min(100, Math.max(0, value));
    }

    /** Schema đã ép kiểu, nhưng vẫn chốt lại lần nữa để phòng field thiếu. */
    private sanitizeProfile(profile: ICvProfile): ICvProfile {
        const onlyCanonical = (values: string[] = [], allowed: string[]) => [
            ...new Set(values.filter((value) => allowed.includes(value))),
        ];

        return {
            fullName: profile?.fullName ?? '',
            email: profile?.email ?? '',
            phone: profile?.phone ?? '',
            currentTitle: profile?.currentTitle ?? '',
            summary: profile?.summary ?? '',
            yearsOfExperience: Number(profile?.yearsOfExperience) || 0,
            level: CANONICAL_LEVELS.includes(profile?.level) ? profile.level : '',
            skills: onlyCanonical(profile?.skills, CANONICAL_SKILLS),
            rawSkills: [...new Set(profile?.rawSkills ?? [])],
            locations: onlyCanonical(profile?.locations, CANONICAL_LOCATIONS),
            education: profile?.education ?? [],
            experiences: profile?.experiences ?? [],
            languages: profile?.languages ?? [],
        };
    }
}
