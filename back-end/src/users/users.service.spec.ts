import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User as UserM } from './schemas/user.schema';
import { Role } from 'src/roles/schemas/role.schema';
import { IUser } from './users.interface';

// Repository-wrapping service: UsersService talks straight to the Mongoose
// model, so the mock boundary here is the injected model itself, not a
// further collaborator (there isn't one).
describe('UsersService', () => {
    let service: UsersService;
    let userModel: {
        findOne: jest.Mock;
        create: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };
    let roleModel: { findOne: jest.Mock };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        userModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };
        roleModel = {
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: getModelToken(UserM.name), useValue: userModel },
                { provide: getModelToken(Role.name), useValue: roleModel },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    describe('create', () => {
        it('throws when the email is already taken', async () => {
            userModel.findOne.mockResolvedValue({ _id: 'existing' });

            await expect(
                service.create({ email: 'a@b.com', password: 'x' } as any, actingUser),
            ).rejects.toThrow(BadRequestException);
            expect(userModel.create).not.toHaveBeenCalled();
        });

        it('hashes the password and creates the user, stamped with the acting user', async () => {
            userModel.findOne.mockResolvedValue(null);
            userModel.create.mockResolvedValue({ _id: 'new1' });

            const result = await service.create(
                { name: 'A', email: 'a@b.com', password: 'plain', age: 20, gender: 'MALE', address: 'x', role: 'role1' } as any,
                actingUser,
            );

            expect(userModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'a@b.com',
                    createdBy: { _id: actingUser._id, email: actingUser.email },
                }),
            );
            expect(userModel.create.mock.calls[0][0].password).not.toBe('plain');
            expect(result).toEqual({ _id: 'new1' });
        });
    });

    describe('register', () => {
        it('throws when the email is already taken', async () => {
            userModel.findOne.mockResolvedValue({ _id: 'existing' });

            await expect(
                service.register({ email: 'a@b.com', password: 'x' } as any),
            ).rejects.toThrow(BadRequestException);
            expect(roleModel.findOne).not.toHaveBeenCalled();
        });

        it('assigns the default USER role and creates the account', async () => {
            userModel.findOne.mockResolvedValue(null);
            roleModel.findOne.mockResolvedValue({ _id: 'userRoleId' });
            userModel.create.mockResolvedValue({ _id: 'new1' });

            await service.register({ name: 'A', email: 'a@b.com', password: 'plain', age: 20, gender: 'MALE', address: 'x' } as any);

            expect(userModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'a@b.com', role: 'userRoleId' }),
            );
        });
    });

    describe('findOne', () => {
        it('returns a not-found message for an invalid id, without querying the model', async () => {
            const result = await service.findOne('not-an-id');

            expect(result).toBe('not found user');
            expect(userModel.findOne).not.toHaveBeenCalled();
        });

        it('queries by id, excluding the password and populating the role', async () => {
            const populate = jest.fn().mockResolvedValue({ _id: validId, email: 'a@b.com' });
            const select = jest.fn().mockReturnValue({ populate });
            userModel.findOne.mockReturnValue({ select });

            const result = await service.findOne(validId);

            expect(userModel.findOne).toHaveBeenCalledWith({ _id: validId });
            expect(select).toHaveBeenCalledWith('-password');
            expect(result).toEqual({ _id: validId, email: 'a@b.com' });
        });
    });

    describe('isValidPassword', () => {
        it('matches a password against its own hash', () => {
            const hash = service.getHashPassword('correct-password');

            expect(service.isValidPassword('correct-password', hash)).toBe(true);
            expect(service.isValidPassword('wrong-password', hash)).toBe(false);
        });
    });

    describe('remove', () => {
        it('returns a not-found message for an invalid id', async () => {
            const result = await service.remove('not-an-id', actingUser);

            expect(result).toBe('not found user');
            expect(userModel.findById).not.toHaveBeenCalled();
        });

        it('refuses to delete the protected admin account', async () => {
            userModel.findById.mockResolvedValue({ email: 'admin@gmail.com' });

            await expect(service.remove(validId, actingUser)).rejects.toThrow(BadRequestException);
            expect(userModel.updateOne).not.toHaveBeenCalled();
        });

        it('soft-deletes a regular user, stamped with the acting user', async () => {
            userModel.findById.mockResolvedValue({ email: 'user@b.com' });
            userModel.updateOne.mockResolvedValue({ acknowledged: true });
            userModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(userModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                { deletedBy: { _id: actingUser._id, email: actingUser.email } },
            );
            expect(userModel.softDelete).toHaveBeenCalledWith({ _id: validId });
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
