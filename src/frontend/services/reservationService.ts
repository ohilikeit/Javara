import { CreateReservationRequest, CreateReservationResponse } from "../types/reservation";

export class ReservationService {
  private static readonly BASE_URL = '/api/reservation';

  static async createReservation(data: CreateReservationRequest): Promise<CreateReservationResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('예약 생성에 실패했습니다.');
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('예약 생성 중 오류:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  static async getAvailableRooms(startTime: string): Promise<number[]> {
    try {
      const response = await fetch(`http://localhost:3300/reservations/available?startTime=${startTime}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available rooms');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      throw error;
    }
  }
} 