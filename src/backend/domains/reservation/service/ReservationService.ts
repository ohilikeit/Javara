import { Injectable } from '@nestjs/common';
import { ReservationEntity } from '../entity/ReservationEntity';
import { ReservationRepository } from '../repositories/implementations/ReservationRepository';
import { CreateReservationDTO } from '../dto/CreateReservationDTO';

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

    async createReservation(createReservationDTO: CreateReservationDTO): Promise<ReservationEntity> {
        const newReservation = new ReservationEntity(
            0,
            createReservationDTO.userId,
            createReservationDTO.roomId,
            createReservationDTO.userName,
            createReservationDTO.startTime,
            createReservationDTO.endTime,
            createReservationDTO.status,
            new Date()
        );
        
        return await this.reservationRepository.createReservation(newReservation);
    }
} 