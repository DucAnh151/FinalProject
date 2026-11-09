---
name: codebase-onboarding
description: Phân tích một codebase lạ và sinh hướng dẫn onboard có cấu trúc — bản đồ kiến trúc, entry point chính, convention, và CLAUDE.md khởi đầu. Dùng khi vừa nhận dự án mới hoặc lần đầu setup Claude Code cho repo.
---

# Codebase Onboarding

Phân tích có hệ thống một codebase lạ và sinh hướng dẫn onboard có cấu trúc.

## Khi nào dùng

- Lần đầu mở dự án bằng Claude Code.
- Vừa join team / repo mới.
- User hỏi "giúp tôi hiểu codebase này".
- User yêu cầu sinh `CLAUDE.md` cho dự án.
- User nói "onboard tôi" hoặc "dẫn tôi đi qua repo này".

## Cách thực hiện

### Phase 1 — Trinh sát

Thu thập tín hiệu thô về dự án mà KHÔNG đọc từng file. Chạy song song:

```
1. Phát hiện package manifest
   → package.json, go.mod, Cargo.toml, pyproject.toml, pom.xml, build.gradle,
     Gemfile, composer.json, mix.exs, pubspec.yaml

2. Nhận diện framework
   → next.config.*, nuxt.config.*, vite.config.*, angular.json,
     application.yml/properties (Spring), Django settings, FastAPI main

3. Tìm entry point
   → main.*, index.*, app.*, server.*, cmd/, src/main/

4. Chụp cây thư mục (2 cấp đầu)
   → bỏ qua node_modules, vendor, .git, dist, build, target, __pycache__

5. Phát hiện config & tooling
   → .eslintrc*, .prettierrc*, tsconfig.json, Makefile, Dockerfile,
     docker-compose*, Jenkinsfile, .env.example, CI configs

6. Phát hiện cấu trúc test
   → tests/, test/, src/test/java, __tests__/, *.spec.ts, *.test.js,
     pytest.ini, jest.config.*, vitest.config.*
```

### Phase 2 — Vẽ kiến trúc

Từ dữ liệu Phase 1, xác định:

**Tech Stack**
- Ngôn ngữ và phiên bản.
- Framework chính, thư viện lớn.
- Database, ORM.
- Build tool, bundler.
- CI/CD.

**Mẫu kiến trúc**
- Monolith / monorepo / microservice / serverless.
- Tách FE/BE hay full-stack.
- API style: REST, GraphQL, gRPC.

**Thư mục then chốt**
Map từng thư mục cấp cao tới mục đích.

```
# Ví dụ với Pam Travel
js/routes/      → Handler Express theo domain (auth, trips, bookings, payments...)
js/jobs/        → Background job (seatUnlocker 60s, tripCloser 5 phút)
js/lib/         → Helper nghiệp vụ dùng chung
prisma/         → schema.prisma (nguồn chuẩn cấu trúc DB)
frontend/src/   → Vue 3 + Vite (views, stores, services, router)
docs/           → BRD, SRS, tổng quan dữ liệu (nguồn chuẩn nghiệp vụ)
pages/, css/    → prototype HTML tĩnh (legacy, không mở rộng)
```

**Luồng dữ liệu**
Theo dõi 1 request từ entry → response:
- Request vào ở đâu? (router, handler, controller)
- Validate ở đâu? (middleware, schema, guard)
- Logic nghiệp vụ ở đâu? (service, use case)
- Truy cập DB qua đâu? (ORM, raw SQL, repository)

### Phase 3 — Nhận diện convention

**Đặt tên file**
- kebab-case, camelCase, PascalCase, snake_case.
- Mẫu test: `*.test.js`, `*.spec.js` (Pam Travel hiện **chưa có** test nào).

**Mẫu code**
- Cách xử lý lỗi (try/catch, Result type, exception domain).
- DI hay import trực tiếp.
- Quản lý state.
- Pattern async (callback, promise, async/await).

### Phase 4 — Sinh artifact

Tạo 2 output:

#### Output 1 — Hướng dẫn onboard

```markdown
# Hướng dẫn onboard: [Tên dự án]

## Tổng quan
[2-3 câu: dự án làm gì, phục vụ ai]

## Tech Stack
| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Frontend | Vue 3 + Vite (JS thuần) | 3.5 / 8.x |
| State | Pinia | 3.x |
| Backend | Node.js + Express | 4.x |
| ORM | Prisma Client | 5.22 |
| DB | PostgreSQL | — |

## Kiến trúc
[Sơ đồ hoặc mô tả các thành phần]

## Entry point chính
- [Đường dẫn router / handler chính]

## Bản đồ thư mục
[Map thư mục → mục đích]

## Vòng đời 1 request
[Trace 1 API request]

## Convention
- [Cách đặt tên file]
- [Cách xử lý lỗi]
- [Mẫu test]

## Lệnh thường dùng
- Dev: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

## Tôi muốn... thì xem ở đâu
| Muốn... | Xem... |
|---------|--------|
| Thêm endpoint API | `js/routes/<domain>.js` + mount trong `js/server.js` |
| Thêm trang UI | `frontend/src/views/` + route trong `frontend/src/router/index.js` |
| Sửa state dùng chung | `frontend/src/stores/` |
| Gọi API từ UI | `frontend/src/services/api.js` (axios instance duy nhất) |
| Tra cấu trúc DB | `prisma/schema.prisma` |
| Tra rule nghiệp vụ | `docs/BRD.md` §5 (BR-01 → BR-18) |
| Đổi schema | skill `db-change` → sinh `sql/YYYY-MM-DD_*.sql` cho user chạy |
```

#### Output 2 — `CLAUDE.md` khởi đầu

Nếu đã có `CLAUDE.md`, ĐỌC trước rồi bổ sung — giữ nguyên hướng dẫn cũ, đánh dấu phần mới.

```markdown
# Hướng dẫn dự án

## Tech Stack
[Tóm tắt stack đã phát hiện]

## Coding Style
- [Convention đặt tên]
- [Pattern cần follow]

## Testing
- Lệnh test: `[lệnh đã phát hiện]`
- Mẫu file test: [convention đã thấy]

## Build & Run
- Dev: `[lệnh dev]`
- Build: `[lệnh build]`
- Lint: `[lệnh lint]`

## Cấu trúc dự án
[Map thư mục]

## Convention
- [Mẫu xử lý lỗi]
- [Pattern đặc thù dự án]
```

## Best practice

1. **Đừng đọc tất cả** — Phase 1 dùng Glob/Grep, không Read mọi file. Chỉ Read khi tín hiệu mơ hồ.
2. **Verify, đừng đoán** — config nói framework X nhưng code thật dùng framework Y → tin code.
3. **Tôn trọng `CLAUDE.md` cũ** — bổ sung, không thay thế.
4. **Ngắn gọn** — onboarding guide đọc trong 2 phút. Chi tiết để trong code.
5. **Đánh dấu phần không chắc** — "Không xác định được test runner" tốt hơn là đoán bừa.

## Anti-pattern

- `CLAUDE.md` quá 100 dòng — phải tập trung.
- Liệt kê mọi dependency — chỉ nêu cái định hình cách viết code.
- Mô tả thư mục hiển nhiên (`src/` không cần giải thích).
- Copy-paste README — onboarding phải bổ sung góc nhìn mà README không có.

## Áp dụng cho Pam Travel (repo hiện tại)

Repo này **đã có** bộ cấu hình đầy đủ — đừng sinh lại từ đầu:

- Ngữ cảnh dự án: [.claude/CLAUDE.md](../../CLAUDE.md)
- Rules: [.claude/rules/](../../rules/) (common + javascript + express-prisma-style + vue-style)
- Skills: [.claude/skills/](../../skills/)
- Agents: [.claude/agents/](../../agents/)

Dùng skill này khi:
- User muốn **cập nhật** `CLAUDE.md` sau một thay đổi kiến trúc lớn (thêm middleware auth, tách module, thêm test runner).
- Cần viết hướng dẫn onboard cho thành viên mới của nhóm.
- Áp dụng cho một repo **khác**.

Khi cập nhật `.claude/CLAUDE.md`: đọc trước, giữ các mục "Nợ kỹ thuật", bảng BR, và mục "Quy trình chuẩn xử lý task" — chúng chứa thông tin không suy ra được từ code.
