---
name: api-design
description: Pattern thiết kế REST API — đặt tên resource, status code, phân trang, filter, error response, versioning, rate limiting. Dùng khi thiết kế endpoint mới hoặc review API contract đã có.
---

# Pattern thiết kế API

Convention và best practice để xây REST API nhất quán, thân thiện với developer.

## Khi nào dùng

- Thiết kế endpoint mới.
- Review API contract đã có.
- Thêm pagination, filter, sort.
- Thiết kế xử lý lỗi cho API.
- Lên kế hoạch versioning.

## Thiết kế resource

### Cấu trúc URL

```
# Resource là danh từ, số nhiều, chữ thường, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resource cho quan hệ
GET    /api/v1/users/:id/orders
POST   /api/v1/users/:id/orders

# Action không thuộc CRUD (dùng động từ tiết chế)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
```

### Quy tắc đặt tên

```
# TỐT
/api/v1/team-members          # kebab-case cho resource nhiều từ
/api/v1/orders?status=active  # query param cho filter
/api/v1/users/123/orders      # nested cho quan hệ sở hữu

# XẤU
/api/v1/getUsers              # động từ trong URL
/api/v1/user                  # số ít (phải số nhiều)
/api/v1/team_members          # snake_case trong URL
```

## HTTP Method và Status Code

### Ý nghĩa method

| Method | Idempotent | Safe | Dùng cho |
|--------|-----------|------|----------|
| GET | Có | Có | Lấy resource |
| POST | Không | Không | Tạo resource, trigger action |
| PUT | Có | Không | Thay thế toàn bộ resource |
| PATCH | Không* | Không | Cập nhật một phần |
| DELETE | Có | Không | Xoá |

### Bảng status code

```
# Thành công
200 OK                    — GET, PUT, PATCH (có response body)
201 Created               — POST (kèm header Location)
204 No Content            — DELETE, PUT (không body)

# Lỗi client
400 Bad Request           — Validation fail, JSON sai cú pháp
401 Unauthorized          — Thiếu/sai authentication
403 Forbidden             — Đã auth nhưng không có quyền
404 Not Found             — Resource không tồn tại
409 Conflict              — Trùng, conflict state
422 Unprocessable Entity  — Cú pháp đúng nhưng dữ liệu sai
429 Too Many Requests     — Vượt rate limit

# Lỗi server
500 Internal Server Error — Lỗi không mong muốn (KHÔNG lộ chi tiết)
502 Bad Gateway           — Service upstream lỗi
503 Service Unavailable   — Quá tải tạm thời (kèm Retry-After)
```

### Sai lầm thường gặp

```
# XẤU: 200 cho mọi tình huống
{ "status": 200, "success": false, "error": "Not found" }

# TỐT: dùng status code đúng nghĩa
HTTP/1.1 404 Not Found
{ "error": { "code": "not_found", "message": "User not found" } }
```

## Định dạng response

### Thành công

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

### Collection có pagination

```json
{
  "data": [{"id": "abc-123"}, {"id": "def-456"}],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1",
    "next": "/api/v1/users?page=2"
  }
}
```

### Lỗi

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validate fail",
    "details": [
      {"field": "email", "message": "Email không hợp lệ", "code": "invalid_format"}
    ]
  }
}
```

## Pagination

### Offset-based (đơn giản)

```
GET /api/v1/users?page=2&per_page=20

SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 20;
```

**Ưu**: dễ làm, hỗ trợ "nhảy đến trang N".
**Nhược**: chậm khi offset lớn, không ổn định khi có insert đồng thời.

### Cursor-based (mở rộng tốt)

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

SELECT * FROM users WHERE id > :cursor_id ORDER BY id ASC LIMIT 21;
```

**Ưu**: hiệu năng nhất quán, ổn định khi có insert.
**Nhược**: không nhảy trang tuỳ ý, cursor opaque.

### Khi nào dùng cái nào

| Tình huống | Loại |
|------------|------|
| Admin dashboard, dataset nhỏ (<10K) | Offset |
| Infinite scroll, feed, dataset lớn | Cursor |
| API public | Cursor (mặc định) + offset (tuỳ chọn) |
| Search result | Offset (user muốn số trang) |

## Filter, Sort, Search

```
# Filter đơn giản
GET /api/v1/orders?status=active&customer_id=abc-123

# Operator (bracket notation)
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/orders?created_at[after]=2025-01-01

# Nhiều giá trị (phẩy)
GET /api/v1/products?category=electronics,clothing

# Sort (prefix - cho desc)
GET /api/v1/products?sort=-created_at
GET /api/v1/products?sort=-featured,price

# Search
GET /api/v1/products?q=wireless+headphones

# Sparse fieldset (chỉ lấy field cần)
GET /api/v1/users?fields=id,name,email
```

## Auth

```
# Bearer token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API key (server-to-server)
X-API-Key: sk_live_abc123
```

## Rate Limiting

```
# Header thành công
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# Khi vượt
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Vượt giới hạn. Thử lại sau 60 giây."
  }
}
```

| Tier | Limit | Window | Use case |
|------|-------|--------|----------|
| Anonymous | 30/min | per IP | Endpoint public |
| Authenticated | 100/min | per user | API thường |
| Premium | 1000/min | per API key | Plan trả phí |
| Internal | 10000/min | per service | Service-to-service |

## Versioning

### URL Path (đề xuất)

```
/api/v1/users
/api/v2/users
```

### Chiến lược

```
1. Bắt đầu với /api/v1/ — chưa cần version cho đến khi thật sự cần.
2. Tối đa 2 version active (current + previous).
3. Lộ trình deprecate:
   - Thông báo trước (6 tháng cho API public)
   - Header Sunset: Sunset: Sat, 01 Jan 2026 00:00:00 GMT
   - Sau ngày sunset: trả 410 Gone
4. Thay đổi không-breaking KHÔNG cần version mới:
   - Thêm field response
   - Thêm query param tuỳ chọn
   - Thêm endpoint mới
5. Thay đổi breaking PHẢI có version mới:
   - Xoá / đổi tên field
   - Đổi type field
   - Đổi cấu trúc URL
   - Đổi cách auth
```

## Mẫu Spring Boot

```java
@RestController
@RequestMapping("/api/v1/users")
@Validated
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest req) {
        var user = userService.create(req);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .header("Location", "/api/v1/users/" + user.id())
            .body(ApiResponse.ok(UserResponse.from(user)));
    }
}
```

## Checklist trước khi ship endpoint

- [ ] URL theo convention (số nhiều, kebab-case, không động từ).
- [ ] Đúng method HTTP.
- [ ] Đúng status code (không phải 200 cho mọi case).
- [ ] Validate input bằng schema (Bean Validation, Zod).
- [ ] Error response theo format chuẩn.
- [ ] Có pagination cho endpoint list.
- [ ] Đã yêu cầu auth (hoặc đánh dấu rõ là public).
- [ ] Đã check authorization (user chỉ truy cập được resource của mình).
- [ ] Đã cấu hình rate limit.
- [ ] Response không lộ stack trace, lỗi SQL.
- [ ] Đặt tên nhất quán với endpoint cũ.
- [ ] Đã update OpenAPI/Swagger spec.
