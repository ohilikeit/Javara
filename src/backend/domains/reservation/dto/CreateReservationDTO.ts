export class CreateReservationDTO {
    constructor(
        public userId: 1,
        public roomId: number,
        public userName: string,
        public content: string,
        public startTime: string,
        public endTime: string,
        public status: 0,
    ) {
        const dateFormat = /^\d{12}$/;
        if (!dateFormat.test(startTime) || !dateFormat.test(endTime)) {
            throw new Error('시간은 YYYYMMDDHHMM 형식이어야 합니다');
        }
    }
} 