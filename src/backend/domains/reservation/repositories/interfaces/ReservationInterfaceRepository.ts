import { ReservationEntity } from '../../entity/ReservationEntity';

export interface ReservationInterfaceRepository {
    createReservation(reservation: ReservationEntity): Promise<ReservationEntity>;
    getTodayReservations(): Promise<ReservationEntity[]>;
    getReservationsByTime(startTime: string): Promise<ReservationEntity[]>;
    getReservationsByDate(date: string): Promise<ReservationEntity[]>;
}