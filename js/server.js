/**
 * server.js — Proxy server với Authentication
 * Cài đặt: npm install express pg cors bcrypt
 * Chạy:    node js/server.js
 */

const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');
const bcrypt  = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// ===== CẤU HÌNH KẾT NỐI — SỬA Ở ĐÂY =====
const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'pam_travel',
  user:     'postgres',
  password: '152504',  // ← đổi thành password PostgreSQL của bạn
});
// ==========================================

pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Không kết nối được PostgreSQL:', err.message);
  } else {
    console.log('✅ Kết nối PostgreSQL thành công!');
    console.log('🚀 Proxy server đang chạy tại http://localhost:3001');
  }
});

// ─── ĐĂNG NHẬP ────────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  // identifier = email hoặc phone_number

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone_number, password_hash, role, is_active
       FROM users
       WHERE (email = $1 OR phone_number = $1)
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }

    // Trả về thông tin user (không trả password_hash)
    res.json({
      success: true,
      user: {
        id:          user.id,
        fullName:    user.full_name,
        email:       user.email,
        phone:       user.phone_number,
        role:        user.role,
      }
    });

  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ─── ĐĂNG KÝ ──────────────────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  if (!fullName || !password || (!phone && !email)) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  }

  try {
    // Kiểm tra trùng
    const existing = await pool.query(
      `SELECT id FROM users
       WHERE ($1::varchar IS NOT NULL AND phone_number = $1)
          OR ($2::varchar IS NOT NULL AND email = $2)`,
      [phone || null, email || null]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Số điện thoại hoặc email đã được sử dụng' });
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = await pool.query(
      `INSERT INTO users (full_name, phone_number, email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, 'CUSTOMER', TRUE, NOW())
       RETURNING id, full_name, email, phone_number, role`,
      [fullName, phone || null, email || null, hash]
    );

    const user = insert.rows[0];
    res.status(201).json({
      success: true,
      user: {
        id:       user.id,
        fullName: user.full_name,
        email:    user.email,
        phone:    user.phone_number,
        role:     user.role,
      }
    });

  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Lỗi server: ' + e.message });
  }
});

// ─── QUERY (SELECT only) ───────────────────────────────────────────────────────
app.post('/query', async (req, res) => {
  const { sql, params = [] } = req.body;
  const upper = sql.trim().toUpperCase();
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    return res.status(403).json({ error: 'Chỉ cho phép lệnh SELECT' });
  }
  try {
    const result = await pool.query(sql, params);
    res.json({ rows: result.rows });
  } catch (e) {
    console.error('SQL Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch(e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.listen(3001, () => {
  console.log('   Endpoints: /login · /register · /query · /health');
});