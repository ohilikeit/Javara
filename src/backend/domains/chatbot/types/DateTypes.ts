export type ISODateString = string; // YYYY-MM-DD
export type TimeString = string;    // HH:mm
export type ReservationDateString = string; // YYYYMMDDHHMM

export interface ParsedDateTime {
  date: ISODateString;
  time: TimeString;
}

export interface ReservationDateTime {
  startTime: ReservationDateString;
  endTime: ReservationDateString;
} 