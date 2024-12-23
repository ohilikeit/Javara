import { Injectable } from '@nestjs/common';
import { ReservationEntity } from '../entity/ReservationEntity';
import { ReservationRepository } from '../repositories/implementations/ReservationRepository';

@Injectable()
export class ReservationService {
    constructor(private readonly reservationRepository: ReservationRepository) {}

    async getTodayReservations(): Promise<ReservationEntity[]> {
        return await this.reservationRepository.getTodayReservations();
    }
} 