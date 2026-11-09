---
name: add-api-route
description: Thêm 1 route API mới vào dự án CRM PAKD đúng convention — khai báo trong defineRouting.ts, tạo wrapper trong service layer, kèm type. Dùng khi user yêu cầu "thêm API mới", "gọi endpoint X", "tạo service cho ...".
---

# Thêm route API mới

## Quy trình chuẩn

### Bước 1 — Khai báo path trong registry

Mở [client/src/services/app/defineRouting.ts](../../../client/src/services/app/defineRouting.ts), thêm key vào nhóm phù hợp (theo comment block đã có).

```ts
// Trong nhóm tương ứng (vd. STAFF, ORG UNIT, CONTRACT...)
NEW_ROUTE_NAME: '/path/to/endpoint',
```

Quy tắc:
- Key viết HOA, snake_case: `GET_USER_PROFILE`, `UPDATE_CONTRACT_STATUS`.
- Tiền tố động từ rõ nghĩa: `GET_`, `SEARCH_`, `CREATE_`, `UPDATE_`, `DELETE_`, `FIND_BY_`...
- KHÔNG được trùng key đã có. Sau khi thêm, kiểm tra:
  ```bash
  grep -oE '^  [A-Z_0-9]+:' client/src/services/app/defineRouting.ts | sort | uniq -d
  ```
  Kết quả phải rỗng.

### Bước 2 — Wrapper trong service layer

Trong `client/src/services/app/<feature>.ts` (vd. `staff.ts`, `contract.ts`), thêm function có type:

```ts
import API from '@/services/app/defineRouting'
import http from '@/utils/request'   // hoặc axios instance dự án dùng

interface UserProfile {
  id: string
  fullName: string
  email: string
}

export function getUserProfile(userId: string): Promise<UserProfile> {
  return http.get(API.GET_USER_PROFILE, { params: { userId } })
}
```

Quy tắc:
- Tham số input và return type khai báo rõ ràng.
- Nếu endpoint có path param dạng `/orgUnit/{id}`, thay bằng template literal:
  ```ts
  http.get(API.GET_ORG_UNIT_DETAIL.replace('{id}', String(id)))
  ```
- KHÔNG hard-code lại URL trong service.

### Bước 3 — Sử dụng từ component

```vue
<script setup lang="ts">
import { getUserProfile } from '@/services/app/staff'

const profile = await getUserProfile(userId)
</script>
```

## Checklist trước khi commit

- [ ] Key mới trong `defineRouting.ts` không trùng.
- [ ] Có wrapper trong service layer, có type input/output.
- [ ] Component không hard-code URL.
- [ ] `npm run dev` chạy được, không có cảnh báo TS mới.

## Khi cần kiểm tra tổng thể

Gọi agent `api-route-keeper` để quét toàn bộ registry.
