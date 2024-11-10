import { ReservationEntity } from '../entity/ReservationEntity';
import { ReservationInterfaceRepository } from '../repositories/interfaces/ReservationInterfaceRepository';
import { FindReservationsByDateTimeDTO, FindReservationsByDateTimeInterfaceUseCase } from './FindReservationsByDateTimeInterfaceUseCase';

export class FindReservationsByDateTimeUseCase implements FindReservationsByDateTimeInterfaceUseCase {
    constructor(
        private reservationRepository: ReservationInterfaceRepository
    ) {}

    async execute(data: FindReservationsByDateTimeDTO): Promise<ReservationEntity[]> {
        try {
            const reservations = await this.reservationRepository.findReservationsByDateTime(
                data.targetDate,
                data.startHour,
                data.endHour
            );
            
            return reservations;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to find reservations: ${error.message}`);
            }
            throw new Error('Failed to find reservations: Unknown error');
        }
    }
} 