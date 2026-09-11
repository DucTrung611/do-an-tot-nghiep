/**
 * Taxonomy chuẩn của hệ thống.
 *
 * Ba danh sách dưới đây là bản sao (49 skill) của taxonomy phía frontend:
 *  - CANONICAL_SKILLS    <- front-end/src/config/utils.ts  (SKILLS_LIST, field `value`)
 *  - CANONICAL_LOCATIONS <- front-end/src/config/utils.ts  (LOCATION_LIST, field `value`)
 *  - CANONICAL_LEVELS    <- front-end/src/pages/admin/job.tsx (valueEnum của cột level)
 *
 * Backend cần bản sao này để ép Gemini map skill viết tự do trong CV về đúng token
 * đang lưu trong `Job.skills`. Nếu hai bên lệch nhau thì `skills: { $in: [...] }`
 * sẽ luôn trả về 0 job.
 *
 * Khi thêm skill mới ở frontend, phải thêm vào đây.
 */
export const CANONICAL_SKILLS: string[] = [
    // IT
    'REACT.JS',
    'REACT NATIVE',
    'VUE.JS',
    'ANGULAR',
    'NEST.JS',
    'TYPESCRIPT',
    'JAVA',
    'FRONTEND',
    'BACKEND',
    'FULLSTACK',

    // Sales / Marketing
    'BAN HANG',
    'TU VAN KHACH HANG',
    'DIGITAL MARKETING',
    'SEO',
    'CONTENT MARKETING',
    'CHAY QUANG CAO',
    'TELESALES',

    // Kế toán / Tài chính
    'KE TOAN TONG HOP',
    'KE TOAN THUE',
    'PHAN TICH TAI CHINH',
    'KIEM TOAN',

    // Nhân sự / Hành chính
    'TUYEN DUNG',
    'C&B',
    'DAO TAO NOI BO',
    'HANH CHINH VAN PHONG',

    // Vận hành / Logistics
    'QUAN LY KHO',
    'DIEU PHOI VAN TAI',
    'XUAT NHAP KHAU',
    'CHUOI CUNG UNG',

    // Sản xuất / Kỹ thuật
    'VAN HANH MAY',
    'BAO TRI THIET BI',
    'QC/QA',
    'AN TOAN LAO DONG',

    // Dịch vụ / Nhà hàng / Khách sạn
    'PHA CHE',
    'PHUC VU',
    'LE TAN',
    'BUONG PHONG',
    'BEP',

    // Y tế / Giáo dục
    'DIEU DUONG',
    'DUOC SI',
    'GIANG DAY',
    'GIA SU',

    // Thiết kế / Sáng tạo
    'THIET KE DO HOA',
    'UI/UX DESIGN',
    'DUNG VIDEO',
    'NHIEP ANH',

    // Bất động sản / Pháp lý
    'MOI GIOI BAT DONG SAN',
    'TU VAN PHAP LY',
    'SOAN THAO HOP DONG',
];

/**
 * Bỏ "ALL" của LOCATION_LIST — đó là sentinel của UI filter, không phải địa điểm thật.
 */
export const CANONICAL_LOCATIONS: string[] = [
    'HANOI',
    'HOCHIMINH',
    'DANANG',
    'OTHER',
];

export const CANONICAL_LEVELS: string[] = [
    'INTERN',
    'FRESHER',
    'JUNIOR',
    'MIDDLE',
    'SENIOR',
];

/** Số ký tự CV tối đa gửi cho Gemini (~6k token) — đủ cho mọi CV thực tế. */
export const MAX_CV_TEXT_LENGTH = 20000;

/** Dưới ngưỡng này coi như không đọc được nội dung (PDF scan / ảnh). */
export const MIN_CV_TEXT_LENGTH = 100;

/** Số job tối đa đưa vào bước xếp hạng của AI. */
export const MAX_CANDIDATE_JOBS = 30;

/** Số job trả về cho người dùng. */
export const MAX_RETURNED_MATCHES = 10;

/** Điểm tối thiểu để một job được coi là phù hợp. */
export const MIN_MATCH_SCORE = 40;

/** Số ký tự mô tả job tối đa gửi kèm mỗi job (kiểm soát token). */
export const MAX_JOB_DESCRIPTION_LENGTH = 1200;

/**
 * `Job.description` là HTML sinh từ rich-text editor (react-quill) ở frontend.
 * Phải làm sạch trước khi đưa vào prompt, nếu không thì tag HTML ăn hết token
 * và làm nhiễu ngữ cảnh của model.
 */
export const stripHtml = (
    html = '',
    maxLen: number = MAX_JOB_DESCRIPTION_LENGTH,
): string =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
