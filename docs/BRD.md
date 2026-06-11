# BRD — Business Requirements Document
## Pam Travel — Hệ thống Đặt vé xe khách trực tuyến

| Thông tin | Chi tiết |
|-----------|----------|
| Phiên bản | 2.0 |
| Ngày cập nhật | 09/06/2026 |
| Người thực hiện | Sinh viên đồ án tốt nghiệp |
| Công nghệ | Node.js · Vue.js 3 · PostgreSQL 18 |

---

## 1. Bối cảnh

Phương thức đặt vé xe khách truyền thống (gọi điện hoặc mua tại bến) đang lộ rõ bất cập:

- **Hành khách:** Khó tra cứu lịch trình, không tự chọn ghế, dễ mất vé giấy, rủi ro tiền mặt.
- **Nhà xe:** Quản lý sổ sách dễ overbooking, khó kiểm soát doanh thu, tốn nhân lực tổng đài.

**Pam Travel** số hóa toàn bộ quy trình: tìm kiếm chuyến đi trực quan, chọn ghế thời gian thực, thanh toán đa phương thức, vé điện tử QR Code.

---

## 2. Mục tiêu nghiệp vụ

| Mã | Mục tiêu | Ưu tiên | Giai đoạn |
|----|----------|---------|-----------|
| BO-01 | Trang landing giới thiệu nhà xe, tuyến phổ biến, ưu đãi | Cao | MVP |
| BO-02 | Tìm kiếm chuyến theo điểm đi, điểm đến, ngày khởi hành | Cao | MVP |
| BO-03 | Sơ đồ ghế động, chọn ghế thời gian thực | Cao | MVP |
| BO-04 | Đặt vé + tạm giữ chỗ 5 phút | Cao | MVP |
| BO-05 | Thanh toán đa phương thức: Ví, Tiền mặt, Online mock | Cao | MVP |
| BO-06 | Vé điện tử QR Code | Cao | MVP |
| BO-07 | Hủy vé, tính phí 10% | Cao | MVP |
| BO-08 | Ví điện tử: nạp tiền, xem số dư | Trung bình | MVP |
| BO-09 | Dashboard Admin: CRUD hệ thống, thống kê | Cao | MVP |
| BO-10 | Dashboard Driver: manifest, confirm tiền mặt, đặt hộ | Cao | MVP |
| BO-11 | VIP Customer sau 10 vé hoặc 10 chuyến | Trung bình | MVP |
| BO-12 | Chatbot hỗ trợ keyword-based | Thấp | MVP |
| BO-13 | Đánh giá chuyến đi 1-5 sao | Thấp | Phase 2 |
| BO-14 | Dark mode + i18n EN/VI | Trung bình | MVP |

---

## 3. Vai trò người dùng

### CUSTOMER (Hành khách)
- Xem trang landing không cần đăng nhập
- Đăng ký / Đăng nhập
- Tìm kiếm và đặt vé (tối đa 5 ghế/lần)
- Thanh toán bằng Ví điện tử, Tiền mặt hoặc Mock Online
- Xem vé QR, hủy vé
- Nạp tiền vào ví
- Đổi thông tin cá nhân, set PIN
- Nhận ưu đãi VIP sau 10 vé/10 chuyến

### DRIVER (Tài xế / Lơ xe)
- Đăng nhập
- Xem danh sách chuyến được phân công
- Xem manifest hành khách (tên, SĐT, ghế, điểm đón/trả)
- Quét QR check-in hành khách
- Confirm thanh toán tiền mặt
- Đặt vé hộ khách (khi khách gọi hotline)
- Đánh dấu chuyến hoàn thành khi đến nơi

### ADMIN (Quản trị viên)
- CRUD Users (xem, tạo, sửa, khóa tài khoản)
- CRUD Operators (nhà xe + ảnh + mô tả)
- CRUD Vehicles (xe + loại xe)
- CRUD Routes (tuyến đường + điểm dừng)
- CRUD Trips (chuyến đi + giá + trạng thái + phân công driver)
- Quản lý Banners quảng cáo
- Quản lý Tuyến phổ biến
- Xem thống kê doanh thu theo ngày/tháng
- Xem tất cả bookings, payments
- Xem tất cả những thông tin của user, driver
---

## 4. Quy trình nghiệp vụ

### 4.1 Luồng đặt vé Online (CUSTOMER)

```
Xem Landing → Đăng nhập → Tìm kiếm →
Chọn chuyến → Chọn ghế (lock 5 phút) →
Nhập thông tin hành khách →
Xác nhận thông tin + cảnh báo hủy 10% →
Chọn phương thức thanh toán →
  [Ví] → Nhập PIN → OTP → Trừ ví → CONFIRMED
  [Tiền mặt] → CASH_PENDING → Driver confirm → CONFIRMED
  [Online Mock] → Nhập PIN → OTP → CONFIRMED
Nhận vé QR → Lên xe → Driver quét QR → Xác nhận đến nơi → Đánh giá sau chuyến đi
```

### 4.2 Luồng đặt hộ (DRIVER)
```
Driver đăng nhập → Tìm chuyến →
Chọn ghế → Nhập thông tin khách →
Chọn thanh toán tiền mặt → CASH_PENDING →
Khách trả tiền → Driver confirm → CONFIRMED → Vé QR
```

### 4.3 Luồng nạp tiền ví
```
Settings → Ví → Nạp tiền →
Nhập số tiền + phương thức →
Nhập PIN → Nhập OTP →
+ Số dư vào ví → Ghi transaction
```

---

## 5. Business Rules

| Mã | Quy tắc | Chi tiết |
|----|---------|---------|
| BR-01 | Seat Lock | Chọn ghế → LOCKED 3 phút. Hết hạn → tự nhả về AVAILABLE |
| BR-02 | Giới hạn vé | Tối đa 5 ghế/lần đặt |
| BR-03 | Chống double booking | Database Transaction + SELECT FOR UPDATE |
| BR-04 | Phí hủy vé | Hủy bất kỳ lúc nào: tính phí **10%**, hoàn **90%** |
| BR-05 | Cảnh báo trước thanh toán | Hiển thị thông tin + cảnh báo "Hủy vé sẽ mất 10%" trước khi confirm |
| BR-06 | Đóng bán vé | Tự động đóng trước giờ khởi hành **60 phút** |
| BR-07 | VIP Tier | Đặt ≥10 vé HOẶC đi ≥10 chuyến → nâng lên VIP_CUSTOMER |
| BR-08 | Số dư ví | Không cho phép số dư âm |
| BR-09 | Tiền mặt | Booking CASH_PENDING chỉ DRIVER mới confirm được |
| BR-10 | PIN | 6 chữ số, set trong Settings, dùng cho thanh toán và nạp tiền |
| BR-11 | OTP | 6 số, hiệu lực 5 phút, lưu trong notifications |
| BR-12 | Chỉ CUSTOMER đặt vé | ADMIN không tham gia booking flow |

---

## 6. Acceptance Criteria

| Mã | Tiêu chí |
|----|---------|
| AC-01 | Trang landing hiển thị đúng khi chưa đăng nhập |
| AC-02 | Tìm kiếm trả về đúng chuyến theo tuyến + ngày |
| AC-03 | Ghế LOCKED không cho user khác chọn trong 10 phút |
| AC-04 | Ghế tự nhả sau 5 phút không thanh toán |
| AC-05 | Thanh toán ví: trừ đúng số tiền, ghi transaction |
| AC-06 | Hủy vé: hoàn đúng 90%, ghế về AVAILABLE |
| AC-07 | Driver quét QR: xanh (hợp lệ), đỏ (đã dùng/hủy) |
| AC-08 | Admin CRUD trip: tạo/sửa/đóng/mở chuyến thành công |
| AC-09 | VIP tự động sau 10 vé xác nhận |
| AC-10 | Chatbot trả đúng câu trả lời khi nhập keyword |
| AC-11 | Chống double booking: 2 request cùng lúc → 1 thành công, 1 nhận 409 |

---

## 7. Ngoài phạm vi

- Thanh toán thật VNPay/MoMo (dùng mock)
- SMS OTP thật (trả OTP qua response)
- Live tracking GPS xe
- Chat trực tiếp driver-khách
- Dynamic pricing AI
- Bán vé liên vận quốc tế
- Spring Boot backend (hướng mở rộng sau)

---

## 8. Lộ trình

| Giai đoạn | Nội dung |
|-----------|---------|
| MVP (hiện tại) | Landing · Auth · Search · Booking · Payment · QR · Admin · Driver · Ví · VIP · Chatbot |
| Phase 2 | Đánh giá sao · Zalo ZNS · Đối soát dòng tiền |
| Phase 3 | Spring Boot backend · Mobile app · AI gợi ý tuyến |