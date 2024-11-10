import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

class DatabaseConnection {
    private static instance: Database;
    private static DB_PATH = path.join(__dirname, '..', '..', 'data', 'reservation.db');

    private static ensureDataDirectory(): void {
        const dataDir = path.dirname(DatabaseConnection.DB_PATH);
        if (!fs.existsSync(dataDir)) {
            try {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('data 디렉토리가 생성되었습니다');
            } catch (err) {
                console.error('디렉토리 생성 오류:', err);
                throw err;
            }
        }
    }

    public static getInstance(): Database {
        if (!DatabaseConnection.instance) {
            // 데이터 디렉토리 확인 및 생성
            DatabaseConnection.ensureDataDirectory();

            DatabaseConnection.instance = new sqlite3.Database(
                DatabaseConnection.DB_PATH,
                (err) => {
                    if (err) {
                        console.error('데이터베이스 연결 오류:', err.message);
                    } else {
                        console.log('SQLite 데이터베이스에 연결되었습니다');
                        // 외래키 제약조건 활성화
                        DatabaseConnection.instance.run('PRAGMA foreign_keys = ON', (err) => {
                            if (err) {
                                console.error('외래키 제약조건 활성화 오류:', err.message);
                            } else {
                                console.log('외래키 제약조건이 활성화되었습니다');
                                // 테이블 초기화
                                DatabaseConnection.initializeTables();
                            }
                        });
                    }
                }
            );
        }
        return DatabaseConnection.instance;
    }

    private static initializeTables(): void {
        const db = DatabaseConnection.instance;
        
        // users 테이블 생성
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                userId INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL
            )
        `);

        // rooms 테이블 생성
        db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                roomId INTEGER PRIMARY KEY AUTOINCREMENT,
                roomName VARCHAR NOT NULL,
                capacity INTEGER NOT NULL
            )
        `);

        // reservations 테이블 생성
        db.run(`
            CREATE TABLE IF NOT EXISTS reservations (
                reservationId INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                roomId INTEGER NOT NULL,
                startTime DATETIME NOT NULL,
                endTime DATETIME NOT NULL,
                status INTEGER NOT NULL,
                regdate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(userId),
                FOREIGN KEY (roomId) REFERENCES rooms(roomId)
            )
        `);
    }

    public static closeConnection(): void {
        if (DatabaseConnection.instance) {
            DatabaseConnection.instance.close((err) => {
                if (err) {
                    console.error('데이터베이스 연결 종료 오류:', err.message);
                } else {
                    console.log('데이터베이스 연결이 종료되었습니다');
                }
            });
        }
    }
}

export default DatabaseConnection; 