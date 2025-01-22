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
                    content: reservation.getContent(),
                    createdAt: new Date()
                }
            });

            return new ReservationEntity(
                createdReservation.id,
                createdReservation.userId,
                createdReservation.roomId,
                createdReservation.userName,
                createdReservation.content ?? '',
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
        const utcDate = new Date();
        const today = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
        const formattedDate = today.toISOString().split('T')[0].replace(/-/g, '');
        
        try {
            const reservations = await this.prisma.reservation.findMany({
                where: {
                    startTime: {
                        startsWith: formattedDate,
                    },
                    status: 1  // 활성 상태인 예약만 조회
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            // 예약 엔티티 생성 시 시작 시간과 종료 시간을 모두 포함
            return reservations.map(reservation => {
                // YYYYMMDDHHMM 형식의 시간 문자열을 Date 객체로 변환
                const startTime = new Date(
                    parseInt(reservation.startTime.substring(0, 4)),
                    parseInt(reservation.startTime.substring(4, 6)) - 1,
                    parseInt(reservation.startTime.substring(6, 8)),
                    parseInt(reservation.startTime.substring(8, 10)),
                    parseInt(reservation.startTime.substring(10, 12))
                );
                
                const endTime = new Date(
                    parseInt(reservation.endTime.substring(0, 4)),
                    parseInt(reservation.endTime.substring(4, 6)) - 1,
                    parseInt(reservation.endTime.substring(6, 8)),
                    parseInt(reservation.endTime.substring(8, 10)),
                    parseInt(reservation.endTime.substring(10, 12))
                );

                // 시간 차이를 시간 단위로 계산 (소수점 올림)
                const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

                return new ReservationEntity(
                    reservation.id,
                    reservation.userId,
                    reservation.roomId,
                    reservation.userName,
                    reservation.content ?? '',
                    reservation.startTime,
                    reservation.endTime,
                    reservation.status,
                    reservation.createdAt,
                    duration
                );
            });
        } catch (error) {
            throw new Error(`Failed to fetch reservations by time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getReservationsByTime(startTime: string): Promise<ReservationEntity[]> {
        try {
            const reservations = await this.prisma.reservation.findMany({
                where: {
                    startTime: startTime,
                    status: 1  // 활성 예약만 조회
                }
            });

            return reservations.map(reservation => new ReservationEntity(
                reservation.id,
                reservation.userId,
                reservation.roomId,
                reservation.userName,
                reservation.content ?? '',
                reservation.startTime.toString(),
                reservation.endTime.toString(),
                reservation.status,
                reservation.createdAt
            ));
        } catch (error) {
            throw new Error(`Failed to fetch reservations by time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}