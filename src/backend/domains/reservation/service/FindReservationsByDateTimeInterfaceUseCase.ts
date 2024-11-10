import { ReservationEntity } from '../entity/ReservationEntity';

export interface FindReservationsByDateTimeDTO {
    targetDate: Date;
    startHour: string;
    endHour: string;
}

export interface FindReservationsByDateTimeInterfaceUseCase {
    execute(data: FindReservationsByDateTimeDTO): Promise<ReservationEntity[]>;
} 