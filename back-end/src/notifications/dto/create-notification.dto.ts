import { IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsMongoId({ message: 'userId is a mongo id' })
    userId: string;

    @IsNotEmpty({ message: 'type không được để trống' })
    @IsString()
    type: string;

    @IsNotEmpty({ message: 'title không được để trống' })
    @IsString()
    title: string;

    @IsNotEmpty({ message: 'message không được để trống' })
    @IsString()
    message: string;

    @IsOptional()
    @IsString()
    link?: string;

    @IsOptional()
    @IsObject()
    meta?: Record<string, any>;
}
