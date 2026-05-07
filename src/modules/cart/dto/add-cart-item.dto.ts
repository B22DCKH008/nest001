import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm cần thêm vào cart' })
  @IsNumber({}, { message: 'product_id phải là số' })
  product_id!: number;

  @ApiProperty({ example: 1, description: 'Số lượng (tối thiểu 1)' })
  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity!: number;
}
