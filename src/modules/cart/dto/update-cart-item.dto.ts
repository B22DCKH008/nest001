import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'Số lượng mới (0 = xóa item khỏi cart)',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'quantity phải là số' })
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(0, { message: 'Số lượng không được âm' })
  quantity!: number;
}
