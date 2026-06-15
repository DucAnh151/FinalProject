require('dotenv').config();
const express = require('express');
const bcrypt  = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const router  = express.Router();
const prisma  = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  // Validate
  if (!fullName || fullName.trim().length < 2)
    return res.status(400).json({ error: 'Họ tên tối thiểu 2 ký tự' });
  if (!phone && !email)
    return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc email' });
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });

  try {
    // Kiểm tra trùng
    const existing = await prisma.users.findFirst({
      where: {
        OR: [
          phone ? { phone_number: phone } : undefined,
          email ? { email: email }         : undefined,
        ].filter(Boolean)
      }
    });

    if (existing)
      return res.status(409).json({ error: 'Số điện thoại hoặc email đã được sử dụng' });

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        full_name:     fullName.trim(),
        phone_number:  phone || null,
        email:         email || null,
        password_hash: hash,
        role:          'CUSTOMER',
        is_active:     true,
      },
      select: { id: true, full_name: true, email: true, phone_number: true, role: true }
    });

    res.status(201).json({
        success: true,
        user: {
            id:       Number(user.id),   // ← convert BigInt → Number
            fullName: user.full_name,
            email:    user.email,
            phone:    user.phone_number,
            role:     user.role,
            walletBalance: Number(user.wallet_balance || 0),
            loyaltyTier: user.loyalty_tier || 'STANDARD',
            totalTickets: user.total_tickets || 0,
            totalTrips: user.total_trips || 0,
            hasPin: false,
        }
    });

  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password)
    return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email:        identifier },
          { phone_number: identifier },
        ]
      }
    });

    if (!user)
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });

    if (!user.is_active)
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Mật khẩu không đúng' });

    res.json({
      success: true,
      user: {
        id:       Number(user.id),
        fullName: user.full_name,
        email:    user.email,
        phone:    user.phone_number,
        role:     user.role,
        walletBalance: Number(user.wallet_balance || 0),
        loyaltyTier: user.loyalty_tier || 'STANDARD',
        totalTickets: user.total_tickets || 0,
        totalTrips: user.total_trips || 0,
        hasPin:        !!user.payment_pin,
      }
    });

  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/auth/profile
router.put('/profile', async (req, res) => {
  const { userId, fullName, phone, email, avatarUrl } = req.body;

  if (!userId)
    return res.status(400).json({ error: 'Thiếu userId' });
  if (!fullName || fullName.trim().length < 2)
    return res.status(400).json({ error: 'Họ tên tối thiểu 2 ký tự' });
  if (!phone && !email)
    return res.status(400).json({ error: 'Cần có số điện thoại hoặc email' });

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');

    const duplicated = await prisma.users.findFirst({
      where: {
        id: { not: BigInt(userId) },
        OR: [
          phone ? { phone_number: phone } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean)
      }
    });

    if (duplicated)
      return res.status(409).json({ error: 'Số điện thoại hoặc email đã được sử dụng' });

    const rows = await prisma.$queryRaw`
      UPDATE users
      SET full_name = ${fullName.trim()},
          phone_number = ${phone || null},
          email = ${email || null},
          avatar_url = ${avatarUrl || null}
      WHERE id = ${BigInt(userId)}
      RETURNING id, full_name, email, phone_number, role, avatar_url,
                wallet_balance, loyalty_tier, total_tickets, total_trips, payment_pin
    `;

    if (!rows.length)
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    const user = rows[0];
    res.json({
      success: true,
      user: {
        id: Number(user.id),
        fullName: user.full_name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
        avatarUrl: user.avatar_url,
        walletBalance: Number(user.wallet_balance || 0),
        loyaltyTier: user.loyalty_tier || 'STANDARD',
        totalTickets: user.total_tickets || 0,
        totalTrips: user.total_trips || 0,
        hasPin:        !!user.payment_pin,
      }
    });
  } catch (e) {
    console.error('Update profile error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Thiếu thông tin mật khẩu' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { password_hash: true }
    });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { password_hash: hash }
    });

    res.json({ success: true, message: 'Đã cập nhật mật khẩu thành công' });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/auth/avatar
router.put('/avatar', async (req, res) => {
  const { userId, avatarUrl } = req.body;
  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

  try {
    // Đảm bảo cột tồn tại
    await prisma.$executeRawUnsafe(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT'
    );

    const rows = await prisma.$queryRaw`
      UPDATE users SET avatar_url = ${avatarUrl || null}
      WHERE id = ${BigInt(userId)}
      RETURNING id, full_name, email, phone_number, role,
                avatar_url, wallet_balance, loyalty_tier,
                total_tickets, total_trips, payment_pin
    `;
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });

    const u = rows[0];
    res.json({
      success: true,
      user: {
        id:            Number(u.id),
        fullName:      u.full_name,
        email:         u.email,
        phone:         u.phone_number,
        role:          u.role,
        avatarUrl:     u.avatar_url,
        walletBalance: Number(u.wallet_balance || 0),
        loyaltyTier:   u.loyalty_tier || 'STANDARD',
        totalTickets:  u.total_tickets || 0,
        totalTrips:    u.total_trips || 0,
        hasPin:        !!u.payment_pin,
      }
    });
  } catch (e) {
    console.error('Avatar update error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;