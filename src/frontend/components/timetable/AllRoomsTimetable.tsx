import { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { ReservationEntity } from '../../../backend/domains/reservation/entity/ReservationEntity';

interface AllRoomsTimetableStyles {
  container: string;
  logoWrapper: string;
  logo: string;
  table: string;
  timeHeader: string;
  roomHeader: string;
  timeCell: string;
  reservationCell: string;
  userName: string;
  hoverCard: string;
  hoverCardArrow: string;
  hoverCardContent: string;
  contentText: string;
}

const styles: AllRoomsTimetableStyles = {
  container: "overflow-x-auto bg-white rounded-xl shadow-lg p-6 relative",
  logoWrapper: "absolute inset-0 opacity-20 flex justify-center items-center pointer-events-none",
  logo: "max-w-xs",
  table: "w-full border-collapse relative z-10",
  timeHeader: "border-b-2 border-r-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-bold",
  roomHeader: "border-b-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-bold",
  timeCell: "p-3 text-center font-bold border-r-2 border-[#3b547b]/20",
  reservationCell: "p-3 text-center",
  userName: "font-bold text-[#4589c8] px-3 py-1 rounded transition-colors hover:bg-[#4589c8] hover:text-white",
  hoverCard: "relative bg-white p-4 rounded-full shadow-lg border border-gray-200 w-fit",
  hoverCardArrow: "absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-l border-t border-gray-200",
  hoverCardContent: "relative z-10",
  contentText: "text-sm font-semibold text-gray-800 whitespace-nowrap px-2"
};

export function AllRoomsTimetable() {
  const [reservations, setReservations] = useState<ReservationEntity[]>([]);
  
  useEffect(() => {
    const fetchReservations = async () => {
      const response = await fetch('http://localhost:3300/reservations/today');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    };
    fetchReservations();
  }, []);

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 9}:00`)
  const roomNumbers = [1, 4, 5, 6]

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <img src="/images/logo.png" alt="Logo" className={styles.logo} />
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.timeHeader}>시간</th>
            {roomNumbers.map(roomNumber => (
              <th key={roomNumber} className={styles.roomHeader}>
                토론방 {roomNumber}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(time => (
            <tr key={time}>
              <td className={styles.timeCell}>{time}</td>
              {roomNumbers.map(roomNumber => {
                const reservation = reservations.find(r => 
                  r.roomId === roomNumber && 
                  r.startTime.substring(8, 12) === time.split(':')[0].padStart(2, '0') + '00'
                );
                
                return (
                  <td key={`${roomNumber}-${time}`} className={styles.reservationCell}>
                    {reservation ? (
                      <HoverCard openDelay={0} closeDelay={0}>
                        <HoverCardTrigger>
                          <span className={styles.userName}>
                            {reservation.userName}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className={styles.hoverCard} 
                          style={{ boxShadow: '0 4px 12px rgba(69, 137, 200, 0.15)' }}>
                          <div className={styles.hoverCardArrow} />
                          <div className={styles.hoverCardContent}>
                            <h4 className={styles.contentText}>{reservation.content}</h4>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : '예약가능'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 