import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'admin', enum: ['user', 'admin'], description: 'Role mới của user' })
  @IsIn(['user', 'admin'], { message: 'Role phải là "user" hoặc "admin"' })
  role!: 'user' | 'admin';
}
