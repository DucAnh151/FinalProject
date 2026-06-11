# Pam Travel — Hệ thống Đặt vé xe khách trực tuyến

Dự án website đặt vé xe khách trực tuyến với sơ đồ ghế thời gian thực, quản lý phân quyền và tích hợp thanh toán.

**Cập nhật tiến độ:** 10/06/2026  
**Stack hiện tại:** Node.js (Express + Prisma) · Vue 3 (Composition API + Pinia) · PostgreSQL · Tailwind/Vanilla CSS

---

## 🛠️ Công nghệ & Kiến trúc Hệ thống

### 1. Database (PostgreSQL)
Đã thiết kế và tạo thành công **21 bảng** (Prisma schema) trong database `pam_travel` (schema `public`), bao gồm:
- **Master data:** `provinces`, `operators`, `vehicle_types`
- **Xe & Ghế:** `vehicles`, `seats`
- **Tuyến đường:** `routes`, `route_stops`
- **Chuyến đi:** `trips`, `trip_seat_status` (xử lý lock ghế tạm thời và concurrency)
- **Người dùng:** `users` (CUSTOMER, DRIVER, ADMIN)
- **Đặt vé:** `bookings`, `booking_seats`
- **Thanh toán:** `payments`, `tickets`, `refunds`
- **Đánh giá & Thông báo:** `reviews`, `notifications`

*Đặc điểm thiết kế DB:*
- Bảng `trip_seat_status` quản lý khóa ghế (lock **5 phút**) dùng `locked_until` (TIMESTAMPTZ) và index riêng tối ưu hóa truy vấn khóa.
- Cấu hình sơ đồ ghế động sử dụng trường `seat_layout_json` (JSONB) trong bảng `vehicle_types`.

### 2. Backend (Node.js + Express)
Backend Express API hoạt động ổn định tại cổng `http://localhost:3001/api`, kết nối trực tiếp PostgreSQL sử dụng cả Prisma client và `pg` (Pool):
- **Auth API** (`/api/auth`): Đăng ký, đăng nhập (JWT token, băm bcrypt), cập nhật thông tin cá nhân.
- **Trips API** (`/api/trips`): Tìm kiếm chuyến xe theo điểm đi, điểm đến, ngày khởi hành; lấy thông tin sơ đồ ghế.
- **Bookings API** (`/api/bookings`): Tạo booking, cập nhật thông tin hành khách, khóa ghế tạm thời (5 phút).
- **Payments API** (`/api/payments`): Xử lý giao dịch thanh toán (Cash/Wallet/Online), nhập mã PIN/OTP giả lập.
- **Tickets API** (`/api/tickets`): Truy xuất thông tin vé xe, tạo mã QR, yêu cầu hủy vé (hoàn tiền 90% theo quy định BR-04).
- **Admin API** (`/api/admin`): CRUD quản lý người dùng, chuyến đi, báo cáo doanh thu.
- **Landing API** (`/api/landing`): Thống kê chung, danh sách nhà xe tiêu biểu, các tuyến đường phổ biến, banners quảng cáo.
- **Background Jobs**: `seatUnlocker` (60 giây/lần, nhả ghế hết hạn) · `tripCloser` (5 phút/lần, đóng chuyến trước 60 phút khởi hành).

### 3. Frontend (Vue 3 + Pinia + Axios)
Dự án frontend Vue 3 được khởi tạo tại thư mục `frontend/`, chạy bằng Vite:
- **Quản lý state:** Pinia store (`authStore` xử lý đăng nhập, lưu trữ phiên làm việc qua `sessionStorage`).
- **HTTP Client:** Axios instance (`api.js`) tự động gắn token Authorization Bearer từ user session và tự động redirect về trang đăng nhập nếu gặp mã lỗi 401.
- **Định tuyến:** Vue Router (`router/index.js`) hỗ trợ đầy đủ route guards bảo vệ trang theo vai trò (ADMIN, DRIVER, CUSTOMER, GUEST).
- **Giao diện:** Đã tạo khung cho 12 View cốt lõi.

---

## 📈 Lộ trình triển khai Frontend (9 Tasks)

Chúng ta sẽ hoàn thiện ứng dụng qua 9 tác vụ chính theo thứ tự ưu tiên:

### 🌟 Core MVP (Task 1 - Task 7)
- [ ] **Task 1 — LoginView & RegisterView:**
  - Form đăng nhập/đăng ký giao diện premium.
  - Tích hợp gọi `authStore.login/register`.
  - Điều hướng người dùng (Redirect) theo vai trò (Admin -> `/admin`, Driver -> `/driver`, Customer -> `/home`).
- [ ] **Task 2 — LandingView:**
  - Thiết kế trang chủ công khai với Hero section, search box (chọn tỉnh đi/đến, ngày đi).
  - Tải động dữ liệu: popular routes, operators tiêu biểu, banners, và stats từ API.
  - Tích hợp `PublicHeader` và `PublicFooter`.
- [ ] **Task 3 — HomeView & SearchView:**
  - Form tìm kiếm chuyến đi chi tiết.
  - Danh sách kết quả chuyến xe (`trips`) kèm thông tin giờ đi/đến, giá vé, nhà xe, số ghế trống.
  - Bộ lọc (nhà xe, giá vé, thời gian khởi hành, loại xe) và sắp xếp (giá tăng/giảm, giờ đi).
  - Nút chọn chuyến đi chuyển hướng sang `SeatMapView` với route params.
- [ ] **Task 4 — SeatMapView (Phức tạp nhất):**
  - Render sơ đồ ghế động 2D (tầng dưới, tầng trên nếu có) từ trường `seat_layout_json`.
  - Đọc trạng thái ghế hiện tại (AVAILABLE, LOCKED, BOOKED) từ API.
  - Cho phép chọn tối đa 5 ghế cùng lúc (BR-02).
  - Polling trạng thái ghế mỗi 5 giây cập nhật thay đổi.
  - Đếm ngược 5 phút khóa ghế tạm thời (hiển thị timer sinh động).
- [ ] **Task 5 — BookingView:**
  - Form điền thông tin chi tiết từng hành khách (Họ tên, SĐT, Email).
  - Lựa chọn điểm đón (pickup) và điểm trả (dropoff) dựa trên danh sách chặng đi.
  - Gọi API `PUT /passengers` để lưu thông tin hành khách.
  - Hiển thị trang tóm tắt thông tin đặt vé trước khi chuyển sang thanh toán.
- [ ] **Task 6 — PaymentView:**
  - Lựa chọn hình thức thanh toán (ONLINE/CASH/WALLET).
  - Đối với ví điện tử: giao diện nhập mã PIN ví và nhập OTP xác thực giả lập.
  - Gọi API xác nhận thanh toán thành công và hiển thị QR Code của vé.
- [ ] **Task 7 — MyTicketsView (Trang cá nhân):**
  - Danh sách vé đã đặt và lịch sử đi xe.
  - Xem chi tiết từng vé: lộ trình, thông tin khách hàng, trạng thái, mã QR vé xe.
  - Chức năng hủy vé (Refund) trước giờ khởi hành, gọi API hoàn tiền 90%.

### 🛠️ Role-Specific & Polish (Task 8 - Task 9)
- [ ] **Task 8 — SettingsView, AdminView & DriverView:**
  - `SettingsView`: Đổi thông tin cá nhân, cập nhật mật khẩu, cài đặt PIN và nạp tiền vào ví điện tử giả lập.
  - `AdminView`: Giao diện quản lý danh sách chuyến xe, quản lý người dùng, và thống kê biểu đồ doanh thu đơn giản.
  - `DriverView`: Xem danh sách hành khách đi xe (manifest) của chuyến xe được phân công, hỗ trợ tính năng quét QR code check-in hành khách.
- [ ] **Task 9 — Global Booking Store & Polish:**
  - Pinia `bookingStore` quản lý trạng thái đặt vé xuyên suốt các bước (trips, selected seats, passenger details).
  - Tích hợp `uiStore` quản lý:
    - Dark mode toàn diện.
    - Đa ngôn ngữ (i18n) Việt - Anh.
  - Tự động lưu và khôi phục trạng thái đặt vé chưa hoàn tất bằng `localStorage` đề phòng refresh trang.

---

## 🏃 Chạy Dự Án

### Cài đặt ban đầu
1. Cài đặt các thư viện cho dự án gốc:
   ```bash
   npm install
   ```
2. Cài đặt thư viện cho dự án frontend:
   ```bash
   cd frontend
   npm install
   ```
3. Cấu hình file `.env` ở thư mục gốc (tham khảo `.env.example`).

### Khởi động dự án
- **Khởi động Backend (Express API):**
  ```bash
  # Tại thư mục gốc
  npm run dev
  ```
- **Khởi động Frontend (Vue 3 Dev Server):**
  ```bash
  # Tại thư mục frontend
  npm run dev
  ```
  Truy cập frontend tại `http://localhost:5173`.