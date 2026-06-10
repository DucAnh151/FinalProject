const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const LOCK_MINUTES = 10;

// POST /api/bookings
router.post('/', async (req, res) => {
  const { userId, tripId, pickupStopId, dropoffStopId, selectedSeatIds } = req.body;

  // Validate input
  if (!userId || !tripId || !pickupStopId || !dropoffStopId || !selectedSeatIds?.length)
    return res.status(400).json({ error: 'Thiếu thông tin đặt vé' });

  if (selectedSeatIds.length > 5)
    return res.status(400).json({ error: 'Tối đa 5 ghế mỗi lần đặt' });

  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1. Kiểm tra chuyến xe tồn tại và đang OPEN
      const trip = await tx.trips.findUnique({
        where: { id: BigInt(tripId) }
      });
      if (!trip || trip.status !== 'OPEN')
        throw new Error('TRIP_NOT_AVAILABLE');

      // 2. Lấy trạng thái ghế hiện tại — lock rows để tránh race condition
      const seatStatuses = await tx.trip_seat_status.findMany({
        where: {
          trip_id: BigInt(tripId),
          seat_id: { in: selectedSeatIds.map(id => BigInt(id)) }
        }
      });

      // 3. Kiểm tra ghế nào đang bị lock hoặc confirmed
      const now = new Date();
      for (const ss of seatStatuses) {
        if (ss.status === 'CONFIRMED')
          throw new Error('SEAT_ALREADY_BOOKED');
        if (ss.status === 'LOCKED' && ss.locked_until > now)
          throw new Error('SEAT_ALREADY_LOCKED');
      }

      // 4. Tính thời gian hết hạn lock
      const expiresAt = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);

      // 5. Upsert trạng thái ghế → LOCKED
      for (const seatId of selectedSeatIds) {
        await tx.trip_seat_status.upsert({
          where: {
            trip_id_seat_id: {
              trip_id: BigInt(tripId),
              seat_id: BigInt(seatId),
            }
          },
          update: {
            status:              'LOCKED',
            locked_until:        expiresAt,
            locked_by_user_id:   BigInt(userId),
          },
          create: {
            trip_id:             BigInt(tripId),
            seat_id:             BigInt(seatId),
            status:              'LOCKED',
            locked_until:        expiresAt,
            locked_by_user_id:   BigInt(userId),
          }
        });
      }

      // 6. Lấy giá vé
      const tripWithRoute = await tx.trips.findUnique({
        where: { id: BigInt(tripId) },
        include: { routes: true }
      });
      const price      = tripWithRoute.price_override ?? tripWithRoute.routes.base_price;
      const totalAmount = price * selectedSeatIds.length;

      // 7. Tạo booking
      const booking = await tx.bookings.create({
        data: {
          user_id:         BigInt(userId),
          trip_id:         BigInt(tripId),
          pickup_stop_id:  pickupStopId,
          dropoff_stop_id: dropoffStopId,
          total_amount:    totalAmount,
          status:          'PENDING',
          expires_at:      expiresAt,
        }
      });

      return { booking, expiresAt };
    });

    res.status(201).json({
      success:   true,
      bookingId: Number(result.booking.id),
      status:    'PENDING',
      expiresAt: result.expiresAt,
    });

  } catch (e) {
    if (e.message === 'TRIP_NOT_AVAILABLE')
      return res.status(400).json({ error: 'Chuyến xe không khả dụng' });
    if (e.message === 'SEAT_ALREADY_BOOKED')
      return res.status(409).json({ error: 'Ghế đã được đặt' });
    if (e.message === 'SEAT_ALREADY_LOCKED')
      return res.status(409).json({ error: 'Ghế đang được người khác giữ' });

    console.error('Booking error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/bookings/my — lấy danh sách vé của user
router.get('/my', async (req, res) => {
  const { userId } = req.query;
  if (!userId)
    return res.status(400).json({ error: 'Thiếu userId' });

  try {
    const bookings = await prisma.bookings.findMany({
      where:   { user_id: BigInt(userId) },
      include: {
        trips: {
          include: {
            routes: {
              include: {
                provinces_routes_origin_province_idToprovinces:      true,
                provinces_routes_destination_province_idToprovinces: true,
              }
            }
          }
        },
        booking_seats: {
          include: { seats: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const result = bookings.map(b => ({
      id:          Number(b.id),
      status:      b.status,
      totalAmount: Number(b.total_amount),
      expiresAt:   b.expires_at,
      createdAt:   b.created_at,
      origin:      b.trips.routes.provinces_routes_origin_province_idToprovinces.name,
      destination: b.trips.routes.provinces_routes_destination_province_idToprovinces.name,
      departure:   b.trips.departure_time,
      seats:       b.booking_seats.map(bs => bs.seats.seat_name),
    }));

    res.json(result);
  } catch (e) {
    console.error('My bookings error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/bookings/:id/passengers
router.put('/:id/passengers', async (req, res) => {
  const { passengers, pickupStopId, dropoffStopId } = req.body

  if (!passengers?.length)
    return res.status(400).json({ error: 'Thiếu thông tin hành khách' })

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bookings.update({
        where: { id: BigInt(req.params.id) },
        data: {
          pickup_stop_id:  pickupStopId,
          dropoff_stop_id: dropoffStopId,
        }
      })

      await tx.booking_seats.deleteMany({
        where: { booking_id: BigInt(req.params.id) }
      })

      await tx.booking_seats.createMany({
        data: passengers.map(p => ({
          booking_id:      BigInt(req.params.id),
          seat_id:         BigInt(p.seatId),
          passenger_name:  p.name,
          passenger_phone: p.phone,
        }))
      })
    })

    res.json({ success: true })
  } catch (e) {
    console.error('Update passengers error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// module.exports = router; ← dòng này giữ nguyên bên dưới

module.exports = router;