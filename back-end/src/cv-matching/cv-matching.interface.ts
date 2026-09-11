/**
 * Kết quả bước 1: Gemini đọc CV và trả về profile có cấu trúc.
 */
export interface ICvProfile {
    fullName: string;
    email: string;
    phone: string;
    currentTitle: string;
    summary: string;
    yearsOfExperience: number;
    /** Một trong CANONICAL_LEVELS. */
    level: string;
    /** Đã map về CANONICAL_SKILLS — dùng để query DB. */
    skills: string[];
    /** Skill nguyên văn trong CV (kể cả cái không map được) — để hiển thị và debug. */
    rawSkills: string[];
    /** Đã map về CANONICAL_LOCATIONS. */
    locations: string[];
    education: {
        school: string;
        degree: string;
        major: string;
        year: string;
    }[];
    experiences: {
        company: string;
        title: string;
        from: string;
        to: string;
        description: string;
    }[];
    languages: string[];
}

/**
 * Kết quả bước 2: Gemini chấm điểm từng job so với profile.
 */
export interface ICvJobMatch {
    jobId: string;
    jobName: string;
    companyName: string;
    /** 0-100. */
    score: number;
    /** Lý do phù hợp, tiếng Việt, 1-2 câu. */
    reason: string;
    matchedSkills: string[];
    missingSkills: string[];
}

/**
 * Job đã được gọt gọn trước khi đưa vào prompt xếp hạng.
 * Chỉ giữ field cần cho việc chấm điểm để kiểm soát token.
 */
export interface ICandidateJob {
    _id: string;
    name: string;
    companyName: string;
    skills: string[];
    level: string;
    location: string;
    salary: number;
    /** Đã qua stripHtml(). */
    description: string;
}
