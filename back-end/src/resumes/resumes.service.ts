import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { IUser } from 'src/users/users.interface';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { ADMIN_ROLE } from 'src/databases/sample';
import { MailService, RESUME_STATUS_LABEL } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ResumesService {

  private readonly logger = new Logger(ResumesService.name);

  constructor(
    @InjectModel(Resume.name)
    private resumeModel: SoftDeleteModel<ResumeDocument>,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService
  ) { }
  async create(createUserCvDto: CreateUserCvDto, user: IUser) {
    const { url, companyId, jobId } = createUserCvDto;
    const { email, _id } = user;

    const newCV = await this.resumeModel.create({
      url, companyId, email, jobId,
      userId: _id,
      status: "PENDING",
      createdBy: { _id, email },
      history: [
        {
          status: "PENDING",
          updatedAt: new Date,
          updatedBy: {
            _id: user._id,
            email: user.email
          }
        }
      ]
    })

    return {
      _id: newCV?._id,
      createdAt: newCV?.createdAt
    };
  }

  async findAll(currentPage: number, limit: number, qs: string, user: IUser) {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const isSuperAdmin = user?.role?.name === ADMIN_ROLE;
    if (!isSuperAdmin) {
      filter.companyId = user?.company?._id ?? null;
    }

    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = await this.resumeModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);


    const result = await this.resumeModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .select(projection as any)
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

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException("not found resume")
    }

    return await this.resumeModel.findById(id);
  }
  async findByUsers(user: IUser) {
    return await this.resumeModel.find({
      userId: user._id,
    })
      .sort("-createdAt")
      .populate([
        {
          path: "companyId",
          select: { name: 1 }
        },
        {
          path: "jobId",
          select: { name: 1 }
        }
      ])
  }

  async update(_id: string, status: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new BadRequestException("not found resume")
    }

    const before = await this.resumeModel.findById(_id).select({ status: 1 }).lean();
    if (!before) {
      throw new BadRequestException("not found resume")
    }

    // dùng findOneAndUpdate({new:true}) thay cho updateOne để lấy được document
    // sau khi cập nhật => có userId/jobId/email để gửi mail (và notification sau này)
    const updated = await this.resumeModel.findOneAndUpdate(
      { _id },
      {
        status,
        updatedBy: {
          _id: user._id,
          email: user.email
        },
        $push: {
          history: {
            status: status,
            updatedAt: new Date,
            updatedBy: {
              _id: user._id,
              email: user.email
            }
          }
        }
      },
      { new: true })
      .populate([
        {
          path: "jobId",
          select: { name: 1 }
        },
        {
          path: "companyId",
          select: { name: 1 }
        }
      ]);

    if (before.status !== status && updated) {
      const jobName = (updated.jobId as any)?.name ?? '';
      const companyName = (updated.companyId as any)?.name ?? '';

      // fire-and-forget: SMTP hỏng không được làm hỏng thao tác của HR
      this.mailService.sendResumeStatusUpdate({
        to: updated.email,
        jobName,
        companyName,
        status,
        updatedAt: new Date(),
      }).catch(err => this.logger.error('sendResumeStatusUpdate failed', err as any));

      // userId chỉ có được nhờ đổi updateOne -> findOneAndUpdate({new:true}) ở trên
      this.notificationsService.createForUser({
        userId: String(updated.userId),
        type: 'RESUME_STATUS',
        title: 'Cập nhật hồ sơ ứng tuyển',
        message: `Hồ sơ của bạn cho vị trí "${jobName}" đã chuyển sang trạng thái ${RESUME_STATUS_LABEL[status] ?? status}`,
        link: '/applied-jobs',
        meta: { resumeId: String(updated._id), jobId: String((updated.jobId as any)?._id ?? updated.jobId), status },
      }).catch(err => this.logger.error('notify resume status failed', err as any));
    }

    return updated;
  }

  async remove(id: string, user: IUser) {
    await this.resumeModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email
        }
      })
    return this.resumeModel.softDelete({
      _id: id
    })
  }
}
