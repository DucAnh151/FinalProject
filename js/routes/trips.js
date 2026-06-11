const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/trips/search?originId=1&destinationId=3&departureDate=2026-06-10
router.get('/search', async (req, res) => {
  const { originId, destinationId, departureDate } = req.query;

  if (!originId || !destinationId || !departureDate)
    return res.status(400).json({ error: 'Thiếu thông tin tìm kiếm' });

  try {
    // Ngày bắt đầu và kết thúc
    const start = new Date(departureDate);
    const end   = new Date(departureDate);
    end.setDate(end.getDate() + 1);

    // BR-06: không hiển thị chuyến khởi hành trong vòng 60 phút tới
    const minDeparture = new Date(Date.now() + 60 * 60 * 1000);
    const searchFrom = start > minDeparture ? start : minDeparture;

    const trips = await prisma.trips.findMany({
      where: {
        status: 'OPEN',
        departure_time: { gte: searchFrom, lt: end },
        routes: {
          origin_province_id:      parseInt(originId),
          destination_province_id: parseInt(destinationId),
        }
      },
      include: {
        routes: {
          include: {
            provinces_routes_origin_province_idToprovinces:      true,
            provinces_routes_destination_province_idToprovinces: true,
          }
        },
        operators:     true,
        vehicles: {
          include: { vehicle_types: true }
        },
      },
      orderBy: { departure_time: 'asc' }
    });

    const result = trips.map(t => ({
      id:            Number(t.id),
      departureTime: t.departure_time,
      arrivalTime:   t.arrival_time,
      price:         t.price_override ?? t.routes.base_price,
      status:        t.status,
      origin:        t.routes.provinces_routes_origin_province_idToprovinces.name,
      destination:   t.routes.provinces_routes_destination_province_idToprovinces.name,
      operator:      t.operators.name,
      vehicleType:   t.vehicles.vehicle_types.name,
      totalSeats:    t.vehicles.vehicle_types.total_seats,
    }));

    res.json({ total: result.length, trips: result });

  } catch (e) {
    console.error('Trip search error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/trips/provinces — dropdown tìm kiếm
router.get('/provinces', async (req, res) => {
  try {
    const provinces = await prisma.provinces.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(provinces.map(p => ({ id: Number(p.id), name: p.name, slug: p.slug })));
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/trips/:id/seat-map
router.get('/:id/seat-map', async (req, res) => {
  const tripId = parseInt(req.params.id);

  try {
    // Lấy thông tin chuyến + xe + loại xe
    const trip = await prisma.trips.findUnique({
      where: { id: tripId },
      include: {
        vehicles: {
          include: { vehicle_types: true }
        }
      }
    });

    if (!trip)
      return res.status(404).json({ error: 'Không tìm thấy chuyến xe' });

    // Lấy tất cả ghế của xe
    const seats = await prisma.seats.findMany({
      where: { vehicle_id: trip.vehicle_id },
      orderBy: [{ floor_number: 'asc' }, { row_number: 'asc' }, { col_number: 'asc' }]
    });

    // Lấy trạng thái ghế của chuyến này
    const seatStatuses = await prisma.trip_seat_status.findMany({
      where: { trip_id: tripId }
    });

    // Map trạng thái vào từng ghế
    const statusMap = {};
    seatStatuses.forEach(s => {
      statusMap[Number(s.seat_id)] = {
        status:      s.status,
        lockedUntil: s.locked_until,
      };
    });

    const seatList = seats.map(s => ({
      seatId:      Number(s.id),
      seatName:    s.seat_name,
      floor:       s.floor_number,
      row:         s.row_number,
      col:         s.col_number,
      status:      statusMap[Number(s.id)]?.status ?? 'AVAILABLE',
      lockedUntil: statusMap[Number(s.id)]?.lockedUntil ?? null,
    }));

    res.json({
      tripId:      Number(trip.id),
      vehicleType: trip.vehicles.vehicle_types.name,
      layout:      trip.vehicles.vehicle_types.seat_layout_json,
      totalSeats:  trip.vehicles.vehicle_types.total_seats,
      seats:       seatList,
    });

  } catch (e) {
    console.error('Seat map error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/trips/:id/stops — lấy điểm đón/trả của chuyến
router.get('/:id/stops', async (req, res) => {
  const tripId = parseInt(req.params.id)

  try {
    const trip = await prisma.trips.findUnique({
      where: { id: tripId },
      include: {
        routes: {
          include: { route_stops: { orderBy: { stop_order: 'asc' } } }
        }
      }
    })

    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến xe' })

    const stops = trip.routes.route_stops.map(s => ({
      id:       s.id,
      name:     s.stop_name,
      order:    s.stop_order,
      type:     s.stop_type,
      offsetMinutes: s.offset_minutes,
    }))

    res.json({ tripId, stops })
  } catch (e) {
    console.error('Stops error:', e)
    res.status(500).json({ error: 'Lỗi server' })
  }
})

module.exports = router;