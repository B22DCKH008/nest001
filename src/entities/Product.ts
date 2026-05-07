import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './Category';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  price: number;

  @Column()
  description: string;

  @ManyToOne(() => Category, (category) => category.products, { nullable: true, eager: false })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
