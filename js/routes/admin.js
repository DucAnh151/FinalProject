const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getDriverTrips, getDriverManifest } = require('./driver');

const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/trips
// ─────────────────────────────────────────────────────────────────────────────
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
      take: 100
    })

    res.json(trips.map(t => ({
      id:                 Number(t.id),
      origin:             t.routes.provinces_routes_origin_province_idToprovinces.name,
      destination:        t.routes.provinces_routes_destination_province_idToprovinces.name,
      operator:           t.operators.name,
      vehicleType:        t.vehicles.vehicle_types.name,
      departureTime:      t.departure_time,
      arrivalTime:        t.arrival_time,
      price:              t.price_override ?? t.routes.base_price,
      status:             t.status,
      assignedDriverId:   t.assigned_driver_id ? Number(t.assigned_driver_id) : null,
      assignedDriverName: t.users?.full_name || null,
      routeId:            t.route_id,
      vehicleId:          t.vehicle_id,
      operatorId:         t.operator_id,
      priceOverride:      t.price_override,
    })))
  } catch (e) {
    console.error('Admin trips error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await prisma.bookings.findMany({
      include: {
        users: true,
        trips: {
          include: {
            operators: true,
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
      take: 200
    })

    res.json(bookings.map(b => ({
      id:           Number(b.id),
      userName:     b.users.full_name,
      origin:       b.trips.routes.provinces_routes_origin_province_idToprovinces.name,
      destination:  b.trips.routes.provinces_routes_destination_province_idToprovinces.name,
      operatorId:   b.trips.operator_id,
      operatorName: b.trips.operators.name,
      totalAmount:  Number(b.total_amount),
      status:       b.status,
      createdAt:    b.created_at,
    })))
  } catch (e) {
    console.error('Admin bookings error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query
    const users = await prisma.users.findMany({
      where: role ? { role } : undefined,
      orderBy: { created_at: 'desc' }
    })

    res.json(users.map(u => ({
      id:            Number(u.id),
      fullName:      u.full_name,
      email:         u.email,
      phone:         u.phone_number,
      role:          u.role,
      isActive:      u.is_active,
      createdAt:     u.created_at,
      walletBalance: Number(u.wallet_balance || 0),
      loyaltyTier:   u.loyalty_tier || 'STANDARD',
    })))
  } catch (e) {
    console.error('Admin users error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/payments
// ─────────────────────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

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

    const totalRevenueResult = await prisma.payments.aggregate({
      where: { status: 'SUCCESS' },
      _sum:  { amount: true },
      _count: { id: true },
    })

    const bookingCounts = await prisma.bookings.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const bookingMap = {}
    bookingCounts.forEach(b => { bookingMap[b.status] = b._count.id })
    const totalBookings = Object.values(bookingMap).reduce((a, b) => a + b, 0)

    res.json({
      revenueByDay: revenueRaw.map(r => ({
        day:     r.day,
        revenue: Number(r.revenue),
        count:   Number(r.count),
      })),
      summary: {
        totalRevenue:      Number(totalRevenueResult._sum.amount || 0),
        successCount:      totalRevenueResult._count.id,
        totalBookings,
        confirmedBookings: bookingMap['CONFIRMED']  || 0,
        pendingBookings:   bookingMap['PENDING']     || 0,
        cancelledBookings: bookingMap['CANCELLED']  || 0,
        completedBookings: bookingMap['COMPLETED']  || 0,
      },
    })
  } catch (e) {
    console.error('Admin stats error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Driver aliases
// ─────────────────────────────────────────────────────────────────────────────
router.get('/driver-trips', getDriverTrips);
router.get('/driver-manifest/:tripId', getDriverManifest);

// ─────────────────────────────────────────────────────────────────────────────
// OPERATORS CRUD
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/operators — Tất cả nhà xe với số liệu
router.get('/operators', async (req, res) => {
  try {
    const operators = await prisma.operators.findMany({
      include: {
        _count: { select: { trips: true, vehicles: true } }
      },
      orderBy: { name: 'asc' }
    })
    res.json(operators.map(o => ({
      id:           o.id,
      name:         o.name,
      hotline:      o.hotline,
      isActive:     o.is_active,
      rating:       o.rating ? Number(o.rating) : null,
      description:  o.description,
      tripCount:    o._count.trips,
      vehicleCount: o._count.vehicles,
    })))
  } catch (e) {
    console.error('Admin operators error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/operators/:id — Chi tiết nhà xe (xe + chuyến gần nhất)
router.get('/operators/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const [vehicles, trips] = await Promise.all([
      prisma.vehicles.findMany({
        where: { operator_id: id },
        include: { vehicle_types: true },
        orderBy: { id: 'asc' }
      }),
      prisma.trips.findMany({
        where: { operator_id: id },
        include: {
          routes: {
            include: {
              provinces_routes_origin_province_idToprovinces:      true,
              provinces_routes_destination_province_idToprovinces: true,
            }
          },
          users: { select: { id: true, full_name: true } }
        },
        orderBy: { departure_time: 'desc' },
        take: 30
      })
    ])

    res.json({
      vehicles: vehicles.map(v => ({
        id:           v.id,
        name:         v.name || v.license_plate,
        licensePlate: v.license_plate,
        vehicleType:  v.vehicle_types.name,
        totalSeats:   v.vehicle_types.total_seats,
      })),
      trips: trips.map(t => ({
        id:                 Number(t.id),
        origin:             t.routes.provinces_routes_origin_province_idToprovinces.name,
        destination:        t.routes.provinces_routes_destination_province_idToprovinces.name,
        departureTime:      t.departure_time,
        price:              t.price_override ?? t.routes.base_price,
        status:             t.status,
        assignedDriverId:   t.assigned_driver_id ? Number(t.assigned_driver_id) : null,
        assignedDriverName: t.users?.full_name || null,
      }))
    })
  } catch (e) {
    console.error('Admin operator detail error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// POST /api/admin/operators — Tạo nhà xe
router.post('/operators', async (req, res) => {
  const { name, hotline, description } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Tên nhà xe là bắt buộc' })
  try {
    const op = await prisma.operators.create({
      data: { name: name.trim(), hotline: hotline || null, description: description || null, is_active: true }
    })
    res.status(201).json({
      id: op.id, name: op.name, hotline: op.hotline,
      isActive: op.is_active, rating: null, description: op.description,
      tripCount: 0, vehicleCount: 0,
    })
  } catch (e) {
    console.error('Admin create operator error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/admin/operators/:id — Cập nhật nhà xe
router.put('/operators/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name, hotline, description, isActive } = req.body
  try {
    const op = await prisma.operators.update({
      where: { id },
      data: {
        ...(name       !== undefined && { name }),
        ...(hotline    !== undefined && { hotline }),
        ...(description !== undefined && { description }),
        ...(isActive   !== undefined && { is_active: isActive }),
      }
    })
    res.json({ success: true, id: op.id, name: op.name, hotline: op.hotline,
      isActive: op.is_active, rating: Number(op.rating), description: op.description })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN dành cho form tạo/sửa chuyến
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await prisma.routes.findMany({
      include: {
        provinces_routes_origin_province_idToprovinces:      true,
        provinces_routes_destination_province_idToprovinces: true,
      },
      orderBy: { id: 'asc' }
    })
    res.json(routes.map(r => ({
      id:              r.id,
      origin:          r.provinces_routes_origin_province_idToprovinces.name,
      destination:     r.provinces_routes_destination_province_idToprovinces.name,
      basePrice:       r.base_price,
      durationMinutes: r.duration_minutes,
    })))
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicles.findMany({
      include: { vehicle_types: true, operators: true },
      orderBy: { id: 'asc' }
    })
    res.json(vehicles.map(v => ({
      id:           v.id,
      name:         v.name || v.license_plate,
      licensePlate: v.license_plate,
      vehicleType:  v.vehicle_types.name,
      vehicleTypeId: v.vehicle_type_id,
      totalSeats:   v.vehicle_types.total_seats,
      operatorId:   v.operator_id,
      operatorName: v.operators.name,
    })))
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// GET /api/admin/vehicle-types — Danh sách loại xe
router.get('/vehicle-types', async (req, res) => {
  try {
    const types = await prisma.vehicle_types.findMany({ orderBy: { name: 'asc' } })
    res.json(types.map(t => ({
      id:         t.id,
      name:       t.name,
      totalSeats: t.total_seats,
      floors:     t.floors,
    })))
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' })
  }
})

// POST /api/admin/vehicle-types — Tạo loại xe mới
router.post('/vehicle-types', async (req, res) => {
  const { name, totalSeats = 16, floors = 1 } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Tên loại xe là bắt buộc' })
  try {
    const existing = await prisma.vehicle_types.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } }
    })
    if (existing) {
      return res.json({
        id: existing.id,
        name: existing.name,
        totalSeats: existing.total_seats,
        floors: existing.floors,
      })
    }
    const vt = await prisma.vehicle_types.create({
      data: {
        name: name.trim(),
        total_seats: parseInt(totalSeats),
        floors: parseInt(floors),
        seat_layout_json: {
          floors: parseInt(floors),
          floor_1: { rows: Math.ceil(totalSeats / 2), cols: 2, aisle_after_col: 1 }
        }
      }
    })
    res.status(201).json({
      id: vt.id,
      name: vt.name,
      totalSeats: vt.total_seats,
      floors: vt.floors,
    })
  } catch (e) {
    console.error('Create vehicle type error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/vehicles — Thêm xe mới cho nhà xe
router.post('/vehicles', async (req, res) => {
  const { operatorId, vehicleTypeId, licensePlate, name } = req.body
  if (!operatorId || !vehicleTypeId || !licensePlate?.trim())
    return res.status(400).json({ error: 'operatorId, vehicleTypeId, licensePlate là bắt buộc' })
  try {
    const vehicle = await prisma.vehicles.create({
      data: {
        operator_id:     parseInt(operatorId),
        vehicle_type_id: parseInt(vehicleTypeId),
        license_plate:   licensePlate.trim().toUpperCase(),
        name:            name?.trim() || null,
      },
      include: { vehicle_types: true, operators: true }
    })

    // Tự động tạo ghế cho xe mới
    const totalSeats = vehicle.vehicle_types.total_seats
    const floors     = vehicle.vehicle_types.floors
    const seatsPerFloor = Math.ceil(totalSeats / floors)
    const rows       = Math.ceil(seatsPerFloor / 2)
    const colNames   = ['A', 'B']

    const seatsData = []
    for (let floor = 1; floor <= floors; floor++) {
      for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= 2; col++) {
          const seatNum = (floor - 1) * seatsPerFloor + (row - 1) * 2 + col
          if (seatNum > totalSeats) break
          seatsData.push({
            vehicle_id:   vehicle.id,
            seat_name:    `${floor}-${colNames[col-1]}${row}`,
            floor_number: floor,
            row_number:   row,
            col_number:   col,
          })
        }
      }
    }

    await prisma.seats.createMany({ data: seatsData })

    res.status(201).json({
      id:           vehicle.id,
      name:         vehicle.name || vehicle.license_plate,
      licensePlate: vehicle.license_plate,
      vehicleType:  vehicle.vehicle_types.name,
      vehicleTypeId: vehicle.vehicle_type_id,
      totalSeats:   vehicle.vehicle_types.total_seats,
      operatorId:   vehicle.operator_id,
      operatorName: vehicle.operators.name,
    })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: `Biển số ${licensePlate} đã tồn tại trong hệ thống` })
    console.error('Admin create vehicle error:', e)
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/admin/vehicles/:id — Xóa xe (khi xe chưa có chuyến nào)
router.delete('/vehicles/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const tripCount = await prisma.trips.count({ where: { vehicle_id: id } })
    if (tripCount > 0)
      return res.status(409).json({ error: `Không thể xóa: xe đã gắn với ${tripCount} chuyến.` })
    // Xóa seats trước
    await prisma.seats.deleteMany({ where: { vehicle_id: id } })
    await prisma.vehicles.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    console.error('Admin delete vehicle error:', e)
    res.status(500).json({ error: e.message })
  }
})



// ─────────────────────────────────────────────────────────────────────────────
// TRIPS CRUD
// ─────────────────────────────────────────────────────────────────────────────

const _tripInclude = {
  routes: {
    include: {
      provinces_routes_origin_province_idToprovinces:      true,
      provinces_routes_destination_province_idToprovinces: true,
    }
  },
  operators: true,
  vehicles:  { include: { vehicle_types: true } },
  users:     { select: { id: true, full_name: true } }
}

function _mapTrip(t) {
  return {
    id:                 Number(t.id),
    origin:             t.routes.provinces_routes_origin_province_idToprovinces.name,
    destination:        t.routes.provinces_routes_destination_province_idToprovinces.name,
    operator:           t.operators.name,
    vehicleType:        t.vehicles.vehicle_types.name,
    departureTime:      t.departure_time,
    arrivalTime:        t.arrival_time,
    price:              t.price_override ?? t.routes.base_price,
    status:             t.status,
    assignedDriverId:   t.assigned_driver_id ? Number(t.assigned_driver_id) : null,
    assignedDriverName: t.users?.full_name || null,
    routeId:            t.route_id,
    vehicleId:          t.vehicle_id,
    operatorId:         t.operator_id,
    priceOverride:      t.price_override,
  }
}

// POST /api/admin/trips
router.post('/trips', async (req, res) => {
  const { routeId, vehicleId, operatorId, departureTime, arrivalTime, priceOverride } = req.body
  if (!routeId || !vehicleId || !operatorId || !departureTime || !arrivalTime)
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' })
  try {
    const trip = await prisma.trips.create({
      data: {
        route_id:       parseInt(routeId),
        vehicle_id:     parseInt(vehicleId),
        operator_id:    parseInt(operatorId),
        departure_time: new Date(departureTime),
        arrival_time:   new Date(arrivalTime),
        price_override: priceOverride ? parseInt(priceOverride) : null,
        status: 'OPEN',
      },
      include: _tripInclude
    })
    res.status(201).json(_mapTrip(trip))
  } catch (e) {
    console.error('Admin create trip error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/admin/trips/:id
router.put('/trips/:id', async (req, res) => {
  const { assignedDriverId, status, priceOverride, routeId, vehicleId, operatorId, departureTime, arrivalTime } = req.body
  try {
    const trip = await prisma.trips.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(assignedDriverId !== undefined && {
          assigned_driver_id: assignedDriverId ? BigInt(assignedDriverId) : null
        }),
        ...(status        && { status }),
        ...(priceOverride !== undefined && { price_override: priceOverride !== null ? parseInt(priceOverride) : null }),
        ...(routeId       && { route_id:    parseInt(routeId) }),
        ...(vehicleId     && { vehicle_id:  parseInt(vehicleId) }),
        ...(operatorId    && { operator_id: parseInt(operatorId) }),
        ...(departureTime && { departure_time: new Date(departureTime) }),
        ...(arrivalTime   && { arrival_time:   new Date(arrivalTime) }),
      },
      include: _tripInclude
    })
    res.json({ success: true, ..._mapTrip(trip) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/admin/trips/:id
router.delete('/trips/:id', async (req, res) => {
  const tripId = BigInt(req.params.id)
  try {
    const bookingCount = await prisma.bookings.count({ where: { trip_id: tripId } })
    if (bookingCount > 0) {
      return res.status(409).json({
        error: `Không thể xóa: chuyến này đã có ${bookingCount} đơn đặt vé. Hãy đóng chuyến thay vì xóa.`
      })
    }
    // Xóa theo thứ tự FK: reviews → trip_seat_status → trips
    await prisma.reviews.deleteMany({ where: { trip_id: tripId } })
    await prisma.trip_seat_status.deleteMany({ where: { trip_id: tripId } })
    await prisma.trips.delete({ where: { id: tripId } })
    res.json({ success: true })
  } catch (e) {
    console.error('Admin delete trip error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// USERS CRUD
// ─────────────────────────────────────────────────────────────────────────────
const bcrypt = require('bcrypt')

// POST /api/admin/users — Tạo tài khoản mới
router.post('/users', async (req, res) => {
  const { fullName, phone, email, password, role = 'CUSTOMER' } = req.body
  if (!fullName?.trim()) return res.status(400).json({ error: 'Họ tên là bắt buộc' })
  if (!phone && !email) return res.status(400).json({ error: 'Cần SĐT hoặc email' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' })
  if (!['CUSTOMER','DRIVER'].includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' })
  try {
    const existing = await prisma.users.findFirst({
      where: { OR: [phone ? { phone_number: phone } : undefined, email ? { email } : undefined].filter(Boolean) }
    })
    if (existing) return res.status(409).json({ error: 'SĐT hoặc email đã tồn tại' })
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.users.create({
      data: { full_name: fullName.trim(), phone_number: phone || null, email: email || null, password_hash: hash, role, is_active: true }
    })
    res.status(201).json({ id: Number(user.id), fullName: user.full_name, email: user.email, phone: user.phone_number, role: user.role, isActive: user.is_active, createdAt: user.created_at })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/admin/users/:id — Sửa thông tin
router.put('/users/:id', async (req, res) => {
  const { fullName, phone, email, isActive } = req.body
  try {
    const user = await prisma.users.update({
      where: { id: BigInt(req.params.id) },
      data: {
        ...(fullName !== undefined && { full_name: fullName }),
        ...(phone !== undefined && { phone_number: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(isActive !== undefined && { is_active: isActive }),
      }
    })
    res.json({ id: Number(user.id), fullName: user.full_name, email: user.email, phone: user.phone_number, role: user.role, isActive: user.is_active })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/admin/users/:id/role — Phân quyền
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body
  if (!['CUSTOMER','DRIVER'].includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' })
  try {
    const user = await prisma.users.update({ where: { id: BigInt(req.params.id) }, data: { role } })
    res.json({ id: Number(user.id), role: user.role })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/admin/users/:id/topup — Nạp tiền hộ
router.post('/users/:id/topup', async (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Số tiền không hợp lệ' })
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({ where: { id: BigInt(req.params.id) } })
      if (!user) throw new Error('USER_NOT_FOUND')
      const newBalance = BigInt(user.wallet_balance || 0) + BigInt(amount)
      const updated = await tx.users.update({ where: { id: user.id }, data: { wallet_balance: newBalance } })
      await tx.wallet_transactions.create({ data: { user_id: user.id, type: 'TOPUP', amount: BigInt(amount), balance_after: newBalance, description: 'Admin nạp hộ' } })
      return updated
    })
    res.json({ walletBalance: Number(result.wallet_balance) })
  } catch (e) {
    if (e.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'Không tìm thấy user' })
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/admin/users/:id/vip — Nâng VIP thủ công
router.put('/users/:id/vip', async (req, res) => {
  try {
    const user = await prisma.users.update({ where: { id: BigInt(req.params.id) }, data: { loyalty_tier: 'VIP_CUSTOMER' } })
    res.json({ id: Number(user.id), loyaltyTier: user.loyalty_tier })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/admin/users/:id — Xóa tài khoản CUSTOMER
router.delete('/users/:id', async (req, res) => {
  try {
    const target = await prisma.users.findUnique({ where: { id: BigInt(req.params.id) } })
    if (!target) return res.status(404).json({ error: 'Không tìm thấy user' })
    if (target.role === 'ADMIN') return res.status(403).json({ error: 'Không thể xóa tài khoản ADMIN' })
    if (target.role !== 'CUSTOMER') return res.status(400).json({ error: 'Chỉ có thể xóa tài khoản CUSTOMER' })

    const activeBookings = await prisma.bookings.count({
      where: { user_id: BigInt(req.params.id), status: { in: ['PENDING', 'CONFIRMED', 'CASH_PENDING'] } }
    })
    if (activeBookings > 0)
      return res.status(409).json({ error: `Không thể xóa: user còn ${activeBookings} đơn đặt vé đang hoạt động` })

    await prisma.$transaction(async (tx) => {
      const userId = BigInt(req.params.id)
      // Xóa theo thứ tự FK
      await tx.notifications.deleteMany({ where: { user_id: userId } })
      await tx.wallet_transactions.deleteMany({ where: { user_id: userId } })
      await tx.reviews.deleteMany({ where: { user_id: userId } })
      await tx.trip_seat_status.deleteMany({ where: { locked_by_user_id: userId } })
      // Xóa tickets → booking_seats → payments → refunds → bookings
      const bookings = await tx.bookings.findMany({ where: { user_id: userId }, select: { id: true } })
      const bookingIds = bookings.map(b => b.id)
      if (bookingIds.length) {
        await tx.tickets.deleteMany({ where: { booking_id: { in: bookingIds } } })
        await tx.booking_seats.deleteMany({ where: { booking_id: { in: bookingIds } } })
        const payments = await tx.payments.findMany({ where: { booking_id: { in: bookingIds } }, select: { id: true } })
        await tx.refunds.deleteMany({ where: { payment_id: { in: payments.map(p => p.id) } } })
        await tx.payments.deleteMany({ where: { booking_id: { in: bookingIds } } })
        await tx.bookings.deleteMany({ where: { user_id: userId } })
      }
      await tx.users.delete({ where: { id: userId } })
    })

    res.json({ success: true, message: 'Đã xóa tài khoản thành công' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router;