import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { Role } from './schemas/role.schema';
import { IUser } from 'src/users/users.interface';
import { ADMIN_ROLE } from 'src/databases/sample';

describe('RolesService', () => {
    let service: RolesService;
    let roleModel: {
        findOne: jest.Mock;
        create: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        roleModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                { provide: getModelToken(Role.name), useValue: roleModel },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
    });

    describe('create', () => {
        it('throws when a role with the same name already exists', async () => {
            roleModel.findOne.mockResolvedValue({ _id: 'existing' });

            await expect(
                service.create({ name: 'ADMIN' } as any, actingUser),
            ).rejects.toThrow(BadRequestException);
            expect(roleModel.create).not.toHaveBeenCalled();
        });

        it('creates the role, stamped with the acting user', async () => {
            roleModel.findOne.mockResolvedValue(null);
            roleModel.create.mockResolvedValue({ _id: 'role1', createdAt: '2026-01-01' });

            const result = await service.create({ name: 'HR' } as any, actingUser);

            expect(roleModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'HR', createdBy: { _id: actingUser._id, email: actingUser.email } }),
            );
            expect(result).toEqual({ _id: 'role1', createdAt: '2026-01-01' });
        });
    });

    describe('findOne', () => {
        it('throws for an invalid id', async () => {
            await expect(service.findOne('not-an-id')).rejects.toThrow(BadRequestException);
            expect(roleModel.findById).not.toHaveBeenCalled();
        });

        it('looks up the role by id and populates its permissions', async () => {
            const populate = jest.fn().mockResolvedValue({ _id: validId, permissions: [] });
            roleModel.findById.mockResolvedValue({ populate });

            const result = await service.findOne(validId);

            expect(roleModel.findById).toHaveBeenCalledWith(validId);
            expect(populate).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'permissions' }),
            );
            expect(result).toEqual({ _id: validId, permissions: [] });
        });
    });

    describe('update', () => {
        it('throws for an invalid id', async () => {
            await expect(service.update('not-an-id', {} as any, actingUser)).rejects.toThrow(BadRequestException);
            expect(roleModel.updateOne).not.toHaveBeenCalled();
        });

        it('updates the role, stamped with the acting user', async () => {
            roleModel.updateOne.mockResolvedValue({ acknowledged: true });

            await service.update(validId, { name: 'HR2' } as any, actingUser);

            expect(roleModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                expect.objectContaining({ name: 'HR2', updatedBy: { _id: actingUser._id, email: actingUser.email } }),
            );
        });
    });

    describe('remove', () => {
        it('refuses to delete the ADMIN role', async () => {
            roleModel.findById.mockResolvedValue({ name: ADMIN_ROLE });

            await expect(service.remove(validId, actingUser)).rejects.toThrow(BadRequestException);
            expect(roleModel.updateOne).not.toHaveBeenCalled();
        });

        it('soft-deletes a non-admin role, stamped with the acting user', async () => {
            roleModel.findById.mockResolvedValue({ name: 'HR' });
            roleModel.updateOne.mockResolvedValue({ acknowledged: true });
            roleModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(roleModel.softDelete).toHaveBeenCalledWith({ _id: validId });
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
