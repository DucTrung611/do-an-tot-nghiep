import { Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { JobDocument, Job } from './schemas/job.schema';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private jobModel: SoftDeleteModel<JobDocument>
  ) { }

  async create(createJobDto: CreateJobDto, user: IUser) {
    const {
      name, skills, company, salary, quantity,
      level, description, startDate, endDate,
      isActive, location
    } = createJobDto;

    let newJob = await this.jobModel.create({
      name, skills, company, salary, quantity,
      level, description, startDate, endDate,
      isActive, location,
      createdBy: {
        _id: user._id,
        email: user.email
      }
    })

    return {
      _id: newJob?._id,
      createdAt: newJob?.createdAt
    };
  }

  async findAll(currentPage: number, limit: number, qs: string, user?: IUser) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

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

    const totalItems = (await this.jobModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);


    const result = await this.jobModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
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
