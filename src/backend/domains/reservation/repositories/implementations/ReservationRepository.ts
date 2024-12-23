import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ReservationEntity } from '../../entity/ReservationEntity';
import { ReservationInterfaceRepository } from '../interfaces/ReservationInterfaceRepository';

@Injectable()
export class ReservationRepository implements ReservationInterfaceRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createReservation(reservation: ReservationEntity): Promise<ReservationEntity> {
        try {
            const createdReservation = await this.prisma.reservation.create({
                data: {
                    userId: reservation.getUserId(),
                    roomId: reservation.getRoomId(),
                    startTime: reservation.getStartTime(),
                    endTime: reservation.getEndTime(),
                    status: reservation.getStatus(),
                    userName: reservation.getUserName(),
                    createdAt: new Date()
                }
            });

            return new ReservationEntity(
                createdReservation.id,
                createdReservation.userId,
                createdReservation.roomId,
                createdReservation.userName,
                createdReservation.startTime.toString(),
                createdReservation.endTime.toString(),
                createdReservation.status,
                createdReservation.createdAt
            );
        } catch (error) {
            throw new Error(`Failed to create reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTodayReservations(): Promise<ReservationEntity[]> {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0].replace(/-/g, '');
        console.log(formattedDate);
        try {
            const reservations = await this.prisma.reservation.findMany({
                where: {
                    startTime: {
                        startsWith: formattedDate,
                    },
                },
            });

            return reservations.map(reservation => new ReservationEntity(
                reservation.id,
                reservation.userId,
                reservation.roomId,
                reservation.userName,
                reservation.startTime,
                reservation.endTime,
                reservation.status,
                reservation.createdAt
            ));
        } catch (error) {
            throw new Error(`Failed to fetch today's reservations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}