import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage, SkipCheckPermission, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) { }

  // @SkipCheckPermission bắt buộc: INIT_PERMISSIONS chỉ seed khi collection
  // permissions rỗng, nên trên một DB đã tồn tại, route này sẽ không được cấp
  // quyền cho bất kỳ role nào kể cả admin. Phân quyền được tự kiểm trong service.
  @Get('overview')
  @SkipCheckPermission()
  @ResponseMessage("Dashboard overview statistics")
  getOverview(@Query('months') months: string, @User() user: IUser) {
    return this.statsService.getOverview(+months || 12, user);
  }
}
