# CRM PAKD — Ngữ cảnh dự án cho Claude

## Stack công nghệ

- **Frontend:** `client/` — Vue 3 + Vite + TypeScript + Ant Design Vue 3.2.11
  - Biểu đồ: AmCharts 4, AntV G2Plot
  - Bảng tính: Handsontable v16 (`@handsontable/vue3`)
  - Lịch: FullCalendar 5
  - Editor: Vue Quill
- **Backend:** `crm-service/` — Java **8** + Maven multi-module
  - Module: `VCRM`, `VcrmApp`, `VcrmGeneral`, `VcrmReport`, `VcrmSolr`, `VcrmSys`
  - Tìm kiếm: Solr
  - **KHÔNG** dùng API/feature Java 9+: `List.of`, `Map.of`, `Set.of`, `List.copyOf`, `Optional.isEmpty()`, `var`, `record`, sealed class, text block, switch expression arrow syntax, pattern matching `instanceof`. Code mới phải tương thích Java 8.
  - Thay thế tương đương:
    - `List.of()` → `Collections.emptyList()` / `Arrays.asList(...)` / `new ArrayList<>()`.
    - `Map.of("k", v)` → `new HashMap<>()` rồi `.put(...)`.
    - `Optional.isEmpty()` → `!opt.isPresent()`.
    - `var` → khai báo type tường minh.
    - `record` → class với Lombok `@Data` / `@Value`.
- **Build/Deploy:** Docker, Jenkins (môi trường: develop/staging/test)

## ⚠️ Môi trường cần VPN

Maven repo nội bộ + DB staging chỉ truy cập được qua **VPN Viettel**.
Frontend `npm install` cũng phụ thuộc registry nội bộ.

**KHÔNG tự chạy** `mvn ...`, `npm run build`, `npm run dev`, `vue-tsc`, `vite build`,
`mvn spring-boot:run` hoặc bất kỳ lệnh kết nối DB staging nào sau khi sửa code.
User sẽ tự build/test khi VPN sẵn sàng. Sau khi sửa xong, chỉ tóm tắt thay đổi và dừng.

Nếu cần kiểm tra cú pháp/logic — dùng `grep`/`Read` để self-review thay vì compile.

## Lệnh frontend (chạy trong `client/`)

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy Vite dev server |
| `npm run clean-dev` | Vite dev có `--force` (re-optimize deps khi đổi package) |
| `npm run build` | Build production |
| `npm run build-develop` / `build-staging` / `build-test` | Build theo môi trường |
| `npm run lint` | ESLint cho `src/**/*.{ts,js,vue}` |

## Lệnh backend (chạy trong `crm-service/`)

| Lệnh | Mục đích |
|---|---|
| `mvn clean install` | Build toàn bộ module |
| `mvn -pl <module> spring-boot:run` | Chạy 1 module |

## ⭐ Quy trình chuẩn xử lý task (LUÔN áp dụng)

Mỗi task giao trong `PYC_VCRM_Task_Subtask.xlsx` (đối chiếu `PYC Chinh sach _CRM.pdf`) đi qua pipeline:

1. **BA** (`ba-analyst`): đọc yêu cầu từ **nguồn chuẩn** [docs/PYC_VCRM_KhaiBaoChinhSach.md](../docs/PYC_VCRM_KhaiBaoChinhSach.md) (bản tổng hợp PYC + Excel; chỉ mở file gốc `.pdf`/`.xlsx` khi cần đối chiếu) → viết **System Design** dạng Markdown vào
   `docs/tasks/<Task-ID>-<slug>/system-design.md` (theo `docs/tasks/_TEMPLATE_system-design.md`).
2. **Leader chốt** (`team-lead-reviewer`): kiểm System Design, giải quyết BLOCKER với user. Còn BLOCKER → chưa cho Dev code.
3. **Dev** (`java-senior-dev`): **đọc rules + skills trước** (java rules, common rules, skill `springboot-patterns`/`api-design`/`security-review`), dựa vào System Design để code. **Thay đổi DB → sinh file SQL idempotent** `crm-service/sql/YYYY-MM-DD_<slug>.sql` để user tự chạy (KHÔNG tự chạy DB).
4. **Leader review** (`team-lead-reviewer`): review **tổng thể task + toàn dự án**, đối sánh System Design & PYC. Phần chưa hợp lý → **báo Dev sửa ngay** → review lại → tới khi APPROVE.

> SQL và mọi thay đổi cần VPN: user tự chạy. Agent chỉ tạo file + hướng dẫn.

**Thiết kế UI (Figma)**: https://www.figma.com/design/vY8ypsh8iQBYRXwfEdOpLV/VCRM_TuDongKhaiBaoChinhSach — nguồn chuẩn giao diện cho task có UI. BA/Dev đối chiếu bằng Figma MCP (`get_metadata`, `get_screenshot`, `get_design_context`). PYC ↔ Figma lệch → BLOCKER.

**Tracker tiến độ**: file local `PYC-1375.xlsx` (gốc dự án), cột J=STATUS (`To do`/`Process`/`Done`). Sau khi Leader review APPROVE → set STATUS=Done cho subtask đạt bằng `scripts/update_task_status.py <STT...> --status Done --dev <dev> --end <dd/MM/yyyy>` (cần python có openpyxl).

## File và quy ước quan trọng

- **Registry API routes:** [client/src/services/app/defineRouting.ts](client/src/services/app/defineRouting.ts) — object literal chứa toàn bộ route backend. **Không được trùng key** (TS1117 sẽ làm Vite dep-scan treo).
- **Service layer:** `client/src/services/app/*.ts` — wrap axios theo từng route trong `defineRouting`.
- **View:** `client/src/views/<feature>/...` — SFC tổ chức theo feature.
- **File chỉ sửa local:** một số file đang được đánh dấu `git update-index --skip-worktree` để giữ fix local. Xem danh sách bằng `git ls-files -v | grep '^S'`. KHÔNG cố commit/push các file này.

## Ngôn ngữ

UI và comment trong dự án dùng tiếng Việt. Giữ tone nhất quán với code hiện có khi thêm chuỗi mới.

## Format code

**CHỈ format code mới vừa viết/sửa**. KHÔNG format lại code cũ xung quanh.

- Không auto-format toàn file, không reflow indent/space của block không thuộc phạm vi sửa.
- Không đổi quote style (`"` ↔ `'`), không sắp xếp lại import của code cũ, không xoá dòng trắng "thừa" của code cũ.
- Diff phải tối thiểu — chỉ chứa thay đổi thực sự liên quan tới task. Reviewer cần thấy ngay phần mới mà không bị nhiễu bởi format noise.
- Nếu IDE/hook auto-format toàn file → revert phần không liên quan trước khi báo cáo "đã xong".

## KHÔNG comment code (BẮT BUỘC)

KHÔNG viết comment trong code — bất kỳ ngôn ngữ, bất kỳ phần nào:
- Java: `//`, `/* */`, `/** */` (Javadoc) → bỏ.
- TS/JS/Vue `<script>`: `//`, `/* */` → bỏ.
- Vue template / HTML: `<!-- -->` → bỏ.
- SQL: `--`, `/* */` → bỏ.

Code phải **tự diễn giải** qua tên hàm/biến/hằng rõ ràng (đúng quy ước đặt tên). Cần giải thích quyết định/nghiệp vụ → ghi vào **System Design** (`docs/tasks/...`) hoặc **memory**, KHÔNG ghi trong code.

**Ngoại lệ DUY NHẤT** (không phải comment giải thích, là directive bắt buộc cho tooling): `// eslint-disable-next-line ...`, `// @ts-ignore`, `@SuppressWarnings`. Chỉ giữ khi thực sự cần để build/lint chạy.

Áp dụng cho **code mới viết/sửa**. KHÔNG chủ động đi xoá comment của code cũ ngoài phạm vi task (giữ diff tối thiểu), trừ khi được yêu cầu.

## Memory

**BẮT BUỘC**: Sau khi xong mỗi việc (sửa code/cấu hình/tài liệu/file dự án), phải ghi tóm tắt vào [.claude/memory/memory.md](./memory/memory.md) trước khi báo cáo "đã xong" với user.

Format mỗi entry:

```
## YYYY-MM-DD — <tiêu đề ngắn>

- **Phạm vi**: file/đường dẫn đã thay đổi.
- **Thay đổi chính**: 1-3 gạch đầu dòng mô tả việc đã làm.
- **Lý do**: ngắn gọn (yêu cầu nghiệp vụ, fix lỗi, refactor...).
- **Ghi chú** (tuỳ chọn): rủi ro, TODO tiếp theo, lệnh user cần chạy (build/test).
```

Quy tắc:
- Append vào cuối file, KHÔNG ghi đè entry cũ.
- Nếu việc trải qua nhiều file/lần sửa, gom chung vào 1 entry cho cùng ngày + cùng task.
- Nếu chỉ đọc/khảo sát mà không sửa file → không cần ghi memory.
- Nếu user huỷ thay đổi → ghi entry note "rolled back" để trace.

## Quy tắc nội bộ

### Rules ([.claude/rules/](./rules/))

Project-specific (riêng cho CRM PAKD):
- [vue-typescript-style.md](./rules/vue-typescript-style.md) — Vue 3 + TS, Ant Design, Handsontable.
- [dependency-hygiene.md](./rules/dependency-hygiene.md) — version khoá, cách thêm deps.

Common (áp dụng mọi ngôn ngữ):
- [common/coding-style.md](./rules/common/coding-style.md), [common/code-review.md](./rules/common/code-review.md), [common/testing.md](./rules/common/testing.md), [common/security.md](./rules/common/security.md), [common/patterns.md](./rules/common/patterns.md)

TypeScript / JavaScript / Vue (`**/*.ts`, `**/*.vue`...):
- [typescript/coding-style.md](./rules/typescript/coding-style.md), [typescript/security.md](./rules/typescript/security.md), [typescript/testing.md](./rules/typescript/testing.md), [typescript/patterns.md](./rules/typescript/patterns.md)

Java / Spring Boot (`**/*.java`):
- [java/coding-style.md](./rules/java/coding-style.md), [java/security.md](./rules/java/security.md), [java/testing.md](./rules/java/testing.md), [java/patterns.md](./rules/java/patterns.md)

### Agents ([.claude/agents/](./agents/))

- [vue-reviewer](./agents/vue-reviewer.md) — review Vue 3 SFC.
- [api-route-keeper](./agents/api-route-keeper.md) — gác `defineRouting.ts`.
- [vite-build-doctor](./agents/vite-build-doctor.md) — chẩn đoán lỗi Vite.

Team phát triển (điều phối BA → Dev → Review):
- [team-lead-reviewer](./agents/team-lead-reviewer.md) — Leader: điều phối BA/Dev + review code trước merge.
- [ba-analyst](./agents/ba-analyst.md) — BA: phân tích nghiệp vụ từ PYC + task Excel → User Story/AC.
- [java-senior-dev](./agents/java-senior-dev.md) — Senior Java Dev: implement backend Java 8/Spring Boot từ đặc tả.

### Skills ([.claude/skills/](./skills/))

Project-specific:
- [run-dev](./skills/run-dev/SKILL.md), [add-api-route](./skills/add-api-route/SKILL.md), [fix-vite-deps](./skills/fix-vite-deps/SKILL.md)

Workflow chung:
- [codebase-onboarding](./skills/codebase-onboarding/SKILL.md) — onboard repo mới, sinh `CLAUDE.md`.
- [api-design](./skills/api-design/SKILL.md) — pattern thiết kế REST API.
- [security-review](./skills/security-review/SKILL.md) — checklist bảo mật toàn diện.
- [search-first](./skills/search-first/SKILL.md) — tìm giải pháp có sẵn trước khi tự code.
- [frontend-patterns](./skills/frontend-patterns/SKILL.md) — pattern Vue 3.
- [springboot-patterns](./skills/springboot-patterns/SKILL.md) — pattern Spring Boot.
