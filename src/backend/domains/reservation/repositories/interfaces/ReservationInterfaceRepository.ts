import { ReservationEntity } from '../../entity/ReservationEntity';

export interface ReservationInterfaceRepository {
    createReservation(reservation: ReservationEntity): Promise<ReservationEntity>;
    //cancelReservation(id: number): Promise<void>;
}