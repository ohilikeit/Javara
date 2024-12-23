import { Controller, Get } from '@nestjs/common';
import { ReservationService } from '../service/ReservationService';
import { logger } from '../../../utils/logger';

@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService
  ) {}

  @Get('today')
  getTodayReservations() {
    try {
      logger.log('getTodayReservations 컨트롤러 호출');
      return this.reservationService.getTodayReservations();
    } catch (error) {
      logger.error('getTodayReservations 에러:', error);
      throw error;
    }
  }
} 