import { Controller, Get, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public, ResponseMessage } from 'src/decorator/customize';
import { Cron } from '@nestjs/schedule';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @Cron('0 0 8 * * 0', { name: 'weekly-job-email', timeZone: 'Asia/Ho_Chi_Minh' })
  async sendWeeklyJobEmail() {
    this.logger.log('Sending weekly job email to subscribers (Sunday 8:00)');
    await this.mailService.sendJobsToAllSubscribers();
  }

  @Get()
  @Public()
  @ResponseMessage('Send job email to all subscribers (for testing)')
  async handleTestEmail() {
    await this.mailService.sendJobsToAllSubscribers();
    return { success: true };
  }
}
