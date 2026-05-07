import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { CartService } from 'src/modules/cart/cart.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly cartService: CartService,
  ) {}

  async checkout(userId: number): Promise<Order> {
    const cart = await this.cartService.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể tạo đơn hàng');
    }

    const total_amount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const order = this.orderRepository.create({
      user: { id: userId },
      status: 'pending',
      total_amount,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const savedOrder = await this.orderRepository.save(order);

    const orderItems = cart.items.map((cartItem) =>
      this.orderItemRepository.create({
        order: { id: savedOrder.id },
        product_id: cartItem.product.id,
        product_name: cartItem.product.name,
        product_price: cartItem.product.price,
        quantity: cartItem.quantity,
        subtotal: cartItem.product.price * cartItem.quantity,
        created_at: new Date(),
      }),
    );
    await this.orderItemRepository.save(orderItems);

    await this.cartService.clearCart(userId);

    return this.findOne(userId, savedOrder.id);
  }

  findAll(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tìm thấy');
    }
    return order;
  }

  async cancel(userId: number, orderId: number): Promise<Order> {
    const order = await this.findOne(userId, orderId);
    if (order.status !== 'pending') {
      throw new BadRequestException('Chỉ có thể huỷ đơn hàng đang ở trạng thái pending');
    }
    order.status = 'cancelled';
    order.updated_at = new Date();
    return this.orderRepository.save(order);
  }

  findAllAdmin(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['items', 'user'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(orderId: number, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tìm thấy');
    }
    order.status = dto.status as OrderStatus;
    order.updated_at = new Date();
    return this.orderRepository.save(order);
  }
}
