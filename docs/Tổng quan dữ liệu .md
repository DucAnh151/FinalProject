# Pam Travel Database Overview

## Mục tiêu

Tài liệu này giúp hiểu:

* Luồng nghiệp vụ của hệ thống
* Vai trò của từng bảng
* Ý nghĩa các trường dữ liệu
* Quan hệ giữa các bảng
* Luồng đặt vé hoàn chỉnh

---

# 1. Tổng quan hệ thống

Pam Travel là hệ thống đặt vé xe khách trực tuyến.

Các chức năng chính:

* Quản lý người dùng
* Quản lý nhà xe
* Quản lý tuyến đường
* Quản lý chuyến xe
* Quản lý ghế
* Đặt vé
* Thanh toán
* Hoàn tiền
* Đánh giá
* Thông báo

---

# 2. Sơ đồ tổng thể Database

```text
users
  │
  ▼
bookings
  │
  ├──────────────┐
  │              │
  ▼              ▼
booking_seats  payments
  │
  ▼
tickets


operators
  │
  ▼
vehicles
  │
  ▼
seats


routes
  │
  ▼
route_stops


routes
  │
  ▼
trips
  │
  ▼
trip_seat_status
```

---

# 3. Nhóm Master Data

## provinces

Danh sách tỉnh/thành phố.

### Mục đích

Làm dữ liệu tham chiếu cho:

* tuyến đường
* điểm đi
* điểm đến
* điểm dừng

### Các trường

| Trường | Ý nghĩa  |
| ------ | -------- |
| id     | Mã tỉnh  |
| code   | Mã tỉnh  |
| name   | Tên tỉnh |

---

## operators

Thông tin nhà xe.

### Ví dụ

* Phương Trang
* Thành Bưởi
* Hoàng Long

### Các trường

| Trường  | Ý nghĩa       |
| ------- | ------------- |
| id      | Mã nhà xe     |
| name    | Tên nhà xe    |
| phone   | Số điện thoại |
| email   | Email         |
| address | Địa chỉ       |

---

## vehicle_types

Loại xe.

### Ví dụ

* Limousine 34 chỗ
* Giường nằm 40 chỗ
* Ghế ngồi 45 chỗ

### Các trường

| Trường     | Ý nghĩa     |
| ---------- | ----------- |
| id         | Mã loại xe  |
| name       | Tên loại xe |
| seat_count | Tổng số ghế |

---

# 4. Quản lý xe

## vehicles

Thông tin xe thực tế.

### Quan hệ

```text
operators (1)
      │
      ▼
vehicles (N)
```

Một nhà xe có nhiều xe.

### Các trường

| Trường          | Ý nghĩa       |
| --------------- | ------------- |
| id              | Mã xe         |
| operator_id     | Nhà xe sở hữu |
| vehicle_type_id | Loại xe       |
| plate_number    | Biển số xe    |
| name            | Tên xe        |
| status          | Trạng thái    |

---

## seats

Danh sách ghế của xe.

### Quan hệ

```text
vehicles (1)
      │
      ▼
seats (N)
```

Một xe có nhiều ghế.

### Các trường

| Trường     | Ý nghĩa      |
| ---------- | ------------ |
| id         | Mã ghế       |
| vehicle_id | Thuộc xe nào |
| seat_name  | Tên ghế      |
| floor      | Tầng         |
| position   | Vị trí       |

### Ví dụ

```text
A1
A2
A3
B1
B2
B3
```

---

# 5. Tuyến đường

## routes

Thông tin tuyến cố định.

### Ví dụ

```text
Hà Nội → Đà Nẵng
```

### Các trường

| Trường                | Ý nghĩa     |
| --------------------- | ----------- |
| id                    | Mã tuyến    |
| departure_province_id | Điểm đi     |
| arrival_province_id   | Điểm đến    |
| distance_km           | Khoảng cách |

---

## route_stops

Các điểm dừng trên tuyến.

### Ví dụ

```text
Hà Nội
↓
Nghệ An
↓
Huế
↓
Đà Nẵng
```

### Các trường

| Trường      | Ý nghĩa      |
| ----------- | ------------ |
| id          | Mã điểm dừng |
| route_id    | Tuyến        |
| province_id | Tỉnh         |
| stop_order  | Thứ tự dừng  |

---

# 6. Chuyến xe

## trips

Lưu thông tin chuyến chạy thực tế.

### Quan hệ

```text
routes (1)
     │
     ▼
trips (N)
```

Một tuyến có nhiều chuyến.

### Các trường

| Trường         | Ý nghĩa       |
| -------------- | ------------- |
| id             | Mã chuyến     |
| route_id       | Tuyến         |
| vehicle_id     | Xe            |
| departure_time | Giờ xuất phát |
| arrival_time   | Giờ đến       |
| price          | Giá vé        |
| status         | Trạng thái    |

### Ví dụ

```text
Trip #1001
Hà Nội → Đà Nẵng
20:00
```

---

# 7. Trạng thái ghế theo chuyến

## trip_seat_status

Đây là bảng quan trọng nhất của hệ thống đặt vé.

### Mục đích

Theo dõi trạng thái của từng ghế trên từng chuyến.

### Các trường

| Trường       | Ý nghĩa           |
| ------------ | ----------------- |
| id           | Mã                |
| trip_id      | Chuyến            |
| seat_id      | Ghế               |
| status       | Trạng thái        |
| locked_until | Thời gian giữ ghế |

---

## Các trạng thái

### AVAILABLE

Ghế còn trống.

---

### LOCKED

Ghế đang được giữ tạm thời.

Ví dụ:

```text
Khách chọn ghế
↓
Giữ ghế 10 phút
↓
Chờ thanh toán
```

---

### BOOKED

Ghế đã thanh toán thành công.

---

## Vì sao không lưu trạng thái trong bảng seats?

Ví dụ:

```text
Ghế A1
```

Trên:

```text
Trip #1 -> BOOKED
Trip #2 -> AVAILABLE
Trip #3 -> LOCKED
```

Một ghế có thể có trạng thái khác nhau theo từng chuyến.

Do đó cần bảng:

```text
trip_seat_status
```

---

# 8. Người dùng

## users

Thông tin tài khoản.

### Các trường

| Trường    | Ý nghĩa       |
| --------- | ------------- |
| id        | Mã người dùng |
| full_name | Họ tên        |
| phone     | Số điện thoại |
| email     | Email         |
| password  | Mật khẩu      |
| role      | Vai trò       |
| status    | Trạng thái    |

---

## Role

### ADMIN

Quản trị hệ thống.

---

### OPERATOR

Nhà xe.

---

### CUSTOMER

Khách hàng.

---

# 9. Đặt vé

## bookings

Thông tin đơn đặt vé.

### Quan hệ

```text
users (1)
    │
    ▼
bookings (N)
```

Một người dùng có nhiều booking.

### Các trường

| Trường       | Ý nghĩa        |
| ------------ | -------------- |
| id           | Mã booking     |
| user_id      | Người đặt      |
| trip_id      | Chuyến         |
| total_amount | Tổng tiền      |
| status       | Trạng thái     |
| expires_at   | Hạn thanh toán |

---

## Trạng thái booking

### PENDING

Chưa thanh toán.

---

### CONFIRMED

Đã thanh toán.

---

### CANCELLED

Đã hủy.

---

# 10. Ghế trong booking

## booking_seats

Bảng trung gian liên kết:

```text
bookings
    ↕
booking_seats
    ↕
seats
```

### Các trường

| Trường     | Ý nghĩa |
| ---------- | ------- |
| id         | Mã      |
| booking_id | Booking |
| seat_id    | Ghế     |

### Ví dụ

```text
Booking #1

A1
A2
A3
```

Một booking có thể chứa nhiều ghế.

---

# 11. Thanh toán

## payments

Thông tin giao dịch.

### Các trường

| Trường     | Ý nghĩa         |
| ---------- | --------------- |
| id         | Mã giao dịch    |
| booking_id | Booking         |
| amount     | Số tiền         |
| gateway    | Cổng thanh toán |
| status     | Trạng thái      |

---

## Gateway

* VNPAY
* MOMO
* BANKING

---

## Trạng thái thanh toán

### PENDING

Đang xử lý.

### SUCCESS

Thanh toán thành công.

### FAILED

Thanh toán thất bại.

---

# 12. Vé điện tử

## tickets

Vé được tạo sau khi thanh toán thành công.

### Các trường

| Trường     | Ý nghĩa    |
| ---------- | ---------- |
| id         | Mã vé      |
| booking_id | Booking    |
| seat_id    | Ghế        |
| qr_code    | Mã QR      |
| status     | Trạng thái |

---

## Trạng thái vé

### ISSUED

Đã phát hành.

### USED

Đã sử dụng.

### CANCELLED

Đã hủy.

---

# 13. Hoàn tiền

## refunds

Thông tin hoàn tiền.

### Các trường

| Trường     | Ý nghĩa      |
| ---------- | ------------ |
| id         | Mã refund    |
| booking_id | Booking      |
| amount     | Số tiền hoàn |
| reason     | Lý do        |
| status     | Trạng thái   |

---

# 14. Đánh giá

## reviews

Đánh giá chuyến đi.

### Các trường

| Trường  | Ý nghĩa        |
| ------- | -------------- |
| id      | Mã đánh giá    |
| user_id | Người đánh giá |
| trip_id | Chuyến         |
| rating  | Số sao         |
| comment | Nội dung       |

---

# 15. Thông báo

## notifications

Thông báo hệ thống.

### Các trường

| Trường  | Ý nghĩa         |
| ------- | --------------- |
| id      | Mã thông báo    |
| user_id | Người nhận      |
| title   | Tiêu đề         |
| content | Nội dung        |
| is_read | Đã đọc hay chưa |

---

# 16. Luồng đặt vé hoàn chỉnh

```text
1. User tìm chuyến xe

        ▼

2. Chọn Trip

        ▼

3. Chọn ghế

        ▼

4. trip_seat_status
   AVAILABLE → LOCKED

        ▼

5. Tạo Booking

        ▼

6. Tạo Payment

        ▼

7. Thanh toán thành công

        ▼

8. Tạo Ticket

        ▼

9. trip_seat_status
   LOCKED → BOOKED

        ▼

10. Gửi Notification
```

---

# 17. Các quan hệ quan trọng cần nhớ

## User - Booking

```text
1 User
   │
   ▼
N Booking
```

---

## Vehicle - Seats

```text
1 Vehicle
   │
   ▼
N Seats
```

---

## Route - Trips

```text
1 Route
   │
   ▼
N Trips
```

---

## Booking - Seats

```text
Booking
    ↕
Booking_Seats
    ↕
Seats
```

Quan hệ nhiều-nhiều (Many-to-Many).

---

# 18. 5 bảng quan trọng nhất

Nếu làm Backend Java, cần nắm rất chắc:

```text
users
bookings
booking_seats
trips
trip_seat_status
```

Hầu hết các API tìm chuyến, đặt vé, thanh toán, quản lý vé đều xoay quanh 5 bảng này.
