
import { NextRequest } from 'next/server';
import { ReservationController } from '../domains/reservation/controller/ReservationController';
import { Route } from './api';

const reservationController = new ReservationController();

const routes: Route[] = [
    {
        path: '/api/reservation',
        method: 'POST',
        handler: (req: NextRequest) => reservationController.createReservation(req)
    }
];

export default routes;