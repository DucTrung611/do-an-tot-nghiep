import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { CompaniesService } from './companies.service';
import { Company } from './schemas/company.schema';
import { IUser } from 'src/users/users.interface';

describe('CompaniesService', () => {
    let service: CompaniesService;
    let companyModel: {
        create: jest.Mock;
        findById: jest.Mock;
        updateOne: jest.Mock;
        softDelete: jest.Mock;
    };

    const actingUser = { _id: 'actor1', email: 'actor@b.com' } as IUser;
    const validId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
        companyModel = {
            create: jest.fn(),
            findById: jest.fn(),
            updateOne: jest.fn(),
            softDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CompaniesService,
                { provide: getModelToken(Company.name), useValue: companyModel },
            ],
        }).compile();

        service = module.get<CompaniesService>(CompaniesService);
    });

    describe('create', () => {
        it('stamps the new company with the acting user', () => {
            companyModel.create.mockResolvedValue({ _id: 'new1' });

            service.create({ name: 'ACME' } as any, actingUser);

            expect(companyModel.create).toHaveBeenCalledWith({
                name: 'ACME',
                createdBy: { _id: actingUser._id, email: actingUser.email },
            });
        });
    });

    describe('findOne', () => {
        it('throws for an invalid id', async () => {
            await expect(service.findOne('not-an-id')).rejects.toThrow(BadRequestException);
            expect(companyModel.findById).not.toHaveBeenCalled();
        });

        it('looks up the company by id', async () => {
            companyModel.findById.mockResolvedValue({ _id: validId, name: 'ACME' });

            const result = await service.findOne(validId);

            expect(companyModel.findById).toHaveBeenCalledWith(validId);
            expect(result).toEqual({ _id: validId, name: 'ACME' });
        });
    });

    describe('update', () => {
        it('stamps the update with the acting user', async () => {
            companyModel.updateOne.mockResolvedValue({ acknowledged: true });

            await service.update(validId, { name: 'New name' } as any, actingUser);

            expect(companyModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                { name: 'New name', updatedBy: { _id: actingUser._id, email: actingUser.email } },
            );
        });
    });

    describe('remove', () => {
        it('soft-deletes the company, stamped with the acting user', async () => {
            companyModel.updateOne.mockResolvedValue({ acknowledged: true });
            companyModel.softDelete.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

            const result = await service.remove(validId, actingUser);

            expect(companyModel.updateOne).toHaveBeenCalledWith(
                { _id: validId },
                { deletedBy: { _id: actingUser._id, email: actingUser.email } },
            );
            expect(companyModel.softDelete).toHaveBeenCalledWith({ _id: validId });
            expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
        });
    });
});
