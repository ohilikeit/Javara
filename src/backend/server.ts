import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { handleApiRoute } from './routes/api'
import DatabaseConnection from './database'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// 서버 시작 함수
async function startServer() {
    try {
        // 데이터베이스 연결 초기화
        const db = await DatabaseConnection.getInstance();
        
        await app.prepare();

        createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url!, true)
                
                // API 라우트 처리 시도
                const isApiRoute = await handleApiRoute(req, res, parsedUrl.pathname!)
                
                // API 라우트가 아닌 경우 Next.js의 기본 핸들러로 처리
                if (!isApiRoute) {
                    handle(req, res, parsedUrl)
                }
            } catch (error) {
                console.error('Error handling request:', error)
                res.statusCode = 500
                res.end('Internal Server Error')
            }
        }).listen(port);

        console.log(
            `> Server listening at http://localhost:${port} as ${
                dev ? 'development' : process.env.NODE_ENV
            }`
        );

        // 프로세스 종료 시 데이터베이스 연결 종료
        process.on('SIGTERM', () => {
            DatabaseConnection.closeConnection();
            process.exit(0);
        });
    } catch (error) {
        console.error('서버 시작 오류:', error);
        process.exit(1);
    }
}

// 서버 시작
startServer();