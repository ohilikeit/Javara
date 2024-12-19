import { ReservationEntity } from '../entity/ReservationEntity';

export interface CreateReservationDTO {
    userId: number;
    roomId: number;
    userName: string;
    startTime: string;
    endTime: string;
    status: number;
}

export interface CreateReservationInterfaceUseCase {
    execute(data: CreateReservationDTO): Promise<ReservationEntity>;
}
