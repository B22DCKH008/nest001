import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/Product';
import { ProductModule } from './modules/product/product.module';
import { User } from './entities/User';
import { Category } from './entities/Category';
import { CategoryModule } from './modules/category/category.module';
import { Cart } from './entities/Cart';
import { CartItem } from './entities/CartItem';
import { CartModule } from './modules/cart/cart.module';
import { Order } from './entities/Order';
import { OrderItem } from './entities/OrderItem';
import { OrderModule } from './modules/order/order.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { BullModule } from '@nestjs/bullmq';



@Module({
  imports: [UserModule, AuthModule, ProductModule, CategoryModule, CartModule, OrderModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        ttl: 60,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    TypeOrmModule.forRoot({
      type: process.env.DB_DRIVER as any,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Product, User, Category, Cart, CartItem, Order, OrderItem],
      synchronize: true,
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
