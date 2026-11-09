---
name: search-first
description: Quy trình "tìm trước, viết sau" — tìm tool, library, pattern đã có trước khi viết code mới. Dùng khi bắt đầu feature, thêm dependency, hoặc tạo utility/abstraction mới.
---

# Search First — Tìm trước, viết sau

Hệ thống hoá workflow "tìm giải pháp có sẵn trước khi tự code".

## Trigger

- Bắt đầu feature mới mà có thể đã có giải pháp sẵn.
- Cần thêm dependency / integration.
- User yêu cầu "thêm chức năng X" và bạn định viết code mới.
- Trước khi tạo utility / helper / abstraction mới.

## Quy trình

```
┌─────────────────────────────────────────────┐
│ 1. PHÂN TÍCH NHU CẦU                        │
│    Xác định chức năng cần                    │
│    Ràng buộc về ngôn ngữ / framework         │
├─────────────────────────────────────────────┤
│ 2. TÌM SONG SONG                            │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│    │ Repo nội │ │  npm /   │ │ GitHub / │   │
│    │   bộ     │ │   npm    │ │  Web     │   │
│    └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────┤
│ 3. ĐÁNH GIÁ                                 │
│    Cho điểm: chức năng, maintain,            │
│    cộng đồng, doc, license, dependency       │
├─────────────────────────────────────────────┤
│ 4. QUYẾT ĐỊNH                               │
│    ┌─────────┐  ┌──────────┐  ┌─────────┐    │
│    │ Adopt   │  │ Extend   │  │ Build   │    │
│    │ as-is   │  │ /Wrap    │  │ Custom  │    │
│    └─────────┘  └──────────┘  └─────────┘    │
├─────────────────────────────────────────────┤
│ 5. TRIỂN KHAI                               │
│    Cài package / Cấu hình MCP /              │
│    Viết code custom tối thiểu                │
└─────────────────────────────────────────────┘
```

## Ma trận quyết định

| Tín hiệu | Hành động |
|----------|-----------|
| Khớp đúng, được maintain tốt, license MIT/Apache | **Adopt** — cài và dùng trực tiếp |
| Khớp một phần, nền tốt | **Extend** — cài + viết wrapper mỏng |
| Nhiều cái khớp yếu | **Compose** — kết hợp 2-3 package nhỏ |
| Không có gì phù hợp | **Build** — tự code, dựa trên kết quả nghiên cứu |

## Cách dùng

### Quick mode (inline)

Trước khi viết utility hay thêm chức năng, tự hỏi:

0. Repo này đã có chưa? → `grep` trong `js/lib/`, `js/routes/`, `frontend/src/` trước.
1. Vấn đề phổ biến không? → search npm.
2. Có MCP server cho việc này không? → check `~/.claude/settings.json`.
3. Có skill nào cho việc này không? → check `~/.claude/skills/`.
4. Có template GitHub nào không? → search code GitHub trước khi tự viết.

### Full mode (dùng agent researcher)

Cho chức năng phức tạp, khởi chạy agent:

```
Task(subagent_type="general-purpose", prompt="
  Tìm tool có sẵn cho: [MÔ TẢ]
  Ngôn ngữ/framework: [LANG]
  Ràng buộc: [GÌ]

  Tìm ở: npm/MCP/skill/GitHub
  Trả: so sánh có cấu trúc + đề xuất
")
```

## Shortcut theo nhóm

### Tooling phát triển
- Lint → `eslint` (dự án chưa cài — hỏi user trước khi thêm)
- Format → `prettier`
- Test → `vitest`, `node:test`
- Pre-commit → `husky`, `lint-staged`

### Data & API
- HTTP client → `axios` (đã có ở cả 2 workspace — dùng cái này)
- Validation → viết tay theo pattern hiện có; `zod` chỉ khi user đồng ý thêm dep
- Database → Prisma Client (đã có); không thêm ORM khác

### Xử lý nội dung
- Markdown → `remark`, `markdown-it`
- Excel/CSV → `xlsx`
- PDF → `pdf-lib`

## Ví dụ

### Ví dụ 1: "Thêm check link chết trong markdown"
```
Cần: kiểm tra link gãy trong file markdown
Tìm: npm "markdown dead link checker"
Tìm thấy: textlint-rule-no-dead-link (9/10)
Hành động: ADOPT — npm install textlint-rule-no-dead-link
Kết quả: 0 dòng code custom, giải pháp đã được kiểm chứng
```

### Ví dụ 2: "Thêm HTTP client có retry"
```
Cần: HTTP client resilient có retry, timeout
Tìm: npm "http retry"
Tìm thấy: axios-retry (tương thích axios đã dùng)
Hành động: ADOPT — dùng trực tiếp với cấu hình retry
Kết quả: 0 dòng code custom, lib đã được production-tested
```

### Ví dụ 3: "Validate file config theo schema"
```
Cần: validate file config dự án theo schema
Tìm: npm "config linter schema"
Tìm thấy: ajv-cli (8/10)
Hành động: ADOPT + EXTEND — cài ajv-cli, viết schema riêng
Kết quả: 1 package + 1 schema, 0 logic validate custom
```

## Anti-pattern

- **Nhảy thẳng vào code**: viết util mà không check đã có chưa.
- **Bỏ qua MCP**: không kiểm tra MCP server có sẵn cho task không.
- **Wrap quá đà**: bọc lib quá kín đến mức mất hết lợi ích.
- **Phình dependency**: cài lib khổng lồ chỉ để dùng 1 chức năng nhỏ.

## Ràng buộc riêng của Pam Travel

**KHÔNG tự thêm, phải hỏi user trước:**
- UI framework (Tailwind, Ant Design, Element, Bootstrap) — dự án cố ý dùng vanilla CSS.
- TypeScript, hoặc bất kỳ bước build thêm cho backend.
- ORM / query builder khác Prisma; state library khác Pinia.
- Test framework (kéo theo devDependency + script + config).

**Ưu tiên tuyệt đối:** dùng lại cái đã có trong `package.json` (gốc hoặc `frontend/`). `axios`, `bcrypt`, `qrcode`, `dotenv`, `cors`, Prisma đã sẵn — phần lớn nhu cầu giải quyết được bằng chúng.

**Cài đúng workspace:** backend → `npm i <pkg>` ở gốc; UI → `cd frontend && npm i <pkg>`. Cài sai chỗ thì import fail và rất khó nhìn ra.

Thêm dependency làm `package-lock.json` đổi → nêu rõ trong báo cáo.
