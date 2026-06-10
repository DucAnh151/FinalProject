# DATABASE_OVERVIEW — Tổng quan Cơ sở dữ liệu
## Pam Travel v2.0 · PostgreSQL 18

---

## 1. Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Database | pam_travel |
| Schema | public |
| Tổng số bảng | 23 bảng |
| ORM | Prisma 5 |

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
| **Chuyến đi** | trips | Chuyến xe cụ thể |
| | trip_seat_status | Trạng thái ghế theo chuyến |
| **Người dùng** | users | CUSTOMER, DRIVER, ADMIN |
| **Đặt vé** | bookings | Đơn đặt vé |
| | booking_seats | Ghế trong từng đơn |
| **Thanh toán** | payments | Giao dịch thanh toán |
| | tickets | Vé điện tử QR |
| | refunds | Hoàn tiền |
| **Ví điện tử** | wallet_transactions | Lịch sử giao dịch ví |
| **UI/Content** | banners | Banner quảng cáo nhà xe |
| | popular_routes | Tuyến phổ biến landing page |
| | faqs | Câu hỏi chatbot |
| **Phụ trợ** | reviews | Đánh giá chuyến đi |
| | notifications | Thông báo + OTP |

---

## 3. Chi tiết từng bảng

### users
```sql
id              BIGSERIAL PRIMARY KEY
phone_number    VARCHAR(15) UNIQUE
email           VARCHAR(255) UNIQUE
full_name       VARCHAR(200)
password_hash   VARCHAR(255)
payment_pin     VARCHAR(255)          -- bcrypt hash PIN 6 số
role            VARCHAR(15)           -- CUSTOMER, DRIVER, ADMIN
loyalty_tier    VARCHAR(20) DEFAULT 'STANDARD'  -- STANDARD, VIP_CUSTOMER
total_tickets   INT DEFAULT 0         -- tổng vé đã đặt (CONFIRMED)
total_trips     INT DEFAULT 0         -- tổng chuyến đã đi (COMPLETED)
wallet_balance  BIGINT DEFAULT 0      -- số dư ví (đơn vị: đồng)
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
```

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
assigned_driver_id BIGINT REFERENCES users(id)  -- driver phụ trách
departure_time     TIMESTAMPTZ
arrival_time       TIMESTAMPTZ
price_override     INT                           -- NULL = dùng base_price
status             VARCHAR(20) DEFAULT 'OPEN'    -- OPEN, CLOSED, CANCELLED, COMPLETED
CHECK (arrival_time > departure_time)
INDEX (route_id, departure_time)
```

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
total_amount     INT
payment_method   VARCHAR(20) DEFAULT 'ONLINE'  -- ONLINE, CASH, WALLET
status           VARCHAR(20) DEFAULT 'PENDING'
  -- PENDING, CONFIRMED, CANCELLED, COMPLETED, CASH_PENDING
expires_at       TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT NOW()
INDEX (user_id)
INDEX (trip_id)
```

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
description   TEXT
booking_id    BIGINT REFERENCES bookings(id)  -- NULL nếu là TOPUP
created_at    TIMESTAMPTZ DEFAULT NOW()
INDEX (user_id, created_at)
```

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

### notifications
```sql
id         BIGSERIAL PRIMARY KEY
user_id    BIGINT REFERENCES users(id)
type       VARCHAR(30)   -- BOOKING_CONFIRMED, OTP_PAYMENT, OTP_TOPUP, TRIP_REMINDER...
content    TEXT          -- JSON string chứa OTP hoặc plain text
is_read    BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
PARTIAL INDEX ON (user_id) WHERE is_read = FALSE
```

---

## 4. Script ALTER TABLE (chạy trong DataGrip)

```sql
-- Thêm cột mới vào users
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_pin VARCHAR(255);
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

## 5. Tên relation Prisma (quan trọng, dễ nhầm)

```javascript
// routes → provinces (phải dùng đúng tên này)
provinces_routes_origin_province_idToprovinces
provinces_routes_destination_province_idToprovinces

// Chú ý: chữ 'p' trong 'Toprovinces' là THƯỜNG
// ĐÚNG: Toprovinces
// SAI:  TopProvinces
```

---

## 6. Lưu ý kỹ thuật

```javascript
// BẮT BUỘC ở đầu server.js — xử lý BigInt từ PostgreSQL
BigInt.prototype.toJSON = function() { return Number(this); };

// Tất cả ID từ Prisma là BigInt, phải convert khi trả JSON
id: Number(record.id)

// DATABASE_URL trong .env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/pam_travel?schema=public"
```