# Yêu cầu Testing

## Coverage tối thiểu: 80%

Loại test (đủ cả 3):
1. **Unit Test** — function, utility, component đơn lẻ.
2. **Integration Test** — API endpoint, thao tác database.
3. **E2E Test** — luồng user quan trọng (chọn framework theo ngôn ngữ).

## Test-Driven Development (TDD)

Quy trình bắt buộc:
1. Viết test trước (RED — fail).
2. Chạy test → phải FAIL.
3. Implement tối thiểu để pass (GREEN).
4. Chạy test → phải PASS.
5. Refactor (IMPROVE).
6. Verify coverage (≥ 80%).

## Khi test fail

1. Kiểm tra test isolation (test này có phụ thuộc test khác không?).
2. Verify mock đã đúng chưa.
3. Sửa implementation, KHÔNG sửa test (trừ khi test thật sự sai).

## Cấu trúc test (AAA Pattern)

Arrange → Act → Assert:

```typescript
test('tính cosine similarity đúng cho 2 vector vuông góc', () => {
  // Arrange
  const v1 = [1, 0, 0]
  const v2 = [0, 1, 0]

  // Act
  const result = calculateCosineSimilarity(v1, v2)

  // Assert
  expect(result).toBe(0)
})
```

## Đặt tên test

Mô tả hành vi đang test:

```typescript
test('trả về mảng rỗng khi không có market khớp query', () => {})
test('throw lỗi khi thiếu API key', () => {})
test('fallback substring search khi Redis không khả dụng', () => {})
```

Tránh tên kiểu `test1`, `should work`, `correct case`.
