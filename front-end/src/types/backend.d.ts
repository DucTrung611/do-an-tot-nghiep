export interface IBackendRes<T> {
    error?: string | string[];
    message: string;
    statusCode: number | string;
    data?: T;
}

export interface IModelPaginate<T> {
    meta: {
        current: number;
        pageSize: number;
        pages: number;
        total: number;
    },
    result: T[]
}

export interface IAccount {
    access_token: string;
    user: {
        _id: string;
        email: string;
        name: string;
        age?: number;
        address?: string;
        role: {
            _id: string;
            name: string;
        }
        permissions: {
            _id: string;
            name: string;
            apiPath: string;
            method: string;
            module: string;
        }[]
    }
}

export interface IGetAccount extends Omit<IAccount, "access_token"> { }

export interface ICompany {
    _id?: string;
    name?: string;
    address?: string;
    logo: string;
    description?: string;
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}



export interface IUser {
    _id?: string;
    name: string;
    email: string;
    password?: string;
    age: number;
    gender: string;
    address: string;
    role?: {
        _id: string;
        name: string;
    }

    company?: {
        _id: string;
        name: string;
    }
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IJob {
    _id?: string;
    name: string;
    skills: string[];
    company?: {
        _id: string;
        name: string;
        logo?: string;
    }
    location: string;
    salary: number;
    quantity: number;
    level: string;
    description: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    jobType?: string;
    experienceYears?: number;

    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IResume {
    _id?: string;
    email: string;
    userId: string;
    url: string;
    status: string;
    companyId: string | {
        _id: string;
        name: string;
        logo: string;
    };
    jobId: string | {
        _id: string;
        name: string;
    };
    history?: {
        status: string;
        updatedAt: Date;
        updatedBy: { _id: string; email: string }
    }[]
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ISavedJob {
    _id?: string;
    userId: string;
    jobId: string | IJob;
    createdAt?: string;
    updatedAt?: string;
}

export interface IPermission {
    _id?: string;
    name?: string;
    apiPath?: string;
    method?: string;
    module?: string;

    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;

}

export interface IRole {
    _id?: string;
    name: string;
    description: string;
    isActive: boolean;
    permissions: IPermission[] | string[];

    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ISubscribers {
    _id?: string;
    name?: string;
    email?: string;
    skills: string[];
    createdBy?: string;
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ICvProfile {
    fullName: string;
    email: string;
    phone: string;
    currentTitle: string;
    summary: string;
    yearsOfExperience: number;
    level: string;
    /** Skill đã map về SKILLS_LIST của hệ thống. */
    skills: string[];
    /** Skill nguyên văn trong CV, kể cả cái không map được. */
    rawSkills: string[];
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

export interface ICvJobMatch {
    jobId: string;
    jobName: string;
    companyName: string;
    /** 0-100 */
    score: number;
    reason: string;
    matchedSkills: string[];
    missingSkills: string[];
}

export interface ICvAnalysis {
    _id?: string;
    email: string;
    userId: string;
    fileName: string;
    fileType: string;
    model: string;
    candidateJobCount: number;
    profile: ICvProfile;
    matches: ICvJobMatch[];
    createdBy?: { _id: string; email: string };
    isDeleted?: boolean;
    deletedAt?: boolean | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface IDashboardStats {
    totals: {
        users: number;
        jobs: number;
        companies: number;
        resumes: number;
        activeJobs: number;
        pendingResumes: number;
    };
    jobsByMonth: { month: string; count: number }[];
    applicationsByMonth: { month: string; count: number }[];
    resumesByStatus: { status: string; count: number }[];
    topSkills: { skill: string; count: number }[];
    jobsByLocation: { location: string; count: number }[];
    topJobsByApplications: { jobId: string; jobName: string; companyName?: string; count: number }[];
    salaryDistribution: { _id: number | string; count: number }[];
}

export interface INotification {
    _id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    meta?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
}
