import { ReservationEntity } from '../entity/ReservationEntity';
import { ReservationInterfaceRepository } from '../repositories/interfaces/ReservationInterfaceRepository';
import { CreateReservationDTO, CreateReservationInterfaceUseCase } from './CreateReservationInterfaceUseCase';

export class CreateReservationUseCase implements CreateReservationInterfaceUseCase {
    constructor(
        private reservationRepository: ReservationInterfaceRepository
    ) {}

    async execute(data: CreateReservationDTO): Promise<ReservationEntity> {
        try {
            // 새로운 ReservationEntity 생성
            // reservationId와 regdate는 DB에서 생성되므로 임시값 설정
            const newReservation = new ReservationEntity(
                0, // temporary id
                data.userId,
                data.roomId,
                data.startTime,
                data.endTime,
                data.status,
                new Date() // temporary regdate
            );

            // Repository를 통해 예약 생성
            const createdReservation = await this.reservationRepository.createReservation(newReservation);
            
            return createdReservation;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create reservation: ${error.message}`);
            }
            throw new Error('Failed to create reservation: Unknown error');
        }
    }
}
