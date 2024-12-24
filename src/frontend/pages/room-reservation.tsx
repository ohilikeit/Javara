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
  const [availableRooms, setAvailableRooms] = useState<number[]>([]);
  const [content, setContent] = useState<string>("");

  const today = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']

  const handleSearch = async () => {
    try {
      if (!date || !timeSlot) {
        return;
      }

      const formatToTimeString = (date: Date, timeStr: string): string => {
        const [hours] = timeStr.split(':').map(Number);
        return `${date.getFullYear()}${
          String(date.getMonth() + 1).padStart(2, '0')}${
          String(date.getDate()).padStart(2, '0')}${
          String(hours).padStart(2, '0')}00`;
      };

      const startTime = formatToTimeString(date, timeSlot);
      
      const response = await fetch(`http://localhost:3300/reservations/available?startTime=${startTime}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available rooms');
      }
      
      const data = await response.json();
      setAvailableRooms(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRoomClick = (roomNumber: number) => {
    setSelectedRoom(roomNumber)
  }

  const handleReservation = async () => {
    try {
      if (!date || !timeSlot) {
        alert('날짜와 시간을 선택해주세요');
        return;
      }

      // 필수 입력 필드 검증
      if (!userName.trim()) {
        alert('예약자 성함을 입력해주세요.');
        return;
      }

      if (!content.trim()) {
        alert('모임 목적을 입력해주세요.');
        return;
      }

      // 모든 검증을 통과한 경우에만 예약 처리 진행
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
          startTime,
          endTime,
          userName,
          content,
          status: 1,
          userId: 1
        }),
      });

      if (response.ok) {
        alert('예약이 완료되었습니다!');
        // 예약 성공시 상태 초기화
        setSelectedRoom(null);
        setUserName("");
        setContent("");
        // 화면 갱신을 위해 검색 함수 호출
        await handleSearch();
      } else {
        alert('예약에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    }
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
      <div className="container mx-auto p-6 pt-20">
        <div className="flex gap-8">
          <div className="w-1/4">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-lg ring-1 ring-black/5">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="rounded-lg border"
                  />
                </div>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger className="w-full text-center transition-all hover:bg-slate-100 hover:border-slate-300">
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
                    <SelectItem value="17:00">17:00 - 18:00</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSearch}
                  className="w-full bg-[#4589c8] text-white hover:bg-[#69a3d8] transition-colors shadow-md"
                >
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </Button>
              </div>
            </div>
          </div>

          <div className="w-1/2">
            <div className="rounded-2xl border border-[#4589c8]/20 bg-white/80 backdrop-blur-sm h-full" onMouseMove={handleMouseMove}>
              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger>
                  <Room 
                    number={1} 
                    disabled={!availableRooms.includes(1)} 
                    available={availableRooms.includes(1)} 
                    onClick={() => handleRoomClick(1)} 
                    className="absolute left-[10%] top-[5%] h-[30%] w-[16%]" 
                  />
                </HoverCardTrigger>
              </HoverCard>

              <Room 
                number={2} 
                disabled={true} 
                className="absolute left-[27%] top-[5%] h-[30%] w-[16%]" 
              />
              <Room 
                number={3} 
                disabled={true} 
                className="absolute left-[44%] top-[5%] h-[30%] w-[16%]" 
              />

              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger>
                  <Room 
                    number={4} 
                    disabled={!availableRooms.includes(4)} 
                    available={availableRooms.includes(4)} 
                    onClick={() => handleRoomClick(4)} 
                    className="absolute left-[61%] top-[5%] h-[30%] w-[16%]" 
                  />
                </HoverCardTrigger>
              </HoverCard>

              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger>
                  <Room 
                    number={5} 
                    disabled={!availableRooms.includes(5)} 
                    available={availableRooms.includes(5)} 
                    onClick={() => handleRoomClick(5)} 
                    className="absolute left-[78%] top-[5%] h-[30%] w-[16%]" 
                  />
                </HoverCardTrigger>
              </HoverCard>

              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger>
                  <Room 
                    number={6} 
                    disabled={!availableRooms.includes(6)} 
                    available={availableRooms.includes(6)} 
                    onClick={() => handleRoomClick(6)} 
                    className="absolute bottom-[10%] right-[5%] h-[45%] w-[20%]" 
                  />
                </HoverCardTrigger>
              </HoverCard>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="absolute bottom-[25%] left-[13%] bg-[#F6B352] text-white hover:bg-[#FFD699] transition-all shadow-md w-12 h-12 rounded-full"
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
                    {`${date.toLocaleDateString()}에 ${timeSlot} 시간대로 토론방 ${selectedRoom}을 예약하겠습니까?`}
                  </p>
                  <div>
                    <div className="mb-4">
                      <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                        예약자 성함 <span className="text-red-500">*</span>
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
                    <div className="mb-4">
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                        모임 목적 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="content"
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="모임 목적을 입력해주세요"
                        className="mt-1"
                      />
                    </div>
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
  )
}

function AllRoomsTimetable() {
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
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-6 relative">
      <div className="absolute inset-0 opacity-20 flex justify-center items-center pointer-events-none">
        <img src="/images/logo.png" alt="Logo" className="max-w-xs" />
      </div>
      <table className="w-full border-collapse relative z-10">
        <thead>
          <tr>
            <th className="border-b-2 border-r-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-bold">시간</th>
            {roomNumbers.map(roomNumber => (
              <th key={roomNumber} className="border-b-2 border-[#3b547b]/20 p-3 text-center text-[#3b547b] font-bold">
                토론방 {roomNumber}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(time => (
            <tr key={time}>
              <td className="p-3 text-center font-bold border-r-2 border-[#3b547b]/20">
                {time}
              </td>
              {roomNumbers.map(roomNumber => {
                const reservation = reservations.find(r => 
                  r.roomId === roomNumber && 
                  r.startTime.substring(8, 12) === time.split(':')[0].padStart(2, '0') + '00'
                );
                
                return (
                  <td key={`${roomNumber}-${time}`} className="p-3 text-center">
                    {reservation ? (
                      <HoverCard openDelay={0} closeDelay={0}>
                        <HoverCardTrigger>
                          <span className="font-bold text-[#4589c8] px-3 py-1 rounded transition-colors hover:bg-[#4589c8] hover:text-white">
                            {reservation.userName}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="relative bg-white p-4 rounded-full shadow-lg border border-gray-200 w-fit" 
                          style={{ boxShadow: '0 4px 12px rgba(69, 137, 200, 0.15)' }}>
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-l border-t border-gray-200" />
                          <div className="relative z-10">
                            <h4 className="text-sm font-semibold text-gray-800 whitespace-nowrap px-2">{reservation.content}</h4>
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
            ? "border-slate-200 bg-slate-50/80 text-slate-400 cursor-not-allowed"
            : available
            ? "border-[#4589c8]/20 bg-[#4589c8] text-white cursor-pointer hover:bg-[#69a3d8] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            : "border-[#4589c8]/20 bg-white text-[#4589c8] hover:bg-[#4589c8]/5"
        }
      `}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="font-semibold text-base">토론방 {number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
          {disabled ? "예약 불가" : "예약가능"}
        </span>
      </div>
    </div>
  )
}