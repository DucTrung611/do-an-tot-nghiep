import { Module } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscribersController } from './subscribers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscriber, SubscriberSchema } from './schemas/subscriber.schema';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema },
    ]),
    MailModule,
  ],
  controllers: [SubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
