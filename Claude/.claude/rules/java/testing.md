---
paths:
  - "**/*.java"
---
# Java — Testing

> Mở rộng từ [common/testing.md](../common/testing.md).

## Stack test

- **JUnit 5** (`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`)
- **AssertJ** — assertion fluent (`assertThat(result).isEqualTo(expected)`)
- **Mockito** — mock dependency
- **Testcontainers** — integration test cần DB / service thật

## Tổ chức test

```
src/test/java/com/viettel/crm/
  service/        # Unit test cho service layer
  controller/     # Test web layer / API
  repository/     # Test tầng truy cập dữ liệu
  integration/    # Integration test xuyên layer
```

Mirror cấu trúc package của `src/main/java` sang `src/test/java`.

## Mẫu unit test

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository);
    }

    @Test
    @DisplayName("findById trả về order khi tồn tại")
    void findById_existingOrder_returnsOrder() {
        var order = new Order(1L, "Alice", BigDecimal.TEN);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        var result = orderService.findById(1L);

        assertThat(result.customerName()).isEqualTo("Alice");
        verify(orderRepository).findById(1L);
    }

    @Test
    @DisplayName("findById ném lỗi khi không tìm thấy order")
    void findById_missingOrder_throws() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(99L))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining("99");
    }
}
```

## Parameterized test

```java
@ParameterizedTest
@CsvSource({
    "100.00, 10, 90.00",
    "50.00, 0, 50.00",
    "200.00, 25, 150.00"
})
@DisplayName("áp dụng giảm giá đúng")
void applyDiscount(BigDecimal price, int pct, BigDecimal expected) {
    assertThat(PricingUtils.discount(price, pct)).isEqualByComparingTo(expected);
}
```

## Integration test

Dùng Testcontainers cho DB thật:

```java
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    private OrderRepository repository;

    @BeforeEach
    void setUp() {
        var dataSource = new PGSimpleDataSource();
        dataSource.setUrl(postgres.getJdbcUrl());
        dataSource.setUser(postgres.getUsername());
        dataSource.setPassword(postgres.getPassword());
        repository = new JdbcOrderRepository(dataSource);
    }

    @Test
    void save_and_findById() {
        var saved = repository.save(new Order(null, "Bob", BigDecimal.ONE));
        var found = repository.findById(saved.getId());
        assertThat(found).isPresent();
    }
}
```

Với Spring Boot integration test, xem skill `springboot-patterns`.

## Đặt tên test

Tên method theo dạng `methodName_scenario_expectedBehavior()`. `@DisplayName` dùng tiếng Việt cho dễ đọc trong report.

## Coverage

- Mục tiêu ≥ 80% line coverage.
- Dùng JaCoCo cho report.
- Tập trung vào service và domain logic — bỏ qua getter trivial, class config.
