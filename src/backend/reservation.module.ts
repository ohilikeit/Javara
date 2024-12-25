import { Module } from '@nestjs/common';
import { ReservationModule } from './domains/reservation/ReservationModule';

@Module({
  imports: [ReservationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}