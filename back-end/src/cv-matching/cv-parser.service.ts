import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { MAX_CV_TEXT_LENGTH, MIN_CV_TEXT_LENGTH } from './cv-matching.constants';

export interface IExtractResult {
    text: string;
    fileType: string;
}

/**
 * Trích xuất văn bản thuần từ file CV (PDF hoặc DOCX).
 *
 * Chạy trên buffer trong RAM — file CV không cần lưu xuống đĩa vì sau khi lấy
 * được text là bỏ.
 */
@Injectable()
export class CvParserService {
    private readonly logger = new Logger(CvParserService.name);

    async extract(file: Express.Multer.File): Promise<IExtractResult> {
        const extension = this.getExtension(file.originalname);

        let raw: string;
        switch (extension) {
            case 'pdf':
                raw = await this.extractPdf(file.buffer);
                break;
            case 'docx':
                raw = await this.extractDocx(file.buffer);
                break;
            case 'doc':
                // mammoth chỉ đọc được OOXML (.docx), không đọc được định dạng
                // binary Word cũ. Nói rõ cho người dùng thay vì để nó fail mù.
                throw new BadRequestException(
                    'File .doc (Word cũ) không được hỗ trợ. Vui lòng lưu CV dưới dạng .pdf hoặc .docx rồi thử lại.',
                );
            default:
                throw new BadRequestException(
                    'Chỉ hỗ trợ file CV định dạng .pdf hoặc .docx.',
                );
        }

        const text = this.normalize(raw);

        if (text.length < MIN_CV_TEXT_LENGTH) {
            // PDF scan / CV xuất từ ảnh: có trang nhưng không có lớp text nào.
            throw new BadRequestException(
                'Không đọc được nội dung CV. File có thể là ảnh scan — vui lòng dùng CV dạng văn bản (PDF text) hoặc .docx.',
            );
        }

        this.logger.log(
            `Đã trích xuất CV: ${file.originalname} (${extension}), ${text.length} ký tự`,
        );

        return { text, fileType: extension };
    }

    private getExtension(originalName = ''): string {
        // Chỉ tin phần mở rộng của tên file — `mimetype` do client gửi lên nên
        // không đáng tin, và multer trong repo này cũng chỉ kiểm tra phần mở rộng.
        return originalName.split('.').pop()?.toLowerCase() ?? '';
    }

    private async extractPdf(buffer: Buffer): Promise<string> {
        // pdf-parse v2: API hoàn toàn khác v1 (v1 là `pdf(buffer)`).
        // Bắt buộc gọi destroy() để giải phóng worker/memory của pdf.js.
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.text ?? '';
        } catch (error) {
            this.logger.error(`Lỗi đọc PDF: ${error?.message}`);
            throw new BadRequestException(
                'Không đọc được file PDF. File có thể bị lỗi hoặc được đặt mật khẩu.',
            );
        } finally {
            await parser.destroy().catch(() => undefined);
        }
    }

    private async extractDocx(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value ?? '';
        } catch (error) {
            this.logger.error(`Lỗi đọc DOCX: ${error?.message}`);
            throw new BadRequestException(
                'Không đọc được file DOCX. File có thể bị lỗi.',
            );
        }
    }

    private normalize(raw: string): string {
        return raw
            .replace(/\r/g, '')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .slice(0, MAX_CV_TEXT_LENGTH);
    }
}
