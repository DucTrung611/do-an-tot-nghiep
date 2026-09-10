import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { DatabasesService } from './databases.service';
import { User } from 'src/users/schemas/user.schema';
import { Permission } from 'src/permissions/schemas/permission.schema';
import { Role } from 'src/roles/schemas/role.schema';
import { Company } from 'src/companies/schemas/company.schema';
import { Job } from 'src/jobs/schemas/job.schema';
import { Subscriber } from 'src/subscribers/schemas/subscriber.schema';
import { Resume } from 'src/resumes/schemas/resume.schema';
import { UsersService } from 'src/users/users.service';
import { ADMIN_ROLE, USER_ROLE } from './sample';

function makeModel(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
        count: jest.fn().mockResolvedValue(0),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        insertMany: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
}

describe('DatabasesService', () => {
    let userModel: ReturnType<typeof makeModel>;
    let permissionModel: ReturnType<typeof makeModel>;
    let roleModel: ReturnType<typeof makeModel>;
    let companyModel: ReturnType<typeof makeModel>;
    let jobModel: ReturnType<typeof makeModel>;
    let subscriberModel: ReturnType<typeof makeModel>;
    let resumeModel: ReturnType<typeof makeModel>;
    let configService: { get: jest.Mock };
    let usersService: { getHashPassword: jest.Mock };

    async function buildService() {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabasesService,
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: getModelToken(Permission.name), useValue: permissionModel },
                { provide: getModelToken(Role.name), useValue: roleModel },
                { provide: getModelToken(Company.name), useValue: companyModel },
                { provide: getModelToken(Job.name), useValue: jobModel },
                { provide: getModelToken(Subscriber.name), useValue: subscriberModel },
                { provide: getModelToken(Resume.name), useValue: resumeModel },
                { provide: ConfigService, useValue: configService },
                { provide: UsersService, useValue: usersService },
            ],
        }).compile();

        return module.get<DatabasesService>(DatabasesService);
    }

    beforeEach(() => {
        userModel = makeModel();
        permissionModel = makeModel({
            find: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }),
        });
        roleModel = makeModel();
        companyModel = makeModel();
        jobModel = makeModel();
        subscriberModel = makeModel();
        resumeModel = makeModel();
        configService = { get: jest.fn() };
        usersService = { getHashPassword: jest.fn().mockReturnValue('hashed-password') };
    });

    it('does nothing when SHOULD_INIT is not set', async () => {
        configService.get.mockReturnValue(undefined);
        const service = await buildService();

        await service.onModuleInit();

        expect(permissionModel.count).not.toHaveBeenCalled();
        expect(permissionModel.insertMany).not.toHaveBeenCalled();
    });

    it('seeds permissions, roles and users from empty collections', async () => {
        configService.get.mockImplementation((key: string) => {
            if (key === 'SHOULD_INIT') return 'true';
            if (key === 'INIT_PASSWORD') return 'secret';
            return undefined;
        });
        roleModel.findOne.mockImplementation(({ name }: { name: string }) =>
            Promise.resolve(name === ADMIN_ROLE ? { _id: 'adminRoleId' } : { _id: 'userRoleId' }),
        );

        const service = await buildService();
        await service.onModuleInit();

        expect(permissionModel.insertMany).toHaveBeenCalled();
        expect(roleModel.insertMany).toHaveBeenCalledWith([
            expect.objectContaining({ name: ADMIN_ROLE }),
            expect.objectContaining({ name: USER_ROLE }),
        ]);
        expect(userModel.insertMany).toHaveBeenCalled();
        const insertedUsers = userModel.insertMany.mock.calls[0][0];
        expect(insertedUsers[0]).toEqual(
            expect.objectContaining({ email: 'admin@gmail.com', password: 'hashed-password', role: 'adminRoleId' }),
        );
    });

    it('skips seeding collections that already have data', async () => {
        configService.get.mockImplementation((key: string) => (key === 'SHOULD_INIT' ? 'true' : undefined));
        permissionModel.count.mockResolvedValue(5);
        roleModel.count.mockResolvedValue(2);
        userModel.count.mockResolvedValue(3);
        companyModel.count.mockResolvedValue(1);
        jobModel.count.mockResolvedValue(1);
        subscriberModel.count.mockResolvedValue(1);
        resumeModel.count.mockResolvedValue(1);

        const service = await buildService();
        await service.onModuleInit();

        expect(permissionModel.insertMany).not.toHaveBeenCalled();
        expect(roleModel.insertMany).not.toHaveBeenCalled();
        expect(userModel.insertMany).not.toHaveBeenCalled();
        expect(companyModel.insertMany).not.toHaveBeenCalled();
        expect(jobModel.insertMany).not.toHaveBeenCalled();
        expect(subscriberModel.insertMany).not.toHaveBeenCalled();
        expect(resumeModel.insertMany).not.toHaveBeenCalled();
    });
});
