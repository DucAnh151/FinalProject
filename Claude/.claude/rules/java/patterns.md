---
paths:
  - "**/*.java"
---
# Java — Pattern

> Mở rộng từ [common/patterns.md](../common/patterns.md).

## Repository Pattern

Đóng gói lớp truy cập dữ liệu sau interface:

```java
public interface OrderRepository {
    Optional<Order> findById(Long id);
    List<Order> findAll();
    Order save(Order order);
    void deleteById(Long id);
}
```

Cài đặt cụ thể xử lý chi tiết storage (JPA, JDBC, in-memory cho test).

## Service Layer

Logic nghiệp vụ nằm trong service class; controller và repository giữ mỏng:

```java
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;

    public OrderService(OrderRepository orderRepository, PaymentGateway paymentGateway) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
    }

    public OrderSummary placeOrder(CreateOrderRequest request) {
        var order = Order.from(request);
        paymentGateway.charge(order.total());
        var saved = orderRepository.save(order);
        return OrderSummary.from(saved);
    }
}
```

## Constructor Injection

Luôn dùng constructor injection — KHÔNG dùng field injection:

```java
// TỐT — constructor injection (test được, immutable)
public class NotificationService {
    private final EmailSender emailSender;

    public NotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}

// XẤU — field injection (khó test, phụ thuộc framework reflection)
public class NotificationService {
    @Autowired
    private EmailSender emailSender;
}
```

## DTO Mapping

Dùng `record` cho DTO. Map ở biên service/controller:

```java
public record OrderResponse(Long id, String customer, BigDecimal total) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getCustomerName(), order.getTotal());
    }
}
```

## Builder Pattern

Cho object có nhiều tham số tùy chọn:

```java
public class SearchCriteria {
    private final String query;
    private final int page;
    private final int size;
    private final String sortBy;

    private SearchCriteria(Builder b) {
        this.query = b.query;
        this.page = b.page;
        this.size = b.size;
        this.sortBy = b.sortBy;
    }

    public static class Builder {
        private String query = "";
        private int page = 0;
        private int size = 20;
        private String sortBy = "id";

        public Builder query(String q) { this.query = q; return this; }
        public Builder page(int p) { this.page = p; return this; }
        public Builder size(int s) { this.size = s; return this; }
        public Builder sortBy(String s) { this.sortBy = s; return this; }
        public SearchCriteria build() { return new SearchCriteria(this); }
    }
}
```

## Sealed Type cho Domain Model

```java
public sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {
    record PaymentSuccess(String transactionId, BigDecimal amount) implements PaymentResult {}
    record PaymentFailure(String errorCode, String message) implements PaymentResult {}
}

// Xử lý exhaustive (Java 21+)
String message = switch (result) {
    case PaymentSuccess s -> "Đã thanh toán: " + s.transactionId();
    case PaymentFailure f -> "Thất bại: " + f.errorCode();
};
```

## API Response Envelope

```java
public record ApiResponse<T>(boolean success, T data, String error) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
```

## Tham khảo

- Skill `springboot-patterns` cho pattern Spring Boot chi tiết.
