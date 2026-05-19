import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Order, OrderStatus } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { User } from 'src/entities/User';
import { CartService } from 'src/modules/cart/cart.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cartService: CartService,
    @InjectQueue('order')
    private readonly orderQueue: Queue,
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
        product: { id: cartItem.product.id },
        product_name: cartItem.product.name,
        product_price: cartItem.product.price,
        quantity: cartItem.quantity,
        subtotal: cartItem.product.price * cartItem.quantity,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    );
    await this.orderItemRepository.save(orderItems);

    await this.cartService.clearCart(userId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const email = user?.email ?? `user_${userId}@unknown`;
    await this.orderQueue.add('order.created', { orderId: savedOrder.id, email });

    return this.findOne(userId, savedOrder.id);
  }

  async findAll(userId: number, page = 1, limit = 10) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async findAllAdmin(page = 1, limit = 10) {
    const [orders, total] = await this.orderRepository.findAndCount({
      relations: ['items', 'user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
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
