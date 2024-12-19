import { Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class ReservationEntity {
    @PrimaryGeneratedColumn()
    public reservationId: number;
    public userId: number;
    public roomId: number; 
    public userName: string;   
    public startTime: string;
    public endTime: string;
    public status: number;
    public regdate: Date;

    constructor(
        reservationId: number,
        userId: number,
        roomId: number,
        userName: string,
        startTime: string,
        endTime: string,
        status: number,
        regdate: Date
    ) {
        this.reservationId = reservationId;
        this.userId = userId;
        this.roomId = roomId;
        this.userName = userName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.regdate = regdate;
    }

    // Getters
    public getReservationId(): number {
        return this.reservationId;
    }

    public getUserId(): number {
        return this.userId;
    }

    public getRoomId(): number {
        return this.roomId;
    }

    public getUserName(): string {
        return this.userName;
    }

    public getStartTime(): string {
        return this.startTime;
    }

    public getEndTime(): string {
        return this.endTime;
    }

    public getStatus(): number {
        return this.status;
    }

    public getRegdate(): Date {
        return this.regdate;
    }

    // Status만 변경 가능하도록 setter 제공
    public setStatus(status: number): void {
        this.status = status;
    }
}