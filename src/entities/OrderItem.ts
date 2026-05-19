import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  product_name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  product_price: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

}
