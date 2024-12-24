"use client"

import * as React from "react"
import { MessageCircle, Clock } from "lucide-react"
import { useState } from "react";

import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { ChatInterface } from "../components/chat/ChatInterface"
import { Room } from "../components/room/Room"
import { ReservationCalendar } from "../components/reservation/ReservationCalendar"
import { ReservationDialog } from "../components/reservation/ReservationDialog"
import { AllRoomsTimetable } from "../components/timetable/AllRoomsTimetable"
import { ReservationService } from '../services/reservationService';

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

      if (!userName.trim()) {
        alert('예약자 성함을 입력해주세요.');
        return;
      }

      if (!content.trim()) {
        alert('모임 목적을 입력해주세요.');
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
      const [hours] = timeSlot.split(':').map(Number);
      const endTime = formatToTimeString(date, `${hours + 1}:00`);

      const result = await ReservationService.createReservation({
        roomId: selectedRoom!,
        startTime,
        endTime,
        userName,
        content,
        status: 1,
        userId: 1
      });

      if (result.success) {
        alert('예약이 완료되었습니다!');
        setSelectedRoom(null);
        setUserName("");
        setContent("");
        await handleSearch();
      } else {
        alert(result.message || '예약에 실패했습니다.');
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
            <ReservationCalendar
              date={date}
              timeSlot={timeSlot}
              onDateChange={setDate}
              onTimeSlotChange={setTimeSlot}
              onSearch={handleSearch}
            />
          </div>

          <div className="w-1/2">
            <div className="rounded-2xl border border-[#4589c8]/20 bg-white/80 backdrop-blur-sm h-full" onMouseMove={handleMouseMove}>
              <Room 
                number={1} 
                disabled={!availableRooms.includes(1)} 
                available={availableRooms.includes(1)} 
                onClick={() => handleRoomClick(1)} 
                className="absolute left-[10%] top-[5%] h-[30%] w-[16%]" 
              />
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
              <Room 
                number={4} 
                disabled={!availableRooms.includes(4)} 
                available={availableRooms.includes(4)} 
                onClick={() => handleRoomClick(4)} 
                className="absolute left-[61%] top-[5%] h-[30%] w-[16%]" 
              />
              <Room 
                number={5} 
                disabled={!availableRooms.includes(5)} 
                available={availableRooms.includes(5)} 
                onClick={() => handleRoomClick(5)} 
                className="absolute left-[78%] top-[5%] h-[30%] w-[16%]" 
              />
              <Room 
                number={6} 
                disabled={!availableRooms.includes(6)} 
                available={availableRooms.includes(6)} 
                onClick={() => handleRoomClick(6)} 
                className="absolute bottom-[10%] right-[5%] h-[45%] w-[20%]" 
              />

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

      <ReservationDialog
        selectedRoom={selectedRoom}
        date={date}
        timeSlot={timeSlot}
        userName={userName}
        content={content}
        onUserNameChange={setUserName}
        onContentChange={setContent}
        onConfirm={handleReservation}
        onClose={handleDialogClose}
      />
    </div>
  )
}