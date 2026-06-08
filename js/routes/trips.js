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

    const trips = await prisma.trips.findMany({
      where: {
        status: 'OPEN',
        departure_time: { gte: start, lt: end },
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

module.exports = router;