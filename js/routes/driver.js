const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { confirmBookingAndIssueTickets } = require('../lib/bookingConfirm');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/driver/trips?driverId=xxx
async function getDriverTrips(req, res) {
  const { driverId } = req.query;
  if (!driverId) return res.status(400).json({ error: 'Thiếu driverId' });

  try {
    const trips = await prisma.trips.findMany({
      where: { assigned_driver_id: BigInt(driverId) },
      include: {
        routes: {
          include: {
            provinces_routes_origin_province_idToprovinces: true,
            provinces_routes_destination_province_idToprovinces: true,
          },
        },
        operators: true,
        vehicles: { include: { vehicle_types: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          include: { booking_seats: true },
        },
      },
      orderBy: { departure_time: 'asc' },
    });

    // Filter bookings: chỉ lấy CONFIRMED hoặc PENDING (CASH)
    trips.forEach(t => {
      t.bookings = t.bookings.filter(b =>
        b.status === 'CONFIRMED' ||
        (b.status === 'PENDING' && b.payment_method === 'CASH')
      );
    });

    res.json(trips.map(t => {
      const passengerCount = t.bookings.reduce(
        (sum, b) => sum + b.booking_seats.length, 0
      );
      return {
        id: Number(t.id),
        origin: t.routes.provinces_routes_origin_province_idToprovinces.name,
        destination: t.routes.provinces_routes_destination_province_idToprovinces.name,
        operator: t.operators.name,
        vehicleType: t.vehicles.vehicle_types.name,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        status: t.status,
        passengerCount,
      };
    }));
  } catch (e) {
    console.error('Driver trips error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// GET /api/driver/trips/:tripId/manifest
async function getDriverManifest(req, res) {
  const tripId = parseInt(req.params.tripId);
  if (!tripId) return res.status(400).json({ error: 'tripId không hợp lệ' });

  try {
    const bookings = await prisma.bookings.findMany({
      where: {
        trip_id: BigInt(tripId),
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        booking_seats: {
          include: { seats: true },
        },
        tickets: true,
        payments: { where: { gateway: 'CASH' }, orderBy: { id: 'desc' }, take: 1 },
        route_stops_bookings_pickup_stop_idToroute_stops: true,
        route_stops_bookings_dropoff_stop_idToroute_stops: true,
      },
    });

    // Filter: CONFIRMED hoặc PENDING (CASH)
    const filteredBookings = bookings.filter(b =>
      b.status === 'CONFIRMED' ||
      (b.status === 'PENDING' && b.payment_method === 'CASH')
    );

    const manifest = [];
    const cashPendingBookings = [];

    filteredBookings.forEach(b => {
      if (b.status === 'PENDING' && b.payment_method === 'CASH') {
        cashPendingBookings.push({
          bookingId: Number(b.id),
          totalAmount: Number(b.total_amount),
          seatCount: b.booking_seats.length,
        });
      }

      b.booking_seats.forEach(bs => {
        const ticket = b.tickets.find(
          t => Number(t.booking_seat_id) === Number(bs.id)
        );
        manifest.push({
          bookingId: Number(b.id),
          bookingStatus: b.status,
          passengerName: bs.passenger_name,
          passengerPhone: bs.passenger_phone,
          seatName: bs.seats.seat_name,
          floor: bs.seats.floor_number,
          pickupStop: b.route_stops_bookings_pickup_stop_idToroute_stops?.stop_name || '—',
          dropoffStop: b.route_stops_bookings_dropoff_stop_idToroute_stops?.stop_name || '—',
          qrCode: ticket?.qr_code || null,
          ticketStatus: ticket?.status || null,
          ticketId: ticket ? Number(ticket.id) : null,
        });
      });
    });

    manifest.sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.seatName.localeCompare(b.seatName);
    });

    res.json({ tripId, manifest, cashPendingBookings });
  } catch (e) {
    console.error('Driver manifest error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// PUT /api/driver/bookings/:id/confirm-cash — BR-09
async function confirmCash(req, res) {
  const { driverId } = req.body;
  const bookingId = req.params.id;

  if (!driverId)
    return res.status(400).json({ error: 'Thiếu driverId' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.bookings.findUnique({
        where: { id: BigInt(bookingId) },
        include: {
          booking_seats: true,
          trips: true,
          payments: { where: { gateway: 'CASH', status: 'PENDING' } },
        },
      });

      if (!booking)
        throw new Error('BOOKING_NOT_FOUND');
      if (booking.status !== 'PENDING' || booking.payment_method !== 'CASH')
        throw new Error('NOT_CASH_PENDING');
      if (!booking.payments.length)
        throw new Error('PAYMENT_NOT_FOUND');
      if (Number(booking.trips.assigned_driver_id) !== Number(driverId))
        throw new Error('FORBIDDEN');

      const payment = booking.payments[0];

      await tx.payments.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', paid_at: new Date() },
      });

      const { tickets, loyaltyTier, totalTickets } = await confirmBookingAndIssueTickets(tx, {
        booking: { ...booking, payment_method: 'CASH' },
        userId: booking.user_id,
      });

      return {
        bookingId: Number(booking.id),
        userId: Number(booking.user_id),
        tickets,
        loyaltyTier,
        totalTickets,
      };
    });

    res.json({
      success: true,
      bookingId: result.bookingId,
      status: 'CONFIRMED',
      loyaltyTier: result.loyaltyTier,
      totalTickets: result.totalTickets,
      tickets: result.tickets.map(t => ({
        id: Number(t.id),
        qrCode: t.qr_code,
        status: t.status,
      })),
    });
  } catch (e) {
    if (e.message === 'BOOKING_NOT_FOUND')
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
    if (e.message === 'NOT_CASH_PENDING')
      return res.status(400).json({ error: 'Đơn không ở trạng thái chờ xác nhận tiền mặt' });
    if (e.message === 'PAYMENT_NOT_FOUND')
      return res.status(404).json({ error: 'Không tìm thấy giao dịch tiền mặt' });
    if (e.message === 'FORBIDDEN')
      return res.status(403).json({ error: 'Bạn không được phân công chuyến này' });
    if (e.message === 'PASSENGERS_MISSING')
      return res.status(400).json({ error: 'Thiếu thông tin hành khách' });

    console.error('Confirm cash error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

router.get('/trips', getDriverTrips);
router.get('/trips/:tripId/manifest', getDriverManifest);
router.put('/bookings/:id/confirm-cash', confirmCash);

module.exports = router;
module.exports.getDriverTrips = getDriverTrips;
module.exports.getDriverManifest = getDriverManifest;
module.exports.confirmCash = confirmCash;
