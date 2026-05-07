import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus } from 'src/entities/Order';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'confirmed', description: 'Trạng thái mới', enum: ['pending', 'confirmed', 'cancelled'] })
  @IsIn(['pending', 'confirmed', 'cancelled'], { message: 'Status phải là pending, confirmed hoặc cancelled' })
  status!: OrderStatus;
}
