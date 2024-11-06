import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Reservation } from '../../reservation/entity/ReservationEntity';

@Entity('room')
export class Room {
    @PrimaryGeneratedColumn()
    roomId!: number;

    @Column()
    roomName!: string;

    @Column()
    capacity!: number;

    @OneToMany(() => Reservation, (reservation) => reservation.room)
    reservations!: Reservation[];
} 