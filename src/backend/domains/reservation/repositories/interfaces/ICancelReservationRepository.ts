export interface ICancelReservationRepository {
    cancelReservation(id: number): Promise<void>;
} 