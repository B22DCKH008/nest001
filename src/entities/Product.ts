import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Category } from './Category';
import { OrderItem } from './OrderItem';
import { CartItem } from './CartItem';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column()
  description: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @OneToMany(() => CartItem, (cartItem) => cartItem.product, { cascade: true })
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product, {
    cascade: true,
  })
  orderItems: OrderItem[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string | null;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at: Date | null;
}
