interface RoomProps {
  number: number;
  disabled?: boolean;
  available?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Room({
  number,
  disabled = false,
  available = false,
  onClick,
  className = "",
}: RoomProps) {
  return (
    <div
      onClick={available ? onClick : undefined}
      className={`border rounded-xl text-center text-sm flex items-center justify-center transition-all duration-200 ${className}
        ${
          disabled
            ? "border-slate-200 bg-slate-50/80 text-slate-400 cursor-not-allowed"
            : available
            ? "border-[#4589c8]/20 bg-[#4589c8] text-white cursor-pointer hover:bg-[#69a3d8] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            : "border-[#4589c8]/20 bg-white text-[#4589c8] hover:bg-[#4589c8]/5"
        }
      `}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="font-semibold text-base">토론방 {number}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
          {disabled ? "예약 불가" : "예약가능"}
        </span>
      </div>
    </div>
  );
} 