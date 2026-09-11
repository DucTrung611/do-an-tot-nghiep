import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'src/jobs/schemas/job.schema';
import { IUser } from 'src/users/users.interface';
import { CvMatchingService } from './cv-matching.service';
import { ICvProfile } from './cv-matching.interface';
import { CvParserService } from './cv-parser.service';
import { GeminiService } from './gemini.service';
import { CvAnalysis } from './schemas/cv-analysis.schema';

/** Query giả theo kiểu chainable của mongoose, giống helper trong jobs.service.spec.ts. */
function makeFindResult(items: any[]) {
    const query: any = Promise.resolve(items);
    query.select = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(items);
    return query;
}

const makeJob = (overrides: any = {}) => ({
    _id: { toString: () => overrides._id ?? 'job1' },
    name: 'ReactJS Developer',
    company: { name: 'ACME' },
    skills: ['REACT.JS'],
    level: 'JUNIOR',
    location: 'HANOI',
    salary: 20000000,
    description: '<p>Cần <strong>React</strong> &amp; TypeScript</p>',
    ...overrides,
});

const profile = (overrides: Partial<ICvProfile> = {}): ICvProfile =>
    ({
        fullName: 'Thân Đức Trung',
        email: '',
        phone: '',
        currentTitle: 'Frontend Developer',
        summary: '',
        yearsOfExperience: 1,
        level: 'JUNIOR',
        skills: ['REACT.JS', 'TYPESCRIPT'],
        rawSkills: ['React', 'TS'],
        locations: ['HANOI'],
        education: [],
        experiences: [],
        languages: [],
        ...overrides,
    } as ICvProfile);

describe('CvMatchingService', () => {
    let service: CvMatchingService;
    let cvAnalysisModel: { create: jest.Mock; find: jest.Mock; findOne: jest.Mock };
    let jobModel: { find: jest.Mock };
    let cvParserService: { extract: jest.Mock };
    let geminiService: {
        extractProfile: jest.Mock;
        rankJobs: jest.Mock;
        modelName: string;
    };

    const user = { _id: 'user1', email: 'a@b.com' } as IUser;
    const file = { originalname: 'cv.pdf' } as Express.Multer.File;

    beforeEach(async () => {
        cvAnalysisModel = {
            create: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
            find: jest.fn(),
            findOne: jest.fn(),
        };
        jobModel = { find: jest.fn() };
        cvParserService = {
            extract: jest.fn().mockResolvedValue({ text: 'cv text', fileType: 'pdf' }),
        };
        geminiService = {
            extractProfile: jest.fn().mockResolvedValue(profile()),
            rankJobs: jest.fn().mockResolvedValue([]),
            modelName: 'gemini-3.8-flash',
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CvMatchingService,
                { provide: getModelToken(CvAnalysis.name), useValue: cvAnalysisModel },
                { provide: getModelToken(Job.name), useValue: jobModel },
                { provide: CvParserService, useValue: cvParserService },
                { provide: GeminiService, useValue: geminiService },
            ],
        }).compile();

        service = module.get<CvMatchingService>(CvMatchingService);
    });

    describe('lọc job ứng viên theo 3 tầng', () => {
        it('tầng 1: khớp skill và còn trong thời hạn tuyển', async () => {
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob()]));

            await service.analyze(file, user);

            expect(jobModel.find).toHaveBeenCalledTimes(1);
            expect(jobModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    isDeleted: false,
                    isActive: true,
                    endDate: { $gte: expect.any(Date) },
                    skills: { $in: ['REACT.JS', 'TYPESCRIPT'] },
                }),
            );
        });

        it('tầng 2: bỏ ràng buộc thời hạn khi tầng 1 rỗng', async () => {
            jobModel.find
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([makeJob()]));

            await service.analyze(file, user);

            expect(jobModel.find).toHaveBeenCalledTimes(2);
            const secondFilter = jobModel.find.mock.calls[1][0];
            expect(secondFilter).toEqual({
                isDeleted: false,
                isActive: true,
                skills: { $in: ['REACT.JS', 'TYPESCRIPT'] },
            });
            expect(secondFilter.endDate).toBeUndefined();
        });

        it('tầng 3: lấy job đang mở gần nhất khi không có job nào khớp skill', async () => {
            jobModel.find
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([makeJob()]));

            await service.analyze(file, user);

            expect(jobModel.find).toHaveBeenCalledTimes(3);
            expect(jobModel.find.mock.calls[2][0]).toEqual({
                isDeleted: false,
                isActive: true,
            });
        });

        it('bỏ qua thẳng tới tầng 3 khi AI không nhận diện được skill nào', async () => {
            geminiService.extractProfile.mockResolvedValue(profile({ skills: [] }));
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob()]));

            await service.analyze(file, user);

            // Query theo skill rỗng là vô nghĩa, không được gọi.
            expect(jobModel.find).toHaveBeenCalledTimes(1);
            expect(jobModel.find.mock.calls[0][0].skills).toBeUndefined();
        });

        it('luôn loại job đã xoá mềm ở mọi tầng', async () => {
            jobModel.find
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([]));

            await service.analyze(file, user);

            jobModel.find.mock.calls.forEach(([filter]) => {
                expect(filter.isDeleted).toBe(false);
            });
        });
    });

    describe('chuẩn bị dữ liệu cho AI', () => {
        it('làm sạch HTML trong description trước khi gửi cho AI', async () => {
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob()]));

            await service.analyze(file, user);

            const [, jobs] = geminiService.rankJobs.mock.calls[0];
            expect(jobs[0].description).toBe('Cần React & TypeScript');
            expect(jobs[0].description).not.toMatch(/<[^>]+>/);
        });

        it('làm phẳng tên công ty và chuyển _id thành string', async () => {
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob({ _id: 'abc123' })]));

            await service.analyze(file, user);

            const [, jobs] = geminiService.rankJobs.mock.calls[0];
            expect(jobs[0]._id).toBe('abc123');
            expect(jobs[0].companyName).toBe('ACME');
        });

        it('không gọi AI xếp hạng khi không có job nào', async () => {
            jobModel.find
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([]))
                .mockReturnValueOnce(makeFindResult([]));

            const saved: any = await service.analyze(file, user);

            expect(geminiService.rankJobs).not.toHaveBeenCalled();
            // Vẫn lưu lại profile — với người dùng thì profile đã có giá trị.
            expect(saved.matches).toEqual([]);
            expect(saved.profile).toBeDefined();
        });
    });

    describe('lọc và sắp xếp kết quả', () => {
        const match = (jobId: string, score: number) => ({
            jobId,
            jobName: `Job ${jobId}`,
            companyName: 'ACME',
            score,
            reason: 'lý do',
            matchedSkills: [],
            missingSkills: [],
        });

        beforeEach(() => {
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob()]));
        });

        it('sắp xếp giảm dần theo điểm và loại job dưới ngưỡng', async () => {
            geminiService.rankJobs.mockResolvedValue([
                match('a', 55),
                match('b', 92),
                match('c', 12),
                match('d', 40),
            ]);

            const saved: any = await service.analyze(file, user);

            expect(saved.matches.map((m: any) => m.score)).toEqual([92, 55, 40]);
        });

        it('giới hạn tối đa 10 kết quả trả về', async () => {
            geminiService.rankJobs.mockResolvedValue(
                Array.from({ length: 25 }, (_, i) => match(`j${i}`, 90)),
            );

            const saved: any = await service.analyze(file, user);

            expect(saved.matches).toHaveLength(10);
        });
    });

    describe('lưu lịch sử', () => {
        it('gắn thông tin người dùng, tên file và model đã dùng', async () => {
            jobModel.find.mockReturnValueOnce(makeFindResult([makeJob(), makeJob()]));

            await service.analyze(file, user);

            expect(cvAnalysisModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: user.email,
                    userId: user._id,
                    fileName: 'cv.pdf',
                    fileType: 'pdf',
                    model: 'gemini-3.8-flash',
                    candidateJobCount: 2,
                    createdBy: { _id: user._id, email: user.email },
                }),
            );
        });
    });

    describe('findOne', () => {
        const validId = '507f1f77bcf86cd799439011';

        it('từ chối id không đúng định dạng ObjectId', async () => {
            await expect(service.findOne('not-an-id', user)).rejects.toThrow(
                /Id không hợp lệ/,
            );
        });

        it('báo không tìm thấy khi bản ghi đã xoá mềm', async () => {
            cvAnalysisModel.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ userId: 'user1', isDeleted: true }),
            });

            await expect(service.findOne(validId, user)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('chặn người dùng khác đọc CV không phải của mình', async () => {
            cvAnalysisModel.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    userId: { toString: () => 'someone-else' },
                    isDeleted: false,
                }),
            });

            await expect(service.findOne(validId, user)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('trả về bản ghi cho đúng chủ sở hữu', async () => {
            const doc = {
                userId: { toString: () => 'user1' },
                isDeleted: false,
                fileName: 'cv.pdf',
            };
            cvAnalysisModel.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(doc),
            });

            await expect(service.findOne(validId, user)).resolves.toEqual(doc);
        });
    });

    describe('findByUser', () => {
        it('chỉ lấy bản ghi của chính người dùng, mới nhất trước', async () => {
            const query = makeFindResult([{ fileName: 'cv.pdf' }]);
            cvAnalysisModel.find.mockReturnValue(query);

            await service.findByUser(user);

            expect(cvAnalysisModel.find).toHaveBeenCalledWith({
                userId: user._id,
                isDeleted: false,
            });
            expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
        });
    });
});
