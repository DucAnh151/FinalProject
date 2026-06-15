# BRD — Business Requirements Document
## Pam Travel — Hệ thống Đặt vé xe khách trực tuyến

| Thông tin | Chi tiết |
|-----------|----------|
| Phiên bản | 2.2 |
| Ngày cập nhật | 12/06/2026 |
| Người thực hiện | Sinh viên đồ án tốt nghiệp |
| Công nghệ | Node.js 22 · Vue.js 3 · PostgreSQL 18 |

---

## 1. Bối cảnh

Phương thức đặt vé xe khách truyền thống (gọi điện hoặc mua tại bến) đang lộ rõ bất cập:

- **Hành khách:** Khó tra cứu lịch trình, không tự chọn ghế, dễ mất vé giấy, rủi ro tiền mặt.
- **Nhà xe:** Quản lý sổ sách dễ overbooking, khó kiểm soát doanh thu, tốn nhân lực tổng đài.

**Pam Travel** số hóa toàn bộ quy trình: tìm kiếm chuyến đi trực quan, chọn ghế thời gian thực, thanh toán đa phương thức, vé điện tử QR Code, dashboard riêng cho từng vai trò.

---

## 2. Mục tiêu nghiệp vụ

| Mã | Mục tiêu | Ưu tiên | Giai đoạn |
|----|----------|---------|-----------|
| BO-01 | Trang landing giới thiệu nhà xe, tuyến phổ biến, ưu đãi | Cao | MVP |
| BO-02 | Tìm kiếm chuyến theo điểm đi, điểm đến, ngày khởi hành | Cao | MVP |
| BO-03 | Sơ đồ ghế động, chọn ghế thời gian thực | Cao | MVP |
| BO-04 | Đặt vé + tạm giữ chỗ 5 phút | Cao | MVP |
| BO-05 | Thanh toán đa phương thức: Ví, Tiền mặt, Online mock | Cao | MVP |
| BO-06 | Vé điện tử QR Code — hiển thị với mọi hình thức thanh toán | Cao | MVP |
| BO-07 | Hủy vé, tính phí 10% | Cao | MVP |
| BO-08 | Ví điện tử: nạp tiền (PIN+OTP), xem số dư, lịch sử giao dịch | Trung bình | MVP |
| BO-09 | Dashboard Admin: CRUD đầy đủ hệ thống, thống kê doanh thu | Cao | MVP |
| BO-10 | Dashboard Driver: manifest, confirm tiền mặt, quét QR, lịch sử chuyến | Cao | MVP |
| BO-11 | VIP Customer: nạp tích lũy ≥10 triệu hoặc đặt ≥10 vé → giảm 20% giá vé | Trung bình | MVP |
| BO-12 | Chatbot hỗ trợ keyword-based | Thấp | MVP |
| BO-13 | Customer đánh giá chuyến đi 1–5 sao sau khi hoàn thành | Trung bình | MVP |
| BO-14 | Dark mode + i18n EN/VI | Trung bình | MVP |
| BO-15 | Ảnh đại diện hiển thị trên header và lưu trữ cho mọi vai trò | Trung bình | MVP |

---

## 3. Vai trò người dùng

### CUSTOMER (Hành khách)
- Xem trang landing không cần đăng nhập
- Đăng ký / Đăng nhập (email hoặc SĐT)
- Tìm kiếm, filter, sort và đặt vé (tối đa 5 ghế/lần)
- Thanh toán bằng Ví điện tử (PIN+OTP), Tiền mặt, Mock Online (PIN+OTP)
- Xem vé QR / mã vé ngay sau khi đặt — dù thanh toán bằng hình thức nào
- Hủy vé (PENDING: miễn phí, CONFIRMED: hoàn 90%)
- Nạp tiền vào ví (PIN+OTP)
- Xác nhận hoàn thành chuyến đi và đánh giá chuyến 1–5 sao
- Cài đặt cá nhân: sửa tên, SĐT, email, mật khẩu, ảnh đại diện, PIN thanh toán
- Nhận VIP sau khi nạp tích lũy ≥10 triệu **hoặc** đặt ≥10 vé → giảm 20% giá vé

### DRIVER (Tài xế)
- Đăng nhập
- Xem danh sách chuyến được phân công (sắp tới + đã qua)
- Xem manifest hành khách: tên, SĐT, ghế, điểm đón/trả, mã QR
- Quét QR check-in hành khách (camera + nhập thủ công)
- Xác nhận thu tiền mặt → tự động phát vé QR cho khách
- Xác nhận hoàn thành chuyến đi
- Xem lịch sử các chuyến đã hoàn thành
- Cài đặt cá nhân: sửa tên, SĐT, email, mật khẩu, ảnh đại diện
- **Không có PIN thanh toán** trong Settings

### ADMIN (Quản trị viên)
- **CRUD Users** (ngoại trừ tài khoản ADMIN khác):
  - Xem, thêm thủ công, sửa thông tin, xóa / khóa tài khoản
  - Phân quyền: nâng CUSTOMER lên DRIVER hoặc ngược lại
  - Nạp tiền vào ví của CUSTOMER
  - Nâng cấp CUSTOMER lên VIP_CUSTOMER thủ công
- **CRUD Operators** (nhà xe + ảnh + mô tả + rating)
- **CRUD Vehicles** (xe + loại xe)
- **CRUD Routes** (tuyến đường + điểm dừng)
- **CRUD Trips** (tạo, sửa, xóa, đóng/mở, phân công driver, override giá)
- Quản lý Banners quảng cáo
- Quản lý Tuyến phổ biến (popular routes)
- Xem thống kê doanh thu: bar chart theo ngày, donut chart trạng thái booking
- Xem toàn bộ bookings, payments, refunds
- Cài đặt cá nhân: sửa tên, SĐT, email, mật khẩu, ảnh đại diện
- **Không tham gia booking flow** (BR-12)

---

## 4. Quy trình nghiệp vụ

### 4.1 Luồng đặt vé Online / Ví (CUSTOMER)

```
Xem Landing → Đăng nhập → Tìm kiếm →
Chọn chuyến → Chọn ghế (lock 5 phút) →
Nhập thông tin hành khách + điểm đón/trả →
Cảnh báo "Hủy vé sẽ mất 10%" →
Chọn phương thức thanh toán:
  [Ví]         → Nhập PIN → OTP → Trừ ví → CONFIRMED → Sinh vé QR
  [Tiền mặt]   → CASH_PENDING → hiện mã đặt chỗ → Driver confirm → CONFIRMED → Sinh vé QR
  [Online Mock] → Nhập PIN → OTP → CONFIRMED → Sinh vé QR
Lên xe → Driver quét QR check-in →
Kết thúc chuyến → Driver xác nhận hoàn thành →
Customer xác nhận hoàn thành + Đánh giá 1–5 sao
```

### 4.2 Luồng nạp tiền ví (CUSTOMER)

```
Settings → Ví điện tử → Nạp tiền →
Nhập số tiền → Nhập PIN → Sinh OTP → Nhập OTP →
Cộng số dư → Ghi wallet_transactions →
Kiểm tra tổng nạp tích lũy:
  Nếu tổng_nap >= 10.000.000 → nâng VIP_CUSTOMER → áp dụng giảm 20% giá vé
```

### 4.3 Luồng hủy vé (CUSTOMER)

```
My Tickets → Chọn vé → Hủy vé
  PENDING (chưa thanh toán) → CANCELLED → miễn phí
  CONFIRMED (đã thanh toán) → CANCELLED → hoàn 90% vào ví → ghi wallet_transactions
Ghế về AVAILABLE ngay lập tức
```

### 4.4 Luồng Driver check-in

```
DriverView → Chọn chuyến → Tab Soát vé →
  [Camera] Quét QR hoặc [Manual] Nhập mã →
  POST /tickets/check-in →
  ISSUED → USED → Hiển thị thông tin hành khách
Cuối chuyến → Driver xác nhận hoàn thành →
  Trip OPEN/CLOSED → COMPLETED
```

### 4.5 Luồng Admin quản lý tài khoản

```
AdminView → Tab Người dùng →
  [Thêm] Nhập thông tin + chọn role → Tạo tài khoản
  [Sửa]  Cập nhật tên / SĐT / email / role
  [Phân quyền] CUSTOMER ↔ DRIVER
  [Nạp tiền] Nhập số tiền → Cộng wallet_balance → Ghi wallet_transactions
  [Nâng VIP]  Set loyalty_tier = VIP_CUSTOMER thủ công
  [Xóa/Khóa] is_active = false
```

### 4.6 Luồng Chatbot

```
Customer nhập tin nhắn →
Tách keyword từ nội dung →
Tìm trong bảng faqs theo keywords →
  Tìm thấy → Trả về answer
  Không tìm thấy → "Xin lỗi, vui lòng liên hệ hotline 1900 xxxx"
```

---

## 5. Business Rules

| Mã | Quy tắc | Chi tiết |
|----|---------|---------|
| BR-01 | Seat Lock | Chọn ghế → LOCKED 5 phút. Hết hạn → tự nhả về AVAILABLE |
| BR-02 | Giới hạn vé | Tối đa 5 ghế mỗi lần đặt. Người đặt có thể đại diện điền thông tin cho cả nhóm bằng nút "Đặt hộ cả nhóm" — thông  tin người đặt sẽ được fill vào tất cả các ghế |
| BR-03 | Chống double booking | Database Transaction + upsert trip_seat_status |
| BR-04 | Phí hủy vé | Hủy bất kỳ lúc nào: phí **10%**, hoàn **90%** vào ví |
| BR-05 | Cảnh báo trước thanh toán | Hiển thị "Hủy vé sẽ mất 10%" trước khi confirm |
| BR-06 | Đóng bán vé | Tự động đóng trước giờ khởi hành **60 phút** |
| BR-07 | VIP Tier — điều kiện | Nạp tích lũy **≥10.000.000 VNĐ** **HOẶC** đặt **≥10 vé** CONFIRMED → VIP_CUSTOMER |
| BR-08 | VIP Tier — ưu đãi | VIP_CUSTOMER được **giảm 20%** giá vé khi đặt vé |
| BR-09 | Số dư ví | Không cho phép số dư âm |
| BR-10 | Tiền mặt | Booking CASH_PENDING: chỉ DRIVER được phân công mới confirm |
| BR-11 | PIN | 6 chữ số, bcrypt hash, dùng cho thanh toán và nạp tiền |
| BR-12 | OTP | 6 số, hiệu lực 5 phút, lưu trong bảng notifications |
| BR-13 | ADMIN không đặt vé | Role ADMIN bị chặn ở booking flow |
| BR-14 | Admin không quản lý Admin | Admin chỉ CRUD user có role CUSTOMER và DRIVER |
| BR-15 | Vé CASH_PENDING | Ngay sau khi đặt phải hiển thị mã đặt chỗ (booking ID) cho khách |
| BR-16 | Đánh giá chuyến | Customer chỉ được đánh giá sau khi trip = COMPLETED và booking = CONFIRMED |
| BR-17 | Driver không có PIN | Driver không cần và không được cài PIN thanh toán |
| BR-18 | Ảnh đại diện | Ảnh đại diện hiển thị ở header (cạnh tên) cho tất cả vai trò |

---

## 6. Acceptance Criteria

| Mã | Tiêu chí |
|----|---------|
| AC-01 | Landing page hiển thị đúng khi chưa đăng nhập |
| AC-02 | Tìm kiếm trả về đúng chuyến theo tuyến + ngày |
| AC-03 | Ghế LOCKED không cho user khác chọn trong 5 phút |
| AC-04 | Ghế tự nhả sau 5 phút không thanh toán |
| AC-05 | Thanh toán ví: trừ đúng số tiền, ghi wallet_transactions |
| AC-06 | Hủy vé: hoàn đúng 90%, ghế về AVAILABLE |
| AC-07 | Driver quét QR: xanh (hợp lệ), đỏ (đã dùng/hủy) |
| AC-08 | Admin CRUD trip: tạo/sửa/đóng/mở/xóa chuyến thành công |
| AC-09 | Admin CRUD user: thêm/sửa/phân quyền/nạp tiền/nâng VIP/xóa |
| AC-10 | VIP tự động khi nạp tích lũy ≥10 triệu hoặc đặt ≥10 vé |
| AC-11 | VIP_CUSTOMER được giảm 20% khi đặt vé tiếp theo |
| AC-12 | Admin nâng VIP thủ công → customer nhận trạng thái VIP ngay |
| AC-13 | Vé CASH_PENDING hiển thị mã đặt chỗ ngay sau khi đặt |
| AC-14 | Chatbot trả đúng câu trả lời khi nhập keyword |
| AC-15 | Customer đánh giá được sau khi chuyến COMPLETED |
| AC-16 | Driver xác nhận hoàn thành chuyến → trip chuyển COMPLETED |
| AC-17 | Driver Settings không có mục PIN thanh toán |
| AC-18 | Ảnh đại diện hiển thị cạnh tên trên header sau khi upload |
| AC-19 | Chống double booking: 2 request cùng lúc → 1 thành công, 1 nhận 409 |
| AC-20 | Settings: đổi mật khẩu hoạt động đúng cho mọi vai trò |

---

## 7. Ngoài phạm vi

- Thanh toán thật VNPay / MoMo (dùng mock PIN+OTP)
- SMS OTP thật (trả OTP qua API response — dev mode)
- Live tracking GPS xe
- Chat trực tiếp driver–khách
- Dynamic pricing AI
- Bán vé liên vận quốc tế
- Spring Boot backend (hướng mở rộng tương lai)
- Mobile app

---

## 8. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|-----------|---------|-----------|
| MVP | Landing · Auth · Search · SeatMap · Booking · Payment · QR · MyTickets · Settings (mọi role) · Admin CRUD đầy đủ · Driver (manifest + scanner + lịch sử + hoàn thành chuyến) · Ví · VIP (điều kiện mới) · Chatbot · Đánh giá · Dark mode · i18n · Avatar | 🔄 Đang phát triển |
| Phase 2 | Zalo ZNS · Đối soát dòng tiền · Báo cáo nâng cao | ⏳ |
| Phase 3 | Spring Boot backend · Mobile app · AI gợi ý tuyến | ⏳ |

---

## 9. Các điểm thay đổi so với v2.0

| Mục | Thay đổi |
|-----|---------|
| BR-07 | Đổi điều kiện VIP: từ "10 vé hoặc 10 chuyến" → "nạp tích lũy ≥10 triệu **hoặc** đặt ≥10 vé" |
| BR-08 | **Mới** — VIP được giảm 20% giá vé |
| BR-14 | **Mới** — Admin không CRUD admin khác |
| BR-15 | **Mới** — CASH_PENDING phải hiển thị mã đặt chỗ ngay |
| BR-16 | **Mới** — Điều kiện đánh giá chuyến |
| BR-17 | **Mới** — Driver không có PIN |
| BR-18 | **Mới** — Avatar hiển thị trên header |
| Admin Role | Bổ sung: nạp tiền hộ customer, nâng VIP thủ công, CRUD đầy đủ users/trips |
| Driver Role | Bổ sung: lịch sử chuyến, xác nhận hoàn thành, không có PIN |
| Customer Role | Bổ sung: đánh giá sau chuyến, xác nhận hoàn thành, VIP điều kiện mới |
| BO-13 | Kéo từ Phase 2 → **MVP** |
| BO-15 | **Mới** — Avatar mọi vai trò |