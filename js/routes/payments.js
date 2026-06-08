const express = require('express');
const bcrypt  = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Sinh OTP 6 số
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/payments/initiate
// Bước 1: Kiểm tra PIN → sinh OTP → lưu vào notifications
router.post('/initiate', async (req, res) => {
  const { bookingId, userId, gateway, pin } = req.body;

  if (!bookingId || !userId || !gateway || !pin)
    return res.status(400).json({ error: 'Thiếu thông tin thanh toán' });

  try {
    // 1. Kiểm tra booking tồn tại và đang PENDING
    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(bookingId) }
    });

    if (!booking)
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
    if (booking.status !== 'PENDING')
      return res.status(400).json({ error: 'Đơn đặt vé không hợp lệ' });
    if (new Date() > booking.expires_at)
      return res.status(400).json({ error: 'Đơn đặt vé đã hết hạn' });

    // 2. Kiểm tra PIN
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) }
    });

    if (!user.payment_pin)
      return res.status(400).json({ error: 'Bạn chưa cài mật khẩu thanh toán' });

    const pinMatch = await bcrypt.compare(pin, user.payment_pin);
    if (!pinMatch)
      return res.status(401).json({ error: 'Mật khẩu thanh toán không đúng' });

    // 3. Tạo payment record
    const payment = await prisma.payments.create({
      data: {
        booking_id: BigInt(bookingId),
        gateway:    gateway,
        amount:     booking.total_amount,
        status:     'PENDING',
      }
    });

    // 4. Sinh OTP và lưu vào notifications (thay cho SMS)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await prisma.notifications.create({
      data: {
        user_id: BigInt(userId),
        type:    'OTP_PAYMENT',
        content: JSON.stringify({
          otp,
          paymentId: Number(payment.id),
          bookingId: Number(bookingId),
          expiry:    otpExpiry,
        }),
        is_read: false,
      }
    });

    res.json({
      success:   true,
      paymentId: Number(payment.id),
      message:   `Mã OTP đã được gửi (môi trường dev: OTP = ${otp})`,
      otp,        // ← chỉ trả về khi dev, production thì bỏ dòng này
    });

  } catch (e) {
    console.error('Payment initiate error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/payments/confirm
// Bước 2: Xác nhận OTP → booking CONFIRMED → sinh ticket
router.post('/confirm', async (req, res) => {
  const { paymentId, userId, otp } = req.body;

  if (!paymentId || !userId || !otp)
    return res.status(400).json({ error: 'Thiếu thông tin xác nhận' });

  try {
    // 1. Tìm OTP trong notifications
    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: BigInt(userId),
        type:    'OTP_PAYMENT',
        is_read: false,
      },
      orderBy: { created_at: 'desc' },
      take: 1,
    });

    if (!notifications.length)
      return res.status(400).json({ error: 'Không tìm thấy OTP' });

    const notif   = notifications[0];
    const payload = JSON.parse(notif.content);

    // 2. Kiểm tra OTP
    if (payload.otp !== otp)
      return res.status(401).json({ error: 'OTP không đúng' });
    if (new Date() > new Date(payload.expiry))
      return res.status(400).json({ error: 'OTP đã hết hạn' });
    if (Number(payload.paymentId) !== Number(paymentId))
      return res.status(400).json({ error: 'OTP không khớp với giao dịch' });

    // 3. Transaction: confirm payment + booking + seats + tạo tickets
    const result = await prisma.$transaction(async (tx) => {

      // Cập nhật payment → SUCCESS
      await tx.payments.update({
        where: { id: BigInt(paymentId) },
        data:  { status: 'SUCCESS', paid_at: new Date() }
      });

      // Cập nhật booking → CONFIRMED
      const booking = await tx.bookings.update({
        where: { id: BigInt(payload.bookingId) },
        data:  { status: 'CONFIRMED', expires_at: null },
        include: { booking_seats: true }
      });

      // Cập nhật ghế → CONFIRMED
      await tx.trip_seat_status.updateMany({
        where: {
          trip_id: booking.trip_id,
          seat_id: { in: booking.booking_seats.map(bs => bs.seat_id) }
        },
        data: {
          status:            'CONFIRMED',
          locked_until:      null,
          locked_by_user_id: null,
        }
      });

      // Sinh tickets + QR code
      const tickets = await Promise.all(
        booking.booking_seats.map(bs =>
          tx.tickets.create({
            data: {
              booking_id:      booking.id,
              booking_seat_id: bs.id,
              qr_code:         `PAM-${Number(booking.id)}-${Number(bs.seat_id)}-${Date.now()}`,
              status:          'ISSUED',
            }
          })
        )
      );

      // Đánh dấu OTP đã dùng
      await tx.notifications.update({
        where: { id: notif.id },
        data:  { is_read: true }
      });

      return { booking, tickets };
    });

    res.json({
      success:   true,
      bookingId: Number(result.booking.id),
      status:    'CONFIRMED',
      tickets:   result.tickets.map(t => ({
        id:      Number(t.id),
        qrCode:  t.qr_code,
        status:  t.status,
      }))
    });

  } catch (e) {
    console.error('Payment confirm error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/payments/set-pin — cài mật khẩu thanh toán
router.post('/set-pin', async (req, res) => {
  const { userId, pin } = req.body;

  if (!userId || !pin || pin.length !== 6 || !/^\d+$/.test(pin))
    return res.status(400).json({ error: 'PIN phải là 6 chữ số' });

  try {
    const hash = await bcrypt.hash(pin, 10);
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data:  { payment_pin: hash }
    });
    res.json({ success: true, message: 'Đã cài mật khẩu thanh toán' });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;