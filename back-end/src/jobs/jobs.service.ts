import { Injectable, Logger } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { JobDocument, Job } from './schemas/job.schema';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose, { Model } from 'mongoose';
import aqp from 'api-query-params';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name)
    private jobModel: SoftDeleteModel<JobDocument>,
    @InjectModel(Subscriber.name)
    private subscriberModel: Model<SubscriberDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService
  ) { }

  async create(createJobDto: CreateJobDto, user: IUser) {
    const {
      name, skills, company, salary, quantity,
      level, description, startDate, endDate,
      isActive, location, jobType, experienceYears
    } = createJobDto;

    let newJob = await this.jobModel.create({
      name, skills, company, salary, quantity,
      level, description, startDate, endDate,
      isActive, location, jobType, experienceYears,
      createdBy: {
        _id: user._id,
        email: user.email
      }
    })

    // Tạo job xong mới báo cho subscriber khớp skill — không được để việc này
    // làm fail hay làm chậm thao tác tạo job của HR.
    this.notifyMatchingSubscribers(newJob).catch(err =>
      this.logger.error('notifyMatchingSubscribers failed', err as any),
    );

    return {
      _id: newJob?._id,
      createdAt: newJob?.createdAt
    };
  }

  private async notifyMatchingSubscribers(job: JobDocument) {
    if (!job?.skills?.length) return;

    // Job nháp (isActive: false) chưa public: findOne() sẽ từ chối trả về cho
    // ứng viên, nên gửi thông báo sẽ dẫn họ tới một trang không xem được.
    if (job.isActive === false) return;

    const subscribers = await this.subscriberModel
      .find({ skills: { $in: job.skills } })
      .select({ email: 1 })
      .limit(200)
      .lean();

    if (!subscribers.length) return;

    const users = await this.userModel
      .find({ email: { $in: subscribers.map(s => s.email) } })
      .select({ _id: 1 })
      .lean();

    // giống hệt slugify nội bộ của mail.service.ts (không có util dùng chung)
    const slug = (job.name || 'job')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-');

    await Promise.allSettled(users.map(u => this.notificationsService.createForUser({
      userId: String(u._id),
      type: 'NEW_JOB_MATCH',
      title: 'Việc làm mới phù hợp với bạn',
      message: `${job.name} — ${job.company?.name ?? ''}`,
      link: `/job/${slug}?id=${job._id}`,
      meta: { jobId: String(job._id) },
    })));
  }

  async findAll(currentPage: number, limit: number, qs: string, user?: IUser) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    // tìm kiếm full-text theo name/skills/description (xem text index ở job.schema.ts)
    const keyword = filter.keyword;
    delete filter.keyword;
    if (keyword) {
      filter.$text = { $search: String(keyword) };
    }

    // lọc theo khoảng lương, vẫn giữ nguyên field `salary` (không migrate sang min/max)
    const { salaryMin, salaryMax } = filter;
    delete filter.salaryMin;
    delete filter.salaryMax;
    if (salaryMin !== undefined || salaryMax !== undefined) {
      filter.salary = {
        ...(salaryMin !== undefined ? { $gte: +salaryMin } : {}),
        ...(salaryMax !== undefined ? { $lte: +salaryMax } : {}),
      };
    }

    // lọc theo khoảng số năm kinh nghiệm yêu cầu
    const { expMin, expMax } = filter;
    delete filter.expMin;
    delete filter.expMax;
    if (expMin !== undefined || expMax !== undefined) {
      filter.experienceYears = {
        ...(expMin !== undefined ? { $gte: +expMin } : {}),
        ...(expMax !== undefined ? { $lte: +expMax } : {}),
      };
    }

    const isSuperAdmin = user?.role?.name === ADMIN_ROLE;
    const isNormalUser = user?.role?.name === USER_ROLE;
    const isCompanyUser = !!user && !isSuperAdmin && !isNormalUser;

    // Company accounts manage their own jobs (all statuses); everyone else is scoped to their own company.
    if (isCompanyUser) {
      filter["company._id"] = user?.company?._id ?? null;
    }

    // `company` is stored as a plain Object, so `_id` ends up persisted as either a string (jobs created
    // through the REST API, where JSON has no ObjectId type) or a real ObjectId (jobs seeded directly via
    // Mongoose). Match both representations, otherwise a filter cast to only one type silently excludes jobs
    // stored with the other.
    if (filter["company._id"]) {
      const idStr = String(filter["company._id"]);
      const candidates: (string | mongoose.Types.ObjectId)[] = [idStr];
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        candidates.push(new mongoose.Types.ObjectId(idStr));
      }
      filter["company._id"] = { $in: candidates };
    }

    // Only admins and the owning company can see inactive jobs; public/candidate browsing only sees active ones.
    if (!isSuperAdmin && !isCompanyUser && filter.isActive === undefined) {
      filter.isActive = true;
    }

    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = await this.jobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    // $text không có sort mặc định theo độ liên quan => phải tự sort theo
    // textScore khi client không chỉ định sort, nếu không kết quả trả về vô thứ tự
    const hasExplicitSort = sort && Object.keys(sort).length > 0;
    const effectiveSort = filter.$text && !hasExplicitSort
      ? { score: { $meta: 'textScore' } }
      : sort;

    let query = this.jobModel.find(filter);
    if (filter.$text) {
      query = query.select({ score: { $meta: 'textScore' } }) as any;
    }

    const result = await query
      .skip(offset)
      .limit(defaultLimit)
      .sort(effectiveSort as any)
      .populate(population)
      .exec();

    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages,  //tổng số trang với điều kiện query
        total: totalItems // tổng số phần tử (số bản ghi)
      },
      result //kết quả query
    }
  }

  async findOne(id: string, user?: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id))
      return `not found job`;

    const job = await this.jobModel.findById(id);
    if (!job) return `not found job`;

    const isSuperAdmin = user?.role?.name === ADMIN_ROLE;
    const isOwner = !!user?.company?._id &&
      job.company?._id?.toString() === user.company._id.toString();

    if (job.isActive === false && !isSuperAdmin && !isOwner) {
      return `not found job`;
    }

    return job;
  }

  async update(_id: string, updateJobDto: UpdateJobDto, user: IUser) {
    const updated = await this.jobModel.updateOne(
      { _id },
      {
        ...updateJobDto,
        updatedBy: {
          _id: user._id,
          email: user.email
        }
      });
    return updated;
  }

  async remove(_id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(_id))
      return `not found job`;

    await this.jobModel.updateOne(
      { _id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email
        }
      })
    return this.jobModel.softDelete({
      _id
    })
  }
}
