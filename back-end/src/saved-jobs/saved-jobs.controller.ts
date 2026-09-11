import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage, SkipCheckPermission, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { CreateSavedJobDto } from './dto/create-saved-job.dto';
import { SavedJobsService } from './saved-jobs.service';

@ApiTags('saved-jobs')
@Controller('saved-jobs')
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) { }

  // Toàn bộ endpoint dưới đây dành cho ứng viên (NORMAL_USER) nên phải
  // @SkipCheckPermission: INIT_PERMISSIONS chỉ seed khi collection rỗng và
  // NORMAL_USER được seed với permissions rỗng. Quyền được chặn trong service
  // bằng cách ép filter/điều kiện theo user._id.
  @Post()
  @SkipCheckPermission()
  @ResponseMessage("Save a job")
  create(@Body() createSavedJobDto: CreateSavedJobDto, @User() user: IUser) {
    return this.savedJobsService.create(createSavedJobDto, user);
  }

  // phải khai báo trước mọi @Get(':param')
  @Get('ids')
  @SkipCheckPermission()
  @ResponseMessage("Fetch saved job ids")
  findSavedJobIds(@User() user: IUser) {
    return this.savedJobsService.findSavedJobIds(user);
  }

  @Get()
  @SkipCheckPermission()
  @ResponseMessage("Fetch saved jobs with paginate")
  findByUser(
    @Query("current") currentPage: string,
    @Query("pageSize") limit: string,
    @Query() qs: string,
    @User() user: IUser
  ) {
    return this.savedJobsService.findByUser(+currentPage, +limit, qs, user);
  }

  @Delete(':jobId')
  @SkipCheckPermission()
  @ResponseMessage("Unsave a job")
  remove(@Param('jobId') jobId: string, @User() user: IUser) {
    return this.savedJobsService.remove(jobId, user);
  }
}
