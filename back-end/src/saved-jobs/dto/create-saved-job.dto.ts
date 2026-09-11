import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateSavedJobDto {
    @IsNotEmpty({ message: 'jobId không được để trống', })
    @IsMongoId({ message: 'jobId is a mongo id' })
    jobId: string;
}
