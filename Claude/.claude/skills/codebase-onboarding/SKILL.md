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
# Ví dụ với CRM PAKD
client/                  → Frontend Vue 3 + Vite
crm-service/VCRM         → Module Java/Spring Boot chính
crm-service/VcrmReport   → Module báo cáo
crm-service/VcrmSolr     → Module tìm kiếm Solr
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
- Mẫu test: `*.test.ts`, `*.spec.ts`, `*Test.java`.

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
| Frontend | Vue 3 + Vite | 3.x / 4.x |
| Backend | Spring Boot | 3.x |
| DB | PostgreSQL | 16 |
| Search | Solr | 8.x |

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
| Thêm endpoint API | `crm-service/.../controller/` |
| Thêm trang UI | `client/src/views/` |
| Thêm route API client | `client/src/services/app/defineRouting.ts` |
| Thêm test | thư mục tương ứng |
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
