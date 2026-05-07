import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Số lượng mới (0 = xóa item khỏi cart)' })
  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(0, { message: 'Số lượng không được âm' })
  quantity!: number;
}
