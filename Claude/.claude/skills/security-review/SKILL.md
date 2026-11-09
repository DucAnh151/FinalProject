---
name: security-review
description: Checklist bảo mật toàn diện cho code đụng đến auth, input người dùng, secret, API endpoint, dữ liệu nhạy cảm. Dùng khi thêm authentication, xử lý upload, viết endpoint mới, hoặc làm tính năng tài chính.
---

# Security Review

Đảm bảo code tuân thủ best practice bảo mật và phát hiện lỗ hổng tiềm tàng.

## Khi nào dùng

- Cài đặt authentication / authorization.
- Xử lý input từ user, file upload.
- Tạo endpoint mới.
- Làm việc với secret / credential.
- Tính năng thanh toán.
- Lưu / truyền dữ liệu nhạy cảm.
- Tích hợp API bên thứ ba.

## Checklist 9 mục

### 1. Quản lý secret

#### SAI
```typescript
const apiKey = "sk-proj-xxxxx"
const dbPassword = "password123"
```

#### ĐÚNG
```typescript
const apiKey = process.env.API_KEY
if (!apiKey) throw new Error('API_KEY chưa được cấu hình')
```

```java
String apiKey = System.getenv("API_KEY");
Objects.requireNonNull(apiKey, "API_KEY chưa được set");
```

#### Bước verify
- [ ] Không hard-code API key, token, password.
- [ ] Mọi secret trong env var.
- [ ] `.env.local` đã trong `.gitignore`.
- [ ] Không có secret trong lịch sử git.
- [ ] Production secret nằm trong secret manager / hosting platform.

### 2. Validate input

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

export async function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input)
  return db.users.create(validated)
}
```

#### Validate file upload
```typescript
function validateFileUpload(file: File) {
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) throw new Error('File quá lớn (tối đa 5MB)')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) throw new Error('Sai định dạng file')

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  const allowedExt = ['.jpg', '.jpeg', '.png', '.gif']
  if (!extension || !allowedExt.includes(extension)) throw new Error('Sai phần mở rộng')
}
```

#### Bước verify
- [ ] Mọi input user validate bằng schema.
- [ ] File upload giới hạn (size, type, extension).
- [ ] Không nhúng input user trực tiếp vào query.
- [ ] Whitelist (không phải blacklist).
- [ ] Thông báo lỗi không lộ thông tin nhạy cảm.

### 3. Phòng SQL injection

#### SAI
```typescript
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
```

#### ĐÚNG
```typescript
await db.query('SELECT * FROM users WHERE email = $1', [userEmail])
```

```java
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
ps.setString(1, userEmail);
```

#### Bước verify
- [ ] Mọi query DB dùng parameterized.
- [ ] Không nối chuỗi vào SQL.
- [ ] Dùng ORM/query builder đúng cách.

### 4. Authentication & Authorization

#### Lưu token an toàn
```typescript
// SAI: localStorage (dễ bị XSS)
localStorage.setItem('token', token)

// ĐÚNG: httpOnly cookie từ server
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

#### Check authorization
```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } })
  if (requester.role !== 'admin') {
    return { error: 'Unauthorized', status: 403 }
  }
  await db.users.delete({ where: { id: userId } })
}
```

#### Bước verify
- [ ] Token nhạy cảm trong httpOnly cookie (không phải localStorage).
- [ ] Có check authorization trước khi thực hiện thao tác nhạy cảm.
- [ ] Phân quyền theo role.
- [ ] Session được quản lý an toàn.

### 5. Phòng XSS

#### Sanitize HTML
```typescript
import DOMPurify from 'dompurify'

function renderUserContent(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: []
  })
}
```

Vue: `v-html` chỉ dùng sau khi sanitize.

#### Content Security Policy
```typescript
const securityHeaders = [{
  key: 'Content-Security-Policy',
  value: `default-src 'self'; script-src 'self'; img-src 'self' data: https:;`
}]
```

#### Bước verify
- [ ] HTML từ user đã sanitize.
- [ ] Đã cấu hình CSP header.
- [ ] Không render dynamic content chưa kiểm chứng.

### 6. Phòng CSRF

```typescript
// CSRF token trên thao tác state-changing
const token = request.headers.get('X-CSRF-Token')
if (!csrf.verify(token)) {
  return { error: 'Invalid CSRF token', status: 403 }
}

// SameSite cookie
res.setHeader('Set-Cookie', `session=${id}; HttpOnly; Secure; SameSite=Strict`)
```

#### Bước verify
- [ ] CSRF token cho thao tác state-changing.
- [ ] `SameSite=Strict` trên cookie.

### 7. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Quá nhiều request'
})

app.use('/api/', limiter)

// Endpoint đắt: limit chặt hơn
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
})
app.use('/api/search', searchLimiter)
```

#### Bước verify
- [ ] Có rate limit trên mọi API endpoint.
- [ ] Endpoint đắt có limit chặt hơn.
- [ ] Rate limit theo IP (anonymous) và theo user (authenticated).

### 8. Lộ dữ liệu nhạy cảm

#### Logging
```typescript
// SAI
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// ĐÚNG
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

#### Thông báo lỗi
```typescript
// SAI
catch (error) {
  return { error: error.message, stack: error.stack }
}

// ĐÚNG
catch (error) {
  console.error('Lỗi nội bộ:', error)
  return { error: 'Có lỗi xảy ra. Vui lòng thử lại.' }
}
```

#### Bước verify
- [ ] Không log password, token, secret.
- [ ] Thông báo lỗi cho user là generic.
- [ ] Lỗi chi tiết chỉ ở server log.
- [ ] Không lộ stack trace ra client.

### 9. Bảo mật dependency

```bash
# JS/TS
npm audit
npm audit fix
npm outdated

# Java/Maven
mvn dependency:tree
mvn org.owasp:dependency-check-maven:check
```

#### Bước verify
- [ ] Dependency được cập nhật.
- [ ] `npm audit` / OWASP scan không có CVE nghiêm trọng.
- [ ] Lock file đã commit.
- [ ] Bật Dependabot.

## Test bảo mật tự động

```typescript
test('yêu cầu authentication', async () => {
  const res = await fetch('/api/protected')
  expect(res.status).toBe(401)
})

test('yêu cầu role admin', async () => {
  const res = await fetch('/api/admin', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(res.status).toBe(403)
})

test('reject input không hợp lệ', async () => {
  const res = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'sai-format' })
  })
  expect(res.status).toBe(400)
})

test('enforce rate limit', async () => {
  const requests = Array(101).fill(null).map(() => fetch('/api/endpoint'))
  const responses = await Promise.all(requests)
  expect(responses.some(r => r.status === 429)).toBe(true)
})
```

## Checklist trước khi deploy production

- [ ] **Secret**: không hard-code, đều ở env var.
- [ ] **Validate**: mọi input user đã validate.
- [ ] **SQL injection**: query đều parameterized.
- [ ] **XSS**: content user đã sanitize.
- [ ] **CSRF**: đã bật protection.
- [ ] **Auth**: token được xử lý an toàn.
- [ ] **Authorization**: có check role.
- [ ] **Rate limit**: đã bật trên mọi endpoint.
- [ ] **HTTPS**: enforce ở production.
- [ ] **Security header**: CSP, X-Frame-Options.
- [ ] **Error**: không lộ dữ liệu nhạy cảm.
- [ ] **Logging**: không log secret.
- [ ] **Dependency**: cập nhật, không có CVE.
- [ ] **CORS**: cấu hình đúng.
- [ ] **File upload**: validate (size, type).

## Tham khảo

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Academy](https://portswigger.net/web-security)

**Lưu ý**: Bảo mật không phải tuỳ chọn. 1 lỗ hổng có thể phá toàn bộ hệ thống. Khi nghi ngờ, chọn cách an toàn hơn.
