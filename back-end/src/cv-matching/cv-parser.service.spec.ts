import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvParserService } from './cv-parser.service';

const mockGetText = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock('pdf-parse', () => ({
    PDFParse: jest.fn().mockImplementation(() => ({
        getText: mockGetText,
        destroy: mockDestroy,
    })),
}));

jest.mock('mammoth', () => ({
    extractRawText: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth');

const makeFile = (originalname: string): Express.Multer.File =>
    ({ originalname, buffer: Buffer.from('dummy') } as Express.Multer.File);

/** Text đủ dài để vượt MIN_CV_TEXT_LENGTH (100 ký tự). */
const longText = 'Thân Đức Trung, lập trình viên frontend với kinh nghiệm React và TypeScript, tốt nghiệp đại học tại Hà Nội, mong muốn tìm vị trí phù hợp.';

describe('CvParserService', () => {
    let service: CvParserService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockDestroy.mockResolvedValue(undefined);

        const module: TestingModule = await Test.createTestingModule({
            providers: [CvParserService],
        }).compile();

        service = module.get<CvParserService>(CvParserService);
    });

    describe('định tuyến theo định dạng file', () => {
        it('dùng pdf-parse cho file .pdf và luôn giải phóng parser', async () => {
            mockGetText.mockResolvedValue({ text: longText });

            const result = await service.extract(makeFile('cv.pdf'));

            expect(result.fileType).toBe('pdf');
            expect(result.text).toContain('Thân Đức Trung');
            expect(mockGetText).toHaveBeenCalled();
            // destroy() bắt buộc phải gọi, nếu không pdf.js giữ worker lại.
            expect(mockDestroy).toHaveBeenCalled();
            expect(mammoth.extractRawText).not.toHaveBeenCalled();
        });

        it('dùng mammoth cho file .docx', async () => {
            mammoth.extractRawText.mockResolvedValue({ value: longText });

            const result = await service.extract(makeFile('cv.docx'));

            expect(result.fileType).toBe('docx');
            expect(result.text).toContain('Thân Đức Trung');
            expect(mockGetText).not.toHaveBeenCalled();
        });

        it('nhận diện phần mở rộng không phân biệt chữ hoa chữ thường', async () => {
            mockGetText.mockResolvedValue({ text: longText });

            const result = await service.extract(makeFile('CV_FINAL.PDF'));

            expect(result.fileType).toBe('pdf');
        });

        it('vẫn giải phóng parser khi đọc PDF lỗi', async () => {
            mockGetText.mockRejectedValue(new Error('encrypted'));

            await expect(service.extract(makeFile('cv.pdf'))).rejects.toThrow(
                BadRequestException,
            );
            expect(mockDestroy).toHaveBeenCalled();
        });
    });

    describe('từ chối file không đọc được', () => {
        it('từ chối .doc với hướng dẫn cụ thể thay vì lỗi chung', async () => {
            await expect(service.extract(makeFile('cv.doc'))).rejects.toThrow(
                /\.doc \(Word cũ\) không được hỗ trợ/,
            );
        });

        it('từ chối định dạng khác', async () => {
            await expect(service.extract(makeFile('cv.txt'))).rejects.toThrow(
                BadRequestException,
            );
        });

        it('từ chối PDF không có lớp text (ảnh scan)', async () => {
            mockGetText.mockResolvedValue({ text: '   \n  ' });

            await expect(service.extract(makeFile('scan.pdf'))).rejects.toThrow(
                /ảnh scan/,
            );
        });

        it('từ chối DOCX rỗng', async () => {
            mammoth.extractRawText.mockResolvedValue({ value: '' });

            await expect(service.extract(makeFile('empty.docx'))).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('chuẩn hoá text', () => {
        it('gom khoảng trắng và cắt bớt dòng trống liên tiếp', async () => {
            mockGetText.mockResolvedValue({
                text: `  ${longText}   \r\n\n\n\n   thêm   nhiều    khoảng trắng  `,
            });

            const { text } = await service.extract(makeFile('cv.pdf'));

            expect(text).not.toMatch(/\r/);
            expect(text).not.toMatch(/\n{3,}/);
            expect(text).not.toMatch(/ {2,}/);
            expect(text.startsWith('Thân')).toBe(true);
            expect(text.endsWith('trắng')).toBe(true);
        });

        it('cắt CV quá dài về đúng giới hạn gửi cho AI', async () => {
            mockGetText.mockResolvedValue({ text: 'a'.repeat(50000) });

            const { text } = await service.extract(makeFile('cv.pdf'));

            expect(text).toHaveLength(20000);
        });
    });
});
