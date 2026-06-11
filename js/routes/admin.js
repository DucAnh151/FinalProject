const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/trips
router.get('/trips', async (req, res) => {
  try {
    const trips = await prisma.trips.findMany({
      include: {
        routes: {
          include: {
            provinces_routes_origin_province_idToprovinces:      true,
            provinces_routes_destination_province_idToprovinces: true,
          }
        },
        operators: true,
        vehicles:  { include: { vehicle_types: true } }
      },
      orderBy: { departure_time: 'desc' },
      take: 50
    })

    res.json(trips.map(t => ({
      id:            Number(t.id),
      origin:        t.routes.provinces_routes_origin_province_idToprovinces.name,
      destination:   t.routes.provinces_routes_destination_province_idToprovinces.name,
      operator:      t.operators.name,
      vehicleType:   t.vehicles.vehicle_types.name,
      departureTime: t.departure_time,
      arrivalTime:   t.arrival_time,
      price:         t.price_override ?? t.routes.base_price,
      status:        t.status,
    })))
  } catch (e) {
    console.error('Admin trips error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await prisma.bookings.findMany({
      include: {
        users: true,
        trips: {
          include: {
            routes: {
              include: {
                provinces_routes_origin_province_idToprovinces:      true,
                provinces_routes_destination_province_idToprovinces: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    })

    res.json(bookings.map(b => ({
      id:          Number(b.id),
      userName:    b.users.full_name,
      origin:      b.trips.routes.provinces_routes_origin_province_idToprovinces.name,
      destination: b.trips.routes.provinces_routes_destination_province_idToprovinces.name,
      totalAmount: Number(b.total_amount),
      status:      b.status,
      createdAt:   b.created_at,
    })))
  } catch (e) {
    console.error('Admin bookings error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      orderBy: { created_at: 'desc' }
    })

    res.json(users.map(u => ({
      id:        Number(u.id),
      fullName:  u.full_name,
      email:     u.email,
      phone:     u.phone_number,
      role:      u.role,
      isActive:  u.is_active,
      createdAt: u.created_at,
    })))
  } catch (e) {
    console.error('Admin users error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await prisma.payments.findMany({
      orderBy: { id: 'desc' },
      take: 100
    })

    res.json(payments.map(p => ({
      id:        Number(p.id),
      bookingId: Number(p.booking_id),
      gateway:   p.gateway,
      amount:    Number(p.amount),
      status:    p.status,
      paidAt:    p.paid_at,
    })))
  } catch (e) {
    console.error('Admin payments error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Thống kê doanh thu 30 ngày gần nhất + summary booking status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Doanh thu theo ngày (chỉ payment SUCCESS trong 30 ngày)
    const revenueRaw = await prisma.$queryRaw`
      SELECT
        DATE(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
        SUM(amount)::BIGINT                           AS revenue,
        COUNT(*)::INT                                 AS count
      FROM payments
      WHERE status = 'SUCCESS'
        AND paid_at >= ${thirtyDaysAgo}
      GROUP BY day
      ORDER BY day ASC
    `

    // Tổng doanh thu tất cả thời gian
    const totalRevenueResult = await prisma.payments.aggregate({
      where: { status: 'SUCCESS' },
      _sum:  { amount: true },
      _count: { id: true },
    })

    // Booking summary theo status
    const bookingCounts = await prisma.bookings.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const bookingMap = {}
    bookingCounts.forEach(b => {
      bookingMap[b.status] = b._count.id
    })

    const totalBookings = Object.values(bookingMap).reduce((a, b) => a + b, 0)

    res.json({
      revenueByDay: revenueRaw.map(r => ({
        day:     r.day,
        revenue: Number(r.revenue),
        count:   Number(r.count),
      })),
      summary: {
        totalRevenue:       Number(totalRevenueResult._sum.amount || 0),
        successCount:       totalRevenueResult._count.id,
        totalBookings,
        confirmedBookings:  bookingMap['CONFIRMED']  || 0,
        pendingBookings:    bookingMap['PENDING']     || 0,
        cancelledBookings:  bookingMap['CANCELLED']  || 0,
        completedBookings:  bookingMap['COMPLETED']  || 0,
      },
    })
  } catch (e) {
    console.error('Admin stats error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/driver-trips?driverId=xxx
// Danh sách chuyến xe được phân công cho driver
// ─────────────────────────────────────────────────────────────────────────────
router.get('/driver-trips', async (req, res) => {
  const { driverId } = req.query
  if (!driverId) return res.status(400).json({ error: 'Thiếu driverId' })

  try {
    const trips = await prisma.trips.findMany({
      where: { assigned_driver_id: BigInt(driverId) },
      include: {
        routes: {
          include: {
            provinces_routes_origin_province_idToprovinces:      true,
            provinces_routes_destination_province_idToprovinces: true,
          }
        },
        operators: true,
        vehicles:  { include: { vehicle_types: true } },
        // Đếm số hành khách CONFIRMED
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CASH_PENDING'] } },
          include: { booking_seats: true },
        },
      },
      orderBy: { departure_time: 'asc' },
    })

    res.json(trips.map(t => {
      const passengerCount = t.bookings.reduce(
        (sum, b) => sum + b.booking_seats.length, 0
      )
      return {
        id:             Number(t.id),
        origin:         t.routes.provinces_routes_origin_province_idToprovinces.name,
        destination:    t.routes.provinces_routes_destination_province_idToprovinces.name,
        operator:       t.operators.name,
        vehicleType:    t.vehicles.vehicle_types.name,
        departureTime:  t.departure_time,
        arrivalTime:    t.arrival_time,
        status:         t.status,
        passengerCount,
      }
    }))
  } catch (e) {
    console.error('Driver trips error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/driver-manifest/:tripId
// Danh sách hành khách (manifest) của một chuyến xe
// ─────────────────────────────────────────────────────────────────────────────
router.get('/driver-manifest/:tripId', async (req, res) => {
  const tripId = parseInt(req.params.tripId)
  if (!tripId) return res.status(400).json({ error: 'tripId không hợp lệ' })

  try {
    const bookings = await prisma.bookings.findMany({
      where: {
        trip_id: BigInt(tripId),
        status:  { in: ['CONFIRMED', 'CASH_PENDING'] },
      },
      include: {
        booking_seats: {
          include: { seats: true }
        },
        tickets: true,
        route_stops_bookings_pickup_stop_idToroute_stops:  true,
        route_stops_bookings_dropoff_stop_idToroute_stops: true,
      },
    })

    const manifest = []

    bookings.forEach(b => {
      b.booking_seats.forEach(bs => {
        // Tìm ticket tương ứng với booking_seat này
        const ticket = b.tickets.find(
          t => Number(t.booking_seat_id) === Number(bs.id)
        )
        manifest.push({
          bookingId:      Number(b.id),
          passengerName:  bs.passenger_name,
          passengerPhone: bs.passenger_phone,
          seatName:       bs.seats.seat_name,
          floor:          bs.seats.floor_number,
          pickupStop:     b.route_stops_bookings_pickup_stop_idToroute_stops?.stop_name  || '—',
          dropoffStop:    b.route_stops_bookings_dropoff_stop_idToroute_stops?.stop_name || '—',
          qrCode:         ticket?.qr_code   || null,
          ticketStatus:   ticket?.status     || null,
          ticketId:       ticket ? Number(ticket.id) : null,
        })
      })
    })

    // Sắp xếp theo tầng rồi tên ghế
    manifest.sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor
      return a.seatName.localeCompare(b.seatName)
    })

    res.json({ tripId, manifest })
  } catch (e) {
    console.error('Driver manifest error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

module.exports = router