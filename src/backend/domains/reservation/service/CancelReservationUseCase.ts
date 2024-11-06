import { Injectable } from '@nestjs/common';
import type { IReservationRepository } from '../repositories/interfaces/ReservationInterfaceRepository';

@Injectable()
export class CancelReservationUseCase {
    constructor(
        private readonly reservationRepository: IReservationRepository
      ) {}
    
      async execute(id: number): Promise<void> {
        await this.reservationRepository.cancelReservation(id);
      }
} 