import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';

const mockCreate = jest.fn();

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        interactions: { create: mockCreate },
    })),
}));

/** Lỗi giống hình dạng SDK @google/genai trả về (có field `status`). */
const apiError = (status: number, message: string) =>
    Object.assign(new Error(message), { status });

const QUOTA_PER_DAY_MESSAGE =
    '429 You exceeded your current quota. * Quota exceeded for metric: ' +
    'generativelanguage.googleapis.com/generate_content_free_tier_requests, ' +
    'limit: 20, model: gemini-3.8-flash';

describe('GeminiService', () => {
    let service: GeminiService;
    let config: Record<string, string>;

    beforeEach(async () => {
        jest.clearAllMocks();
        config = { GEMINI_API_KEY: 'test-key' };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GeminiService,
                {
                    provide: ConfigService,
                    useValue: { get: (key: string) => config[key] },
                },
            ],
        }).compile();

        service = module.get<GeminiService>(GeminiService);
    });

    describe('model mặc định', () => {
        it('KHÔNG dùng gemini-3.8-flash làm mặc định — free tier chỉ 20 request/ngày', () => {
            // Mỗi lần phân tích CV gọi Gemini 2 lần, nên 20 request/ngày chỉ đủ
            // 10 CV rồi toàn bộ tính năng chết vì 429.
            expect(service.modelName).not.toBe('gemini-3.8-flash');
            expect(service.modelName).toContain('flash-lite');
        });

        it('ưu tiên GEMINI_MODEL từ cấu hình', () => {
            config.GEMINI_MODEL = 'gemini-3.6-flash';
            expect(service.modelName).toBe('gemini-3.6-flash');
        });
    });

    describe('thiếu API key', () => {
        it('báo rõ chưa cấu hình GEMINI_API_KEY thay vì lỗi chung', async () => {
            delete config.GEMINI_API_KEY;
            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /GEMINI_API_KEY/,
            );
            expect(mockCreate).not.toHaveBeenCalled();
        });
    });

    describe('ánh xạ lỗi 429', () => {
        it('hết quota theo ngày: nói rõ hết lượt trong ngày và nêu tên model', async () => {
            mockCreate.mockRejectedValue(apiError(429, QUOTA_PER_DAY_MESSAGE));

            // Không được gộp thành "không kết nối được tới dịch vụ AI" — chính cách
            // gộp đó từng khiến lỗi hết quota bị hiểu sai thành lỗi mạng.
            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /hết lượt dùng AI trong ngày/,
            );
            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                new RegExp(service.modelName),
            );
        });

        it('hết quota theo phút: gợi ý đợi rồi thử lại', async () => {
            mockCreate.mockRejectedValue(
                apiError(429, '429 Too many requests per minute'),
            );

            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /đợi khoảng một phút/,
            );
        });

        it('trả HTTP 429 chứ không phải 500', async () => {
            mockCreate.mockRejectedValue(apiError(429, QUOTA_PER_DAY_MESSAGE));

            await expect(service.extractProfile('nội dung CV')).rejects.toMatchObject({
                status: 429,
            });
        });
    });

    describe('các lỗi khác', () => {
        it('lỗi mạng vẫn báo là không kết nối được', async () => {
            mockCreate.mockRejectedValue(new Error('socket hang up'));

            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /Không kết nối được tới dịch vụ AI/,
            );
        });

        it('output_text rỗng (bị safety filter chặn) báo lỗi rõ ràng', async () => {
            mockCreate.mockResolvedValue({ output_text: undefined });

            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /không trả về kết quả/,
            );
        });

        it('JSON không hợp lệ báo lỗi đọc kết quả', async () => {
            mockCreate.mockResolvedValue({ output_text: 'không phải json' });

            await expect(service.extractProfile('nội dung CV')).rejects.toThrow(
                /không đọc được/,
            );
        });
    });

    describe('extractProfile', () => {
        it('lọc bỏ skill không thuộc taxonomy và giữ lại rawSkills', async () => {
            mockCreate.mockResolvedValue({
                output_text: JSON.stringify({
                    fullName: 'Thân Đức Trung',
                    currentTitle: 'Intern IT',
                    summary: 'Sinh viên CNTT',
                    yearsOfExperience: 0,
                    level: 'INTERN',
                    // "TAILWIND" và "SPRING BOOT" không có trong CANONICAL_SKILLS
                    skills: ['REACT.JS', 'TAILWIND', 'NEST.JS', 'SPRING BOOT'],
                    rawSkills: ['React', 'Tailwind', 'NestJS'],
                    locations: ['HANOI', 'SAO HOA'],
                }),
            });

            const profile = await service.extractProfile('nội dung CV');

            expect(profile.skills).toEqual(['REACT.JS', 'NEST.JS']);
            expect(profile.locations).toEqual(['HANOI']);
            // rawSkills giữ nguyên để người dùng vẫn thấy AI đọc được gì.
            expect(profile.rawSkills).toEqual(['React', 'Tailwind', 'NestJS']);
        });

        it('bù giá trị mặc định cho field thiếu', async () => {
            mockCreate.mockResolvedValue({
                output_text: JSON.stringify({ fullName: 'A' }),
            });

            const profile = await service.extractProfile('nội dung CV');

            expect(profile.yearsOfExperience).toBe(0);
            expect(profile.level).toBe('');
            expect(profile.skills).toEqual([]);
            expect(profile.education).toEqual([]);
        });
    });

    describe('rankJobs', () => {
        const jobs = [
            {
                _id: 'job1',
                name: 'Backend Intern',
                companyName: 'Tiki',
                skills: ['NEST.JS'],
                level: 'INTERN',
                location: 'HOCHIMINH',
                salary: 5000000,
                description: 'mô tả',
            },
        ];
        const profile = { skills: ['NEST.JS'] } as any;

        it('bỏ match có jobId không tồn tại để không sinh link chết', async () => {
            mockCreate.mockResolvedValue({
                output_text: JSON.stringify({
                    matches: [
                        { jobId: 'job1', score: 90, reason: 'ok', matchedSkills: [], missingSkills: [] },
                        { jobId: 'khong-ton-tai', score: 80, reason: 'x', matchedSkills: [], missingSkills: [] },
                    ],
                }),
            });

            const matches = await service.rankJobs(profile, jobs);

            expect(matches).toHaveLength(1);
            expect(matches[0].jobId).toBe('job1');
            // Tên job và công ty lấy từ dữ liệu DB, không tin số model trả về.
            expect(matches[0].jobName).toBe('Backend Intern');
            expect(matches[0].companyName).toBe('Tiki');
        });

        it('kẹp điểm về khoảng 0-100', async () => {
            mockCreate.mockResolvedValue({
                output_text: JSON.stringify({
                    matches: [
                        { jobId: 'job1', score: 250, reason: 'r', matchedSkills: [], missingSkills: [] },
                    ],
                }),
            });

            const [match] = await service.rankJobs(profile, jobs);
            expect(match.score).toBe(100);
        });
    });
});
