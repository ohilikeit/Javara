import { Controller, Delete, Param } from '@nestjs/common';
import { CancelReservationUseCase } from '../service/CancelReservationUseCase';

@Controller('reservations')
export class ReservationController {
  constructor(
    private cancelReservationUseCase: CancelReservationUseCase
  ) {}

  @Delete(':id')
  async cancelReservation(@Param('id') id: number): Promise<void> {
    await this.cancelReservationUseCase.execute(id);
  }
}
