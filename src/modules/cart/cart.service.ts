import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from 'src/entities/Cart';
import { CartItem } from 'src/entities/CartItem';
import { Product } from 'src/entities/Product';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.category'],
    });
    if (!cart) {
      const newCart = this.cartRepository.create({
        user: { id: userId },
        created_at: new Date(),
        updated_at: new Date(),
      });
      await this.cartRepository.save(newCart);
      cart = await this.cartRepository.findOne({
        where: { id: newCart.id },
        relations: ['items', 'items.product', 'items.product.category'],
      });
    }
    return cart;
  }

  async addItem(userId: number, dto: AddCartItemDto): Promise<Cart> {
    const product = await this.productRepository.findOneBy({ id: dto.product_id });
    if (!product) {
      throw new NotFoundException(`Sản phẩm không tìm thấy`);
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = cart.items?.find((i) => i.product.id === dto.product_id);
    if (existingItem) {
      existingItem.quantity += dto.quantity;
      existingItem.updated_at = new Date();
      await this.cartItemRepository.save(existingItem);
    } else {
      const item = this.cartItemRepository.create({
        cart: { id: cart.id },
        product: { id: dto.product_id },
        quantity: dto.quantity,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await this.cartItemRepository.save(item);
    }

    // Dùng update() thay vì save() để tránh TypeORM cascade NULL hóa cart_id trên items
    await this.cartRepository.update(cart.id, { updated_at: new Date() });

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto): Promise<Cart> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart: { user: { id: userId } } },
    });

    if (!item) {
      throw new NotFoundException(`Item không tìm thấy`);
    }

    if (dto.quantity === 0) {
      await this.cartItemRepository.delete(itemId);
    } else {
      item.quantity = dto.quantity;
      item.updated_at = new Date();
      await this.cartItemRepository.save(item);
    }

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart: { user: { id: userId } } },
    });

    if (!item) {
      throw new NotFoundException(`Item không tìm thấy`);
    }

    await this.cartItemRepository.delete(itemId);
    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.delete({ cart: { id: cart.id } });
    // Dùng update() thay vì save() để tránh cascade NULL hóa cart_id
    await this.cartRepository.update(cart.id, { updated_at: new Date() });
    return this.getOrCreateCart(userId);
  }
}
