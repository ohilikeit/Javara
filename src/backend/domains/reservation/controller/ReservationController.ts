import { NextRequest, NextResponse } from 'next/server';
import { CreateReservationUseCase } from '../service/CreateReservationUseCase';
import { ReservationRepository } from '../repositories/implementations/ReservationRepository';

export class ReservationController {
    private createReservationUseCase: CreateReservationUseCase;

    constructor() {
        const reservationRepository = new ReservationRepository();
        this.createReservationUseCase = new CreateReservationUseCase(reservationRepository);
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
}
