import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { Resume, ResumeDocument } from 'src/resumes/schemas/resume.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';
import { IUser } from 'src/users/users.interface';

const SALARY_BOUNDARIES = [0, 10_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000];

@Injectable()
export class StatsService {
    constructor(
        @InjectModel(Job.name) private jobModel: Model<JobDocument>,
        @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    ) { }

    async getOverview(months: number, user: IUser) {
        const isSuperAdmin = user?.role?.name === ADMIN_ROLE;
        const isNormalUser = user?.role?.name === USER_ROLE;

        // Candidate accounts (NORMAL_USER) have no business seeing hiring stats.
        // Company accounts only ever see their own numbers; admins see everything.
        if (isNormalUser) {
            throw new ForbiddenException('Bạn không có quyền xem thống kê');
        }

        // Tài khoản công ty nhưng thiếu company._id thì phải KHÔNG thấy gì cả,
        // chứ không được rơi về phạm vi toàn hệ thống (xem jobs.service.findAll,
        // nơi trường hợp này được chặn bằng `?? null`).
        const isCompanyUser = !isSuperAdmin && !isNormalUser;
        const companyId = isCompanyUser ? (user?.company?._id ?? null) : null;

        // `company` là plain Object nên `_id` có thể được lưu là string hoặc
        // ObjectId tuỳ nơi tạo ra job (xem jobs.service.ts) — phải match cả hai.
        const companyIdCandidates: (string | mongoose.Types.ObjectId)[] = [];
        if (companyId) {
            companyIdCandidates.push(String(companyId));
            if (mongoose.Types.ObjectId.isValid(String(companyId))) {
                companyIdCandidates.push(new mongoose.Types.ObjectId(String(companyId)));
            }
        }

        // aggregate() không đi qua softDeletePlugin => mọi $match đầu tiên phải
        // tự loại bản ghi đã xoá mềm.
        const jobMatch: Record<string, any> = { isDeleted: { $ne: true } };
        const resumeMatch: Record<string, any> = { isDeleted: { $ne: true } };
        // companyIdCandidates rỗng => `$in: []` không khớp bản ghi nào, đúng ý đồ.
        if (isCompanyUser) {
            jobMatch['company._id'] = { $in: companyIdCandidates };
            resumeMatch.companyId = { $in: companyIdCandidates };
        }

        // setDate(1) PHẢI chạy trước setMonth(): nếu hôm nay là ngày 29-31 thì
        // setMonth() trên ngày đó sẽ tràn sang tháng kế tiếp (vd 31/03 lùi 11
        // tháng => "31/04" => 01/05), khiến cửa sổ thống kê lệch đúng 1 tháng.
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(1);
        from.setMonth(from.getMonth() - (months - 1));

        const [
            jobsByMonth,
            applicationsByMonth,
            resumesByStatus,
            topSkills,
            jobsByLocation,
            topJobsByApplications,
            salaryDistribution,
            totals,
        ] = await Promise.all([
            this.jobModel.aggregate([
                { $match: { ...jobMatch, createdAt: { $gte: from } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, month: '$_id', count: 1 } },
            ]),

            this.resumeModel.aggregate([
                { $match: { ...resumeMatch, createdAt: { $gte: from } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, month: '$_id', count: 1 } },
            ]),

            this.resumeModel.aggregate([
                { $match: resumeMatch },
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { _id: 0, status: { $ifNull: ['$_id', 'UNKNOWN'] }, count: 1 } },
                { $sort: { count: -1 } },
            ]),

            this.jobModel.aggregate([
                { $match: { ...jobMatch, isActive: true } },
                { $unwind: '$skills' },
                { $group: { _id: '$skills', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, skill: '$_id', count: 1 } },
            ]),

            this.jobModel.aggregate([
                { $match: { ...jobMatch, isActive: true } },
                { $group: { _id: '$location', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, location: { $ifNull: ['$_id', 'OTHER'] }, count: 1 } },
            ]),

            this.resumeModel.aggregate([
                { $match: resumeMatch },
                { $group: { _id: '$jobId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
                { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        jobId: '$_id',
                        jobName: { $ifNull: ['$job.name', '(đã xoá)'] },
                        companyName: '$job.company.name',
                        count: 1,
                    },
                },
            ]),

            this.jobModel.aggregate([
                { $match: { ...jobMatch, isActive: true, salary: { $gt: 0 } } },
                {
                    $bucket: {
                        groupBy: '$salary',
                        boundaries: SALARY_BOUNDARIES,
                        default: '100tr+',
                        output: { count: { $sum: 1 } },
                    },
                },
            ]),

            this.getTotals(isCompanyUser, companyIdCandidates),
        ]);

        return {
            totals,
            jobsByMonth,
            applicationsByMonth,
            resumesByStatus,
            topSkills,
            jobsByLocation,
            topJobsByApplications,
            salaryDistribution,
        };
    }

    private async getTotals(
        isCompanyUser: boolean,
        companyIdCandidates: (string | mongoose.Types.ObjectId)[],
    ) {
        // countDocuments (không phải aggregate) để plugin soft-delete tự áp dụng.
        const jobFilter: Record<string, any> = isCompanyUser ? { 'company._id': { $in: companyIdCandidates } } : {};
        const resumeFilter: Record<string, any> = isCompanyUser ? { companyId: { $in: companyIdCandidates } } : {};

        const [users, jobs, companies, resumes, activeJobs, pendingResumes] = await Promise.all([
            isCompanyUser ? Promise.resolve(0) : this.userModel.countDocuments({}),
            this.jobModel.countDocuments(jobFilter),
            isCompanyUser ? Promise.resolve(1) : this.companyModel.countDocuments({}),
            this.resumeModel.countDocuments(resumeFilter),
            this.jobModel.countDocuments({ ...jobFilter, isActive: true }),
            this.resumeModel.countDocuments({ ...resumeFilter, status: 'PENDING' }),
        ]);

        return { users, jobs, companies, resumes, activeJobs, pendingResumes };
    }
}
