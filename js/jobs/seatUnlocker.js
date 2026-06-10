const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function unlockExpiredSeats() {
  try {
    const now = new Date();

    const expiredBookings = await prisma.bookings.findMany({
      where: { status: 'PENDING', expires_at: { lt: now } },
      include: { booking_seats: true },
    });

    for (const booking of expiredBookings) {
      const seatIds = booking.booking_seats.map((bs) => bs.seat_id);

      await prisma.$transaction(async (tx) => {
        await tx.bookings.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED', expires_at: null },
        });

        await tx.payments.updateMany({
          where: { booking_id: booking.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        });

        await tx.tickets.updateMany({
          where: { booking_id: booking.id },
          data: { status: 'CANCELLED' },
        });

        await tx.trip_seat_status.updateMany({
          where: { trip_id: booking.trip_id, seat_id: { in: seatIds } },
          data: { status: 'AVAILABLE', locked_until: null, locked_by_user_id: null },
        });
      });
    }

    const orphanUnlock = await prisma.trip_seat_status.updateMany({
      where: { status: 'LOCKED', locked_until: { lt: now } },
      data: { status: 'AVAILABLE', locked_until: null, locked_by_user_id: null },
    });

    if (expiredBookings.length || orphanUnlock.count) {
      console.log(
        `[SeatUnlocker] Huy ${expiredBookings.length} booking qua han, nha ${orphanUnlock.count} ghe luc ${now.toISOString()}`
      );
    }
  } catch (e) {
    console.error('[SeatUnlocker] Loi:', e.message);
  }
}

function startUnlocker() {
  console.log('[SeatUnlocker] Da khoi dong - chay moi 60 giay');
  setInterval(unlockExpiredSeats, 60 * 1000);
  unlockExpiredSeats();
}

module.exports = { startUnlocker };
