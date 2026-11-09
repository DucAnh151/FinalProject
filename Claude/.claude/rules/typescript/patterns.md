---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.vue"
---
# TypeScript / JavaScript — Pattern

> Mở rộng từ [common/patterns.md](../common/patterns.md).

## Định dạng API Response

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Vue Composable (Custom Hook)

```typescript
import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number): Ref<T> {
  const debounced = ref(value.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(value, (newVal) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = newVal }, delay)
  })

  onUnmounted(() => { if (timer) clearTimeout(timer) })
  return debounced
}
```

## Repository Pattern

```typescript
interface Repository<T, CreateDto, UpdateDto> {
  findAll(filters?: Record<string, unknown>): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

## Service layer của dự án

Theo convention CRM PAKD, mỗi feature có 1 file service trong `client/src/services/app/<feature>.ts`. Service wrap axios với type rõ ràng, key route lấy từ `defineRouting.ts`:

```typescript
import API from '@/services/app/defineRouting'
import http from '@/utils/request'

interface Staff {
  id: string
  fullName: string
  orgUnitId: string
}

export function getStaffById(id: string): Promise<Staff> {
  return http.get(API.FIND_STAFF, { params: { id } })
}
```
