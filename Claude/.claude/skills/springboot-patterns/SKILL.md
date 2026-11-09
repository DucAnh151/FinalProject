---
name: springboot-patterns
description: Kiến trúc Spring Boot, REST API, layered service, JPA, caching, async, logging cho backend Java. Dùng khi làm việc với crm-service/ (VCRM, VcrmApp, VcrmGeneral, VcrmReport, VcrmSolr, VcrmSys).
---

# Spring Boot Patterns

Kiến trúc và pattern API cho service Spring Boot scale và production-grade.

## ⛔ Ràng buộc Java 8 của CRM PAKD (đọc trước)

Dự án chạy **Java 8**. Các ví dụ dưới đây mang tính minh hoạ pattern — khi viết code thật phải hạ về Java 8:

- `record` → class + Lombok `@Data`/`@Value` (xem mục "DTO + Validation").
- `List.of` / `Map.of` / `Set.of` / `.copyOf` → `Arrays.asList(...)`, `Collections.emptyList()`, `new ArrayList<>()`, `new HashMap<>()` + `.put(...)`.
- `Optional.isEmpty()` → `!opt.isPresent()`.
- `var` → khai báo type tường minh.
- `spring.mvc.problemdetails.enabled` / RFC 7807 ProblemDetail là **Spring Boot 3+** — dự án này KHÔNG có, tự build `ApiError` envelope (xem `common/patterns.md`).
- Không dùng text block, switch arrow, pattern matching `instanceof`, sealed class.

> Kinh nghiệm senior: constructor injection, service mỏng-rõ, transaction đúng phạm vi, log có context nhưng không PII — những điều này độc lập version, luôn áp dụng.

## Khi nào dùng

- Build REST API với Spring MVC.
- Phân tầng controller → service → repository.
- Cấu hình Spring Data JPA, caching, async.
- Validate, exception handling, pagination.
- Setup profile cho dev/staging/production.
- Pattern event-driven với Spring Events / Kafka.

## Cấu trúc REST API

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## Repository (Spring Data JPA)

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## Service Layer + Transaction

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }

  @Transactional(readOnly = true)
  public Page<Market> list(Pageable pageable) {
    return repo.findAll(pageable).map(Market::from);
  }
}
```

## DTO + Validation (Java 8 — dùng Lombok, KHÔNG dùng record)

```java
@Data
public class CreateMarketRequest {
  @NotBlank @Size(max = 200)
  private String name;

  @NotBlank @Size(max = 2000)
  private String description;

  @NotNull @FutureOrPresent
  private Date endDate;

  @NotEmpty
  private List<@NotBlank String> categories;
}

@Data
@AllArgsConstructor
public class MarketResponse {
  private Long id;
  private String name;
  private MarketStatus status;

  public static MarketResponse from(Market market) {
    return new MarketResponse(market.getId(), market.getName(), market.getStatus());
  }
}
```

## Exception Handling

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // Log lỗi không mong muốn kèm stack trace
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Lỗi hệ thống"));
  }
}
```

## Caching

Cần `@EnableCaching` ở config class.

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy market"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## Async

Cần `@EnableAsync` ở config class.

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // gửi email/SMS
    return CompletableFuture.completedFuture(null);
  }
}
```

## Logging (SLF4J)

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // logic
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## Filter / Middleware

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## Pagination & Sort

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## Retry cho gọi external

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) throw ex;
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## Rate Limiting (Filter + Bucket4j)

**Lưu ý bảo mật**: Header `X-Forwarded-For` mặc định KHÔNG đáng tin (dễ spoof). Chỉ dùng header forwarded khi:
1. App nằm sau reverse proxy đáng tin (nginx, AWS ALB...).
2. Đã đăng ký `ForwardedHeaderFilter` dạng bean.
3. Đã cấu hình `server.forward-headers-strategy=NATIVE` hoặc `FRAMEWORK`.
4. Proxy được cấu hình GHI ĐÈ (không append) header `X-Forwarded-For`.

Khi đã cấu hình đúng, `request.getRemoteAddr()` sẽ tự trả IP client từ header forwarded.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## Background Job

Dùng `@Scheduled` của Spring hoặc tích hợp queue (Kafka, RabbitMQ). Handler phải idempotent và observable.

## Observability

- Log có cấu trúc (JSON) qua Logback encoder.
- Metric: Micrometer + Prometheus / OTel.
- Tracing: Micrometer Tracing với OpenTelemetry hoặc Brave.

## Default cho production

- Constructor injection, KHÔNG field injection.
- Trả lỗi qua `ApiError` envelope tự định nghĩa (dự án Java 8, KHÔNG có ProblemDetail RFC 7807 của Spring Boot 3).
- Cấu hình pool size (HikariCP/pool đang dùng) phù hợp workload, set timeout.
- `@Transactional(readOnly = true)` cho query.
- Null-safety qua `@NonNull` và `Optional` khi phù hợp.

**Nguyên tắc**: Controller mỏng, service tập trung, repository đơn giản, lỗi xử lý tập trung. Tối ưu cho khả năng bảo trì và testability.
