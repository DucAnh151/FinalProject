# Memory — Pam Travel

Nhật ký công việc đã làm, append-only. Format và quy tắc: xem mục "Memory" trong [.claude/CLAUDE.md](../CLAUDE.md).

Entry mới thêm vào **cuối file**. Không ghi đè entry cũ.

---

## 2026-11-09 — Khởi tạo bộ cấu hình `.claude/` cho Pam Travel

- **Phạm vi**: `.claude/` (toàn bộ), `docs/tasks/_TEMPLATE_system-design.md`.
- **Thay đổi chính**:
  - Thay bộ `.claude/` của dự án khác (CRM PAKD — Java 8/Spring Boot + Vue TS) bằng bộ viết riêng cho Pam Travel: `CLAUDE.md`, 12 rules, 6 agents, 10 skills, `settings.local.json`.
  - Bỏ toàn bộ phần Java/Maven/Spring/Solr/Handsontable/Ant Design, phần VPN, Figma, Excel tracker, và thư mục `__MACOSX` (môi trường là Windows).
  - Thêm nội dung đặc thù dự án: bảng BR-01→BR-18, nợ kỹ thuật (backend chưa verify token, BigInt, timezone +07:00, PrismaClient mỗi route, chưa có test/lint), convention response `{ error }` / `{ success: true }`, ranh giới code legacy.
  - Agent: `java-senior-dev` → `node-senior-dev`; `api-route-keeper` chuyển từ gác `defineRouting.ts` sang soát endpoint backend ↔ lời gọi frontend. Skill: `springboot-patterns` → `express-prisma-patterns`, thêm `db-change`.
  - Đảo quy tắc comment: dự án cũ cấm comment, Pam Travel giữ comment tiếng Việt + tham chiếu mã BR theo style codebase hiện có.
  - Bỏ yêu cầu coverage 80% / TDD bắt buộc vì dự án chưa có test runner; thay bằng quy trình verify tĩnh (`node --check`, `npm run build`, đối sánh BR) và yêu cầu không được tuyên bố "đã test" khi chưa chạy gì.
- **Lý do**: folder `.claude` trong repo đang là bản giải nén của dự án khác, mọi hướng dẫn đều sai stack.
- **Ghi chú**:
  - Bản gốc nằm ở `Claude/.claude` (git-tracked, commit `b45374a`) — đã xoá khỏi working tree, phục hồi được bằng `git checkout -- Claude`.
  - Nợ kỹ thuật được ghi lại trong `CLAUDE.md` và `rules/common/security.md` là **mô tả hiện trạng**, chưa fix gì. Cần quyết định của user trước khi thêm middleware auth / rate limiting / dọn `POST /query`.
