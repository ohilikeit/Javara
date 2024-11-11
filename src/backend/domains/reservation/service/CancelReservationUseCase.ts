import { Injectable } from '@nestjs/common';
import type { ICancelReservationRepository } from '../repositories/interfaces/ICancelReservationRepository';

@Injectable()
export class CancelReservationUseCase {
    constructor(
        private readonly reservationRepository: ICancelReservationRepository
      ) {}
    
      async execute(id: number): Promise<void> {
        await this.reservationRepository.cancelReservation(id);
      }
} 