import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';



@Module({
  imports: [UserModule, AuthModule, ProductModule, CategoryModule, CartModule, OrderModule, HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
        JWT_SECRET: Joi.string().required(),
        JWT_ACCESS_TOKEN_EXPIRE: Joi.string().default('1h'),
        JWT_REFRESH_TOKEN_EXPIRE: Joi.string().default('7d'),
        DB_DRIVER: Joi.string().default('mysql'),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(3306),
        DB_NAME: Joi.string().default('nestjs001'),
        DB_USERNAME: Joi.string().default('root'),
        DB_PASSWORD: Joi.string().allow('').default(''),
        DB_SSL: Joi.string().valid('true', 'false').default('false'),
        DB_SSL_REJECT_UNAUTHORIZED: Joi.string().valid('true', 'false').default('false'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').default(''),
        REDIS_TLS: Joi.string().valid('true', 'false').default('false'),
        MAIL_HOST: Joi.string().default('smtp.gmail.com'),
        MAIL_PORT: Joi.number().default(587),
        MAIL_USER: Joi.string().allow('').default(''),
        MAIL_PASS: Joi.string().allow('').default(''),
        MAIL_FROM: Joi.string().default('noreply@shopapp.com'),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => ({
        store: redisStore,
        host: cfg.get<string>('REDIS_HOST', 'localhost'),
        port: cfg.get<number>('REDIS_PORT', 6379),
        password: cfg.get<string>('REDIS_PASSWORD', '') || undefined,
        tls: cfg.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        ttl: 60,
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 60 },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get<string>('REDIS_PASSWORD', '') || undefined,
          tls: cfg.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: (cfg.get<string>('DB_DRIVER', 'mysql')) as any,
        host: cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 3306),
        username: cfg.get<string>('DB_USERNAME', 'root'),
        password: cfg.get<string>('DB_PASSWORD', ''),
        database: cfg.get<string>('DB_NAME', 'nestjs001'),
        entities: [Product, User, Category, Cart, CartItem, Order, OrderItem],
        synchronize: cfg.get<string>('NODE_ENV') !== 'production',
        ssl: cfg.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: cfg.get<string>('DB_SSL_REJECT_UNAUTHORIZED') === 'true' }
          : undefined,
      }),
    })
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
