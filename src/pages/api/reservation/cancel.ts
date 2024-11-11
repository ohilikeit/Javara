import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.body;

  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        error: '예약 ID가 필요합니다.'
      });
    }

    await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status: 0 }
    });

    logger.log('예약 취소 성공:', { id });

    return res.status(200).json({
      success: true,
      message: '예약이 취소되었습니다.'
    });

  } catch (error) {
    logger.error('예약 취소 중 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다.'
    });
  }
} 