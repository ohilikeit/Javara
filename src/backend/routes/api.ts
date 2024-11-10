import { IncomingMessage, ServerResponse } from 'http';
import { NextRequest, NextResponse } from 'next/server';
import reservationRoutes from './reservation.route';

export interface Route {
    path: string;
    method: string;
    handler: (req: NextRequest) => Promise<NextResponse>;
}

const routes: Route[] = [
    ...reservationRoutes
];

export async function handleApiRoute(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string
): Promise<boolean> {
    const route = routes.find(
        r => r.path === pathname && r.method === req.method
    );

    if (!route) {
        return false;
    }

    try {
        // Node.js request를 NextRequest 객체로 변환
        const nextRequest = new NextRequest(new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: new Headers(req.headers as HeadersInit),
            body: req.readable ? new ReadableStream({
                start(controller) {
                    req.on('data', chunk => controller.enqueue(chunk));
                    req.on('end', () => controller.close());
                }
            }) : null
        }));

        // 라우트 핸들러 실행
        const nextResponse = await route.handler(nextRequest);
        
        // NextResponse를 Node.js response로 변환
        res.statusCode = nextResponse.status;
        // 헤더 복사
        Array.from(nextResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        // 응답 본문 전송
        const responseData = await nextResponse.json();
        res.end(JSON.stringify(responseData));

        return true;
    } catch (err) {
        console.error('Error in API route:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'Internal Server Error' }));
        return true;
    }
} 