# Yêu cầu Testing

## Thực tế dự án: chưa có hạ tầng test

Không có test runner, không `test` script, không file test. Vì vậy **test không chặn merge** ở dự án này, và tuyệt đối không được báo "đã test" khi chỉ đọc code.

Chi tiết cách verify, stack đề xuất khi user muốn thêm test, và mẫu test: [javascript/testing.md](../javascript/testing.md).

## Cách verify thay thế (bắt buộc làm trước khi báo xong)

1. **Review tĩnh** — đọc lại toàn bộ luồng vừa sửa, `grep` các call site bị ảnh hưởng.
2. **Kiểm syntax** — backend: `node --check js/<file>.js`; frontend: `cd frontend && npm run build`.
3. **Đối sánh BR** — mở `docs/BRD.md` §5, xác nhận từng rule liên quan được code đúng.
4. **Liệt kê bước user tự thử** — nêu rõ endpoint/URL, dữ liệu mẫu, kết quả mong đợi. Báo cáo phải có mục này nếu thay đổi chạm luồng chạy được.

Nói rõ trong báo cáo đâu là điều đã **verify** và đâu là điều mới **review tĩnh**.

## Khi user yêu cầu viết test

Thứ tự ưu tiên (giá trị cao nhất trước):

1. **Logic nghiệp vụ thuần** — tính phí hủy (BR-04), giảm giá VIP (BR-08), điều kiện lên VIP (BR-07), giới hạn ghế (BR-02). Hàm thuần, không cần DB, dễ sai nhất.
2. **Helper dùng chung** — `js/lib/*`.
3. **Endpoint** booking / payment / wallet — cần database test **riêng**, không bao giờ chạy trên `pam_travel` thật.
4. **Composable** có timer/polling — kiểm cleanup.

## TDD khi làm logic nghiệp vụ mới

Nếu đang viết hàm tính toán nghiệp vụ và đã có test runner:

1. Viết test trước (RED — fail).
2. Chạy → phải FAIL.
3. Implement tối thiểu để pass (GREEN).
4. Chạy → phải PASS.
5. Refactor.

Không áp TDD cho việc dựng UI hay sửa route CRUD đơn giản — không đáng chi phí ở giai đoạn này.

## Khi test fail

1. Kiểm tra test isolation (test này có phụ thuộc test khác / dữ liệu seed không?).
2. Verify mock đã đúng chưa.
3. Sửa **implementation**, KHÔNG sửa test — trừ khi chứng minh được test sai.

## Cấu trúc test (AAA Pattern)

Arrange → Act → Assert:

```js
it('thu phí 10% và hoàn 90% khi hủy vé (BR-04)', () => {
  // Arrange
  const total = 500_000

  // Act
  const { fee, refund } = calcRefund(total)

  // Assert
  expect(fee).toBe(50_000)
  expect(refund).toBe(450_000)
})
```

## Đặt tên test

Mô tả hành vi, kèm mã BR khi là rule nghiệp vụ:

```js
it('không cho chọn quá 5 ghế trong 1 lần đặt (BR-02)', () => {})
it('trả 403 khi ADMIN gọi API đặt vé (BR-13)', () => {})
it('nhả ghế về AVAILABLE khi lock quá 5 phút (BR-01)', () => {})
```

Tránh tên kiểu `test1`, `should work`, `correct case`.
