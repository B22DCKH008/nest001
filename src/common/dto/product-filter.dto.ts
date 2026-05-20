import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'phone', description: 'Tìm theo tên (LIKE search)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1, description: 'Lọc theo category id' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ example: 100, description: 'Giá tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500, description: 'Giá tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
