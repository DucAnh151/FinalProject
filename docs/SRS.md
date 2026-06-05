# SRS — Software Requirements Specification

## (Tài liệu Tả yêu cầu Phần mềm)

> Dự án: Hệ thống Đặt vé xe khách trực tuyến "Pam Travel"

---

## Thông tin tài liệu

| Thông tin | Chi tiết |
|---|---|
| **Dự án** | Ứng dụng đặt vé xe khách đa nền tảng (Spring Boot, Vue.js, PostgreSQL) |
| **Phiên bản** | 1.0 (Khởi tạo theo cấu trúc CSDL 17 bảng) |
| **Ngày cập nhật** | 04/06/2026 |
| **Nhóm thực hiện** | Dev Team |

---

## 1. Tổng quan hệ thống

Hệ thống cung cấp nền tảng web (Vue.js) kết hợp backend mạnh mẽ (Java Spring Boot) hỗ trợ người dùng tìm kiếm, xem sơ đồ động, đặt chỗ và thanh toán vé xe khách. Dữ liệu được tổ chức tối ưu và bảo vệ tính toàn vẹn thông qua PostgreSQL.

### Hệ thống phân quyền:

**Khách hàng (Customer):**
- Đăng ký tài khoản, đăng nhập
- Tìm kiếm chuyến xe
- Chọn ghế trên sơ đồ động
- Đặt vé, thực hiện thanh toán
- Quản lý vé điện tử

**Quản trị viên (Admin):**
- Quản lý danh mục nhà xe
- Lịch trình chuyến đi
- Quản lý sơ đồ chỗ ngồi linh hoạt
- Theo dõi vé
- Phê duyệt các giao dịch chuyển khoản thủ công

---

## 2. Yêu cầu chức năng (System Requirements)

### REQ-01: Đăng nhập & Xác thực (Authentication)

**Mô tả:** Hỗ trợ đăng nhập qua Số điện thoại hoặc Email bằng JWT (JSON Web Token).

**Quy trình:**
1. Người dùng nhập thông tin đăng nhập
2. Backend Spring Boot sử dụng Spring Security để xác thực (AuthenticationManager) thông qua password_hash
3. Nếu đúng, sinh JWT Token trả về cho Client
4. Token được sử dụng để định danh trong các Request tiếp theo

### REQ-02: Tìm kiếm chuyến xe (Trip Search)

**Đầu vào:** Điểm đi (origin_id), Điểm đến (destination_id), Ngày khởi hành (departure_time)

**Xử lý:** Backend thực hiện Query Join bảng trips, routes, route_stops để tìm ra các chuyến thỏa mãn và còn chỗ trống

**Đầu ra:** Danh sách các chuyến xe cùng thông tin cơ bản: Giờ đi, giờ đến, tổng thời gian, giá cơ sở (base_price), và loại xe

### REQ-03: Render Sơ đồ ghế động (Dynamic Seat Map)

**Mô tả:** Frontend (Vue.js) nhận JSON từ Backend chứa cấu hình sơ đồ chỗ ngồi và trạng thái ghế, sau đó render bằng TailwindCSS.

**Dữ liệu đầu vào:** JSON từ endpoint `/api/v1/trips/{tripId}/seat-map` chứa:
- Số tầng (floors)
- Số hàng (rows), cột (cols) mỗi tầng
- Danh sách ghế đã đặt (bookedSeats)
- Từng ghế ghi lại trạng thái: `AVAILABLE`, `LOCKED`, `CONFIRMED`, `PENDING`

---

## 3. API Endpoints

### 3.1. Lấy sơ đồ ghế (Get Seat Map)

**Endpoint:** `GET /api/v1/trips/{tripId}/seat-map`

**Mô tả:** Trả về thông tin sơ đồ chỗ ngồi và trạng thái ghế hiện tại

**Đầu ra (Response):**

```json
{
  "tripId": 45,
  "vehicleType": "Limousine 34",
  "layout": {
      "floors": 2,
      "floor_1": { "rows": 6, "cols": 3, "aisle_after_col": 1 },
      "floor_2": { "rows": 6, "cols": 3, "aisle_after_col": 1 }
  },
  "bookedSeats": [
      { "seatId": 12, "seatName": "1-A1", "status": "CONFIRMED" },
      { "seatId": 15, "seatName": "1-A2", "status": "PENDING" }
  ]
}
```

### 3.2. Gửi yêu cầu đặt vé (Create Booking)

**Endpoint:** `POST /api/v1/bookings`

**Mô tả:** Nhận yêu cầu giữ chỗ. Dùng Transaction để bảo vệ dữ liệu

**Đầu vào (Request Body):**

```json
{
  "tripId": 45,
  "pickupStopId": 12,
  "dropoffStopId": 19,
  "selectedSeatIds": [12, 13]
}
```

**Đầu ra:** 201 Created kèm Booking ID và expires_at, hoặc 409 Conflict nếu gặp lỗi Unique (Double-booking)

---

## 4. Ràng buộc Kỹ thuật (Technical Constraints)

- **Ngôn ngữ & Framework:** Java 8, Spring Boot 3.x, Spring Data JPA, Hibernate
- **Frontend:** Vue.js 3 (Composition API), TailwindCSS để render HTML động dựa trên JSON mà không cần hard-code cứng CSS sơ đồ chỗ
- **Cơ sở dữ liệu:** Bắt buộc dùng PostgreSQL bản 18 do hệ thống phụ thuộc vào kiểu dữ liệu JSONB và Partial Index
- **Bảo mật:** Sử dụng JWT cho xác thực. Mật khẩu mã hóa Bcrypt. API Payment webhook phải verify chữ ký (Signature) của ngân hàng để tránh giả mạo thanh toán

---

## Ghi chú

*Tài liệu này là bản tả yêu cầu chi tiết cho hệ thống Pam Travel và có thể được cập nhật dựa trên các giai đoạn phát triển tiếp theo.*