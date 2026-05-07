import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ tên người dùng' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(1, 50, { message: 'Tên phải có độ dài từ 1 đến 50 ký tự' })
  name!: string;

  @ApiProperty({ example: 'user@example.com', description: 'Địa chỉ email' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu tối thiểu 6 ký tự' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;
}
