export interface ReservationInfo {
  date?: Date;
  dateStr?: string;
  timeRange?: string;
  startTime?: string;
  duration?: number;
  roomId?: number;
  userName?: string;
  content?: string;
}

export interface CreateReservationParams {
  date: Date;
  startTime: string;
  duration: number;
  roomId: number;
  userName: string;
  content: string;
} 