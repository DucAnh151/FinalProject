---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.vue"
---
# JavaScript / Vue — Bảo mật

> Mở rộng từ [common/security.md](../common/security.md).

## ⚠️ Lỗ hổng đã biết của dự án: không verify token

Backend **không có middleware auth**. Mọi endpoint nhận `userId` từ client (body/query/param) và tin luôn. `JWT_SECRET` khai báo nhưng không dùng. Hệ quả: đổi `userId` trong request là đọc/ghi được dữ liệu người khác (IDOR), và `role` cũng do client khai.

Khi viết endpoint mới đụng dữ liệu người dùng hoặc tiền:

```js
// Tối thiểu: ràng buộc quyền sở hữu trong chính câu query
const booking = await prisma.bookings.findFirst({
  where: { id: BigInt(bookingId), user_id: BigInt(userId) }
});
if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });
```

- Endpoint admin/driver: kiểm tra `role` lấy **từ DB theo `userId`**, không tin `role` client gửi.
- Luôn nêu rõ trong báo cáo rằng ràng buộc này vẫn bypass được.
- **Không** viết comment/tài liệu khẳng định endpoint đã được bảo vệ.

## Quản lý secret

```js
// SAI
const dbPassword = 'postgres123'

// ĐÚNG — backend
const dbPassword = process.env.DB_PASSWORD
if (!dbPassword) throw new Error('DB_PASSWORD chưa được cấu hình')

// ĐÚNG — frontend (Vite)
const baseURL = import.meta.env.VITE_API_BASE_URL
```

- Chỉ biến prefix `VITE_` được expose ra client. **Không bao giờ** đặt `JWT_SECRET`, password DB vào biến `VITE_*`.
- `.env` đã nằm trong `.gitignore` — giữ vậy. Thêm biến mới thì cập nhật `.env.example` (tên biến, giá trị để trống).

## SQL injection

- Prisma Client (`findMany`, `where`...) đã tham số hoá — an toàn.
- Raw query: dùng template tag `prisma.$queryRaw` hoặc `pool.query(sql, [params])` với placeholder `$1`, `$2`. **KHÔNG** nối chuỗi:
  ```js
  // SAI
  pool.query(`SELECT * FROM users WHERE email = '${email}'`)
  // ĐÚNG
  pool.query('SELECT * FROM users WHERE email = $1', [email])
  ```
- Endpoint legacy `POST /query` trong `js/server.js` nhận SQL thô từ client (chỉ chặn bằng `startsWith('SELECT')`). Đây là lỗ hổng nghiêm trọng còn lại của prototype: **không dùng, không mở rộng**; nếu user muốn dọn thì đề xuất xoá cùng `js/db.js`.

## Password, PIN, OTP

- `bcrypt.hash(value, 10)` cho password và PIN ví (BR-11). Không tự nghĩ thuật toán hash, không MD5/SHA1.
- So sánh bằng `bcrypt.compare` — không so sánh chuỗi hash trực tiếp.
- OTP (BR-12): 6 số, hiệu lực 5 phút, lưu `notifications`. Hết hạn phải kiểm tra bằng thời gian server, không tin thời gian client gửi.
- **Không log** password, PIN, OTP, hash, token — kể cả trong `console.error`.
- Message đăng nhập sai: giữ chung chung khi có thể. Hiện code phân biệt "Tài khoản không tồn tại" vs "Mật khẩu không đúng" (giúp dò user tồn tại); nếu siết bảo mật thì gộp thành "Tài khoản hoặc mật khẩu không đúng" — nhưng đổi là thay đổi hành vi UI, hỏi user trước.

## Validate input

Validate ở backend kể cả khi UI đã validate (client bypass được):

```js
if (!phone && !email)
  return res.status(400).json({ error: 'Vui lòng nhập số điện thoại hoặc email' });
if (!password || password.length < 6)
  return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
if (seatIds.length > 5)
  return res.status(400).json({ error: 'Chỉ được chọn tối đa 5 ghế' });   // BR-02
```

- Số tiền: kiểm tra `> 0` và là số hữu hạn trước khi ghi ví (BR-09 — số dư không âm).
- Id từ param: `Number.isInteger(Number(id))` trước khi `BigInt(id)` (`BigInt('abc')` throw và sẽ thành 500).
- Mảng từ client: kiểm tra `Array.isArray` và giới hạn độ dài.

## XSS

- Vue escape mặc định khi dùng `{{ }}` — an toàn.
- `v-html` chỉ dùng với nội dung tự sinh, **không** với dữ liệu từ user/API. Cần render HTML user → sanitize trước (vd. `dompurify`), và hỏi user trước khi thêm dependency.
- Không `innerHTML = userInput`. Code legacy `js/auth.js` đang `innerHTML` với `user.fullName` — đó là prototype, đừng lặp lại pattern đó trong `frontend/`.

## Token ở client

Session lưu `sessionStorage` key `pam_user` (kèm `token` nếu backend trả). `sessionStorage` đọc được bởi JS → XSS là đọc được session. Khi nào backend có auth thật, đề xuất chuyển sang httpOnly cookie.

Luôn truy cập qua `authStore`, không đọc `sessionStorage` rải rác.

## CORS & rate limiting

- `app.use(cors())` hiện mở cho **mọi origin**. Khi deploy thật phải giới hạn: `cors({ origin: process.env.CORS_ORIGIN })`.
- **Chưa có rate limiting**. Endpoint login, OTP, thanh toán là mục tiêu brute-force — nếu user muốn siết, đề xuất `express-rate-limit` cho `/api/auth` và `/api/payments`.

## Lỗi & log

- Không trả `e.message` của DB/Prisma về client (lộ schema). Trả `{ error: 'Lỗi server' }`, log chi tiết ở server.
- Log đủ context để truy vết: module, `userId`, `bookingId`, thời gian. Không log toàn bộ `req.body` (chứa password/PIN).
