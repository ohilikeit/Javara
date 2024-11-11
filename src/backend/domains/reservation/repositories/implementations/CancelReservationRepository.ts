import { PrismaClient } from '@prisma/client';
import { ICancelReservationRepository } from '../interfaces/ICancelReservationRepository';

export class CancelReservationRepository implements ICancelReservationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async cancelReservation(id: number): Promise<void> {
    try {
      await this.prisma.reservation.update({
        where: { id },
        data: { status: 0 }  // 0은 취소된 상태
      });
    } catch (error) {
      throw new Error(`예약 취소 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
} 