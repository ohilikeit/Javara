import { NextRequest, NextResponse } from 'next/server';
import { CreateReservationUseCase } from '../service/CreateReservationUseCase';
import { ReservationRepository } from '../repositories/implementations/ReservationRepository';
import { FindReservationsByDateTimeUseCase } from '../service/FindReservationsByDateTimeUseCase';

export class ReservationController {
    private createReservationUseCase: CreateReservationUseCase;
    private findReservationsByDateTimeUseCase: FindReservationsByDateTimeUseCase;

    constructor() {
        const reservationRepository = new ReservationRepository();
        this.createReservationUseCase = new CreateReservationUseCase(reservationRepository);
        this.findReservationsByDateTimeUseCase = new FindReservationsByDateTimeUseCase(reservationRepository);
    }

    async createReservation(request: NextRequest): Promise<NextResponse> {
        try {
            const body = await request.json();
            
            // Date 문자열을 Date 객체로 변환
            const reservationData = {
                ...body,
                startTime: new Date(body.startTime),
                endTime: new Date(body.endTime)
            };

            const result = await this.createReservationUseCase.execute(reservationData);

            return NextResponse.json(
                { 
                    message: 'Reservation created successfully',
                    data: result 
                }, 
                { status: 201 }
            );
        } catch (error) {
            return NextResponse.json(
                { 
                    message: error instanceof Error ? error.message : 'Internal server error' 
                }, 
                { status: 500 }
            );
        }
    }

    async findReservationsByDateTime(request: NextRequest): Promise<NextResponse> {
        try {
            const { searchParams } = new URL(request.url);
            const targetDate = searchParams.get('targetDate');
            const startHour = searchParams.get('startHour');
            const endHour = searchParams.get('endHour');

            // 필수 파라미터 검증
            if (!targetDate || !startHour || !endHour) {
                return NextResponse.json(
                    { message: 'Missing required parameters' },
                    { status: 400 }
                );
            }

            const result = await this.findReservationsByDateTimeUseCase.execute({
                targetDate: new Date(targetDate),
                startHour,
                endHour
            });

            return NextResponse.json(
                {
                    message: 'Reservations found successfully',
                    data: result
                },
                { status: 200 }
            );
        } catch (error) {
            return NextResponse.json(
                {
                    message: error instanceof Error ? error.message : 'Internal server error'
                },
                { status: 500 }
            );
        }
    }
}
