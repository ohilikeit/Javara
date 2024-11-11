import { Controller, Delete, Param, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CancelReservationUseCase } from '../service/CancelReservationUseCase';
import { EntityNotFoundError } from 'typeorm';

@Controller('api/reservation')
export class ReservationController {
  constructor(
    private cancelReservationUseCase: CancelReservationUseCase
  ) {}

  @Delete(':id')
  async cancelReservation(@Param('id') id: number): Promise<void> {
    if (!id) {
      throw new BadRequestException('예약 ID가 필요합니다.');
    }

    try {
      await this.cancelReservationUseCase.execute(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('예약 취소 중 오류가 발생했습니다.');
    }
  }
}
