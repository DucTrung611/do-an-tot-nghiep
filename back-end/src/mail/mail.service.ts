import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Subscriber, SubscriberDocument } from 'src/subscribers/schemas/subscriber.schema';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';

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

