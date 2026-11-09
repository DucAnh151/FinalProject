---
name: run-dev
description: Khởi động backend Express và frontend Vite của Pam Travel trên Windows, xử lý lỗi thường gặp khi cài lần đầu hoặc sau khi pull code. Dùng khi user muốn "chạy dev", "lên local", "khởi động server", "chạy web".
---

# Chạy Pam Travel ở local (Windows)

Dự án cần **2 process song song** — backend và frontend. Thiếu backend thì UI load được nhưng mọi API lỗi `ERR_CONNECTION_REFUSED`.

## Chuẩn bị lần đầu

```bash
# 1. Cài dependency — 2 chỗ riêng biệt
npm install
cd frontend && npm install && cd ..

# 2. Tạo .env ở gốc (copy từ .env.example rồi điền)
#    DB_HOST, DB_PORT, DB_NAME=pam_travel, DB_USER, DB_PASSWORD, JWT_SECRET, PORT=3001
#    + DATABASE_URL cho Prisma:
#      DATABASE_URL="postgresql://<user>:<password>@localhost:5432/pam_travel?schema=public"

# 3. Tạo frontend/.env
#    VITE_API_BASE_URL=http://localhost:3001/api

# 4. Sinh Prisma Client
npx prisma generate
```

PostgreSQL phải đang chạy và database `pam_travel` phải tồn tại (seed: `sql/seed_data_optimized.sql` — **user tự chạy**).

## Chạy hàng ngày

**Terminal 1 — backend:**
```bash
npm run dev
```
Chờ đến khi thấy:
```
✅ Kết nối PostgreSQL thành công!
🚀 Server đang chạy tại http://localhost:3001
[SeatUnlocker] Da khoi dong - chay moi 60 giay
[TripCloser] ...
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```
Vite in URL local (mặc định `http://localhost:5173`).

Kiểm tra backend sống: `curl http://localhost:3001/health` → `{"status":"ok","db":"connected"}`.

## Sau khi pull / đổi nhánh

```bash
npm install                      # nếu package.json gốc đổi
cd frontend && npm install       # nếu frontend/package.json đổi
cd .. && npx prisma generate     # nếu prisma/schema.prisma đổi
```

Nếu `schema.prisma` trong commit mới có cột mà DB local chưa có → tìm file `sql/YYYY-MM-DD_*.sql` tương ứng và **nhắc user tự chạy**. Đừng tự chạy `prisma db push`.

## Khi nghi cache Vite hỏng

```bash
rm -rf frontend/node_modules/.vite      # Git Bash
cd frontend && npx vite --force
```
PowerShell: `Remove-Item -Recurse -Force frontend\node_modules\.vite`

## Lỗi hay gặp

| Lỗi | Nguyên nhân | Hướng xử lý |
|---|---|---|
| `❌ Không kết nối được PostgreSQL` | Postgres chưa chạy, hoặc `.env` sai | Khởi động service Postgres; kiểm tra `DB_*` trong `.env` |
| `PrismaClientInitializationError` / `Environment variable not found: DATABASE_URL` | Thiếu `DATABASE_URL` (khác với các biến `DB_*`) | Thêm `DATABASE_URL` vào `.env` rồi `npx prisma generate` |
| `@prisma/client did not initialize yet` | Chưa generate sau khi đổi schema | `npx prisma generate` |
| `EADDRINUSE :3001` | Backend đã chạy ở terminal khác | Tắt process cũ, hoặc đổi `PORT` trong `.env` **và** `VITE_API_BASE_URL` |
| UI load được nhưng mọi API lỗi | Backend chưa chạy, hoặc `VITE_API_BASE_URL` sai | Chạy backend; kiểm tra `frontend/.env`; đổi `.env` của Vite **phải restart** dev server |
| Network tab thấy `/api/api/...` | Path truyền vào `api.get()` có thêm `/api` | Bỏ `/api` — baseURL đã chứa sẵn |
| `Cannot find module 'bcrypt'` / lỗi native | Đổi version Node sau khi cài | `npm rebuild bcrypt` ở gốc |
| CORS error trên browser | Backend chưa chạy (CORS hiện mở cho mọi origin) | Chạy backend |
| Vite treo / "Failed to scan for dependencies" | Import thừa hoặc path không tồn tại | Skill `fix-vite-deps`, hoặc agent `vite-build-doctor` |
| Đăng nhập xong F5 bị mất session | Session lưu `sessionStorage` — đóng tab là mất (đúng thiết kế hiện tại) | Không phải bug |

## Lưu ý Windows

- Shell Bash có sẵn trong môi trường này; `rm -rf`, `curl`, `grep` dùng được. Nếu user chạy trong PowerShell thì đưa lệnh PowerShell tương ứng.
- Đường dẫn dự án có khoảng trắng ở tên file docs (`Tổng quan dữ liệu .md`) → luôn bọc nháy khi truyền vào lệnh.
- `nodemon` restart backend khi sửa file trong `js/` — không cần tự tắt/mở lại.

## KHÔNG tự chạy

`npx prisma db push`, `npx prisma migrate`, `psql`, chạy file `.sql`. DB là dữ liệu thật của user → sinh SQL và nhắc user tự chạy (skill `db-change`).
