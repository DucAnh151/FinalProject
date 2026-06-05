/**
 * server.js — Mini proxy server
 * Cho phép HTML files gọi PostgreSQL qua HTTP
 *
 * Cài đặt: npm install express pg cors
 * Chạy:    node server.js
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ===== CẤU HÌNH KẾT NỐI — SỬA Ở ĐÂY =====
const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'pam_travel',
  user:     'postgres',
  password: '152504',   // ← đổi thành password PostgreSQL của bạn
});
// ==========================================

// Test connection khi khởi động
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Không kết nối được PostgreSQL:', err.message);
    console.error('   Kiểm tra lại host/port/database/user/password trong server.js');
  } else {
    console.log('✅ Kết nối PostgreSQL thành công!');
    console.log('🚀 Proxy server đang chạy tại http://localhost:3001');
    console.log('   Mở file index.html trong trình duyệt để xem giao diện');
  }
});

// Endpoint chạy SQL
app.post('/query', async (req, res) => {
  const { sql, params = [] } = req.body;

  // Chặn các lệnh nguy hiểm (chỉ cho SELECT trong môi trường dev này)
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

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch(e) {
    res.status(500).json({ status: 'error', db: e.message });
  }
});

app.listen(3001);