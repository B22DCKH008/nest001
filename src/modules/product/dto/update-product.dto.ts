import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  Length,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Tai nghe Sony WH-1000XM5',
    description: 'Tên sản phẩm',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255, {
    message: 'Tên sản phẩm phải có độ dài 1-255 ký tự',
  })
  name?: string;

  @ApiPropertyOptional({ example: 8990000, description: 'Giá sản phẩm (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, {
    message: `Giá phải lớn hơn hoặc bằng 0`,
  })
  @Max(1000000000, {
    message: `Giá không được lớn hơn 1.000.000.000`,
  })
  price?: number;

  @ApiPropertyOptional({ example: 20, description: 'Số lượng tồn kho' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  @Max(1000000000, {
    message: 'Tồn kho không được lớn hơn 1.000.000.000',
  })
  stock?: number;

  @ApiPropertyOptional({ example: 'Mô tả mới', description: 'Mô tả sản phẩm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID danh mục (null để bỏ gán)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'category_id phải là số' })
  category_id?: number;
}
