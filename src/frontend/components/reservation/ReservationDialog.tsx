import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Input } from "../ui/input";

interface ReservationDialogProps {
  selectedRoom: number | null;
  date: Date | undefined;
  timeSlot: string | undefined;
  userName: string;
  content: string;
  onUserNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ReservationDialog({
  selectedRoom,
  date,
  timeSlot,
  userName,
  content,
  onUserNameChange,
  onContentChange,
  onConfirm,
  onClose
}: ReservationDialogProps) {
  return (
    <AlertDialog open={selectedRoom !== null} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">토론방 {selectedRoom} 예약</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {(date instanceof Date) && timeSlot ? (
              <>
                <p className="text-center">
                  {`${date.toLocaleDateString()}에 ${timeSlot} 시간대로 토론방 ${selectedRoom}을 예약하겠습니까?`}
                </p>
                <div>
                  <div className="mb-4">
                    <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                      예약자 성함 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="userName"
                      type="text"
                      value={userName}
                      onChange={(e) => onUserNameChange(e.target.value)}
                      placeholder="이름을 입력해주세요"
                      className="mt-1"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                      모임 목적 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="content"
                      type="text"
                      value={content}
                      onChange={(e) => onContentChange(e.target.value)}
                      placeholder="모임 목적을 입력해주세요"
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-red-500 text-center">날짜와 시간을 선택해주세요.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center">
          <AlertDialogCancel onClick={onClose}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!date || !timeSlot}
          >
            다음
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 