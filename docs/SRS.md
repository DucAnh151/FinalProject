# SRS — Software Requirements Specification
## Pam Travel v2.2

| Thông tin | Chi tiết |
|-----------|----------|
| Phiên bản | 2.2 |
| Ngày cập nhật | 12/06/2026 |
| Người thực hiện | Sinh viên đồ án tốt nghiệp |
| Stack | Node.js 22 · Express · Prisma 5 · Vue.js 3 · Vite · PostgreSQL 18 |
| Tham chiếu | BRD Pam Travel v2.2 |

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
                                         │  23 bảng           │
                                         └────────────────────┘
```

**Background Jobs:**
- `seatUnlocker` — chạy mỗi 60 giây, nhả ghế LOCKED hết hạn
- `tripCloser` — chạy mỗi 5 phút, đóng chuyến trước 60 phút khởi hành

---

## 2. API Endpoints

### Auth
```
POST /api/auth/register         { fullName, phone, email, password }
POST /api/auth/login            { identifier, password }
PUT  /api/auth/profile          { userId, fullName, phone, email, avatarUrl }
PUT  /api/auth/password         { userId, currentPassword, newPassword }
```

### Trips
```
GET  /api/trips/provinces
GET  /api/trips/search          ?originId&destinationId&departureDate
GET  /api/trips/:id/seat-map
GET  /api/trips/:id/stops
```

### Bookings
```
POST /api/bookings              { userId, tripId, pickupStopId, dropoffStopId, selectedSeatIds }
PUT  /api/bookings/:id/passengers { passengers[], pickupStopId, dropoffStopId }
GET  /api/bookings/my           ?userId
GET  /api/bookings/:id
POST /api/bookings/:id/cancel   { userId }
POST /api/bookings/:id/complete { userId }   ← Customer xác nhận hoàn thành chuyến
```

### Payments
```
POST /api/payments/set-pin      { userId, pin }
POST /api/payments/initiate     { bookingId, userId, gateway, pin }
POST /api/payments/confirm      { paymentId, userId, otp }
POST /api/payments/recharge     { userId, amount, pin }   ← nạp tiền không cần OTP (admin)
```

### Wallet
```
GET  /api/wallet/:userId
POST /api/wallet/topup/initiate { userId, amount, pin }
POST /api/wallet/topup/confirm  { userId, amount, otp }
```

### Tickets
```
POST /api/tickets/check-in      { qrCode, driverId }
```

### Reviews
```
POST /api/reviews               { tripId, userId, bookingId, rating, comment }
GET  /api/reviews/trip/:tripId
```

### Driver
```
GET  /api/driver/trips                      ?driverId   (tất cả: sắp tới + đã qua)
GET  /api/driver/trips/:id/manifest
PUT  /api/driver/bookings/:id/confirm-cash  { driverId }
PUT  /api/driver/trips/:id/complete         { driverId }
```

### Admin — Users
```
GET    /api/admin/users                     ?role
POST   /api/admin/users                     { fullName, phone, email, password, role }
PUT    /api/admin/users/:id                 { fullName, phone, email, role, isActive }
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/role            { role }            ← phân quyền
POST   /api/admin/users/:id/topup           { amount }          ← nạp tiền hộ
PUT    /api/admin/users/:id/vip             {}                  ← nâng VIP thủ công
```

### Admin — Trips
```
GET    /api/admin/trips
POST   /api/admin/trips                     { routeId, vehicleId, operatorId, departureTime, arrivalTime, priceOverride }
PUT    /api/admin/trips/:id                 { assignedDriverId, status, priceOverride }
DELETE /api/admin/trips/:id
```

### Admin — Others
```
GET/POST/PUT/DELETE /api/admin/operators
GET/POST/PUT/DELETE /api/admin/vehicles
GET/POST/PUT/DELETE /api/admin/routes
GET/POST/PUT/DELETE /api/admin/banners
GET/POST/PUT/DELETE /api/admin/popular-routes
GET                 /api/admin/bookings
GET                 /api/admin/payments
GET                 /api/admin/stats        ?from&to
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
GET /api/landing/stats
```

---

## 3. Yêu cầu chức năng chi tiết

### REQ-01: Landing Page (công khai)
- Hiển thị hoàn toàn không cần đăng nhập
- Hero section: ảnh nền + search box (chọn tỉnh đi, tỉnh đến, ngày đi)
- Trust signals: số lượng chuyến, nhà xe, đánh giá trung bình, hỗ trợ 24/7
- Tuyến phổ biến: ảnh điểm đến + giá từ + nút "Đặt ngay"
- Nhà xe nổi bật: logo + mô tả + rating
- Quy trình 4 bước đặt vé
- Banner quảng cáo nhà xe
- Guest tìm kiếm → redirect sang login với thông báo "Đăng nhập để tiếp tục"
- Sau khi đăng nhập (ADMIN, DRIVER) → redirect về dashboard riêng; CUSTOMER ở lại LandingView

### REQ-02: Authentication
- Đăng ký: fullName + (phone hoặc email) + password ≥6 ký tự
- Đăng nhập: email hoặc SĐT + password
- Thông tin session lưu vào `sessionStorage` (key: `pam_user`)
- Navigation guard redirect theo role:
  - ADMIN → `/admin`
  - DRIVER → `/driver`
  - CUSTOMER → `/` (LandingView)
- Route `/admin`, `/driver` chặn sai role → redirect về trang chủ của role đó

### REQ-03: Trip Search
- Input: originId, destinationId, departureDate
- Không trả về chuyến khởi hành trong vòng 60 phút (BR-06)
- Output: origin, destination, operator, vehicleType, price, departureTime, arrivalTime, totalSeats
- Filter phía client: khung giờ (Sáng/Chiều/Tối), loại xe, nhà xe
- Sort: giá tăng, giá giảm, giờ sớm nhất, giờ muộn nhất
- Kết quả lưu vào `sessionStorage` để chuyển sang SearchView

### REQ-04: Seat Map
- Render động từ `seat_layout_json` (JSONB) — hỗ trợ 1 và 2 tầng
- Màu ghế: xanh (AVAILABLE), vàng (LOCKED), xám (CONFIRMED), cam (đang chọn)
- Polling 5 giây cập nhật trạng thái ghế từ server
- Nếu ghế đang chọn bị người khác lock → tự động bỏ chọn
- Tối đa 5 ghế/lần đặt (BR-02)
- Nếu customer là VIP_CUSTOMER → giá hiển thị đã giảm 20% (BR-08)

### REQ-05: Booking — Nhập thông tin hành khách
- Form nhập tên, SĐT cho từng ghế đã chọn
- Checkbox "Tôi là người đi" → tự điền thông tin từ tài khoản đang đăng nhập
- Chọn điểm đón (PICKUP) và điểm trả (DROPOFF) từ danh sách route_stops
- Countdown 5 phút hiển thị thời gian giữ ghế còn lại
- Cảnh báo: "Sau khi thanh toán, hủy vé sẽ bị tính phí 10%" (BR-05)
- Dữ liệu hành khách lưu vào `bookingStore` (Pinia) để khôi phục khi refresh

### REQ-06: Payment — Thanh toán
**Bước 1 — Chọn phương thức:**
- Ví điện tử (hiển thị số dư hiện tại)
- Tiền mặt (không cần PIN/OTP)
- Online mock: VNPAY, MoMo, Thẻ tín dụng

**Bước 2 — Nhập PIN** (bỏ qua nếu chọn Tiền mặt):
- PIN 6 số, bcrypt verify phía server
- Có ô cài PIN ngay tại trang nếu chưa thiết lập
- Kiểm tra số dư đủ nếu chọn Ví

**Bước 3 — Nhập OTP** (bỏ qua nếu chọn Tiền mặt):
- OTP 6 số, hiệu lực 5 phút, lưu trong bảng `notifications`
- Dev mode: OTP trả về trong response API để tiện test

**Bước 4 — Kết quả:**
- Ví / Online → booking `CONFIRMED` → sinh ticket QR ngay
- Tiền mặt → booking `CASH_PENDING` → hiển thị booking ID và mã đặt chỗ ngay (BR-15) → chờ driver confirm → `CONFIRMED` → sinh ticket QR

**VIP discount (BR-08):**
- Nếu customer là VIP_CUSTOMER → tổng tiền tự động giảm 20% trước khi gọi payment API

### REQ-07: Wallet — Ví điện tử
- Hiển thị số dư trên UserHeader (navbar) và trang Settings
- Nạp tiền: nhập số tiền → nhập PIN → sinh OTP → nhập OTP → cộng số dư → ghi `wallet_transactions`
- Kiểm tra tích lũy nạp: nếu tổng nạp ≥ 10.000.000 VNĐ → tự động nâng VIP (BR-07)
- Không cho phép số dư âm (BR-09)
- Lịch sử giao dịch: loại (TOPUP/PAYMENT/REFUND/BONUS), số tiền, số dư sau, mô tả, thời gian

### REQ-08: Cancel Booking — Hủy vé
- Hủy bất kỳ lúc nào trước khi chuyến khởi hành
- Booking `PENDING` (chưa thanh toán): hủy miễn phí
- Booking `CONFIRMED` (đã thanh toán): hoàn 90% vào ví, ghi `wallet_transactions` (BR-04)
- Booking `CASH_PENDING`: hủy miễn phí (chưa thu tiền thực tế)
- Ghế về `AVAILABLE` ngay lập tức sau khi hủy
- Ticket liên quan → `CANCELLED`

### REQ-09: Complete & Review — Xác nhận hoàn thành và đánh giá
- Sau khi driver đánh dấu trip `COMPLETED`, customer thấy nút "Xác nhận hoàn thành" trên vé
- Customer nhấn xác nhận → booking chuyển `COMPLETED`
- Sau xác nhận, customer có thể đánh giá chuyến 1–5 sao kèm nhận xét
- Mỗi booking chỉ đánh giá 1 lần (UNIQUE booking_id + user_id) (BR-16)
- Driver cũng thấy tab lịch sử chuyến với đầy đủ trạng thái

### REQ-10: My Tickets — Vé của tôi (CUSTOMER)
- Danh sách tất cả bookings của user, sắp xếp mới nhất lên đầu
- Filter: Tất cả / Đã xác nhận / Chờ thanh toán / Tiền mặt / Đã hủy
- Mỗi booking hiển thị: tuyến, giờ khởi hành, ghế, trạng thái, tổng tiền
- Chi tiết booking:
  - **Mọi trạng thái**: hiển thị booking ID + mã đặt chỗ (booking ID đủ để nhận diện)
  - **CONFIRMED**: hiển thị mã QR từng ghế (từ bảng `tickets`)
  - **CASH_PENDING**: hiển thị booking ID + thông báo "Chờ driver xác nhận thu tiền"
  - **PENDING**: nút "Thanh toán ngay" + nút "Hủy miễn phí"
  - **COMPLETED**: nút "Đánh giá chuyến đi"
- Nút Hủy vé với cảnh báo rõ phí (nếu booking `CONFIRMED`)
- Tự động polling 15 giây khi đang xem booking `CASH_PENDING` để cập nhật trạng thái

### REQ-11: Settings — Cài đặt tài khoản (mọi role)

**Thông tin cá nhân (tất cả role):**
- Upload ảnh đại diện (lưu base64 hoặc URL, hiển thị trên header cạnh tên)
- Sửa họ tên, số điện thoại, email
- Đổi mật khẩu: nhập mật khẩu hiện tại + mật khẩu mới ≥6 ký tự

**PIN thanh toán (chỉ CUSTOMER):**
- Cài mới hoặc đổi PIN 6 số
- Dùng khi thanh toán vé và nạp tiền ví

**Ví điện tử (chỉ CUSTOMER):**
- Hiển thị số dư hiện tại
- Nạp tiền (PIN + OTP flow)
- Lịch sử giao dịch

**Hạng thành viên (chỉ CUSTOMER):**
- Hiển thị loyalty_tier hiện tại (STANDARD / VIP_CUSTOMER)
- Hiển thị tổng số vé đã đặt và tổng số tiền đã nạp tích lũy
- Điều kiện lên VIP: nạp ≥10 triệu **hoặc** đặt ≥10 vé

**Driver Settings:** không có mục PIN thanh toán, không có mục ví điện tử (BR-17)

**Admin Settings:** không có mục PIN thanh toán, không có mục ví điện tử

### REQ-12: Driver Dashboard

**Tab Chuyến của tôi:**
- Danh sách tất cả chuyến được phân công: sắp tới và lịch sử đã qua
- Mỗi chuyến: tuyến, giờ khởi hành, nhà xe, loại xe, số hành khách, trạng thái
- Nút "Xem hành khách" → modal manifest
- Nút "Soát vé" → chuyển sang tab scanner với context chuyến đó

**Tab Soát vé:**
- Quét QR bằng camera (BarcodeDetector API) hoặc nhập thủ công
- Kết quả: xanh (hợp lệ, ISSUED → USED), đỏ (đã dùng hoặc đã hủy)
- Hiển thị thông tin hành khách khi check-in thành công
- Lịch sử check-in trong ca hiện tại

**Modal Manifest:**
- Danh sách hành khách: tên, SĐT, ghế, tầng, điểm đón, điểm trả, mã QR, trạng thái vé
- Danh sách booking CASH_PENDING cần xác nhận thu tiền
- Nút "Xác nhận đã thu tiền" → booking `CONFIRMED` → sinh QR → cộng thống kê loyalty
- Thống kê tổng hành khách / đã check-in

**Xác nhận hoàn thành chuyến:**
- Nút "Hoàn thành chuyến" trên card chuyến đang diễn ra
- Trip `OPEN`/`CLOSED` → `COMPLETED`
- Customer có thể đánh giá sau khi driver hoàn thành (BR-16)

### REQ-13: Admin Dashboard

**Tab Chuyến xe:**
- Xem danh sách chuyến (filter theo trạng thái)
- Tạo chuyến mới: chọn tuyến, xe, nhà xe, giờ khởi hành, giờ đến, giá override
- Sửa chuyến: thông tin cơ bản + phân công driver
- Đóng/mở/xóa chuyến
- Assign driver qua dropdown trong bảng

**Tab Người dùng:**
- Xem danh sách (filter theo role: CUSTOMER / DRIVER)
- Thêm tài khoản mới: nhập thông tin + chọn role ngay khi tạo
- Sửa thông tin: tên, SĐT, email
- Phân quyền: chuyển CUSTOMER ↔ DRIVER
- Nạp tiền hộ customer: nhập số tiền → cộng wallet_balance → ghi wallet_transactions
- Nâng VIP thủ công: set loyalty_tier = VIP_CUSTOMER ngay lập tức (AC-12)
- Khóa tài khoản: set is_active = false (không xóa vật lý)
- Admin không thấy tài khoản ADMIN khác trong danh sách (BR-14)

**Tab Đặt vé:**
- Xem toàn bộ bookings (filter theo trạng thái)
- Thông tin: khách hàng, tuyến, tổng tiền, ngày đặt, trạng thái

**Tab Thanh toán:**
- Xem danh sách payments + refunds
- Summary cards: tổng giao dịch, thành công, doanh thu, hoàn tiền

**Tab Thống kê:**
- Bar chart doanh thu theo ngày (14 ngày gần nhất)
- Donut chart trạng thái booking
- KPI cards: tổng doanh thu, giao dịch thành công, booking xác nhận, booking hủy
- Bảng top 5 ngày doanh thu cao nhất

**Quản lý nội dung:**
- CRUD Operators: tên, hotline, logo, banner, mô tả, rating
- CRUD Vehicles + vehicle_types
- CRUD Routes + route_stops
- CRUD Banners
- CRUD Popular routes

**Admin không tham gia booking flow** (BR-13)

### REQ-14: VIP Customer
- Điều kiện tự động (BR-07):
  - Tổng tiền nạp vào ví tích lũy ≥ 10.000.000 VNĐ, **hoặc**
  - Tổng vé CONFIRMED đặt ≥ 10 vé
- Kiểm tra sau mỗi lần nạp tiền và sau mỗi lần thanh toán thành công
- Admin có thể nâng VIP thủ công bất kỳ lúc nào (AC-12)
- Ưu đãi VIP (BR-08): giảm 20% giá vé khi đặt vé (tính trước khi hiển thị tổng tiền)
- Hiển thị badge "VIP" trên header cạnh tên

### REQ-15: Chatbot
- Widget cố định góc dưới phải màn hình, có thể mở/đóng
- Input: text message từ customer
- Xử lý phía server: tách keyword → tìm trong bảng `faqs` (trường `keywords`)
- Trả về `answer` nếu tìm thấy keyword khớp
- Không tìm thấy → trả về thông báo liên hệ hotline
- Chatbot chỉ hiển thị với CUSTOMER (không hiển thị với ADMIN, DRIVER)

### REQ-16: Ảnh đại diện
- Upload ảnh từ thiết bị → chuyển sang base64 → lưu vào trường `avatar_url` (TEXT) trong bảng `users`
- Hiển thị ảnh đại diện trên UserHeader (cạnh tên và role badge)
- Áp dụng cho tất cả role: CUSTOMER, DRIVER, ADMIN
- Nếu chưa có ảnh → hiển thị ảnh mặc định dạng SVG với chữ cái đầu tên
- Cập nhật ảnh trong session sau khi lưu thành công (BR-18)

### REQ-17: Dark Mode + i18n
- Dark/Light toggle: lưu preference vào `localStorage` (key: `pam_dark`)
- Áp dụng bằng class `.dark` trên root div, không reload trang
- i18n: Tiếng Việt / English, lưu vào `localStorage` (key: `pam_locale`)
- Toàn bộ text trong UI lấy từ uiStore (vi.js / en.js)
- Áp dụng cho tất cả View và Component

---

## 4. Yêu cầu phi chức năng

| Mã | Yêu cầu | Mục tiêu |
|----|---------|---------|
| NFR-01 | Performance | Search API < 2s · Seat map load < 1s · Dashboard load < 3s |
| NFR-02 | Concurrency | Không double booking — DB Transaction + upsert trip_seat_status |
| NFR-03 | Security | bcrypt password + PIN · sessionStorage token · không expose hash |
| NFR-04 | Usability | Hướng dẫn rõ ràng trên mỗi bước · responsive mobile |
| NFR-05 | Accessibility | Dark mode · font ≥14px · tương phản màu đủ |
| NFR-06 | Reliability | Background jobs chạy liên tục, log lỗi nhưng không crash server |

---

## 5. Cấu trúc Frontend

```
frontend/src/
├── views/
│   ├── LandingView.vue       ← Trang chủ công khai + tìm kiếm
│   ├── LoginView.vue         ← Đăng nhập + Đăng ký
│   ├── RegisterView.vue      ← Redirect sang /login?tab=register
│   ├── SearchView.vue        ← Kết quả tìm kiếm + filter + sort
│   ├── SeatMapView.vue       ← Sơ đồ ghế động + polling
│   ├── BookingView.vue       ← Nhập thông tin hành khách + điểm đón/trả
│   ├── PaymentView.vue       ← Thanh toán đa phương thức (3 bước)
│   ├── MyTicketsView.vue     ← Vé của tôi + QR + hủy + đánh giá
│   ├── SettingsView.vue      ← Cài đặt cá nhân + ví + PIN (theo role)
│   ├── DriverView.vue        ← Manifest + Scanner + lịch sử chuyến
│   └── AdminView.vue         ← Dashboard admin (5 tab)
│
├── components/
│   ├── UserHeader.vue        ← Header khi đã đăng nhập (avatar + dropdown)
│   ├── PublicHeader.vue      ← Header trang landing (guest)
│   ├── PublicFooter.vue      ← Footer trang landing
│   └── ChatBot.vue           ← Widget chatbot (chỉ CUSTOMER)
│
├── stores/
│   ├── authStore.js          ← user session, login, logout, updateProfile
│   ├── bookingStore.js       ← trạng thái đặt vé xuyên các bước, localStorage
│   └── uiStore.js            ← darkMode, locale, i18n copy (vi/en)
│
├── services/
│   └── api.js                ← Axios instance, interceptors auth + 401 redirect
│
├── router/
│   └── index.js              ← Routes + navigation guards theo role
│
├── App.vue                   ← Root component, apply dark class
├── main.js                   ← createApp, Pinia, Router, uiStore.init()
└── style.css                 ← CSS variables, base styles
```

---

## 6. Cấu trúc Backend

```
backend/
├── server.js                 ← Express app, middleware, route mounting, jobs
│
├── routes/
│   ├── auth.js               ← register, login, profile, password
│   ├── trips.js              ← search, provinces, seat-map, stops
│   ├── bookings.js           ← create, my, cancel, passengers, complete
│   ├── payments.js           ← set-pin, initiate, confirm, recharge (admin)
│   ├── wallet.js             ← balance, topup initiate/confirm
│   ├── tickets.js            ← check-in
│   ├── reviews.js            ← create review sau chuyến COMPLETED
│   ├── driver.js             ← trips, manifest, confirm-cash, complete-trip
│   ├── admin.js              ← CRUD users/trips/operators/vehicles/routes/banners
│   ├── landing.js            ← banners, popular-routes, operators, stats
│   └── chatbot.js            ← keyword-based FAQ response
│
├── lib/
│   └── bookingConfirm.js     ← shared logic: confirm booking + issue tickets + loyalty
│
└── jobs/
    ├── seatUnlocker.js       ← mỗi 60s: nhả ghế LOCKED hết hạn + hủy booking PENDING hết hạn
    └── tripCloser.js         ← mỗi 5 phút: đóng trip OPEN trước 60 phút khởi hành
```

---

## 7. Luồng dữ liệu chính

### 7.1 Đặt vé và thanh toán

```
[SeatMapView]
  POST /bookings → bookingId + expiresAt
  → bookingStore.setBookingResult()

[BookingView]
  PUT /bookings/:id/passengers → lưu passenger info
  → bookingStore.setPassengers()

[PaymentView — Ví/Online]
  POST /payments/initiate (gateway, pin) → paymentId + OTP
  POST /payments/confirm (paymentId, otp) → tickets[] + loyaltyTier
  → authStore.setUser() (cập nhật walletBalance, loyaltyTier)
  → bookingStore.clear()

[PaymentView — Tiền mặt]
  POST /payments/initiate (gateway=CASH) → CASH_PENDING status
  → booking hiển thị bookingId ngay
  → [DriverView] PUT /driver/bookings/:id/confirm-cash → CONFIRMED + tickets[]
```

### 7.2 Nạp tiền ví

```
[SettingsView]
  POST /wallet/topup/initiate (amount, pin) → OTP
  POST /wallet/topup/confirm (amount, otp) → newBalance
  → authStore.setUser() (walletBalance mới)
  → Kiểm tra tích lũy nạp → nếu ≥10tr → VIP_CUSTOMER
```

### 7.3 Admin nạp tiền hộ / nâng VIP

```
[AdminView — Tab Users]
  POST /admin/users/:id/topup (amount) → cộng wallet_balance, ghi wallet_transactions
  PUT  /admin/users/:id/vip          → loyalty_tier = VIP_CUSTOMER
```

### 7.4 Xác nhận hoàn thành và đánh giá

```
[DriverView]
  PUT /driver/trips/:id/complete → trip.status = COMPLETED

[MyTicketsView]
  POST /bookings/:id/complete → booking.status = COMPLETED (customer confirm)
  POST /reviews (tripId, rating, comment) → lưu đánh giá
```

---

## 8. Trạng thái hệ thống

### Booking status
```
PENDING → CONFIRMED (online/ví payment)
PENDING → CASH_PENDING (tiền mặt)
PENDING → CANCELLED (hủy trước thanh toán)
CASH_PENDING → CONFIRMED (driver confirm)
CASH_PENDING → CANCELLED (hủy trước driver confirm)
CONFIRMED → CANCELLED (hủy sau thanh toán, hoàn 90%)
CONFIRMED → COMPLETED (customer confirm sau chuyến)
```

### Trip status
```
OPEN → CLOSED (tripCloser job, 60 phút trước khởi hành)
OPEN/CLOSED → COMPLETED (driver confirm hoàn thành)
OPEN → CANCELLED (admin)
```

### Seat status (trip_seat_status)
```
AVAILABLE → LOCKED (user chọn ghế, 5 phút)
LOCKED → AVAILABLE (hết 5 phút, seatUnlocker job)
LOCKED → CONFIRMED (booking được xác nhận thanh toán)
CONFIRMED → AVAILABLE (booking bị hủy)
```

### Ticket status
```
ISSUED → USED (driver quét QR check-in)
ISSUED → CANCELLED (booking bị hủy)
```

---

## 9. Acceptance Criteria

| Mã | Tiêu chí |
|----|---------|
| AC-01 | Landing page hiển thị đầy đủ khi chưa đăng nhập |
| AC-02 | Tìm kiếm trả về đúng chuyến theo tuyến + ngày, không trả chuyến <60 phút |
| AC-03 | Ghế LOCKED không cho user khác chọn trong 5 phút |
| AC-04 | Ghế tự nhả sau 5 phút không thanh toán |
| AC-05 | Thanh toán ví: trừ đúng số tiền, ghi wallet_transactions, cập nhật session |
| AC-06 | Hủy vé CONFIRMED: hoàn đúng 90% vào ví, ghi wallet_transactions, ghế về AVAILABLE |
| AC-07 | Driver quét QR: xanh = hợp lệ (ISSUED→USED), đỏ = đã dùng hoặc đã hủy |
| AC-08 | Admin tạo/sửa/đóng/mở/xóa chuyến thành công |
| AC-09 | Admin thêm/sửa/phân quyền/nạp tiền/nâng VIP/khóa tài khoản thành công |
| AC-10 | VIP tự động nâng khi nạp tích lũy ≥10 triệu hoặc đặt ≥10 vé |
| AC-11 | VIP_CUSTOMER thấy giá vé giảm 20% trên SeatMapView và PaymentView |
| AC-12 | Admin nâng VIP thủ công → customer nhận trạng thái VIP ngay lập tức |
| AC-13 | Booking CASH_PENDING: hiển thị booking ID ngay sau khi đặt |
| AC-14 | Chatbot trả đúng câu trả lời khi nhập keyword có trong bảng faqs |
| AC-15 | Customer đánh giá được sau khi trip = COMPLETED và booking = COMPLETED |
| AC-16 | Driver xác nhận hoàn thành chuyến → trip.status = COMPLETED |
| AC-17 | Driver Settings không có mục PIN thanh toán và ví điện tử |
| AC-18 | Ảnh đại diện hiển thị cạnh tên trên header sau khi upload, giữ nguyên sau refresh |
| AC-19 | Chống double booking: 2 request cùng lúc → 1 thành công (200), 1 nhận lỗi (409) |
| AC-20 | Đổi mật khẩu hoạt động đúng: cần nhập mật khẩu hiện tại, mật khẩu mới ≥6 ký tự |
| AC-21 | Booking CASH_PENDING tự động cập nhật sang CONFIRMED sau khi driver confirm (polling) |
| AC-22 | Admin không thấy tài khoản ADMIN khác trong danh sách Users |
| AC-23 | Customer nhận booking ID ngay khi chọn thanh toán tiền mặt (không cần chờ driver) |
| AC-24 | Lịch sử giao dịch ví hiển thị đầy đủ: nạp tiền, thanh toán vé, hoàn tiền |

---

## 10. Ngoài phạm vi (Out of Scope)

- Thanh toán thật VNPay / MoMo (dùng mock flow PIN+OTP)
- SMS OTP thật (OTP trả về trong API response — dev mode only)
- Live tracking GPS xe
- Chat trực tiếp driver–khách
- Dynamic pricing / AI gợi ý tuyến
- Bán vé liên vận quốc tế
- Mobile app native (iOS/Android)
- Spring Boot backend (hướng mở rộng Phase 3)
- Báo cáo xuất Excel/PDF

---

## 11. Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung thay đổi |
|-----------|------|------------------|
| 2.0 | 09/06/2026 | Phiên bản gốc |
| 2.2 | 12/06/2026 | Bổ sung REQ-09 (xác nhận + đánh giá) · REQ-10 mở rộng (QR mọi trạng thái, polling CASH_PENDING) · REQ-11 tách Settings theo role · REQ-12 Driver bổ sung lịch sử chuyến + hoàn thành · REQ-13 Admin bổ sung CRUD đầy đủ users/trips + nạp tiền hộ + nâng VIP · REQ-14 cập nhật điều kiện VIP (nạp ≥10tr hoặc ≥10 vé) + giảm 20% · REQ-15 Chatbot · REQ-16 Avatar · Thêm luồng 7.3, 7.4 · Bổ sung AC-21~24 |