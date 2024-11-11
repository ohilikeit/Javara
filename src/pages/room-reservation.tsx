import { useState } from 'react';
import CancelButton from '@/components/CancelButton';

interface Reservation {
  id: number;
  roomName: string;
  startTime: string;
  endTime: string;
}

export default function RoomReservation() {
  const [reservations, setReservations] = useState<Reservation[]>([
    // 테스트용 더미 데이터
    {
      id: 1,
      roomName: "회의실 A",
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString()
    }
  ]);

  const handleReservationCanceled = async (canceledId: number) => {
    try {
      const response = await fetch(`/api/reservation/cancel?id=${canceledId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('예약 취소 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.error || '예약 취소에 실패했습니다.');
      }
      
      setReservations(prev => prev.filter(res => res.id !== canceledId));
    } catch (error) {
      console.log('예약 취소 중 오류:', error);
      alert('예약 취소에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">회의실 예약</h1>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">현재 예약 목록</h2>
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div 
              key={reservation.id}
              className="p-4 border rounded-lg shadow-sm bg-white"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{reservation.roomName}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(reservation.startTime)} ~ {formatDate(reservation.endTime)}
                  </p>
                </div>
                <CancelButton 
                  reservationId={reservation.id}
                  onCancel={() => handleReservationCanceled(reservation.id)}
                />
              </div>
            </div>
          ))}
          {reservations.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              예약된 회의실이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 