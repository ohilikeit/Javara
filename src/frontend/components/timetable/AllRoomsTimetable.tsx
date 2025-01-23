import { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { ReservationEntity } from '../../../backend/domains/reservation/entity/ReservationEntity';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AllRoomsTimetableStyles {
  container: string;
  logoWrapper: string;
  logo: string;
  table: string;
  timeHeader: string;
  roomHeader: string;
  timeCell: string;
  reservationCell: string;
  reservedCell: string;
  userName: string;
  hoverCard: string;
  hoverCardArrow: string;
  hoverCardContent: string;
  contentText: string;
  dateNavigation: string;
  dateButton: string;
  dateText: string;
  title: string;
  hoverCardTitle: string;
}

const styles: AllRoomsTimetableStyles = {
  container: "overflow-x-auto bg-white rounded-xl shadow-lg p-6 relative",
  logoWrapper: "absolute inset-0 opacity-20 flex justify-center items-center pointer-events-none",
  logo: "max-w-xs",
  table: "w-full border-collapse relative z-10",
  timeHeader: "border-b-2 border-r-2 border-[#3b547b]/20 p-1 text-center text-[#3b547b] font-bold w-24 h-8",
  roomHeader: "border-b-2 border-[#3b547b]/20 p-1 text-center text-[#3b547b] font-bold w-40 h-8",
  timeCell: "p-1 text-center font-bold border-r-2 border-[#3b547b]/20 w-24 h-8",
  reservationCell: "p-1 text-center border border-[#3b547b]/10 w-40 h-8 relative",
  reservedCell: "border-none",
  userName: "font-bold text-gray-900 px-2 py-0.5 rounded transition-colors whitespace-nowrap absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm",
  hoverCard: "relative bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-fit min-w-[200px]",
  hoverCardArrow: "absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-4 rotate-45 bg-white border-l border-t border-gray-200",
  hoverCardContent: "relative z-10",
  hoverCardTitle: "text-base font-bold text-[#3b547b] mb-2 border-b pb-2",
  contentText: "text-sm font-semibold text-gray-800 whitespace-nowrap px-2",
  dateNavigation: "flex items-center justify-center gap-4 mb-4",
  dateButton: "p-2 rounded-full hover:bg-gray-100 transition-colors",
  dateText: "font-bold text-[#3b547b] text-lg min-w-[300px] text-center",
  title: "text-2xl font-bold text-[#3b547b] text-center mb-6"
};

export function AllRoomsTimetable() {
  const [reservations, setReservations] = useState<ReservationEntity[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // 이름에 따라 일관된 색상을 생성하는 함수
  const getColorFromName = (name: string) => {
    const colors = [
      'rgba(69, 137, 200, 0.1)',  // 파랑
      'rgba(255, 159, 64, 0.1)',  // 주황
      'rgba(75, 192, 192, 0.1)',  // 청록
      'rgba(153, 102, 255, 0.1)', // 보라
      'rgba(255, 99, 132, 0.1)',  // 분홍
      'rgba(54, 162, 235, 0.1)',  // 하늘
      'rgba(255, 206, 86, 0.1)',  // 노랑
      'rgba(231, 233, 237, 0.1)'  // 회색
    ];
    
    // 이름의 각 문자 코드를 합산하여 해시값 생성
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  useEffect(() => {
    const fetchReservations = async () => {
      const dateStr = formatDate(currentDate);
      const response = await fetch(`http://localhost:3300/reservations/date/${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    };
    fetchReservations();
  }, [currentDate]);

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 9}:00`)
  const roomNumbers = [1, 4, 5, 6]

  const getReservationDuration = (reservation: ReservationEntity) => {
    const startHour = parseInt(reservation.startTime.substring(8, 10));
    const endHour = parseInt(reservation.endTime.substring(8, 10));
    return endHour - startHour;
  };

  const shouldShowCell = (currentHour: number, roomNumber: number) => {
    const reservation = reservations.find(r => {
      const startHour = parseInt(r.startTime.substring(8, 10));
      return r.roomId === roomNumber && startHour === currentHour;
    });

    if (!reservation) {
      const previousReservation = reservations.find(r => {
        const startHour = parseInt(r.startTime.substring(8, 10));
        const endHour = parseInt(r.endTime.substring(8, 10));
        return r.roomId === roomNumber && currentHour > startHour && currentHour < endHour;
      });
      return !previousReservation;
    }
    return true;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>토론방 예약 현황</h2>
      <div className={styles.dateNavigation}>
        <button onClick={handlePrevDay} className={styles.dateButton}>
          <ChevronLeft className="h-6 w-6 text-[#3b547b]" />
        </button>
        <span className={styles.dateText}>{formatDisplayDate(currentDate)}</span>
        <button onClick={handleNextDay} className={styles.dateButton}>
          <ChevronRight className="h-6 w-6 text-[#3b547b]" />
        </button>
      </div>
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
                const currentHour = parseInt(time.split(':')[0]);
                if (!shouldShowCell(currentHour, roomNumber)) {
                  return null;
                }

                const reservation = reservations.find(r => {
                  const startHour = parseInt(r.startTime.substring(8, 10));
                  const endHour = parseInt(r.endTime.substring(8, 10));
                  return r.roomId === roomNumber && 
                         currentHour >= startHour && 
                         currentHour < endHour;
                });

                const isStartingSlot = reservation && parseInt(reservation.startTime.substring(8, 10)) === currentHour;
                
                return (
                  <td 
                    key={`${roomNumber}-${time}`} 
                    className={`${styles.reservationCell} ${reservation ? styles.reservedCell : ''}`}
                    style={reservation ? { 
                      backgroundColor: getColorFromName(reservation.userName),
                      height: isStartingSlot ? `${getReservationDuration(reservation) * 2}rem` : '2rem'
                    } : undefined}
                    rowSpan={isStartingSlot ? getReservationDuration(reservation) : 1}
                  >
                    {isStartingSlot ? (
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
                            <h3 className={styles.hoverCardTitle}>예약 정보</h3>
                            <h4 className={styles.contentText}>
                              예약자: {reservation.userName}<br/>
                              목적: {reservation.content}<br/>
                              시간: {reservation.startTime.substring(8, 10)}:00 - {reservation.endTime.substring(8, 10)}:00
                            </h4>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : !reservation ? (
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500">
                        예약가능
                      </span>
                    ) : null}
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