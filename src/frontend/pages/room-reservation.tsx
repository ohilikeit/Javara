"use client"

import * as React from "react"
import { Calendar, Search, MessageCircle, Clock } from "lucide-react"
import { useState } from "react";

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

      const [hours, minutes] = timeSlot.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(hours + 1, minutes, 0, 0);

      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          userName,
          content: "토론방 예약",
          status: 1,
          userId: 1
        }),
      });

      if (response.ok) {
        // 예약 성공 처리
        console.log(`Room ${selectedRoom} reserved for ${date?.toLocaleDateString()} at ${timeSlot} by ${userName}`);
      } else {
        // 에러 처리
        console.error('Reservation failed');
      }
    } catch (error) {
      console.error('Error:', error);
    }
    
    // 예약 완료 후 상태 초기화
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
    <div className="min-h-screen bg-[#3b547b]/5">
      <div className="container mx-auto p-6">
        <div className="mb-8 rounded-lg bg-white p-4 shadow-md">
          <div className="grid gap-4 md:grid-cols-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-center text-center font-normal"
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
                />
              </PopoverContent>
            </Popover>

            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger className="text-center">
                <SelectValue placeholder="시간대 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00">09:00 - 10:00</SelectItem>
                <SelectItem value="10:00">10:00 - 11:00</SelectItem>
                <SelectItem value="11:00">11:00 - 12:00</SelectItem>
                <SelectItem value="13:00">13:00 - 14:00</SelectItem>
                <SelectItem value="14:00">14:00 - 15:00</SelectItem>
                <SelectItem value="15:00">15:00 - 16:00</SelectItem>
                <SelectItem value="16:00">16:00 - 17:00</SelectItem>
                <SelectItem value="16:00">17:00 - 18:00</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSearch}
              className="bg-[#3b547b] text-white hover:bg-[#3b547b]/90"
            >
              <Search className="mr-2 h-4 w-4" />
              검색
            </Button>
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl rounded-lg border-2 border-[#3b547b] p-4">
          <div className="aspect-[2/1] w-full" onMouseMove={handleMouseMove}>
            {/* Rooms */}
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={1} available onClick={() => handleRoomClick(1)} className="absolute left-[12%] top-[2%] h-[30%] w-[15%]" />
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80"
                style={{
                  position: 'fixed',
                  left: `${mousePosition.x - 400}px`,
                  top: `${mousePosition.y - 400}px`,
                }}
              >
                <TimeTable roomNumber={1} />
              </HoverCardContent>
            </HoverCard>

            <Room number={2} disabled className="absolute left-[25%] top-[2%] h-[30%] w-[15%]" />
            <Room number={3} disabled className="absolute left-[40%] top-[2%] h-[30%] w-[15%]" />

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={4} available onClick={() => handleRoomClick(4)} className="absolute left-[55%] top-[2%] h-[30%] w-[15%]" />
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80"
                style={{
                  position: 'fixed',         
                  left: `${mousePosition.x - 400}px`,
                  top: `${mousePosition.y - 400}px`,
                }}
              >
                <TimeTable roomNumber={4} />
              </HoverCardContent>
            </HoverCard>

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={5} available onClick={() => handleRoomClick(5)} className="absolute left-[70%] top-[2%] h-[30%] w-[15%]" />
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80"
                style={{
                  position: 'fixed',
                  left: `${mousePosition.x - 400}px`,
                  top: `${mousePosition.y - 400}px`,
                }}
              >
                <TimeTable roomNumber={5} />
              </HoverCardContent>
            </HoverCard>

            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <Room number={6} available onClick={() => handleRoomClick(6)} className="absolute bottom-[2%] right-[2%] h-[50%] w-[20%]" />
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-80"
                style={{
                  position: 'fixed',
                  left: `${mousePosition.x - 400}px`,
                  top: `${mousePosition.y - 400}px`,
                }}
              >
                <TimeTable roomNumber={6} />
              </HoverCardContent>
            </HoverCard>

            {/* Other Elements */}
            <div className="absolute bottom-[40%] left-[45%] text-sm text-[#3b547b] text-center">
              더블어숲
            </div>
            <div className="absolute right-[2%] top-[2%] text-sm text-[#3b547b] text-center">
              계단
            </div>
            <div className="absolute bottom-[50%] left-[5%] text-sm text-[#3b547b] text-center">
              앞문
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-[20%] left-[5%] bg-[#3b547b] text-white hover:bg-[#3b547b]/90"
                  aria-label="모든 토론방 예약 현황"
                >
                  <Clock className="h-4 w-4" />
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
                  size="icon"
                  className="absolute bottom-[10%] left-[5%] bg-[#3b547b] text-white hover:bg-[#3b547b]/90"
                  aria-label="채팅"
                >
                  <MessageCircle className="h-4 w-4" />
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
              <AlertDialogDescription className="text-center">
                {(date instanceof Date) && timeSlot ? (
                  <>
                    {`${date.toLocaleDateString()}에 ${timeSlot} 시간대로 토론방 ${selectedRoom}을 예약하시겠습니까?`}
                    <div className="mt-4">
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
                  <span className="text-red-500">날짜와 시간을 선택해주세요.</span>
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

function TimeTable({ roomNumber }: { roomNumber: number }) {
  const today = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 9}:00`)

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4 text-lg font-semibold text-[#3b547b] text-center">
        {`${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]}) 토론방 ${roomNumber}`}
      </div>
      <div className="space-y-2">
        {timeSlots.map((time) => (
          <div
            key={time}
            className={`flex items-center justify-between rounded-md p-2 text-sm
              ${'bg-[#3b547b] text-white'}
            `}
          >
            <span className="w-1/2 text-center">{time}</span>
            <span className="w-1/2 text-center">
              예약가능
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AllRoomsTimetable() {
  const timeSlots = Array.from({ length: 9 }, (_, i) => `${i + 9}:00`)
  const roomNumbers = [1, 4, 5, 6]

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b-2 border-[#3b547b] p-2 text-center text-[#3b547b]">시간</th>
            {roomNumbers.map(roomNumber => (
              <th key={roomNumber} className="border-b-2 border-[#3b547b] p-2 text-center text-[#3b547b]">토론방 {roomNumber}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(time => (
            <tr key={time} className="hover:bg-gray-50">
              <td className="border-b border-gray-200 p-2 text-center">{time}</td>
              {roomNumbers.map(roomNumber => {
                return (
                  <td 
                    key={`${roomNumber}-${time}`} 
                    className={`border-b border-gray-200 p-2 text-center ${'text-[#3b547b]'}`}
                  >
                    예약가능
                  </td>
                );
              })}
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
      className={`border-2 text-center text-sm flex items-center justify-center ${className}
        ${
          disabled
            ? "border-gray-300 bg-gray-100 text-gray-500"
            : available
            ? "border-[#3b547b] bg-[#3b547b] text-white cursor-pointer hover:bg-[#3b547b]/90"
            : "border-[#3b547b]/20 bg-white text-[#3b547b]"
        }
      `}
    >
      토론방 {number}
    </div>
  )
}