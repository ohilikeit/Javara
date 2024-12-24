import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Search } from "lucide-react";

interface ReservationCalendarProps {
  date: Date | undefined;
  timeSlot: string | undefined;
  onDateChange: (date: Date | undefined) => void;
  onTimeSlotChange: (time: string) => void;
  onSearch: () => void;
}

export function ReservationCalendar({
  date,
  timeSlot,
  onDateChange,
  onTimeSlotChange,
  onSearch
}: ReservationCalendarProps) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-lg ring-1 ring-black/5">
      <div className="space-y-4">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            initialFocus
            className="rounded-lg border"
          />
        </div>
        <Select value={timeSlot} onValueChange={onTimeSlotChange}>
          <SelectTrigger className="w-full text-center transition-all hover:bg-slate-100 hover:border-slate-300">
            <SelectValue placeholder="시간대 선택" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border shadow-lg">
            <SelectItem value="09:00">09:00 - 10:00</SelectItem>
            <SelectItem value="10:00">10:00 - 11:00</SelectItem>
            <SelectItem value="11:00">11:00 - 12:00</SelectItem>
            <SelectItem value="13:00">13:00 - 14:00</SelectItem>
            <SelectItem value="14:00">14:00 - 15:00</SelectItem>
            <SelectItem value="15:00">15:00 - 16:00</SelectItem>
            <SelectItem value="16:00">16:00 - 17:00</SelectItem>
            <SelectItem value="17:00">17:00 - 18:00</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onSearch}
          className="w-full bg-[#4589c8] text-white hover:bg-[#69a3d8] transition-colors shadow-md"
        >
          <Search className="mr-2 h-4 w-4" />
          검색
        </Button>
      </div>
    </div>
  );
} 