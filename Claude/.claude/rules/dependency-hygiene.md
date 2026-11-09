# Quy tắc về Dependency

## Khi Vite dep-scan fail

Triệu chứng: `npm run dev` treo hoặc báo "Failed to scan for dependencies from entries" / "Missing specifier" / "could not be resolved".

Nguyên nhân thường gặp:

1. **Import thừa** do IDE auto-import vào path không tồn tại ở version đã cài. → Xoá import.
2. **Sai version major** — thư viện đã đổi cấu trúc nhưng import cũ còn sót. → Kiểm tra `node_modules/<pkg>/package.json` để biết version thật, sửa lại path import.
3. **Trùng key trong TS object** (TS1117) — esbuild dep-scan crash âm thầm sau khi in tên file. → Quét nhanh:
   ```bash
   grep -oE '^  [A-Z_0-9]+:' <file> | sort | uniq -d
   ```

## Version đang khoá — KHÔNG tự ý nâng

- `ant-design-vue@3.2.11`
- `axios@0.21.1` (legacy, dùng nhiều nơi)
- `dayjs@1.11.2`
- `handsontable@^16` (đường dẫn CSS đã đổi so với v14, đừng downgrade)

Phải bàn với team trước khi upgrade các package này.

## Khi thêm dependency mới

1. Tìm trên GitHub/npm xem đã có giải pháp chưa, tránh tự viết tiện ích.
2. Kiểm tra package có còn được maintain không (release < 12 tháng, không có CVE nghiêm trọng).
3. Ưu tiên dùng package đã có sẵn trong `package.json` thay vì cài thêm.

## Lockfile

`package-lock.json` đang ở chế độ `skip-worktree` ở local. Khi cần đổi lockfile thật sự (thêm/bỏ package), phối hợp với team — đừng commit ad hoc.
