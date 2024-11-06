export interface IReservationRepository {
cancelReservation(id: number): Promise<void>;
}