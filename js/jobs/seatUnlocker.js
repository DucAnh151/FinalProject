const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unlockExpiredSeats() {
  try {
    const now = new Date();

    // 1. Tìm các ghế LOCKED đã hết hạn
    const expired = await prisma.trip_seat_status.findMany({
      where: {
        status:       'LOCKED',
        locked_until: { lt: now }
      }
    });

    if (!expired.length) return;

    // 2. Nhả ghế về AVAILABLE
    await prisma.trip_seat_status.updateMany({
      where: {
        status:       'LOCKED',
        locked_until: { lt: now }
      },
      data: {
        status:            'AVAILABLE',
        locked_until:      null,
        locked_by_user_id: null,
      }
    });

    // 3. Hủy các booking PENDING đã hết hạn
    await prisma.bookings.updateMany({
      where: {
        status:     'PENDING',
        expires_at: { lt: now }
      },
      data: { status: 'CANCELLED' }
    });

    console.log(`[SeatUnlocker] Nhả ${expired.length} ghế lúc ${now.toISOString()}`);

  } catch (e) {
    console.error('[SeatUnlocker] Lỗi:', e.message);
  }
}

// Chạy mỗi 60 giây
function startUnlocker() {
  console.log('[SeatUnlocker] Đã khởi động — chạy mỗi 60 giây');
  setInterval(unlockExpiredSeats, 60 * 1000);
  // Chạy ngay lần đầu khi khởi động
  unlockExpiredSeats();
}

module.exports = { startUnlocker };