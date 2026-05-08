import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Order } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { User } from 'src/entities/User';
import { CartModule } from 'src/modules/cart/cart.module';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderProcessor } from './order.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User]),
    CartModule,
    BullModule.registerQueue({ name: 'order' }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor],
})
export class OrderModule {}
