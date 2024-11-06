import { Reservation } from '../domains/Reservation';

export interface GetRoomInterfaceUseCase {
    getRoomReservations(roomId: string, date: Date): Promise<Reservation[]>;
}