# Quy tắc Vue 3 + TypeScript (riêng cho dự án)

## Single File Components

- Component mới: dùng `<script setup lang="ts">`. Component cũ dạng `defineComponent({ setup() })` để nguyên, chỉ refactor khi thật sự cần thiết.
- KHÔNG import các compiler macro (`defineProps`, `defineEmits`, `withDefaults`) — chúng đã là global trong `<script setup>`.

## Scoped Styles

- Dùng `:deep(<selector>)` thay cho `::v-deep <selector>` (đã deprecated).
- Ưu tiên scoped style. Chỉ dùng global style khi phải override Ant Design Vue.

## Ant Design Vue 3.2.11

- Khoá ở **3.2.11** — không tự ý nâng version, các bản minor hay có breaking change.
- Validate form dùng `Form.useForm` (chuẩn hiện tại của codebase).

## Handsontable v16

- Import CSS:
  ```ts
  import 'handsontable/styles/handsontable.css'
  import 'handsontable/styles/ht-theme-main.css'  // hoặc ht-theme-classic.css
  ```
- Đường dẫn cũ `handsontable/dist/handsontable.full.css` đã bị bỏ ở v16, sẽ làm Vite dep-scan fail.

## Gọi API

- Mọi route backend khai báo trong [client/src/services/app/defineRouting.ts](../../client/src/services/app/defineRouting.ts). Thêm route mới ở đó, KHÔNG hard-code URL trong component.
- Wrap mỗi route bằng function có type trong `client/src/services/app/<feature>.ts`.

## TypeScript

- Code mới không dùng `any` — dùng `unknown` rồi narrow, hoặc generic.
- Function export phải có return type rõ ràng.
- Ưu tiên union string literal thay cho `enum` cho state nội bộ component.

## Import

- Dùng alias `@/` cho `src/` (đã cấu hình trong `vite.config.ts`).
- Xoá import không dùng — đã có lần auto-import nhầm `ajv/lib/vocabularies/applicator/items` làm Vite dep-scan treo cứng.
