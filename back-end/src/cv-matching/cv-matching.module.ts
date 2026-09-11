import { BadRequestException, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';
import { CvMatchingController } from './cv-matching.controller';
import { CvMatchingService } from './cv-matching.service';
import { CvParserService } from './cv-parser.service';
import { GeminiService } from './gemini.service';
import { CvAnalysis, CvAnalysisSchema } from './schemas/cv-analysis.schema';

const MAX_CV_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc'];

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CvAnalysis.name, schema: CvAnalysisSchema },
            // Đăng ký lại schema Job ở đây thay vì import JobsModule — JobsModule
            // không export service của nó. Cùng cách MailModule đang làm.
            { name: Job.name, schema: JobSchema },
        ]),
        /**
         * Multer riêng cho module này, không dùng chung với FilesModule vì:
         *  - FilesModule khoá 1MB, quá thấp cho CV thật (thường 1-3MB);
         *  - route upload của FilesModule gắn HttpExceptionFilter ghi đè mọi lỗi
         *    thành "File too large customize", người dùng không biết mình sai gì;
         *  - file CV không cần lưu xuống đĩa, chỉ cần buffer để trích text.
         */
        MulterModule.register({
            storage: memoryStorage(),
            limits: { fileSize: MAX_CV_FILE_SIZE },
            fileFilter: (req, file, cb) => {
                const extension = file.originalname.split('.').pop()?.toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(extension)) {
                    return cb(
                        new BadRequestException(
                            'Chỉ hỗ trợ file CV định dạng .pdf hoặc .docx',
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    ],
    controllers: [CvMatchingController],
    providers: [CvMatchingService, CvParserService, GeminiService],
})
export class CvMatchingModule { }
