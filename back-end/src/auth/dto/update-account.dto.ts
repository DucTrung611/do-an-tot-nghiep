import { IsNotEmpty } from 'class-validator';

export class UpdateAccountDto {
    @IsNotEmpty({ message: 'Name không được để trống' })
    name: string;

    @IsNotEmpty({ message: 'Age không được để trống' })
    age: number;

    @IsNotEmpty({ message: 'Address không được để trống' })
    address: string;
}
