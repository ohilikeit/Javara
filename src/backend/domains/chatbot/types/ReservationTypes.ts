export interface ReservationInfo {
  date?: Date | string;
  timeRange?: 'morning' | 'afternoon';
  startTime?: string;
  duration?: number;
  roomId?: number;
  userName?: string;
  content?: string;
} 