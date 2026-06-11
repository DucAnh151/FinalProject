const express = require('express');
const bcrypt  = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { confirmBookingAndIssueTickets } = require('../lib/bookingConfirm');

const router = express.Router();
const prisma = new PrismaClient();

// Sinh OTP 6 số
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/payments/initiate
// Bước 1: Kiểm tra PIN → sinh OTP → lưu vào notifications
// gateway CASH: không cần PIN/OTP → booking CASH_PENDING
router.post('/initiate', async (req, res) => {
  const { bookingId, userId, gateway, pin } = req.body;

  if (!bookingId || !userId || !gateway)
    return res.status(400).json({ error: 'Thiếu thông tin thanh toán' });

  try {
    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(bookingId) },
      include: { booking_seats: true },
    });

    if (!booking)
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
    if (Number(booking.user_id) !== Number(userId))
      return res.status(403).json({ error: 'Bạn không có quyền thanh toán đơn này' });
    if (booking.status !== 'PENDING')
      return res.status(400).json({ error: 'Đơn đặt vé không hợp lệ' });
    if (!booking.expires_at || new Date() > booking.expires_at)
      return res.status(400).json({ error: 'Đơn đặt vé đã hết hạn' });
    if (!booking.booking_seats.length)
      return res.status(400).json({ error: 'Vui lòng nhập thông tin hành khách trước khi thanh toán' });

    // BR-09: Thanh toán tiền mặt — không PIN/OTP, chờ driver xác nhận
    if (gateway === 'CASH') {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.create({
          data: {
            booking_id: BigInt(bookingId),
            gateway:    'CASH',
            amount:     booking.total_amount,
            status:     'PENDING',
          },
        });

        await tx.bookings.update({
          where: { id: booking.id },
          data:  {
            status:         'CASH_PENDING',
            expires_at:     null,
            payment_method: 'CASH',
          },
        });

        await tx.trip_seat_status.updateMany({
          where: {
            trip_id: booking.trip_id,
            seat_id: { in: booking.booking_seats.map(bs => bs.seat_id) },
          },
          data: {
            status:            'CONFIRMED',
            locked_until:      null,
            locked_by_user_id: null,
          },
        });

        return payment;
      });

      return res.json({
        success:   true,
        paymentId: Number(result.id),
        status:    'CASH_PENDING',
        message:   'Đã chọn thanh toán tiền mặt. Vui lòng thanh toán cho tài xế khi lên xe.',
      });
    }

    if (!pin)
      return res.status(400).json({ error: 'Thiếu mã PIN thanh toán' });

    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user)
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    if (gateway === 'WALLET' && Number(user.wallet_balance || 0) < Number(booking.total_amount)) {
      return res.status(400).json({ error: 'Số dư ví không đủ. Vui lòng nạp thêm tiền.' });
    }

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

      const payment = await tx.payments.findUnique({
        where: { id: BigInt(paymentId) },
        include: {
          bookings: {
            include: { booking_seats: true }
          }
        }
      });

      if (!payment)
        throw new Error('PAYMENT_NOT_FOUND');
      if (payment.status !== 'PENDING')
        throw new Error('PAYMENT_NOT_PENDING');
      if (Number(payment.booking_id) !== Number(payload.bookingId))
        throw new Error('OTP_PAYMENT_MISMATCH');

      const booking = payment.bookings;
      if (Number(booking.user_id) !== Number(userId))
        throw new Error('FORBIDDEN');
      if (booking.status !== 'PENDING')
        throw new Error('BOOKING_NOT_PENDING');
      if (!booking.expires_at || new Date() > booking.expires_at)
        throw new Error('BOOKING_EXPIRED');
      if (!booking.booking_seats.length)
        throw new Error('PASSENGERS_MISSING');

      // Nếu thanh toán bằng ví điện tử WALLET, thực hiện trừ tiền và lưu giao dịch
      if (payment.gateway === 'WALLET') {
        const user = await tx.users.findUnique({
          where: { id: BigInt(userId) }
        });
        if (Number(user.wallet_balance || 0) < Number(payment.amount)) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
        
        const newBalance = BigInt(user.wallet_balance) - BigInt(payment.amount);
        await tx.users.update({
          where: { id: BigInt(userId) },
          data: { wallet_balance: newBalance }
        });

        await tx.wallet_transactions.create({
          data: {
            user_id: BigInt(userId),
            type: 'PAYMENT',
            amount: BigInt(payment.amount),
            balance_after: newBalance,
            description: `Thanh toán đơn đặt vé #${booking.id}`,
            booking_id: booking.id
          }
        });
      }

      // Cập nhật payment → SUCCESS
      await tx.payments.update({
        where: { id: payment.id },
        data:  { status: 'SUCCESS', paid_at: new Date() }
      });

      // Cập nhật booking → CONFIRMED
      await tx.bookings.update({
        where: { id: booking.id },
        data:  { status: 'CONFIRMED', expires_at: null }
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

      // BR-07: cập nhật total_tickets, tự nâng VIP_CUSTOMER khi >= 10 vé hoặc chuyến
      const ticketCount = booking.booking_seats.length;
      const currentUser = await tx.users.findUnique({
        where: { id: BigInt(userId) },
        select: { total_tickets: true, total_trips: true, loyalty_tier: true }
      });
      const newTotalTickets = (currentUser?.total_tickets || 0) + ticketCount;
      const newTier = (newTotalTickets >= 10 || (currentUser?.total_trips || 0) >= 10)
        ? 'VIP_CUSTOMER'
        : (currentUser?.loyalty_tier || 'STANDARD');

      await tx.users.update({
        where: { id: BigInt(userId) },
        data: {
          total_tickets: newTotalTickets,
          loyalty_tier:  newTier,
        }
      });

      return { booking, tickets, loyaltyTier: newTier, totalTickets: newTotalTickets };
    });

    res.json({
      success:   true,
      bookingId: Number(result.booking.id),
      status:    'CONFIRMED',
      loyaltyTier:  result.loyaltyTier,
      totalTickets: result.totalTickets,
      tickets:   result.tickets.map(t => ({
        id:      Number(t.id),
        qrCode:  t.qr_code,
        status:  t.status,
      }))
    });

  } catch (e) {
    if (e.message === 'INSUFFICIENT_BALANCE')
      return res.status(400).json({ error: 'Số dư ví không đủ' });
    if (e.message === 'PAYMENT_NOT_FOUND')
      return res.status(404).json({ error: 'Không tìm thấy giao dịch thanh toán' });
    if (e.message === 'PAYMENT_NOT_PENDING')
      return res.status(400).json({ error: 'Giao dịch thanh toán không còn hợp lệ' });
    if (e.message === 'OTP_PAYMENT_MISMATCH')
      return res.status(400).json({ error: 'OTP không khớp với giao dịch' });
    if (e.message === 'FORBIDDEN')
      return res.status(403).json({ error: 'Bạn không có quyền xác nhận thanh toán này' });
    if (e.message === 'BOOKING_NOT_PENDING')
      return res.status(400).json({ error: 'Đơn đặt vé không còn chờ thanh toán' });
    if (e.message === 'BOOKING_EXPIRED')
      return res.status(400).json({ error: 'Đơn đặt vé đã hết hạn' });
    if (e.message === 'PASSENGERS_MISSING')
      return res.status(400).json({ error: 'Vui lòng nhập thông tin hành khách trước khi thanh toán' });

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

// POST /api/payments/recharge — nạp tiền giả lập vào ví
router.post('/recharge', async (req, res) => {
  const { userId, amount, pin } = req.body;
  if (!userId || !amount || amount <= 0)
    return res.status(400).json({ error: 'Thiếu thông tin nạp tiền' });

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) }
    });

    if (!user)
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    // Verify PIN if set
    if (user.payment_pin) {
      if (!pin) {
        return res.status(400).json({ error: 'Vui lòng nhập mã PIN thanh toán' });
      }
      const pinMatch = await bcrypt.compare(pin, user.payment_pin);
      if (!pinMatch)
        return res.status(401).json({ error: 'Mã PIN thanh toán không đúng' });
    }

    const newBalance = BigInt(user.wallet_balance || 0) + BigInt(amount);
    
    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.users.update({
        where: { id: BigInt(userId) },
        data: { wallet_balance: newBalance }
      });

      await tx.wallet_transactions.create({
        data: {
          user_id: BigInt(userId),
          type: 'TOPUP',
          amount: BigInt(amount),
          balance_after: newBalance,
          description: 'Nạp tiền vào ví giả lập'
        }
      });

      return u;
    });

    res.json({
      success: true,
      walletBalance: Number(updatedUser.wallet_balance),
      message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')}đ vào ví!`
    });
  } catch (e) {
    console.error('Recharge error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
