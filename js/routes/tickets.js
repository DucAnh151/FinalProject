const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/tickets/check-in
router.post('/check-in', async (req, res) => {
  const { qrCode, driverId } = req.body
  if (!qrCode) return res.status(400).json({ error: 'Thiếu mã QR' })

  try {
    const ticket = await prisma.tickets.findUnique({
      where: { qr_code: qrCode },
      include: {
        bookings: {
          include: {
            trips: {
              include: {
                routes: {
                  include: {
                    provinces_routes_origin_province_idToprovinces: true,
                    provinces_routes_destination_province_idToprovinces: true,
                  }
                }
              }
            }
          }
        },
        booking_seats: {
          include: { seats: true }
        }
      }
    })

    if (!ticket)
      return res.status(404).json({ error: 'Mã QR không tồn tại' })
    if (ticket.status === 'USED')
      return res.status(400).json({ error: 'Vé đã được sử dụng' })
    if (ticket.status === 'CANCELLED')
      return res.status(400).json({ error: 'Vé đã bị hủy' })

    await prisma.tickets.update({
      where: { id: ticket.id },
      data: {
        status:        'USED',
        checked_in_at: new Date(),
        checked_in_by: driverId ? BigInt(driverId) : null,
      }
    })

    const trip = ticket.bookings.trips
    res.json({
      passengerName:  ticket.booking_seats.passenger_name,
      passengerPhone: ticket.booking_seats.passenger_phone,
      seatName:       ticket.booking_seats.seats.seat_name,
      origin:         trip.routes.provinces_routes_origin_province_idToprovinces.name,
      destination:    trip.routes.provinces_routes_destination_province_idToprovinces.name,
      departureTime:  trip.departure_time,
      qrCode,
    })
  } catch (e) {
    console.error('Check-in error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

module.exports = router;