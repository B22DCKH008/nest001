import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Tai nghe Sony WH-1000XM5', description: 'Tên sản phẩm' })
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'Tên sản phẩm phải có độ dài 1-255 ký tự' })
  name?: string;

  @ApiPropertyOptional({ example: 8990000, description: 'Giá sản phẩm (VND)' })
  @IsOptional()
  @IsNumber({}, { message: 'Giá phải là một số' })
  price?: number;

  @ApiPropertyOptional({ example: 'Mô tả mới', description: 'Mô tả sản phẩm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục (null để bỏ gán)' })
  @IsOptional()
  @IsNumber({}, { message: 'category_id phải là số' })
  category_id?: number;
}
