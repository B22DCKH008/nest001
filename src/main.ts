import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingMiddleware } from './middleware/logging/logging.middleware';
import { AllHttpExceptionFilter } from './exceptions/http-exception.filter';
import { winstonLogger } from './logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
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
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
