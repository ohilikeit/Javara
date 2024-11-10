import { NextRequest } from 'next/server';
import { ReservationController } from '../domains/reservation/controller/ReservationController';
import { Route } from './api';

const reservationController = new ReservationController();

const routes: Route[] = [
    {
        path: '/api/reservation',
        method: 'POST',
        handler: (req: NextRequest) => reservationController.createReservation(req)
    },
    {
        path: '/api/reservation/findReservationsByDateTime',
        method: 'GET',
        handler: (req: NextRequest) => reservationController.findReservationsByDateTime(req)
    }
];

export default routes;