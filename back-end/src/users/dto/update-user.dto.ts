import { OmitType } from '@nestjs/mapped-types';
import { IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends OmitType(CreateUserDto, ['password'] as const) {
  @IsOptional()
  _id?: string;
}
