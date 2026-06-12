const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getDriverTrips, getDriverManifest } = require('./driver');

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
        vehicles:  { include: { vehicle_types: true } },
        users:     { select: { id: true, full_name: true } }
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
      price:              t.price_override ?? t.routes.base_price,
      status:             t.status,
      assignedDriverId:   t.assigned_driver_id ? Number(t.assigned_driver_id) : null,
      assignedDriverName: t.users?.full_name || null,
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
    const { role } = req.query
    const users = await prisma.users.findMany({
      where: role ? { role } : undefined,
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
// Driver aliases (backward compat) — logic in /api/driver/*
// ─────────────────────────────────────────────────────────────────────────────
router.get('/driver-trips', getDriverTrips);
router.get('/driver-manifest/:tripId', getDriverManifest);

router.put('/trips/:id', async (req, res) => {
  const { assignedDriverId, status, priceOverride } = req.body
  try {
    const trip = await prisma.trips.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(assignedDriverId !== undefined && {
          assigned_driver_id: assignedDriverId ? BigInt(assignedDriverId) : null
        }),
        ...(status && { status }),
        ...(priceOverride !== undefined && { price_override: priceOverride }),
      }
    })
    res.json({ success: true, id: Number(trip.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router;