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
      }
    });

  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
});
module.exports = router;