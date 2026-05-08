import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingMiddleware } from './middleware/logging/logging.middleware';
import { AllHttpExceptionFilter } from './exceptions/http-exception.filter';
import { winstonLogger } from './logger/winston.logger';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  app.enableCors({ origin: 'http://localhost:5173', credentials: true });

  app.use(new LoggingMiddleware().use); // Sử dụng middleware LoggerMiddleware cho tất cả các route

  app.useGlobalFilters(new AllHttpExceptionFilter()); // 

  app.useGlobalPipes(
    new ValidationPipe({ 
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('nest001 API')
    .setDescription('NestJS REST API — Auth / User / Product / Category')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
