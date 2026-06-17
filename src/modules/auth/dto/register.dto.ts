import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ tên người dùng' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(1, 50, {
    message: 'Tên phải có độ dài từ 1 đến 50 ký tự',
  })
  name!: string;

  @ApiProperty({ example: 'user@example.com', description: 'Địa chỉ email' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(254, {
    message: 'Email không được vượt quá 254 ký tự',
  })
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu tối thiểu 6 ký tự',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, {
    message: 'Mật khẩu phải có ít nhất 6 ký tự',
  })
  @MaxLength(72, {
    message: 'Mật khẩu không được vượt quá 72 ký tự',
  })
  password!: string;
}
