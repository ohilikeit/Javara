import { NextApiRequest, NextApiResponse } from 'next';
import { ChatOpenAI } from "@langchain/openai";
import { logger } from '@/utils/logger';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Seoul';

interface ParseDateResponse {
  success: boolean;
  date?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseDateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { input, currentDate, systemPrompt } = req.body;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: '입력값이 필요합니다.'
      });
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 100,
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
    });

    // 현재 시간을 한국 시간대로 변환
    const now = toZonedTime(new Date(), TIMEZONE);
    const currentDateStr = currentDate || formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

    const prompt = `${systemPrompt}

    현재 시간(한국): ${currentDateStr}
    입력: ${input}

    응답 형식: YYYY-MM-DD
    `;

    logger.log('날짜 파싱 요청:', {
      input,
      currentDateStr,
      prompt
    });

    const result = await model.invoke(prompt);
    
    // 결과에서 YYYY-MM-DD 형식 추출
    const dateMatch = result.content.toString().match(/\d{4}-\d{2}-\d{2}/);
    
    if (!dateMatch) {
      logger.warn('날짜 파싱 실패 - 유효한 형식 없음:', result);
      return res.json({
        success: false,
        error: '날짜를 파싱할 수 없습니다.'
      });
    }

    const parsedDate = dateMatch[0];
    
    // 기본적인 날짜 유효성 검증 (한국 시간대 기준)
    const date = toZonedTime(new Date(parsedDate), TIMEZONE);
    if (isNaN(date.getTime())) {
      logger.warn('날짜 파싱 실패 - 유효하지 않은 날짜:', parsedDate);
      return res.json({
        success: false,
        error: '유효하지 않은 날짜입니다.'
      });
    }

    logger.log('날짜 파싱 성공:', {
      input,
      parsedDate,
      koreanTime: formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
    });

    return res.json({
      success: true,
      date: parsedDate
    });

  } catch (error) {
    logger.error('날짜 파싱 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '날짜 파싱 중 오류가 발생했습니다.'
    });
  }
}