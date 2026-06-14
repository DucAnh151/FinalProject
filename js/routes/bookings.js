const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const LOCK_MINUTES = 5;

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
      // Lấy thông tin user — kiểm tra role + is_active
      const user = await tx.users.findUnique({
        where: { id: BigInt(userId) },
        select: { role: true, is_active: true, loyalty_tier: true }  // ← gộp 2 lần query thành 1
      });

      if (!user || !user.is_active)
        throw new Error('USER_NOT_AVAILABLE');
      if (user.role === 'ADMIN')
        throw new Error('ADMIN_CANNOT_BOOK');

      // 1. Kiểm tra chuyến xe tồn tại và đang OPEN
      const trip = await tx.trips.findUnique({
        where: { id: BigInt(tripId) },
        include: { routes: true }  // ← gộp luôn include routes để dùng ở bước 6
      });
      if (!trip || trip.status !== 'OPEN')
        throw new Error('TRIP_NOT_AVAILABLE');

      // BR-06: không cho đặt chuyến khởi hành trong vòng 60 phút
      const minDeparture = new Date(Date.now() + 60 * 60 * 1000);
      if (trip.departure_time <= minDeparture)
        throw new Error('TRIP_CLOSING_SOON');

      // 2. Lấy trạng thái ghế hiện tại
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
            status:            'LOCKED',
            locked_until:      expiresAt,
            locked_by_user_id: BigInt(userId),
          },
          create: {
            trip_id:           BigInt(tripId),
            seat_id:           BigInt(seatId),
            status:            'LOCKED',
            locked_until:      expiresAt,
            locked_by_user_id: BigInt(userId),
          }
        });
      }

      // 6. Tính giá vé — dùng trip đã include routes ở bước 1
      const price = trip.price_override ?? trip.routes.base_price;
      const discount = user.loyalty_tier === 'VIP_CUSTOMER' ? 0.8 : 1;  // BR-08: VIP giảm 20%
      const totalAmount = Math.round(price * selectedSeatIds.length * discount);

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
    if (e.message === 'USER_NOT_AVAILABLE')
      return res.status(403).json({ error: 'Tài khoản không khả dụng' });
    if (e.message === 'ADMIN_CANNOT_BOOK')
      return res.status(403).json({ error: 'Admin không được đặt vé' });
    if (e.message === 'TRIP_NOT_AVAILABLE')
      return res.status(400).json({ error: 'Chuyến xe không khả dụng' });
    if (e.message === 'TRIP_CLOSING_SOON')
      return res.status(400).json({ error: 'Chuyến xe đã đóng bán (còn dưới 60 phút trước giờ khởi hành)' });
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
        },
        tickets: true
      },
      orderBy: { created_at: 'desc' }
    });

    const result = bookings.map(b => ({
      id:          Number(b.id),
      bookingId:   Number(b.id),
      tripId:      Number(b.trip_id),
      status:      b.status,
      totalAmount: Number(b.total_amount),
      expiresAt:   b.expires_at,
      createdAt:   b.created_at,
      origin:      b.trips.routes.provinces_routes_origin_province_idToprovinces.name,
      destination: b.trips.routes.provinces_routes_destination_province_idToprovinces.name,
      departure:   b.trips.departure_time,
      trip: {
        id:            Number(b.trip_id),
        origin:        b.trips.routes.provinces_routes_origin_province_idToprovinces.name,
        destination:   b.trips.routes.provinces_routes_destination_province_idToprovinces.name,
        departureTime: b.trips.departure_time,
        price:         Number(b.total_amount) / Math.max(b.booking_seats.length, 1),
      },
      seats:       b.booking_seats.map(bs => bs.seats.seat_name),
      seatDetails: b.booking_seats.map(bs => ({
        bookingSeatId:  Number(bs.id),
        seatId:         Number(bs.seat_id),
        seatName:       bs.seats.seat_name,
        passengerName:  bs.passenger_name,
        passengerPhone: bs.passenger_phone,
      })),
      tickets: b.tickets.map(t => ({
        id:     Number(t.id),
        qrCode: t.qr_code,
        status: t.status,
      })),
    }));

    res.json(result);
  } catch (e) {
    console.error('My bookings error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/bookings/:id/passengers
router.put('/:id/passengers', async (req, res) => {
  const { passengers, pickupStopId, dropoffStopId } = req.body;

  if (!passengers?.length)
    return res.status(400).json({ error: 'Thiếu thông tin hành khách' });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bookings.update({
        where: { id: BigInt(req.params.id) },
        data: {
          pickup_stop_id:  pickupStopId,
          dropoff_stop_id: dropoffStopId,
        }
      });

      await tx.booking_seats.deleteMany({
        where: { booking_id: BigInt(req.params.id) }
      });

      await tx.booking_seats.createMany({
        data: passengers.map(p => ({
          booking_id:      BigInt(req.params.id),
          seat_id:         BigInt(p.seatId),
          passenger_name:  p.name,
          passenger_phone: p.phone,
        }))
      });
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Update passengers error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  const { userId, reason = 'USER_CANCELLED' } = req.body;

  if (!userId)
    return res.status(400).json({ error: 'Thiếu userId' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.bookings.findUnique({
        where: { id: BigInt(req.params.id) },
        include: {
          booking_seats: true,
          payments: true,
          tickets: true,
        }
      });

      if (!booking)
        throw new Error('BOOKING_NOT_FOUND');
      if (Number(booking.user_id) !== Number(userId))
        throw new Error('FORBIDDEN');
      if (booking.status === 'CANCELLED')
        return { booking, refundAmount: 0, refundRate: 0 };
      if (booking.status === 'CONFIRMED' && booking.tickets.some(t => t.status === 'USED'))
        throw new Error('TICKET_ALREADY_USED');

      const seatIds = booking.booking_seats.map(bs => bs.seat_id);

      // Refund logic — BR-04: phí hủy 10%, hoàn 90%
      let refundAmount = 0n;
      let refundRate = 0;
      const successPayment = booking.payments.find(p => p.status === 'SUCCESS');

      if (booking.status === 'CONFIRMED' && successPayment) {
        const userForRefund = await tx.users.findUnique({
          where:  { id: BigInt(userId) },
          select: { id: true, wallet_balance: true }
        });

        refundRate = 0.9;
        refundAmount = BigInt(Math.floor(Number(successPayment.amount) * refundRate));

        if (userForRefund) {
          const newBalance = BigInt(userForRefund.wallet_balance || 0) + refundAmount;
          await tx.users.update({
            where: { id: BigInt(userId) },
            data:  { wallet_balance: newBalance }
          });

          await tx.wallet_transactions.create({
            data: {
              user_id:       BigInt(userId),
              type:          'REFUND',
              amount:        refundAmount,
              balance_after: newBalance,
              description:   `Hoàn tiền 90% hủy vé #${booking.id} (${successPayment.gateway})`,
              booking_id:    booking.id
            }
          });
        }
      }

      await tx.tickets.updateMany({
        where: { booking_id: booking.id },
        data:  { status: 'CANCELLED' }
      });

      await tx.payments.updateMany({
        where: { booking_id: booking.id, status: 'PENDING' },
        data:  { status: 'FAILED' }
      });

      await tx.trip_seat_status.updateMany({
        where: { trip_id: booking.trip_id, seat_id: { in: seatIds } },
        data:  { status: 'AVAILABLE', locked_until: null, locked_by_user_id: null }
      });

      const updated = await tx.bookings.update({
        where: { id: booking.id },
        data:  { status: 'CANCELLED', expires_at: null }
      });

      return { booking: updated, refundAmount: Number(refundAmount), refundRate };
    });

    res.json({
      success:      true,
      bookingId:    Number(result.booking.id),
      status:       'CANCELLED',
      reason,
      refundAmount: result.refundAmount,
      refundRate:   result.refundRate,
    });
  } catch (e) {
    if (e.message === 'BOOKING_NOT_FOUND')
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
    if (e.message === 'FORBIDDEN')
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn này' });
    if (e.message === 'TICKET_ALREADY_USED')
      return res.status(400).json({ error: 'Vé đã sử dụng, không thể hủy' });

    console.error('Cancel booking error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;