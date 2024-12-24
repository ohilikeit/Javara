export interface CreateReservationRequest {
  roomId: number;
  startTime: string;
  endTime: string;
  userName: string;
  content: string;
  status: number;
  userId: number;
}

export interface CreateReservationResponse {
  success: boolean;
  message?: string;
}