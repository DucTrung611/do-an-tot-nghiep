export interface IUser {
    _id: string;
    name: string;
    email: string;
    age?: number;
    address?: string;
    company?: {
        _id: string;
        name: string;
    };
    role: {
        _id: string;
        name: string;
    };
    permissions?: {
        _id: string;
        name: string;
        apiPath: string;
        module: string;
    }[]
}
