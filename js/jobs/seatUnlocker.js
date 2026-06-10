const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unlockExpiredSeats() {
  try {
    const now = new Date();

    const expired = await prisma.trip_seat_status.findMany({
      where: { status: 'LOCKED', locked_until: { lt: now } }
    });

    if (expired.length) {
      await prisma.trip_seat_status.updateMany({
        where: { status: 'LOCKED', locked_until: { lt: now } },
        data:  { status: 'AVAILABLE', locked_until: null, locked_by_user_id: null }
      });

      await prisma.bookings.updateMany({
        where: { status: 'PENDING', expires_at: { lt: now } },
        data:  { status: 'CANCELLED' }
      });

      // Xóa booking_seats rỗng — tickets trước, booking_seats sau
      const expiredBookings = await prisma.bookings.findMany({
        where: { status: 'CANCELLED', expires_at: { lt: now } },
        include: { booking_seats: true }
      });

      for (const b of expiredBookings) {
        const bsIds = b.booking_seats.map(bs => bs.id);
        if (bsIds.length) {
          await prisma.tickets.deleteMany({ where: { booking_seat_id: { in: bsIds } } });
          await prisma.booking_seats.deleteMany({ where: { id: { in: bsIds } } });
        }
      }

      console.log(`[SeatUnlocker] Nhả ${expired.length} ghế lúc ${now.toISOString()}`);
    }
  } catch (e) {
    console.error('[SeatUnlocker] Lỗi:', e.message);
  }
}

function startUnlocker() {
  console.log('[SeatUnlocker] Đã khởi động — chạy mỗi 60 giây');
  setInterval(unlockExpiredSeats, 60 * 1000);
  unlockExpiredSeats();
}

module.exports = { startUnlocker };