const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/landing/popular-routes
router.get('/popular-routes', async (req, res) => {
  try {
    const rows = await prisma.popular_routes.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
      include: {
        routes: {
          include: {
            provinces_routes_origin_province_idToprovinces: true,
            provinces_routes_destination_province_idToprovinces: true,
          },
        },
      },
    });

    res.json(rows.map((r) => ({
      id: Number(r.id),
      imageUrl: r.image_url,
      description: r.description,
      origin: r.routes.provinces_routes_origin_province_idToprovinces.name,
      destination: r.routes.provinces_routes_destination_province_idToprovinces.name,
      originId: r.routes.origin_province_id,
      destinationId: r.routes.destination_province_id,
      basePrice: r.routes.base_price,
      routeId: r.route_id,
    })));
  } catch (e) {
    console.error('Popular routes error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/landing/operators
router.get('/operators', async (req, res) => {
  try {
    const operators = await prisma.operators.findMany({
      where: { is_active: true },
      orderBy: [{ rating: 'desc' }, { id: 'asc' }],
      take: 6,
    });

    res.json(operators.map((o) => ({
      id: Number(o.id),
      name: o.name,
      hotline: o.hotline,
      logoUrl: o.logo_url,
      bannerUrl: o.banner_url,
      description: o.description,
      rating: o.rating ? Number(o.rating) : 4.8,
    })));
  } catch (e) {
    console.error('Operators error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/landing/banners
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banners.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
      include: { operators: true },
    });

    res.json(banners.map((b) => ({
      id: Number(b.id),
      title: b.title,
      imageUrl: b.image_url,
      linkUrl: b.link_url,
      operatorId: b.operator_id,
      operator: b.operators?.name,
    })));
  } catch (e) {
    console.error('Banners error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// GET /api/landing/stats
router.get('/stats', async (req, res) => {
  try {
    const [tripCount, operatorCount, userCount] = await Promise.all([
      prisma.trips.count(),
      prisma.operators.count({ where: { is_active: true } }),
      prisma.users.count({ where: { role: 'CUSTOMER' } }),
    ]);

    res.json({
      trips: tripCount,
      operators: operatorCount,
      customers: userCount,
      rating: 4.8,
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
