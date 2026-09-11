import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateSavedJobDto } from './dto/create-saved-job.dto';
import { SavedJob, SavedJobDocument } from './schemas/saved-job.schema';

@Injectable()
export class SavedJobsService {

  constructor(
    @InjectModel(SavedJob.name)
    private savedJobModel: Model<SavedJobDocument>
  ) { }

  async create(createSavedJobDto: CreateSavedJobDto, user: IUser) {
    const { jobId } = createSavedJobDto;
    const { _id, email } = user;

    // upsert => idempotent, bấm tim nhiều lần không sinh trùng và không throw E11000
    const saved = await this.savedJobModel.findOneAndUpdate(
      { userId: _id, jobId },
      {
        $setOnInsert: {
          userId: _id,
          jobId,
          createdBy: { _id, email }
        }
      },
      { upsert: true, new: true }
    );

    return {
      _id: saved?._id,
      jobId: saved?.jobId,
      createdAt: saved?.createdAt
    };
  }

  async findByUser(currentPage: number, limit: number, qs: string, user: IUser) {
    const { filter, sort } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    // luôn ép về chính chủ, client không thể xem danh sách của người khác
    filter.userId = user._id;

    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = await this.savedJobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.savedJobModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort((sort ?? { createdAt: -1 }) as any)
      .populate({
        path: "jobId",
        select: {
          name: 1, company: 1, location: 1, salary: 1,
          skills: 1, level: 1, isActive: 1, endDate: 1, updatedAt: 1
        }
      })
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems
      },
      result
    }
  }

  async findSavedJobIds(user: IUser) {
    const result = await this.savedJobModel
      .find({ userId: user._id })
      .select({ jobId: 1 })
      .lean();

    return result.map(item => String(item.jobId));
  }

  async remove(jobId: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException("not found job")
    }

    const deleted = await this.savedJobModel.deleteOne({
      userId: user._id,
      jobId
    });

    return { deleted: deleted.deletedCount };
  }
}
