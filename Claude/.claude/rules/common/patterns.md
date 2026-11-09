# Pattern chung

## Dùng skeleton có sẵn khi triển khai mới

1. Tìm skeleton/template đã được kiểm chứng.
2. Đánh giá song song nhiều ứng viên về:
   - Bảo mật.
   - Khả năng mở rộng.
   - Mức độ phù hợp với yêu cầu.
   - Kế hoạch tích hợp.
3. Clone cái phù hợp nhất làm nền.
4. Tinh chỉnh trong cấu trúc đã được kiểm chứng.

## Repository Pattern

Đóng gói lớp truy cập dữ liệu sau interface thống nhất:
- Định nghĩa thao tác chuẩn: `findAll`, `findById`, `create`, `update`, `delete`.
- Cài đặt cụ thể xử lý chi tiết storage (DB, API, file...).
- Business logic phụ thuộc interface, không phụ thuộc cách lưu trữ.
- Dễ thay nguồn dữ liệu, dễ mock khi test.

## Định dạng API Response

Dùng envelope nhất quán cho mọi response:
- Có cờ thành công / status.
- Có data payload (nullable khi lỗi).
- Có thông báo lỗi (nullable khi thành công).
- Có metadata cho response phân trang (`total`, `page`, `limit`).

```ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { total: number; page: number; limit: number }
}
```
