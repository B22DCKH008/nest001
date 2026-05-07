import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Tai nghe Sony WH-1000XM5', description: 'Tên sản phẩm' })
  @IsString()
  @Length(1, 255, { message: 'Tên bắt buộc phải có độ dài từ 1 đến 255 ký tự' })
  name!: string;

  @ApiProperty({ example: 8990000, description: 'Giá sản phẩm (VND)' })
  @IsNumber({}, { message: 'Giá phải là một số' })
  price!: number;

  @ApiProperty({ example: 'Tai nghe chống ồn cao cấp', description: 'Mô tả sản phẩm' })
  @IsString({ message: 'Mô tả phải là một chuỗi' })
  description!: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục (tùy chọn)' })
  @IsOptional()
  @IsNumber({}, { message: 'category_id phải là số' })
  category_id?: number;
}
