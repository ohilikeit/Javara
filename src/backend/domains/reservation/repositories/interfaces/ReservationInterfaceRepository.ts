import { ReservationEntity } from '../../entity/ReservationEntity';

export interface ReservationInterfaceRepository {
    createReservation(reservation: ReservationEntity): Promise<ReservationEntity>;
    findReservationsByDateTime(
        targetDate: Date,
        startHour: string,
        endHour: string
    ): Promise<ReservationEntity[]>;
}
