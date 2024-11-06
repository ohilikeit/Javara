import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './UserEntity';
import { Room } from './RoomEntity';

@Entity('reservation')
export class Reservation {
  @PrimaryGeneratedColumn()
  reservationId!: number;

  @Column()
  userId!: number;

  @Column()
  roomId!: number;

  @Column({ type: 'datetime' })
  startTime!: Date;

  @Column({ type: 'datetime' })
  endTime!: Date;

  @Column()
  status!: number;

  @Column({ type: 'datetime' })
  regdate!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room!: Room;
}
