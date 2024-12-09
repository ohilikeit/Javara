import { useState } from 'react';
import { SQLiteReservationTool } from '@/backend/domains/chatbot/tools/implementations/SQLiteReservationTool';

interface Room {
  roomId: number;
  roomName: string;
  capacity: number;
}

export default function ReservationSearch() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const reservationTool = new SQLiteReservationTool();

  const handleSearch = async () => {
    try {
      const rooms = await reservationTool.searchAvailableRooms({
        date: selectedDate,
        startTime: selectedTime
      });
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('방 검색 실패:', error);
    }
  };

  return (
    // 컴포넌트 JSX...
    <button onClick={handleSearch}>검색</button>
    // 검색 결과 표시...
  );
} 