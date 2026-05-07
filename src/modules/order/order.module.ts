import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { CartModule } from 'src/modules/cart/cart.module';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), CartModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
