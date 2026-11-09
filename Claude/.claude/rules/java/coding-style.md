---
paths:
  - "**/*.java"
---
# Java — Coding Style

> Mở rộng từ [common/coding-style.md](../common/coding-style.md).

## Format

- Dùng **google-java-format** hoặc **Checkstyle** để cưỡng chế format.
- Mỗi file 1 public top-level type.
- Indent nhất quán: 2 hoặc 4 space (theo chuẩn dự án).
- Thứ tự thành viên: hằng số → field → constructor → method public → protected → private.

## Bất biến

- Ưu tiên `record` cho value type (Java 16+).
- Mặc định mark field `final`. Chỉ dùng mutable khi thực sự cần.
- Public API trả defensive copy: `List.copyOf()`, `Map.copyOf()`, `Set.copyOf()`.
- Copy-on-write: trả instance mới thay vì sửa instance cũ.

```java
// TỐT — value type bất biến
public record OrderSummary(Long id, String customerName, BigDecimal total) {}

// TỐT — final field, không có setter
public class Order {
    private final Long id;
    private final List<LineItem> items;

    public List<LineItem> getItems() {
        return List.copyOf(items);
    }
}
```

## Đặt tên

- `PascalCase`: class, interface, record, enum.
- `camelCase`: method, field, parameter, biến local.
- `SCREAMING_SNAKE_CASE`: hằng `static final`.
- Package: chữ thường, reverse-domain (`com.viettel.crm.service`).

## Tính năng Java hiện đại

- **Record** cho DTO, value type (Java 16+).
- **Sealed class** cho hệ thống type đóng (Java 17+).
- **Pattern matching `instanceof`** — không cần cast (Java 16+).
- **Text block** cho chuỗi nhiều dòng (SQL, JSON template) (Java 15+).
- **Switch expression** với arrow syntax (Java 14+).
- **Pattern matching trong switch** với sealed type (Java 21+).

```java
// Pattern matching instanceof
if (shape instanceof Circle c) {
    return Math.PI * c.radius() * c.radius();
}

// Sealed type
public sealed interface PaymentMethod permits CreditCard, BankTransfer, Wallet {}

// Switch expression
String label = switch (status) {
    case ACTIVE -> "Hoạt động";
    case SUSPENDED -> "Tạm khóa";
    case CLOSED -> "Đóng";
};
```

## Optional

- Method finder có thể không tìm thấy → trả `Optional<T>`.
- Dùng `map()`, `flatMap()`, `orElseThrow()` — không gọi `get()` không có `isPresent()`.
- KHÔNG dùng `Optional` làm field type hoặc method parameter.

```java
// TỐT
return repository.findById(id)
    .map(ResponseDto::from)
    .orElseThrow(() -> new OrderNotFoundException(id));

// SAI — Optional làm parameter
public void process(Optional<String> name) {}
```

## Xử lý lỗi

- Ưu tiên unchecked exception cho lỗi domain.
- Tạo exception riêng cho domain, kế thừa `RuntimeException`.
- Tránh `catch (Exception e)` rộng, trừ ở handler tầng cao nhất.
- Message exception phải có context.

```java
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("Không tìm thấy đơn hàng: id=" + id);
    }
}
```

## Stream

- Dùng cho transformation; pipeline ngắn (3-4 thao tác là đủ).
- Method reference khi đọc tốt: `.map(Order::getTotal)`.
- Không có side-effect trong stream operation.
- Logic phức tạp: dùng vòng lặp thay vì stream rối.
