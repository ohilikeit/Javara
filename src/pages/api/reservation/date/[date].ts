import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { date } = req.query;

  try {
    const response = await fetch(`http://localhost:3300/reservations/date/${date}`);
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({ message: '예약 정보를 불러오는데 실패했습니다.' });
  }
} 