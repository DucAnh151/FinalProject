# Pam Travel — Tiến độ dự án

**Cập nhật:** 05/06/2026  
**Stack:** Java 21 · Spring Boot 3.x · Vue.js 3 · PostgreSQL · DataGrip

---

## ✅ Đã hoàn thành

### 1. Tài liệu dự án

- **BRD.md** — Business Requirements Document
  - Bối cảnh, mục tiêu nghiệp vụ (BO-01 → BO-07)
  - Phạm vi in-scope / out-of-scope
  - Quy trình As-Is và To-Be (Mermaid diagram)
  - Business Rules (BR-01 → BR-07): seat lock 10 phút, giới hạn 5 vé, concurrency, chính sách hủy, QR validation
  - Stakeholders, ràng buộc, giả định
  - Acceptance Criteria (AC-01 → AC-06)
  - Lộ trình 4 giai đoạn

- **SRS.md** — Software Requirements Specification
  - Yêu cầu chức năng: Authentication, Trip Search, Dynamic Seat Map
  - API Endpoints mẫu: `GET /api/v1/trips/{tripId}/seat-map`, `POST /api/v1/bookings`
  - Ràng buộc kỹ thuật: Spring Boot 3.x, Vue.js 3, PostgreSQL, JWT, Bcrypt

> **Lỗi đã phát hiện và sửa trong SRS:** Java 8 → Java 21 (Spring Boot 3.x yêu cầu tối thiểu Java 17)

---

### 2. Môi trường phát triển

| Công cụ | Phiên bản | Trạng thái |
|---------|-----------|------------|
| Java (Temurin) | 21 LTS | ✅ Đã cài |
| PostgreSQL | 18.x | ✅ Đã cài |
| DataGrip | Latest | ✅ Đã kết nối DB |
| Node.js | 22.x | ✅ Đã cài |
| VS Code | Latest | ✅ Đang dùng |

---

### 3. Thiết kế Database

Thiết kế và tạo thành công **17 bảng** trong PostgreSQL database `pam_travel`, schema `public`.

#### Danh sách bảng

| Nhóm | Bảng |
|------|------|
| Master data | `provinces`, `operators`, `vehicle_types` |
| Xe & Ghế | `vehicles`, `seats` |
| Tuyến đường | `routes`, `route_stops` |
| Chuyến đi | `trips`, `trip_seat_status` |
| Người dùng | `users` |
| Đặt vé | `bookings`, `booking_seats` |
| Thanh toán | `payments`, `tickets`, `refunds` |
| Phụ trợ | `reviews`, `notifications` |

#### Điểm thiết kế quan trọng

- `trip_seat_status` — bảng cốt lõi xử lý **concurrency** (BR-03): dùng `SELECT FOR UPDATE` + Database Transaction để tránh double-booking
- `seat_layout_json` trong `vehicle_types` — kiểu **JSONB** của PostgreSQL, lưu cấu hình tầng/hàng/cột động
- `locked_until` trong `trip_seat_status` — timestamp tự động nhả ghế sau 10 phút (BR-01)
- **Partial Index** trên `trip_seat_status` — chỉ index ghế đang bị khóa, tối ưu query
- `SERIAL` cho master data, `BIGSERIAL` cho bảng transaction (tránh tràn số)
- `TIMESTAMPTZ` cho tất cả timestamp — chuẩn timezone

#### Index đã tạo

```sql
CREATE INDEX idx_trips_route_departure ON trips(route_id, departure_time);
CREATE INDEX idx_tss_locked ON trip_seat_status(trip_id, locked_until) WHERE status = 'LOCKED';
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
```

---

### 4. Dữ liệu mẫu (Seed Data)

Insert **3 rows mỗi bảng** để kiểm tra quan hệ và giao diện.

Dữ liệu mẫu bao gồm:
- 3 tỉnh/thành: Hà Nội, Hồ Chí Minh, Đà Nẵng
- 3 nhà xe: Phương Trang, Thành Bưởi, Hoàng Long
- 3 loại xe: Limousine 34, Giường nằm 40, Ghế ngồi 45
- 3 users: CUSTOMER, DRIVER, ADMIN
- 3 tuyến đường, 3 chuyến xe, 3 đơn đặt vé
- Đầy đủ payments, tickets, refunds, reviews, notifications

---

### 5. Giao diện xem dữ liệu (HTML Preview)

Tạo bộ **6 trang HTML** + **proxy server Node.js** để xem dữ liệu PostgreSQL trực tiếp trên trình duyệt.

#### Cấu trúc thư mục

```
FinalProject/
├── index.html              ← Dashboard chính
├── package.json
├── css/
│   └── common.css          ← Style dùng chung
├── js/
│   ├── db.js               ← HTTP client gọi proxy
│   ├── common.js           ← Helper functions
│   └── server.js           ← Express proxy server
└── pages/
    ├── trips.html          ← Danh sách chuyến xe + filter
    ├── bookings.html       ← Đơn đặt vé + filter
    ├── users.html          ← Người dùng + filter theo role
    ├── routes.html         ← Tuyến đường + điểm dừng
    └── payments.html       ← Thanh toán + hoàn tiền + summary cards
```

#### Tính năng giao diện

- Dashboard: stats (chuyến xe, đơn đặt, user, doanh thu), search bar, bảng dữ liệu gần đây
- Filter theo trạng thái, vai trò, cổng thanh toán
- Badge màu theo trạng thái (OPEN/PENDING/CONFIRMED/CANCELLED...)
- Font: Bebas Neue (tiêu đề) + DM Sans (body) + DM Mono (code/số)
- Responsive, animation fadeUp

#### Cách chạy

```bash
# Terminal 1 — Proxy server (giữ nguyên, không tắt)
cd D:\FinalProject-git\FinalProject
node js/server.js
# Kết quả: ✅ Kết nối PostgreSQL thành công!

# Terminal 2 — Static file server
npx http-server -p 5500

# Trình duyệt
# http://localhost:5500
# http://localhost:3001/health  ← kiểm tra kết nối DB
```

> **Lưu ý:** Phải chạy qua `http://localhost`, không dùng `file://` vì trình duyệt chặn fetch request từ file protocol.

---

## ⬜ Chưa làm — Bước tiếp theo

### Giai đoạn 1: Spring Boot Backend (MVP)

- [ ] Tạo project Spring Boot 3.x tại [start.spring.io](https://start.spring.io)
  - Dependencies: Web, JPA, Security, PostgreSQL, Lombok, Validation
- [ ] Cấu hình `application.yml` kết nối PostgreSQL
- [ ] Tạo 17 Entity class (JPA mapping)
- [ ] Tạo Repository layer (Spring Data JPA)
- [ ] REQ-01: Authentication API (JWT + Spring Security)
- [ ] REQ-02: Trip Search API
- [ ] REQ-03: Dynamic Seat Map API
- [ ] Booking API + Seat Locking (`@Transactional` + `SELECT FOR UPDATE`)
- [ ] Payment webhook (VNPay/Momo sandbox)
- [ ] QR Code generation cho ticket

### Giai đoạn 2: Vue.js Frontend

- [ ] Tạo project Vue.js 3 (Vite + Composition API)
- [ ] Cấu hình TailwindCSS
- [ ] Trang tìm kiếm chuyến xe
- [ ] Sơ đồ ghế động (render từ `seat_layout_json`)
- [ ] Booking flow (chọn ghế → nhập thông tin → thanh toán)
- [ ] Trang quản lý vé (My Tickets)
- [ ] Trang soát vé cho tài xế (QR Scanner)

### Giai đoạn 3: Tích hợp & Hoàn thiện

- [ ] Kết nối Vue.js ↔ Spring Boot API
- [ ] Xử lý real-time seat status (WebSocket hoặc polling)
- [ ] Tích hợp cổng thanh toán thật (VNPay/Momo)
- [ ] Deploy (Docker + VPS hoặc Railway)

---

## Ghi chú kỹ thuật

**Lỗi đã gặp và cách sửa:**

| Lỗi | Nguyên nhân | Cách sửa |
|-----|------------|----------|
| Tạo bảng vào sai schema | DataGrip đang active schema `postgres.public` | Đổi dropdown sang `pam_travel.public` hoặc `SET search_path TO public` |
| `no schema has been selected` | Schema context chưa được set | Thêm `SET search_path TO public;` đầu script |
| `relation already exists` | Chạy script lần 2 | `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` |
| `DB is not defined` | `db.js` chưa được load | Sửa path `src="../js/db.js"` → `src="js/db.js"` trong index.html |
| `Cannot find module server.js` | Tên file bị đánh sai thành `sever.js` | `Rename-Item sever.js server.js` |