import { NestFactory } from '@nestjs/core';
import { AppModule } from './reservation.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3300).then(() => {
    console.log('서버가 시작되었습니다! http://localhost:3300');
  });
}
bootstrap();