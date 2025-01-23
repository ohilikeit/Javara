import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 기존 데이터 삭제
  await prisma.reservation.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.room.deleteMany({});

  // 기본 사용자 생성
  await prisma.user.create({
    data: {
      name: 'Kylie',
    },
  });

  // 토론방 생성
  await prisma.room.createMany({
    data: [
      { roomId: 1, roomName: '토론방 1', capacity: 4 },
      { roomId: 4, roomName: '토론방 4', capacity: 6 },
      { roomId: 5, roomName: '토론방 5', capacity: 8 },
      { roomId: 6, roomName: '토론방 6', capacity: 10 },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 