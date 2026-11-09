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
│    │   bộ     │ │ Maven    │ │  Web     │   │
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

0. Repo này đã có chưa? → `grep`/`rg` trong module liên quan trước.
1. Vấn đề phổ biến không? → search npm / Maven Central.
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

  Tìm ở: npm/Maven/MCP/skill/GitHub
  Trả: so sánh có cấu trúc + đề xuất
")
```

## Shortcut theo nhóm

### Tooling phát triển
- Lint → `eslint`, `checkstyle`, `ruff`
- Format → `prettier`, `google-java-format`, `black`
- Test → `vitest`, `junit`, `pytest`
- Pre-commit → `husky`, `lint-staged`

### Data & API
- HTTP client → `axios`/`ky` (JS), `RestClient`/`WebClient` (Spring)
- Validation → `zod` (TS), `Bean Validation` (Java), `pydantic` (Python)
- Database → check MCP server trước

### Xử lý nội dung
- Markdown → `remark`, `markdown-it`
- Excel/CSV → `xlsx`, Apache POI
- PDF → `pdf-lib`, iText, `pdfplumber`

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
Tìm: npm "http retry", Maven Spring retry
Tìm thấy: got + retry plugin (Node), Spring Retry (Java)
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
