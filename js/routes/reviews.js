const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/reviews
router.post('/', async (req, res) => {
  const { tripId, userId, bookingId, rating, comment } = req.body;

  if (!tripId || !userId || !bookingId || !rating)
    return res.status(400).json({ error: 'Thiếu thông tin đánh giá' });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao' });

  try {
    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(bookingId) },
      include: { trips: true },
    });

    if (!booking)
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
    if (Number(booking.user_id) !== Number(userId))
      return res.status(403).json({ error: 'Bạn không có quyền đánh giá đơn này' });
    if (booking.status !== 'COMPLETED' || booking.trips.status !== 'COMPLETED')
      return res.status(400).json({ error: 'Chỉ có thể đánh giá sau khi hoàn thành chuyến' });

    const existing = await prisma.reviews.findUnique({
      where: { booking_id_user_id: { booking_id: BigInt(bookingId), user_id: BigInt(userId) } },
    });
    if (existing)
      return res.status(409).json({ error: 'Bạn đã đánh giá chuyến này rồi' });

    const review = await prisma.reviews.create({
      data: {
        trip_id:    BigInt(tripId),
        user_id:    BigInt(userId),
        booking_id: BigInt(bookingId),
        rating:     parseInt(rating),
        comment:    comment || null,
      },
    });

    res.status(201).json({
      success: true,
      review: { id: Number(review.id), rating: review.rating, comment: review.comment },
    });
  } catch (e) {
    console.error('Create review error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;