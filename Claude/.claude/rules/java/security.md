---
paths:
  - "**/*.java"
---
# Java — Bảo mật

> Mở rộng từ [common/security.md](../common/security.md).

## Quản lý secret

- Không hard-code API key, token, credential trong source.
- Dùng environment variable: `System.getenv("API_KEY")`.
- Production: dùng secret manager (Vault, AWS Secrets Manager).
- File config local có secret để trong `.gitignore`.

```java
// SAI
private static final String API_KEY = "sk-abc123...";

// ĐÚNG
String apiKey = System.getenv("PAYMENT_API_KEY");
Objects.requireNonNull(apiKey, "PAYMENT_API_KEY chưa được set");
```

## Phòng SQL Injection

- LUÔN dùng parameterized query — không nối chuỗi user input vào SQL.
- Dùng `PreparedStatement` hoặc API parameterized của framework.
- Validate / sanitize input trước khi dùng trong native query.

```java
// SAI — SQL injection do nối chuỗi
Statement stmt = conn.createStatement();
String sql = "SELECT * FROM orders WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// ĐÚNG — PreparedStatement
PreparedStatement ps = conn.prepareStatement("SELECT * FROM orders WHERE name = ?");
ps.setString(1, name);

// ĐÚNG — JdbcTemplate
jdbcTemplate.query("SELECT * FROM orders WHERE name = ?", mapper, name);
```

## Validate input

- Validate mọi input từ user ngay tại biên hệ thống.
- Dùng Bean Validation (`@NotNull`, `@NotBlank`, `@Size`...) trên DTO.
- Sanitize đường dẫn file và chuỗi do user cung cấp trước khi dùng.
- Reject input không hợp lệ với message rõ ràng.

```java
public Order createOrder(String customerName, BigDecimal amount) {
    if (customerName == null || customerName.isBlank()) {
        throw new IllegalArgumentException("Tên khách hàng bắt buộc");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
    }
    return new Order(customerName, amount);
}
```

## Authentication & Authorization

- KHÔNG tự code crypto cho auth — dùng thư viện đã được kiểm chứng.
- Lưu password bằng bcrypt hoặc Argon2; KHÔNG dùng MD5/SHA1.
- Kiểm tra quyền tại biên service.
- Không log password, token, PII.

## Bảo mật dependency

- Audit dependency: `mvn dependency:tree`.
- Quét CVE: OWASP Dependency-Check, Snyk.
- Cập nhật dependency thường xuyên (Dependabot, Renovate).

## Thông báo lỗi

- KHÔNG expose stack trace, đường dẫn nội bộ, lỗi SQL ra response API.
- Map exception sang message generic ở tầng handler.
- Log chi tiết ở server, trả message generic về client.

```java
try {
    return orderService.findById(id);
} catch (OrderNotFoundException ex) {
    log.warn("Không tìm thấy đơn hàng: id={}", id);
    return ApiResponse.error("Không tìm thấy tài nguyên");
} catch (Exception ex) {
    log.error("Lỗi không mong muốn khi xử lý đơn hàng id={}", id, ex);
    return ApiResponse.error("Lỗi hệ thống");
}
```
