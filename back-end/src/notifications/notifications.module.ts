import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    // Cần JwtService riêng để gateway tự verify JWT thủ công lúc handshake
    // (copy factory từ AuthModule — JwtAuthGuard toàn cục không chạy cho WS).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  // Ngoại lệ có chủ đích so với các module khác (JobsModule/ResumesModule
  // không export service): không thể re-register một Gateway qua forFeature,
  // nên NotificationsModule export thẳng NotificationsService.
  exports: [NotificationsService],
})
export class NotificationsModule { }
