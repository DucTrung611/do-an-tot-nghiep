import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';

export const RESUME_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  REVIEWING: 'Đang xem xét',
  APPROVED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: SoftDeleteModel<SubscriberDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: SoftDeleteModel<JobDocument>,
  ) {}

  /**
   * Send matching jobs to a single subscriber.
   */
  async sendJobsToSubscriber(subscriber: SubscriberDocument) {
    if (!subscriber?.email || !subscriber.skills?.length) return;

    const jobs = await this.jobModel.find({
      skills: { $in: subscriber.skills },
    });

    if (!jobs?.length) {
      this.logger.debug(`No matching jobs found for subscriber ${subscriber.email}`);
      return;
    }

    const slugify = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/\-+/g, '-');

    const jobDtos = jobs.map((item) => {
      const slug = slugify(item.name || 'job');
      const id = item._id?.toString?.() ?? '';
      return {
        name: item.name,
        company: item.company?.name,
        salary: `${item.salary}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ',
        skills: item.skills,
        url: `http://localhost:3000/job/${slug}?id=${id}`,
      };
    });

    await this.mailerService.sendMail({
      to: subscriber.email,
      from: '"JobConnect" <no-reply@jobconnect.local>',
      subject: 'Cập nhật công việc phù hợp',
      template: 'new-job',
      context: {
        receiver: subscriber.name || subscriber.email,
        jobs: jobDtos,
      },
    });
  }

  /**
   * Báo cho ứng viên khi HR đổi trạng thái hồ sơ.
   * Handlebars chạy strict:true nên mọi biến trong template phải có mặt ở context.
   */
  async sendResumeStatusUpdate(payload: {
    to: string;
    jobName: string;
    companyName: string;
    status: string;
    updatedAt: Date;
  }) {
    if (!payload?.to) return;

    const statusLabel = RESUME_STATUS_LABEL[payload.status] ?? payload.status;

    await this.mailerService.sendMail({
      to: payload.to,
      from: '"JobConnect" <no-reply@jobconnect.local>',
      subject: `Cập nhật hồ sơ ứng tuyển: ${payload.jobName || 'Hồ sơ của bạn'}`,
      template: 'resume-status',
      context: {
        receiver: payload.to,
        jobName: payload.jobName || '(không rõ vị trí)',
        companyName: payload.companyName || '(không rõ công ty)',
        status: payload.status,
        statusLabel,
        updatedAt: payload.updatedAt.toLocaleString('vi-VN'),
        url: 'http://localhost:3000/applied-jobs',
      },
    });
  }

  /**
   * Send matching jobs to all subscribers.
   */
  async sendJobsToAllSubscribers() {
    const subscribers = await this.subscriberModel.find();
    for (const subscriber of subscribers) {
      try {
        await this.sendJobsToSubscriber(subscriber);
      } catch (error) {
        this.logger.error(`Error sending jobs email to ${subscriber.email}`, error as any);
      }
    }
  }
}

