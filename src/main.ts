import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingMiddleware } from './middleware/logging/logging.middleware';
import { AllHttpExceptionFilter } from './exceptions/http-exception.filter';
import { winstonLogger } from './logger/winston.logger';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync } from 'fs';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: winstonLogger,
  });

  mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Security headers
  app.use(helmet());

  // CORS — dùng CORS_ORIGIN env var trên production
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.use(new LoggingMiddleware().use); // Sử dụng middleware LoggerMiddleware cho tất cả các route

  app.useGlobalFilters(new AllHttpExceptionFilter()); // 

  app.useGlobalPipes(
    new ValidationPipe({ 
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Swagger — chỉ hiển thị khi không phải production
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('nest001 API')
      .setDescription('NestJS REST API — Auth / User / Product / Category')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  // Railway yêu cầu bind 0.0.0.0
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
