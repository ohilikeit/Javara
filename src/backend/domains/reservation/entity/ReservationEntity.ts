import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ReservationEntity {
    @PrimaryGeneratedColumn()
    public reservationId: number;

    @Column()
    public userId: number;

    @Column()
    public roomId: number;

    @Column({ nullable: false })
    public userName: string;

    @Column({ nullable: false })
    public content: string;

    @Column({ nullable: false })
    public startTime: string;

    @Column({ nullable: false })
    public endTime: string;

    @Column()
    public status: number;

    @Column()
    public regdate: Date;

    constructor(
        reservationId: number,
        userId: number,
        roomId: number,
        userName: string,
        content: string,
        startTime: string,
        endTime: string,
        status: number,
        regdate: Date
    ) {
        this.reservationId = reservationId;
        this.userId = userId;
        this.roomId = roomId;
        this.userName = userName;
        this.content = content;
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

    public getContent(): string {
        return this.content;
    }

    // Status만 변경 가능하도록 setter 제공
    public setStatus(status: number): void {
        this.status = status;
    }
}