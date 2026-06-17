import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPass123', description: 'Mật khẩu hiện tại' })
  @IsString()
  @MaxLength(72, {
    message: 'Mật khẩu hiện tại không được vượt quá 72 ký tự',
  })
  currentPassword!: string;

  @ApiProperty({
    example: 'newPass456',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
  })
  @IsString()
  @MinLength(6, {
    message: 'Mật khẩu mới tối thiểu 6 ký tự',
  })
  @MaxLength(72, {
    message: 'Mật khẩu mới không được vượt quá 72 ký tự',
  })
  newPassword!: string;
}
