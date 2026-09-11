import {
    BadRequestException,
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ResponseMessage, SkipCheckPermission, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { CvMatchingService } from './cv-matching.service';

@ApiTags('cv-matching')
@Controller('cv-matching')
export class CvMatchingController {
    constructor(private readonly cvMatchingService: CvMatchingService) { }

    /**
     * Upload CV và nhận danh sách việc làm phù hợp.
     *
     * `@SkipCheckPermission()` vẫn yêu cầu token hợp lệ, chỉ bỏ qua bước so
     * `apiPath` với bảng permissions — giống cách `resumes.controller.ts` xử lý
     * các endpoint dành cho ứng viên. Lý do: seeder permissions chỉ chạy khi
     * collection rỗng, nên trên DB đang có dữ liệu thì permission mới sẽ không
     * bao giờ được seed.
     *
     * `ThrottlerGuard` phải gắn tay: trong project này guard không được đăng ký
     * toàn cục, nên nếu chỉ có `@Throttle()` thì không giới hạn được gì. Đây là
     * biện pháp kiểm soát chi phí gọi AI.
     */
    @Post('analyze')
    @SkipCheckPermission()
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('fileUpload'))
    @ResponseMessage('Phân tích CV và gợi ý việc làm')
    analyze(@UploadedFile() file: Express.Multer.File, @User() user: IUser) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file CV để phân tích');
        }
        return this.cvMatchingService.analyze(file, user);
    }

    @Get('history')
    @SkipCheckPermission()
    @ResponseMessage('Lịch sử phân tích CV')
    getHistory(@User() user: IUser) {
        return this.cvMatchingService.findByUser(user);
    }

    @Get(':id')
    @SkipCheckPermission()
    @ResponseMessage('Chi tiết một lần phân tích CV')
    findOne(@Param('id') id: string, @User() user: IUser) {
        return this.cvMatchingService.findOne(id, user);
    }
}
