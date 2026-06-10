# SRS — Software Requirements Specification
## Pam Travel v2.0

| Thông tin | Chi tiết |
|-----------|----------|
| Phiên bản | 2.0 |
| Ngày cập nhật | 09/06/2026 |
| Stack | Node.js 22 · Express · Prisma 5 · Vue.js 3 · Vite · PostgreSQL 18 |

---

## 1. Kiến trúc hệ thống

```
┌─────────────────┐     HTTP/REST      ┌──────────────────────┐
│  Vue.js 3       │ ──────────────────▶ │  Express API         │
│  Vite (5173)    │ ◀────────────────── │  Node.js (3001)      │
│  Pinia · Router │                     │  Prisma ORM          │
└─────────────────┘                     └──────────┬───────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │  PostgreSQL 18      │
                                         │  20 bảng           │
                                         └────────────────────┘
```

---

## 2. API Endpoints

### Auth
```
POST /api/auth/register     { fullName, phone, email, password }
POST /api/auth/login        { identifier, password }
PUT  /api/auth/profile      { fullName, phone, email }
PUT  /api/auth/pin          { userId, pin }
```

### Trips
```
GET  /api/trips/provinces
GET  /api/trips/search          ?originId&destinationId&departureDate
GET  /api/trips/:id/seat-map
GET  /api/trips/:id/stops
GET  /api/trips/popular         (tuyến phổ biến cho landing)
```

### Bookings
```
POST /api/bookings              { userId, tripId, pickupStopId, dropoffStopId, selectedSeatIds, passengers[] }
GET  /api/bookings/my           ?userId
PUT  /api/bookings/:id/cancel   (hủy vé, tính phí 10%)
GET  /api/bookings/:id          (chi tiết booking)
```

### Payments
```
POST /api/payments/set-pin      { userId, pin }
POST /api/payments/initiate     { bookingId, userId, gateway, pin }
POST /api/payments/confirm      { paymentId, userId, otp }
```

### Wallet
```
GET  /api/wallet/:userId                    (số dư + lịch sử)
POST /api/wallet/topup/initiate             { userId, amount, method, pin }
POST /api/wallet/topup/confirm              { transactionId, userId, otp }
POST /api/wallet/pay                        { bookingId, userId, pin, otp }
```

### Tickets
```
GET  /api/tickets/:id
POST /api/tickets/check-in                  { qrCode, driverId }
```

### Driver
```
GET  /api/driver/trips              ?driverId (chuyến được phân công)
GET  /api/driver/trips/:id/manifest (danh sách khách)
PUT  /api/driver/bookings/:id/confirm-cash  { driverId }
PUT  /api/driver/trips/:id/complete         { driverId }
POST /api/driver/bookings                   (đặt hộ khách)
```

### Admin
```
GET/POST/PUT/DELETE /api/admin/users
GET/POST/PUT/DELETE /api/admin/operators
GET/POST/PUT/DELETE /api/admin/vehicles
GET/POST/PUT/DELETE /api/admin/routes
GET/POST/PUT/DELETE /api/admin/trips
GET/POST/PUT/DELETE /api/admin/banners
GET/POST/PUT/DELETE /api/admin/popular-routes
GET                 /api/admin/stats         ?from&to
```

### Chatbot
```
POST /api/chatbot               { message }
```

### Landing
```
GET /api/landing/banners
GET /api/landing/popular-routes
GET /api/landing/operators
```

---

## 3. Yêu cầu chức năng chi tiết

### REQ-01: Landing Page (công khai)
- Hiển thị không cần đăng nhập
- Hero section: ảnh/video nền + search box
- Trust signals: số lượng chuyến, nhà xe, đánh giá
- Tuyến phổ biến: ảnh điểm đến + giá từ
- Nhà xe nổi bật: logo + rating
- Quy trình 4 bước
- Banner quảng cáo nhà xe

### REQ-02: Authentication
- Đăng ký: fullName + phone/email + password (≥6 ký tự)
- Đăng nhập: email hoặc SĐT + password
- JWT lưu trong sessionStorage
- Navigation guard redirect theo role

### REQ-03: Trip Search
- Input: originId, destinationId, departureDate
- Output: danh sách trips với origin, destination, operator, vehicleType, price, departureTime, arrivalTime
- Filter: theo khung giờ, loại xe, nhà xe
- Sort: giá tăng dần, giờ sớm nhất

### REQ-04: Seat Map
- Render động từ `seat_layout_json` (JSONB)
- Màu ghế: xanh (AVAILABLE), vàng (LOCKED), xám (CONFIRMED)
- Polling 5 giây cập nhật trạng thái
- Tối đa 5 ghế/lần

### REQ-05: Booking
- Nhập thông tin từng hành khách (tên, SĐT)
- Checkbox "Tôi là người đi" → tự điền từ tài khoản
- Chọn điểm đón/trả từ route_stops
- Countdown 5 phút seat lock
- Cảnh báo: "Hủy vé sẽ mất 10% phí"

### REQ-06: Payment
**Bước 1 — Chọn phương thức:**
- Ví điện tử (hiện số dư)
- Tiền mặt (CASH_PENDING, driver confirm)
- Online mock (VNPAY/MOMO giả)

**Bước 2 — Xác nhận PIN (không áp dụng Tiền mặt)**

**Bước 3 — Xác nhận OTP (không áp dụng Tiền mặt)**

**Bước 4 — Kết quả:**
- Online/Ví → CONFIRMED + sinh ticket QR
- Tiền mặt → CASH_PENDING (chờ driver confirm)

### REQ-07: Wallet
- Hiển thị số dư trên navbar + trang Settings
- Nạp tiền: số tiền + phương thức nạp + PIN + OTP
- Lịch sử giao dịch: loại, số tiền, thời gian
- Không cho số dư âm

### REQ-08: Cancel Booking
- Hủy bất kỳ lúc nào
- Phí 10%, hoàn 90%
- Nếu thanh toán bằng ví → hoàn trực tiếp vào ví
- Ghế về AVAILABLE ngay lập tức

### REQ-09: Driver Features
- Xem danh sách chuyến được assigned
- Xem manifest: tên, SĐT, ghế, điểm đón/trả
- Quét QR: ISSUED → USED
- Confirm tiền mặt: CASH_PENDING → CONFIRMED
- Đặt vé hộ: chọn chuyến → ghế → nhập thông tin khách → tiền mặt
- Đánh dấu chuyến hoàn thành: OPEN → COMPLETED

### REQ-10: Admin Features
- CRUD đầy đủ: users, operators, vehicles, routes, trips
- Assign driver cho trip
- Quản lý banners + popular routes
- Thống kê: doanh thu theo ngày/tháng, số booking, số user mới
- Không tham gia booking flow

### REQ-11: VIP Tier
- Tự động nâng VIP khi: total_tickets ≥ 10 HOẶC total_trips ≥ 10
- VIP_CUSTOMER hiển thị badge đặc biệt
- (Ưu đãi cụ thể: Phase 2)

### REQ-12: Chatbot
- Widget góc phải màn hình
- Nhận message → tìm keyword trong bảng faqs
- Trả text hướng dẫn có sẵn
- Nếu không tìm thấy → "Xin lỗi, tôi chưa có thông tin về vấn đề này. Vui lòng liên hệ hotline."

### REQ-13: Dark Mode + i18n
- Dark/Light toggle lưu vào localStorage
- i18n: VI/EN, lưu preference vào localStorage
- Áp dụng toàn site

### REQ-14: Settings
- Đổi thông tin cá nhân (tên, SĐT, email)
- Set/Đổi PIN thanh toán
- Xem số dư ví
- Lịch sử giao dịch ví

---

## 4. Yêu cầu phi chức năng

| Mã | Yêu cầu | Mục tiêu |
|----|---------|---------|
| NFR-01 | Performance | Search API < 2s · Seat map < 1s |
| NFR-02 | Concurrency | Không double booking, dùng DB transaction |
| NFR-03 | Security | JWT · bcrypt · PIN hash · không expose password |
| NFR-04 | Usability | Hướng dẫn sử dụng trên mỗi trang · responsive |
| NFR-05 | Accessibility | Dark mode · font size đọc được |

---

## 5. Cấu trúc Frontend

```
frontend/src/ 
├── views/
│   ├── LandingView.vue       ← Trang chủ công khai
│   ├── LoginView.vue         ← Đăng nhập + Đăng ký
│   ├── HomeView.vue          ← Search (đã đăng nhập)
│   ├── SearchView.vue        ← Kết quả tìm kiếm
│   ├── SeatMapView.vue       ← Sơ đồ ghế
│   ├── BookingView.vue       ← Nhập thông tin
│   ├── PaymentView.vue       ← Thanh toán
│   ├── MyTicketsView.vue     ← Vé của tôi
│   ├── SettingsView.vue      ← Cài đặt + Ví
│   ├── DriverView.vue        ← Driver dashboard
│   └── AdminView.vue         ← Admin dashboard
├── components/
│   ├── AppHeader.vue         ← Header dùng chung
│   ├── AppFooter.vue         ← Footer dùng chung
│   ├── ChatBot.vue           ← Widget chatbot
│   ├── SeatGrid.vue          ← Render sơ đồ ghế
│   ├── QRTicket.vue          ← Hiển thị QR
│   └── DarkModeToggle.vue    ← Toggle sáng/tối
├── stores/
│   ├── authStore.js
│   ├── bookingStore.js
│   └── uiStore.js            ← darkMode, locale
├── services/
│   ├── api.js
│   └── i18n.js
└── locales/
    ├── vi.js
    └── en.js
```

---

## 6. Cấu trúc Backend

```
js/
├── server.js
├── routes/
│   ├── auth.js
│   ├── trips.js
│   ├── bookings.js
│   ├── payments.js
│   ├── wallet.js             ← MỚI
│   ├── tickets.js
│   ├── driver.js             ← MỚI
│   ├── admin.js
│   ├── landing.js            ← MỚI
│   └── chatbot.js            ← MỚI
└── jobs/
    ├── seatUnlocker.js
    └── tripCloser.js         ← MỚI (đóng trip 60 phút trước)
```