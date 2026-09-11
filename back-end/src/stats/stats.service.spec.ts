import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { Job } from 'src/jobs/schemas/job.schema';
import { Resume } from 'src/resumes/schemas/resume.schema';
import { User } from 'src/users/schemas/user.schema';
import { Company } from 'src/companies/schemas/company.schema';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';

describe('StatsService', () => {
    let service: StatsService;
    let jobModel: { aggregate: jest.Mock; countDocuments: jest.Mock };
    let resumeModel: { aggregate: jest.Mock; countDocuments: jest.Mock };
    let userModel: { countDocuments: jest.Mock };
    let companyModel: { countDocuments: jest.Mock };

    const adminUser = { _id: 'a1', email: 'admin@b.com', role: { name: ADMIN_ROLE } } as unknown as IUser;
    const normalUser = { _id: 'u1', email: 'user@b.com', role: { name: USER_ROLE } } as unknown as IUser;
    const hrUser = { _id: 'h1', email: 'hr@b.com', role: { name: 'HR' }, company: { _id: 'company1' } } as unknown as IUser;

    beforeEach(async () => {
        jobModel = { aggregate: jest.fn().mockResolvedValue([]), countDocuments: jest.fn().mockResolvedValue(0) };
        resumeModel = { aggregate: jest.fn().mockResolvedValue([]), countDocuments: jest.fn().mockResolvedValue(0) };
        userModel = { countDocuments: jest.fn().mockResolvedValue(0) };
        companyModel = { countDocuments: jest.fn().mockResolvedValue(0) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StatsService,
                { provide: getModelToken(Job.name), useValue: jobModel },
                { provide: getModelToken(Resume.name), useValue: resumeModel },
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: getModelToken(Company.name), useValue: companyModel },
            ],
        }).compile();

        service = module.get<StatsService>(StatsService);
    });

    it('throws Forbidden for a NORMAL_USER (candidate) account', async () => {
        await expect(service.getOverview(12, normalUser)).rejects.toThrow(ForbiddenException);
    });

    it('does not scope by company for an ADMIN account', async () => {
        await service.getOverview(12, adminUser);

        for (const call of jobModel.aggregate.mock.calls) {
            const matchStage = call[0][0].$match;
            expect(matchStage['company._id']).toBeUndefined();
        }
        for (const call of resumeModel.aggregate.mock.calls) {
            const matchStage = call[0][0].$match;
            expect(matchStage.companyId).toBeUndefined();
        }
    });

    it('scopes every pipeline to the company for a non-admin account', async () => {
        await service.getOverview(12, hrUser);

        for (const call of jobModel.aggregate.mock.calls) {
            const matchStage = call[0][0].$match;
            expect(matchStage['company._id']).toEqual({ $in: expect.arrayContaining(['company1']) });
        }
        for (const call of resumeModel.aggregate.mock.calls) {
            const matchStage = call[0][0].$match;
            expect(matchStage.companyId).toEqual({ $in: expect.arrayContaining(['company1']) });
        }
    });

    it('guards every pipeline against soft-deleted documents (aggregate bypasses the soft-delete plugin)', async () => {
        await service.getOverview(12, adminUser);

        const allCalls = [...jobModel.aggregate.mock.calls, ...resumeModel.aggregate.mock.calls];
        expect(allCalls.length).toBeGreaterThan(0);
        for (const call of allCalls) {
            const matchStage = call[0][0].$match;
            expect(matchStage.isDeleted).toEqual({ $ne: true });
        }
    });

    it('returns totals alongside every aggregation block', async () => {
        jobModel.countDocuments.mockResolvedValue(5);
        resumeModel.countDocuments.mockResolvedValue(3);
        userModel.countDocuments.mockResolvedValue(10);
        companyModel.countDocuments.mockResolvedValue(2);

        const result = await service.getOverview(12, adminUser);

        expect(result.totals).toEqual({ users: 10, jobs: 5, companies: 2, resumes: 3, activeJobs: 5, pendingResumes: 3 });
        expect(result).toHaveProperty('jobsByMonth');
        expect(result).toHaveProperty('applicationsByMonth');
        expect(result).toHaveProperty('resumesByStatus');
        expect(result).toHaveProperty('topSkills');
        expect(result).toHaveProperty('jobsByLocation');
        expect(result).toHaveProperty('topJobsByApplications');
        expect(result).toHaveProperty('salaryDistribution');
    });
});
