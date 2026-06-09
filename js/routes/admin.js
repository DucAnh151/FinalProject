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

module.exports = router