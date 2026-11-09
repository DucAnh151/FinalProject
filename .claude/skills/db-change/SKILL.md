---
name: db-change
description: Đổi schema PostgreSQL của Pam Travel an toàn — cập nhật prisma/schema.prisma và sinh file SQL idempotent trong sql/ để user tự chạy. Dùng khi task cần thêm bảng/cột/index/enum, hoặc sửa kiểu dữ liệu. KHÔNG tự chạy lệnh ghi DB.
---

# Đổi schema database

## ⛔ Nguyên tắc tối cao

Database `pam_travel` chứa **dữ liệu thật của user**. Agent **KHÔNG BAO GIỜ** tự chạy:

- `npx prisma db push`
- `npx prisma migrate dev` / `migrate deploy` / `migrate reset`
- `psql ...`, chạy file `.sql`
- bất kỳ `prisma.$executeRaw` dạng DDL trong script tạm

Được phép tự chạy (an toàn, không đụng dữ liệu): `npx prisma generate`, `npx prisma validate`, `npx prisma format`.

Dự án **không dùng Prisma Migrations** (`prisma/migrations/` không tồn tại — schema được `db pull` từ DB). Đừng khởi tạo migrations mới; làm vậy sẽ phá quy trình hiện tại và có thể rủ user chạy `migrate reset` làm mất dữ liệu.

## Quy trình 4 bước

### Bước 1 — Đọc schema thật

```bash
grep -nE "^(model|enum)" prisma/schema.prisma
```

Rồi đọc block của bảng liên quan. Ghi nhận: tên cột (`snake_case`), kiểu `@db.*`, `@default`, nullable, index, và tên quan hệ.

Lưu ý ở schema này:
- Khoá chính là `BigInt @id @default(autoincrement())` → cột SQL là `BIGSERIAL`/`BIGINT`.
- Cột thời gian là `TIMESTAMPTZ`.
- `vehicle_types.seat_layout_json` là `JSONB`.
- Có comment `/// This table contains check constraints...` — bảng đó có CHECK constraint, phải giữ khi thêm giá trị trạng thái mới.

### Bước 2 — Viết file SQL cho user chạy

```
sql/<YYYY-MM-DD>_<slug-ngắn>.sql
```

Lấy ngày: `date +%F`.

Yêu cầu bắt buộc: **idempotent** — chạy 2 lần cho cùng kết quả, không lỗi.

```sql
-- =============================================================
-- Task      : Task-10 — Đổi vé
-- Mục đích  : Thêm cột ghi nhận lần đổi vé trên bookings
-- Chạy      : 1 lần trên mỗi môi trường (idempotent, chạy lại an toàn)
-- Rollback  : xem phần cuối file
-- =============================================================

BEGIN;

-- 1. Thêm cột
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS exchanged_from_id BIGINT NULL;

-- 2. Khoá ngoại (kiểm tra trước vì ADD CONSTRAINT không có IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_exchanged_from_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_exchanged_from_id_fkey
      FOREIGN KEY (exchanged_from_id) REFERENCES public.bookings(id);
  END IF;
END $$;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_bookings_exchanged_from
  ON public.bookings (exchanged_from_id);

-- 4. Mở rộng CHECK constraint cho trạng thái mới (phải DROP rồi ADD lại)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
  END IF;
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('PENDING','CASH_PENDING','CONFIRMED','CANCELLED','EXCHANGED'));
END $$;

COMMIT;

-- =============================================================
-- ROLLBACK (chạy thủ công nếu cần quay lại)
-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_exchanged_from_id_fkey;
-- DROP INDEX IF EXISTS idx_bookings_exchanged_from;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS exchanged_from_id;
-- =============================================================
```

Mẫu idempotent theo loại thao tác:

| Thao tác | Cách viết |
|---|---|
| Thêm cột | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |
| Xoá cột | `ALTER TABLE ... DROP COLUMN IF EXISTS` (**hỏi user trước — mất dữ liệu**) |
| Thêm bảng | `CREATE TABLE IF NOT EXISTS` |
| Thêm index | `CREATE INDEX IF NOT EXISTS` |
| Thêm constraint | bọc `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...)` |
| Đổi kiểu cột | `ALTER COLUMN ... TYPE ... USING ...` — **luôn** hỏi user trước, nêu rõ rủi ro mất dữ liệu |
| Seed/backfill | `INSERT ... WHERE NOT EXISTS (...)` hoặc `ON CONFLICT DO NOTHING` |
| Backfill giá trị | `UPDATE ... WHERE <cột> IS NULL` (chỉ sửa hàng chưa có giá trị) |

Quy tắc viết SQL:
- Bọc `BEGIN; ... COMMIT;` để lỗi giữa đường không để lại trạng thái nửa vời.
- Prefix `public.` cho tên bảng.
- Cột mới trên bảng có dữ liệu: khai báo `NULL` hoặc có `DEFAULT`. Thêm `NOT NULL` không default trên bảng đã có hàng → lỗi.
- Cần `NOT NULL` → 3 bước: thêm cột nullable → backfill `UPDATE` → `ALTER COLUMN SET NOT NULL`. Nói rõ cho user.
- Luôn có phần ROLLBACK ở cuối (dạng comment).

### Bước 3 — Cập nhật `prisma/schema.prisma` khớp SQL

Sửa tay cho khớp **chính xác** với SQL vừa viết:

```prisma
model bookings {
  // ...
  exchanged_from_id BigInt?   @db.BigInt
  // quan hệ self-reference nếu cần
}
```

Rồi verify (an toàn):
```bash
npx prisma validate
npx prisma format
npx prisma generate
```

`validate` fail → schema sai cú pháp, sửa trước khi báo xong.

> Sau khi user đã chạy SQL, cách chắc chắn nhất để đồng bộ là `npx prisma db pull` (chỉ đọc DB) — nhưng lệnh này **ghi đè** `schema.prisma` và sẽ mất mọi chỉnh tay. Đề xuất user chạy và review diff, đừng tự chạy.

### Bước 4 — Báo cho user

Mục "Cần user chạy" trong báo cáo, theo đúng thứ tự:

```
1. Backup DB (khuyến nghị):
   pg_dump -U <user> -d pam_travel > backup_<ngày>.sql

2. Chạy SQL:
   psql -U <user> -d pam_travel -f sql/2026-11-09_doi-ve.sql

3. Sinh lại Prisma Client:
   npx prisma generate

4. Restart backend:
   npm run dev

5. Thử tay: <endpoint> với <dữ liệu> → mong đợi <kết quả>
```

Thao tác có rủi ro mất dữ liệu (drop cột/bảng, đổi kiểu) → **bắt buộc** nhắc backup và nêu rõ rủi ro ngay đầu mục.

## Thêm trạng thái mới vào bảng có CHECK constraint

Việc này hay bị bỏ sót: thêm giá trị `status` mới trong code nhưng DB vẫn chặn → runtime lỗi `violates check constraint`.

```bash
# Xem constraint hiện có
grep -n "check constraints" prisma/schema.prisma
```

Bảng nào có comment `/// This table contains check constraints` → phải DROP + ADD lại constraint với danh sách giá trị mới (xem mẫu ở Bước 2). Nhớ cập nhật cả logic code lẫn SQL trong **cùng một lần**.

## Checklist trước khi báo xong

- [ ] Đã đọc block liên quan trong `prisma/schema.prisma`, không đoán tên cột.
- [ ] File `sql/YYYY-MM-DD_<slug>.sql` có header (task, mục đích, "chạy 1 lần"), `BEGIN/COMMIT`, idempotent, và phần ROLLBACK.
- [ ] Cột mới trên bảng có dữ liệu là nullable hoặc có DEFAULT.
- [ ] Giá trị trạng thái mới → đã xử lý CHECK constraint.
- [ ] `prisma/schema.prisma` khớp SQL; `npx prisma validate` + `generate` sạch.
- [ ] **Chưa** chạy bất kỳ lệnh ghi DB nào.
- [ ] Báo cáo có mục "Cần user chạy" đầy đủ thứ tự, kèm nhắc backup nếu có rủi ro mất dữ liệu.
- [ ] Đã ghi entry vào `.claude/memory/memory.md` (ghi rõ tên file SQL để trace).
