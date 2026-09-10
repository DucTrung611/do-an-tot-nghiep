import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { RolesService } from 'src/roles/roles.service';

// Service test: mock the collaborators AuthService depends on (UsersService,
// RolesService), not the Mongoose models underneath them — that's UsersService's
// own job to wrap. Real AuthService code runs; only its dependencies are faked.
describe('AuthService', () => {
    let service: AuthService;
    let usersService: { findOneByUsername: jest.Mock; isValidPassword: jest.Mock; register: jest.Mock };
    let rolesService: { findOne: jest.Mock };

    beforeEach(async () => {
        usersService = {
            findOneByUsername: jest.fn(),
            isValidPassword: jest.fn(),
            register: jest.fn(),
        };
        rolesService = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: usersService },
                { provide: RolesService, useValue: rolesService },
                { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    describe('validateUser', () => {
        it('returns null when no user matches the username', async () => {
            usersService.findOneByUsername.mockResolvedValue(null);

            const result = await service.validateUser('nobody', 'password');

            expect(result).toBeNull();
            expect(usersService.isValidPassword).not.toHaveBeenCalled();
        });

        it('returns null when the password does not match', async () => {
            usersService.findOneByUsername.mockResolvedValue({
                toObject: () => ({ email: 'a@b.com' }),
                password: 'hashed',
                role: { _id: 'role1' },
            });
            usersService.isValidPassword.mockReturnValue(false);

            const result = await service.validateUser('a@b.com', 'wrong-password');

            expect(result).toBeNull();
        });

        it('returns the user merged with their role permissions when credentials are valid', async () => {
            usersService.findOneByUsername.mockResolvedValue({
                toObject: () => ({ email: 'a@b.com' }),
                password: 'hashed',
                role: { _id: 'role1', name: 'ADMIN' },
            });
            usersService.isValidPassword.mockReturnValue(true);
            rolesService.findOne.mockResolvedValue({ permissions: ['perm1'] });

            const result = await service.validateUser('a@b.com', 'correct-password');

            expect(result).toEqual({ email: 'a@b.com', permissions: ['perm1'] });
        });
    });

    describe('register', () => {
        it('delegates to UsersService.register and returns only id and createdAt', async () => {
            usersService.register.mockResolvedValue({
                _id: 'user1',
                createdAt: '2026-01-01',
                email: 'a@b.com',
                password: 'hashed',
            });

            const result = await service.register({ email: 'a@b.com' } as any);

            expect(usersService.register).toHaveBeenCalledWith({ email: 'a@b.com' });
            expect(result).toEqual({ _id: 'user1', createdAt: '2026-01-01' });
        });
    });
});
