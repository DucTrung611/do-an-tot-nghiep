import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Permission, PermissionDocument } from 'src/permissions/schemas/permission.schema';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { Resume, ResumeDocument } from 'src/resumes/schemas/resume.schema';
import { UsersService } from 'src/users/users.service';
import {
    ADMIN_ROLE,
    INIT_PERMISSIONS,
    USER_ROLE,
    INIT_COMPANIES,
    INIT_JOB_SEEKERS,
    INIT_JOBS,
    INIT_SUBSCRIBERS,
    INIT_RESUMES,
} from './sample';

@Injectable()
export class DatabasesService implements OnModuleInit {
    private readonly logger = new Logger(DatabasesService.name);

    constructor(
        @InjectModel(User.name)
        private userModel: SoftDeleteModel<UserDocument>,

        @InjectModel(Permission.name)
        private permissionModel: SoftDeleteModel<PermissionDocument>,

        @InjectModel(Role.name)
        private roleModel: SoftDeleteModel<RoleDocument>,

        @InjectModel(Company.name)
        private companyModel: SoftDeleteModel<CompanyDocument>,

        @InjectModel(Job.name)
        private jobModel: SoftDeleteModel<JobDocument>,

        @InjectModel(Subscriber.name)
        private subscriberModel: SoftDeleteModel<SubscriberDocument>,

        @InjectModel(Resume.name)
        private resumeModel: SoftDeleteModel<ResumeDocument>,

        private configService: ConfigService,
        private userService: UsersService
    ) { }


    async onModuleInit() {
        const isInit = this.configService.get<string>("SHOULD_INIT");
        if (Boolean(isInit)) {

            const countUser = await this.userModel.count({});
            const countPermission = await this.permissionModel.count({});
            const countRole = await this.roleModel.count({});

            //create permissions
            if (countPermission === 0) {
                await this.permissionModel.insertMany(INIT_PERMISSIONS);
                //bulk create
            }

            // create role
            if (countRole === 0) {
                const permissions = await this.permissionModel.find({}).select("_id");
                await this.roleModel.insertMany([
                    {
                        name: ADMIN_ROLE,
                        description: "Admin thì full quyền :v",
                        isActive: true,
                        permissions: permissions
                    },
                    {
                        name: USER_ROLE,
                        description: "Người dùng/Ứng viên sử dụng hệ thống",
                        isActive: true,
                        permissions: [] //không set quyền, chỉ cần add ROLE
                    }
                ]);
            }

            if (countUser === 0) {
                const adminRole = await this.roleModel.findOne({ name: ADMIN_ROLE });
                const userRole = await this.roleModel.findOne({ name: USER_ROLE })
                await this.userModel.insertMany([
                    {
                        name: "I'm admin",
                        email: "admin@gmail.com",
                        password: this.userService.getHashPassword(this.configService.get<string>("INIT_PASSWORD")),
                        age: 69,
                        gender: "MALE",
                        address: "VietNam",
                        role: adminRole?._id
                    },
                    {
                        name: "I'm trung",
                        email: "thanductrung@gmail.com",
                        password: this.userService.getHashPassword(this.configService.get<string>("INIT_PASSWORD")),
                        age: 96,
                        gender: "MALE",
                        address: "VietNam",
                        role: adminRole?._id
                    },
                    {
                        name: "I'm normal user",
                        email: "user@gmail.com",
                        password: this.userService.getHashPassword(this.configService.get<string>("INIT_PASSWORD")),
                        age: 69,
                        gender: "MALE",
                        address: "VietNam",
                        role: userRole?._id
                    },
                    ...INIT_JOB_SEEKERS.map(seeker => ({
                        ...seeker,
                        password: this.userService.getHashPassword(this.configService.get<string>("INIT_PASSWORD")),
                        role: userRole?._id
                    })),
                ])
            }

            if (countUser > 0 && countRole > 0 && countPermission > 0) {
                this.logger.log('>>> ALREADY INIT SAMPLE DATA...');
            }

            const adminUser = await this.userModel.findOne({ email: "admin@gmail.com" });
            const createdBy = adminUser ? { _id: adminUser._id, email: adminUser.email } : undefined;

            // create companies
            const countCompany = await this.companyModel.count({});
            if (countCompany === 0) {
                await this.companyModel.insertMany(
                    INIT_COMPANIES.map(company => ({ ...company, createdBy }))
                );
            }

            // create jobs
            const countJob = await this.jobModel.count({});
            if (countJob === 0) {
                const companies = await this.companyModel.find({});
                const now = new Date();
                const DAY_MS = 24 * 60 * 60 * 1000;

                const jobsToInsert = INIT_JOBS
                    .map(job => {
                        const company = companies.find(c => c.name === job.companyName);
                        if (!company) return null;
                        const startDate = new Date(now.getTime() + job.startInDays * DAY_MS);
                        const endDate = new Date(startDate.getTime() + job.durationDays * DAY_MS);
                        return {
                            name: job.name,
                            skills: job.skills,
                            company: { _id: company._id, name: company.name, logo: company.logo },
                            location: job.location,
                            salary: job.salary,
                            quantity: job.quantity,
                            level: job.level,
                            description: job.description,
                            startDate,
                            endDate,
                            isActive: job.isActive,
                            createdBy,
                        };
                    })
                    .filter(job => job !== null);

                await this.jobModel.insertMany(jobsToInsert);
            }

            // create subscribers
            const countSubscriber = await this.subscriberModel.count({});
            if (countSubscriber === 0) {
                await this.subscriberModel.insertMany(
                    INIT_SUBSCRIBERS.map(subscriber => ({ ...subscriber, createdBy }))
                );
            }

            // create resumes for job seekers who already applied
            const countResume = await this.resumeModel.count({});
            if (countResume === 0) {
                const jobs = await this.jobModel.find({});
                const users = await this.userModel.find({});

                const resumesToInsert = INIT_RESUMES
                    .map(resume => {
                        const user = users.find(u => u.email === resume.userEmail);
                        const job = jobs.find(j => j.name === resume.jobName && j.company?.name === resume.companyName);
                        if (!user || !job) return null;
                        return {
                            email: user.email,
                            userId: user._id,
                            url: resume.url,
                            status: resume.status,
                            companyId: job.company._id,
                            jobId: job._id,
                            history: [{
                                status: resume.status,
                                updatedAt: new Date(),
                                updatedBy: createdBy,
                            }],
                            createdBy: { _id: user._id, email: user.email },
                        };
                    })
                    .filter(resume => resume !== null);

                if (resumesToInsert.length) {
                    await this.resumeModel.insertMany(resumesToInsert);
                }
            }
        }
    }
}
