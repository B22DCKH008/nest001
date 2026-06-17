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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Tai nghe Sony WH-1000XM5',
    description: 'Tên sản phẩm',
  })
  @IsString()
  @Length(1, 255, {
    message: 'Tên bắt buộc phải có độ dài từ 1 đến 255 ký tự',
  })
  name!: string;

  @ApiProperty({ example: 8990000, description: 'Giá sản phẩm (VND)' })
  @Type(() => Number)
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, {
    message: `Giá phải lớn hơn hoặc bằng 0`,
  })
  @Max(1000000000, {
    message: `Giá không được lớn hơn 1.000.000.000`,
  })
  price!: number;

  @ApiProperty({ example: 20, description: 'Số lượng tồn kho' })
  @Type(() => Number)
  @IsInt({ message: 'Tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  @Max(1000000000, {
    message: 'Tồn kho không được lớn hơn 1.000.000.000',
  })
  stock!: number;

  @ApiPropertyOptional({
    example: 'Tai nghe chống ồn cao cấp',
    description: 'Mô tả sản phẩm',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là một chuỗi' })
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID danh mục (tùy chọn)' })
  @IsOptional()
  @IsNumber({}, { message: 'category_id phải là số' })
  category_id?: number;
}
