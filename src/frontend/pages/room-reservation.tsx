"use client"

import * as React from "react"
import { Calendar, Search, MessageCircle, Clock } from "lucide-react"
import { useState, useEffect } from "react";

import { Button } from "../components/ui/button"
import { Calendar as CalendarComponent } from "../components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { ChatInterface } from "../components/chat/ChatInterface"
import { Input } from "../components/ui/input"
import { ReservationEntity } from '../../backend/domains/reservation/entity/ReservationEntity';

export default function Component() {
  const [date, setDate] = React.useState<Date>()
  const [timeSlot, setTimeSlot] = React.useState<string>()
  const [selectedRoom, setSelectedRoom] = React.useState<number | null>(null)
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    content: string;
    isBot: boolean;
  }>>([]);
  const [userName, setUserName] = useState<string>("");

  const today = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']

  const handleSearch = () => {
    console.log("Searching for:", { date, timeSlot })
  }

  const handleRoomClick = (roomNumber: number) => {
    setSelectedRoom(roomNumber)
  }

  const handleReservation = async () => {
    try {
      if (!date || !timeSlot) {
        throw new Error('날짜와 시간을 선택해주세요');
      }

      // YYYYMMDDHHMM 형식으로 변환
      const formatToTimeString = (date: Date, timeStr: string): string => {
        const [hours] = timeStr.split(':').map(Number);
        return `${date.getFullYear()}${
          String(date.getMonth() + 1).padStart(2, '0')}${
          String(date.getDate()).padStart(2, '0')}${
          String(hours).padStart(2, '0')}00`;
      };

      // 시작 시간과 종료 시간 계산
      const startTime = formatToTimeString(date, timeSlot);
      const [hours] = timeSlot.split(':').map(Number);
      const endTime = formatToTimeString(date, `${hours + 1}:00`);

      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom,
          startTime,  // YYYYMMDDHHMM 형식 (예: "202403150900")
          endTime,    // YYYYMMDDHHMM 형식 (예: "202403151000")
          userName,
          content: "토론방 예약",
          status: 1,
          userId: 1
        }),
      });

      if (response.ok) {
        console.log(`Room ${selectedRoom} reserved for ${date?.toLocaleDateString()} at ${timeSlot} by ${userName}`);
      } else {
        console.error('Reservation failed');
      }
    } catch (error) {
      console.error('Error:', error);
    }
    
    setSelectedRoom(null);
    setUserName("");
  };

  const handleDialogClose = () => {
    setSelectedRoom(null);
    setUserName("");
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] to-[#eef2f7]">
      <div className="container mx-auto p-6">
        <div className="mb-8 rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-lg ring-1 ring-black/5 w-2/3 mx-auto">
          <div className="grid gap-4 md:grid-cols-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-center text-center font-medium transition-all hover:bg-slate-100 hover:border-slate-300"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? date.toLocaleDateString() : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="rounded-lg border shadow-lg"
                />
              </PopoverContent>
            </Popover>

            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger className="text-center transition-all hover:bg-slate-100 hover:border-slate-300">
                <SelectValue placeholder="시간대 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border shadow-lg">
                <SelectItem value="09:00">09:00 - 10:00</SelectItem>
                <SelectItem value="10:00">10:00 - 11:00</SelectItem>
                <SelectItem value="11:00">11:00 - 12:00</SelectItem>
                <SelectItem value="13:00">13:00 - 14:00</SelectItem>
                <SelectItem value="14:00">14:00 - 15:00</SelectItem>
                <SelectItem value="15:00">15:00 - 16:00</SelectItem>
                <SelectItem value="16:00">16:00 - 17:00</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSearch}
              className="bg-[#4589c8] text-white hover:bg-[#69a3d8] transition-colors shadow-md"
            >
              <Search className="mr-2 h-4 w-4" />
              검색
            </Button>
          </div>
        </div>
        <div className="container mx-auto">
          <div className="mb-8 rounded-2xl border border-[#4589c8]/20 bg-white/80 backdrop-blur-sm aspect-[2/1] w-2/3 mx-auto" onMouseMove={handleMouseMove}>
            {/* Rooms */}
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={1} available onClick={() => handleRoomClick(1)} className="absolute left-[10%] top-[5%] h-[25%] w-[16%]" />
              </HoverCardTrigger>
              {/* <HoverCardContent 
                className="w-80"
                style={{
                  position: 'fixed',
                  left: `${mousePosition.x - 400}px`,
                  top: `${mousePosition.y - 400}px`,
                }}
              >
              </HoverCardContent> */}
            </HoverCard>

            <Room number={2} disabled className="absolute left-[27%] top-[5%] h-[25%] w-[16%]" />
            <Room number={3} disabled className="absolute left-[44%] top-[5%] h-[25%] w-[16%]" />

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={4} available onClick={() => handleRoomClick(4)} className="absolute left-[61%] top-[5%] h-[25%] w-[16%]" />
              </HoverCardTrigger>
            </HoverCard>

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={5} available onClick={() => handleRoomClick(5)} className="absolute left-[78%] top-[5%] h-[25%] w-[16%]" />
              </HoverCardTrigger>
            </HoverCard>

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={6} available onClick={() => handleRoomClick(6)} className="absolute bottom-[10%] right-[5%] h-[50%] w-[20%]" />
              </HoverCardTrigger>
            </HoverCard>
            <div className="absolute bottom-[40%] left-[35%] text-2xl text-[#4589c8] text-center font-semibold tracking-wide">
              더불어숲
            </div>
            <div className="absolute bottom-[40%] left-[5%] text-lg text-[#4589c8] text-center font-semibold">
              앞문
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="absolute bottom-[23%] left-[13%] bg-[#F6B352] text-white hover:bg-[#FFD699] transition-all shadow-md w-12 h-12 rounded-full"
                  aria-label="모든 토론방 예약 현황"
                >
                  <Clock className="h-8 w-8" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-center">모든 토론방 예약 현황</DialogTitle>
                  <DialogDescription className="text-center">
                    {today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일 ({days[today.getDay()]})
                  </DialogDescription>
                </DialogHeader>
                <AllRoomsTimetable />
              </DialogContent>
            </Dialog>
            <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="absolute bottom-[13%] left-[13%] bg-[#F6B352] text-white hover:bg-[#FFD699] transition-all shadow-md w-12 h-12 rounded-full"
                  aria-label="채팅"
                >
                  <MessageCircle className="h-8 w-8" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1000px]">
                <ChatInterface 
                  messages={chatMessages.map(msg => ({
                    content: msg.content,
                    isBot: msg.isBot
                  }))}
                  onMessagesChange={setChatMessages}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <AlertDialog open={selectedRoom !== null} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center">토론방 {selectedRoom} 예약</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                {(date instanceof Date) && timeSlot ? (
                  <>
                    <p className="text-center">
                      {`${date.toLocaleDateString()}에 ${timeSlot} 시간대로 토론방 ${selectedRoom}을 예약하시겠습니까?`}
                    </p>
                    <div>
                      <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                        예약자 이름
                      </label>
                      <Input
                        id="userName"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="이름을 입력해주세요"
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-red-500 text-center">날짜와 시간을 선택해주세요.</p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-center">
              <AlertDialogCancel onClick={() => {
                setUserName("");
              }}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReservation}
                disabled={!date || !timeSlot}
              >
                다음
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function AllRoomsTimetable() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchReservations = async () => {
      const response = await fetch('http://localhost:3300/reservations/today');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        console.error('Failed to fetch reservations');
      }
    };

    fetchReservations();
  }, []);

  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 9}:00`)
  const roomNumbers = [1, 4, 5, 6]

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-6">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-medium">시간</th>
            {roomNumbers.map(roomNumber => (
              <th key={roomNumber} className="border-b-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-medium">
                토론방 {roomNumber}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(time => (
            <tr key={time} className="hover:bg-[#3b547b]/5 transition-colors">
              <td className="border-b border-[#3b547b]/10 p-3 text-center text-[#3b547b]/80">{time}</td>
              {roomNumbers.map(roomNumber => (
                <td 
                  key={`${roomNumber}-${time}`} 
                  className="border-b border-[#3b547b]/10 p-3 text-center text-[#3b547b]"
                >
                  {reservations.some((reservation: ReservationEntity) => reservation.roomId === roomNumber && reservation.startTime === time) ? '예약됨' : '예약가능'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Room({
  number,
  disabled = false,
  available = false,
  onClick,
  className = "",
}: {
  number: number
  disabled?: boolean
  available?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      onClick={available ? onClick : undefined}
      className={`border rounded-xl text-center text-sm flex items-center justify-center transition-all duration-200 ${className}
        ${
          disabled
            ? "border-slate-200 bg-slate-50/80 text-slate-400"
            : available
            ? "border-[#4589c8]/20 bg-[#4589c8] text-white cursor-pointer hover:bg-[#69a3d8] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            : "border-[#4589c8]/20 bg-white text-[#4589c8] hover:bg-[#4589c8]/5"
        }
      `}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="font-semibold text-base">토론방 {number}</span>
        {available && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
            예약가능
          </span>
        )}
      </div>
    </div>
  )
}