import { Injectable } from '@nestjs/common';
import { IReservationRepository } from '../interfaces/ReservationInterfaceRepository';

@Injectable()
export class ReservationRepository implements IReservationRepository {
  async cancelReservation(id: number): Promise<void> {
    // 실제 데이터베이스 작업 구현
    // 예: this.prisma.reservation.delete({ where: { id } });
  }
}
