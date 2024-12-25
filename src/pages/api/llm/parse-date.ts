import { NextApiRequest, NextApiResponse } from 'next';
import { ChatOpenAI } from "@langchain/openai";
import { logger } from '@/utils/logger';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Seoul';

interface ParseDateResponse {
  success: boolean;
  date?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseDateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { input, currentDate, systemPrompt } = req.body;
    
    // currentDate가 문자열로 전달되므로 Date 객체로 변환
    const baseDate = currentDate ? new Date(currentDate) : new Date();
    
    if (!input || !systemPrompt) {
      return res.status(400).json({ success: false, error: '입력값이 필요합니다.' });
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
      maxTokens: 200,
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
    });

    logger.log('날짜 파싱 요청:', {
      input,
      currentDate: baseDate,
      systemPrompt: systemPrompt.substring(0, 100) + '...' // 로그가 너무 길어지지 않도록
    });

    const result = await model.invoke(systemPrompt + `\n\n입력: ${input}`);
    
    try {
      const jsonStr = result.content.toString().replace(/```json\n|\n```/g, '');
      const parsedResult = JSON.parse(jsonStr);
      
      logger.log('LLM 응답:', parsedResult);
      
      if (!parsedResult.date || !parsedResult.confidence || !parsedResult.reasoning) {
        return res.json({ success: false, error: '응답 형식이 올바르지 않습니다.' });
      }

      return res.json({
        success: true,
        date: parsedResult.date,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning
      });

    } catch (parseError) {
      logger.error('JSON 파싱 실패:', result.content);
      return res.json({ success: false, error: 'LLM 응답을 파싱할 수 없습니다.' });
    }

  } catch (error) {
    logger.error('날짜 파싱 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '날짜 파싱 중 오류가 발생했습니다.'
    });
  }
}