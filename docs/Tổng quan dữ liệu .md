# DATABASE_OVERVIEW — Tổng quan Cơ sở dữ liệu
## Pam Travel v2.2 · PostgreSQL 18

---

## 1. Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Database | pam_travel |
| Schema | public |
| Tổng số bảng | 23 bảng |
| ORM | Prisma 5 |
| Cập nhật | 12/06/2026 — đồng bộ theo BRD/SRS v2.2 |

---

## 2. Danh sách bảng

| Nhóm | Bảng | Ghi chú |
|------|------|---------|
| **Master Data** | provinces | Tỉnh/thành phố |
| | operators | Nhà xe |
| | vehicle_types | Loại xe (Limousine, Giường nằm...) |
| **Xe & Ghế** | vehicles | Xe cụ thể |
| | seats | Ghế của từng xe |
| **Tuyến đường** | routes | Tuyến A→B |
| | route_stops | Điểm đón/trả trên tuyến |
| **Chuyến đi** | trips | Chuyến xe cụ thể, có `assigned_driver_id` |
| | trip_seat_status | Trạng thái ghế theo chuyến |
| **Người dùng** | users | CUSTOMER, DRIVER, ADMIN — có loyalty_tier, wallet_balance, payment_pin |
| **Đặt vé** | bookings | Đơn đặt vé, có `payment_method` |
| | booking_seats | Ghế trong từng đơn |
| **Thanh toán** | payments | Giao dịch thanh toán |
| | tickets | Vé điện tử QR — phát hành cho MỌI phương thức thanh toán |
| | refunds | Hoàn tiền (hủy vé 90%) |
| **Ví điện tử** | wallet_transactions | Lịch sử giao dịch ví (TOPUP/PAYMENT/REFUND/BONUS) |
| **UI/Content** | banners | Banner quảng cáo nhà xe |
| | popular_routes | Tuyến phổ biến landing page |
| | faqs | Câu hỏi chatbot (keyword-based) |
| **Phụ trợ** | reviews | Đánh giá chuyến đi (1-5 sao), unique theo booking+user |
| | notifications | Thông báo + OTP (OTP_PAYMENT, OTP_TOPUP) |

---

## 3. Chi tiết từng bảng

### users
```sql
id              BIGSERIAL PRIMARY KEY
phone_number    VARCHAR(15) UNIQUE
email           VARCHAR(255) UNIQUE
full_name       VARCHAR(200)
password_hash   VARCHAR(255)
avatar_url      TEXT                   -- ảnh đại diện (base64/URL), hiển thị cạnh tên trên header — mọi role
payment_pin     VARCHAR(255)           -- bcrypt hash PIN 6 số. CHỈ áp dụng cho CUSTOMER (BR-17: driver không có)
role            VARCHAR(15)            -- CUSTOMER, DRIVER, ADMIN
loyalty_tier    VARCHAR(20) DEFAULT 'STANDARD'  -- STANDARD, VIP_CUSTOMER
total_tickets   INT DEFAULT 0          -- tổng vé CONFIRMED đã đặt
total_trips     INT DEFAULT 0          -- tổng chuyến COMPLETED đã đi
wallet_balance  BIGINT DEFAULT 0       -- số dư ví (đơn vị: đồng), không âm (BR-09)
is_active       BOOLEAN DEFAULT TRUE   -- admin khóa tài khoản = FALSE (không xóa vật lý)
created_at      TIMESTAMPTZ DEFAULT NOW()
CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
```

**Ghi chú vai trò:**
- `payment_pin`: chỉ CUSTOMER cài đặt và sử dụng. Settings của DRIVER/ADMIN không hiển thị mục PIN (BR-17).
- `avatar_url`: dùng chung cho CUSTOMER, DRIVER, ADMIN — hiển thị trong UserHeader cạnh role badge và tên (BR-18).
- `loyalty_tier`: nâng lên `VIP_CUSTOMER` qua 2 cách — tự động (BR-07) hoặc admin nâng thủ công (BR-19).

### provinces
```sql
id    SERIAL PRIMARY KEY
name  VARCHAR(100)
slug  VARCHAR(100) UNIQUE
```

### operators
```sql
id           SERIAL PRIMARY KEY
name         VARCHAR(150)
hotline      VARCHAR(20)
logo_url     TEXT
banner_url   TEXT          -- ảnh banner nhà xe
description  TEXT          -- mô tả nhà xe
rating       NUMERIC(2,1) DEFAULT 5.0
is_active    BOOLEAN DEFAULT TRUE
```

### vehicle_types
```sql
id                SERIAL PRIMARY KEY
name              VARCHAR(100)       -- Limousine 16, Giường nằm 40...
seat_layout_json  JSONB              -- {"floors":2,"floor_1":{"rows":4,"cols":2}}
total_seats       INT
floors            INT DEFAULT 1
```

### vehicles
```sql
id               SERIAL PRIMARY KEY
operator_id      INT REFERENCES operators(id)
vehicle_type_id  INT REFERENCES vehicle_types(id)
license_plate    VARCHAR(20) UNIQUE
name             VARCHAR(100)
```

### seats
```sql
id           BIGSERIAL PRIMARY KEY
vehicle_id   INT REFERENCES vehicles(id)
seat_name    VARCHAR(10)           -- "1-A1", "2-B3"
floor_number INT DEFAULT 1
row_number   INT
col_number   INT
UNIQUE (vehicle_id, seat_name)
```

### routes
```sql
id                      SERIAL PRIMARY KEY
origin_province_id      INT REFERENCES provinces(id)
destination_province_id INT REFERENCES provinces(id)
base_price              INT             -- VND
duration_minutes        INT
CHECK (origin_province_id <> destination_province_id)
```

### route_stops
```sql
id             SERIAL PRIMARY KEY
route_id       INT REFERENCES routes(id)
province_id    INT REFERENCES provinces(id)
stop_order     INT
stop_name      VARCHAR(200)
offset_minutes INT DEFAULT 0
stop_type      VARCHAR(10)  -- PICKUP, DROPOFF, BOTH
UNIQUE (route_id, stop_order)
```

### trips
```sql
id                 BIGSERIAL PRIMARY KEY
route_id           INT REFERENCES routes(id)
vehicle_id         INT REFERENCES vehicles(id)
operator_id        INT REFERENCES operators(id)
assigned_driver_id BIGINT REFERENCES users(id)  -- driver phụ trách, admin gán qua dropdown
departure_time     TIMESTAMPTZ
arrival_time       TIMESTAMPTZ
price_override     INT                           -- NULL = dùng base_price
status             VARCHAR(20) DEFAULT 'OPEN'    -- OPEN, CLOSED, CANCELLED, COMPLETED
CHECK (arrival_time > departure_time)
INDEX (route_id, departure_time)
```

**Ghi chú trạng thái:**
- `OPEN → CLOSED`: tự động bởi `tripCloser` job (60 phút trước giờ khởi hành).
- `OPEN/CLOSED → COMPLETED`: do DRIVER xác nhận hoàn thành chuyến (mục 6.4).
- Admin có quyền CRUD đầy đủ: tạo, sửa thông tin, đổi giá override, gán/đổi driver, đóng/mở/xóa chuyến.

### trip_seat_status
```sql
id                BIGSERIAL PRIMARY KEY
trip_id           BIGINT REFERENCES trips(id)
seat_id           BIGINT REFERENCES seats(id)
status            VARCHAR(15) DEFAULT 'AVAILABLE'  -- AVAILABLE, LOCKED, CONFIRMED
locked_until      TIMESTAMPTZ
locked_by_user_id BIGINT REFERENCES users(id)
UNIQUE (trip_id, seat_id)
PARTIAL INDEX ON (trip_id, locked_until) WHERE status = 'LOCKED'
```

### bookings
```sql
id               BIGSERIAL PRIMARY KEY
user_id          BIGINT REFERENCES users(id)
trip_id          BIGINT REFERENCES trips(id)
pickup_stop_id   INT REFERENCES route_stops(id)
dropoff_stop_id  INT REFERENCES route_stops(id)
total_amount     INT           -- đã áp dụng giảm 20% nếu user là VIP_CUSTOMER tại thời điểm đặt (BR-08)
payment_method   VARCHAR(20) DEFAULT 'ONLINE'  -- ONLINE, CASH, WALLET
status           VARCHAR(20) DEFAULT 'PENDING'
  -- PENDING, CASH_PENDING, CONFIRMED, CANCELLED, COMPLETED
expires_at       TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT NOW()
INDEX (user_id)
INDEX (trip_id)
```

**Ghi chú trạng thái mới:**
- `CONFIRMED → COMPLETED`: do CUSTOMER xác nhận hoàn thành chuyến sau khi `trips.status = COMPLETED` (REQ-09). Đây là điều kiện để mở đánh giá.
- Mọi trạng thái (kể cả `CASH_PENDING`) đều hiển thị mã đặt chỗ (booking ID) cho khách ngay lập tức (BR-15).

### booking_seats
```sql
id               BIGSERIAL PRIMARY KEY
booking_id       BIGINT REFERENCES bookings(id)
seat_id          BIGINT REFERENCES seats(id)
passenger_name   VARCHAR(200)
passenger_phone  VARCHAR(15)
```

### payments
```sql
id                   BIGSERIAL PRIMARY KEY
booking_id           BIGINT REFERENCES bookings(id)
gateway              VARCHAR(20)   -- VNPAY, MOMO, CARD, WALLET, CASH
gateway_txn_id       VARCHAR(100) UNIQUE
amount               INT
status               VARCHAR(15) DEFAULT 'PENDING'  -- PENDING, SUCCESS, FAILED, REFUNDED
paid_at              TIMESTAMPTZ
gateway_raw_response TEXT
```

### tickets
```sql
id               BIGSERIAL PRIMARY KEY
booking_id       BIGINT REFERENCES bookings(id)
booking_seat_id  BIGINT REFERENCES booking_seats(id)
qr_code          VARCHAR(255) UNIQUE   -- PAM-{bookingId}-{seatId}-{timestamp}
status           VARCHAR(15) DEFAULT 'ISSUED'  -- ISSUED, USED, CANCELLED
checked_in_at    TIMESTAMPTZ
checked_in_by    BIGINT REFERENCES users(id)  -- driver id
```

**Ghi chú quan trọng:** vé QR được phát hành ngay khi booking chuyển `CONFIRMED`, bất kể phương thức thanh toán là Ví/Online (ngay lập tức) hay Tiền mặt (sau khi driver xác nhận thu tiền qua `confirm-cash`). Customer luôn xem được mã/QR vé trong "Vé của tôi".

### refunds
```sql
id           BIGSERIAL PRIMARY KEY
booking_id   BIGINT REFERENCES bookings(id)
payment_id   BIGINT REFERENCES payments(id)
amount       INT
refund_rate  NUMERIC(3,2)   -- 0.90 (hoàn 90%)
status       VARCHAR(15) DEFAULT 'PENDING'
requested_at TIMESTAMPTZ DEFAULT NOW()
processed_at TIMESTAMPTZ
```

### wallet_transactions
```sql
id            BIGSERIAL PRIMARY KEY
user_id       BIGINT REFERENCES users(id)
type          VARCHAR(20)   -- TOPUP, PAYMENT, REFUND, BONUS
amount        BIGINT        -- dương = cộng, âm = trừ
balance_after BIGINT        -- số dư sau giao dịch
description   TEXT          -- ví dụ: "Admin nạp hộ", "Nạp tiền vào ví", "Thanh toán đơn #12"
booking_id    BIGINT REFERENCES bookings(id)  -- NULL nếu là TOPUP
created_at    TIMESTAMPTZ DEFAULT NOW()
INDEX (user_id, created_at)
```

**Ghi chú:** mỗi giao dịch TOPUP (do customer tự nạp hoặc admin nạp hộ) đều ghi vào bảng này. Sau mỗi TOPUP, hệ thống kiểm tra **tổng tích lũy nạp** của user — nếu đạt điều kiện VIP (BR-07) sẽ tự động cập nhật `users.loyalty_tier`.

### banners
```sql
id            SERIAL PRIMARY KEY
title         VARCHAR(200)
image_url     TEXT
link_url      TEXT
operator_id   INT REFERENCES operators(id)
is_active     BOOLEAN DEFAULT TRUE
display_order INT DEFAULT 0
```

### popular_routes
```sql
id            SERIAL PRIMARY KEY
route_id      INT REFERENCES routes(id)
image_url     TEXT          -- ảnh điểm đến
description   VARCHAR(300)
display_order INT DEFAULT 0
is_active     BOOLEAN DEFAULT TRUE
```

### faqs
```sql
id       SERIAL PRIMARY KEY
keywords TEXT        -- "thanh toán,payment,trả tiền"
question VARCHAR(500)
answer   TEXT
category VARCHAR(50) -- general, payment, booking, cancel
```

### reviews
```sql
id         BIGSERIAL PRIMARY KEY
trip_id    BIGINT REFERENCES trips(id)
user_id    BIGINT REFERENCES users(id)
booking_id BIGINT REFERENCES bookings(id)
rating     INT CHECK (rating BETWEEN 1 AND 5)
comment    TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE (booking_id, user_id)
```

**Điều kiện đánh giá (BR-16):** chỉ cho phép tạo review khi `trips.status = COMPLETED` **và** `bookings.status = COMPLETED` (customer đã xác nhận hoàn thành). Mỗi booking chỉ đánh giá một lần.

### notifications
```sql
id         BIGSERIAL PRIMARY KEY
user_id    BIGINT REFERENCES users(id)
type       VARCHAR(30)   -- BOOKING_CONFIRMED, OTP_PAYMENT, OTP_TOPUP, TRIP_REMINDER, REFUND_PROCESSED...
content    TEXT          -- JSON string chứa OTP hoặc plain text
is_read    BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
PARTIAL INDEX ON (user_id) WHERE is_read = FALSE
```

---

## 4. Cập nhật theo yêu cầu mới (so với v2.0)

Bảng dưới đây tổng hợp các thay đổi business rule đã chốt, ánh xạ trực tiếp tới schema:

| Mã | Nội dung thay đổi | Ảnh hưởng schema |
|----|--------------------|-------------------|
| **BR-07** (sửa) | Điều kiện VIP_CUSTOMER: **tổng tiền nạp ví tích lũy ≥ 10.000.000đ** HOẶC tổng vé CONFIRMED ≥ 10 vé | Tính từ `SUM(wallet_transactions.amount) WHERE type='TOPUP'` + `users.total_tickets`; ghi vào `users.loyalty_tier` |
| **BR-08** (mới) | VIP_CUSTOMER được giảm **20%** giá vé khi đặt vé tiếp theo | Áp dụng tại thời điểm tính `bookings.total_amount` |
| **BR-09** | Số dư ví không âm | `users.wallet_balance` (BIGINT, kiểm tra ở backend trước khi trừ) |
| **BR-15** | Booking CASH_PENDING hiển thị booking ID ngay sau khi đặt | Không đổi schema — chỉ là yêu cầu UI/API response |
| **BR-16** (mới) | Customer chỉ đánh giá được khi `trip.status=COMPLETED` và `booking.status=COMPLETED` | `reviews` table, kiểm tra điều kiện ở backend |
| **BR-17** (mới) | DRIVER không có và không được cài `payment_pin` | `users.payment_pin` — Settings của DRIVER ẩn mục này, backend không cho phép set PIN nếu role=DRIVER |
| **BR-18** (mới) | `avatar_url` hiển thị cạnh tên trên header — mọi vai trò | `users.avatar_url` (đã có) |
| **BR-19** (mới) | Admin nâng `loyalty_tier = VIP_CUSTOMER` thủ công bất kỳ lúc nào | `users.loyalty_tier`, thao tác qua `PUT /admin/users/:id/vip` |
| **BR-20** (mới) | Admin nạp tiền hộ customer | Ghi `wallet_transactions` (type=TOPUP, description="Admin nạp hộ"), cộng `users.wallet_balance`, qua `POST /admin/users/:id/topup` |
| **BR-21** (mới) | Admin CRUD đầy đủ: users (xem/thêm/sửa/xóa/phân quyền/khóa), trips (tạo/sửa/đóng/mở/xóa/gán driver), operators, vehicles, routes | Không đổi schema — bổ sung route CRUD ở `admin.js` |
| **BR-22** (mới) | Driver: có tab "Lịch sử chuyến" (các chuyến `COMPLETED`/`CANCELLED` đã qua) và nút "Xác nhận hoàn thành chuyến" | `trips.status`, `trips.assigned_driver_id` — query thêm theo `status IN (...)` |
| **REQ-09** (mở rộng) | Sau khi driver hoàn thành chuyến, customer xác nhận hoàn thành booking rồi đánh giá 1-5 sao | `bookings.status='COMPLETED'`, `reviews` |
| **BO-13** (kéo từ Phase 2) | Đánh giá chuyến đi đưa vào MVP | `reviews` đã có sẵn trong schema gốc, chỉ cần bật luồng |

---

## 5. Phân quyền & CRUD theo vai trò (tóm tắt)

### ADMIN
- **Users**: GET (list, filter theo role, ẩn ADMIN khác — BR-14), POST (tạo mới + chọn role), PUT (sửa info/role), DELETE hoặc khóa (`is_active=false`)
  - `PUT /admin/users/:id/role` — phân quyền CUSTOMER ↔ DRIVER
  - `POST /admin/users/:id/topup` — nạp tiền hộ (BR-20)
  - `PUT /admin/users/:id/vip` — nâng VIP thủ công (BR-19)
- **Trips**: GET/POST/PUT/DELETE đầy đủ + gán driver qua `assigned_driver_id`
- **Operators / Vehicles / Routes / Banners / Popular Routes**: CRUD đầy đủ
- **Bookings / Payments / Refunds**: chỉ xem (read-only), không tham gia booking flow (BR-13)
- **Settings**: tên, SĐT, email, mật khẩu, avatar — không có PIN, không có ví

### DRIVER
- Xem chuyến được phân công (sắp tới + lịch sử `COMPLETED`/`CANCELLED`)
- Xem manifest hành khách, xác nhận thu tiền mặt (`confirm-cash`)
- Quét QR check-in (`ISSUED → USED`)
- **Xác nhận hoàn thành chuyến** (`trips.status → COMPLETED`)
- **Settings**: tên, SĐT, email, mật khẩu, avatar — **KHÔNG có PIN, KHÔNG có ví** (BR-17)

### CUSTOMER
- Tìm kiếm, đặt vé, thanh toán (Ví/Tiền mặt/Online mock)
- "Vé của tôi": mọi booking đều có booking ID + mã/QR vé sau khi `CONFIRMED` (bất kể phương thức thanh toán)
- Hủy vé (PENDING/CASH_PENDING miễn phí, CONFIRMED hoàn 90%)
- Nạp ví (PIN+OTP) — tích lũy ≥10tr → tự động VIP + giảm 20% (BR-07, BR-08)
- Sau chuyến `COMPLETED`: xác nhận hoàn thành booking → đánh giá 1-5 sao (REQ-09, BR-16)
- **Settings**: tên, SĐT, email, mật khẩu, avatar, PIN thanh toán, ví điện tử, hạng thành viên

---

## 6. Script ALTER TABLE (chạy trong DataGrip)

```sql
-- Thêm cột mới vào users
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_pin VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tickets INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_trips INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance BIGINT DEFAULT 0;

-- Thêm cột mới vào operators
ALTER TABLE operators ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 5.0;

-- Thêm cột mới vào trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS assigned_driver_id BIGINT REFERENCES users(id);

-- Thêm cột mới vào bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'ONLINE';

-- Tạo bảng mới
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  type          VARCHAR(20) NOT NULL,
  amount        BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description   TEXT,
  booking_id    BIGINT REFERENCES bookings(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id, created_at);

CREATE TABLE IF NOT EXISTS banners (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200),
  image_url     TEXT,
  link_url      TEXT,
  operator_id   INT REFERENCES operators(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS popular_routes (
  id            SERIAL PRIMARY KEY,
  route_id      INT NOT NULL REFERENCES routes(id),
  image_url     TEXT,
  description   VARCHAR(300),
  display_order INT DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS faqs (
  id       SERIAL PRIMARY KEY,
  keywords TEXT NOT NULL,
  question VARCHAR(500),
  answer   TEXT NOT NULL,
  category VARCHAR(50)
);
```

---

## 7. Tên relation Prisma (quan trọng, dễ nhầm)

```javascript
// routes → provinces (phải dùng đúng tên này)
provinces_routes_origin_province_idToprovinces
provinces_routes_destination_province_idToprovinces

// Chú ý: chữ 'p' trong 'Toprovinces' là THƯỜNG
// ĐÚNG: Toprovinces
// SAI:  TopProvinces
```

---

## 8. Lưu ý kỹ thuật

```javascript
// BẮT BUỘC ở đầu server.js — xử lý BigInt từ PostgreSQL
BigInt.prototype.toJSON = function() { return Number(this); };

// Tất cả ID từ Prisma là BigInt, phải convert khi trả JSON
id: Number(record.id)

// DATABASE_URL trong .env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/pam_travel?schema=public"
```

---

## 9. Việc cần làm tiếp (Backend gaps theo yêu cầu mới)

| Hạng mục | Trạng thái | Việc cần làm |
|----------|-----------|--------------|
| VIP theo tổng nạp ≥10tr + giảm 20% | Chưa có | Thêm hàm tính tổng TOPUP trong `wallet.js` sau mỗi lần nạp; áp dụng giảm giá trong `bookings.js` khi tạo booking |
| Admin nạp tiền hộ | Chưa có | `POST /admin/users/:id/topup` trong `admin.js` |
| Admin nâng VIP thủ công | Chưa có | `PUT /admin/users/:id/vip` trong `admin.js` |
| Admin CRUD users đầy đủ | Một phần (chỉ GET) | Thêm POST/PUT/DELETE/role trong `admin.js` |
| Admin CRUD trips đầy đủ | Một phần (chỉ PUT gán driver) | Thêm POST/DELETE trong `admin.js` |
| Driver xác nhận hoàn thành chuyến | Chưa có | `PUT /driver/trips/:id/complete` trong `driver.js` |
| Driver lịch sử chuyến | Chưa có | Mở rộng `GET /driver/trips` trả cả chuyến đã qua |
| Customer xác nhận hoàn thành booking | Chưa có | `POST /bookings/:id/complete` trong `bookings.js` |
| Reviews API | Chưa có | `POST /reviews`, `GET /reviews/trip/:tripId` — file `reviews.js` mới |
| Driver Settings ẩn PIN | Frontend cần kiểm tra `auth.user.role !== 'DRIVER'` | `SettingsView.vue` |
| Chatbot | Chưa có | `POST /api/chatbot` + bảng `faqs` (đã có data) |