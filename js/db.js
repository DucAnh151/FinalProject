/**
 * DB.js — Kết nối PostgreSQL qua mini proxy server
 * Cách dùng: DB.query(sql, params?) → Promise<rows[]>
 *
 * ⚠️  HTML thuần không thể kết nối thẳng PostgreSQL.
 *     File này gọi đến proxy server chạy tại localhost:3001
 *     Chạy proxy: node js/server.js
 */

const DB_CONFIG = {
  host: 'http://localhost:3001'
};

const DB = {
  async query(sql, params = []) {
    try {
      const res = await fetch(`${DB_CONFIG.host}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Query failed');
      }
      const data = await res.json();
      return data.rows;
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        throw new Error('Không thể kết nối proxy server. Hãy chạy: node js/server.js');
      }
      throw e;
    }
  }
};