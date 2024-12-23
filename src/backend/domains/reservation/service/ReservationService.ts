import { Injectable } from '@nestjs/common';
import { ReservationEntity } from '../entity/ReservationEntity';
import { ReservationRepository } from '../repositories/implementations/ReservationRepository';

@Injectable()
export class ReservationService {
    constructor(private readonly reservationRepository: ReservationRepository) {}

    async getTodayReservations(): Promise<ReservationEntity[]> {
        return await this.reservationRepository.getTodayReservations();
    }

    async getAvailableRooms(startTime: string): Promise<number[]> {
        const reservations = await this.reservationRepository.getReservationsByTime(startTime);
        const allRooms = [1, 4, 5, 6];
        const reservedRooms = reservations.map(r => r.getRoomId());
        
        // 예약된 방을 제외한 나머지 방 번호 반환
        return allRooms.filter(room => !reservedRooms.includes(room));
    }
} 