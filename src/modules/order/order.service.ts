import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Cache } from 'cache-manager';
import { Cart } from 'src/entities/Cart';
import { CartItem } from 'src/entities/CartItem';
import { Order } from 'src/entities/Order';
import { OrderItem } from 'src/entities/OrderItem';
import { Product } from 'src/entities/Product';
import { User } from 'src/entities/User';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue('order')
    private readonly orderQueue: Queue,
  ) {}

  async checkout(userId: number): Promise<Order> {
    const startedAt = Date.now();
    let savedOrderId = 0;
    let totalAmount = 0;
    let checkoutOrder: Order | null = null;
    let mailItems: Array<{
      product_name: string;
      product_price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    await this.dataSource.transaction(async (manager) => {
      const transactionStartedAt = Date.now();
      const cart = await manager.getRepository(Cart).findOne({
        where: { user: { id: userId } },
        relations: ['items', 'items.product'],
      });

      if (!cart?.items || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng trống, không thể tạo đơn hàng');
      }

      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);
      const productRepository = manager.getRepository(Product);
      const now = new Date();
      let total = 0;
      const productIds = cart.items.map((item) => item.product.id);
      const products = await productRepository.find({
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const productById = new Map(
        products.map((product) => [product.id, product]),
      );

      const savedOrder = await orderRepository.save(
        orderRepository.create({
          user: { id: userId },
          status: 'pending',
          total_amount: 0,
          created_at: now,
          updated_at: now,
        }),
      );

      const orderItems: OrderItem[] = [];

      for (const cartItem of cart.items) {
        const product = productById.get(cartItem.product.id);

        if (!product) {
          throw new NotFoundException('Sản phẩm không tìm thấy');
        }
        if (product.stock <= 0) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" đã hết hàng`,
          );
        }
        if (cartItem.quantity > product.stock) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm trong kho`,
          );
        }

        const subtotal = product.price * cartItem.quantity;
        total += subtotal;
        product.stock -= cartItem.quantity;
        product.updated_at = now;

        orderItems.push(
          orderItemRepository.create({
            order: { id: savedOrder.id },
            product: { id: product.id },
            product_name: product.name,
            product_price: product.price,
            quantity: cartItem.quantity,
            subtotal,
            created_at: now,
            updated_at: now,
          }),
        );
      }

      await productRepository.save(products);
      savedOrder.total_amount = total;
      savedOrder.updated_at = now;
      await orderRepository.save(savedOrder);
      const savedOrderItems = await orderItemRepository.save(orderItems);
      await manager.getRepository(CartItem).delete({ cart: { id: cart.id } });
      await manager.getRepository(Cart).update(cart.id, { updated_at: now });

      savedOrderId = savedOrder.id;
      totalAmount = total;
      savedOrder.items = savedOrderItems;
      checkoutOrder = savedOrder;
      mailItems = savedOrderItems.map((item) => ({
        product_name: item.product_name,
        product_price: Number(item.product_price),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      }));
      this.logger.log(
        `Checkout transaction order #${savedOrderId} completed in ${
          Date.now() - transactionStartedAt
        }ms`,
      );
    });

    void this.runCheckoutSideEffects(
      userId,
      savedOrderId,
      totalAmount,
      mailItems,
    );

    this.logger.log(
      `Checkout response order #${savedOrderId} ready in ${
        Date.now() - startedAt
      }ms`,
    );

    if (!checkoutOrder) {
      return this.findOne(userId, savedOrderId);
    }
    return checkoutOrder;
  }

  private async runCheckoutSideEffects(
    userId: number,
    orderId: number,
    totalAmount: number,
    mailItems: Array<{
      product_name: string;
      product_price: number;
      quantity: number;
      subtotal: number;
    }>,
  ) {
    const startedAt = Date.now();

    try {
      const cacheStartedAt = Date.now();
      await this.cacheManager.clear();
      this.logger.log(
        `Checkout cache clear order #${orderId} completed in ${
          Date.now() - cacheStartedAt
        }ms`,
      );
    } catch (error) {
      this.logger.warn(
        `Checkout cache clear order #${orderId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      const queueStartedAt = Date.now();
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const email = user?.email ?? `user_${userId}@unknown`;
      await this.orderQueue.add('order.created', {
        orderId,
        email,
        total_amount: totalAmount,
        items: mailItems,
      });
      this.logger.log(
        `Checkout email queue order #${orderId} completed in ${
          Date.now() - queueStartedAt
        }ms`,
      );
    } catch (error) {
      this.logger.warn(
        `Checkout email queue order #${orderId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    this.logger.log(
      `Checkout side effects order #${orderId} completed in ${
        Date.now() - startedAt
      }ms`,
    );
  }

  async findAll(userId: number, page = 1, limit = 10) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
      throw new BadRequestException(
        'Chỉ có thể huỷ đơn hàng đang ở trạng thái pending',
      );
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
    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(
    orderId: number,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tìm thấy');
    }
    order.status = dto.status;
    order.updated_at = new Date();
    return this.orderRepository.save(order);
  }
}
