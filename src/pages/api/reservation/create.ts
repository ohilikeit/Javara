import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { date, timeSlot, roomNumber } = req.body;

    // 중복 예약 확인
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        date: new Date(date),
        timeSlot: timeSlot,
        roomNumber: roomNumber,
      },
    });

    if (existingReservation) {
      return res.status(400).json({ message: '이미 예약된 시간입니다.' });
    }

    // 새 예약 생성
    const reservation = await prisma.reservation.create({
      data: {
        date: new Date(date),
        timeSlot: timeSlot,
        roomNumber: roomNumber,
        userId: 'test-user', // 실제 구현시 인증된 사용자 ID 사용
      },
    });

    return res.status(201).json(reservation);
  } catch (error) {
    console.error('Reservation creation error:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
} 