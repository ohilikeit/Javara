import { useState } from 'react';
import axios, { AxiosError } from 'axios';

interface CancelButtonProps {
  reservationId: number;
  onCancel?: () => void;
}

export default function CancelButton({ reservationId, onCancel }: CancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('예약을 취소하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('취소 요청 시작:', reservationId);
      const response = await axios.delete(`/api/reservation/${reservationId}`);
      console.log('취소 응답:', response);
      
      alert('예약이 취소되었습니다.');
      onCancel?.();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('예약 취소 중 상세 에러:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        const errorMessage = error.response?.data?.message || '예약 취소에 실패했습니다.';
        alert(errorMessage);
      } else {
        console.error('예약 취소 중 알 수 없는 에러:', error);
        alert('예약 취소 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isLoading}
      className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isLoading ? '취소 중...' : '예약 취소'}
    </button>
  );
} 