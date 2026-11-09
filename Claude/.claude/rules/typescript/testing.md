---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.vue"
---
# TypeScript / JavaScript — Testing

> Mở rộng từ [common/testing.md](../common/testing.md).

## Stack đề xuất

- **Unit / component**: Vitest + Vue Test Utils (tương thích Vite, nhanh).
- **E2E**: Playwright cho luồng user quan trọng.

Hiện tại codebase chưa có hạ tầng test rộng — khi thêm feature mới, ưu tiên viết test cho:
1. Service layer trong `client/src/services/app/*.ts`.
2. Component có logic phức tạp (form lớn, validation).
3. Util tự viết.

## Mẫu test component (Vitest + Vue Test Utils)

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserCard from '@/components/UserCard.vue'

describe('UserCard', () => {
  it('hiển thị tên user', () => {
    const wrapper = mount(UserCard, {
      props: { user: { id: '1', fullName: 'Nguyễn A' } }
    })
    expect(wrapper.text()).toContain('Nguyễn A')
  })

  it('emit select khi click', async () => {
    const wrapper = mount(UserCard, {
      props: { user: { id: '1', fullName: 'Nguyễn A' } }
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['1'])
  })
})
```

## Mock service layer

```typescript
import { vi } from 'vitest'
vi.mock('@/services/app/staff', () => ({
  getStaffById: vi.fn().mockResolvedValue({ id: '1', name: 'A' })
}))
```

## E2E cơ bản (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test('login flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'secret')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```
