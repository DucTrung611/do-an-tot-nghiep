import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
    oldPassword: string;

    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    newPassword: string;

    @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
    @Matches(/^(?=.*\w).+$/, {
        message: 'Xác nhận mật khẩu không hợp lệ',
    })
    confirmPassword: string;
}
