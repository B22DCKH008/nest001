import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'Tên danh mục' })
  @IsString()
  @Length(1, 100, { message: 'Tên danh mục phải có độ dài 1-100 ký tự' })
  name!: string;

  @ApiPropertyOptional({ example: 'Thiết bị điện tử', description: 'Mô tả danh mục' })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;
}
