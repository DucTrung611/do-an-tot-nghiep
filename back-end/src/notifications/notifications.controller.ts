import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage, SkipCheckPermission, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  // Toàn bộ endpoint dành cho chính người dùng đang đăng nhập nên phải
  // @SkipCheckPermission (cùng lý do như saved-jobs/stats: permissions chỉ
  // được seed khi collection rỗng). Quyền được chặn trong service bằng cách
  // ép theo user._id.
  @Get()
  @SkipCheckPermission()
  @ResponseMessage("Fetch notifications with paginate")
  findByUser(
    @Query("current") currentPage: string,
    @Query("pageSize") limit: string,
    @Query() qs: string,
    @User() user: IUser
  ) {
    return this.notificationsService.findByUser(+currentPage, +limit, qs, user);
  }

  @Get('unread-count')
  @SkipCheckPermission()
  @ResponseMessage("Fetch unread notification count")
  countUnread(@User() user: IUser) {
    return this.notificationsService.countUnread(user);
  }

  // phải khai báo trước @Patch(':id/read') để Express không match "read-all" như :id
  @Patch('read-all')
  @SkipCheckPermission()
  @ResponseMessage("Mark all notifications as read")
  markAllAsRead(@User() user: IUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Patch(':id/read')
  @SkipCheckPermission()
  @ResponseMessage("Mark a notification as read")
  markAsRead(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.markAsRead(id, user);
  }
}
