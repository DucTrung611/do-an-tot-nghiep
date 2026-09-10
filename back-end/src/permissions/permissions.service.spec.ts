import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { PermissionsService } from './permissions.service';
import { Permission } from './schemas/permission.schema';
import { IUser } from 'src/users/users.interface';

describe('PermissionsService', () => {
    let service: PermissionsService;
    let permissionModel: {
        findOne: jest.Mock;
        create: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        permissionModel = {
            findOne: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                { provide: getModelToken(Permission.name), useValue: permissionModel },
            ],
        }).compile();

        service = module.get<PermissionsService>(PermissionsService);
    });

    describe('create', () => {
        it('throws when a permission with the same apiPath/method already exists', async () => {
            permissionModel.findOne.mockResolvedValue({ _id: 'existing' });

            await expect(
                service.create({ name: 'p', apiPath: '/x', method: 'GET', module: 'X' } as any, actingUser),
            ).rejects.toThrow(BadRequestException);
            expect(permissionModel.create).not.toHaveBeenCalled();
        });

        it('creates the permission, stamped with the acting user', async () => {
            permissionModel.findOne.mockResolvedValue(null);
            permissionModel.create.mockResolvedValue({ _id: 'perm1', createdAt: '2026-01-01' });

            const result = await service.create(
                { name: 'p', apiPath: '/x', method: 'GET', module: 'X' } as any,
                actingUser,
            );

            expect(permissionModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ apiPath: '/x', method: 'GET', createdBy: { _id: actingUser._id, email: actingUser.email } }),
            );
            expect(result).toEqual({ _id: 'perm1', createdAt: '2026-01-01' });
        });
    });

    describe('findOne', () => {
        it('throws for an invalid id', async () => {
            await expect(service.findOne('not-an-id')).rejects.toThrow(BadRequestException);
            expect(permissionModel.findById).not.toHaveBeenCalled();
        });

        it('looks up the permission by id', async () => {
            permissionModel.findById.mockResolvedValue({ _id: validId });

            const result = await service.findOne(validId);

            expect(result).toEqual({ _id: validId });
        });
    });

    describe('update', () => {
        it('throws for an invalid id', async () => {
            await expect(service.update('not-an-id', {} as any, actingUser)).rejects.toThrow(BadRequestException);
            expect(permissionModel.updateOne).not.toHaveBeenCalled();
        });

        it('updates the permission, stamped with the acting user', async () => {
            permissionModel.updateOne.mockResolvedValue({ acknowledged: true });

            await service.update(
                validId,
                { name: 'p2', apiPath: '/y', method: 'POST', module: 'Y' } as any,
                actingUser,
            );

            expect(permissionModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                {
                    module: 'Y',
                    method: 'POST',
                    apiPath: '/y',
                    name: 'p2',
                    updatedBy: { _id: actingUser._id, email: actingUser.email },
                },
            );
        });
    });

    describe('remove', () => {
        it('soft-deletes the permission, stamped with the acting user', async () => {
            permissionModel.updateOne.mockResolvedValue({ acknowledged: true });
            permissionModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(permissionModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                { deletedBy: { _id: actingUser._id, email: actingUser.email } },
            );
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
