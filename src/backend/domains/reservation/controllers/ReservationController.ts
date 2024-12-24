import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ReservationService } from '../service/ReservationService';
import { logger } from '../../../utils/logger';
import { CreateReservationDTO } from '../dto/CreateReservationDTO';

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

  @Get('available')
  async getAvailableRooms(@Query('startTime') startTime: string) {
    try {
      logger.log('getAvailableRooms 컨트롤러 호출:', { startTime });
      return await this.reservationService.getAvailableRooms(startTime);
    } catch (error) {
      logger.error('getAvailableRooms 에러:', error);
      throw error;
    }
  }

  @Post()
  async createReservation(@Body() createReservationDTO: CreateReservationDTO) {
    try {
      logger.log('createReservation 컨트롤러 호출:', createReservationDTO);
      return await this.reservationService.createReservation(createReservationDTO);
    } catch (error) {
      logger.error('createReservation 에러:', error);
      throw error;
    }
  }
} 