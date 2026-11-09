---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.vue"
---
# TypeScript / JavaScript — Coding Style

> Mở rộng từ [common/coding-style.md](../common/coding-style.md).

## Type và Interface

### Public API
- Function export, utility dùng chung, public method: khai báo type cho param và return.
- Biến local có kiểu hiển nhiên: để TypeScript infer.
- Object shape lặp lại nhiều chỗ: trích thành interface/type có tên.

```typescript
// SAI
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// ĐÚNG
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### `interface` vs `type`
- `interface`: object shape có thể extend / implement.
- `type`: union, intersection, tuple, mapped type, utility type.
- Ưu tiên union string literal thay cho `enum` (trừ khi cần `enum` để interop).

### Tránh `any`
- Không dùng `any` trong code mới.
- Dùng `unknown` cho input ngoài/không tin cậy, rồi narrow.
- Dùng generic khi type phụ thuộc caller.

```typescript
// SAI
function getErrorMessage(error: any) {
  return error.message
}

// ĐÚNG
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Lỗi không xác định'
}
```

### Vue 3 Component Props
- Dùng interface/type có tên cho props.
- Type rõ ràng cho callback props (emit, function param).
- `<script setup lang="ts">` không cần import `defineProps`/`defineEmits`/`withDefaults`.

```vue
<script setup lang="ts">
interface Props {
  user: { id: string; email: string }
  onSelect: (id: string) => void
}
const props = defineProps<Props>()
</script>
```

## Bất biến

Dùng spread operator để update bất biến:

```typescript
// SAI — mutation
function updateUser(user: User, name: string): User {
  user.name = name
  return user
}

// ĐÚNG
function updateUser(user: Readonly<User>, name: string): User {
  return { ...user, name }
}
```

## Xử lý lỗi

```typescript
async function loadUser(id: string): Promise<User> {
  try {
    return await api.getUser(id)
  } catch (error: unknown) {
    logger.error('Load user thất bại', error)
    throw new Error(getErrorMessage(error))
  }
}
```

## Validate input

Trong dự án này dùng Form rules của Ant Design Vue (`Form.useForm`). Với schema phức tạp / validate ngoài form, có thể dùng Zod:

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>
```

## console.log

- Không để `console.log` trong code commit.
- Dùng logger thật khi cần — hiện codebase dùng `console.error`/`console.warn` ở vài nơi, tối thiểu phải có context.
