import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas/job.schema';
import { Subscriber, SubscriberSchema } from 'src/subscribers/schemas/subscriber.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      // đăng ký lại để tìm subscriber khớp skill + map sang user khi tạo job mới
      { name: Subscriber.name, schema: SubscriberSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService]
})
export class JobsModule { }
