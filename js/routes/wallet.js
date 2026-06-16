const express = require('express');
const bcrypt  = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/wallet/:userId — số dư + lịch sử giao dịch
router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { wallet_balance: true },
    });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    const transactions = await prisma.wallet_transactions.findMany({
      where:  { user_id: BigInt(userId) },
      orderBy: { created_at: 'desc' },
      take:   50,
    });

    res.json({
      balance: Number(user.wallet_balance || 0),
      transactions: transactions.map(t => ({
        id:            Number(t.id),
        type:          t.type,
        amount:        Number(t.amount),
        balanceAfter:  Number(t.balance_after),
        description:   t.description,
        bookingId:     t.booking_id ? Number(t.booking_id) : null,
        createdAt:     t.created_at,
      })),
    });
  } catch (e) {
    console.error('Wallet get error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/wallet/topup/initiate — PIN → OTP
router.post('/topup/initiate', async (req, res) => {
  const { userId, amount, pin } = req.body;
  if (!userId || !amount || amount <= 0)
    return res.status(400).json({ error: 'Thiếu thông tin nạp tiền' });
  if (!pin)
    return res.status(400).json({ error: 'Vui lòng nhập mã PIN thanh toán' });

  try {
    const user = await prisma.users.findUnique({ where: { id: BigInt(userId) } });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    if (!user.payment_pin)
      return res.status(400).json({ error: 'Bạn chưa cài mật khẩu thanh toán' });

    const pinMatch = await bcrypt.compare(pin, user.payment_pin);
    if (!pinMatch)
      return res.status(401).json({ error: 'Mã PIN thanh toán không đúng' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.notifications.create({
      data: {
        user_id: BigInt(userId),
        type:    'OTP_TOPUP',
        content: JSON.stringify({ otp, amount, expiry: otpExpiry }),
        is_read: false,
      },
    });

    res.json({
      success: true,
      message: `Mã OTP đã được gửi (dev: OTP = ${otp})`,
      otp,
    });
  } catch (e) {
    console.error('Wallet topup initiate error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/wallet/topup/confirm — OTP → cộng tiền
router.post('/topup/confirm', async (req, res) => {
  const { userId, amount, otp } = req.body;
  if (!userId || !amount || !otp)
    return res.status(400).json({ error: 'Thiếu thông tin xác nhận' });

  try {
    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: BigInt(userId),
        type:    'OTP_TOPUP',
        is_read: false,
      },
      orderBy: { created_at: 'desc' },
      take: 1,
    });

    if (!notifications.length)
      return res.status(400).json({ error: 'Không tìm thấy OTP' });

    const notif   = notifications[0];
    const payload = JSON.parse(notif.content);

    if (payload.otp !== otp)
      return res.status(401).json({ error: 'OTP không đúng' });
    if (new Date() > new Date(payload.expiry))
      return res.status(400).json({ error: 'OTP đã hết hạn' });
    if (Number(payload.amount) !== Number(amount))
      return res.status(400).json({ error: 'OTP không khớp số tiền' });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({ where: { id: BigInt(userId) } });
      const newBalance = BigInt(user.wallet_balance || 0) + BigInt(amount);

      const updated = await tx.users.update({
        where: { id: BigInt(userId) },
        data:  { wallet_balance: newBalance },
      });

      await tx.wallet_transactions.create({
        data: {
          user_id:       BigInt(userId),
          type:          'TOPUP',
          amount:        BigInt(amount),
          balance_after: newBalance,
          description:   'Nạp tiền vào ví',
        },
      });

      await tx.notifications.update({
        where: { id: notif.id },
        data:  { is_read: true },
      });

      // BR-07: nâng VIP nếu tổng nạp tích lũy >= 10 triệu
      const totalTopup = await tx.wallet_transactions.aggregate({
        where: { user_id: BigInt(userId), type: 'TOPUP' },
        _sum:  { amount: true },
      });
      let finalUser = updated;
      if (Number(totalTopup._sum.amount || 0) >= 10000000 && updated.loyalty_tier !== 'VIP_CUSTOMER') {
        finalUser = await tx.users.update({
          where: { id: BigInt(userId) },
          data:  { loyalty_tier: 'VIP_CUSTOMER' },
        });
      }

      return finalUser;      
    });

    res.json({
      success:       true,
      walletBalance: Number(result.wallet_balance),
      loyaltyTier:   result.loyalty_tier,
      message:       `Đã nạp thành công ${Number(amount).toLocaleString('vi-VN')}đ vào ví!`,
    });
  } catch (e) {
    console.error('Wallet topup confirm error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
