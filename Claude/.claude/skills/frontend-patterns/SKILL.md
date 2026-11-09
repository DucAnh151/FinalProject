---
name: frontend-patterns
description: Pattern phát triển Vue 3 — Composition API, composable, state management, performance, form, accessibility. Dùng khi build component, quản lý state, tối ưu performance trong client/.
---

# Vue 3 Frontend Patterns

Pattern hiện đại cho Vue 3 + Vite — phù hợp với codebase CRM PAKD.

## Khi nào dùng

- Build component Vue (composition, props, render).
- Quản lý state (`ref`/`reactive`, provide/inject, Pinia).
- Fetch data (composable + axios).
- Tối ưu performance (`computed`, dynamic import, virtualization).
- Làm form (Ant Design Vue + `Form.useForm`, validate).
- Routing client-side, navigation.
- Build UI accessible, responsive.

## Pattern Component

### Composition over Inheritance

```vue
<!-- Card.vue -->
<script setup lang="ts">
interface Props { variant?: 'default' | 'outlined' }
const props = withDefaults(defineProps<Props>(), { variant: 'default' })
</script>

<template>
  <div :class="['card', `card-${props.variant}`]">
    <slot />
  </div>
</template>
```

```vue
<!-- CardHeader.vue, CardBody.vue: tương tự, chỉ slot -->

<!-- Sử dụng -->
<Card>
  <CardHeader>Tiêu đề</CardHeader>
  <CardBody>Nội dung</CardBody>
</Card>
```

### Compound Component (provide/inject)

```vue
<!-- Tabs.vue -->
<script setup lang="ts">
import { ref, provide } from 'vue'

interface Props { defaultTab: string }
const props = defineProps<Props>()

const activeTab = ref(props.defaultTab)
provide('tabsContext', { activeTab, setActiveTab: (id: string) => activeTab.value = id })
</script>

<template><div class="tabs"><slot /></div></template>
```

```vue
<!-- Tab.vue -->
<script setup lang="ts">
import { inject } from 'vue'

const ctx = inject<{ activeTab: any; setActiveTab: (id: string) => void }>('tabsContext')
if (!ctx) throw new Error('Tab phải dùng trong Tabs')

defineProps<{ id: string }>()
</script>

<template>
  <button
    :class="{ active: ctx.activeTab.value === id }"
    @click="ctx.setActiveTab(id)"
  >
    <slot />
  </button>
</template>
```

### Render với slot scoped (giống render prop)

```vue
<!-- DataLoader.vue -->
<script setup lang="ts" generic="T">
import { ref, onMounted } from 'vue'

const props = defineProps<{ url: string }>()
const data = ref<T | null>(null)
const loading = ref(true)
const error = ref<Error | null>(null)

onMounted(async () => {
  try {
    const res = await fetch(props.url)
    data.value = await res.json()
  } catch (e) {
    error.value = e as Error
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <slot :data="data" :loading="loading" :error="error" />
</template>
```

```vue
<DataLoader<Market[]> url="/api/markets">
  <template #default="{ data, loading, error }">
    <Spinner v-if="loading" />
    <ErrorView v-else-if="error" :error="error" />
    <MarketList v-else :markets="data!" />
  </template>
</DataLoader>
```

## Composable (Custom Hook)

### Toggle

```typescript
// composables/useToggle.ts
import { ref } from 'vue'

export function useToggle(initial = false) {
  const value = ref(initial)
  const toggle = () => { value.value = !value.value }
  return [value, toggle] as const
}

// Dùng
const [isOpen, toggleOpen] = useToggle()
```

### Async data fetching

```typescript
// composables/useQuery.ts
import { ref, watchEffect, type Ref } from 'vue'

interface UseQueryOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  enabled?: Ref<boolean> | boolean
}

export function useQuery<T>(
  key: Ref<string> | string,
  fetcher: () => Promise<T>,
  options?: UseQueryOptions<T>
) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const loading = ref(false)

  const refetch = async () => {
    loading.value = true
    error.value = null
    try {
      const result = await fetcher()
      data.value = result
      options?.onSuccess?.(result)
    } catch (e) {
      error.value = e as Error
      options?.onError?.(e as Error)
    } finally {
      loading.value = false
    }
  }

  watchEffect(() => {
    const enabled = typeof options?.enabled === 'boolean'
      ? options.enabled
      : options?.enabled?.value ?? true
    if (enabled) refetch()
  })

  return { data, error, loading, refetch }
}
```

### Debounce

```typescript
// composables/useDebounce.ts
import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number) {
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

## State Management

### Provide/Inject + reactive (đơn giản)

```typescript
// stores/marketStore.ts
import { reactive, readonly, inject, provide, type InjectionKey } from 'vue'

interface State { markets: Market[]; selected: Market | null; loading: boolean }

const key: InjectionKey<ReturnType<typeof createMarketStore>> = Symbol('marketStore')

export function createMarketStore() {
  const state = reactive<State>({ markets: [], selected: null, loading: false })

  function setMarkets(ms: Market[]) { state.markets = ms }
  function selectMarket(m: Market) { state.selected = m }

  return { state: readonly(state), setMarkets, selectMarket }
}

export function provideMarketStore() {
  const store = createMarketStore()
  provide(key, store)
  return store
}

export function useMarketStore() {
  const store = inject(key)
  if (!store) throw new Error('useMarketStore phải dùng trong cây có provideMarketStore')
  return store
}
```

### Pinia (khi state phức tạp / dùng nhiều nơi)

```typescript
import { defineStore } from 'pinia'

export const useMarketStore = defineStore('market', {
  state: () => ({ markets: [] as Market[], selected: null as Market | null }),
  actions: {
    async fetchMarkets() {
      this.markets = await api.getMarkets()
    }
  }
})
```

## Performance

### Memo bằng `computed`

```typescript
const sortedMarkets = computed(() =>
  [...markets.value].sort((a, b) => b.volume - a.volume)
)
```

### Code Splitting với dynamic import

```typescript
// router
const Dashboard = () => import('@/views/Dashboard.vue')

// Component lazy
import { defineAsyncComponent } from 'vue'
const HeavyChart = defineAsyncComponent(() => import('@/components/HeavyChart.vue'))
```

### Virtualization

Khi list lớn (>100 dòng), dùng `vue-virtual-scroller`:

```vue
<RecycleScroller
  :items="markets"
  :item-size="100"
  key-field="id"
  v-slot="{ item }"
>
  <MarketCard :market="item" />
</RecycleScroller>
```

## Form (Ant Design Vue)

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import { Form, message } from 'ant-design-vue'
import { createMarket } from '@/services/app/market'

const useForm = Form.useForm

const formData = reactive({
  name: '',
  description: '',
  endDate: ''
})

const rules = reactive({
  name: [
    { required: true, message: 'Tên bắt buộc', trigger: 'blur' },
    { max: 200, message: 'Tối đa 200 ký tự', trigger: 'blur' }
  ],
  description: [{ required: true, message: 'Mô tả bắt buộc' }],
  endDate: [{ required: true, message: 'Ngày kết thúc bắt buộc' }]
})

const { validate, validateInfos } = useForm(formData, rules)

async function handleSubmit() {
  try {
    await validate()
    await createMarket(formData)
    message.success('Tạo thành công')
  } catch (err) {
    // validate fail hoặc API fail
  }
}
</script>

<template>
  <a-form @submit.prevent="handleSubmit">
    <a-form-item label="Tên" v-bind="validateInfos.name">
      <a-input v-model:value="formData.name" />
    </a-form-item>
    <a-form-item label="Mô tả" v-bind="validateInfos.description">
      <a-textarea v-model:value="formData.description" />
    </a-form-item>
    <a-button type="primary" html-type="submit">Tạo</a-button>
  </a-form>
</template>
```

## Error Boundary

Vue 3 dùng `onErrorCaptured`:

```vue
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  error.value = err as Error
  console.error('ErrorBoundary bắt lỗi:', err)
  return false  // chặn lan lên trên
})
</script>

<template>
  <div v-if="error" class="error-fallback">
    <h2>Có lỗi xảy ra</h2>
    <p>{{ error.message }}</p>
    <button @click="error = null">Thử lại</button>
  </div>
  <slot v-else />
</template>
```

## Animation (Vue Transition)

```vue
<TransitionGroup name="market-list" tag="div">
  <MarketCard
    v-for="market in markets"
    :key="market.id"
    :market="market"
  />
</TransitionGroup>

<style>
.market-list-enter-active,
.market-list-leave-active { transition: all 0.3s ease; }
.market-list-enter-from { opacity: 0; transform: translateY(20px); }
.market-list-leave-to { opacity: 0; transform: translateY(-20px); }
</style>
```

## Accessibility

### Keyboard navigation

```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ options: string[] }>()
const emit = defineEmits<{ select: [string] }>()

const isOpen = ref(false)
const activeIndex = ref(0)

function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, props.options.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      emit('select', props.options[activeIndex.value])
      isOpen.value = false
      break
    case 'Escape':
      isOpen.value = false
      break
  }
}
</script>

<template>
  <div
    role="combobox"
    :aria-expanded="isOpen"
    aria-haspopup="listbox"
    @keydown="handleKeyDown"
  >
    <!-- Dropdown UI -->
  </div>
</template>
```

**Nguyên tắc**: pattern hiện đại giúp UI dễ bảo trì, hiệu năng tốt. Chọn pattern phù hợp với độ phức tạp của dự án — không over-engineer.
