import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { input, systemPrompt } = req.body;
        
        // 로컬 파싱 로직 구현
        const parsedDate = parseLocalDate(input);
        
        return res.status(200).json({
            success: true,
            date: parsedDate?.toISOString()
        });
    } catch (error) {
        logger.error('날짜 파싱 API 에러:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '날짜 파싱 중 오류가 발생했습니다.'
        });
    }
}

function parseLocalDate(input: string): Date | null {
    const today = new Date();
    
    // 상대적 날짜 처리
    if (input.includes('오늘')) return today;
    if (input.includes('내일')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
    }
    
    // 요일 처리
    const dayMap: { [key: string]: number } = {
        '월': 1, '화': 2, '수': 3, '목': 4, '금': 5
    };
    
    for (const [day, num] of Object.entries(dayMap)) {
        if (input.includes(day)) {
            const date = new Date(today);
            const currentDay = today.getDay();
            const targetDay = num;
            const diff = targetDay - currentDay;
            date.setDate(today.getDate() + (diff >= 0 ? diff : diff + 7));
            return date;
        }
    }
    
    return null;
} 