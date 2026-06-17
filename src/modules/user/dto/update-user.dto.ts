import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyen Van B', description: 'Họ tên mới' })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @Length(1, 50, {
    message: 'Tên phải có độ dài từ 1 đến 50 ký tự',
  })
  name?: string;

  @ApiPropertyOptional({ example: 'new@example.com', description: 'Email mới' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(254, {
    message: 'Email không được vượt quá 254 ký tự',
  })
  email?: string;
}
