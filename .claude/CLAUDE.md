# Pam Travel — Ngữ cảnh dự án cho Claude

Website đặt vé xe khách trực tuyến: tìm chuyến → chọn ghế (sơ đồ thời gian thực) → đặt vé → thanh toán → vé QR. 3 vai trò: `CUSTOMER`, `DRIVER`, `ADMIN`.

## Stack công nghệ

- **Backend:** `js/` — Node.js + **Express 4** (CommonJS, `require`), chạy tại `http://localhost:3001`, mọi API dưới prefix `/api`.
  - DB access: **Prisma Client 5.22** (`@prisma/client`) là đường chính. `pg` `Pool` chỉ còn ở `js/server.js` (route legacy `/login`, `/register`, `/query`, `/health`).
  - Mount route trong [js/server.js](../js/server.js). Mỗi domain 1 file trong [js/routes/](../js/routes/): `auth`, `trips`, `bookings`, `payments`, `tickets`, `admin`, `driver`, `wallet`, `landing`, `reviews`.
  - Background job: [js/jobs/seatUnlocker.js](../js/jobs/seatUnlocker.js) (60 giây — nhả ghế/booking hết hạn), [js/jobs/tripCloser.js](../js/jobs/tripCloser.js) (5 phút — đóng chuyến trước giờ chạy 60 phút).
  - Helper dùng chung: [js/lib/bookingConfirm.js](../js/lib/bookingConfirm.js).
  - Bcrypt cho password và PIN ví. `dotenv` đọc `.env` ở gốc.
- **Frontend:** `frontend/` — **Vue 3.5 + Vite 8**, **JavaScript thuần (KHÔNG TypeScript)**, Composition API.
  - State: **Pinia 3** — [authStore](../frontend/src/stores/authStore.js), [bookingStore](../frontend/src/stores/bookingStore.js), [uiStore](../frontend/src/stores/uiStore.js).
  - HTTP: axios instance duy nhất [frontend/src/services/api.js](../frontend/src/services/api.js) (baseURL `VITE_API_BASE_URL`, tự gắn `Bearer`, 401 → về `/login`).
  - Router: [frontend/src/router/index.js](../frontend/src/router/index.js) — route guard theo `meta.requiresAuth` / `meta.role` / `meta.disallowRoles` / `meta.guestOnly`.
  - CSS: vanilla CSS trong `<style scoped>` + [frontend/src/style.css](../frontend/src/style.css). **Không có** UI framework (không Ant Design / Tailwind / Element).
  - QR vé: `qrcode`.
- **Database:** PostgreSQL, database `pam_travel`, schema `public`, 21 bảng. Schema chuẩn: [prisma/schema.prisma](../prisma/schema.prisma). Seed: [sql/seed_data_optimized.sql](../sql/seed_data_optimized.sql).
- **Tài liệu nghiệp vụ (nguồn chuẩn):** [docs/BRD.md](../docs/BRD.md), [docs/SRS.md](../docs/SRS.md), `docs/Tổng quan dữ liệu .md`, [README.md](../README.md) (lộ trình 9 task frontend).

### Code legacy — KHÔNG mở rộng

`index.html`, `login.html`, `pages/*.html`, `css/`, [js/db.js](../js/db.js), [js/auth.js](../js/auth.js), `update-trip.js` là prototype HTML tĩnh có **trước** khi dựng `frontend/`. Giữ nguyên để tham khảo; feature mới **luôn** làm trong `frontend/` (Vue). Khi sửa backend, đừng thêm logic mới vào các route legacy trong `js/server.js` — tạo/sửa trong `js/routes/*.js`.

## Môi trường

Chạy local trên **Windows** (PowerShell). Không VPN, không Docker, không CI — mọi thứ chạy trực tiếp trên máy.

| Lệnh | Ở đâu | Mục đích |
|---|---|---|
| `npm run dev` | gốc dự án | Backend qua nodemon (auto-reload) |
| `npm start` | gốc dự án | Backend bằng node |
| `npm run dev` | `frontend/` | Vite dev server |
| `npm run build` | `frontend/` | Build production |
| `npx prisma generate` | gốc dự án | Sinh lại Prisma Client sau khi đổi schema |
| `npx prisma db pull` | gốc dự án | Đồng bộ `schema.prisma` từ DB thật |

**Được phép tự chạy:** `npm run dev`/`build` (frontend), `npx prisma generate`, `npx prisma validate`, `node --check <file>`, `git` read-only.

**KHÔNG tự chạy:** lệnh ghi vào DB — `npx prisma db push`, `prisma migrate`, `psql`, chạy file SQL. DB là dữ liệu thật của user → **sinh file SQL để user tự chạy** (xem skill `db-change`).

`.env` ở gốc (xem [.env.example](../.env.example)): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `PORT`. Prisma cần thêm `DATABASE_URL`. Frontend: `frontend/.env` với `VITE_API_BASE_URL`.

## ⚠️ Nợ kỹ thuật phải biết trước khi code

1. **Backend chưa verify token.** `JWT_SECRET` có trong `.env.example` nhưng **không có middleware auth nào** trong `js/`. Frontend gửi `Authorization: Bearer` nhưng backend bỏ qua; mọi endpoint tin `userId` do client gửi trong body/query/param → bất kỳ ai cũng gọi được API của người khác (IDOR). **Không được mô tả hệ thống như đã có authentication.** Khi thêm endpoint đụng dữ liệu người dùng hoặc tiền: nêu rõ rủi ro này trong báo cáo; nếu user muốn fix, đề xuất middleware `verifyToken` dùng chung cho `js/routes/*`.
2. **BigInt.** Prisma map `BIGSERIAL` → `BigInt`, `JSON.stringify` sẽ throw. `js/server.js` đã patch `BigInt.prototype.toJSON`, nhưng convention trong route là **convert tường minh**: `id: Number(row.id)`. Giữ đúng convention này cho code mới.
3. **Múi giờ.** Ngày từ client là chuỗi `YYYY-MM-DD` theo giờ VN. Luôn parse bằng template literal có hậu tố `+07:00` (xem `js/routes/trips.js`) — đừng dùng `new Date(date)` (bị hiểu là UTC, lệch ngày).
4. **`new PrismaClient()` mỗi file route.** Mỗi `js/routes/*.js` tự khởi tạo một instance. Chưa gộp — **đừng thêm instance mới ở file khác**; nếu refactor thì gộp về một singleton dùng chung và sửa hết một lượt.
5. **Chưa có test, chưa có lint.** Không có `test`/`lint` script. Đừng hứa "đã test" khi chỉ đọc code — self-review bằng `grep`/đọc file và nói rõ là review tĩnh.

## Business Rules (BR) — nguồn chuẩn: [docs/BRD.md](../docs/BRD.md) §5

Code đang tham chiếu BR bằng comment (`// BR-04 ...`). Khi sửa logic nghiệp vụ, **đọc BR tương ứng trước**:

| Mã | Tóm tắt |
|---|---|
| BR-01 | Lock ghế 5 phút, hết hạn tự nhả về `AVAILABLE` |
| BR-02 | Tối đa 5 ghế/lần đặt |
| BR-03 | Chống double booking bằng transaction + `trip_seat_status` |
| BR-04 | Hủy vé: phí 10%, hoàn 90% vào ví |
| BR-05 | Cảnh báo mất 10% trước khi confirm thanh toán |
| BR-06 | Đóng bán vé trước giờ khởi hành 60 phút |
| BR-07 | VIP: nạp tích lũy ≥ 10.000.000 VNĐ **HOẶC** ≥ 10 vé `CONFIRMED` |
| BR-08 | VIP giảm 20% giá vé |
| BR-09 | Số dư ví không được âm |
| BR-10 | Booking `CASH_PENDING` chỉ DRIVER được phân công mới confirm |
| BR-11 | PIN 6 số, bcrypt hash |
| BR-12 | OTP 6 số, hiệu lực 5 phút, lưu ở `notifications` |
| BR-13 | ADMIN không được đặt vé |
| BR-14 | Admin chỉ CRUD user `CUSTOMER`/`DRIVER` |
| BR-15 | Vé `CASH_PENDING` phải hiện booking ID ngay |
| BR-16 | Chỉ đánh giá khi trip `COMPLETED` và booking `CONFIRMED` |
| BR-17 | Driver không cài PIN thanh toán |
| BR-18 | Avatar hiện ở header cho mọi vai trò |

## ⭐ Quy trình chuẩn xử lý task

Áp dụng cho task có nghiệp vụ (thêm/sửa luồng đặt vé, thanh toán, ví, phân quyền...). Task nhỏ (sửa UI, fix lỗi 1 file) làm trực tiếp, không cần pipeline.

1. **BA** (`ba-analyst`): đọc `docs/BRD.md` + `docs/SRS.md` (+ `README.md` nếu là task frontend) → viết System Design vào `docs/tasks/<Task-ID>-<slug>/system-design.md` theo [docs/tasks/_TEMPLATE_system-design.md](../docs/tasks/_TEMPLATE_system-design.md).
2. **Leader chốt** (`team-lead-reviewer`): soát System Design, giải quyết BLOCKER với user. Còn BLOCKER → chưa cho Dev code.
3. **Dev** (`node-senior-dev`): đọc rules + skills trước, implement theo System Design. Đổi schema → sinh file SQL idempotent `sql/YYYY-MM-DD_<slug>.sql` cho user tự chạy.
4. **Leader review** (`team-lead-reviewer`): review tổng thể task + đối sánh BR/SRS → báo Dev sửa ngay → review lại tới khi APPROVE.

Đụng Vue SFC → thêm `vue-reviewer`. Đụng danh sách endpoint → thêm `api-route-keeper`.

## Ngôn ngữ

UI, thông báo lỗi trả về client, comment trong code và tài liệu: **tiếng Việt**. Giữ tone nhất quán với code hiện có.

Message lỗi API theo đúng format đang dùng: `res.status(4xx).json({ error: 'Thông báo tiếng Việt' })`. Thành công: `{ success: true, ... }`.

## Comment code

Codebase này **có comment tiếng Việt** và đó là style của dự án — giữ nguyên. Quy tắc:

- Comment nêu **tại sao** / tham chiếu BR (`// BR-06: không hiển thị chuyến khởi hành trong vòng 60 phút tới`), không diễn giải lại điều code đã nói rõ.
- Mỗi handler route mới: 1 dòng comment header kiểu `// GET /api/trips/search?originId=&destinationId=&departureDate=` (đúng convention hiện có).
- Không để lại comment chết (code đã comment-out), `TODO` không người nhận, hay comment mô tả sai code.

## Format code

**CHỈ format code mới vừa viết/sửa.** KHÔNG format lại code cũ xung quanh.

- Không auto-format toàn file, không reflow indent của block ngoài phạm vi sửa.
- Không đổi quote style, không sắp xếp lại import của code cũ, không xoá dòng trắng của code cũ.
- Codebase hiện dùng **cột căn chỉnh** ở object literal (`id:       Number(user.id),`). Giữ style đó khi sửa trong cùng block.
- Diff phải tối thiểu — reviewer cần thấy ngay phần mới, không bị nhiễu format noise.

## Memory

**BẮT BUỘC**: sau khi xong mỗi việc (sửa code/cấu hình/tài liệu), ghi tóm tắt vào [.claude/memory/memory.md](./memory/memory.md) trước khi báo "đã xong".

```
## YYYY-MM-DD — <tiêu đề ngắn>

- **Phạm vi**: file/đường dẫn đã thay đổi.
- **Thay đổi chính**: 1-3 gạch đầu dòng.
- **Lý do**: ngắn gọn (BR nào, fix lỗi gì, refactor...).
- **Ghi chú** (tuỳ chọn): rủi ro, TODO, lệnh/SQL user cần chạy.
```

- Append vào cuối file, KHÔNG ghi đè entry cũ.
- Nhiều lần sửa cùng task cùng ngày → gom 1 entry.
- Chỉ đọc/khảo sát, không sửa file → không cần ghi.
- User huỷ thay đổi → ghi entry note "rolled back" để trace.

## Quy tắc nội bộ

### Rules ([.claude/rules/](./rules/))

Riêng dự án:
- [express-prisma-style.md](./rules/express-prisma-style.md) — convention backend `js/`.
- [vue-style.md](./rules/vue-style.md) — convention frontend `frontend/`.
- [dependency-hygiene.md](./rules/dependency-hygiene.md) — version đang dùng, cách thêm deps.

Chung mọi ngôn ngữ:
- [common/coding-style.md](./rules/common/coding-style.md), [common/code-review.md](./rules/common/code-review.md), [common/testing.md](./rules/common/testing.md), [common/security.md](./rules/common/security.md), [common/patterns.md](./rules/common/patterns.md)

JavaScript / Vue (`**/*.js`, `**/*.vue`):
- [javascript/coding-style.md](./rules/javascript/coding-style.md), [javascript/security.md](./rules/javascript/security.md), [javascript/testing.md](./rules/javascript/testing.md), [javascript/patterns.md](./rules/javascript/patterns.md)

### Agents ([.claude/agents/](./agents/))

- [ba-analyst](./agents/ba-analyst.md) — BA: BRD/SRS → System Design.
- [node-senior-dev](./agents/node-senior-dev.md) — Dev: implement Express + Prisma + Vue.
- [team-lead-reviewer](./agents/team-lead-reviewer.md) — Leader: điều phối + review trước merge.
- [vue-reviewer](./agents/vue-reviewer.md) — review Vue 3 SFC.
- [api-route-keeper](./agents/api-route-keeper.md) — soát endpoint backend ↔ lời gọi frontend.
- [vite-build-doctor](./agents/vite-build-doctor.md) — chẩn đoán lỗi Vite.

### Skills ([.claude/skills/](./skills/))

Riêng dự án:
- [run-dev](./skills/run-dev/SKILL.md) — chạy backend + frontend trên Windows.
- [add-api-route](./skills/add-api-route/SKILL.md) — thêm endpoint đúng convention (backend → store → view).
- [db-change](./skills/db-change/SKILL.md) — đổi schema an toàn: Prisma + file SQL cho user chạy.
- [fix-vite-deps](./skills/fix-vite-deps/SKILL.md) — fix lỗi Vite dep-scan.

Workflow chung:
- [express-prisma-patterns](./skills/express-prisma-patterns/SKILL.md) — pattern backend Express + Prisma.
- [frontend-patterns](./skills/frontend-patterns/SKILL.md) — pattern Vue 3 + Pinia.
- [api-design](./skills/api-design/SKILL.md) — thiết kế REST API.
- [security-review](./skills/security-review/SKILL.md) — checklist bảo mật.
- [search-first](./skills/search-first/SKILL.md) — tìm giải pháp có sẵn trước khi tự code.
- [codebase-onboarding](./skills/codebase-onboarding/SKILL.md) — onboard repo, sinh `CLAUDE.md`.
