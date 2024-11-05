import { ReservationEntity } from '../entity/ReservationEntity';

export interface CreateReservationDTO {
    userId: number;
    roomId: number;
    startTime: Date;
    endTime: Date;
    status: number;
}

export interface CreateReservationInterfaceUseCase {
    execute(data: CreateReservationDTO): Promise<ReservationEntity>;
}
