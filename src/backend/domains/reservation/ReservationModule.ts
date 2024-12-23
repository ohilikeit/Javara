import { Module } from '@nestjs/common';
import { ReservationController } from './controllers/ReservationController';
import { ReservationService } from './service/ReservationService';
import { ReservationRepository } from './repositories/implementations/ReservationRepository';

@Module({
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule {} 