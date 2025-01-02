import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startTime, endTime, preferredRoom, duration = 1 } = req.body;
    logger.log('다음 예약 가능 시간 검색:', { startTime, endTime, preferredRoom, duration });

    // ISO 문자열을 Date 객체로 변환
    const searchStartTime = startTime ? new Date(startTime) : new Date();
    const searchEndTime = endTime ? new Date(endTime) : new Date(searchStartTime);
    searchEndTime.setHours(18, 0, 0, 0);

    if (isNaN(searchStartTime.getTime()) || isNaN(searchEndTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 시간 형식입니다.'
      });
    }

    // 주말 체크
    const dayOfWeek = searchStartTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(200).json({
        success: true,
        data: {
          availableSlots: [],
          message: "주말은 예약이 불가능합니다."
        }
      });
    }

    // 현재 시간이 영업 시간(9시-18시) 이후라면 다음 영업일 9시로 설정
    const now = new Date();
    
    // 시작 시간이 현재 날짜인 경우에만 시간 조정
    if (searchStartTime.toDateString() === now.toDateString()) {
      if (now.getHours() >= 18) {
        // 현재가 영업 종료 이후면 다음 날 9시로
        searchStartTime.setDate(searchStartTime.getDate() + 1);
        searchStartTime.setHours(9, 0, 0, 0);
        searchEndTime.setDate(searchEndTime.getDate() + 1);
        searchEndTime.setHours(18, 0, 0, 0);
      } else if (now.getHours() < 9) {
        // 현재가 영업 시작 전이면 당일 9시로
        searchStartTime.setHours(9, 0, 0, 0);
      } else {
        // 영업 시간 중이면 현재 시간으로
        searchStartTime.setMinutes(0, 0, 0);
      }
    } else {
      // 미래 날짜인 경우 항상 9시부터 시작
      searchStartTime.setHours(9, 0, 0, 0);
      searchEndTime.setHours(18, 0, 0, 0);
    }

    // 기존 예약 확인
    const existingReservations = await prisma.reservation.findMany({
      where: {
        startTime: {
          gte: searchStartTime.toISOString(),
          lte: searchEndTime.toISOString(),
        },
        ...(preferredRoom ? { roomId: Number(preferredRoom) } : {}),
        status: 1,
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    logger.log('기존 예약:', existingReservations);

    // 가능한 시간대 찾기
    const availableSlots = [];
    const rooms = preferredRoom ? [preferredRoom] : [1, 4, 5];
    const currentHour = searchStartTime.getHours();
    const endHour = searchEndTime.getHours();

    for (const roomId of rooms) {
      for (let hour = currentHour; hour < endHour - (duration - 1); hour++) {
        const slotStartTime = new Date(searchStartTime);
        slotStartTime.setHours(hour, 0, 0, 0);

        // duration 시간 동안 예약이 있는지 확인
        let isBooked = false;
        for (let i = 0; i < duration; i++) {
          const checkTime = new Date(slotStartTime);
          checkTime.setHours(hour + i, 0, 0, 0);
          
          isBooked = existingReservations.some(reservation => {
            const resStart = new Date(reservation.startTime);
            return reservation.roomId === roomId && 
                   resStart.getHours() === checkTime.getHours() &&
                   resStart.getDate() === checkTime.getDate();
          });

          if (isBooked) break;
        }

        // 예약이 없으면 가용 시간으로 추가
        if (!isBooked && hour + duration <= endHour) {
          const startTimeStr = `${hour.toString().padStart(2, '0')}:00`;
          const endTimeStr = `${(hour + duration).toString().padStart(2, '0')}:00`;
          
          availableSlots.push({
            date: slotStartTime.toISOString().split('T')[0],
            roomId,
            startTime: startTimeStr,
            endTime: endTimeStr
          });
        }
      }
    }

    // 결과 정렬 (시간 순, 방 번호 순)
    availableSlots.sort((a, b) => {
      const timeCompare = a.startTime.localeCompare(b.startTime);
      return timeCompare !== 0 ? timeCompare : a.roomId - b.roomId;
    });

    // 결과 반환
    return res.status(200).json({
      success: true,
      data: {
        availableSlots,
        message: availableSlots.length === 0 
          ? "현재 예약 가능한 시간이 없습니다."
          : "예약 가능한 시간을 찾았습니다."
      }
    });

  } catch (error) {
    logger.error('Error finding next available slots:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '가용성 확인 중 오류가 발생했습니다.',
    });
  }
} 