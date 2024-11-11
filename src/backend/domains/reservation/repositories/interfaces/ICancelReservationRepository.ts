import { ReservationEntity } from '../../entity/ReservationEntity';

export interface ICancelReservationRepository {
    cancelReservation(id: number): Promise<void>;
    findById(id: number): Promise<ReservationEntity>;
} 