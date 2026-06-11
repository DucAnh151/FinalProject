const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CLOSE_BEFORE_MS = 60 * 60 * 1000; // BR-06: đóng bán trước 60 phút

async function closeUpcomingTrips() {
  try {
    const cutoff = new Date(Date.now() + CLOSE_BEFORE_MS);

    const result = await prisma.trips.updateMany({
      where: {
        status: 'OPEN',
        departure_time: { lte: cutoff },
      },
      data: { status: 'CLOSED' },
    });

    if (result.count) {
      console.log(`[TripCloser] Dong ${result.count} chuyen truoc gio khoi hanh luc ${new Date().toISOString()}`);
    }
  } catch (e) {
    console.error('[TripCloser] Loi:', e.message);
  }
}

function startTripCloser() {
  console.log('[TripCloser] Da khoi dong - chay moi 5 phut');
  setInterval(closeUpcomingTrips, 5 * 60 * 1000);
  closeUpcomingTrips();
}

module.exports = { startTripCloser, CLOSE_BEFORE_MS };
