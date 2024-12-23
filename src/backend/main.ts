import { NestFactory } from '@nestjs/core';
import { AppModule } from './reservation.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS 설정
  const corsOptions: CorsOptions = {
    origin: 'http://localhost:3000', // Next.js 프론트엔드 주소
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };
  
  app.enableCors(corsOptions);
  
  console.log('서버가 시작되었습니다!');
  await app.listen(3300);
}
bootstrap();