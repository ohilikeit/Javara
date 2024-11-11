import { Injectable, NotFoundException } from '@nestjs/common';
import type { ICancelReservationRepository } from '../repositories/interfaces/ICancelReservationRepository';

@Injectable()
export class CancelReservationUseCase {
    constructor(
        private readonly reservationRepository: ICancelReservationRepository
      ) {}
    
      async execute(id: number): Promise<void> {
        const reservation = await this.reservationRepository.findById(id);
        
        if (!reservation) {
          throw new NotFoundException(`예약 ID ${id}를 찾을 수 없습니다.`);
        }
        
        await this.reservationRepository.cancelReservation(id);
      }
} 