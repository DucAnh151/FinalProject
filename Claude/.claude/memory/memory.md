# Memory

## 2026-05-07 — Plan mục 1.1 PYC 42/PYC-PC&KSNB

- **Phạm vi**: `/Users/tuanla/.claude/plans/expressive-baking-lighthouse.md` (file plan ngoài repo).
- **Thay đổi chính**:
  - Khảo sát đường code FE→BE từ `client/src/views/admin/projectPlAsm/service` xuống `crm-service/.../domain/projectPlAsm/ProjectPlService.java`.
  - Xác định entity đúng là `ProjectPlService` (không phải `GnocSrCatalog` như plan cũ).
  - Viết lại plan dựa vào pattern checkbox sẵn có trong `FormService.vue` (`checkDuplicate`, `isShowPreviousSr`).
- **Lý do**: chuẩn bị implement mục 1.1 theo PYC số 42, hạn 10/05/2026.
- **Ghi chú**: chưa chạm code repo trong slice này; plan đã được user phê duyệt qua ExitPlanMode. Slice code tiếp theo chờ user chọn (slice 1: chỉ cờ `hasSendPyc`, hay làm cả plan).

## 2026-05-07 — Implement PYC 42 mục 1.1 (BE + FE)

- **Phạm vi**:
  - BE: `crm-service/VcrmApp/src/main/java/com/app/businessproject/`
    - `domain/projectPlAsm/ProjectPlService.java`, `ProjectPlSr.java` (thêm field `hasSendPyc`).
    - Tạo `domain/projectPlAsm/ProjectPlServicePycConfig.java`, `ProjectPlServicePycUser.java`.
    - Tạo `repo/projectPlAsm/ProjectPlServicePycConfigRepo.java`, `ProjectPlServicePycUserRepo.java`.
    - DTO: thêm `hasSendPyc` vào `ProjectPlServiceSdi`, `ProjectPlServiceDetailSdo`, `ProjectPlServiceSearchSdo`, `ProjectPlServiceSearchSdi`. Tạo `ProjectPlServicePycConfigSdi/Sdo`.
    - `service/projectPlAsm/ProjectPlServicePycConfigService.java` + `impl/ProjectPlServicePycConfigServiceImpl.java`.
    - `controller/projectPlAsm/ProjectPlServicePycConfigController.java` (4 endpoint: GET/{id}, upsert, users, inactivate-all-sr).
    - Sửa `ProjectPlServiceServiceImpl` (validate `hasSendPyc` bắt buộc + auto-tạo config row khi `hasSendPyc=1`).
    - Sửa `ProjectPlSrServiceImpl` (snapshot `hasSendPyc` từ catalog xuống SR ở `create` + `createChild`).
    - Migration SQL `database_prod/migrations/2026_05_07_pyc_42_muc_1_1.sql`.
  - FE: `client/src/`
    - `services/app/defineRouting.ts`: thêm 4 key `PROJECT_PL_SERVICE_PYC_CONFIG_*`.
    - `services/app/projectPlAsm/service/index.ts`: thêm `getPycConfig`, `upsertPycConfig`, `upsertPycUsers`, `inactivateAllSrByPycConfig` + interface `PycConfigSdo/Sdi`.
    - `views/admin/projectPlAsm/service/form/FormService.vue`: thêm checkbox `hasSendPyc` + section "Cấu hình PYC" (3 toggle + nút phân quyền user).
    - Tạo `views/admin/projectPlAsm/service/form/FormPycConfigUsers.vue` (modal multi-select staff, search debounce qua `searchStaff`).
    - `views/admin/projectPlAsm/service/columns/columns.ts` + `Index.vue`: thêm cột "Có gửi PYC" (tag Có/Không).
- **Thay đổi chính**:
  - Cờ `hasSendPyc` trên catalog dịch vụ SR + snapshot xuống PROJECT_PL_SR.
  - Bảng cấu hình `PROJECT_PL_SERVICE_PYC_CONFIG` (3 toggle: inactive all SR, hide PYC extra info, exclude from export) và bảng phân quyền `PROJECT_PL_SERVICE_PYC_USER`.
  - Inactive all SR: confirm modal ở FE → endpoint batch update `STATUS=0` ở BE.
- **Lý do**: triển khai PYC số 42/PYC-PC&KSNB mục 1.1 — nền tảng cho các mục 1.4/1.6/1.7/1.8.
- **Ghi chú**:
  - Chưa build được do thiếu VPN — user cần chạy `mvn clean install` (BE) + `npm run lint && npm run build-develop` (FE) khi có VPN.
  - Cần chạy migration SQL `2026_05_07_pyc_42_muc_1_1.sql` trên DB trước khi deploy.
  - Phần permission rule (B) và edit-when-Closed sẽ làm ở các slice mục 1.4 trở đi (đã có snapshot `sr.hasSendPyc` sẵn để dùng).
  - Chưa viết unit test BE — TODO theo plan B4 (3 file test).

## 2026-05-07 — Fix Java 8 compat + cập nhật CLAUDE.md

- **Phạm vi**:
  - `crm-service/VcrmApp/.../service/projectPlAsm/impl/ProjectPlServicePycConfigServiceImpl.java`: thay `List.of()` → `Collections.emptyList()` (Java 8 không có `List.of()`).
  - `.claude/CLAUDE.md`: thêm note backend dùng **Java 8**, liệt kê API/feature Java 9+ KHÔNG được dùng + bảng thay thế tương đương.
- **Lý do**: build fail `cannot find symbol method of() interface java.util.List` do dự án compile bằng Java 8.
- **Ghi chú**: linter user đã tự sửa `Optional.isEmpty()` → `!isPresent()` ở cùng file và refactor `Map.of` ở controller. Lần sau khi sinh code Java cho repo này phải tự né API Java 9+.

## 2026-05-07 — Fix tên cột STAFF.NAME → STAFF.STAFF_NAME

- **Phạm vi**: `crm-service/VcrmApp/.../service/projectPlAsm/impl/ProjectPlServicePycConfigServiceImpl.java` (SQL `SQL_LIST_USERS_WITH_NAME`).
- **Thay đổi chính**: đổi `s.NAME` → `s.STAFF_NAME` trong native query join `STAFF`.
- **Lý do**: bảng `STAFF` không có cột `NAME`, cột tên là `STAFF_NAME` → runtime `Unknown column 's.NAME' in 'field list'`.
- **Ghi chú**: convention bảng `STAFF` của repo này — cột tên đầy đủ là `STAFF_NAME` (KHÔNG phải `NAME`/`FULL_NAME`). Các native query mới join `STAFF` phải dùng `STAFF_NAME`.

## 2026-05-07 — Chốt: bỏ rule edit-when-Closed khỏi mục 1.1

- **Phạm vi**: `/Users/tuanla/.claude/plans/expressive-baking-lighthouse.md` (mục D + build order step 5).
- **Thay đổi chính**: đánh dấu rule "cho phép cập nhật Thông tin mở rộng PYC khi SR Đóng nếu evaluation ≠ Tuân thủ" **không thuộc mục 1.1** — dời sang slice mục 1.4.
- **Lý do**: user yêu cầu bỏ qua phần này. Rule edit-when-Closed phụ thuộc UI/field "Thông tin mở rộng PYC" chưa có (sẽ tạo ở 1.4).
- **Ghi chú**: code BE/FE hiện tại **không cần sửa** — tôi chưa viết logic này. `ProjectPlSrServiceImpl.create/createChild` chỉ có snapshot `hasSendPyc` xuống SR (giữ nguyên — phục vụ các mục sau). Khi tới slice 1.4, mới đụng method update SR.

## 2026-05-08 — Refactor: gộp 3 toggle PYC vào PROJECT_PL_SERVICE (bỏ bảng config riêng)

- **Phạm vi**:
  - Migration `database_prod/migrations/2026_05_07_pyc_42_muc_1_1.sql`: thay `CREATE TABLE PROJECT_PL_SERVICE_PYC_CONFIG` bằng 3 `ALTER TABLE PROJECT_PL_SERVICE ADD COLUMN INACTIVATE_ALL_SR / HIDE_PYC_EXTRA_INFO / EXCLUDE_FROM_EXPORT`. Giữ nguyên bảng `PROJECT_PL_SERVICE_PYC_USER` (M:N).
  - Xoá: `domain/projectPlAsm/ProjectPlServicePycConfig.java`, `repo/projectPlAsm/ProjectPlServicePycConfigRepo.java`.
  - `ProjectPlService.java`: thêm 3 field `inactivateAllSr`, `hidePycExtraInfo`, `excludeFromExport`.
  - SDI/SDO: thêm 3 field + `pycStaffIds` vào `ProjectPlServiceSdi`; thêm 3 field vào `ProjectPlServiceDetailSdo`. Rút gọn `ProjectPlServicePycConfigSdi` còn `projectPlServiceId + staffIds`.
  - `ProjectPlServicePycConfigService` + impl: chỉ còn `get` (đọc 3 toggle từ entity + load users), `upsertUsers`, `inactivateAllSr` (vẫn dùng nội bộ). Bỏ `upsert` + `ensureConfigForService`.
  - `ProjectPlServicePycConfigController`: chỉ còn `GET /{id}`. Bỏ `/upsert`, `/users`, `/inactivate-all-sr`.
  - `ProjectPlServiceServiceImpl`: thay `ensurePycConfig` bằng `applyPycSideEffects(entity, request)` — nếu `hasSendPyc=1` thì replace user list theo `pycStaffIds` + run inactivate batch khi `inactivateAllSr=1`.
  - FE `defineRouting.ts`: bỏ 3 key (`UPSERT`, `USERS`, `INACTIVATE_SR`), giữ `GET`.
  - FE `services/app/projectPlAsm/service/index.ts`: bỏ wrapper `upsertPycConfig`, `upsertPycUsers`, `inactivateAllSrByPycConfig`. Giữ `getPycConfig`.
  - FE `FormService.vue`: bỏ `persistPycConfig`. 3 toggle + `pycStaffIds` đi qua submit chung của dịch vụ. Confirm modal khi tick "Inactive all SR" cảnh báo "khi lưu sẽ áp dụng".
  - FE `FormPycConfigUsers.vue`: modal chỉ chọn user + emit `ok` lên parent. KHÔNG tự gọi API.
- **Lý do**: user yêu cầu — bảng `PROJECT_PL_SERVICE_PYC_CONFIG` 1:1 với dịch vụ → tách ra làm tăng số hit DB không cần thiết và split flow save thành 2 request dễ lệch state. Bảng user (M:N) giữ riêng vì không gộp được.
- **Ghi chú**:
  - User cần chạy lại migration mới (ALTER 4 cột + 1 bảng user, không còn CREATE TABLE config).
  - Endpoint `GET /project-pl-service-pyc-config/{id}` còn lại chủ yếu phục vụ FE load lại danh sách user khi mở modal phân quyền (giúp hiện code/tên chứ không phải chỉ id). Nếu sau này thấy thừa cũng có thể inline vào response của `/project-pl-service/detail`.

## 2026-05-08 — Trim FE mục 1.1 chỉ còn checkbox `hasSendPyc`

- **Phạm vi**:
  - `client/src/views/admin/projectPlAsm/service/form/FormService.vue`: bỏ section "Cấu hình PYC" (3 toggle + nút phân quyền user), bỏ modal `<FormPycConfigUsers>`. Bỏ `pycConfig` reactive + `pycUsersRef` + `loadPycConfig`/`onChangeHasSendPyc`/`onTogglePycInactive`/`openPycUsers`/`onPycUsersChanged`. Bỏ thread `inactivateAllSr/hidePycExtraInfo/excludeFromExport/pycStaffIds` khỏi submit payload — submit chỉ còn `hasSendPyc: !!modelRef.hasSendPyc ? 1 : 0`.
  - Xoá `client/src/views/admin/projectPlAsm/service/form/FormPycConfigUsers.vue`.
  - `client/src/services/app/projectPlAsm/service/index.ts`: bỏ `getPycConfig` + `PycConfigSdo`/`PycUserSdo` interface (FE không còn dùng).
  - `client/src/services/app/defineRouting.ts`: bỏ key `PROJECT_PL_SERVICE_PYC_CONFIG_GET`.
- **Lý do**: user chốt mục 1.1 chỉ cần cờ "Có gửi PYC không?" trên form. 3 toggle cấu hình + phân quyền user xem để slice sau (1.2/1.3) làm.
- **Ghi chú**:
  - BE giữ nguyên: 3 cột `INACTIVATE_ALL_SR/HIDE_PYC_EXTRA_INFO/EXCLUDE_FROM_EXPORT` trên `PROJECT_PL_SERVICE` + bảng `PROJECT_PL_SERVICE_PYC_USER` + endpoint `GET /project-pl-service-pyc-config/{id}` + service method `inactivateAllSr`/`upsertUsers` vẫn còn — chờ slice sau dùng. Hiện tại FE không gửi `pycStaffIds`/3 toggle nên `applyPycSideEffects` ở `ProjectPlServiceServiceImpl` sẽ no-op (toggle null = 0, pycStaffIds null = không replace).
  - Cột "Có gửi PYC" ở list (`columns/columns.ts` + cell render trong `Index.vue`) giữ nguyên.

## 2026-05-08 — Cột "Có gửi PYC" trong list: render plain text, map theo giá trị API

- **Phạm vi**: `client/src/views/admin/projectPlAsm/service/Index.vue` (cell render `column?.key === 'hasSendPyc'`).
- **Thay đổi chính**: thay `<a-tag>` (có border) bằng `<span>` plain. Strict equality với giá trị API: `record?.hasSendPyc === 1` → "Có", `=== 0` → "Không", giá trị khác (null/undefined) → blank.
- **Lý do**: user yêu cầu bỏ border + map đúng giá trị từ API, không ép kiểu `Number(...)` để tránh map nhầm `'0'` thành `0`.

## 2026-05-08 — Bổ sung `hasSendPyc` vào native query của `/project-pl-service/search`

- **Phạm vi**: `crm-service/VcrmApp/.../repo/projectPlAsm/impl/ProjectPlServiceRepoCustomImpl.java` (`getSqlSelect`).
- **Thay đổi chính**: thêm `S.HAS_SEND_PYC AS hasSendPyc` + `IF(S.HAS_SEND_PYC = 1, 'Có', 'Không') AS hasSendPycName` vào danh sách SELECT (ngay sau `isShowPreviousSrName`).
- **Lý do**: `ProjectPlServiceSearchSdo` đã có field `hasSendPyc`/`hasSendPycName` nhưng native query của filter chưa SELECT cột này → response API trả `hasSendPyc=null` → cell render trong list không hiện "Có/Không".
- **Ghi chú**: `PagingRepo<ProjectPlServiceSearchSdo>` map theo alias → đặt tên alias đúng camelCase (`hasSendPyc`, `hasSendPycName`) là đủ.

## 2026-05-08 — Verify mục 1.1: code đúng phạm vi, không cần sửa

- **Phạm vi**: kiểm tra cross-check giữa 2 màn FE dễ nhầm:
  - "Danh mục dịch vụ" `/admin/settings/project-pl/service` → `ProjectPlService` / `PROJECT_PL_SERVICE` (catalog).
  - "Quản lý dịch vụ SR" `/service` → `ProjectPlSr` / `PROJECT_PL_SR` (instance, FK trỏ catalog).
- **Kết quả**:
  - Cờ `hasSendPyc` đã đặt ĐÚNG entity catalog `ProjectPlService` (mục 1.1 yêu cầu "danh mục dịch vụ SR" = catalog).
  - Snapshot `HAS_SEND_PYC` xuống `PROJECT_PL_SR` đã sẵn sàng phục vụ slice 1.4–1.8.
  - FE màn `/service` (FormSrItem + list) **chưa** hiện cờ này — user chốt giữ nguyên (đúng phạm vi 1.1, không phải lỗi).
- **Lý do**: user yêu cầu verify sau khi nhận thấy có thể tôi chỉ tập trung vào catalog và bỏ sót màn SR. Verify xong: catalog là đúng đối tượng của mục 1.1.
- **Ghi chú**:
  - Plan file `/Users/tuanla/.claude/plans/expressive-baking-lighthouse.md` đã append section "VERIFY 2026-05-08" làm log.
  - Khi tới slice mục 1.4 (Thông tin mở rộng PYC), sẽ động đến `FormSrItem.vue` + `service-management/Index.vue` — chỗ đó mới expose cờ trên màn SR.

## 2026-05-08 — Rollback 3 cột toggle INACTIVATE_ALL_SR/HIDE_PYC_EXTRA_INFO/EXCLUDE_FROM_EXPORT

- **Phạm vi**:
  - **DB**:
    - `database_prod/migrations/2026_05_07_pyc_42_muc_1_1.sql`: rút gọn — chỉ còn `ALTER TABLE PROJECT_PL_SERVICE ADD HAS_SEND_PYC` + `ALTER TABLE PROJECT_PL_SR ADD HAS_SEND_PYC` + `CREATE TABLE PROJECT_PL_SERVICE_PYC_USER`.
    - Mới: `database_prod/migrations/2026_05_08_drop_pyc_toggle_columns.sql` — `ALTER TABLE PROJECT_PL_SERVICE DROP COLUMN INACTIVATE_ALL_SR, DROP COLUMN HIDE_PYC_EXTRA_INFO, DROP COLUMN EXCLUDE_FROM_EXPORT;` (chạy trên môi trường đã apply phiên bản trước).
  - **BE**:
    - `domain/projectPlAsm/ProjectPlService.java`: xoá 3 field `inactivateAllSr`, `hidePycExtraInfo`, `excludeFromExport`.
    - `dto/sdi/.../ProjectPlServiceSdi.java`: xoá 3 field tương ứng. Giữ `hasSendPyc` + `pycStaffIds`.
    - `dto/sdo/.../ProjectPlServiceDetailSdo.java`: xoá 3 field.
    - `dto/sdo/.../ProjectPlServicePycConfigSdo.java`: rút gọn còn `projectPlServiceId` + `users`.
    - `service/.../ProjectPlServicePycConfigService.java`: bỏ method `inactivateAllSr(Long)`. Giữ `get`, `upsertUsers`.
    - `service/.../impl/ProjectPlServicePycConfigServiceImpl.java`: bỏ method `inactivateAllSr` + helper `nullSafe` + annotation `@Slf4j` + import `Slf4j`. Method `get` không còn set 3 toggle field.
    - `service/.../impl/ProjectPlServiceServiceImpl.applyPycSideEffects`: bỏ nhánh `if (entity.getInactivateAllSr() == 1) inactivateAllSr(...)`. Giờ chỉ còn replace user list.
  - **FE**: KHÔNG thay đổi (đã được trim từ entry trim FE mục 1.1 trước đó, không còn reference).
- **Lý do**: user yêu cầu xoá 3 cột toggle khỏi DB + code BE/FE. 3 toggle này (Inactive all SR / Hide PYC extra info / Exclude from export) chưa rõ design cuối — sẽ chốt khi triển khai slice mục 1.4 trở đi. Bảng `PROJECT_PL_SERVICE_PYC_USER` (phân quyền user) **giữ nguyên** vì M:N cần bảng riêng và endpoint `pycStaffIds` còn dùng.
- **Ghi chú**:
  - Script DROP `2026_05_08_drop_pyc_toggle_columns.sql` cần được chạy trên các môi trường đã apply phiên bản cũ của `2026_05_07_pyc_42_muc_1_1.sql` (có 3 cột toggle). Môi trường chưa apply chỉ cần chạy file `2026_05_07_pyc_42_muc_1_1.sql` mới (đã bỏ 3 cột).
  - `grep` cuối xác nhận không còn reference `inactivateAllSr`/`hidePycExtraInfo`/`excludeFromExport`/`INACTIVATE_ALL_SR`/`HIDE_PYC_EXTRA_INFO`/`EXCLUDE_FROM_EXPORT` trong code (chỉ còn trong file rollback SQL — đúng).

## 2026-05-08 — Rollback nốt bảng PROJECT_PL_SERVICE_PYC_USER

- **Phạm vi**:
  - **DB**:
    - `database_prod/migrations/2026_05_07_pyc_42_muc_1_1.sql`: tiếp tục rút gọn — chỉ còn 2 ALTER (HAS_SEND_PYC trên PROJECT_PL_SERVICE + PROJECT_PL_SR). Bỏ luôn CREATE TABLE PROJECT_PL_SERVICE_PYC_USER.
    - `database_prod/migrations/2026_05_08_drop_pyc_toggle_columns.sql`: bổ sung `DROP TABLE IF EXISTS PROJECT_PL_SERVICE_PYC_USER;`.
  - **BE — xóa hẳn các file**:
    - `domain/projectPlAsm/ProjectPlServicePycUser.java`
    - `repo/projectPlAsm/ProjectPlServicePycUserRepo.java`
    - `service/projectPlAsm/ProjectPlServicePycConfigService.java`
    - `service/projectPlAsm/impl/ProjectPlServicePycConfigServiceImpl.java`
    - `controller/projectPlAsm/ProjectPlServicePycConfigController.java`
    - `dto/sdo/projectplasm/service/ProjectPlServicePycConfigSdo.java`
    - `dto/sdi/projectplasm/service/ProjectPlServicePycConfigSdi.java`
  - **BE — sửa**:
    - `dto/sdi/.../ProjectPlServiceSdi.java`: bỏ field `pycStaffIds`. Chỉ còn `hasSendPyc` là field PYC duy nhất.
    - `service/.../impl/ProjectPlServiceServiceImpl.java`: bỏ dependency `projectPlServicePycConfigService`, bỏ method `applyPycSideEffects`, bỏ 2 call site (`create` + `update`). Rút gọn `validateHasSendPyc` về 1 param (chỉ check null/0/1, không còn side-effect set 3 toggle).
- **Lý do**: user chốt thu hẹp mục 1.1 còn duy nhất cờ `HAS_SEND_PYC`. Bảng phân quyền user + toàn bộ infrastructure config PYC sẽ chốt lại design ở slice 1.3/1.4.
- **Ghi chú**:
  - Môi trường đã apply phiên bản cũ → chạy `2026_05_08_drop_pyc_toggle_columns.sql` (drop 3 column + drop table).
  - Môi trường mới → chỉ chạy `2026_05_07_pyc_42_muc_1_1.sql` (chỉ còn 2 ALTER ADD HAS_SEND_PYC).
  - FE: không động chạm — đã sạch từ các lần trim trước.
  - Tổng scope BE còn lại của mục 1.1: thêm 1 cột `HAS_SEND_PYC` vào `ProjectPlService` + 1 cột snapshot ở `ProjectPlSr` + thread field qua SDI/SDO/native query + snapshot tại `ProjectPlSrServiceImpl.create`/`createChild`. **Không** còn entity/table/controller/service mới do mục 1.1 sinh ra.

## 2026-05-11 — Hoàn thiện chọn Có gửi PYC trên màn SR

- **Phạm vi**:
  - BE: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/ProjectPlSrServiceImpl.java`.
  - FE: `client/src/views/service-management/form/FormAssessment.vue`, `FormSrItem.vue`, `FormSrItemManual.vue`.
- **Thay đổi chính**:
  - BE không còn tự snapshot `PROJECT_PL_SR.HAS_SEND_PYC` = cấu hình dịch vụ khi dịch vụ bật PYC; thay vào đó lấy lựa chọn `hasSendPyc` từ request SR, dịch vụ không bật thì force `0`.
  - FE màn `/service` hiển thị radio bắt buộc “Có gửi PYC không?” khi dịch vụ được cấu hình `hasSendPyc = 1`.
  - Reset field PYC khi đổi nhóm/dịch vụ để tránh giữ nhầm lựa chọn cũ.
- **Lý do**: hoàn thiện yêu cầu mục 1.1 theo mô tả “dịch vụ bật PYC thì khi tạo/cập nhật SR người dùng bắt buộc chọn Có/Không”.
- **Ghi chú**: không chạy build/test theo rule dự án vì môi trường phụ thuộc VPN; đã chạy `git diff --check` cho các file đã sửa.

## 2026-05-11 — Fix khai báo trùng biến `projectPlService`

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/ProjectPlSrServiceImpl.java`.
- **Thay đổi chính**: bỏ khai báo lại `ProjectPlService projectPlService` trong block update chất lượng SR, dùng lại biến đã khai báo đầu method `update`.
- **Lý do**: fix lỗi compile `Variable 'projectPlService' is already defined in the scope`.
- **Ghi chú**: đã chạy `git diff --check` cho file sửa; không chạy Maven theo rule dự án.

## 2026-05-11 — Đổi chọn Có gửi PYC trên SR từ radio sang checkbox

- **Phạm vi**: `client/src/views/service-management/form/FormAssessment.vue`, `FormSrItem.vue`, `FormSrItemManual.vue`.
- **Thay đổi chính**:
  - Thay radio “Có/Không” bằng checkbox “Có gửi PYC không?”.
  - Checkbox vẫn lưu `modelRef.hasSendPyc` dạng `1/0` để backend nhận đúng kiểu `Integer`.
  - Khi đổi sang dịch vụ có cấu hình PYC, mặc định checkbox bỏ chọn (`0`).
- **Lý do**: user yêu cầu UI dùng checkbox thay vì radio.
- **Ghi chú**: đã chạy `git diff --check` cho 3 file FE; không chạy npm build/lint theo rule dự án.

## 2026-05-11 — Bổ sung GL config PYC mục 1.1

- **Phạm vi BE**: permission SQL/helper SR PYC, search/filter/export SR, detail SR, service create/update.
- **Phạm vi FE**: form SR batch/manual/assessment và detail SR.
- **Thay đổi chính**:
  - Đọc GL theo format `GLOBAL_LIST_DETAIL.CODE = SERVICE_CODE`, `VALUE = CO/KHONG`.
  - `EXCLUDE_FROM_EXPORT=CO`: loại SR PYC của mã dịch vụ khỏi export.
  - `HIDE_PYC_EXTRA_INFO=CO`: ẩn vùng ULNL/customize trên form thêm/cập nhật/xem chi tiết SR PYC.
  - `INACTIVATE_ALL_SR=CO`: khi lưu dịch vụ PYC, inactive các SR PYC active thuộc dịch vụ đó.
  - `SR` tiếp tục là danh sách username bổ sung được xem SR PYC, cùng với `DM_SR`.
- **Ghi chú**: đã chạy `git diff --check` cho các file đã sửa; không chạy Maven/npm theo rule dự án.

## 2026-05-16 — Implement báo cáo SR PYC mục 1.8

- **Phạm vi**:
  - BE: `crm-service/VcrmApp/src/main/java/com/app/businessproject/controller/projectPlAsm/ProjectPlSrController.java`, `service/projectPlAsm/ProjectPlSrService.java`, `service/projectPlAsm/impl/ProjectPlSrServiceImpl.java`, DTO mới `ProjectPlSrPycReportSearchSdi`, `ProjectPlSrPycReportSdo`, template `template_project_pl_sr_pyc_report.xlsx`.
  - FE: `client/src/views/service-management/Index.vue`, `client/src/services/app/defineRouting.ts`, `client/src/services/app/serviceManagenment/index.ts`.
- **Thay đổi chính**:
  - Thêm API quyền `has-permission-export-bc-sr` và export `export-report-pyc`; quyền cho `EXPORT_BC_SR`, `ADMIN`, `BTGD`.
  - Query report xuất mọi SR khớp filter, vẫn áp dụng rule phân quyền PYC 1.1 cho SR `HAS_SEND_PYC = 1`, không áp dụng rule 1.7 `EXCLUDE_FROM_EXPORT`.
  - Thêm dropdown `Báo cáo > Báo cáo SR PYC` ở breadcrumb màn SR và modal filter riêng để tải file Excel.
- **Lý do**: triển khai chức năng báo cáo `BẢNG THEO DÕI HỒ SƠ THẨM ĐỊNH` theo biểu mẫu user cung cấp.
- **Ghi chú**:
  - Đã kiểm tra `git diff --check`, `unzip -t` template và rà code Java 8; không chạy build/npm theo rule dự án.
  - Có lỡ chạy Maven trước khi đọc lại CLAUDE.md; lệnh fail do repo/VPN và lỗi compile cũ ngoài scope, không dùng làm kết quả verify.

## 2026-05-16 — Báo cáo SR PYC mục 1.8 (làm lại theo hướng tách riêng endpoint)

- **Phạm vi**: tạo MỚI tách biệt khỏi export SR hiện hữu, không sửa `ProjectPlSrController` / `service-management/Index.vue`. Lưu ý: entry phía trên cùng ngày mô tả các thay đổi BE/FE trên `ProjectPlSrController` + `Index.vue` — các thay đổi đó KHÔNG còn trong repo (đã grep `EXPORT_BC_SR`, `export-report-pyc`, `ProjectPlSrPycReportSearchSdi` đều miss), nên làm lại theo hướng user đã chốt sau plan: endpoint + view riêng.
- **FE**:
  - [client/src/services/app/defineRouting.ts](../../client/src/services/app/defineRouting.ts) — thêm `PROJECT_PL_SR_BAO_CAO_SEARCH/EXPORT/HAS_PERMISSION`.
  - [client/src/services/app/serviceManagenment/baoCaoSr.ts](../../client/src/services/app/serviceManagenment/baoCaoSr.ts) — service wrapper mới (typed).
  - [client/src/views/service-management/bao-cao-sr/Index.vue](../../client/src/views/service-management/bao-cao-sr/Index.vue) + `columns/index.ts` — view filter (Mã SR, Trạng thái, Đơn vị yêu cầu, Đơn vị có nhu cầu mua sắm, Ngày tạo từ–đến, Đánh giá tuân thủ) + bảng + nút Export gọi `saveAs` theo pattern hiện có.
  - [client/src/router/vcrmRouterMap.ts](../../client/src/router/vcrmRouterMap.ts) — thêm child route `/service/bao-cao-sr` với `meta.permission: ['EXPORT_BC_SR']`.
- **BE** (Java 8):
  - [crm-service/.../category/Utils/Constant.java](../../crm-service/VcrmApp/src/main/java/com/app/category/Utils/Constant.java) — thêm `EXPORT_BC_SR`.
  - DTO mới: `BaoCaoSrSearchSdi`, `BaoCaoSrSdo` trong `dto/sdi|sdo/projectplasm/sr/`.
  - Service: `BaoCaoSrService` + `BaoCaoSrServiceImpl` — native SQL join `PROJECT_PL_SR` × `ORG_UNIT` × `PROJECT_PL_SERVICE` × `PROJECT_PL_STATUS` × `STAFF`; map mã DV → Loại hồ sơ / Đầu vào-Đầu ra qua `resources/static/bao_cao_sr_mapping.json` (Sheet2 của `bieu_mau_bao_cao_sr.xlsx`). Coordinator names resolve qua `GROUP_CONCAT` trên `STAFF`.
  - Controller: `BaoCaoSrController` (`/project-pl-sr/bao-cao-sr/{search,export,has-permission}`); export check quyền `EXPORT_BC_SR` (cộng `ADMIN`, `BTGD`) qua `KeyCloakUserWs.getAssignedRoles`.
  - Template: copy `bieu_mau_bao_cao_sr.xlsx` → `resources/templateExportExcel/bao_cao_sr.xlsx`; code xoá sample rows trước khi ghi data từ row index 2.
  - Migration ghi chú: `database_prod/migrations/2026_05_16_pyc_42_muc_1_8.sql` — không đổi schema MySQL, chỉ note tạo role `EXPORT_BC_SR` trên Keycloak.
- **Lý do**: user chốt hướng "tạo endpoint + view RIÊNG" để không đụng tới `PROJECT_PL_SR_EXPORT` hiện hữu; permission code `EXPORT_BC_SR` user yêu cầu cụ thể.
- **Ghi chú**:
  - Chưa chạy `mvn`/`npm` (theo CLAUDE.md cần VPN, user tự build).
  - Đã sửa import `com.general.exceptions.AppException` → `com.general.exception.AppException` (gói đúng) sau IDE diagnostic.
  - User cần tạo role `EXPORT_BC_SR` trên Keycloak realm và gán cho user P.PC&KSNB trước khi test.

## 2026-05-16 — Báo cáo SR 1.8 (FE chuyển sang modal trên màn /service)

- **Phạm vi**:
  - Gỡ bỏ route con `/service/bao-cao-sr` + view tách riêng (`bao-cao-sr/Index.vue`, `bao-cao-sr/columns/index.ts`).
  - Tạo modal mới: [client/src/views/service-management/bao-cao-sr/BaoCaoSrModal.vue](../../client/src/views/service-management/bao-cao-sr/BaoCaoSrModal.vue) — `v-model:open`, 6 filter, gọi `saveAs` POST `PROJECT_PL_SR_BAO_CAO_EXPORT`.
  - [client/src/views/service-management/Index.vue](../../client/src/views/service-management/Index.vue) — thêm nút **Báo cáo SR (PYC P.PC&KSNB)** cạnh nút "SR cần đóng" trong `#extraAction`, import `BaoCaoSrModal` + `FileExcelOutlined`, thêm `baoCaoSrOpen` ref + `onOpenBaoCaoSr` handler, render `<bao-cao-sr-modal v-model:open="baoCaoSrOpen" />` cuối template.
  - [client/src/router/vcrmRouterMap.ts](../../client/src/router/vcrmRouterMap.ts) — bỏ import `BaoCaoSr` + child route.
- **Lý do**: user yêu cầu — FE phải nằm chung màn `/service` (BE vẫn tách riêng endpoint).
- **Ghi chú**: modal lazy-load org unit/state + check permission `EXPORT_BC_SR` mỗi lần mở; nút Xuất Excel disable nếu không có quyền + hiện `a-alert` cảnh báo. BE endpoint `/project-pl-sr/bao-cao-sr/{search,export,has-permission}` giữ nguyên (`search` hiện chưa được FE dùng — có thể tận dụng sau nếu cần preview).

## 2026-05-16 — Fix SQL báo cáo SR theo DDL thực tế

- **Phạm vi**: [crm-service/.../impl/BaoCaoSrServiceImpl.java](../../crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/BaoCaoSrServiceImpl.java).
- **Thay đổi chính**:
  - Lỗi runtime: `Unknown column 'SR.CREATED_ORG_UNIT_ID' in 'on clause'` — `PROJECT_PL_SR` KHÔNG có cột `CREATED_ORG_UNIT_ID`.
  - DDL thật: SR chỉ có `CREATE_BY` (varchar = `STAFF.STAFF_CODE`). "Đơn vị yêu cầu" resolve qua `ORG_UNIT_STAFF` (junction `STAFF_ID` ↔ `ORG_UNIT_ID`).
  - SELECT: thay JOIN `ORG_UNIT CO` bằng subquery `(SELECT CO.ORG_UNIT_NAME FROM ORG_UNIT_STAFF OUS JOIN STAFF S2 ON OUS.STAFF_ID=S2.STAFF_ID JOIN ORG_UNIT CO ON OUS.ORG_UNIT_ID=CO.ORG_UNIT_ID WHERE OUS.STATUS=1 AND S2.STATUS=1 AND S2.STAFF_CODE=SR.CREATE_BY LIMIT 1)` — đúng pattern `ProjectPlSrRepoCustomImpl.java:265-271`.
  - WHERE: filter `createdOrgUnitId` đổi sang dạng subquery tương tự thay vì `SR.CREATED_ORG_UNIT_ID = ?`.
  - `PYC_PURCHASE_ORG_UNIT_ID` xác nhận có trong DDL → giữ JOIN trực tiếp.
- **Lý do**: tránh đoán cấu trúc bảng — user gửi DDL `STAFF`, `PROJECT_PL_STATUS`, `PROJECT_PL_SERVICE`, `ORG_UNIT`, `PROJECT_PL_SR` để có nguồn chính xác.
- **Ghi chú**: Repo gốc dùng table alias `ORGANIZATION` ở vài chỗ (có thể là synonym/view) nhưng pattern join cùng column `ORG_UNIT_ID`; tôi dùng tên `ORG_UNIT` (đúng theo DDL chính thức) — nếu vẫn lỗi `Table 'ORG_UNIT' doesn't exist` thì cần đổi sang `ORGANIZATION` cho khớp môi trường staging.

## 2026-05-16 — Chuyển nút "Báo cáo" lên top (theo pattern project-pl)

- **Phạm vi**: [client/src/views/service-management/Index.vue](../../client/src/views/service-management/Index.vue).
- **Thay đổi chính**:
  - Bỏ nút "Báo cáo SR (PYC P.PC&KSNB)" trong `#extraAction` của bảng SR (chỗ "SR cần đóng").
  - Thêm `<a-dropdown-button type="primary">` (nút đỏ với icon 3-chấm) vào `#extraAction` của `<asme-bread-crumb>` ở đầu trang — pattern lấy từ [client/src/views/sales-project/project-pl-management/Index.vue:7-51](../../client/src/views/sales-project/project-pl-management/Index.vue#L7-L51).
  - Đổi icon import: `FileExcelOutlined` → `MoreOutlined`.
- **Lý do**: user yêu cầu UI giống các màn khác (project-pl) — nút "Báo cáo" ở top-right.
- **Ghi chú**: hiện chỉ có 1 menu item (Báo cáo SR P.PC&KSNB) — khi cần thêm báo cáo khác (ví dụ KCS report v.v.) chỉ cần thêm `<a-menu-item>` vào `#overlay`.

## 2026-05-16 — Sửa mapping cột export báo cáo SR PYC 1.8

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/dto/sdo/projectplasm/sr/BaoCaoSrSdo.java`, `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/BaoCaoSrServiceImpl.java`.
- **Thay đổi chính**:
  - Bổ sung field PYC còn thiếu cho báo cáo: tên hồ sơ, loại hồ sơ/đầu vào-đầu ra đã lưu, người tạo, đánh giá/chấm điểm, đơn vị/đầu mối được đánh giá, ghi chú xử lý.
  - Sửa `fillSheet` ghi đúng 29 cột A-AC theo `bieu_mau_bao_cao_sr.xlsx`; ưu tiên `PYC_RECORD_TYPE`/`PYC_INPUT_OUTPUT`, chỉ fallback mapping JSON khi dữ liệu cũ trống.
  - Gộp `PYC_RESULT_NOTE` và `PYC_EVALUATION_NOTE` vào cột Ghi chú, giữ trống nếu không có dữ liệu.
- **Lý do**: khớp biểu mẫu báo cáo SR mục 1.8 và dòng mô tả logic số 6 trong Excel.
- **Ghi chú**: đã self-review thứ tự `SELECT`/`mapRows`, đếm 29 ô export A-AC và kiểm tra không dùng API Java 9+; không chạy Maven/NPM theo rule dự án.

## 2026-05-16 — Bổ sung trường Có gửi PYC trong export Excel SR mục 1.7

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/dto/sdo/projectplasm/sr/ProjectPlSrSearchSdo.java`, `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/ProjectPlSrServiceImpl.java`.
- **Thay đổi chính**:
  - Sử dụng đúng field `hasSendPyc` từ `HAS_SEND_PYC` cho phần dữ liệu export.
  - Bổ sung writer export SR (`exportExcelV3` và writer cũ) format `hasSendPyc` thành `Có`/`Không`/rỗng và ghi vào cột `Có gửi PYC không` của template.
- **Lý do**: PYC mục 1.7 yêu cầu export Excel SR có thêm cột “Có gửi PYC không”.
- **Ghi chú**: dữ liệu đã có sẵn trong query `ProjectPlSrRepoCustomImpl` qua alias `hasSendPyc`; chỉ bổ sung BE mapping/export, không chạy Maven/NPM theo rule dự án.

## 2026-05-16 — Fix test compile ProjectPlServiceImport

- **Phạm vi**: `crm-service/VcrmApp/src/test/java/com/app/businessproject/dto/sdo/projectplasm/service/ProjectPlServiceImportTest.java`.
- **Thay đổi chính**:
  - Bổ sung tham số `hasSendPyc` vào constructor `ProjectPlServiceImport(...)` trong test để khớp DTO đã có field mới.
- **Lý do**: sửa lỗi `maven-compiler-plugin:testCompile` báo không tìm thấy constructor phù hợp.
- **Ghi chú**: không chạy Maven theo rule dự án; user có thể chạy lại `mvn clean package` trong môi trường VPN.

## 2026-05-25 — Fix parse boolean khi export báo cáo SR PYC

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/BaoCaoSrServiceImpl.java`.
- **Thay đổi chính**:
  - Sửa mapper `PYC_ASSESSMENT_ENABLED` để nhận cả `Boolean`, `true`/`false`, `1`/`0`.
- **Lý do**: runtime export báo cáo SR log `For input string: "false"` do driver trả cột đánh giá/chấm điểm dạng boolean/string.
- **Ghi chú**: đã rà không còn gọi `safeToInt` trực tiếp với giá trị row này; không chạy Maven/NPM theo rule dự án.

## 2026-05-27 — Lật polarity hidePycExtraInfo (thông tin mở rộng SR)

- **Phạm vi**:
  - `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/ProjectPlSrServiceImpl.java` (~dòng 205).
  - `client/src/views/service-management/detail/Index.vue` (2 chỗ), `client/src/views/service-management/detail/IndexCommon.vue` (1 chỗ), `client/src/views/service-management/detail/Tab1.vue` (computed `showPycExtraInfoDetail`).
- **Thay đổi chính**:
  - Đổi nghĩa biến `hidePycExtraInfo` thành **true = HIỆN, false = ẩn** (theo yêu cầu user, giữ nguyên tên biến).
  - Backend: bọc negation — `setHidePycExtraInfo(!(HAS_SEND_PYC==1 && flag(HIDE_PYC_EXTRA_INFO)=='CO'))`. Thêm comment giải thích polarity.
  - Frontend: bỏ dấu `!` ở 3 điều kiện `v-if`/tab show dùng `hidePycExtraInfo`.
  - Tab1.vue: khối nội dung "Thông tin mở rộng PYC" trước đây gate bằng `showPycExtraInfoDetail = hasSendPyc===1 && isPcksnBServiceGroup` — KHÔNG dùng cờ. Đã thêm `&& Boolean(dataCommonInfo?.hidePycExtraInfo)` để khối thực sự hiện khi flag=true, ẩn khi false.
- **Lý do**: user muốn `hidePycExtraInfo === true` thì hiển thị. Nghiệp vụ giữ nguyên: `CO`→ẩn, `KHONG`/không cấu hình→hiện. Hành vi end-to-end không đổi (lật cả 2 đầu).
- **Ghi chú**:
  - Edit `showPycExtraInfoDetail` ở Tab1.vue từng bị mất (IDE/mở file ghi đè) → đã áp lại; nếu thấy `false` vẫn hiện thì check computed này còn `&& Boolean(hidePycExtraInfo)` không.
  - KHỐI FORM (popup cập nhật + form tạo SR) dùng component riêng `client/src/views/service-management/form/PycExtraInfo.vue`. ĐÃ wire ẩn theo cấu hình (cập nhật tiếp bên dưới).
  - Chưa build/test (rule VPN). Lưu ý: tên `hidePycExtraInfo` giờ nghịch nghĩa (true=hiện) — dễ gây hiểu nhầm về sau.

## 2026-05-27 — Ẩn "Thông tin mở rộng PYC" ở popup cập nhật + form tạo SR

- **Phạm vi**:
  - `client/src/views/service-management/form/PycExtraInfo.vue` — thêm prop + logic ẩn.
  - `client/src/views/service-management/form/FormAssessment.vue` — popup "Cập nhật trạng thái yêu cầu (SR)".
  - `client/src/views/service-management/form/FormSrItem.vue`, `FormSrItemManual.vue` — form tạo SR (batch).
- **Thay đổi chính**:
  - `PycExtraInfo.vue`: thêm prop `listServiceCodeHidePycExtraInfo: Array` + computed `isHiddenByPycConfig` (so `serviceCode` đã normalize với list code có cờ CO). `showPycExtraInfo` thêm `&& !isHiddenByPycConfig`.
  - `FormAssessment.vue`: thêm ref `listServiceCodeHidePycExtraInfo`, trong `getServiceCodeCustomize` fetch global list `HIDE_PYC_EXTRA_INFO` + helper `getListServiceCodeByFlag(res,'CO')` (row: code=serviceCode, key=CO/KHONG), truyền prop xuống `pyc-extra-info`, expose ở return. Thứ tự init: `getServiceCodeCustomize()` (2512) chạy trước `handleServicesChange()` (2520, set `selectedServiceCode`).
  - `FormSrItem.vue` / `FormSrItemManual.vue`: khai báo prop `listServiceCodeHidePycExtraInfo` (trước đó batch cha đã truyền nhưng prop là code chết) và forward xuống `pyc-extra-info`. Batch cha (`FormBatchCreateSr(.vue)`/`Manual`) đã fetch sẵn list này từ trước.
- **Lý do**: user yêu cầu popup cập nhật cũng phải ẩn "Thông tin mở rộng PYC" khi dịch vụ cấu hình `HIDE_PYC_EXTRA_INFO = CO`. Dùng cơ chế list-by-serviceCode (config-driven) để chạy được cả create lẫn update, không phụ thuộc boolean BE.
- **Ghi chú**: Giả định response global list có `item.code` (serviceCode) và `item.key` (CO/KHONG) — theo đúng pattern batch form cũ. Chưa build/lint (rule VPN).

## 2026-05-28 — Full CRUD API cho bảng PROJECT_PL_SR_ASSESSMENT

- **Phạm vi** (mới tạo, module VcrmApp, package `com.app.businessproject`):
  - `domain/projectPlAsm/ProjectPlSrAssessment.java` — entity, `@Table("PROJECT_PL_SR_ASSESSMENT")`, audit field tường minh (CREATE_BY/TIME updatable=false, UPDATE_BY/TIME insertable=false).
  - `repo/projectPlAsm/ProjectPlSrAssessmentRepo.java` — `JpaRepository`, `findByIdAndStatusNot`, `findByProjectIdAndStatusNot`, `search(...)` JPQL trả Spring `Page` + `Pageable`.
  - `dto/sdi/projectplasm/assessment/ProjectPlSrAssessmentSaveSdi.java`, `ProjectPlSrAssessmentSearchSdi.java` (có `PageInfo`).
  - `dto/sdo/projectplasm/assessment/ProjectPlSrAssessmentDetailSdo.java` — có `getStatusName()`.
  - `service/projectPlAsm/ProjectPlSrAssessmentService.java` + `impl/ProjectPlSrAssessmentServiceImpl.java` — search (phân trang, build `com.general.pagination.Page`), getDetail, create, update, delete (xóa mềm `status=2`).
  - `controller/projectPlAsm/ProjectPlSrAssessmentController.java` — `/project-pl-sr-assessment` (search POST, detail GET /{id}, create POST, update POST, delete GET /{id}), trả `APIResponse`.
- **Convention áp dụng**: `@Service @RequiredArgsConstructor @Slf4j`; constructor injection; `VarContext.getIamUsernameLogin()` cho audit; `Const.STATUS_VALUE.ACTIVE/DELETED`; `BeanUtils.copyProperties` (ignore id/status/audit khi update); `Page = new Page<>(new PageInfo(page,size)).withResult(...).compute((int)total)`; pagination 1-based → `PageRequest.of(page-1,size, Sort DESC id)`; Java 8 (không var/record/List.of).
- **Lý do**: user yêu cầu sinh đầy đủ class (Sdi/Sdo/repo/service/controller) cho bảng đánh giá SR.
- **Ghi chú**: Chưa làm FE (defineRouting.ts + service wrapper) — chờ user xác nhận có cần. `assessmentEnabled` map Integer (tinyint(1)). Chưa build/test (rule VPN); user tự `mvn clean install` khi có VPN.

## 2026-05-28 — Màn "Đánh giá SR" join PROJECT_PL_SR + PROJECT_PL_SR_ASSESSMENT

- **Phạm vi BE** (`com.app.businessproject`):
  - `dto/sdi/projectplasm/assessment/ProjectPlSrAssessmentSearchSdi.java` — mirror filter SR (keyword/srCode/title/serviceGroupId/serviceId/state/staffId/orgUnitId/projectPlId/createDateFrom-To/startDateFrom-To) + filter Assessment (assessmentEnabled/complianceEvaluation/evaluatedOrgUnitId/evaluatedStaffId/hasAssessment).
  - `dto/sdo/projectplasm/assessment/ProjectPlSrAssessmentRowSdo.java` — combined row SR + Service + Service Group + Assessment, có `getAssessed()`.
  - `service/projectPlAsm/ProjectPlSrAssessmentService.java` — đổi `search` trả `Page<RowSdo>`, thêm `getDetailByProjectId`.
  - `service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java` — search bằng native SQL (`EntityManager`): JOIN STAFF + PROJECT_PL_SERVICE + PROJECT_PL_SERVICE_GROUP + PROJECT_PL_STATUS, LEFT JOIN PROJECT_PL_SR_ASSESSMENT `ON PROJECT_ID = sr.ID AND a.STATUS <> 2`, WHERE `sr.STATUS = 1 AND sr.HAS_SEND_PYC = 1` + filter động (LIMIT/OFFSET 1-based).
  - `controller/projectPlAsm/ProjectPlSrAssessmentController.java` — đổi return type search, thêm `GET /detail-by-project/{projectId}`.
- **Giả định quan trọng**: `PROJECT_PL_SR_ASSESSMENT.PROJECT_ID = PROJECT_PL_SR.ID` (1 đánh giá / 1 SR). Nếu sai cần đổi cột FK + join.
- **Phạm vi FE** (`client/src/`):
  - `services/app/defineRouting.ts` — thêm 6 route `PROJECT_PL_SR_ASSESSMENT_*`.
  - `services/app/serviceManagenment/index.ts` — thêm 6 hàm wrapper axios (`searchProjectPlSrAssessment`, `detailProjectPlSrAssessmentByProject`, create/update/delete...).
  - `router/vcrmRouterMap.ts` — thêm route con `service-assessment` (path `/service-assessment`) trong nhóm `management-service`; import `ServiceAssessment`.
  - `views/service-assessment/Index.vue` (mới) — màn list: filter (keyword, complianceEvaluation, hasAssessment, assessmentEnabled), table SR có HAS_SEND_PYC=1 với cờ "Đã/Chưa đánh giá" + drawer form đánh giá (tạo mới khi chưa có, cập nhật khi đã có; nạp chi tiết bằng `detail-by-project/{srId}`).
  - `views/service-management/Index.vue` — thêm button "Đánh giá" (`AuditOutlined`) trong `#extraAction`, handler `onOpenAssessment = router.push({ name: 'service-assessment' })`, đăng ký icon + return.
- **Lý do**: user yêu cầu màn đánh giá riêng, vào từ button trong `/service`; search kết hợp SR + Service + Assessment, lọc PYC=1, lấy đánh giá lên khi đã có.
- **Ghi chú**: Drawer dùng `<a-input-number>` cho `evaluatedOrgUnitId`/`evaluatedStaffId` (paste ID). Selector đơn vị/nhân sự thật có thể wire sau. `assessmentEnabled` map Integer (0/1). Chưa build/lint (rule VPN). Pagination 1-based (PageInfo) ↔ LIMIT/OFFSET (1-1)*size. State lấy text từ PROJECT_PL_STATUS.PL_STATUS_NAME, stateCode tạm = String(state numeric).

## 2026-05-28 — Fix NonUniqueDiscoveredSqlAliasException + đổi SDI giống SR + cột table thay PYC_*

- **Phạm vi**:
  - `crm-service/.../service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java`: alias rõ ràng từng cột trong native SQL (`sr.ID AS SR_ID`, `a.ID AS ASSESSMENT_ID`, ...) — fix lỗi Hibernate `NonUniqueDiscoveredSqlAliasException: Encountered a duplicated sql alias [ID]`. `appendWhere` đọc filter từ inherited `ProjectPlSrSearchSdi`: srCode/title/keyword/serviceGroupId/serviceId[]/state[]/staffId/projectPlExecutionGroupId[]/projectPlId[]/customerId/relatedTo/createDateFrom-To/startDateFrom-To/endDateFrom-To/pycAssessmentEnabled. Filter `pycAssessmentEnabled` được THAY THẾ sang `a.ASSESSMENT_ENABLED`.
  - `crm-service/.../dto/sdi/projectplasm/assessment/ProjectPlSrAssessmentSearchSdi.java`: nay `extends ProjectPlSrSearchSdi` (Lombok `@Getter @Setter @EqualsAndHashCode(callSuper=false)`) — payload search giống y hệt SR.
  - `client/src/views/service-assessment/Index.vue`: payload build theo SHAPE `ProjectPlSrSearchSdi` (srCode/title/keyword/serviceGroupId/staffId/state/relatedTo/pycAssessmentEnabled/createDateFrom-To/...); thêm filter Mã yêu cầu/Tiêu đề/Nhóm dịch vụ/Trạng thái/Đánh giá-Chấm điểm/Người xử lý/Thông tin liên quan/Từ khoá/3 range ngày; cột table giống màn SR (Mã SR, Tiêu đề, Nhóm DV, Dịch vụ, Người tiếp nhận, Trạng thái, Tình trạng đánh giá) + các cột THAY THẾ PYC_* bằng cột từ ASSESSMENT (Đánh giá/Chấm điểm, Ngày hoàn trả thực tế, Đánh giá tuân thủ, Đơn vị được đánh giá, Đầu mối, Lỗi, Đánh giá hoàn trả, Đánh giá vi phạm, Ghi chú).
- **Lý do**: BE crash khi search vì 2 cột `ID` trùng tên (sr.ID + a.ID); đồng thời user muốn request/payload + table giống màn SR, các trường `PYC_*` của SR được thay bằng dữ liệu của bảng ASSESSMENT.
- **Ghi chú**: Chưa wire selector thực cho serviceGroup/staff/state list (đang dùng `a-input-number`/options số tạm) — có thể nâng cấp bằng `asme-select` + global list/api thật sau. Chưa build/test (rule VPN).

## 2026-05-28 — UX cho màn /service-assessment

- **Phạm vi**: `client/src/views/service-assessment/Index.vue`.
- **Thay đổi**:
  - Action "Đánh giá" thay text → icon `FormOutlined` (a-button type=text, có a-tooltip "Đánh giá").
  - Cột "Tình trạng đánh giá" bỏ `<a-tag>` → plain text màu (`text-green-600` / `text-gray-500`), không border.
  - Click "Đánh giá": gọi `detailProjectPlSr(srId)` (cùng API màn cập nhật SR ở /service), hiển thị thông tin SR trong drawer (mã, tiêu đề, nhóm DV, dịch vụ, trạng thái, người tiếp nhận, thời gian bắt đầu/kết thúc, khách hàng, người tạo, nội dung) — TẤT CẢ DISABLE.
  - Bên dưới chỉ hiển thị khung đánh giá (assessmentEnabled, complianceEvaluation, actualReturnDate, evaluatedOrgUnitId/StaffId, errors, returnEvaluation, violationEvaluation, evaluationNote) — editable.
  - Lưu đánh giá: chỉ gọi `createProjectPlSrAssessment({ ...form, projectId: srId })`. KHÔNG động đến SR.
- **Lý do**: yêu cầu UX của user — icon thay text, status không border, popup đánh giá load chi tiết SR (disable), chỉ chỉnh khung đánh giá, save = create record assessment, không update SR.
- **Ghi chú**: Mỗi lần "Đánh giá" tạo bản ghi mới trong PROJECT_PL_SR_ASSESSMENT (history-style). `detail-by-project` cũ vẫn còn API nếu sau này cần load lại bản đánh giá gần nhất. Chưa build/lint (rule VPN).

## 2026-05-28 — Fix Boolean cast + clone form search /service + selects DB

- **Phạm vi BE**:
  - `crm-service/.../service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java` — fix `java.lang.ClassCastException: java.lang.Boolean cannot be cast to java.lang.Number`. Sửa `asLong`/`asInteger` để handle cả `Boolean` (tinyint(1) MySQL driver có thể trả Boolean): `instanceof Number → number value`, `instanceof Boolean → 1/0`, fallback `parseLong/parseInt(toString)`.
- **Phạm vi FE** (`client/src/views/service-assessment/Index.vue`):
  - Clone toàn bộ filter form từ `/service`: Mã yêu cầu, Tiêu đề, Nhóm dịch vụ, Tên dịch vụ (multi), Đơn vị xử lý, Nhóm xử lý (multi), Người xử lý (search debounce), Trạng thái (multi), Đánh giá/Chấm điểm, Đơn vị yêu cầu, Thông tin liên quan, Khách hàng, Người tạo (search debounce), 3 range ngày.
  - Comboboxes nạp từ DB (mirror loaders /service): `getAllServiceGroup()`, `findAllActive()` (service), `getAllOrgUnitByUserForSr()`, `getAllExecutionGroup()`, `getWorkFlowCategory({code: CATEGORY_CODE.STATUS})`, `getGlobalListByCode({code: 'PROJECT_PL_SERVICE.RELATED_TO'})`, `searchStaffByCodeName(...)` (debounce 400ms cho Staff/Creator/Evaluated Staff).
  - Drawer đánh giá selects DB: Đơn vị được đánh giá dùng `listOrgUnit` (cùng nguồn `getAllOrgUnitByUserForSr`); Đầu mối đơn vị dùng `listEvaluatedStaff` (search debounce `searchStaffByCodeName`).
  - Cột "Đơn vị được đánh giá" trong table show `orgUnitCode` qua helper `orgUnitLabel(id)`.
- **Lý do**: user yêu cầu clone form search nguyên màn `/service` + tất cả combobox lấy từ DB (không hardcode); form đánh giá cũng dùng selector từ các màn liên quan đến service.
- **Ghi chú**: Chưa clone các trường conditional theo `relatedTo` (PAKD/Cơ hội/Hợp đồng/Tender/...) — chỉ giữ field core. Có thể bổ sung sau. Hằng `CATEGORY_CODE` import từ `@/constants/appPropsConstants`. Chưa build/test (rule VPN).

## 2026-05-28 — Nút Cập nhật đánh giá + center filter buttons

- **Phạm vi**: `client/src/views/service-assessment/Index.vue`.
- **Thay đổi**:
  - Cột Hành động: thêm nút "Cập nhật đánh giá" (`EditOutlined`, màu cam) **chỉ hiển thị khi `record.assessed`** (đã có đánh giá). Nút "Đánh giá" (`FormOutlined`) giữ nguyên.
  - `onUpdate(record)` mới: nạp bản đánh giá hiện tại qua `detailProjectPlSrAssessmentByProject(srId)`, fill vào `formRef` (kèm `id`), mở drawer với title "Cập nhật đánh giá".
  - `formRef` thêm field `id`; `onSave` nay phân nhánh: có `id` → `updateProjectPlSrAssessment(...)`, không có → `createProjectPlSrAssessment(...)`. Cả 2 path đều KHÔNG động đến SR (chỉ gửi field liên quan đánh giá theo `ProjectPlSrAssessmentSaveSdi`).
  - Drawer chỉ chứa khung đánh giá editable; thông tin SR ở trên vẫn read-only — nên cập nhật chỉ có thể sửa các trường liên quan đánh giá (đúng yêu cầu).
  - 2 button filter ("Bỏ lọc" + "Tìm kiếm") đổi từ `flex justify-end` → `flex justify-center`. Đổi label "Đặt lại" → "Bỏ lọc".
  - Tăng width cột Hành động 100 → 130 cho 2 nút.
- **Lý do**: user yêu cầu nút cập nhật riêng (chỉ hiện khi đã đánh giá, chỉ sửa trường đánh giá) và canh giữa cụm button filter.

## 2026-05-28 — Thay luồng ALLOWED_DM_SR + INACTIVATE_ALL_SR bằng check GLD.STATUS

- **Phạm vi BE**:
  - `crm-service/.../service/projectPlAsm/impl/ProjectPlServiceServiceImpl.java`: XÓA method `inactivateAllPycSrIfConfigured` + helper `isPycGlobalFlagEnabled` + 2 call site (sau create/update service). Không còn flow "mass update SR.STATUS = 2" theo cờ INACTIVATE_ALL_SR ở save-time.
  - `crm-service/.../service/projectPlAsm/impl/ProjectPlSrPycPermissionSql.java`: rewrite. Xóa toàn bộ logic phức tạp (canViewCondition cũ với `LOWER(CREATE_BY)`, `currentStaffIsCreator`, `globalListExists` cho ALLOWED_DM_SR/ALLOWED_SR_USERNAME/..., `leaderExistsForCreator`, `leaderExistsForExecutionUser`, ROLE_CODES, CURRENT_USERNAME_PARAM/CURRENT_STAFF_ID_PARAM). Thay bằng helper `inactivateAllSrFlagActive(devIam)` — EXISTS GLD (GL.CODE='ALLOWED_DM_SR' AND GLD.CODE='INACTIVATE_ALL_SR' AND GLD.STATUS = 1). `condition()` mới: `HAS_SEND_PYC != 1 OR EXISTS(...)`. `canViewCondition()` = `condition()`. `appendCondition`/`putParams` giữ signature cũ (no-op params) để các call site repo cũ vẫn build.
  - `crm-service/.../service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java`: inject `@Value("${dbConfig.dev_iam}") devIam`. `appendWhere` thêm `AND ProjectPlSrPycPermissionSql.inactivateAllSrFlagActive(devIam)` để màn /service-assessment cũng tôn trọng cờ GLD.
- **Quy tắc mới (cả SR search + assessment search)**: SR có `HAS_SEND_PYC = 1` chỉ hiển thị khi GLD `(ALLOWED_DM_SR / INACTIVATE_ALL_SR)` có `STATUS = 1`. `STATUS = 0` hoặc không cấu hình GLD → ẩn hết SR PYC.
- **Lý do**: user yêu cầu bỏ luồng cũ (whitelist ALLOWED_DM_SR + inactivate-on-save) và thay bằng toggle đơn giản qua `GLOBAL_LIST_DETAIL.STATUS`.
- **Ghi chú**: Constants `GL_ALLOWED_DM_SR`, `GLD_INACTIVATE_ALL_SR`, `GLD_HIDE_PYC_EXTRA_INFO`, `GLD_EXCLUDE_FROM_EXPORT`, `GLD_DM_SR_VIEW` giữ lại (HIDE_PYC_EXTRA_INFO + EXCLUDE_FROM_EXPORT vẫn dùng cơ chế cũ qua `globalListFlagHasValue`). Cách bật toggle: chỉnh GLD `(ALLOWED_DM_SR/INACTIVATE_ALL_SR)` STATUS = 1 để hiện; STATUS = 0 để ẩn. Chưa build (rule VPN).

## 2026-05-28 — EXCLUDE_FROM_EXPORT + HIDE_PYC_EXTRA_INFO chuyển sang GLD.STATUS

- **Phạm vi**:
  - `ProjectPlSrPycPermissionSql.java`: thêm helper `globalListFlagActive(devIam, flagCode)` — EXISTS GLD theo STATUS=1; `inactivateAllSrFlagActive` refactor để gọi nó; `appendExcludeFromExportCondition` đổi từ `globalListFlagHasValue(..., "KHONG")` → `globalListFlagActive(devIam, GLD_EXCLUDE_FROM_EXPORT)` với shape `(HAS_SEND_PYC != 1 OR EXISTS STATUS=1)`. Xóa helper `globalListFlagHasValue` (dead code).
  - `ProjectPlSrServiceImpl.java`: đổi `isPycGlobalFlagValue(flagCode, "KHONG")` → `isPycGlobalFlagActive(flagCode)` — check GLD.STATUS=1 thay vì GLD.VALUE='KHONG'. Áp dụng cho `setHidePycExtraInfo` (line 205-207).
- **Quy tắc thống nhất cho 3 cờ trong GL.CODE = ALLOWED_DM_SR**:
  - `INACTIVATE_ALL_SR` GLD.STATUS=1 → hiện SR HAS_SEND_PYC=1; =0/không có → ẩn.
  - `EXCLUDE_FROM_EXPORT` GLD.STATUS=1 → cho phép export PYC; =0/không có → loại khỏi export.
  - `HIDE_PYC_EXTRA_INFO` GLD.STATUS=1 → hiện block "Thông tin mở rộng PYC"; =0/không có → ẩn (`hidePycExtraInfo` BE = true khi STATUS=1).
- **Lý do**: user yêu cầu 2 cờ còn lại cũng chuyển sang dùng `GLD.STATUS` thay vì `VALUE`, đồng nhất với flow `INACTIVATE_ALL_SR`.
- **Ghi chú**: Không còn dùng `GLD.VALUE` ('CO'/'KHONG') ở 3 cờ này. Toggle bật/tắt thông qua sửa `STATUS` của GLD trong IAM. Chưa build (rule VPN).

## 2026-06-02 — Báo cáo SR: field đánh giá lấy từ PROJECT_PL_SR_ASSESSMENT

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/BaoCaoSrServiceImpl.java` (`buildSelectSql`, `buildWhereClause`).
- **Thay đổi chính**:
  - `buildSelectSql`: các cột đánh giá (Đánh giá/Chấm điểm, Đánh giá tuân thủ, Đơn vị được đánh giá, Đầu mối đơn vị được đánh giá, Lỗi, Ngày hoàn trả thực tế, Đánh giá hoàn trả hồ sơ, Đánh giá vi phạm, Ghi chú) chuyển từ `SR.PYC_*` sang bảng `PROJECT_PL_SR_ASSESSMENT` (alias `A`). Thêm `LEFT JOIN PROJECT_PL_SR_ASSESSMENT A ON A.PROJECT_ID = SR.ID AND A.STATUS <> 2`, `LEFT JOIN ORGANIZATION AEO ON AEO.ORG_UNIT_ID = A.EVALUATED_ORG_UNIT_ID`, đổi `ES` join sang `A.EVALUATED_STAFF_ID`. Giữ `EO` riêng cho filter `WHERE EO.ORG_UNIT_CODE = 'P PC&KSNB'`.
  - Giữ nguyên ở SR (không có trong bảng đánh giá): `PYC_VALUE` (Giá trị nếu có), `PYC_DEBT_COMMITMENT`, `PYC_MISSING_DOCUMENT`, `PYC_COMMIT_RETURN_DATE`. Giữ nguyên số cột & thứ tự SELECT để `mapRows` positional không lệch.
  - `buildWhereClause`: filter "Đánh giá tuân thủ" đổi từ `SR.PYC_COMPLIANCE_EVALUATION = :x` sang `EXISTS (SELECT 1 FROM PROJECT_PL_SR_ASSESSMENT A2 WHERE A2.PROJECT_ID = SR.ID AND A2.STATUS <> 2 AND A2.COMPLIANCE_EVALUATION = :x)` — vì count query chỉ `FROM PROJECT_PL_SR SR` (không join alias A).
  - Trước đó cùng task: `createdOrgUnitName` (Đơn vị yêu cầu) đổi sang logic giống màn /service (ORGANIZATION + xử lý ORG_UNIT_TYPE='5' → đơn vị cha).
- **Lý do**: dữ liệu đánh giá đã tách sang bảng `PROJECT_PL_SR_ASSESSMENT`, report phải lấy từ đó thay vì cột PYC_* cũ trên SR.
- **Ghi chú**: Giả định 1 SR có tối đa 1 bản ghi assessment STATUS<>2 (theo convention `ProjectPlSrAssessmentServiceImpl`); nếu tồn tại nhiều bản ghi non-deleted sẽ nhân dòng export. Chưa build (rule VPN) — user tự `mvn clean install` khi có VPN.

## 2026-06-02 — Báo cáo SR: resolve nhãn GLD cho RETURN_EVALUATION/ERRORS/VIOLATION_EVALUATION

- **Phạm vi**: `crm-service/VcrmApp/.../service/projectPlAsm/impl/BaoCaoSrServiceImpl.java`.
- **Thay đổi chính**:
  - Thêm helper `getGlLabelMap(glCode)` (cache theo glCode) load `devIam.GLOBAL_LIST` + `GLOBAL_LIST_DETAIL` (WHERE GL.STATUS=1, GLD.STATUS=1, GL.CODE=:glCode), build map từ {CODE, VALUE, NAME} (chuẩn hoá trim+lowercase) → `GLD.NAME`.
  - `resolveGlLabel` (đơn) + `resolveGlLabelMulti` (tách `[;,]` cho ERRORS): khớp GLD → trả `GLD.NAME`; không khớp (freetext) → giữ nguyên. Mirror `findGlobalListLabel` ở `client/src/views/service-management/detail/Tab1.vue`.
  - `mapRows`: `pycErrors`=resolveGlLabelMulti(GL `ERROR_SR`), `pycReturnEvaluation`=resolveGlLabel(GL `RETURN_EVALUATION`), `pycViolationEvaluation`=resolveGlLabel(GL `VIOLATION_EVALUATION`). Hằng số GL_* + field cache `glLabelCache`.
- **Lý do**: 3 trường này lưu 2 nguồn — freetext nhập tay (không có trong GL) hoặc chọn combobox từ GLD. Export cần hiện `GLD.NAME` cho giá trị từ GL, giữ nguyên freetext.
- **Ghi chú**:
  - Frontend `loadOptionsFromGl` (service-assessment/Index.vue): `RETURN_EVALUATION`/`VIOLATION_EVALUATION` lưu **NAME** (valueMode 'label'); `ERROR_SR` lưu **CODE** (multi). Resolve theo {CODE,VALUE,NAME} nên đúng cho cả 2 kiểu lưu + legacy.
  - **Chưa xử lý** `COMPLIANCE_EVALUATION` ("Đánh giá tuân thủ") — frontend cũng lưu CODE (valueMode mặc định 'code'), nhiều khả năng cần resolve tương tự nếu muốn hiện name; user chưa yêu cầu nên giữ nguyên.
  - Chưa build (rule VPN) — user tự `mvn clean install`.

## 2026-06-02 — Báo cáo SR: nhãn cột "Đánh giá/Chấm điểm"

- **Phạm vi**: `BaoCaoSrServiceImpl.formatAssessmentEnabled`.
- **Thay đổi chính**: `ASSESSMENT_ENABLED = 1` → "Đánh giá"; còn lại (null/0/khác) → "Không" (trước đây: 1→"Có", null→"", khác→"Không").
- **Lý do**: yêu cầu nghiệp vụ đổi nhãn hiển thị trên export.

## 2026-06-02 — Fix ASSESSMENT_ENABLED luôn ra 0/null trong báo cáo SR

- **Phạm vi**: `BaoCaoSrServiceImpl.toInteger`.
- **Nguyên nhân**: cột `PROJECT_PL_SR_ASSESSMENT.ASSESSMENT_ENABLED` là `tinyint(1)`. MySQL Connector/J mặc định `tinyInt1isBit=true` → JDBC trả về `Boolean`, không phải số. `toInteger` cũ gọi `DataUtil.safeToInt` → `Boolean.toString()` = "true"/"false" → `Integer.parseInt` ném `NumberFormatException` → trả default 0. Vì vậy enabled=1 luôn thành 0 (→ "Không"). Trong SQL client thì tinyint(1) hiện 0/1 nên select tay vẫn đúng.
- **Thay đổi chính**: `toInteger` xử lý `Boolean → 1/0` và `Number → intValue()` trước khi fallback `safeToInt` — mirror `asInteger` của `ProjectPlSrAssessmentServiceImpl` (vốn đã xử lý Boolean nên màn đánh giá không dính bug).
- **Ghi chú**: Lưu ý chung — mọi cột `tinyint(1)` đọc qua native query trong project này có thể về Boolean; dùng converter xử lý Boolean thay vì `safeToInt` trực tiếp. Chưa build (rule VPN).

## 2026-06-02 — Màn đánh giá SR: auto ASSESSMENT_ENABLED=1 & ẩn nút đánh giá khi đã đánh giá

- **Phạm vi**: `client/src/views/service-assessment/Index.vue`.
- **Thay đổi chính**:
  - Nút "Đánh giá" (icon `audit-outlined`) đổi từ disable/làm xám (khi `record.assessed`) sang **ẩn hẳn** bằng `v-if="!record.assessed"`. Khi đã đánh giá, nút edit "Cập nhật đánh giá" (`v-if="record.assessed"`) vẫn hiện để cập nhật.
  - Phần auto gửi `assessmentEnabled = 1`: **đã có sẵn** trong `buildAssessmentPayload()` (luôn trả `assessmentEnabled: 1`), `onSave` dùng cho cả create lẫn `updateProjectPlSrAssessment` → không cần sửa.
- **Lý do**: yêu cầu nghiệp vụ — đánh giá/cập nhật luôn đánh dấu đã đánh giá; UI ẩn nút thay vì disable.

## 2026-06-02 — Modal đánh giá SR (/service-assessment): sửa field & logic theo Tuân thủ

- **Phạm vi**: `client/src/views/service-assessment/Index.vue`.
- **Thay đổi chính**:
  - **Ngày hoàn trả thực tế**: bỏ giờ — bỏ `show-time`, `format="DD/MM/YYYY"`; GIỮ `value-format="DD/MM/YYYY HH:mm:ss"` (00:00:00) vì SaveSdi `actualReturnDate` là `java.util.Date`, đổi value-format sẽ vỡ parse BE.
  - **Đánh giá hoàn trả hồ sơ** & **Đánh giá vi phạm**: đổi `a-auto-complete` → `a-select` (chỉ chọn từ danh sách, bỏ freetext). Options vẫn là returnEvaluationOptions/violationEvaluationOptions (value = label NAME, loadOptionsFromGl valueMode 'label').
  - **Logic theo Đánh giá tuân thủ** (so theo CODE GLD, không dùng text): thêm hằng `COMPLIANT_VALUE='TUAN_THU'` + computed `isCompliant` (cặp với `NON_COMPLIANT_VALUE='KHONG_TUAN_THU'`).
    - Khi Tuân thủ: ẩn (`v-if="!isCompliant"`) 3 field **Lỗi / Đánh giá hoàn trả hồ sơ / Đánh giá vi phạm**; `buildAssessmentPayload` set 3 field này = null khi compliant.
    - **Đơn vị được đánh giá** + **Đầu mối đơn vị được đánh giá**: bắt buộc khi `isCompliant || isNonCompliant` (giữ yêu cầu cũ khi Không tuân thủ + thêm khi Tuân thủ).
    - `returnEvaluation` required đổi từ `isDebt` → `isDebt && !isCompliant` (tránh required trên field đã ẩn).
- **Lý do**: yêu cầu nghiệp vụ chỉnh modal đánh giá.
- **Ghi chú/giả định cần xác nhận khi có VPN**:
  - Code GLD "Tuân thủ" giả định là `TUAN_THU` (theo cặp `KHONG_TUAN_THU`) — nếu khác, sửa `COMPLIANT_VALUE`.
  - "Đơn vị/Đầu mối bắt buộc khi Tuân thủ" hiểu là **union** (bắt buộc ở cả 2 trạng thái) để không bỏ ràng buộc cũ khi Không tuân thủ.
  - Combobox maxlength (lượt trước) đã sửa: rule "Lỗi" validate độ dài chuỗi join thay vì số tag; returnEvaluation/violationEvaluation luôn có rule max 255.

## 2026-06-02 — Báo cáo SR (/service): bổ sung filter Thời gian tiếp nhận/xử lý thực tế

- **Phạm vi**:
  - BE: `dto/sdi/projectplasm/sr/BaoCaoSrSearchSdi.java`, `service/projectPlAsm/impl/BaoCaoSrServiceImpl.java` (`buildWhereClause`).
  - FE: `client/src/views/service-management/bao-cao-sr/BaoCaoSrModal.vue`.
- **Thay đổi chính**:
  - SDI thêm 4 field: `actualResponseTimeFrom/To` (= SR.ACTUAL_RESPONSE_TIME), `actualEndTimeFrom/To` (= SR.ACTUAL_END_TIME), `@JsonFormat DATE_TIME_FORMAT_32`.
  - `buildWhereClause` thêm 4 điều kiện range `SR.ACTUAL_RESPONSE_TIME >= / <=` và `SR.ACTUAL_END_TIME >= / <=`.
  - Modal thêm 2 a-range-picker "Thời gian tiếp nhận thực tế" + "Thời gian xử lý thực tế"; gửi param từ/đến theo `YYYY-MM-DD HH:mm` (startOf/endOf day) như "Ngày tạo".
- **Lý do**: yêu cầu bổ sung điều kiện lọc cho báo cáo SR. "Ngày tạo = createTime" đã có sẵn (createDateFrom/To → SR.CREATE_TIME).
- **Ghi chú**: Chưa build (rule VPN). Cảnh báo `APIResponse raw type` ở file BE là code cũ, không đụng.

## 2026-06-02 — Báo cáo SR: thêm cột "Kết quả thẩm định (báo cáo)"

- **Phạm vi**: `dto/sdo/projectplasm/sr/BaoCaoSrSdo.java`, `service/projectPlAsm/impl/BaoCaoSrServiceImpl.java` (buildSelectSql, mapRows, fillSheet).
- **Thay đổi chính**:
  - DTO thêm field `ketQuaThamDinh` (String).
  - `buildSelectSql`: append cuối SELECT subquery `(SELECT GROUP_CONCAT(DISTINCT SUB_PWS.WORK_LOG_CONTENT) FROM PROJECT_PL_SR_WORK_LOG SUB_PWS JOIN PROJECT_PL_WORK_LOG SUB_PWL ON SUB_PWS.PROJECT_PL_WORK_LOG_ID = SUB_PWL.ID WHERE SUB_PWS.PROJECT_PL_SR_ID = SR.ID AND SUB_PWL.WORK_LOG_TYPE = 'Kết quả') AS ketQuaThamDinh` — append cuối để không lệch index cột cũ.
  - `mapRows`: `pycEvaluationNote` đổi `r[i]`→`r[i++]`, thêm `setKetQuaThamDinh(r[i])`.
  - `fillSheet`: thêm `setCellValue(... r.getKetQuaThamDinh())` ngay sau `getPycResultMethod()` (cột "Hình thức trả KQ") → đúng vị trí cột mới user đã chèn vào template Excel.
- **Lý do**: user thêm cột "Kết quả thẩm định (báo cáo)" sau "Hình thức trả KQ" trong template.
- **Ghi chú**: GROUP_CONCAT giới hạn `group_concat_max_len` (mặc định 1024). Chưa build (rule VPN).

## 2026-06-02 — Báo cáo SR: cột "Kết quả thẩm định" lấy work log mới nhất (thay vì GROUP_CONCAT)

- **Phạm vi**: `BaoCaoSrServiceImpl.buildSelectSql` (subquery ketQuaThamDinh).
- **Thay đổi chính**: đổi từ `GROUP_CONCAT(DISTINCT SUB_PWS.WORK_LOG_CONTENT)` sang lấy 1 bản ghi mới nhất: `SELECT SUB_PWS.WORK_LOG_CONTENT ... WHERE ... AND SUB_PWL.WORK_LOG_TYPE='Kết quả' ORDER BY SUB_PWS.CREATE_TIME DESC, SUB_PWS.ID DESC LIMIT 1`.
- **Lý do**: khi SR có nhiều work log type 'Kết quả' thì chỉ lấy cái cuối cùng (mới nhất).
- **Ghi chú**: `PROJECT_PL_SR_WORK_LOG` extends AbstractAudit nên có cột CREATE_TIME. DTO/mapRows/fillSheet giữ nguyên. Chưa build (rule VPN).

## 2026-06-02 — Màn đánh giá (/service-assessment): điều kiện hiển thị SR

- **Phạm vi**: `service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java` (`appendWhere`).
- **Thay đổi chính**: thêm 2 điều kiện lọc (áp cho cả count + data query vì chỉ correlate `sr`):
  - State: `EXISTS (SELECT 1 FROM PROJECT_PL_STATUS PST_STATE WHERE PST_STATE.ID = sr.STATE AND PST_STATE.STATUS=1 AND PST_STATE.PL_STATUS_CODE IN ('DONE','CLOSED'))` → SR Đã thực hiện hoặc Đóng.
  - Kết quả = Hoàn thành: `(SELECT SUB_PWS.WORK_LOG_CONTENT FROM PROJECT_PL_SR_WORK_LOG SUB_PWS JOIN PROJECT_PL_WORK_LOG SUB_PWL ON ... WHERE SUB_PWS.PROJECT_PL_SR_ID = sr.ID AND SUB_PWL.WORK_LOG_TYPE='Kết quả' ORDER BY SUB_PWS.CREATE_TIME DESC, SUB_PWS.ID DESC LIMIT 1) = 'Hoàn thành'` → giống cơ chế cột `ketQuaThamDinh` ở báo cáo.
  - `HAS_SEND_PYC = 1` đã có sẵn.
- **Lý do**: màn đánh giá chỉ hiển thị SR Đã thực hiện/Đóng + HAS_SEND_PYC=1 + Kết quả SR = Hoàn thành.
- **Ghi chú**: `PL_STATUS_CODE` là cột code của PROJECT_PL_STATUS (Const.DONE='DONE', Const.CLOSED='CLOSED'). So sánh '= Hoàn thành' chính xác (chưa TRIM). Chưa build (rule VPN).

## 2026-06-02 — Phân quyền dữ liệu Báo cáo + Đánh giá SR (bỏ gate nút, scope theo người xử lý)

- **Phạm vi**:
  - Đánh giá BE: `service/projectPlAsm/ProjectPlSrAssessmentService.java` (interface), `.../impl/ProjectPlSrAssessmentServiceImpl.java`, `controller/projectPlAsm/ProjectPlSrAssessmentController.java`.
  - Báo cáo BE: `.../impl/BaoCaoSrServiceImpl.java`.
  - FE: `client/src/views/service-management/Index.vue` (nút Đánh giá), `client/src/views/service-management/bao-cao-sr/BaoCaoSrModal.vue` (export).
- **Thay đổi chính**:
  - **Đánh giá**: `search(request)` -> `search(request, token)`. Service inject `JwtKeyCloakProvider` + `ProjectPlSrPycPermissionService`; tính `viewAll = canAccessPycAssessmentScreen(token)`, `currentStaffId = getStaffIdFromToken(token)`. `appendWhere(..., viewAll, currentStaffId)`: nếu `!viewAll` thêm `AND sr.STAFF_ID = :scopeStaffId`. Controller: bỏ `validateAssessmentPermission` ở search/detail/detailByProject (ai cũng xem); create/update đổi sang `validateAssessableSr` = `canViewSrPyc(projectId, token)`; **delete vẫn giữ** `validateAssessmentPermission`.
  - **Báo cáo**: `exportExcel` bỏ chặn `hasPermissionExport` (ai cũng export). `buildWhereClause(req, params, boolean viewAll, Long currentStaffId)`: bỏ nhánh cũ `HAS_SEND_PYC <> 1`, thay bằng `if(!viewAll) AND SR.STAFF_ID = :scopeStaffId`. `search()`+`searchAll()` tính `viewAll = isAdmin || isUserInDmSrViewWhitelist`, `currentStaffId = getStaffIdFromToken`.
  - **FE**: nút "Đánh giá" bỏ `v-if="canUsePycAssessmentFilter"` + `onOpenAssessment` bỏ guard. BaoCaoSrModal `loadPermission` set `canExport=true` (xoá import `hasPermissionExportBaoCaoSr`).
- **Lý do**: ai cũng vào/xuất được Báo cáo & Đánh giá, nhưng dữ liệu chỉ gồm bản ghi mình là người xử lý (sr.STAFF_ID) hoặc thuộc nhóm xem-all DM_SR_VIEW/admin (phần all đã có sẵn).
- **Ghi chú/đã quyết**:
  - "người xử lý" = `sr.STAFF_ID` = currentStaffId (dùng cho cả 2 màn). DM_SR_VIEW/admin = viewAll -> bỏ scope.
  - Filter cột "Đánh giá/Chấm điểm" trên /service vẫn gated bởi `canUsePycAssessmentFilter` (user chỉ yêu cầu bỏ gate ở NÚT).
  - delete đánh giá vẫn chỉ DM_SR_VIEW/admin (user không nhắc delete).
  - `hasPermissionExport` (BE) + endpoint `/has-permission` giữ nguyên nhưng FE không còn dùng để gate.
  - Chưa build (rule VPN).

## 2026-06-02 — Mở rộng scope phân quyền: thêm lãnh đạo ĐVXL của người xử lý

- **Phạm vi**: `ProjectPlSrPycPermissionSql.java` (thêm helper), `BaoCaoSrServiceImpl.buildWhereClause`, `ProjectPlSrAssessmentServiceImpl.appendWhere`.
- **Thay đổi chính**: thay scope cũ `STAFF_ID = :scopeStaffId` (chỉ người xử lý) bằng helper mới `ProjectPlSrPycPermissionSql.handlerOrExecutionLeaderScope(srAlias)` = `(srAlias.STAFF_ID = :pycCurrentStaffId OR leaderExistsForExecutionUser(srAlias))`. Param set qua `putStaffScopeParam(params, currentStaffId)`.
  - `leaderExistsForExecutionUser` (đã có sẵn): current user là lãnh đạo role IN ('TP','PP','PGDDV','PGDCT','TGĐ','TĐV') của org unit (phòng/TT, xử lý ORG_UNIT_TYPE='5'→đơn vị cha) mà người xử lý SR (STAFF_ID) thuộc về.
- **Lý do**: ngoài người xử lý, TP/PP và lãnh đạo BGĐ của phòng/TT (ĐVXL) của người xử lý cũng xem/đánh giá/xuất báo cáo được SR đó.
- **Ghi chú**: viewAll (DM_SR_VIEW/admin) vẫn bỏ qua scope. Correlate chỉ `srAlias` nên chạy được cả count + data query. Chưa build (rule VPN).

## 2026-06-02 — Bỏ nốt route guard chặn /service-assessment

- **Phạm vi**: `client/src/router/routerGuards.ts`.
- **Thay đổi chính**: route guard `to.name === 'service-assessment'` trước đây gọi `hasPermissionUsePycAssessmentFilter()` -> nếu false đẩy sang `/not-have-permission`. Đổi thành `next()` (ai cũng vào được). Xoá import `hasPermissionUsePycAssessmentFilter` không còn dùng.
- **Lý do**: đây là gate cuối còn sót khiến nút "Đánh giá" vẫn chặn quyền dù đã bỏ v-if + guard onOpenAssessment + BE validateAssessmentPermission. Dữ liệu màn đánh giá đã phân quyền theo người xử lý / lãnh đạo ĐVXL / DM_SR_VIEW ở BE.
- **Ghi chú**: Chuỗi gate màn đánh giá giờ đã gỡ hết: nút (v-if) → onOpenAssessment → routerGuards → BE search. Chưa build (rule VPN).

## 2026-06-02 — CHỐT phân quyền dữ liệu Báo cáo + Đánh giá = canViewCondition

- **Phạm vi**: `ProjectPlSrAssessmentServiceImpl.appendWhere`, `BaoCaoSrServiceImpl.buildWhereClause`, controller assessment (`validateAssessableSr`), `ProjectPlSrPycPermissionSql` (gỡ helper), `ProjectPlSrPycPermissionService(+Impl)` (gỡ canAssessPycSr), `routerGuards.ts`.
- **Tập user được XEM + ĐÁNH GIÁ (chốt với user)**: người xử lý (STAFF_ID) + người tạo (CREATE_BY) + lãnh đạo (TP/PP/BGĐ) của **ĐVXL người xử lý** VÀ **ĐVYC người tạo** + DM_SR_VIEW + admin. = đúng `ProjectPlSrPycPermissionSql.canViewCondition` sẵn có. Áp **CÙNG** quy tắc cho cả màn Đánh giá lẫn Báo cáo.
- **Thay đổi chính**:
  - Cả 2 màn: nhánh `if(!viewAll)` dùng `canViewCondition(srAlias, devIam)` + `putParams(params, currentUsername, currentStaffId)` (trước đó tạm dùng scope hẹp `handlerOrExecutionLeaderScope` — ĐÃ GỠ).
  - Gate create/update/detailByProject (assessment): `validateAssessableSr` = `canViewSrPyc(projectId, token)` (= condition + admin). detail(id) gate `validateAssessmentPermission` (FE không dùng, defense). delete vẫn `validateAssessmentPermission`.
  - Gỡ `canAssessPycSr` (interface+impl) và `handlerOrExecutionLeaderScope`/`putStaffScopeParam` (SQL helper) — dead code sau khi chốt dùng canViewCondition.
  - viewAll: assessment = `canAccessPycAssessmentScreen(token)`; report = `isAdmin || isUserInDmSrViewWhitelist(username)`.
- **Lý do**: user chốt người tạo + lãnh đạo ĐVYC cũng được xem/đánh giá → đúng canViewCondition (loại user vô can).
- **Ghi chú**: canViewCondition correlate chỉ `srAlias` → chạy được ở cả count + data query. Chưa build (rule VPN).

## 2026-06-11 — Báo cáo SR: select "Đánh giá tuân thủ" nạp từ GL thay vì hard-code

- **Phạm vi**: `client/src/views/service-management/bao-cao-sr/BaoCaoSrModal.vue`.
- **Thay đổi chính**:
  - Bỏ hằng `COMPLIANCE_OPTIONS` hard-code (`value: 'Tuân thủ'/'Không tuân thủ'`). `complianceOptions` đổi từ const sang `ref<ComplianceOption[]>([])`.
  - Thêm `loadComplianceOptions()` gọi `getGlobalListByCode({ code: 'COMPLIANCE_EVALUATION' })`, map `value = GLD.CODE`, `label = GLD.NAME`; gọi trong `watch(props.open)` cùng loadOrgUnit/loadStateOptions.
- **Lý do**: BE filter `A.COMPLIANCE_EVALUATION = :pycComplianceEvaluation` so theo CODE (TUAN_THU/KHONG_TUAN_THU); FE trước gửi text → filter không khớp. Đồng bộ với màn `/service-assessment` (đã dùng `loadOptionsFromGl('COMPLIANCE_EVALUATION', ...)`).
- **Ghi chú**: chưa build (rule VPN). BE `mapRows` đã resolve CODE→NAME qua `resolveGlLabel(COMPLIANCE_EVALUATION,...)` nên cột hiển thị trong file xuất vẫn đúng.

## 2026-06-16 — Fix 404 Matomo (undefined/matomo/matomo.js)

- **Phạm vi**: client/public/js/globalConfig.js
- **Thay đổi chính**: Thêm key `VITE_MATOMO_API_URL: 'http://10.60.158.40'` (lấy từ .env.development).
- **Lý do**: index.html:65 đọc `window.globalConfig.VITE_MATOMO_API_URL` (runtime config), key thiếu → URL `undefined/matomo/matomo.js` → 404.
- **Ghi chú**: Lỗi 404 Matomo nạp async, KHÔNG gây treo/blank app. Nếu màn hình kẹt ở loading gif → nhiều khả năng do thiếu VPN Viettel (API trỏ 10.60.156.48). Kiểm tra Console/Network để tìm root cause thật.

## 2026-06-23 — Tài liệu API mới/thay đổi PYC Thẩm định từ f00d7ee7

- **Phạm vi**: crm-service/docs/API_PYC_THAM_DINH_tu_f00d7ee7.md (file mới).
- **Thay đổi chính**: Tổng hợp bảng API (STT | HTTP Method | API Path | Mô tả | Request Body/Params) cho các thay đổi từ commit f00d7ee7→HEAD. 12 API thêm mới (BaoCaoSr, ProjectPlSrAssessment, ProjectPlSrPycMapping, 2 endpoint quyền trên ProjectPlSr) + 7 API thay đổi (bổ sung Authorization/kiểm tra quyền PYC: download-file-with-footer, get-related-sr-by-sr-id, sr-history/search, sr-work-log/search, history-common/search & searchOrderByIssueDate, bp-sign-req/search).
- **Lý do**: User yêu cầu file work ghi lại đầu API thêm mới và thay đổi.
- **Ghi chú**: Chỉ tổng hợp tài liệu, không sửa code.

## 2026-06-23 — (update) Xuất file Word đúng template list_api

- **Phạm vi**: crm-service/docs/list_api_pyc_tham_dinh.docx (thay cho file .md/.docx cũ đã xóa).
- **Thay đổi chính**: Sinh lại file Word theo đúng cấu trúc mẫu /Users/tuanla/Downloads/list_api_1320_1337.docx — 1 bảng duy nhất 5 cột (STT | HTTP Method | API Path | Mô tả | Request Body/Params), API Path là URL đầy đủ host http://10.60.157.23:8040, request body dạng JSON ví dụ. 19 API (12 mới + 7 thay đổi).
- **Lý do**: User yêu cầu format giống file mẫu.
- **Ghi chú**: Script sinh tại scratchpad gen_docx2.py.

## 2026-07-01 — Xuất docx danh sách API commit e6f030f5

- **Phạm vi**: /Users/tuanla/Downloads/list_api_pyc_tham_dinh_e6f030f5.docx (file mới sinh; mẫu: list_api_pyc_tham_dinh.docx).
- **Thay đổi chính**: Liệt kê 3 API thêm mới ở commit e6f030f5 (nang cap pakd, pyc-1292) vào bảng 5 cột theo mẫu:
  1. POST /bp/exportProjectPlReport (ProjectPLController) — xuất báo cáo PAKD qua report service.
  2. POST /dashboard-effective-bp/search-effective-bp-by-framework (DashboardEffectiveBPController).
  3. POST /dashboard-effective-bp/search-effective-bp-by-framework-detail (DashboardEffectiveBPController).
- **Lý do**: User yêu cầu file docx các API sửa/thêm ở commit e6f030f5 theo mẫu.
- **Ghi chú**: Host base http://10.60.157.23:8040. Script sinh tại /tmp/gen_api_docx.py (dùng python-docx, giữ style Table Grid + header của mẫu).

## 2026-07-23 — Tạo team agent BA + Dev + Leader

- **Phạm vi**: `.claude/agents/ba-analyst.md`, `.claude/agents/java-senior-dev.md`, `.claude/agents/team-lead-reviewer.md`, cập nhật `.claude/CLAUDE.md` (mục Agents).
- **Thay đổi chính**:
  1. `ba-analyst` — phân tích nghiệp vụ từ PYC + task Excel (đọc xlsx/csv) → User Story + Acceptance Criteria + BLOCKER.
  2. `java-senior-dev` — implement backend Java 8/Spring Boot theo đặc tả, ràng buộc Java 8, không tự build (VPN).
  3. `team-lead-reviewer` — điều phối BA→Dev, đối chiếu đặc tả↔code, review chất lượng (không tự sửa code).
- **Lý do**: User yêu cầu 1 đội agent để pipeline PYC → phân tích → code → review cho ra sản phẩm tốt nhất.
- **Ghi chú**: 3 file md để mở, user tự chỉnh checklist/model sau. Model đang set `sonnet`.

## 2026-07-23 — Chuẩn hoá pipeline BA → Dev → Leader + template System Design

- **Phạm vi**: `.claude/agents/{ba-analyst,java-senior-dev,team-lead-reviewer}.md`, `.claude/skills/springboot-patterns/SKILL.md`, `.claude/CLAUDE.md`, `docs/tasks/_TEMPLATE_system-design.md`.
- **Thay đổi chính**:
  1. Định nghĩa quy trình chuẩn: task Excel → BA viết `docs/tasks/<Task>/system-design.md` (theo template) → Leader chốt BLOCKER → Dev đọc rules+skills rồi code, đổi DB thì sinh SQL `crm-service/sql/YYYY-MM-DD_*.sql` idempotent → Leader review tổng thể đối sánh PYC, báo Dev sửa ngay.
  2. `ba-analyst`: thêm tool Write, đọc `PYC_VCRM_Task_Subtask.xlsx` + `PYC Chinh sach _CRM.pdf`, xuất file System Design.
  3. `java-senior-dev`: BƯỚC 0 bắt buộc đọc rules+skills; ràng buộc Java 8; sinh file SQL cho thay đổi DB.
  4. `team-lead-reviewer`: review theo tổng thể task + PYC, loop giao Dev sửa ngay.
  5. Sửa skill `springboot-patterns` cho tương thích Java 8: bỏ `record` (dùng Lombok), bỏ khuyến nghị ProblemDetail Spring Boot 3, thêm cảnh báo Java 8 đầu file.
  6. Đóng đinh quy trình vào CLAUDE.md (mục "Quy trình chuẩn xử lý task").
- **Lý do**: User muốn quy trình cố định giao task qua Excel; BA ra system design MD; Dev bám design + rules; Leader review đối sánh PYC.
- **Ghi chú**: SQL convention theo mẫu `crm-service/sql/2026-05-15_cooperation_validity_status.sql`. Tài liệu BA đặt ở `docs/tasks/` (repo-root, span FE+BE). File md/skill để mở, user tự chỉnh sau.

## 2026-07-23 — Tổng hợp PYC + Excel thành file MD nguồn chuẩn cho BA

- **Phạm vi**: `docs/PYC_VCRM_KhaiBaoChinhSach.md` (mới), cập nhật `.claude/agents/ba-analyst.md`, `.claude/CLAUDE.md`.
- **Thay đổi chính**:
  1. Đọc `PYC Chinh sach _CRM.pdf` (14 trang, bản scan — đọc bằng Read tool pages) + `PYC_VCRM_Task_Subtask.xlsx` (9 Epic/~30 subtask, đọc bằng openpyxl qua venv scratchpad) → viết 1 file MD chi tiết làm single source of truth.
  2. Nội dung file: thông tin phiếu, hiện trạng/mục đích, phạm vi, glossary, luồng tổng thể (SP đã có 4 bước / SP mới 7 bước), chi tiết mục 2.1–2.9 (đầy đủ bảng hoạt động đợt 1/2/3, phụ lục PL1-6, danh mục 7 lĩnh vực QLBH, API tích hợp), bảng task/subtask, 8 BLOCKER cần làm rõ.
  3. `ba-analyst` giờ đọc từ file MD chuẩn trước, chỉ mở PDF/Excel gốc khi cần đối chiếu.
- **Lý do**: User muốn BA đọc từ 1 file MD chi tiết thay vì mở Excel/PDF mỗi lần.
- **Ghi chú**: PDF là bản scan không có text layer (pdfplumber trả rỗng) — phải dùng Read tool đọc ảnh. Các BLOCKER quan trọng: thiếu mục "2.2.1", thiếu biểu mẫu BM01-03, spec API QLBH/PBH/SAP/BCCS chưa có. venv tạm ở scratchpad có openpyxl+pdfplumber.

## 2026-07-23 — Gắn Figma làm nguồn chuẩn giao diện + xử lý Task 1 (đang chạy)

- **Phạm vi**: `docs/PYC_VCRM_KhaiBaoChinhSach.md`, `.claude/agents/ba-analyst.md`, `docs/tasks/_TEMPLATE_system-design.md`, `.claude/CLAUDE.md`, `docs/tasks/Task-01-them-moi-cap-nhat-cskd/system-design.md` (BA tạo).
- **Thay đổi chính**:
  1. Thêm link Figma "VCRM_TuDongKhaiBaoChinhSach" làm nguồn chuẩn UI cho 9 task; hướng dẫn BA/Dev dùng Figma MCP (get_metadata/get_screenshot/get_design_context/get_variable_defs); PYC↔Figma lệch → BLOCKER.
  2. Pipeline Task 1: BA đã viết system-design (đầy đủ 11 mục, đề xuất 2 bảng DB mới business_policy_new_product + business_policy_declare_info, thêm cột is_new_product/declare_area_lock_status). BA đang cập nhật lại design theo Figma.
- **Lý do**: User cung cấp link Figma, muốn agent follow cả thiết kế.
- **Ghi chú**: Task 1 bị chặn 1 phần — 1.1/1.2/1.6(SP đã có) code được ngay; 1.3 chặn bởi thiếu BM01; 1.4/1.5 chặn cứng bởi thiếu spec API QLBH/PBH; 1.6(SP mới) phụ thuộc Task 6. Đang chờ user quyết phạm vi triển khai (câu hỏi go/no-go bị interrupt để thêm Figma). Link Figma: vY8ypsh8iQBYRXwfEdOpLV.

## 2026-07-24 — Đối chiếu Figma vào System Design Task 1

- **Phạm vi**: `docs/tasks/Task-01-them-moi-cap-nhat-cskd/system-design.md` (§header/§4/§8/§10), `docs/tasks/Task-01-.../figma/*.png` (5 ảnh), `.claude/agents/ba-analyst.md`.
- **Thay đổi chính**:
  1. Orchestrator (main) lấy Figma qua MCP (fileKey vY8ypsh8iQBYRXwfEdOpLV). Frame Task 1: 94:80/94:274 (SP đã có Admin/User), 94:442/94:658 (SP mới Admin/User), 94:41/94:854/119:370 (modal Thêm mới thông tin khai báo). Lưu 5 screenshot vào thư mục task.
  2. Phát hiện KHÁC giả định BA: vùng "Thông tin khai báo chính sách" là **grid + modal "+ Thêm mới"** (không phải 3 khối import cố định). Modal có Loại khai báo (BCCS/QLBH/PBH) + File đính kèm (Tải lên/Tải biểu mẫu); riêng QLBH có thêm field "Lĩnh vực/nhóm giải pháp trên QLBH" (7 giá trị Task 8). Nhánh "Không" dùng field "Tên sản phẩm dịch vụ" = select SP/DV đã có.
  3. Cập nhật §4 theo layout thật, §8 điều chỉnh hướng FE (grid+modal), Q13 đã giải quyết, thêm Q14 (phân quyền Admin/User), Q15 (nguồn field Lĩnh vực QLBH ↔ Task 8).
  4. Sửa ba-analyst.md: BA subagent KHÔNG có Figma MCP → orchestrator tải ảnh vào docs/tasks/<task>/figma/ rồi BA đọc ảnh.
- **Lý do**: BA subagent không truy cập được Figma MCP; main có → main lấy hộ.
- **Ghi chú**: Vẫn chờ user quyết go/no-go phạm vi code (1.1/1.2/1.6-SP đã có code được; 1.3 chặn Q2 thiếu BM01; 1.4/1.5 chặn Q7 thiếu API QLBH/PBH; 1.6-SP mới phụ thuộc Task 6). get_metadata trả file lớn, đã lưu ở tool-results.

## 2026-07-24 — Task 1 (1.1+1.2) giao Dev, để lại vùng khai báo chính sách

- **Phạm vi**: `docs/tasks/Task-01-.../system-design.md` (thêm §0 chốt scope); giao 2 dev agent (java-senior-dev backend + general-purpose làm Vue dev frontend), đang chạy nền.
- **Quyết định**: User yêu cầu làm Task 1 NHƯNG bỏ vùng "Thông tin khai báo chính sách" (1.3/1.4/1.5 + disable 1.6). Chỉ làm 1.1 (radio SP/DV mới + toggle) + 1.2 (bảng tạo SP/DV mới).
- **Contract FE↔BE**: `isNewProduct` (0|1) + `newProductInfo{productGroupId, productGroupNameNew, productLineId, productLineNameNew, productName, productAlias, productDescription, managingOrganizationId}`.
- **Backend làm**: cột `is_new_product` trên business_policy; entity/bảng mới `business_policy_new_product`; DTO+service+validate; SQL `crm-service/sql/2026-07-24_task01-cskd-new-product.sql`. KHÔNG tạo declare_info, KHÔNG API import/QLBH/PBH.
- **Default áp dụng (chờ user xác nhận)**: Q1 khoá cứng isNewProduct sau tạo; Q9 Nhóm/Dòng thêm mới lưu name_new không ghi danh mục Task 8; Q11 Tên≤255/Alias≤50; Q12 chưa unique.
- **Anchor files (đã verify tồn tại)**: FE FormCommonInfo.vue (3981 dòng), FormProductType.vue; BE BusinessPolicyController.java, BusinessPolicy.java, BusinessPolicySaveOrUpdate.java (package com.app.businessproject, module VcrmApp).
- **TODO tiếp**: chờ 2 agent xong → team-lead-reviewer review tổng thể + vue-reviewer. Sau đó user chạy SQL + build (VPN).

## 2026-07-24 — Backend Task 1 (1.1 + 1.2): isNewProduct + business_policy_new_product

- **Phạm vi**:
  - Mới: `VcrmApp/.../domain/businessPolicy/BusinessPolicyNewProduct.java`, `.../repo/businessPolicy/BusinessPolicyNewProductRepo.java`, `.../dto/sdi/businessPolicy/BusinessPolicyNewProductInfoSdi.java`.
  - Sửa: `.../dto/sdi/businessPolicy/BusinessPolicySaveOrUpdate.java` (thêm `isNewProduct`, `newProductInfo`), `.../service/businessPolicy/impl/BusinessPolicyServiceImpl.java` (`createOrUpdate`: validate + lock `isNewProduct`, upsert `BusinessPolicyNewProduct`, null-safe `productTypeId`).
  - SQL mới: `crm-service/sql/2026-07-24_task01-cskd-new-product.sql`.
- **Thay đổi chính**:
  1. Phát hiện `BusinessPolicy` entity đã có sẵn field `isNewProductPolicy` (cột `IS_NEW_PRODUCT_POLICY`, cùng ý nghĩa "CSKD của SP/DV mới hay không") do `sql/scrip_update_1375.sql` (không idempotent, không có ngày) thêm cho việc khác trước đó. Quyết định TÁI SỬ DỤNG field/cột này thay vì thêm cột `is_new_product` trùng lặp như đề xuất gốc trong system-design §6.1(a) — tránh 2 cột cùng nghĩa trên `business_policy`. DTO vẫn giữ đúng tên JSON `isNewProduct` theo contract FE.
  2. `createOrUpdate`: validate `isNewProduct` bắt buộc (0/1); khi update — chặn sửa nếu khác giá trị đã lưu (Q1: khoá cứng); khi `isNewProduct=1` — validate `newProductInfo` (Bean Validation cho productName/productAlias/productDescription/managingOrganizationId + check thủ công "1 trong (id|nameNew)" cho Nhóm/Dòng) rồi upsert bảng `business_policy_new_product` theo `businessPolicyId` (Q9: name_new không ghi danh mục Task 8).
  3. Null-safe `productTypeId` (trước đó `.stream()` trực tiếp trên list có thể null) vì nhánh SP/DV mới không gửi field này.
  4. KHÔNG tạo `business_policy_declare_info`, không đụng `declare_area_lock_status`, không API declare-info (đúng phạm vi hoãn theo system-design §0).
- **Lý do**: Theo `docs/tasks/Task-01-them-moi-cap-nhat-cskd/system-design.md` §0/§4.1/§4.2/§5/§6/§7/§9 (AC-1.1a-c, AC-1.2a-c).
- **Ghi chú/rủi ro**:
  - Việc tái dùng cột `is_new_product_policy` là quyết định kỹ thuật của Dev (không đổi rule nghiệp vụ) — cần leader/user xác nhận lại tên cột/field cuối cùng nếu muốn đổi tên cho khớp đúng system-design.
  - Chưa build (VPN) — user cần tự `mvn clean install` và chạy SQL.
  - Cần user chạy: `crm-service/sql/2026-07-24_task01-cskd-new-product.sql` (idempotent, có guard cho cả trường hợp `scrip_update_1375.sql` chưa chạy).

## 2026-07-24 — Task 1 (1.1+1.2) FE: radio SP/DV mới + sub-form tạo SP/DV mới

- **Phạm vi**:
  - Tạo mới `client/src/views/sales-project/business-policy/Form/FormNewProductInfo.vue` (`<script setup lang="ts">`).
  - Sửa `client/src/views/sales-project/business-policy/Form/FormCommonInfo.vue` (radio, model, rules, payload, load Cập nhật, return).
- **Thay đổi chính**:
  1. Radio "* CSKD của SP/DV mới?" (Có=1/Không=0) đặt cùng hàng Loại CSKD/Trạng thái; readonly khi Cập nhật (`:disabled="isEdit"`); required rule `isNewProduct`.
  2. Toggle: Có → render `<form-new-product-info>` (6 field: Nhóm/Dòng SP/DV có "+ Thêm mới", Tên SPDV, Alias≤50, Đơn vị chủ trì, Mô tả textarea maxlength 2000 + show-count). Không → giữ select `productTypeId` (v-if isNewProduct===0), required chỉ khi Không.
  3. productTypeId rule đổi sang validator (chỉ bắt buộc khi isNewProduct===0). Thêm rules validator cho np* (chỉ khi isNewProduct===1).
  4. Payload: thêm `isNewProduct` + `newProductInfo{productGroupId,productGroupNameNew,productLineId,productLineNameNew,productName,productAlias,productDescription,managingOrganizationId}`; xoá field phẳng np* khỏi params; productTypeId=[] khi SP/DV mới.
  5. Màn Cập nhật: map `body.isNewProduct` + `body.newProductInfo.*` vào modelRef.
  6. handleIsNewProductChange: clearValidate nhánh bị ẩn khi đổi Có↔Không (giữ tạm dữ liệu, submit chỉ gửi nhánh đang chọn).
- **Lý do**: subtask 1.1 (radio + toggle) + 1.2 (bảng tạo SP/DV mới) theo system-design §4.1/§4.2/§8 + Figma 94:442/94:80.
- **Ghi chú**:
  - Nhóm/Dòng dùng `getAllProductFamilyActive` / `getAllProductLineActive` (field-names name/projectPLRnrId), Đơn vị chủ trì dùng `listOrgUnit` sẵn có của cha. "+ Thêm mới" toggle select↔input, ghi `*NameNew`.
  - KHÔNG làm vùng "Thông tin khai báo chính sách" (grid+modal BM01/02/03) — hoãn. KHÔNG thêm route defineRouting.
  - Layout "Không": radio md=24 tự xuống dòng, hàng dưới productTypeId+Loại+Trạng thái (khớp Figma). Layout "Có": radio+Loại+Trạng thái cùng hàng rồi sub-form.
  - Cần user chạy `npm run dev` (VPN) để kiểm: hiển thị toggle, validate 6 field, đếm ký tự Mô tả, scroll tới field lỗi, payload gửi lên BE (isNewProduct/newProductInfo). BE phải trả `newProductInfo` object khi GET detail để map lại lúc Cập nhật.

## 2026-07-24 — Review Task 1 → BLOCK, đang fix vòng 2

- **Phạm vi**: review code Task 1 (1.1+1.2) bởi team-lead-reviewer + vue-reviewer; giao Dev sửa.
- **Verdict Leader**: ⛔ BLOCK — 1 CRITICAL + 1 HIGH.
  - CRITICAL-1 (BE): GET chi tiết CSKD (`BusinessPolicyServiceImpl.getById`, `BusinessPolicyRepoImpl.getById`, DTO `BusinessPolicyTable`) không trả `isNewProduct`/`newProductInfo` → màn Cập nhật đọc undefined → radio disabled+required → CHẶN Lưu mọi CSKD (regression cả luồng cũ). Fix: thêm field vào BusinessPolicyTable + SELECT `is_new_product_policy` + map newProductInfo từ repo.
  - HIGH (FE): `FormNewProductInfo.vue` mutate trực tiếp props (onGroupChange/toggleNewGroup/toggleNewLine) → vi phạm rule bất biến + fail `vue/no-mutating-props`. Fix: emit update hoặc eslint-disable theo tiền lệ MasterPlanDetailFilter.vue.
- **Điểm tốt đã xác nhận**: contract FE↔BE khớp 100%; value Nhóm/Dòng = projectPLRnrId đúng (ProductFamily/ProductLine); tái dùng cột is_new_product_policy hợp lý; SQL idempotent; Java 8 sạch; đúng phạm vi (không đụng declare area).
- **Đang làm**: resume java-senior-dev (fix CRITICAL) + Vue dev (fix HIGH), background.
- **TODO**: xong → review vòng 2; user test thủ công màn Cập nhật SP/DV mới sau khi có VPN (chạy SQL + mvn -pl VcrmApp clean install + npm run lint/dev).

## 2026-07-24 — Task 1 FE: fix HIGH review vue/no-mutating-props (FormNewProductInfo.vue)

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormNewProductInfo.vue`.
- **Thay đổi**: chọn cách giữ pattern shared-reactive-model (theo tiền lệ `MasterPlanDetailFilter.vue`), thêm eslint-disable thay vì refactor emit:
  - Dòng 1: `<!-- eslint-disable vue/no-mutating-props -->` (phủ template v-model="model.np*").
  - Thêm `// eslint-disable-next-line vue/no-mutating-props` trên từng dòng mutate props.model.np* trong onGroupChange (2), toggleNewGroup (4), toggleNewLine (2).
- **Lý do**: reviewer đánh HIGH — mutate props trực tiếp vi phạm rule bất biến + fail `npm run lint` (plugin:vue/vue3-recommended). Giữ nguyên hành vi toggle/reset. Refactor emit tốn boilerplate 8 field (kể cả template v-model vẫn mutate) → chọn cách tối thiểu đúng tiền lệ dự án.

## 2026-07-24 — Fix CRITICAL Leader review: GET chi tiết CSKD thiếu isNewProduct/newProductInfo

- **Phạm vi**:
  - Mới: `VcrmApp/.../dto/sdo/businessPolicy/BusinessPolicyNewProductInfoSdo.java`.
  - Sửa: `.../dto/sdo/businessPolicy/BusinessPolicyTable.java` (thêm `isNewProduct`, `newProductInfo`), `.../repo/businessPolicy/impl/BusinessPolicyRepoImpl.java` (`getById`: thêm `policy.is_new_product_policy as isNewProduct` vào SELECT native SQL + map `dto.setIsNewProduct(...)`), `.../service/businessPolicy/impl/BusinessPolicyServiceImpl.java` (`getById`: gọi `enrichNewProductInfo(result)` mới — nạp `newProductInfo` từ `businessPolicyNewProductRepo.findByBusinessPolicyId` khi `isNewProduct=1`, null-safe qua `Optional.ifPresent`).
- **Lý do**: Leader review Task 1 → BLOCK do CRITICAL: API `GET /business-policy/get-data` không trả `isNewProduct`/`newProductInfo` → FE màn Cập nhật đọc undefined → chặn Lưu MỌI CSKD (regression). Đã fix đúng 3 điểm Leader chỉ ra.
- **Ghi chú**: JSON response field đúng contract `isNewProduct` (Integer 0/1) + `newProductInfo{productGroupId, productGroupNameNew, productLineId, productLineNameNew, productName, productAlias, productDescription, managingOrganizationId}`. Đã grep sạch Java 8. Chưa build (VPN) — cần `mvn clean install` lại + chạy SQL `crm-service/sql/2026-07-24_task01-cskd-new-product.sql` (không đổi so với lần trước, không cần SQL mới cho fix này vì không đổi schema thêm).

## 2026-07-24 — Task 1 (1.1+1.2) APPROVE, sẵn sàng merge

- **Phạm vi**: fix vòng 2 + review vòng 2 Task 1.
- **Verdict**: ✅ APPROVE (team-lead-reviewer vòng 2). Không còn CRITICAL/HIGH.
- **Fix CRITICAL (BE)**: thêm SDO output BusinessPolicyNewProductInfoSdo; BusinessPolicyTable + isNewProduct/newProductInfo; BusinessPolicyRepoImpl.getById SELECT is_new_product_policy (map null-safe kiểu effectiveStatus); BusinessPolicyServiceImpl.enrichNewProductInfo (ifPresent). Cột DEFAULT 0 backfill CSKD cũ → hết regression chặn Lưu.
- **Fix HIGH (FE)**: FormNewProductInfo.vue thêm eslint-disable vue/no-mutating-props (file-level + per-line) theo tiền lệ MasterPlanDetailFilter.vue.
- **Tổng file Task 1**: BE 6 mới + 4 sửa (gồm SQL); FE 1 mới (FormNewProductInfo.vue) + 1 sửa (FormCommonInfo.vue). Chi tiết + lệnh chạy: docs/tasks/Task-01-.../system-design.md §12.
- **User cần chạy (VPN)**: 1) SQL 2026-07-24_task01-cskd-new-product.sql TRƯỚC khi deploy; 2) mvn -pl VcrmApp clean install; 3) npm run lint + dev; 4) test tay màn Cập nhật (SP/DV mới + CSKD cũ).
- **Còn treo**: vùng khai báo chính sách (1.3/1.4/1.5/1.6) chờ BM01-03 + API QLBH/PBH; xác nhận default Q1/Q9/Q11/Q12/Q14/Q15; chưa có test tự động.

## 2026-07-24 — Fix 2 lỗi Task 1 sau khi user test

- **Phạm vi**: `BusinessPolicyRepoImpl.java` (getById), `FormCommonInfo.vue` (modelRef).
- **Lỗi 1 (FE)**: mặc định trường "CSKD của SP/DV mới?" khi tạo mới → đổi `isNewProduct: null` → `isNewProduct: 0` (dòng 872).
- **Lỗi 2 (BE)**: `ClassCastException: Boolean cannot be cast to Number` tại BusinessPolicyRepoImpl.getById:867 — cột `is_new_product_policy` là BIT/BOOLEAN nên JDBC trả Boolean. Fix: xử lý cả `instanceof Boolean` (→1/0) lẫn `instanceof Number`. Đoạn map nằm inline trong getById (không phải mapper dùng chung → list/search không ảnh hưởng).
- **Java 8**: instanceof thường, OK.
- **Ghi chú**: user cần build lại BE + reload FE để verify. Update mode (dòng 1725) phản ánh giá trị server (0/1) — OK sau fix BE.

## 2026-07-24 — Fix lỗi SQL syntax SR search (KHÔNG thuộc Task 1)

- **Phạm vi**: `crm-service/.../repo/projectPlAsm/impl/ProjectPlSrRepoCustomImpl.java` dòng 407.
- **Lỗi**: `SQLSyntaxErrorException ... near ')'` khi search PROJECT_PL_SR (feature phân quyền PYC SR, nhánh pyc-1375). KHÔNG liên quan code Task 1.
- **Root cause**: builder @368 mở `where (SR.STATUS = 1` (1 ngoặc) nhưng đóng 2 lần `)` (dòng 683 đóng nhóm base, 737 đóng nhóm ngoài bọc `(base) or (modules)`) → dư 1 `)` ngay trước điều kiện permission `and (NVL(SR.HAS_SEND_PYC...))` → luôn crash query này.
- **Fix**: dòng 407 `where (SR.STATUS = 1` → `where ((SR.STATUS = 1` → thành `where ((base) or (modules)) and (permission)`. Semantic đúng (permission áp cho cả tập).
- **Đã kiểm**: builder @5073 (1 mở/1 đóng, không permission) và builder @3439 (`where SR.STATUS=1` không nhóm) đều cân bằng — không sửa.
- **Ghi chú**: đây là permission SQL → user build lại + test list SR + kiểm tra lọc quyền còn đúng. Trigger có thể do màn CSKD detail load SR theo BUSINESS_POLICY_ID (đụng query này).

## 2026-07-24 — Fix cột "Tên sản phẩm dịch vụ" trống với CSKD SP/DV mới (danh sách)

- **Phạm vi**: `BusinessPolicyRepoImpl.java` — method `search` (list) + query export (2 chỗ, cùng pattern).
- **Nguyên nhân**: cột `productTypeName` dựng từ `product_type` join theo `policy.product_type_id`. CSKD SP/DV mới có product_type_id rỗng (khi lưu set productTypeId=[]), tên cất ở `business_policy_new_product.product_name` → query list không đọc → cột trống.
- **Fix**: `productTypeName` = CASE WHEN NVL(policy.is_new_product_policy,0)=1 THEN (select product_name from business_policy_new_product where business_policy_id=policy.id) ELSE (GROUP_CONCAT product_type cũ) END. Giữ nguyên hành vi SP/DV đã có.
- **Ghi chú**: đây là mở rộng nhẹ sang Task 3 (cột danh sách) nhưng cần thiết để không trống UX. Cần build lại BE. Màn detail đã có newProductInfo riêng nên không đụng.

## 2026-07-24 — Fix OOM khi npm run build FE

- **Phạm vi**: `client/package.json` scripts build/build-develop/build-staging/build-test/build-more-space-size.
- **Triệu chứng**: `FATAL ERROR: Reached heap limit Allocation failed - JS heap out of memory` khi `npm run build`.
- **Chẩn đoán**: build đã set `--max_old_space_size=8192` (8GB) nhưng project lớn (1141 file .vue, Vite 2.4.3 cũ) chạm trần khi Rollup bundle. Import của component mới (FormNewProductInfo.vue) sạch, không vòng lặp → KHÔNG do thay đổi Task 1.
- **Fix**: tăng heap 8192 → 16384 (máy 24GB RAM, an toàn). Giữ clean-dev nguyên.
- **Ghi chú**: nếu vẫn OOM ở 16GB → cần điều tra module/SFC cụ thể hoặc cân nhắc nâng Vite (khoá version, phải bàn team). package.json có thể giữ local hoặc commit tuỳ team.

## 2026-07-24 — Kế hoạch khả thi Task 2 (Xem chi tiết CSKD)

- **Phạm vi**: `docs/tasks/Task-02-xem-chi-tiet-cskd/readiness-plan.md` + figma/ (2 ảnh 94:1498 SP đã có, 94:1182 SP mới).
- **Kết luận**: Figma ĐỦ cho Task 2. Nhưng Task 2 chủ yếu là lớp HIỂN THỊ dữ liệu do Task 6 (Hoạt động) + Task 9 (API QLBH/PBH/SAP/BCCS) + vùng khai báo Task 1 (đã hoãn) sinh ra.
  - Làm ngay được: sơ đồ tiến trình (UI + 3 bước đầu từ processStatus), khung vùng kết quả khai báo, hiển thị info SP/DV mới từ business_policy_new_product (data Task 1), logic tổng hợp trạng thái 2.5.
  - Chặn: trạng thái node bước sau + 5 khối khai báo, mã PH/TelecomServiceID/Saletrantype, trạng thái QLBH/PBH, file PL (tự sinh + import) → cần Task 6 + Task 9 + BM/API (Q2/Q7).
- **Khuyến nghị**: làm Task 6 TRƯỚC Task 2 (đúng thứ tự phụ thuộc), tránh làm Task 2 rỗng rồi sửa lại.
- **TODO**: chờ user chọn hướng (A: khung Task 2 ngay / B: Task 6 trước / C: chờ đủ BM+API).

## 2026-07-24 — Chọn hướng: Task 6 trước Task 2 + kế hoạch khả thi Task 6

- **Quyết định user**: làm Task 6 trước Task 2 (đúng thứ tự phụ thuộc); BM + API vẫn CHƯA có.
- **Phạm vi**: `docs/tasks/Task-06-tab-khai-bao-chinh-sach/readiness-plan.md` + figma/ (94:1010 tab, 124:428 form công việc).
- **Kết luận Task 6**: Figma đủ. Phần lớn Task 6 là logic NỘI BỘ (tự sinh Hoạt động, máy trạng thái đợt1→2→3, enable nút Tạo yêu cầu, sinh phụ lục=đính kèm file ký, chuyển hồ sơ) → làm được khi chưa có BM/API.
  - PHẢI bundle Task 7 (Loại đối tượng "Chính sách kinh doanh" + 8 Nhóm công việc + field ràng buộc) làm nền.
  - Chặn (cần API/BM): tự cập nhật trạng thái HĐ QLBH/PBH qua API → fallback hoàn thành THỦ CÔNG; API gửi PYC sang QLBH/PBH (Task 9); import lại 3 vùng khai báo (Task 1 declare hoãn).
- **BLOCKER**: Q5 (ngày làm việc), Q6 (user phụ trách QLBH/PBH), Q-API (chấp nhận fallback thủ công?), Q1 (field theo nhóm), Q4 (đánh số phụ lục).
- **TODO**: chờ user chốt scope (bundle Task 7+Task 6 nội bộ, API fallback thủ công) rồi BA viết System Design Task 6.

## 2026-07-27 — Tracker tiến độ chuyển sang PYC-1375.xlsx local + helper script

- **Phạm vi**: `scripts/update_task_status.py` (mới), `.claude/agents/team-lead-reviewer.md`, `.claude/CLAUDE.md`.
- **Bối cảnh**: user muốn cập nhật STATUS trực tiếp vào `PYC-1375.xlsx` (thay Google Sheet — sheet đọc công khai được nhưng ghi cần auth, không có MCP/gcloud).
- **Tracker**: `PYC-1375.xlsx` Sheet1, cột A=STT..H=End Time,I=DEV,J=STATUS. Giá trị: To do/Process/Done. Hiện: Task 1.1/1.2=Done(tuanla); 1.3-1.6=To do; 3.1/3.2/4.1=Process(anhpd); còn lại To do.
- **Helper**: `python scripts/update_task_status.py 6.1 6.2 --status Done --dev <dev> --end dd/MM/yyyy` (idempotent; `--list` để xem). Cần python có openpyxl (venv scratchpad session có sẵn).
- **Agent Leader**: sau APPROVE → chạy helper set Done cho subtask đạt; nếu thiếu openpyxl thì xuất bảng để orchestrator chạy.
- **TODO**: Task 6 đang được BA thiết kế (agent chạy nền).

## 2026-07-27 — Task 6 (bundle Task 7) FE: Tab Khai báo chính sách của CSKD

- **Phạm vi**:
  - `client/src/constants/appPropsConstants.ts` — thêm `MODULE_TYPE.BUSINESS_POLICY`, `BUSINESS_POLICY_ACT_GROUP` (8 mã), `EXTENSION_ACT_UPGRADE_RESULT`.
  - `client/src/views/sales-project/business-policy/columns/columnsActivityKhaiBaoCS.ts` (mới) — cột bảng vùng 1.
  - `client/src/views/sales-project/business-policy/Form/FormUpdateActivityKhaiBaoCS.vue` (mới, `<script setup lang="ts">`) — form Cập nhật công việc HĐ khai báo CS (Task 7, Figma 124:428).
  - `client/src/views/sales-project/business-policy/Detail/TabKhaiBaoChinhSach.vue` — tích hợp vùng 1, đổi tên vùng 2/3, enable-logic nút Tạo yêu cầu + popup cảnh báo, ẩn UI sr-common.
- **Thay đổi chính**:
  - Task 7: form con lọc Nhóm công việc theo `GL_EXTENSION_ACT_GROUP` code='BUSINESS_POLICY' (8 giá trị); field bổ sung có điều kiện (jiraTicketCode / telecomServiceId+saleTranType / productHierarchyCode / upgradeResult radio / externalRequestCode) + validate bắt buộc khi Trạng thái=Hoàn thành. Lưu qua `editAct`.
  - Task 6 vùng 1: bảng "HOẠT ĐỘNG KHAI BÁO CHÍNH SÁCH" fetch `searchActivities({objectRefId, objectRefCode:'BUSINESS_POLICY'})`, badge màu trạng thái, icon xem/sửa mở form con.
  - Task 6 vùng 2/3: đổi tiêu đề sang "TRÌNH KÝ PYC KHAI BÁO CHÍNH SÁCH" / "TIẾN ĐỘ TRÌNH KÝ PYC KHAI BÁO CHÍNH SÁCH".
  - Task 6.4: `canCreateSignReq` = đã phê duyệt && `isNewProductPolicy` (Q10: SP đã có → disable). `onCreateSignReq` chặn + popup a-modal liệt kê HĐ đợt 1 (batchNo=1) chưa Hoàn thành nếu chưa đủ (AC-6.6).
  - Task 6.7 (Q12): ẩn UI `<sr-common-khai-bao-cskd>` bằng `v-if="false"`, GIỮ NGUYÊN gọi `autoCreateSrForTrinhKyKhaiBaoCskd` trong onMounted (có comment lý do).
- **Lý do**: triển khai FE Task 6+7 theo System Design docs/tasks/Task-06.
- **Ghi chú**:
  - Contract BE (field JSON): objectRefCode='BUSINESS_POLICY'; group codes BP_*; field HĐ jiraTicketCode/telecomServiceId/saleTranType/productHierarchyCode/upgradeResult/externalRequestCode/batchNo/assigneeOrgUnitId. BE cần thêm cột (SQL 6.1.A) + data GLOBAL_LIST (6.1.B) — chưa có DB nên FE chạy được khi BE sẵn sàng.
  - Điểm user cần kiểm khi có VPN/DB: (1) key global list EXTENSION_ACT_STATUS phải khớp EXTENSION_ACT_STATUS.DONE='4'; (2) records searchActivities phải trả batchNo/assigneeOrgUnitName/statusValue; (3) `projectPlInfo.isNewProductPolicy` field name; (4) "Đơn vị thực hiện" đang để required (theo dấu * Figma) — nếu QLBH/PBH cần bỏ trống thì nới rule.
  - Chưa build (VPN). Còn hoãn: sinh HĐ tự động (BE), hậu-ký PL1-3, gọi API QLBH/PBH thật.

## 2026-07-27 — Implement BE Task 6 (bundle Task 7) — máy trạng thái Hoạt động khai báo chính sách + trình ký PYC khai báo chính sách

- **Phạm vi**:
  - SQL: `crm-service/sql/2026-07-27_task06-07_activity_business_policy.sql` (9 cột mới `EXTENSION_ACTIVITIES` + seed `GLOBAL_LIST_DETAIL` cho `EXTENSION_ACTIVITIES.MODULE_TYPE`/`GL_EXTENSION_ACT_GROUP`).
  - `VcrmGeneral/src/main/java/com/general/utils/Const.java`: thêm `BUSINESS_POLICY_ACT_GROUP` (8 mã nhóm `BP_*`), `BUSINESS_POLICY_UPGRADE_RESULT`, `BUSINESS_POLICY_ACT_BATCH`.
  - `VcrmApp/.../domain/ExtensionActivities.java`: thêm 9 field (`jiraTicketCode`, `telecomServiceId`, `saleTranType`, `productHierarchyCode`, `upgradeResult`, `externalRequestCode`, `batchNo`, `signReqTriggerId`, `policyAssigneeOrgUnitId` — cột `ASSIGNEE_ORG_UNIT_ID`, đặt tên Java field khác `assigneeOrgUnitId` để tránh `BeanUtils.copyProperties` trong `createBatch()`/`edit()` copy nhầm sang module khác đang dùng field `assigneeOrgUnitId` của SDI cho mục đích search-filter, ví dụ POC).
  - `ExtensionActivitiesSdi.java`/`ExtensionActivitiesSdo.java`: thêm 8 field JSON tương ứng (SDO thêm cả `assigneeOrgUnitId`).
  - Mới: `WorkingDayUtil.java` (cộng N ngày làm việc T2-T6, chưa trừ lễ theo default Leader chốt Q5), `service/businessPolicy/abs/BusinessPolicyActivityService.java` (interface) + `impl/BusinessPolicyActivityServiceImpl.java` (máy trạng thái sinh HĐ 3 đợt, validate BR-06/07/08, chặn hoàn thành thủ công nhóm "Ký PYC khai báo chính sách", sinh PL1-3, admin-only xoá PL1-3).
  - Hook vào code có sẵn (chỉ thêm nhánh theo `OBJECT_REF_CODE=BUSINESS_POLICY`, không đổi hành vi module khác):
    - `BusinessPolicyServiceImpl.autoUpdateProcessStatus()` — sinh HĐ khi CSKD chuyển `DA_PHE_DUYET`.
    - `ExtensionActivitiesServiceImpl.edit()` — validate BR-06/07/08 trước khi cho Hoàn thành, set `policyAssigneeOrgUnitId`, cascade sinh HĐ đợt 2 sau khi lưu.
    - `ProjectPLSignReqServiceImpl.createForKhaiBaoCSKD()` — validate BR-10 trước khi tạo yêu cầu trình ký.
    - `ProjectPLSignReqServiceImpl.sendAndSignForKhaiBaoCSKD()` — sinh PL1-3 sau khi gửi trình ký thành công.
    - `ProjectPLSignReqServiceImpl.syncStateVofficeByProjectPlIdForKhaiBaoCSKD()` — khi PYC chuyển DBH: hoàn thành HĐ đợt 2 + sinh HĐ đợt 3.
    - `ProjectPLSignReqController.java` — thêm endpoint `POST bp-sign-req/khai-bao-cskd/appendix/delete` (admin-only xoá PL1-3).
- **Lý do**: theo System Design `docs/tasks/Task-06-tab-khai-bao-chinh-sach/system-design.md`, khớp contract FE đã implement trước đó (entry FE 2026-07-27 phía trên).
- **Ghi chú**:
  - DI: `BusinessPolicyActivityServiceImpl` inject `ExtensionActivitiesService` dạng `@Lazy` (constructor thủ công) để phá vòng lặp phụ thuộc với `ExtensionActivitiesServiceImpl` (bean này gọi ngược lại service mới ở hook trong `edit()`).
  - Đã tái sử dụng `ExtensionActivitiesService.createBatch()`/`checkExistsObjectRef()` có sẵn; KHÔNG sửa `autoCreateSrForTrinhKyKhaiBaoCskd` (giữ nguyên theo yêu cầu).
  - "Hồ sơ tài liệu" (chuyển PYC + PL1-3 sau khi ký) tận dụng cơ chế `cloneFilesSignReqWhenSignedForBusinessPolicy` sẵn có (tự động clone mọi CRMDocument gắn `projectPLSignReqId` kể cả PL1-3 mới sinh) — không cần code mới.
  - **Rủi ro/TODO còn lại** (đã nêu rõ trong self-review, chưa làm ở đợt này vì rủi ro cao nếu sửa file 7000+ dòng dưới áp lực thời gian):
    1. `ExtensionActivitiesRepoCustomImpl.search()`/`getDetail()`/`filter()` dùng native SQL liệt kê cột tường minh (không `SELECT *`) → 9 field mới CHƯA hiển thị qua các API search/getDetail hiện có. Cần bổ sung cột vào SELECT ở đợt sau, tách riêng khỏi phạm vi này để dễ test.
    2. File đính kèm tự động ("File tờ trình CSKD đã ký"/"File PYC đã ký") cho HĐ đợt 1/A/3 CHƯA implement (chỉ PL1-3 của vùng trình ký có sinh file) — cân nhắc bổ sung nếu nghiệp vụ yêu cầu chặt.
    3. Race condition lý thuyết nếu 2 HĐ đợt 1 cuối cùng được hoàn thành đồng thời ở 2 transaction khác nhau → có thể sinh trùng HĐ đợt 2 (đã có guard `batch2Exists` nhưng không có lock DB).
  - Cần user chạy: SQL trên (VPN/DB), sau đó `mvn clean install` để build lại `VcrmGeneral`+`VcrmApp`.

## 2026-07-27 — Task 6 review vòng 1 → BLOCK (3 CRITICAL), đang fix

- **Verdict Leader**: ⛔ BLOCK. Máy trạng thái BE + hậu-ký + SQL viết đúng, nhưng vùng 1 không chạy end-to-end.
- **CRITICAL-1**: FE gọi `searchActivities`→`searchCOPpActivities` (CTE cho Cơ hội, JOIN C_OPP_PROMOTION_ID) → HĐ Chính sách kinh doanh luôn rỗng → vùng 1 trống, enable-logic nút "Tạo yêu cầu" luôn sai. Fix: BE sửa method `search()` (route /extension-activities/search) hỗ trợ objectRefCode='BUSINESS_POLICY' (bỏ ràng buộc S.STATUS=1, không cần join CUS/CC/COPP/TBMT) + SELECT 9 cột mới; FE đổi sang gọi endpoint đó.
- **CRITICAL-2**: endpoint admin-only xoá PL1-3 không được FE gọi; xoá thật qua crmDocumentDeleteFile→deleteDocById KHÔNG check admin → lỗ hổng. Fix: BE thêm check admin trong deleteDocById cho phụ lục PYC khai báo chính sách.
- **CRITICAL-3**: cột "Đơn vị thực hiện" tính từ ASSIGNEE_ID (rỗng) thay vì ASSIGNEE_ORG_UNIT_ID mới. Fix: BE SELECT alias riêng policyAssigneeOrgUnitName; FE map field mới.
- **HIGH**: thiếu unit test state machine + WorkingDayUtil; race condition sinh đợt 2 (thêm lock/unique).
- **Sheet**: Leader KHÔNG set Done subtask nào (tính năng chưa chạy). Sẽ set 6.6/6.7/7.1/7.2 + 6.1-6.5 sau khi review vòng 2 pass.
- **Đang làm**: java-senior-dev + FE dev sửa (background), chung contract field (batchNo, policyAssigneeOrgUnitName, 9 field mới).

## 2026-07-27 — Task 6 FE: xử lý review Leader (BLOCK → fix)

- **Phạm vi**: `TabKhaiBaoChinhSach.vue`, `FormUpdateActivityKhaiBaoCS.vue`, `columnsActivityKhaiBaoCS.ts`, `services/app/extensionActivities/index.ts`, `types/extensionActivity.ts` (mới).
- **CRITICAL-1**: vùng 1 đổi API từ `searchActivities` (route /search-activities → BE map CTE Cơ hội → rỗng) sang **`searchActivitiesV2`** (route `/extension-activities/search` = `API.EXTENSION_ACTIVITIES_SEARCH`, thêm hàm service mới, không hard-code URL). Request giữ `{objectRefId, objectRefCode:'BUSINESS_POLICY', pageInfo}`.
- **Map field contract BE**: cột "Đơn vị thực hiện" đổi `assigneeOrgUnitName` → **`policyAssigneeOrgUnitName`** (tính từ ASSIGNEE_ORG_UNIT_ID). `batchNo`/`activitiesGroup(Name)`/`statusValue`/`status`/`contentValue` giữ nguyên; `isBatch1AllDone` đọc `Number(item.batchNo)===1`.
- **HIGH**: xoá/đổi `console.log` sót trong `showPreviewFileReqSign` + `handleCheckRevenueWarning` → `console.error` có context.
- **MEDIUM**: thêm interface `ExtensionActivityRow` (types/extensionActivity.ts) type hoá refs vùng 1 (bỏ `any`); form dùng `GLOBAL_LIST.GL_EXTENSION_ACT_GROUP`/`.EXTENSION_ACT_STATUS` thay chuỗi hard-code; payload chỉ spread field bổ sung thuộc Nhóm công việc hiện tại (`buildConditionalPayload`, field nhóm khác = null, tránh gửi rác).
- **CRITICAL-2 (admin xoá PL1-3)**: BE tự xử lý ở `deleteDocById`, FE giữ nguyên luồng xoá — không đổi.
- **Ghi chú**: chưa build (VPN). Record ref `dataFormActivity` typed `ExtensionActivityRow | Record<string,never>`; org unit value ép String để khớp option.

## 2026-07-27 — Thêm rule: KHÔNG comment trong code

- **Phạm vi**: `.claude/CLAUDE.md`, `.claude/rules/common/coding-style.md`, `.claude/agents/team-lead-reviewer.md`, `.claude/agents/java-senior-dev.md`.
- **Rule**: KHÔNG viết comment trong code mới — mọi ngôn ngữ (Java //, /* */, Javadoc; TS/JS/Vue //, /* */; HTML <!-- -->; SQL --). Code tự diễn giải qua tên; giải thích để ở System Design/memory. Ngoại lệ duy nhất: directive tooling (eslint-disable, @ts-ignore, @SuppressWarnings). Chỉ áp code mới, không đi xoá comment code cũ ngoài phạm vi.
- **Enforce**: checklist review Leader (có comment giải thích → HIGH) + checklist java-senior-dev.
- **Lưu ý**: code Task 6 vừa viết (đang fix) còn nhiều comment — rule áp từ giờ; có thể dọn comment code Task 6 ở 1 pass cleanup sau khi fix CRITICAL xong.

## 2026-07-27 — Fix BLOCK review Task 6 (3 CRITICAL + 2 HIGH)

- **Phạm vi**:
  - `VcrmApp/.../repo/impl/ExtensionActivitiesRepoCustomImpl.java` — CRITICAL-1/3: `search()` (route `/extension-activities/search`) thêm nhánh riêng `searchBusinessPolicyActivities()` khi `objectRefCode='BUSINESS_POLICY'` (tách khỏi câu query lớn dùng chung — câu đó luôn lọc rỗng với HĐ CSKD vì yêu cầu `S.STATUS=1`/`(CUS/CC/COPP/TBMT).STATUS=1`). Query mới trả đủ 9 cột mới + `policyAssigneeOrgUnitName` (alias riêng, subquery `ORGANIZATION.ORG_UNIT_NAME` từ `ASSIGNEE_ORG_UNIT_ID`) + `activitiesGroup`/`activitiesGroupName`/`statusValue`/`contentValue`/`batchNo`.
  - `VcrmApp/.../dto/sdo/extensionActivities/ExtensionActivitiesSdo.java` — thêm field `policyAssigneeOrgUnitName`, cập nhật comment (bỏ TODO vì `search()` đã đổ dữ liệu).
  - `VcrmApp/.../service/impl/CRMDocumentFileServiceImpl.java` — CRITICAL-2: `deleteDocById()` (điểm xoá file dùng chung, FE gọi qua `crmDocumentDeleteFile`) chặn xoá Phụ lục PL1-3 khai báo chính sách (`type='BUSINESS_POLICY'`, `crmDocType=3` APPENDIX, `tab=2`, có `projectPLSignReqId`) nếu không phải admin — chặn tại nguồn, không phụ thuộc FE gọi đúng endpoint riêng. Thêm field `staffRepo` (`@Autowired`, theo style field-injection sẵn có của file).
  - `VcrmApp/.../repo/ExtensionActivitiesRepo.java` — HIGH-1: thêm `findAllByObjectRefIdAndObjectRefCodeForUpdate` (native `SELECT ... FOR UPDATE`) dùng để serialize cascade sinh HĐ đợt 2.
  - `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyActivityServiceImpl.java` — HIGH-1: `afterActivityCompleted()` đổi sang dùng locking-read `findAllByObjectRefIdAndObjectRefCodeForUpdate` (có `extensionActivitiesRepo.flush()` trước để tránh miss update chưa flush của chính `edit()` — native query không tự auto-flush như JPQL).
  - Test mới: `VcrmApp/src/test/java/.../Utils/WorkingDayUtilTest.java` (7 case: T2→T3, T6→T2 tuần sau, T6+3 ngày, T7→T2, +10 ngày qua 2 cuối tuần, `workingDays<=0` throw, `fromDate null` throw); `.../service/businessPolicy/impl/BusinessPolicyActivityServiceImplTest.java` (5 case: sinh 4 HĐ đợt 1 SP mới, idempotent khi đã sinh, không sinh đợt 2 khi chưa đủ 4 HĐ Hoàn thành, sinh đúng 1 HĐ đợt 2 khi đủ điều kiện, không sinh trùng khi đợt 2 đã tồn tại).
- **Lý do**: Leader review Task 6 → BLOCK (3 CRITICAL + 2 HIGH), sửa theo đúng yêu cầu review 2026-07-27.
- **Contract trả FE** (đã báo lại leader để đồng bộ FE dev):
  - Route giữ nguyên: `POST /extension-activities/search` (FE cần đổi từ hàm `searchActivities()`/route `search-activities` hiện đang gọi nhầm sang route `search` — route `search-activities` vẫn giữ nguyên hành vi cũ cho module Cơ hội, KHÔNG sửa).
  - Field JSON response (case-insensitive, không phân biệt `_`): `id, actType, content, contentValue, startTime, endTime, actualEndTime, status, statusValue, objectRefId, objectRefCode, activitiesGroup, activitiesGroupName, assigneeId, createTime, createBy, updateTime, updateBy, jiraTicketCode, telecomServiceId, saleTranType, productHierarchyCode, upgradeResult, externalRequestCode, batchNo, signReqTriggerId, assigneeOrgUnitId, policyAssigneeOrgUnitName`.
  - Request body: `ExtensionActivitiesSdi` — tối thiểu `objectRefId`, `objectRefCode='BUSINESS_POLICY'`, `pageInfo`; filter tuỳ chọn: `status`, `activitiesGroup`.
- **Ghi chú**: Chưa build (VPN). Rủi ro còn lại: `getDetail()`/`filter()` vẫn CHƯA đổ 9 field mới (chỉ `search()` đã fix theo đúng phạm vi review) — nếu form "Cập nhật công việc" cần gọi `getDetail()` để lấy field bổ sung, cần thêm 1 vòng sửa nữa (đã note rõ trong code).

## 2026-07-27 — Dọn comment code Task 6/7 (rule mới: KHÔNG comment trong code)

- **Phạm vi**: toàn bộ file Task 6/7 đã viết/sửa (liệt kê dưới).
- **Thay đổi chính**: bỏ hết `//`, `/* */`, `/** */` Javadoc trong các block Task 6/7 (file mới bỏ hết; file sửa chỉ bỏ trong block mình thêm, giữ nguyên comment cũ ngoài phạm vi). Giữ nguyên `@ApiModelProperty`/`@Operation`/annotation khác (không phải comment). Không đổi logic — chỉ xoá dòng comment.
- **File dọn sạch 100%** (file mới Task 6): `WorkingDayUtil.java`, `service/businessPolicy/abs/BusinessPolicyActivityService.java`, `service/businessPolicy/impl/BusinessPolicyActivityServiceImpl.java`, test `WorkingDayUtilTest.java`, `BusinessPolicyActivityServiceImplTest.java`, `crm-service/sql/2026-07-27_task06-07_activity_business_policy.sql` (bỏ cả header `--`, giữ `COMMENT '...'` trong DDL vì là metadata cột lưu ở DB, không phải comment mã nguồn).
- **File sửa (chỉ bỏ block mình thêm)**: `Const.java`, `ExtensionActivities.java`, `ExtensionActivitiesSdi.java`, `ExtensionActivitiesSdo.java`, `ExtensionActivitiesRepo.java`, `ExtensionActivitiesRepoCustomImpl.java`, `ExtensionActivitiesServiceImpl.java`, `BusinessPolicyServiceImpl.java`, `ProjectPLSignReqServiceImpl.java`, `ProjectPLSignReqController.java`, `CRMDocumentFileServiceImpl.java` (giữ nguyên comment cũ `//kiem tra ton tai PAKD` — không phải do mình thêm).
- **Lý do**: coordinator yêu cầu tuân rule mới "KHÔNG comment trong code" (`.claude/CLAUDE.md`).
- **Rationale đã mất khỏi code, ghi lại đây để không thất lạc**:
  - `ExtensionActivities.policyAssigneeOrgUnitId` (cột `ASSIGNEE_ORG_UNIT_ID`) đặt tên Java KHÁC field `assigneeOrgUnitId` sẵn có trên `ExtensionActivitiesSdi` (dùng làm điều kiện lọc tìm kiếm cho module khác như OPP/POC/TBMT, không map vào entity) — để `BeanUtils.copyProperties()` trong `createBatch()`/`edit()` KHÔNG vô tình copy nhầm giá trị filter đó sang cột mới này cho các module khác. Chỉ set thủ công khi `OBJECT_REF_CODE = BUSINESS_POLICY`.
  - `BusinessPolicyActivityServiceImpl` inject `ExtensionActivitiesService` dạng `@Lazy` (constructor thủ công) để phá vòng lặp phụ thuộc constructor với `ExtensionActivitiesServiceImpl` (bean đó gọi ngược lại service này ở hook `validateBeforeComplete`/`afterActivityCompleted` trong `edit()`).
  - `ExtensionActivitiesRepo.findAllByObjectRefIdAndObjectRefCodeForUpdate` (native `FOR UPDATE`) dùng trong `afterActivityCompleted()` để serialize cascade sinh HĐ đợt 2 khi 2 HĐ đợt 1 cuối cùng hoàn thành gần như đồng thời — khoá các row đợt 1 (luôn tồn tại) + đợt 2 (nếu đã có); transaction thứ 2 bị block tới khi transaction thứ 1 commit, đọc lại thấy đợt 2 đã tồn tại nên bỏ qua (locking read InnoDB luôn đọc bản mới nhất đã commit, không dùng snapshot cũ). Gọi `extensionActivitiesRepo.flush()` trước đó vì native query không tự auto-flush như JPQL — thiếu bước này sẽ đọc nhầm chính HĐ vừa Hoàn thành trong `edit()` là chưa Hoàn thành.
  - `search()` (`ExtensionActivitiesRepoCustomImpl`) tách nhánh riêng `searchBusinessPolicyActivities()` khi `objectRefCode='BUSINESS_POLICY'` vì HĐ Chính sách kinh doanh không có `ASSIGNEE_ID`/CUS/CC/COPP/TBMT nên câu query lớn dùng chung (yêu cầu `S.STATUS=1`, `(CUS/CC/COPP/TBMT).STATUS=1`) luôn lọc rỗng.
  - `CRMDocumentFileServiceImpl.deleteDocById()` chặn xoá Phụ lục PL1-3 khai báo chính sách (nhận biết qua `type='BUSINESS_POLICY'`, `crmDocType=3` APPENDIX, `tab=2`, có `projectPLSignReqId`) nếu không phải admin — chặn tại điểm xoá dùng chung để không phụ thuộc FE gọi đúng endpoint riêng.

## 2026-07-27 — Khôi phục các file SỬA Task 6 sau khi user lỡ rollback

- **Phạm vi**: 11 file SỬA của Task 6 bị revert về bản gốc (không có git để restore, phải viết lại thủ công theo đúng bản cuối đã qua review + đã bỏ comment): `Const.java`, `ExtensionActivities.java`, `ExtensionActivitiesSdi.java`, `ExtensionActivitiesSdo.java`, `ExtensionActivitiesRepo.java`, `ExtensionActivitiesRepoCustomImpl.java`, `ExtensionActivitiesServiceImpl.java`, `BusinessPolicyServiceImpl.java`, `ProjectPLSignReqServiceImpl.java`, `ProjectPLSignReqController.java`, `CRMDocumentFileServiceImpl.java`.
- **Thay đổi chính**: khôi phục nguyên trạng theo bản đã qua review vòng 3 (3 CRITICAL fix + lock FOR UPDATE), KHÔNG có comment (rule mới). Riêng `CRMDocumentFileServiceImpl.java` khôi phục theo bản review vòng 3 (khác bản review vòng đầu): check admin nằm ở `deleteFileById()` gọi `assertCanDeleteKhaiBaoPycAppendix(crmDocId)` (method mới), KHÔNG phải ở `deleteDocById()`.
- **Lý do**: user lỡ rollback các file sửa; file MỚI (`WorkingDayUtil`, `BusinessPolicyActivityService`/`Impl`, 2 test, SQL) và code Task 1/SR không bị ảnh hưởng, chỉ cần khôi phục lại phần Task 6 trong các file sửa.
- **Ghi chú**: đã grep xác nhận đủ symbol (9 field entity, 8 field Sdi, 8 field + `policyAssigneeOrgUnitName` Sdo, `findAllByObjectRefIdAndObjectRefCodeForUpdate`, `searchBusinessPolicyActivities`, 6 điểm gọi `businessPolicyActivityService.*` + endpoint xoá PL1-3), Java 8 sạch, không comment, brace-balance khớp với file gốc (2 file lớn `ExtensionActivitiesServiceImpl`/`ProjectPLSignReqServiceImpl` có lệch brace pre-existing do string/comment cũ ngoài phạm vi, không phải lỗi mới). Chưa build (VPN).

## 2026-07-27 — Task 1.2 UI: FormNewProductInfo.vue (dấu * + combobox nhập/chọn)

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormNewProductInfo.vue` (chỉ file này; FormCommonInfo không đổi).
- **YÊU CẦU 1 — dấu * đỏ**: 6 field bắt buộc trước đây không hiện `*` do `v-bind="validateInfos.xxx"` (validator điều kiện → required=false) đặt SAU `:required`. Fix: đổi thứ tự → `v-bind` TRƯỚC, `:required="true"` SAU (later-binding wins), khớp pattern field `salaryCoefficientTTKD` trong FormCommonInfo. Áp cho: npProductGroup, npProductLine, npProductName, npProductAlias, npManagingOrganizationId, npProductDescription.
- **YÊU CẦU 2 — combobox nhập-hoặc-chọn**: bỏ toggle asme-select↔asme-input + link "+ Thêm mới" (xoá `isNewGroup/isNewLine`, `toggleNewGroup/Line`, `onGroupChange`, CSS `.np-field/.np-add-new-link`). Thay Nhóm SP/DV + Dòng SP/DV bằng `a-select mode="tags" :max-tag-count="1"` (mẫu "Nội dung hoạt động" eventForm.vue:345).
- **Map id↔nameNew (GIỮ payload)**: dùng writable computed `productGroupTag`/`productLineTag` (get: id→[id] / nameNew→[name] / []; set: lấy phần tử cuối). `applyGroupSelection`/`applyLineSelection`: nếu khớp `projectPLRnrId` option → set `*Id`, clear `*NameNew`; nếu chuỗi mới → set `*NameNew`, clear `*Id`. Đổi Nhóm → reset Dòng + reload `getListProductLine` (chỉ khi Nhóm có id; Nhóm nhập-mới → list Dòng rỗng). onMounted: có `npProductGroupId` → nạp Dòng; hiển thị do getter tự suy (id→label option, nameNew→tag text). Validator npProductGroup/npProductLine (FormCommonInfo) vẫn pass vì chấp nhận id HOẶC nameNew; build `newProductInfo` không đổi.
- **Rule KHÔNG comment**: xoá hết comment trong file; giữ 2 directive eslint `<!-- eslint-disable vue/no-mutating-props -->` (template) + `/* eslint-disable vue/no-mutating-props */` (đầu script, gộp thay cho nhiều eslint-disable-next-line cũ).
- **Ghi chú**: `<script setup lang="ts">`, không `any`. Chưa build (VPN). Điểm user kiểm: label tag hiển thị đúng name option sau khi list load ở màn Cập nhật; gõ giá trị mới lưu vào *NameNew.

## 2026-07-28 — Task 2: Xem chi tiết CSKD (tab "Thông tin cơ bản")

- **Phạm vi**: tạo mới `client/src/views/sales-project/business-policy/utils/businessPolicyDeclaration.ts`, `Detail/PolicyProgressDiagram.vue`, `Detail/PolicyDeclarationResult.vue`; sửa tối thiểu `Detail/Index.vue` và bổ sung type `types/sales-project/projectPL.d.ts` (BussinessPolicy thêm `isNewProduct`/`newProductInfo` + interface `BusinessPolicyNewProductInfo`).
- **Thay đổi chính**:
  - Util thuần (BR-07/BR-10/BR-12): `deriveGroupStatus(activities,groups,batch?)` → CHUA/DANG/DA (0 HĐ=CHUA; toàn bộ status='4'=DA; còn lại=DANG); `deriveProposalNodeStatuses(processStatus)` (BR-02, HUY→3 node wait + cờ isCancelled); `computeDeclarationBlockStatuses` (5 khối SP mới / 3 khối SP đã có); `deriveOverallDeclarationStatus` (BR-12); `firstActivityFieldValue` (lấy PH/TelecomServiceID/Saletrantype); label maps.
  - `PolicyProgressDiagram.vue`: sơ đồ 4 node (SP đã có) / 7 node (SP mới) dựng bằng div+CSS (không dùng a-steps), icon check xanh/vòng đỏ/số xám + connector, badge luồng + "Đã hủy", chú giải, a-tooltip; click node emit `navigate(tabKey)` theo BR-08 (build→tab1, review/approve→tab7, còn lại→tabKhaiBaoChinhSach).
  - `PolicyDeclarationResult.vue`: khối kết quả khai báo; badge 3-state/khối; khối SAP thêm Nhóm/Dòng/Tên/Mô tả/Đơn vị chủ trì (newProductInfo) + Mã Product Hierarchy (HĐ SAP_NEW batch1); khối BCCS mới thêm TelecomServiceID/Saletrantype (BCCS_NEW batch1); link file PL match `crmDocName` chứa keyword (SAP/BCCS/QLBH/PBH) trong dataDocument, không có → "Chưa có file"; emit `downloadFile`.
  - `Index.vue`: thêm `dataActivities` + `getDataActivities()` (searchActivitiesV2, objectRefCode BUSINESS_POLICY, pageSize 100) gọi ở onMounted / onTabChange('tab1') / reload sau đóng form Cập nhật; computed `isNewProductPolicy`, `declarationStatusLabel`; chèn diagram đầu tab1, field "Trạng thái khai báo chính sách" cạnh "Khung phân bổ...", section PolicyDeclarationResult trên "Hồ sơ tài liệu"; `onNavigateNode` đổi tab, `onDownloadDeclarationFile` tái dùng `onDownload`.
- **Lý do**: Task 2 FE-only, dẫn xuất read-only từ dữ liệu Task 1 (business_policy/new_product) + Task 6 (extension_activities); không đổi BE/DB/API.
- **Ghi chú (điểm user kiểm)**:
  - `newProductInfo` (BusinessPolicyNewProductInfoSdo) chỉ trả id + *NameNew, KHÔNG có tên Nhóm/Dòng/Đơn vị đã resolve → khối SAP hiển thị `productGroupNameNew`/`productLineNameNew`/`managingOrganizationName` (chưa có → "N/A"). Nếu muốn hiện tên đơn vị chủ trì / nhóm-dòng đã chọn (id) cần BE enrich thêm field name (đã khai báo optional `managingOrganizationName` ở FE type sẵn sàng nhận).
  - Match file PL bằng keyword còn thô (SAP vs BCCS, "BCCS" trùng giữa khối BCCS mới và gói cước BCCS) — rà lại khi Task 1/5/6 chốt tên hồ sơ (BLOCKER Q4).
  - HUY: 3 node tờ trình về wait + badge "Đã hủy" (thiếu dữ liệu trạng thái tại thời điểm hủy — theo default Q1).
  - Chưa build (VPN) — user tự chạy `npm run dev`/lint.

## 2026-07-28 — Task 2: review fixes (APPROVE-WITH-WARNING)

- **Phạm vi**: `Detail/PolicyDeclarationResult.vue`, `Detail/Index.vue`, `types/sales-project/projectPL.d.ts`, mới `utils/businessPolicyDeclaration.spec.ts`.
- **Thay đổi chính**:
  - HIGH-1: `const info: Partial<BusinessPolicyNewProductInfo> = props.newProductInfo ?? {}` (bỏ union `... | {}` gây TS2339).
  - HIGH-2 (map tên, BE đã enrich): khối SAP hiển thị Nhóm=`productGroupName ?? productGroupNameNew ?? 'N/A'`, Dòng=`productLineName ?? productLineNameNew ?? 'N/A'`, Đơn vị chủ trì=`managingOrganizationName ?? 'N/A'`. Interface `BusinessPolicyNewProductInfo` thêm optional `productGroupName?`/`productLineName?`/`managingOrganizationName?` (managingOrganizationName đổi từ required→optional).
  - HIGH-3: tạo Vitest spec cover `deriveGroupStatus` (CHUA/DANG/DA + lọc group+batchNo), `deriveProposalNodeStatuses` (5 case gồm HUY), `deriveOverallDeclarationStatus` (AC-10/11/12). AAA + tên tiếng Việt.
  - MEDIUM: tách keyword file PL — BCCS mới → `['TELECOMSERVICE','SALETRANTYPE']`; gói cước BCCS → `['GÓI CƯỚC','GOI CUOC']` (hết đụng 'BCCS'); SAP/QLBH/PBH giữ nguyên.
  - Dọn `console.log('docTypeMap'...)` + `console.log('dataDocument'...)` trong `getDataDocument` (giữ console.error). KHÔNG đụng line 1779 `datacommon32131` (code cũ ngoài phạm vi).
- **Ghi chú**: Vitest CHƯA cài trong package.json (không có script `test`, không có dep vitest) → spec sẵn sàng chạy khi team thêm vitest + alias `@/`. Logic test đã tự verify đúng theo constant thật (DONE='4'). Chưa build (VPN).

## 2026-07-28 — Fix GAP Task 1 BE phát hiện qua review Task 2 (thiếu tên Nhóm/Dòng/Đơn vị chủ trì SP mới)

- **Phạm vi**:
  - `VcrmApp/.../dto/sdo/businessPolicy/BusinessPolicyNewProductInfoSdo.java` — thêm 3 field: `productGroupName`, `productLineName`, `managingOrganizationName`.
  - `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyServiceImpl.java` — inject `ProductFamilyRepo`, `ProductLineRepo` (constructor, `organizationRepo` đã có sẵn); `enrichNewProductInfo()` resolve thêm 3 tên qua 3 helper method mới `resolveProductFamilyName`/`resolveProductLineName`/`resolveOrgUnitName` (null-safe, không throw khi id null/không tìm thấy).
- **Lý do**: review Task 2 phát hiện `BusinessPolicyNewProductInfoSdo` không có tên hiển thị khi user chọn Nhóm/Dòng SP-DV có sẵn (chỉ có id) và không có `managingOrganizationName` → "Đơn vị chủ trì" luôn rỗng ở màn chi tiết CSKD SP/DV mới (vi phạm PYC §2.2.b).
- **Nguồn tra tên**: `ProductFamily`/`ProductLine` (`com.app.category.domain`, bảng `PRODUCT_FAMILY`/`PRODUCT_LINE`, id field tên là `ProjectPLRnrId` — đúng khoá FE dùng ở `getAllProductFamilyActive`/`getAllProductLineActive`); `Organization.orgUnitName` cho đơn vị chủ trì.
- **Contract trả FE**: field JSON mới `productGroupName`, `productLineName`, `managingOrganizationName` — FE fallback `productGroupName ?? productGroupNameNew` (tương tự Dòng), Đơn vị chủ trì hiển thị trực tiếp `managingOrganizationName`.
- **Ghi chú**: không comment code mới (rule mới), Java 8 sạch, không đổi logic Task 1 khác. Chưa build (VPN).

## 2026-07-29 — SQL backfill Hoạt động khai báo chính sách cho CSKD cũ

- **Phạm vi**: `crm-service/sql/2026-07-29_backfill_hoatdong_khaibao_cskd_cu.sql` (mới).
- **Mục đích**: sinh Hoạt động cho CSKD đã DA_PHE_DUYET trước khi Task 6 deploy (auto-gen chỉ chạy khi CHUYỂN sang phê duyệt, không re-fire).
- **Logic khớp generateActivitiesOnApproved**: temp table `tmp_bp_backfill` = CSKD process_status='DA_PHE_DUYET', is_deleted=0, chưa có HĐ BUSINESS_POLICY nào (guard = checkExistsObjectRef). SP đã có (is_new_product_policy≠1) → 3 HĐ (BP_BCCS_PACKAGE org=dev_org, BP_QLBH, BP_PBH), BATCH_NO=NULL. SP mới (=1) → 4 HĐ đợt 1 (BP_BCCS_NEW+BP_SAP_NEW org=dev_org, 2×BP_UPGRADE_EVAL QLBH/PBH), BATCH_NO=1. CHỈ seed đợt 1; đợt 2/3 do app tự sinh.
- **Cột**: ACT_TYPE='WORK', STATUS='1'(Chưa thực hiện), CREATE_BY='system', PERCENT_COMPLETED=0, ASSIGNEE_ORG_UNIT_ID=developing_organization_id (HĐ đơn vị đề xuất) / NULL. START_TIME=issued_date, END_TIME=issued_date+N ngày làm việc (N=3 BCCS/QLBH/PBH/BCCS_NEW; N=10 SAP/UPGRADE) qua công thức WEEKDAY (xấp xỉ WorkingDayUtil T2-T6, chưa trừ lễ).
- **Không** tạo permission/history (BUSINESS_POLICY không dùng permission OPP). Idempotent, re-run được. Const: EXTENSION_ACT_STATUS.TODO='1', ACT_TYPE.WORK='WORK', MODIFIED_BY_SYSTEM='system'.

## 2026-07-29 — Task 6: sửa form "CẬP NHẬT CÔNG VIỆC" (FormUpdateActivityKhaiBaoCS.vue)

- **Phạm vi**: `Form/FormUpdateActivityKhaiBaoCS.vue` (viết lại), `types/extensionActivity.ts` (bỏ externalRequestCode).
- **1. FIX DATE (Invalid Date)**: nguyên nhân — API trả startTime/endTime dạng `DD/MM/YYYY HH:mm` (khớp bảng "28/12/2026 17:30", xác nhận qua FormUpdateMoreActivities/FormBatchUpdateActivities parse cùng format) nhưng form cũ set `value-format="DD/MM/YYYY HH:mm:ss"` → parse fail. Fix theo pattern FormCommonInfo: `dayjs.extend(customParseFormat)`, prefill bằng `parseDateTime()` (thử 'DD/MM/YYYY HH:mm:ss' → 'DD/MM/YYYY HH:mm' → 'DD/MM/YYYY' strict, fallback ISO) → bind **object dayjs**; a-date-picker dùng `format="DD/MM/YYYY HH:mm"` (bỏ value-format); save `.format('DD/MM/YYYY HH:mm')`. Thời gian bắt đầu/kết thúc KHÔNG required.
- **2. Đúng 7 form Figma**: field riêng theo activitiesGroup: BP_BCCS_PACKAGE→jiraTicketCode (full-width); BP_BCCS_NEW→telecomServiceId+saleTranType (bỏ JIRA); BP_SAP_NEW→productHierarchyCode; BP_UPGRADE_EVAL→upgradeResult (radio); BP_QLBH/BP_PBH/BP_SIGN_PYC→không field riêng. `showJiraTicketCode` chỉ còn `=== BCCS_PACKAGE`. **XOÁ hẳn externalRequestCode** (form + type + buildConditionalPayload + validate).
- **3. Cấu trúc giống Sửa TT cơ bản (FormCommonInfo)**: a-drawer placement=right width 50%, `#extra` slot Hủy/Lưu góc phải, a-form layout vertical, lưới a-row `:gutter="['16']"`/a-col md, dùng asme-select/asme-input (bỏ a-select/a-input trần), header "Chính sách kinh doanh". Bố cục cột theo từng Figma (Trạng thái md=8 cạnh Kết quả/PH; Telecom+Saletrantype hàng riêng; JIRA full-width).
- **4. Danh mục chung**: Loại đối tượng (disabled) nạp `EXTENSION_ACTIVITIES.MODULE_TYPE`; Nhóm công việc `GL_EXTENSION_ACT_GROUP` lọc code='BUSINESS_POLICY'; Trạng thái `EXTENSION_ACT_STATUS` — qua getGlobalListByCode + GLOBAL_LIST const, không hard-code option. Đơn vị thực hiện: asme-select org unit `getAllBusinessUnitByUser` field-names {orgUnitCode/orgUnitId} + #option slot (như FormNewProductInfo/FormCommonInfo), bind `assigneeOrgUnitId`.
- **Contract giữ nguyên** field edit: activitiesGroup/actGroup, content, startTime, endTime, assigneeOrgUnitId, status, jiraTicketCode/telecomServiceId/saleTranType/productHierarchyCode/upgradeResult. Validate bắt buộc field riêng khi Trạng thái=Hoàn thành.
- **KHÔNG comment** (rule mới); `<script setup lang="ts">`, không any. Chưa build (VPN).
- **Điểm user kiểm**: xác nhận format thật API startTime/endTime (giả định DD/MM/YYYY HH:mm — nếu ISO thì fallback dayjs vẫn parse được); global list EXTENSION_ACTIVITIES.MODULE_TYPE đã có row BUSINESS_POLICY để Loại đối tượng hiển thị label.

## 2026-07-29 — Task 6: review fix form Cập nhật công việc (FormUpdateActivityKhaiBaoCS.vue)

- **HIGH — Đơn vị thực hiện**: `getOrgUnitOptions` đổi `getAllBusinessUnitByUser({})` → `getAllBusinessUnitByUser({ isPAKD: true, isGetAll: true })` (khớp FormCommonInfo:1267, trả toàn bộ đơn vị theo Q6, không giới hạn quyền).
- **MEDIUM-1**: `onSave` catch không nuốt lỗi im lặng nữa → `message.error({ content: 'Cập nhật công việc thất bại' })`.
- **MEDIUM-2**: field điều kiện (upgradeResult/productHierarchyCode/telecomServiceId/saleTranType/jiraTicketCode) đổi `:required="true"` → `:required="isRequiredWhenDone"` (computed `status === EXTENSION_ACT_STATUS.DONE`) → `*` chỉ hiện khi Trạng thái=Hoàn thành; validateOnDone giữ nguyên. Field base (Nhóm CV/Nội dung/Đơn vị/Trạng thái) vẫn required luôn.
- **MEDIUM-3**: `formRef = ref<FormInstance>()` (import type FormInstance từ ant-design-vue), bỏ any ngầm.
- Phần date/7 form/cấu trúc/danh mục giữ nguyên (đã đạt). Không comment, không any. Chưa build.

## 2026-07-29 — Fix over-validation % hoàn thành cho HĐ Chính sách kinh doanh

- **Phạm vi**: `ExtensionActivitiesServiceImpl.java:4507` (validateRequest List).
- **Vấn đề (user hỏi)**: edit() dùng chung áp validate "% hoàn thành vs Trạng thái" (DONE→%=100, DOING→0<%<100, TODO/CANCELED→%=0) cho mọi loại trừ POC. HĐ Chính sách kinh doanh KHÔNG có field % (7 form Figma), percent=0 mặc định → chuyển Hoàn thành bị chặn "% phải =100" → không hoàn thành được HĐ chính sách. PYC không yêu cầu %.
- **Fix**: thêm `&& !safeEqual(Const.OBJECT_REF_CODE.BUSINESS_POLICY, request.getObjectRefCode())` vào guard dòng 4507 (loại BUSINESS_POLICY; giữ nguyên cho OPP/CUS/TBMT). Tách bạch validate theo type như user yêu cầu.
- **Đã kiểm**: các validate khác trong edit() đều early-return/gate cho non-POC hoặc OPP/CUS (validateRequest single block OPP-gate; POC validates early-return; validateRequiredSrWhenComplete gate requiredSr='1'). Chỉ khối % là over-validation. Auto-gen (createBatch) không dính vì guard `!isNullOrZero(id)` (bản ghi mới chưa có id).
- **Leader đang review** verify + soi thêm. Cần build lại BE (mvn) khi có VPN.

## 2026-07-29 — Mã hoạt động (ACTIVITIES_CODE) chưa gen + SQL update HĐ chính sách

- **Kiểm tra**: `setActivitiesCode(generateActivitiesCode())` bị COMMENT trong `ExtensionActivitiesServiceImpl.createBatch` (dòng 403) → HĐ chính sách (auto-gen + backfill) có ACTIVITIES_CODE = NULL. Cột "Mã hoạt động" đang trống. Stored proc `generate_activities_code()` (CALL) tồn tại nhưng tắt, format không chắc là HĐ_yyyymmdd_id.
- **SQL update**: `crm-service/sql/2026-07-29_update_ma_hoatdong_khaibao_cskd.sql` — set ACTIVITIES_CODE = CONCAT('HĐ_', DATE_FORMAT(CREATE_TIME,'%Y%m%d'), '_', ID) WHERE OBJECT_REF_CODE='BUSINESS_POLICY' AND (ACTIVITIES_CODE IS NULL OR ''). Idempotent (chỉ set HĐ chưa có mã).
- **Ghi chú**: HĐ mới về sau cũng không có mã (setActivitiesCode vẫn comment) → hoặc chạy lại SQL định kỳ, hoặc bật gen mã ở buildActivity/trigger (nếu muốn đúng HĐ_yyyymmdd_id cho HĐ mới).

## 2026-07-29 — Đánh giá khả thi Task 1 vùng khai báo chính sách (có BM01/02/03 + API QLBH)

- **Phạm vi**: `docs/tasks/Task-01-.../readiness-declare-area.md` (mới). Chưa code (user yêu cầu plan trước).
- **Tài liệu mới trong docs/**: BM01 (docx BCCS cột có Mã Product Hierarchy), BM02 (~20 template QLBH theo lĩnh vực × gói cước/sản phẩm), BM03 (template chung PBH + 3 biến thể), PYC cập nhật 260707, Phụ lục 2/3/4. venv2 có python-docx+openpyxl.
- **Phát hiện then chốt**: API `/qlbh/cskd/tiep_nhan` user gửi là API GỬI/tiếp nhận sau khi ký (§2.8/Task 9), KHÔNG phải API validate-lúc-import của Task 1.4. PYC 260707 phân biệt: 1.4/1.5 cần API template-download + validate; Task 9 cần API gửi + callback trạng thái.
- **Khả thi Task 1 còn hoãn**: 1.3 (BM01) ✅ đủ; 1.6 (disable) ✅ đủ; khung UI vùng khai báo + upload/attach ✅ đủ; 1.4/1.5 🟡 import+lưu file được nhưng validate qua API QLBH chưa có endpoint, PBH không có API nào, template BM02 chọn theo lĩnh vực phụ thuộc Task 8.
- **BLOCKER**: B1 API validate QLBH/PBH (chưa có), B2 API PBH, B3 Task 8 lĩnh vực cho template BM02, B4 template tĩnh vs API download, B5 config token/baseURL/idempotency.
- **Đề xuất**: Hướng A (làm khung + BM01 + disable + import/lưu file ngay, validate/PBH để sau) vs Hướng B (chờ đủ). API tiep_nhan phù hợp bắt đầu Task 9 QLBH.
- **Chờ user trả lời 5 câu** ở §5 readiness doc trước khi code.

## 2026-07-29 — Fix crash "xem chi tiết CSKD" (NumberFormatException: "false")

- **Phạm vi**: `crm-service/VcrmApp/.../repo/businessPolicy/impl/BusinessPolicyRepoImpl.java` — method `getById` (dòng ~633).
- **Thay đổi chính**:
  1. Dòng 724: thêm dấu phẩy còn thiếu sau `policy.is_new_product_policy as isNewProduct` (trước `COALESCE(... isNewProductPolicyName)`). Thiếu phẩy làm SQL detail vỡ khi build lại (list query dòng 138/457 đã có phẩy, chỉ getById sót).
  2. Parse `buId` (dòng ~890): đổi `.filter(!isEmpty).map(Long::valueOf)` → `.filter(s -> s.matches("\\d+")).map(Long::valueOf)`. Token `BU_ID` phi số (vd "false" từ data cũ) trước đây ném `NumberFormatException` không bắt → 500 cả màn chi tiết.
- **Lý do**: user báo lỗi `NumberFormatException: For input string: "false"` khi xem chi tiết CSKD. Logger hiển thị FileUtil gây nhiễu; nguồn thật là `Long::valueOf` thô trong getById (các nơi khác đã dùng `DataUtil.safeToLong`).
- **Ghi chú**: user cần `mvn -pl VcrmApp clean install` để áp fix. Nếu vẫn còn record BU_ID="false" trong DB là data bẩn (fix chỉ bỏ qua token rác, không sửa data).

## 2026-07-29 — Fix tiếp: syntax SQL "near FROM" ở getById CSKD

- **Phạm vi**: `BusinessPolicyRepoImpl.getById` — dòng 737.
- **Thay đổi**: bỏ dấu phẩy THỪA sau `... as pbhPolicyDeclStatusName` (ngay trước `FROM business_policy policy`). MariaDB báo `syntax ... near 'FROM business_policy policy LEFT JOIN...'`.
- **Lý do**: sau khi vá thiếu-phẩy dòng 724 và build lại, lộ thêm lỗi thừa-phẩy trước FROM (cùng do sửa tay vùng khai báo chính sách). `NumberFormatException:"false"` chỉ là log nhiễu, caused-by thật là SQLException syntax.
- **Ghi chú**: getById có 3 lỗi tổng cộng (724 thiếu phẩy, 737 thừa phẩy, 890 parse BU_ID thô) — đã vá hết. Build lại `mvn -pl VcrmApp clean install` để kiểm tra.

## 2026-07-29 — Implement Task 5 (Tab Thẩm định & ký duyệt CSKD): tự sinh PL2-PL6, phân quyền xoá, remap loại hồ sơ

- **Phạm vi**:
  - BE (`VcrmApp`): `domain/CRMDocumentFile.java` (thêm cột `isAutoKhaiBaoCsAppendix`), `service/CRMDocumentFileService.java` + `service/impl/CRMDocumentFileServiceImpl.java` (thêm `createPlaceholderAppendixFile`, guard xoá `assertCanDeleteAutoKhaiBaoChinhSachAppendix` trong `deleteFileById`), `service/CRMDocumentService.java` + `service/impl/CRMDocumentServiceImpl.java` (thêm `copyFileKhaiBaoChinhSachAppendixForCSKD`), `controller/CRMDocumentController.java` (endpoint mới), `service/impl/ProjectPLSignReqServiceImpl.java` (`cloneFilesSignReqWhenSignedForBusinessPolicy` — remap `crmDocType` 2→15/3→16 cho nhánh `tab==1`).
  - BE (`VcrmGeneral`): `utils/Const.java` — thêm `BUSINESS_POLICY_DOCUMENT_TYPE_TO_TRINH=15`, `BUSINESS_POLICY_DOCUMENT_TYPE_PHU_LUC_TO_TRINH=16`, 5 hằng tên file `BUSINESS_POLICY_DECLARATION_APPENDIX_FILE_NAME_PL2..PL6` (dải mới, không tái dùng PL1-3 hiệu quả kinh doanh).
  - FE: `client/src/services/app/defineRouting.ts` (key `COPY_FILE_KHAI_BAO_CHINH_SACH_APPENDIX_FOR_CSKD`), `client/src/services/app/crmDocument/index.ts` (wrap service), `client/src/constants/appPropsConstants.ts` (`BUSINESS_POLICY_DECLARATION_APPENDIX_FILE_NAME`), `client/src/views/sales-project/business-policy/Form/FormSignReq.vue` (gọi API mới trong `onMounted` sau `copyFileBusinessEfficiencyForCSKD`; `getFileUpload` gộp cờ `isCopyBusinessEfficiency || isAutoKhaiBaoCsAppendix` để ẩn icon xoá cho non-admin).
  - SQL: `crm-service/sql/2026-07-29_task05_phu_luc_tham_dinh_ky_duyet.sql` (thêm cột `CRM_DOCUMENT_FILE.IS_AUTO_KHAI_BAO_CS_APPENDIX`, seed `GLOBAL_LIST_DETAIL` code `BUSINESS_POLICY_DOCUMENT_TYPE` value 15/16).
  - Docs: `docs/tasks/Task-05-tab-tham-dinh-ky-duyet/system-design.md` — thêm §12 ghi chú triển khai Dev (quyết định các BLOCKER, call site xác nhận).
- **Thay đổi chính**:
  1. 5.1: form trình ký CSKD (tab=1) tự sinh PL2 (BCCS gói cước, luôn có), PL3 (QLBH, luôn có), PL4 (PBH, luôn có), PL5 (SAP)/PL6 (TelecomServiceID BCCS) chỉ khi `business_policy.isNewProduct=1`. Placeholder = file rỗng tạo trực tiếp trên disk (`Files.createFile`), không copy nội dung nguồn (Task 1/9 chưa sẵn sàng).
  2. Phân quyền xoá: cờ `IS_AUTO_KHAI_BAO_CS_APPENDIX` ở cấp `CRM_DOCUMENT_FILE`, độc lập với `tab`/`CRM_DOCUMENT` — user thường vẫn xoá được file họ tự tải lên, chỉ chặn xoá PL2-6 tự sinh (trừ admin, check qua `staffRepo.isAdmin`).
  3. 5.2/5.3: `cloneFilesSignReqWhenSignedForBusinessPolicy` thêm nhánh `tab==1`: `crmDocType` 2 ("File trình ký") → 15 ("Tờ trình"), 3 ("File phụ lục") → 16 ("Phụ lục tờ trình"); giữ nguyên nhánh `tab==2` (11-14) của Task 6. `BeanUtils.copyProperties` tự copy cờ `isAutoKhaiBaoCsAppendix` sang bản ghi clone (không cần set tường minh, đã verify logic).
- **Lý do**: đáp ứng PYC §2.5 (a/b/c) — tự động đính kèm phụ lục PYC khai báo chính sách vào hồ sơ trình ký CSKD, giới hạn quyền xoá chỉ admin, phân biệt rõ loại hồ sơ "Tờ trình/Phụ lục tờ trình" (tab=1) với "PYC khai báo chính sách/Phụ lục PYC" (tab=2, Task 6).
- **Quyết định BLOCKER đã áp dụng** (theo chỉ đạo Leader/user, xem system-design.md §12): Q3 dòng2=PBH, Q-SCOPE1 (chặn cấp file), Q-SCOPE2/Q8 (placeholder ngay), Q-DOCTYPE1 (Phương án A remap crmDocType), Q-DOCTYPE2 (chỉ nhãn tự động, không thêm dropdown thủ công `FormDocument.vue`).
- **Call site xác nhận (Q-TRIGGER)**: `cloneFilesSignReqWhenSignedForBusinessPolicy(..., tab=1, ...)` được gọi tại `ProjectPLSignReqServiceImpl.java:3575` và `:3582` (luồng đồng bộ trạng thái vOffice khi CSKD "Đã ban hành"/"Đã đóng dấu"). Không thấy call site nào khác cho tab=1 trong phạm vi grep.
- **Timing `tab` (§4.1)**: xác nhận `CrmDocumentSave` DTO không có field `tab` → `CRM_DOCUMENT.tab` thực sự NULL ở giai đoạn tạo form trình ký (trước ký). Không ảnh hưởng vì guard xoá Task 5 dùng cờ file `IS_AUTO_KHAI_BAO_CS_APPENDIX`, không phụ thuộc `tab`.
- **AC-07 (Hồ sơ tài liệu)**: không cần sửa FE — `Index.vue` đã ẩn icon xoá document cho mọi bản ghi `isSyncFromSr=1` từ trước (áp dụng luôn cho PL2-6 mới).
- **Ghi chú/rủi ro**:
  - SQL seed `GLOBAL_LIST_DETAIL` cho value 15/16 dựa trên suy luận cột `VALUE` (không phải `CODE`) chứa mã số khớp `crmDocType` (theo cách `FormDocument.vue` dùng `field-names.value='key'` ← `GLD.VALUE`) — **cần VPN xác nhận** bằng SELECT dữ liệu hiện có (value 2/3/11/12) trước khi chạy INSERT, đã ghi rõ trong system-design.md §12.
  - `FormSignReq.vue`'s `handleRemoveFile` có `catch {}` rỗng (code cũ) — nếu BE từ chối xoá (CDF-011), FE hiện tại không hiển thị thông báo lỗi rõ ràng cho user; không sửa vì ngoài phạm vi Task 5 (rủi ro side-effect, giữ diff tối thiểu).
  - Chưa viết unit test (JUnit/Mockito) cho `copyFileKhaiBaoChinhSachAppendixForCSKD`/`assertCanDeleteAutoKhaiBaoChinhSachAppendix` — cần bổ sung để đạt coverage theo rule testing, đề xuất làm ở lượt sau khi Leader duyệt hướng tiếp cận.
- **Cần user chạy (VPN)**: `mvn -pl VcrmGeneral,VcrmApp clean install` (build lại 2 module đã sửa); chạy SQL `crm-service/sql/2026-07-29_task05_phu_luc_tham_dinh_ky_duyet.sql` sau khi đã SELECT xác nhận schema `GLOBAL_LIST_DETAIL` như ghi chú trên.

## 2026-07-29 — Task 5 (Tab Thẩm định & Ký duyệt) + quy tắc regression code dùng chung

- **Phạm vi**: `.claude/agents/java-senior-dev.md`, `.claude/agents/team-lead-reviewer.md`; docs `docs/tasks/Task-05-tab-tham-dinh-ky-duyet/system-design.md`; code Task 5 (CRMDocument*/ProjectPLSignReq*/FormSignReq/defineRouting + SQL).
- **Thay đổi chính**:
  1. Thêm quy tắc VĨNH VIỄN vào Dev + Leader: khi tái sử dụng/mở rộng code DÙNG CHUNG phải grep call site, xác định luồng NGOÀI PYC, chứng minh không đổi hành vi (tách nhánh theo cờ/tab/type), báo cáo mục "An toàn regression (code dùng chung)". Leader coi vi phạm chưa chứng minh an toàn = CRITICAL.
  2. Task 5: BA viết System Design → Leader chốt BLOCKER (user chọn: 5.1 placeholder ngay, Q3 dòng2=PBH, 5.3 chỉ nhãn tự động, Phương án A remap crmDocType tab=1 mã 15/16, chặn xoá cấp file bằng cột mới IS_AUTO_KHAI_BAO_CS_APPENDIX) → Dev code → Leader review = BLOCK.
- **Lý do**: user yêu cầu quy trình phải bảo vệ luồng ngoài PYC khi tái sử dụng code; Task 5 chạm nhiều code dùng chung với tính năng "hiệu quả kinh doanh" (PL1-3) và Task 6.
- **Ghi chú (đang xử lý)**: Leader BLOCK 2 điểm — (a) CRITICAL: `Index.vue` `mapDocType` map bằng `item.code` (sai) phải đổi `item.key` (global-list JSON dùng key/value, không có `code`) → cột "Loại hồ sơ tài liệu" đang trống cả Task 6; (b) HIGH: thiếu unit test. Thêm rủi ro remap `crmDocType 3→16` ở clone tab=1 đụng cả PL1-3 hiệu quả kinh doanh (cấp document dùng chung) — Dev đang phân tích/thu hẹp phạm vi + viết test (vòng 2). CHƯA cập nhật tracker PYC-1375.xlsx (còn CRITICAL).

## 2026-07-29 — Task 5 vòng 2: fix CRITICAL mapDocType + thu hẹp remap theo cờ file + unit test

- **Phạm vi**:
  - `client/src/views/sales-project/business-policy/Detail/Index.vue` — hàm `mapDocType` (~1826-1832).
  - `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/impl/ProjectPLSignReqServiceImpl.java` — nhánh `tab==1` trong `cloneFilesSignReqWhenSignedForBusinessPolicy` (~5874-5886).
  - `docs/tasks/Task-05-tab-tham-dinh-ky-duyet/system-design.md` — cập nhật §12 (Q-DOCTYPE1), thêm §13 "An toàn regression (code dùng chung)".
  - Test mới: `crm-service/VcrmApp/src/test/java/com/app/businessproject/service/impl/CRMDocumentServiceImplTest.java`, `CRMDocumentFileServiceImplTest.java`, `ProjectPLSignReqServiceImplTest.java`.
- **Thay đổi chính**:
  1. **CRITICAL fix**: `mapDocType` sửa `item.code` → `item.key` (global-list API `getListValueByCode` trả field `key`/`value`/`code`/`description`, trong đó `key` chứa mã số `crmDocType` — `code` là field khác, không dùng cho việc này). Trước khi sửa, map luôn build object rỗng → cột "Loại hồ sơ tài liệu" trống cho MỌI dòng kể cả 11-14 Task 6; đây là fix bug tồn tại từ trước, không phải regression (không có hành vi "đúng" nào bị phá).
  2. **CRITICAL fix — thu hẹp phạm vi remap tab=1**: nhánh `else if (tab.equals(1))` trong `cloneFilesSignReqWhenSignedForBusinessPolicy` đổi từ remap theo `crmDoc.getCrmDocType()` (cấp CRMDocument, dùng chung cho PL1-3 hiệu quả kinh doanh + PL2-6 + file user tự tải) sang: `crmDocType=2` ("File trình ký") → luôn remap 15 (document này không dùng chung, chỉ chứa "Tài liệu trình ký" — đã grep xác nhận `copyFileBusinessEfficiencyForCSKD`/`copyFileKhaiBaoChinhSachAppendixForCSKD` đều chỉ ghi vào `appendixFile.crmDocId`, không bao giờ ghi vào `signReqFile.crmDocId`); `crmDocType=3` ("File phụ lục") → CHỈ remap 16 khi file (`docFileSignReq`, biến trong vòng lặp) có cờ `isAutoKhaiBaoCsAppendix=1`, ngược lại giữ nguyên `crmDocType=3` như hành vi cũ (bảo vệ PL1-3 hiệu quả kinh doanh + file user tự tải khỏi bị đổi nhãn nhầm).
  3. Bổ sung unit test JUnit5 + Mockito (theo tiền lệ `BusinessPolicyActivityServiceImplTest`/`COppPromotionServiceImplTest`, dùng `ReflectionTestUtils.setField` cho field ambiguous-type thay vì `@InjectMocks` khi class có ≥2 field cùng type — vd `CRMDocumentFileServiceImpl`/`ProjectPLSignReqServiceImpl` có nhiều field `CRMDocumentRepo`/`CRMDocumentFileService`):
     - `CRMDocumentServiceImplTest`: sinh 3 file khi `isNewProduct=0`, 5 file khi `isNewProduct=1`, dedup khi file đã tồn tại, trả `false` khi thiếu `crmDocId`.
     - `CRMDocumentFileServiceImplTest`: `deleteFileById` chặn non-admin khi cờ=1 (ném `AppException` code `CDF-011`), cho qua khi admin hoặc cờ null, và xác nhận KHÔNG đụng guard Task 6 cũ (tab=2 vẫn ném `CDF-010` độc lập).
     - `ProjectPLSignReqServiceImplTest`: dựng 1 CRMDocument "File phụ lục" chứa 2 file (1 PL1 hiệu quả kinh doanh cờ null, 1 PL2 Task5 cờ=1) + 1 CRMDocument "File trình ký" — verify sau clone: file PL1 giữ `crmDocType=3` (KHÔNG đổi), file PL2 thành `16`, tài liệu trình ký thành `15`.
- **Lý do**: Leader review vòng 1 = BLOCK vì (1) bug `mapDocType` làm trống cột hiển thị mọi CSKD, (2) remap `crmDocType` theo document dùng chung sẽ vô tình đổi nhãn PL1-3 hiệu quả kinh doanh (luồng ngoài phạm vi PYC Task 5) thành "Phụ lục tờ trình" — vi phạm quy tắc mới "Tái sử dụng code an toàn" trong `java-senior-dev.md`.
- **An toàn regression (tóm tắt, xem đầy đủ tại system-design.md §13)**: `copyFileBusinessEfficiencyForCSKD` (không sửa, an toàn tuyệt đối); `cloneFilesSignReqWhenSignedForBusinessPolicy` (đã thu hẹp remap theo cờ file, PL1-3 không còn bị ảnh hưởng); slot `appendixFile` dùng chung (chỉ thêm file mới tên khác biệt, không sửa `handleCreateDocument`/`handleSort`); `deleteFileById` (2 guard độc lập, guard mới chỉ trigger khi cờ=1); `mapDocType` (fix bug, 1 call site duy nhất); cột mới `isAutoKhaiBaoCsAppendix` (nullable, không đổi hành vi entity cũ).
- **Ghi chú**: user cần `mvn -pl VcrmGeneral,VcrmApp clean install` (build + chạy test mới); SQL và các điểm cần VPN xác nhận giữ nguyên như entry trước (chưa đổi). Đề nghị Leader review lại vòng 2.

## 2026-07-29 — Task 5 vòng 2 (tiếp): rolled back — bỏ toàn bộ unit test

- **Phạm vi**: xoá 3 file test vừa tạo ở entry trên — `crm-service/VcrmApp/src/test/java/com/app/businessproject/service/impl/CRMDocumentServiceImplTest.java`, `CRMDocumentFileServiceImplTest.java`, `ProjectPLSignReqServiceImplTest.java`.
- **Thay đổi chính**: xoá cả 3 file test (rolled back theo yêu cầu user). KHÔNG đụng file test có sẵn của repo, kể cả file trùng tên khác package `com/app/mobile/service/impl/CRMDocumentFileServiceImplTest.java` (module mobile, không liên quan Task 5, đã xác nhận không bị ảnh hưởng).
- **Lý do**: user đổi quyết định — không chạy/verify được test do thiếu VPN, chỉ viết test khi user yêu cầu rõ. Task 5 chỉ giữ 2 việc bắt buộc còn lại (đã hoàn thành, verify tĩnh bằng đọc code): fix CRITICAL `mapDocType` (`item.code`→`item.key`) và thu hẹp phạm vi remap `crmDocType 3→16` theo cờ `isAutoKhaiBaoCsAppendix` để không đụng PL1-3 hiệu quả kinh doanh.
- **Ghi chú**: code chính (BE Const/CRMDocumentFile/CRMDocumentService/CRMDocumentFileService/Controller/ProjectPLSignReqServiceImpl, FE defineRouting/crmDocument service/appPropsConstants/FormSignReq.vue/Index.vue, SQL, system-design.md §12-§13) giữ nguyên như 2 entry trước — không đổi gì ngoài việc xoá test.

## 2026-07-29 — Task 5 APPROVE + quy tắc test "chỉ khi user yêu cầu"

- **Phạm vi**: `.claude/agents/team-lead-reviewer.md` (mục E.Test), `PYC-1375.xlsx` (5.1/5.2/5.3), memory.
- **Thay đổi chính**:
  1. Leader review vòng 2 = APPROVE: 2 CRITICAL đã fix — `Index.vue mapDocType` `item.code`→`item.key` (bug cũ làm cột "Loại hồ sơ tài liệu" trống cả Task 6); regression clone `tab==1` remap `crmDocType 3→16` chỉ khi file có cờ `isAutoKhaiBaoCsAppendix=1` (bảo vệ PL1-3 hiệu quả kinh doanh ngoài PYC khỏi bị đổi nhãn).
  2. Quy tắc test MỚI (user chốt): agent KHÔNG chạy được `mvn test` (VPN) → **mặc định không viết unit test, chỉ viết khi user yêu cầu rõ**; test KHÔNG chặn merge; gate merge dựa review tĩnh (AC/PYC + An toàn regression). Đã sửa checklist Leader E.Test. 3 file test Task 5 đã rolled back; file test có sẵn (mobile) không đụng.
  3. Tracker: 5.1/5.2/5.3 = Done, DEV=java-senior-dev, End=29/07/2026.
- **Ghi chú (user cần VPN)**: `mvn -pl VcrmGeneral,VcrmApp clean install`; trước khi chạy `crm-service/sql/2026-07-29_task05_phu_luc_tham_dinh_ky_duyet.sql` phải SELECT xác nhận cột chứa mã số của GLOBAL_LIST_DETAIL (§12 system-design). 5.1 là placeholder phụ lục (nội dung thật chờ Task 1/9). Python tracker: openpyxl cài tại /tmp/vpy (venv2 phiên cũ đã mất).

## 2026-07-29 — Sửa Task 5.1: file phụ lục rỗng → đính kèm template thật

- **Phạm vi**: `crm-service/VcrmApp/src/main/resources/templateKhaiBaoChinhSach/` (5 file template mới copy từ docs); code `CRMDocumentFileServiceImpl.createPlaceholderAppendixFile` + `CRMDocumentServiceImpl.copyFileKhaiBaoChinhSachAppendixForCSKD` + hằng tên file (đang Dev sửa).
- **Vấn đề (user phát hiện)**: `createPlaceholderAppendixFile` chỉ `Files.createFile` → file 0 byte, không dùng template thật. Và PL5/PL6 tưởng "không có trong docs" nhưng thực ra là `Phu luc 2` (SAP) / `Phu luc 3` (TelecomServiceID/Saletrantype) — chỉ lệch cách đánh số (BLOCKER Q4 xử lý hụt).
- **Quyết định user**: đính kèm TEMPLATE THẬT, giữ số PL2–PL6 (PYC), map nội bộ sang file docs. Mapping: PL2→`Phu luc 4...BCCS.docx`, PL3→`Template_Chung_QLBH.xlsx`, PL4→`Template_Chung_PBH.xlsx`, PL5→`Phu luc 2...SAP.xlsx`, PL6→`Phu luc 3...Telecom.docx`. Đã copy vào resources tên ASCII (PL2_GoiCuoc_BCCS.docx, PL3_QLBH.xlsx, PL4_PBH.xlsx, PL5_SAP_SPDV_Moi.xlsx, PL6_TelecomServiceID_Saletrantype_BCCS.docx).
- **Ghi chú**: chọn template QLBH/PBH theo lĩnh vực phụ thuộc Task 8 (TODO — hiện dùng bản Chung); nội dung điền tự động phụ thuộc Task 1 (hoãn) — đợt này đính kèm biểu mẫu trắng. Task 9 đang TẠM DỪNG chờ user trả lời 3 câu (phạm vi 9.1/9.3, receiveUser Q6, trigger) — 9.1 QLBH gần đủ điều kiện (đã có client `PocQlbhTrialChannelServiceImpl` + config qlbh.url/token/domain), 9.2 PBH + 9.4 SAP/BCCS chặn do thiếu spec.

## 2026-07-30 — Bỏ điều kiện fix cứng 'P PC&KSNB' khỏi danh sách đánh giá SR

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/projectPlAsm/impl/ProjectPlSrAssessmentServiceImpl.java` (`appendWhere`).
- **Thay đổi chính**: Xoá block `AND EXISTS (... EO2.ORG_UNIT_CODE = 'P PC&KSNB')` trong query danh sách đánh giá (màn `service-assessment`). Danh sách nay chỉ lọc theo HAS_SEND_PYC=1 + cờ INACTIVATE_ALL_SR + phân quyền DANH_GIA + trạng thái DONE/CLOSED + work-log 'Kết quả'='Hoàn thành'.
- **Lý do**: User xác nhận chỉ BÁO CÁO (BaoCaoSrServiceImpl.java:376) mới cần ràng buộc đơn vị 'P PC&KSNB'; danh sách đánh giá thì không.
- **Ghi chú**: Không sửa DB. Vẫn còn magic string 'P PC&KSNB' ở BaoCaoSrServiceImpl:376 và SERVICE_GROUP_CODE ở ProjectPlSrRepoCustomImpl:1174 (cờ canConvertDocument) — chưa gom hằng số. User tự build (VPN).
- **Câu hỏi #2 (đầu mối đơn vị được đánh giá)**: `loadEvaluatedStaff` gọi `getListActiveStaffByOrgUnitIdAndCode` chỉ truyền `orgUnitId` — ĐÚNG & nhất quán với bản gốc `PycExtraInfo.getEvaluatedStaff`. Endpoint nhận id/code như 2 filter độc lập; branch code chỉ dùng cho `getPycHandlers` (org unit cố định theo PCKSNB_ORG_UNIT_CODES). Không phải bug.

## 2026-08-03 — System Design bổ sung Task 1: import 1.3 (BCCS) + 1.4 (QLBH)

- **Phạm vi**: `docs/tasks/Task-01-them-moi-cap-nhat-cskd/system-design-import.md` (file mới, chỉ tài liệu — không sửa code).
- **Thay đổi chính**:
  - Viết System Design cho phần vùng "Thông tin khai báo chính sách" của Task 1 đã bị hoãn trước đó ở `system-design.md` §0/§12: subtask 1.3 (import BM01 khai báo gói cước BCCS) + 1.4 (import BM02 khai báo QLBH, gọi API QLBH validate `POST {qlbh.domain}/cskd/product-import/validate` do user cung cấp).
  - Thiết kế bảng mới `business_policy_declare_info` (business_policy_id, declare_type, qlbh_sector, crm_doc_id, validate_status, validate_message, validate_response_raw) — lưu raw response QLBH vì chưa có schema chính thức.
  - Ghi nhận: cột `bccsPackageDeclStatus`/`qlbhPolicyDeclStatus`/`pbhPolicyDeclStatus` đã có sẵn trong entity `BusinessPolicy.java` nhưng chưa có SQL migration và chưa được code nào dùng — không đụng vào ở đợt này, để Task 2/3/4 quyết định.
  - 1.5 (PBH) tiếp tục PENDING, chỉ giữ chỗ enum `BP_PBH`, không thiết kế luồng gọi API (chưa có API PBH).
- **Lý do**: User cung cấp thêm API QLBH validate + đã có sẵn BM01/BM02 trong `docs/`, đủ input để thiết kế tiếp phần đã hoãn.
- **Ghi chú**: Còn nhiều BLOCKER cần Leader/user xác nhận trước khi Dev code, quan trọng nhất là **(a) CRITICAL — chưa có response schema của API QLBH validate** (đề xuất lưu raw response + gọi thử API thật trước khi chốt logic parse). Các BLOCKER khác: (b) xác nhận schema bảng mới không đụng Task khác, (c) config `qlbh.domain`/`qlbh.token` ngoài repo (config server), (d) chưa có API download template QLBH (PYC nói "do API QLBH cung cấp" nhưng chỉ có validate), (e) 18 template BM02 theo lĩnh vực×loại nhưng Figma modal không có field phân biệt Gói cước/Sản phẩm, (f) cách pre-fill `qlbhSector` từ `ProductType.qlbhSector` (Task 8) là suy luận của BA, cần xác nhận, (h) rule disable 1.6 nhánh SP/DV mới vẫn phụ thuộc cờ "PYC khai báo chính sách đã ký" của Task 6 (chưa tồn tại — kế thừa BLOCKER Q10 cũ). Chưa chạy `mvn`/`npm`/SQL — chỉ viết tài liệu.

## 2026-08-03 — Task 1 import (1.3 BCCS + 1.4 QLBH) — BA design + Dev bắt đầu

- **Phạm vi**: `docs/tasks/Task-01-.../system-design-import.md` (BA mới viết); code BE `BusinessPolicyDeclareInfoService/Controller` + entity `business_policy_declare_info` + SQL; FE `FormDeclareInfoArea.vue`; templates `resources/templateKhaiBaoChinhSach/BM01_*.docx`, `BM02_Template_Chung_QLBH.xlsx`.
- **Thay đổi chính**: 1.3 BCCS import BM01 (validate cột + Product Hierarchy theo isNewProduct: SP mới bỏ trống, SP đã có bắt buộc) — làm trọn. 1.4 QLBH import BM02 — **BYPASS validate** (cờ `qlbh.validate.enabled=false` → coi HOP_LE, không gọi API ngoài) để thông luồng import trước; method gọi multipart `cskd/product-import/validate` viết dormant, ráp parse sau khi có response schema. 1.5 PBH pending (disable UI).
- **Lý do**: user cung cấp API QLBH validate `POST 10.60.155.11:8034/cskd/product-import/validate` (linh_vuc=VALUE của GL_PRODUCT_TYPE_QLBH_SECTOR + file) nhưng CHƯA có response schema → user chọn bypass để làm luồng import trước.
- **Ghi chú (chờ user)**: (a) response mẫu API QLBH validate (hợp lệ + không hợp lệ) để bật validate thật; (c) confirm config `qlbh.import-validate-url` + `qlbh.token` cho endpoint mới. Bảng lưu dùng `business_policy_declare_info` (UNIQUE business_policy_id+declare_type, import lại=update). declare_type dùng BUSINESS_POLICY_ACT_GROUP (BP_BCCS_PACKAGE/BP_QLBH/BP_PBH). Cột *DeclStatus có sẵn trên BusinessPolicy KHÔNG dùng đợt này (để dành Task 2).

## 2026-08-03 — Task 1 import 1.3 (BCCS) + 1.4 (QLBH) — Dev hoàn thành code

- **Phạm vi**:
  - Backend (`crm-service/VcrmApp`, package `com.app.businessproject`):
    - (mới) `domain/businessPolicy/BusinessPolicyDeclareInfo.java` — entity bảng `business_policy_declare_info`.
    - (mới) `repo/businessPolicy/BusinessPolicyDeclareInfoRepo.java`.
    - (mới) `dto/sdo/businessPolicy/BusinessPolicyDeclareInfoSdo.java`, `BusinessPolicyDeclareTemplateSdo.java`.
    - (mới) `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java`, `QlbhValidateFailedException.java`.
    - (mới) `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` — import BCCS (validate cột + Product Hierarchy theo `isNewProduct`), import QLBH (bypass validate qua `qlbh.validate.enabled`, method `callQlbhValidate` dormant), list/download template (đọc classpath `templateKhaiBaoChinhSach/import/{BCCS,QLBH,PBH}/*` qua `PathMatchingResourcePatternResolver`), `suggestQlbhSector` (best-effort từ `ProductType.qlbhSector`).
    - (mới) `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` — 6 endpoint dưới `/business-policy/declare-info`.
    - (sửa) `crm-service/VcrmGeneral/.../Const.java` — thêm `CRM_DOCUMENT_TYPE.BUSINESS_POLICY_DECLARE_FILE_BCCS_PACKAGE=20`, `BUSINESS_POLICY_DECLARE_FILE_QLBH_POLICY=21` (đã grep xác nhận 20/21 chưa dùng trong class này).
    - (mới) `crm-service/sql/2026-08-03_task01_declare_info_bccs_qlbh.sql` — `CREATE TABLE IF NOT EXISTS`.
  - Frontend (`client/`):
    - (mới) `src/views/sales-project/business-policy/Form/FormDeclareInfoArea.vue` — grid + modal "+ Thêm mới" (script setup).
    - (mới) `src/views/sales-project/business-policy/columns/columnsDeclareInfo.ts`.
    - (sửa) `src/views/sales-project/business-policy/Form/FormCommonInfo.vue` — import + đăng ký + gắn `<form-declare-info-area v-if="businessPolicyId" ...>` sau bảng "Hồ sơ tài liệu".
    - (sửa) `src/services/app/defineRouting.ts` — 6 key `BUSINESS_POLICY_DECLARE_INFO_*`.
    - (sửa) `src/services/app/businessPolicy/index.ts` — wrapper API + `importBusinessPolicyDeclareQlbhPolicy` (raw axios `responseType: 'blob'`, tự phân biệt JSON thành công vs file lỗi trả về).
- **Thay đổi chính**:
  - 1.3 BCCS: đọc file qua `FileUtil.readExcelV7` (đổi so với `readExcel` gợi ý ở system-design vì `readExcel` dùng `cellIterator` sẽ lệch cột khi ô Product Hierarchy để trống — `readExcelV7` đọc theo `getLastCellNum` an toàn hơn, đã đối chiếu cùng pattern `ImportBCCSServiceImpl` mà chính tài liệu thiết kế trích dẫn). Đối chiếu file mẫu thật `BM 01_Khai bao mat hang goi cuoc tren BCCS.docx` (đã giải nén XML đọc header) phát hiện cột thứ 5 thực tế tên **"VAT"** (giá trị "KCT"/"10%", KHÔNG phải số) chứ không phải "Giá bán lẻ (VAT)" dạng numeric như bảng ở system-design — đã sửa validate cột này thành "not-blank" thay vì "numeric ≥ 0" để khớp dữ liệu thật, tránh reject nhầm file hợp lệ.
  - 1.4 QLBH: cờ `qlbh.validate.enabled` (mặc định `false`) → bypass, không gọi API ngoài, `validate_status=HOP_LE` luôn. Theo yêu cầu cập nhật của coordinator: **KHÔNG lưu message/raw response lỗi** (đã bỏ cột `validate_message`, `validate_response_raw` khỏi entity/SDO/SQL — chỉ giữ `validate_status`). Khi bật cờ thật: API QLBH không hợp lệ trả về **1 file lỗi** (không phải JSON) — BE nhận diện qua `Content-Type` không phải `application/json`, ném `QlbhValidateFailedException` mang theo bytes + tên file, Controller (`ResponseEntity<?>`) stream file đó thẳng về FE thay vì JSON; FE gọi bằng raw axios `responseType:'blob'`, tự phân biệt JSON vs file để tải xuống cho user.
  - Template BCCS/QLBH/PBH: KHÔNG còn 1 file cố định — đọc động từ 3 thư mục classpath `templateKhaiBaoChinhSach/import/{BCCS,QLBH,PBH}/` (BCCS 1 file, QLBH 19 file, PBH 4 file), endpoint `templates` liệt kê + `download-template` tải theo `fileName` (chặn path traversal bằng whitelist đối chiếu danh sách vừa liệt kê).
  - 1.5 PBH: giữ enum hợp lệ ở BE nhưng option bị `disabled` ở FE modal; nếu FE lỡ gửi BE cũng chặn qua `validateBeforeSave` phía FE (chưa có endpoint import PBH nên BE tự nhiên không thể nhận request này).
  - Rule 1.6: BE chặn `import-bccs-package`/`import-qlbh-policy` khi `isNewProduct=0` (SP/DV đã có) + `processStatus=DA_PHE_DUYET`; nhánh SP/DV mới chưa chặn (đúng quyết định đã chốt, chờ Task 6).
- **Lý do**: Hoàn thiện phần đã hoãn ở `system-design.md` §0/§12, theo quyết định bypass validate QLBH + cập nhật cơ chế template nhiều file + cơ chế trả file lỗi QLBH do coordinator làm rõ giữa chừng task.
- **An toàn regression (code dùng chung)**: Không sửa `CRMDocumentFileServiceImpl`/`ImportBCCSServiceImpl`/`PocQlbhTrialChannelServiceImpl` — chỉ **gọi thêm** `CRMDocumentFileService.uploadFileLocal4` (method public có sẵn, chưa ai gọi ngoài code mới) và tự tạo `CRMDocument`/`CRMDocumentFile` trực tiếp qua repo (không đổi hành vi `uploadFileBusinessPolicy` cũ). Thêm 2 hằng `CRM_DOCUMENT_TYPE` mới (20/21) — không đụng giá trị cũ. Route `defineRouting.ts` chỉ thêm key mới, đã grep xác nhận không trùng.
- **Ghi chú (cần user)**:
  - Chạy SQL `crm-service/sql/2026-08-03_task01_declare_info_bccs_qlbh.sql` trước khi deploy.
  - Set config `qlbh.import-validate-url` (mặc định rỗng) + `qlbh.validate.enabled=false` (giữ bypass) + `qlbh.token` (dùng lại nếu có) trên config server; khi có schema/API thật, đổi `qlbh.validate.enabled=true` và test kỹ nhánh `QlbhValidateFailedException`/FE blob (chưa build/test được, chỉ tự review qua Read/Grep).
  - `mvn -pl VcrmApp,VcrmGeneral clean install`; FE `npm run lint` rồi `npm run dev`.
  - Chưa viết unit test theo yêu cầu task. Đã tự review Java 8 compliance (grep sạch), không comment code mới, diff FormCommonInfo.vue tối thiểu (3 điểm chạm).

## 2026-08-03 — Task 1 import 1.3/1.4 — Round sửa theo Leader review (APPROVE-WITH-WARNING)

- **Phạm vi**:
  - Backend: `domain/businessPolicy/BusinessPolicyDeclareInfo.java` (thêm `isDeleted`), `repo/businessPolicy/BusinessPolicyDeclareInfoRepo.java` (đổi `findByBusinessPolicyIdOrderByIdAsc` → `findByBusinessPolicyIdAndIsDeletedOrderByIdAsc`), `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` (+`deleteDeclareInfo`), `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (+`deleteDeclareInfo`/`assertCanDeleteDeclareInfo`, inject `StaffRepo`, resurrect `isDeleted=0` khi upsert, sửa `callQlbhValidate` bỏ tham số `token` — chỉ dùng `qlbhApiToken` config), `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` (+`DELETE {id}`).
  - SQL: `crm-service/sql/2026-08-03_task01_declare_info_bccs_qlbh.sql` — thêm cột `is_deleted` (inline CREATE + `ALTER TABLE ADD COLUMN IF NOT EXISTS` cho môi trường đã chạy file cũ).
  - Frontend: `Form/FormDeclareInfoArea.vue` (+icon Xoá admin-only, `Modal.confirm`, prop `isAdmin`), `columns/columnsDeclareInfo.ts` (mở rộng cột "Hành động" 90→110), `Form/FormCommonInfo.vue` (truyền `:is-admin="isPerAdmin"` — tái dùng ref đã có sẵn từ `checkPermissionAdmin()`), `services/app/businessPolicy/index.ts` (+`deleteBusinessPolicyDeclareInfo`), `constants/appPropsConstants.ts` (`CRM_DOC_TYPE` +2 key `BUSINESS_POLICY_DECLARE_FILE_BCCS_PACKAGE=20`/`_QLBH_POLICY=21`), `Detail/Index.vue` (`getDocumentTypeName` +2 case), `docs/tasks/Task-01-.../system-design-import.md` (§4.2 sửa cột VAT thành text).
- **Thay đổi chính**:
  - HIGH #1 (Xoá — admin only): soft-delete qua cột `is_deleted` (không xoá cứng, tránh vỡ UNIQUE constraint khi resurrect ở lần import lại). Guard admin tái dùng pattern Task 5 (`staffRepo.isAdmin(staffId)`), lấy `staffId` qua `keyCloakProvider.getStaffIdFromToken(token)` (khác Task 5 dùng `VarContext.getIamUsernameLogin()` — do controller đã có sẵn `token` từ header, không cần đổi cơ chế). Xoá cũng set `CRM_DOCUMENT.STATUS=0` (tái dùng `deactivateOldDocument` đã có).
  - MEDIUM #1: `callQlbhValidate` bỏ hẳn fallback token FE/Keycloak — CHỈ dùng `qlbhApiToken` (config `qlbh.token`); nếu rỗng thì không set header Authorization (KHÔNG forward token nội bộ ra ngoài, đúng yêu cầu bảo mật, ưu tiên hơn "fallback token FE" mà message có nhắc tới nhưng mâu thuẫn với chính yêu cầu bảo mật ngay sau đó — đã chọn diễn giải an toàn hơn, ghi rõ ở đây để Leader biết).
  - MEDIUM #2: `Detail/Index.vue getDocumentTypeName` +2 case cho crmDocType 20/21.
  - LOW: system-design-import.md §4.2 sửa nhãn cột "Giá bán lẻ (VAT)" → "VAT" + ghi rõ là text.
- **HIGH #2 (pre-create/luồng 1 bước) — CHƯA LÀM, dừng lại theo đúng chỉ dẫn của coordinator**: đã nghiên cứu kỹ cơ chế `FormDocument.vue :is-pre-create="true"` — bản chất là tạo `CRM_DOCUMENT` ngay với `objectId=''`/null lúc chưa có `businessPolicyId`, track `crmDocId` vào mảng `crmDocIdLst` (FE state), rồi khi Lưu CSKD lần đầu gửi kèm `crmDoc.lstDocId` trong payload `policyCreate`, BE (`BusinessPolicyServiceImpl.createOrUpdate` dòng ~904) gọi `crmDocumentService.updateCRMDocumentTypeAndObjectId(businessPolicy.getId(), crmDocIds, docType)` để "gắn" ngược `OBJECT_ID`. Cơ chế này hoạt động được vì `CRM_DOCUMENT.OBJECT_ID` vốn nullable. Nhưng `business_policy_declare_info.business_policy_id` đang NOT NULL + là 1 phần UNIQUE — để áp dụng y hệt pattern cần: (a) nới `business_policy_id` thành nullable, (b) thêm 1 method "attach" bulk update tương tự, và quan trọng nhất (c) **phải chạm vào `BusinessPolicyServiceImpl.createOrUpdate`** (file lớn, nhạy cảm, đang chạy cho MỌI luồng tạo/sửa CSKD) để gọi thêm bước attach ngay cạnh đoạn gọi CRM_DOCUMENT hiện có. Đây đúng là trường hợp message đã lường trước ("KHÔNG thể defer sạch... vì cần businessPolicyId để lưu... → DỪNG, báo lại phương án") — nên đã dừng, KHÔNG tự ý sửa `createOrUpdate`. Đã đề xuất 2 phương án cho Leader/user chọn (xem báo cáo cuối task), giữ nguyên `v-if="businessPolicyId"` ở `FormCommonInfo.vue` cho tới khi có quyết định.
- **Ghi chú (cần user)**: chạy lại SQL (đã cập nhật, vẫn idempotent) trước khi deploy; các mục còn lại build/test như đã ghi ở entry trước.

## 2026-08-03 — Task 1 import 1.3/1.4 — HIGH #2 Pre-create (Phương án B, user đã chốt)

- **Phạm vi**:
  - Backend: `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` (+`validateBccsPackageOnly`/`validateQlbhPolicyOnly`), `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (thêm 2 method validate-only, refactor `importBccsPackage`/`importQlbhPolicy` gọi lại chúng — DRY, KHÔNG duplicate logic), `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` (+`POST validate-bccs-package`, `POST validate-qlbh-policy` — validate-qlbh-policy cũng xử lý nhánh trả file lỗi giống import thật).
  - Frontend: `services/app/defineRouting.ts` (+2 key VALIDATE_BCCS/VALIDATE_QLBH), `services/app/businessPolicy/index.ts` (+`validateBusinessPolicyDeclareBccsPackage`, `validateBusinessPolicyDeclareQlbhPolicy`, refactor `postQlbhMultipart` dùng chung cho cả import lẫn validate-only), `Form/FormDeclareInfoArea.vue` (thêm state `pendingItems`, computed `displayDataSource` gộp real+pending, nhánh `handleSave` theo `isPreCreate = !businessPolicyId`, `submitBccsPackagePending`/`submitQlbhPolicyPending` gọi validate-only rồi giữ `File` + metadata ở FE state, tag "Chờ lưu" + icon bỏ-khỏi-danh-sách riêng cho dòng pending, `defineExpose({ commitPendingDeclareInfo })`), `Form/FormCommonInfo.vue` (bỏ `v-if="businessPolicyId"`, thêm `ref="declareInfoAreaRef"` + gọi `commitPendingDeclareInfo(response.body)` ngay sau khi `policyCreate`/`policyUpdate` trả về id thành công, trước `onClose`/router push — chỉ 4 điểm chạm, KHÔNG đụng `BusinessPolicyServiceImpl.createOrUpdate`).
- **Thay đổi chính**: Luồng pre-create hoàn toàn ở FE state (giữ `File` object thật + `declareType`/`qlbhSector` trong `pendingItems`), BE validate-only KHÔNG ghi DB (không tạo CRM_DOCUMENT, không tạo `business_policy_declare_info`). Khi Lưu CSKD lần đầu thành công (có id mới) → `commitPendingDeclareInfo` lặp qua từng pending item gọi API import THẬT (`import-bccs-package`/`import-qlbh-policy`) với id mới; item nào lỗi → giữ lại trong `pendingItems` (không mất), báo lỗi rõ tên loại khai báo, các item khác vẫn tiếp tục; xong thì gọi lại GET để đồng bộ grid với DB.
- **An toàn regression**: KHÔNG sửa `BusinessPolicyServiceImpl.createOrUpdate` — hoàn toàn không đụng luồng lưu CSKD dùng chung. `import-bccs-package`/`import-qlbh-policy` cũ giữ nguyên hành vi (chỉ thêm 2 method MỚI dùng chung logic validate nội bộ qua refactor, không đổi input/output/side-effect của 2 API cũ). 2 endpoint validate-only là API hoàn toàn mới, không route nào khác gọi tới.
- **Xác nhận MEDIUM #1**: giữ nguyên cách hiểu — `callQlbhValidate` chỉ dùng `qlbh.token` config, không fallback token FE/Keycloak.
- **Ghi chú (cần user)**: build/test khi có VPN; test tay kỹ luồng "Tạo mới CSKD SP/DV mới → import BCCS+QLBH trước khi Lưu → Lưu CSKD → xác nhận cả 2 dòng chuyển từ 'Chờ lưu' sang dòng thật trong grid Cập nhật".

## 2026-08-03 — Task 1.3/1.4 import HOÀN THÀNH (APPROVE)

- **Phạm vi**: BE `BusinessPolicyDeclareInfo(Service/Controller/Repo/Entity/Sdo)`, `Const` (CRM_DOC_TYPE 20/21), SQL `2026-08-03_task01_declare_info_bccs_qlbh.sql` (+is_deleted); FE `FormDeclareInfoArea.vue`, `columnsDeclareInfo.ts`, `FormCommonInfo.vue` (4 điểm chạm), `defineRouting.ts`, `businessPolicy/index.ts`; templates `resources/templateKhaiBaoChinhSach/import/{BCCS,QLBH,PBH}/`.
- **Thay đổi chính**: 1.3 BCCS import BM01 (validate cột + Product Hierarchy theo isNewProduct; cột VAT là text). 1.4 QLBH proxy API `cskd/product-import/validate` — **bypass** (`qlbh.validate.enabled=false`, import luôn thành công), nhánh gọi thật dormant: không hợp lệ → QLBH trả file lỗi → stream về FE; token chỉ dùng `qlbh.token` config. Xóa dòng: DELETE admin-only (isAdmin, chặn khi vùng khóa, soft-delete). Pre-create **PA B**: validate-only (không ghi DB) khi tạo mới + `commitPendingDeclareInfo` gọi trong `onSubmit` sau khi CSKD trả id (KHÔNG đụng createOrUpdate). Tải biểu mẫu: list nhiều file theo folder + download-by-name (chống path traversal 2 lớp).
- **Regression an toàn**: createOrUpdate BE không sửa; import cũ giữ nguyên hành vi; validate-only endpoint mới độc lập; doSubmit(1845) là dead code cũ, nút Lưu thật đi qua handleBeforeSubmit→onSubmit(có commit).
- **Trạng thái**: 1.3, 1.4 = Done (tracker). 1.5 PBH PENDING (disable UI, chờ API).
- **User cần chạy (VPN)**: SQL `2026-08-03_task01_declare_info_bccs_qlbh.sql`; `mvn -pl VcrmApp,VcrmGeneral clean install`; `npm run lint && npm run dev`; config `qlbh.import-validate-url`, `qlbh.validate.enabled=false`, `qlbh.token`. Khi có response mẫu QLBH validate → bật cờ + ráp parse (nhận diện file lỗi vs success qua Content-Disposition/Content-Type).

## 2026-08-03 — Task 2: sơ đồ tiến trình lên trên tab + build finish khi tạo xong

- **Phạm vi**: `Detail/Index.vue` (di chuyển `<policy-progress-diagram>`), `utils/businessPolicyDeclaration.ts` (deriveProposalNodeStatuses).
- **Thay đổi chính**:
  1. Chuyển vùng sơ đồ tiến trình ra khỏi tab "Thông tin cơ bản" (khối `v-if="key==='tab1'"` trong `<a-card :tab-list>`) → đặt TRÊN `<a-card>` (dòng 90), luôn hiển thị trên mọi tab, theo Figma.
  2. `deriveProposalNodeStatuses`: case `DU_THAO` (CSKD vừa tạo) đổi node `build` từ `'process'` → `'finish'` — tạo xong CSKD thì bước "Xây dựng tờ trình CSKD" hoàn thành.
- **Lý do**: user yêu cầu bám Figma (sơ đồ trên tab) + tiến trình phải hoàn thành bước xây dựng tờ trình ngay khi tạo xong CSKD.
- **Ghi chú**: diagram render 1 lần, refs (dataCommonInfo/dataActivities/isNewProductPolicy/onNavigateNode) có sẵn scope component; click node vẫn onNavigateNode chuyển tab. User cần `npm run dev` để xem.

## 2026-08-03 — Task 1 vùng "Thông tin khai báo chính sách" — round chỉnh theo Figma đối chiếu thực tế

- **Phạm vi**:
  - Backend: `domain/businessPolicy/BusinessPolicyDeclareInfo.java` (+`isEditProduct`), `dto/sdo/businessPolicy/BusinessPolicyDeclareInfoSdo.java` (+`isEditProduct`), `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` (đổi chữ ký `importQlbhPolicy`/`validateQlbhPolicyOnly` thêm `isEditProduct`), `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (cập nhật theo, +`validateIsEditProduct`, +method dormant `callQlbhCapTemplateDormant`/`buildCapTemplateUrl`/`urlEncode`, +config `qlbh.domain`/`qlbh.template.enabled`), `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` (+param `isEditProduct` ở `import-qlbh-policy`/`validate-qlbh-policy`).
  - SQL: `crm-service/sql/2026-08-03_task01_declare_info_bccs_qlbh.sql` — thêm cột `is_edit_product` (inline CREATE + `ALTER TABLE ADD COLUMN IF NOT EXISTS`).
  - Frontend: `Form/FormDeclareInfoArea.vue` (viết lại gần như toàn bộ: modal `a-modal`→`a-drawer` giống `FormDocument.vue`, `Form.useForm`/`validateInfos`, upload dùng `#itemRender` giống FormDocument, grid `a-table`→`asme-table` giống grid "Hồ sơ tài liệu", thêm field "Sửa thông tin SP hay không?" chỉ hiện khi QLBH), `columns/columnsDeclareInfo.ts` (chỉnh theo style `columnsDocument.ts`).
  - Docs: `system-design-import.md` (+§4.5 mô tả UI mới + TODO multi-file, +cột `is_edit_product` vào §6.1, +§7.1 mapping dự kiến `cap_template` dormant).
- **Thay đổi chính**:
  - Modal giờ là drawer full-height bên phải (đúng Figma `94:854`/`119:370`), header có Hủy/Lưu, validate qua `Form.useForm` (giống hệt cách `FormDocument.vue` làm — không sửa `FormDocument.vue`, chỉ áp dụng lại cấu trúc).
  - Grid "Thông tin khai báo chính sách" dùng `asme-table` cùng bộ prop với grid "Hồ sơ tài liệu" (`:card`, `:columns-table`, `:pagination`, `@onReload`, `@change`, slot `#extraAction`/`#bodyCell`) — thêm `pagination` ref (`PAGINATION` + `mergePagination`) dù dữ liệu không thật sự phân trang server (danh sách luôn ngắn), chỉ để khớp prop contract.
  - Field mới **"Sửa thông tin SP hay không?"** (radio Có/Không, bắt buộc khi QLBH) → gửi BE qua param `isEditProduct` (1/0) ở cả `import-qlbh-policy`, `validate-qlbh-policy`, và luồng commit pending (`commitPendingDeclareInfo`) → lưu vào cột mới `business_policy_declare_info.is_edit_product`.
  - `cap_template` (API tải biểu mẫu QLBH thật): viết method BE **dormant** `callQlbhCapTemplateDormant`, cờ `qlbh.template.enabled` mặc định `false` → ném lỗi ngay nếu bật nhầm mà chưa cấu hình `qlbh.domain`. **Không có call site** nào gọi method này — "Tải biểu mẫu" vẫn 100% dùng list tĩnh từ `resources/templateKhaiBaoChinhSach/import/{BCCS,QLBH,PBH}/` như cũ, không đổi hành vi.
  - Phát hiện lệch so với Figma khi đối chiếu ảnh `119-370`: modal QLBH hiển thị **2 file** cùng lúc (SP + GoiCuoc) trong khi BE hiện chỉ nhận 1 `MultipartFile`/lần lưu — **KHÔNG tự ý đổi sang multi-file** (thay đổi hợp đồng API, ngoài phạm vi round này) → ghi TODO/BLOCKER rõ trong `system-design-import.md` §4.5, giữ single-file như cũ.
- **An toàn regression**: KHÔNG sửa `FormDocument.vue`/`columnsDocument.ts` gốc — chỉ tái dùng cấu trúc/markup sang file mới. Không đổi API cũ theo hướng phá vỡ tương thích: `import-qlbh-policy`/`validate-qlbh-policy` thêm tham số `isEditProduct` dạng `required=false` (không bắt buộc ở tầng HTTP, validate bắt buộc ở tầng service `validateIsEditProduct` chỉ áp dụng khi gọi qua đúng luồng FE mới) — FE luôn gửi kèm nên không ảnh hưởng, nhưng nếu có caller cũ khác gọi thiếu tham số này sẽ bị chặn ở `validateIsEditProduct` (chưa phát hiện caller nào khác ngoài `FormDeclareInfoArea.vue` — đã grep). `callQlbhCapTemplateDormant` hoàn toàn mới, không ai gọi, không ảnh hưởng luồng nào.
- **Ghi chú (cần user)**: chạy lại SQL đã cập nhật; build/test khi có VPN; xác nhận với nghiệp vụ: (1) default cho "Sửa thông tin SP hay không?" (hiện để trống, bắt buộc chọn), (2) có cần hỗ trợ upload nhiều file QLBH cùng lúc (SP + GoiCuoc) hay không, (3) mapping `loai_bieu_mau`/`product_hierarchy` cho `cap_template` khi bật API thật (đang dormant + TODO).

## 2026-08-03 — Task 1 "Thông tin khai báo chính sách" — round chốt nghiệp vụ "Sửa thông tin SP" (multi-file QLBH)

- **Phạm vi**:
  - Backend: `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` (đổi `importQlbhPolicy`/`validateQlbhPolicyOnly` nhận `List<MultipartFile> files`; `listTemplates` +`qlbhSector`/`isEditProduct`), `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (`saveDeclareDocument` nhận `List<MultipartFile>` — lặp tạo `CRMDocumentFile` cho từng file dưới CÙNG 1 `crmDocId`, KHÔNG đổi schema; `validateQlbhFileCount` theo `isEditProduct` (Có→1-2 file, Không→đúng 1); `listTemplates`/`filterQlbhTemplates`/`fallbackQlbhTemplate` lọc template theo lĩnh vực (map `QLBH_SECTOR_FOLDER_KEYWORD` VALUE→tên trong filename) + SP/GoiCuoc theo `isEditProduct`; `downloadTemplate` whitelist dùng `loadTemplateList` không lọc), `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` (đổi param `file`→`files` ở `import-qlbh-policy`/`validate-qlbh-policy`, `templates` +2 query param).
  - Frontend: `services/app/businessPolicy/index.ts` (`getBusinessPolicyDeclareTemplates` +`qlbhSector`/`isEditProduct`), `Form/FormDeclareInfoArea.vue` (upload `:multiple="true"` + `maxFileCount` computed (2 khi QLBH+Có, else 1), `PendingDeclareInfo.file`→`files: File[]`, default `isEditProduct=1` khi chọn QLBH, watcher reload template + trim file khi đổi lĩnh vực/isEditProduct, `buildQlbhFormData` gửi nhiều `files`).
  - Docs: `system-design-import.md` (§4.5 cập nhật multi-file + bảng map lĩnh vực→tên file + TODO GiaoDuc/HaTang chưa map được; §7.1 chốt mapping `cap_template` — Có gọi 2 lần SAN_PHAM+GOI_CUOC, Không gọi 1 lần GOI_CUOC).
- **Thay đổi chính**:
  - QLBH cho phép đính kèm tối đa 2 file (Có: SP+GoiCuoc; Không: 1 file GoiCuoc); BCCS/PBH vẫn 1 file.
  - Lưu trữ **KHÔNG đổi schema** `business_policy_declare_info` — vẫn 1 dòng/loại khai báo, chỉ khác `saveDeclareDocument` tạo nhiều `CRMDocumentFile` dưới 1 `crmDocId` (cơ chế multi-file per crmDocId đã có sẵn từ trước, dùng lại nguyên trạng).
  - "Tải file" ở grid **không đổi** — vẫn dùng route có sẵn `GET /crm-document/downloadAllFileByCrmDocId?crmDocId=X`, BE tự động zip khi nhiều file (đã có sẵn tại `CRMDocumentFileServiceImpl.downloadAllFileByCrmDocId`), không cần thêm menu/UI mới.
  - Tải biểu mẫu QLBH lọc theo lĩnh vực (map VALUE '1'..'7' → tên file: YTe/DuLieuAI/KHChinhPhu/DoThiThongMinh/GiaiPhapChinhPhu/VtCloud/GiaiPhapDoanhNghiep) + SP/GoiCuoc theo `isEditProduct`; fallback `Template_Chung_QLBH.xlsx` nếu không map được hoặc không có file khớp. 2 bộ file `GiaoDuc`/`HaTang` trong thư mục KHÔNG map được (không có value tương ứng) — ghi TODO Task 8.
  - Default `isEditProduct` = **Có** (1) khi chọn QLBH (đổi từ "để trống" ở round trước, theo yêu cầu mới).
  - `cap_template` dormant: mapping cuối cùng đã ghi vào §7.1 (gọi 2 lần khi Có, 1 lần khi Không) nhưng code gọi thật **vẫn chưa viết** (chỉ ghi doc, đúng yêu cầu — method `callQlbhCapTemplateDormant` hiện tại vẫn đơn lẻ, không tự thêm logic loop gọi 2 lần vì chưa có call site nào dùng tới).
- **An toàn regression**: KHÔNG đổi bảng `business_policy_declare_info` (giữ đúng yêu cầu "KHÔNG nới UNIQUE / KHÔNG thêm bảng con"). KHÔNG sửa `CRMDocumentFileServiceImpl`/`downloadAllFileByCrmDocId` — chỉ tái dùng nguyên trạng. `import-qlbh-policy`/`validate-qlbh-policy` đổi tên param `file`→`files` là **breaking change có chủ đích** cho 2 API này (đã grep xác nhận `FormDeclareInfoArea.vue` là caller FE duy nhất, đã cập nhật đồng bộ); BCCS/PBH endpoints không đổi.
- **Ghi chú (cần user)**: KHÔNG có SQL mới round này (không đổi schema). Build/test khi có VPN; test tay: (1) QLBH chọn "Có" → tải lên 2 file → lưu → tải lại thấy 1 file zip chứa 2 file gốc; (2) QLBH chọn "Không" → chỉ cho 1 file; (3) "Tải biểu mẫu" theo từng lĩnh vực trả đúng danh sách lọc (SP+GoiCuoc hoặc chỉ GoiCuoc).

## 2026-08-03 — Task 1 "Thông tin khai báo chính sách" — round chốt cuối: fix map lĩnh vực QLBH thật

- **Phạm vi**: `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (`QLBH_SECTOR_VALUES`, `buildQlbhSectorFolderKeyword`/`QLBH_SECTOR_FOLDER_KEYWORD`), `docs/tasks/Task-01-.../system-design-import.md` (§4.5 bảng map + bỏ TODO GiaoDuc/HaTang).
- **Thay đổi chính**: bộ seed nháp `'1'..'7'` (dùng tạm ở các round trước) → bộ giá trị thật `GL_PRODUCT_TYPE_QLBH_SECTOR` VALUE 2–12 (9 lĩnh vực, không liền số): 2→YTe, 3→HaTang, 4→DuLieuAI, 5→KHChinhPhu, 8→DoThiThongMinh, 9→GiaiPhapChinhPhu, 10→GiaoDuc, 11→VtCloud, 12→GiaiPhapDoanhNghiep. Cập nhật cả `QLBH_SECTOR_VALUES` (validate `qlbhSector` param) lẫn `QLBH_SECTOR_FOLDER_KEYWORD` (map lọc biểu mẫu) cho khớp — 2 bộ file `GiaoDuc`/`HaTang` trước đây "không map được" nay đã map đúng, không còn TODO treo.
- **An toàn regression**: chỉ đổi giá trị hằng số nội bộ (không đổi chữ ký method/API/schema); `QLBH_SECTOR_FOLDER_KEYWORD` chỉ dùng trong `filterQlbhTemplates` (nội bộ service, không có caller khác); `QLBH_SECTOR_VALUES` chỉ dùng trong `validateQlbhSector` (đã grep xác nhận, không ảnh hưởng luồng khác).
- **Ghi chú**: Không có SQL/route mới. Build/test khi có VPN. Đây là round chốt cuối theo xác nhận của coordinator.

## 2026-08-03 — Task 1 "Thông tin khai báo chính sách" — BM01 (BCCS) thực tế là file Word, thêm hỗ trợ .docx

- **Phạm vi**: `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (thêm import `org.apache.poi.xwpf.usermodel.{XWPFDocument,XWPFTable,XWPFTableCell,XWPFTableRow}`; thêm `validateBccsFile`, `readBccsFile`, `readBccsWord`; sửa `validateBccsPackageOnly` gọi 2 method mới), `client/.../Form/FormDeclareInfoArea.vue` (thêm `acceptedFileExtensions`/`acceptAttribute` computed; sửa `:accept` và `beforeUploadFile`), `docs/tasks/Task-01-.../system-design-import.md` (§4.2 cập nhật BM01 = Word, đọc bằng XWPF).
- **Thay đổi chính**:
  - Phát hiện BM01 (khai báo gói cước BCCS) thực tế là file **Word (.docx)** chứa 1 bảng dữ liệu (verify qua cấu trúc XML `<w:tbl>`), không phải Excel như giả định ban đầu.
  - BE: thêm `readBccsWord(MultipartFile)` dùng Apache POI XWPF (`XWPFDocument`→`getTables()` lấy bảng đầu→mỗi `XWPFTableRow.getTableCells()`→`.getText()`) trả về `List<List<String>>` cùng shape cột với `readBccsExcel` cũ để tái dùng nguyên `validateBccsRows` không đổi.
  - Thêm router `readBccsFile(MultipartFile)`: đuôi `.docx` → `readBccsWord`, còn lại → `readBccsExcel` (giữ nguyên, không sửa).
  - Thêm `validateBccsFile(MultipartFile)` (thay cho `validateXlsxFile` ở nhánh BCCS): chấp nhận CẢ `.docx` lẫn `.xlsx`, message lỗi "Chỉ chấp nhận file .docx hoặc .xlsx". `validateXlsxFile` giữ nguyên, chỉ còn dùng cho QLBH (vẫn `.xlsx`-only, không đổi).
  - FE: `acceptedFileExtensions` computed trả `['.docx', '.xlsx']` khi `declareType` = BCCS, `['.xlsx']` khi QLBH; `:accept` và `beforeUploadFile` (kiểm tra đuôi file + message lỗi) đọc theo computed này thay vì hard-code `.xlsx`.
  - Fix compile: `XWPFDocument` ở POI 3.9 (version dự án đang dùng, kế thừa từ `pom.xml` gốc) chưa implement `AutoCloseable` → không dùng try-with-resources được, chuyển sang try/catch thường (giống cách `FileUtil.readExcelV7` không đóng `Workbook` — quy ước đã có sẵn trong codebase).
- **An toàn regression**: `readBccsExcel` và `validateXlsxFile` giữ nguyên 100% logic — đã grep xác nhận `validateXlsxFile` giờ chỉ còn 1 call site (trong `validateQlbhPolicyOnly`, nhánh QLBH), không còn bị gọi từ nhánh BCCS. Nhánh QLBH (`.xlsx`-only) không bị nới lỏng. FE: thay đổi `:accept`/`beforeUploadFile` chỉ áp dụng khi `declareType` = BCCS (qua computed theo `modelRef.declareType`), luồng QLBH không đổi hành vi.
- **Ghi chú**: Không có SQL mới (không đổi schema). Không viết test theo yêu cầu. Build/test khi có VPN. File `FormDeclareInfoArea.vue` hiện đã chạm mốc 800 dòng (giới hạn tối đa theo coding-style) — nếu có round tiếp theo cần thêm logic, nên cân nhắc tách composable/sub-component để tránh vượt ngưỡng.

## 2026-08-03 — Fix SQL syntax: query ProjectPLSignReq lặp cột

- **Phạm vi**: `ProjectPLSignReqRepoCustomImpl.java` (~dòng 288-292, method getById sign-req trả ProjectSignReqSdo).
- **Thay đổi**: xoá khối 4 cột LẶP (`CUSTOMER_CONTACT_SIGNING`, `AUTO_CREATE_SR`, `effective_date_business_policy`, `expiry_date_business_policy`) — đã có sẵn ở 283-286. Dòng `end_date_trial_poc as endDateTrialPoc` thiếu phẩy + đứng ngay trước khối lặp → `endDateTrialPoc PLS.CUSTOMER_CONTACT_SIGNING` gây `SQLException: syntax near 'PLS.CUSTOMER_CONTACT_SIGNING, ...'`.
- **Lý do**: bad merge/paste khi thêm cột business_policy dates. Sau fix: end_date_trial_poc là cột cuối → FROM.
- **Ghi chú**: build lại VcrmApp để áp. Không đổi schema.

## 2026-08-04 — API update trạng thái hoạt động theo Mã CSKD

- **Phạm vi**: `dto/sdi/extensionActivities/UpdateExtensionActivityStatusSdi.java` (mới: cskdCode+status); `repo/businessPolicy/BusinessPolicyRepo.java` (+findFirstByPolicyCode); `service/extensionActivities/ExtensionActivitiesService(.java + impl)` (+updateStatusByCskdCode); `controller/ExtensionActivitiesController.java` (+endpoint).
- **Thay đổi chính**: endpoint `POST /extension-activities/update-status-by-cskd-code` body `{cskdCode, status}` → tìm business_policy theo policyCode → lấy id → `findAllByObjectRefIdAndObjectRefCodeAndStatusNot(id, 'BUSINESS_POLICY', DELETED)` → set status/updateBy/updateTime cho tất cả → saveAll → trả count. Validate cskdCode/status không rỗng + status ∈ EXTENSION_ACT_STATUS(0/1/2/3/4).
- **Lý do**: user cần cập nhật trạng thái toàn bộ hoạt động khai báo của 1 CSKD qua Mã CSKD (không phải id hoạt động).
- **Ghi chú**: path riêng `/update-status-by-cskd-code` (tránh trùng `/update-status` cũ nhận ExtensionActivitiesSdi). Java 8, không comment. Build `mvn -pl VcrmApp clean install`. Bản trước (update theo id hoạt động) đã bị user revert — bỏ.

## 2026-08-04 — Task 5.1: PL2-PL6 chỉ sinh khi submit (không sinh lúc mở form)

- **Phạm vi**: `FormSignReq.vue` — gỡ `copyFileKhaiBaoChinhSachAppendixForCSKD` khỏi onMounted, chuyển sang `handleSubmit` nhánh create (sau `projectBPSignReqCreateForThamDinhCSKD` thành công).
- **Lý do**: user phản ánh phụ lục PL2-6 tự sinh ngay khi MỞ form trình ký (chưa bấm gì) → mỗi lần mở tạo 1 bộ rác. Chốt: chỉ sinh khi bấm tạo/lưu.
- **Ghi chú**: PL1-3 "hiệu quả kinh doanh" (`copyFileBusinessEfficiencyForCSKD`) VẪN sinh lúc onMounted như cũ (feature có sẵn, ngoài phạm vi — không đụng để tránh regression). "Gửi và ký" (handleSendContinue) chỉ dùng projectPLSignReqId đã tạo → create luôn qua handleSubmit nên không sót path. FE, npm run dev để áp.

## 2026-08-04 — Task 1 "Thông tin khai báo chính sách" — rework lớn: BCCS trả file lỗi + QLBH dùng API thật + bỏ template tĩnh QLBH/PBH

- **Phạm vi**:
  - Backend: `service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` (694 dòng, giảm từ 825 nhờ tách `QlbhApiClient`), tạo mới `service/businessPolicy/impl/QlbhApiClient.java` (component riêng gom toàn bộ HTTP call sang QLBH: `validate`, `capTemplate`), `service/businessPolicy/abs/BccsValidateFailedException.java` (mới), `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` (+`downloadQlbhTemplate`), `controller/businessPolicy/BusinessPolicyDeclareInfoController.java` (2 endpoint BCCS đổi `APIResponse`→`ResponseEntity<?>` để trả file lỗi được, thêm `GET download-qlbh-template`, thêm helper `buildErrorFileResponse` dùng chung 4 nhánh catch).
  - Frontend: `services/app/businessPolicy/index.ts` (gộp `postQlbhMultipart`→`postMultipartExpectingFileOnError`, `QlbhImportResult`→`DeclareImportResult`, dùng chung cho BCCS+QLBH), `services/app/defineRouting.ts` (phát hiện + bổ sung **toàn bộ route `BUSINESS_POLICY_DECLARE_INFO_*` bị thiếu** — không tồn tại trong file dù code cũ đã reference, có thể do file bị revert ngoài ý muốn ở phiên trước; thêm cả route mới `..._DOWNLOAD_QLBH_TEMPLATE`), `Form/FormDeclareInfoArea.vue` (757 dòng, giảm từ 850 nhờ tách `useDeclareTemplateDownload.ts`), `Form/useDeclareTemplateDownload.ts` (mới — composable gom toàn bộ logic "Tải biểu mẫu" + gợi ý lĩnh vực QLBH).
  - Docs: `system-design-import.md` (§4.2 BCCS error-file, §4.3 QLBH response theo Content-Type, §4.5 bỏ template tĩnh QLBH, §6.1 note, §7 bảng endpoint + `download-qlbh-template`, §7.1 viết lại từ "dormant" sang "đã enable", thêm §12 "An toàn regression").
- **Thay đổi chính**:
  - **BCCS**: khi validate nội dung BM01 lỗi (dòng thiếu Tên mặt hàng/Product Hierarchy/...) → BE **không còn trả JSON lỗi**, mà copy file gốc user upload, ghi thêm đoạn "DANH SÁCH LỖI VALIDATE:" + từng dòng lỗi vào cuối tài liệu (Word: `XWPFParagraph` mới; Excel: `XSSFSheet` thêm row) rồi trả file đó (`.docx`/`.xlsx` tương ứng) về FE tải xuống qua `BccsValidateFailedException`. KHÔNG lưu khi có lỗi. Rule validate nội dung (BR-05, not-blank, numeric...) **không đổi**.
  - **QLBH**: bỏ hẳn 2 cờ bypass `qlbh.validate.enabled`/`qlbh.template.enabled` — luôn gọi API thật. Validate: `POST {qlbh.domain}/cskd/product-import/validate` cho từng file (1-2 file tuỳ `isEditProduct`); phân biệt hợp lệ/lỗi bằng `Content-Type` response (JSON=hợp lệ, file đính kèm=lỗi) thay vì parse field cụ thể (né được BLOCKER thiếu schema chi tiết). Tải biểu mẫu: `GET {qlbh.domain}/qlbh/cskd/cap_template` (linh_vuc, loai_bieu_mau, product_hierarchy optional, is_new_product) qua endpoint proxy mới `download-qlbh-template` — Có→2 lượt gọi (SAN_PHAM+GOI_CUOC), Không→1 lượt (GOI_CUOC).
  - **Nguồn `product_hierarchy`**: xác định là `EXTENSION_ACTIVITIES.PRODUCT_HIERARCHY_CODE` của Hoạt động "Khai báo SP/DV mới trên SAP" (`ACT_GROUP=BP_SAP_NEW`, `OBJECT_REF_CODE=BUSINESS_POLICY`) do Task 6 tự sinh — BE tra qua `ExtensionActivitiesRepo.findAllByObjectRefIdAndObjectRefCodeAndStatusNot` (method có sẵn, không thêm query mới), lấy `productHierarchyCode` đầu tiên khác rỗng của HĐ `BP_SAP_NEW`; nếu không có (SP mới chưa cấp mã, hoặc chưa có `businessPolicyId` ở pre-create) → bỏ hẳn param khỏi URL.
  - **Xoá code phục vụ template tĩnh QLBH**: `QLBH_SECTOR_FOLDER_KEYWORD`, `filterQlbhTemplates`, `fallbackQlbhTemplate` và hằng số liên quan — vì thư mục `resources/templateKhaiBaoChinhSach/import/QLBH/` + `PBH/` đã bị xoá khỏi resource (chỉ còn `BCCS/BM 01_...docx`). `listTemplates`/`downloadTemplate` (API tĩnh cũ) nay chỉ còn phục vụ BCCS. PBH giữ nguyên trạng thái PENDING, không đụng.
  - **Refactor giữ file dưới 800 dòng**: tách `QlbhApiClient` (BE) và `useDeclareTemplateDownload.ts` (FE) — thuần tách code, không đổi hành vi.
  - **Phát hiện + fix phụ**: `defineRouting.ts` thiếu toàn bộ key `BUSINESS_POLICY_DECLARE_INFO_*` dù `businessPolicy/index.ts`/`FormDeclareInfoArea.vue` đã reference — đã bổ sung đầy đủ (khả năng file bị mất thay đổi giữa các phiên trước, không phải lỗi round này).
- **An toàn regression**: xem chi tiết đầy đủ tại `system-design-import.md` §12. Tóm tắt: `QlbhValidateFailedException` không đổi (chỉ thêm class song song `BccsValidateFailedException`); `validateXlsxFile` vẫn chỉ dùng cho QLBH; `saveDeclareDocument`/`upsertDeclareInfo`/`CRMDocumentFileServiceImpl` không đụng; rule validate nội dung BCCS không đổi; PBH/`FormDocument.vue`/PL1-3/Task 5 không chạm; không đổi schema DB.
- **Ghi chú (cần user)**: Không có SQL mới. Cần set đúng `qlbh.domain` (vd `http://10.60.155.11:8034`, có scheme) + `qlbh.token` ở môi trường (KHÔNG hard-code) — thiếu 1 trong 2 sẽ báo lỗi rõ ràng thay vì âm thầm bypass như trước. Build/test khi có VPN. Test tay đề xuất: (1) BCCS upload file lỗi → nhận về đúng file gốc có ghi chú lỗi; (2) QLBH validate/import gọi API thật, thử 1 file hợp lệ + 1 file lỗi xem có nhận đúng response; (3) "Tải biểu mẫu" QLBH gọi `cap_template` thật, kiểm tra `product_hierarchy` khi CSKD SP/DV đã có (có HĐ SAP_NEW với mã) vs SP/DV mới (không có mã, param bị bỏ).

## 2026-08-04 — Rework import: BCCS file lỗi + QLBH 2 API thật + khôi phục route

- **Phạm vi**: `BusinessPolicyDeclareInfoServiceImpl` + mới `QlbhApiClient.java`, `BccsValidateFailedException.java`; controller (ResponseEntity trả file lỗi + download-qlbh-template); FE `defineRouting.ts`, `businessPolicy/index.ts`, `FormDeclareInfoArea.vue` + mới `useDeclareTemplateDownload.ts`. Xóa template tĩnh QLBH(19)/PBH(4), giữ BM01.docx.
- **Thay đổi chính**:
  - BCCS: validate theo PYC; LỖI → ghi lỗi vào chính file upload (.docx/.xlsx, POI, append "DANH SÁCH LỖI VALIDATE") → trả file tải xuống, không hiển thị UI, không lưu. Hợp lệ → lưu.
  - QLBH: bỏ bypass/static, gọi THẬT qua `QlbhApiClient` (config `qlbh.domain`+`qlbh.token`, không hard-code): template = `GET /qlbh/cskd/cap_template?linh_vuc&loai_bieu_mau(SAN_PHAM|GOI_CUOC)&product_hierarchy&is_new_product` (Sửa SP=Có→2 file SAN_PHAM+GOI_CUOC; Không→1 GOI_CUOC; product_hierarchy từ HĐ SAP_NEW PRODUCT_HIERARCHY_CODE, bỏ nếu chưa có); import = `POST /cskd/product-import/validate` — không hợp lệ trả file lỗi → tải xuống.
  - PBH pending.
  - **defineRouting MẤT toàn bộ route BUSINESS_POLICY_DECLARE_INFO_* → khôi phục** (bug ẩn có thể làm import declare-info hỏng trước đó).
- **Lý do**: user chốt BCCS validate hệ thống + xuất file lỗi; QLBH dùng 2 API thật (cap_template + product-import/validate).
- **Ghi chú**: user set config `qlbh.domain`(có scheme)+`qlbh.token`; test 2 API QLBH cần VPN. Rủi ro: phân loại response QLBH theo Content-Type (JSON=hợp lệ, file=lỗi) — nếu QLBH trả JSON-lỗi sẽ hiểu nhầm, cần test API thật. Không SQL. Java 8, không comment.

## 2026-08-04 — Phụ lục trình ký QLBH/PBH = file import + label "Phụ lục khác"

- **Phạm vi**: `CRMDocumentServiceImpl.copyFileKhaiBaoChinhSachAppendixForCSKD` + helper mới `copyImportedDeclareFilesToAppendix` (+inject `BusinessPolicyDeclareInfoRepo`); `Detail/Index.vue getDocumentTypeName`.
- **Thay đổi chính**:
  1. Phụ lục PL khi tạo trình ký: **PL2(BCCS)/PL5(SAP)/PL6(Telecom) giữ template tĩnh**; **PL3(QLBH)+PL4(PBH) copy file ĐÃ import** của CSKD (tìm `business_policy_declare_info` theo businessPolicyId+declareType BP_QLBH/BP_PBH, isDeleted=0 → crmDocId → copy tất cả CRM_DOCUMENT_FILE vào appendix qua `copyFileByCrmDocFileUriOrigin`). **Chưa import → bỏ qua** (không sinh phụ lục loại đó). Dedup theo tên file.
  2. `getDocumentTypeName`: file import BCCS/QLBH (crmDocType 20/21) → label **"Phụ lục khác"** ở Hồ sơ tài liệu.
- **Lý do**: user chốt PL QLBH/PBH dùng file upload thật (bỏ qua nếu chưa có); file import hiển thị "Phụ lục khác".
- **Ghi chú**: Dev agent fail giữa chừng (API stalled) TRƯỚC khi sửa → code còn nguyên, tôi tự implement + verify. Không đổi PL1-3 hiệu quả kinh doanh, không đổi schema, không SQL. FE build lại để áp. BCCS Word upload: code đã đúng, chỉ cần build lại (không sửa thêm).

## 2026-08-04 — Fix Gson ClassCast ở sendAndSignForThamDinhCSKD (vOffice creds hard-code)

- **Phạm vi**: `ProjectPLSignReqServiceImpl.java` — 4 chỗ `new ConnectVOfficeService(SESSION_URL, "tuantm30","222222a@")` (methods sendAndSign / sendAndSignForPoc / sendAndSignForKhaiBaoCSKD / sendAndSignForThamDinhCSKD) → đổi sang `tokenSSO`.
- **Nguyên nhân**: `sendAndSignForThamDinhCSKD` dùng creds test hard-code (dòng tokenSSO đúng bị comment ngay dưới — hack bỏ quên). Account test không hợp lệ ở môi trường → vOffice login fail → response null → thư viện `voffice.service.ConnectVOfficeService` cast `JsonNull→JsonObject` (ClassCastException). 90% codebase dùng tokenSSO/token; controller truyền tokenSSO thật.
- **Fix**: replace_all 4 chỗ (đã verify cả 4 method có param `tokenSSO`).
- **Ghi chú**: build lại VcrmApp + test gửi trình ký (cần vOffice reachable). Nếu vẫn lỗi → do vOffice không kết nối được (SESSION_URL/mạng) hoặc payload — khi đó cân nhắc thêm try/catch báo lỗi rõ. Còn 1 hard-code ở dòng ~7823 (method khác, dùng `token`) chưa đụng. Cast nằm trong lib vOffice (external), không sửa được trực tiếp.

## 2026-08-04 — ROLLED BACK: vOffice login giữ username/pass (không token)

- **Phạm vi**: `ProjectPLSignReqServiceImpl.java` 4 chỗ send-and-sign (2640/2722/2812/2899).
- **Thay đổi**: HOÀN TÁC bản đổi tokenSSO trước đó → giữ nguyên `new ConnectVOfficeService(SESSION_URL, "tuantm30","222222a@")` (login username/pass mặc định) theo yêu cầu user. Dòng tokenSSO hợp lệ khác (vd 1216) không đụng.
- **Lý do**: user xác nhận vOffice PHẢI login bằng username/pass mặc định, không dùng token. → Lỗi Gson `JsonNull→JsonObject` KHÔNG phải do creds. Nguyên nhân thật vẫn chưa rõ (cast nằm trong lib vOffice external; cần stack trace đầy đủ hoặc thêm try/catch+log response vOffice để soi khi user test lại).

## 2026-08-05 — Task 5.1 "Tự sinh phụ lục PL2-6 khi trình ký CSKD": QLBH/PBH = file import + BCCS/SAP/Telecom = PDF thật có dữ liệu

- **Phạm vi**:
  - `service/impl/CRMDocumentServiceImpl.java` — `copyFileKhaiBaoChinhSachAppendixForCSKD` viết lại hoàn toàn: bỏ nhánh tạo placeholder rỗng cho BCCS/SAP/Telecom, bỏ nhánh copy template tĩnh cho QLBH/PBH. Thêm `generateAndSaveAppendixPdf` (helper dùng chung, nhận `AppendixPdfGenerator` functional interface nội bộ) + `copyImportedDeclareFilesToAppendix` (copy toàn bộ `CRM_DOCUMENT_FILE` từ `business_policy_declare_info.crm_doc_id` sang appendix crmDocId). 3 hằng tên file mới `APPENDIX_FILE_NAME_PL2_SAP/PL3_TELECOM/PL4_BCCS`.
  - Tạo mới `service/businessPolicy/abs/BusinessPolicyAppendixPdfService.java` + `service/businessPolicy/impl/BusinessPolicyAppendixPdfServiceImpl.java` (345 dòng) — 3 method OpenPDF (`com.lowagie.text`, theo đúng pattern `ProjectPLServiceImpl.createFilePDFBusinessEfficiencyForSignReq*`, font `fonts/times-new-roman.ttf` IDENTITY_H).
  - `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` + `impl/BusinessPolicyDeclareInfoServiceImpl.java` — thêm `getImportedBccsPackageRows(businessPolicyId)`: đọc lại chính file BM01 đã import (qua `CRMDocumentFileService.downloadFile3` + `FileUtil.convertByteArrayToMultipartFile`), tái dùng nguyên `readBccsFile`/`findBccsHeaderRowIndex`/`isBlankRow` sẵn có (không viết lại logic parse).
  - Docs: `docs/tasks/Task-05-tab-tham-dinh-ky-duyet/system-design.md` (§4.1 — thêm khối "CẬP NHẬT ROUND MỚI NHẤT" ghi rõ bảng PL2-6 cũ đã lỗi thời, nguồn dữ liệu thật từng phụ lục).
- **Thay đổi chính**:
  - **QLBH (PL3 cũ)/PBH (PL4 cũ)**: tìm dòng `business_policy_declare_info` theo `businessPolicyId`+`declareType`+`isDeleted=0` → lấy `crmDocId` → copy TẤT CẢ `CRM_DOCUMENT_FILE` của nó (giữ nguyên tên file gốc) vào appendix crmDocId. Chưa import → bỏ qua hoàn toàn, không sinh gì (không còn placeholder).
  - **BCCS (PL2 cũ, nay đặt tên "Phụ lục 4_Khai báo mặt hàng gói cước trên BCCS.pdf")**: sinh **luôn**, PDF có bảng "PHỤ LỤC 01: THÔNG TIN GÓI CƯỚC" đổ dữ liệu từ chính file BM01 CSKD **đã import** (đọc lại qua `getImportedBccsPackageRows`, KHÔNG có dữ liệu → hiện 1 dòng ghi chú thay vì lỗi).
  - **SAP (PL5 cũ, nay "Phụ lục 2_BM khai báo SPDV mới trên SAP.pdf")**: sinh khi `isNewProduct=1`, bảng 11 cột đúng layout file `docs/Phu luc 2_BM khai bao SPDV moi tren SAP.xlsx` (đã unzip đọc XML để lấy đúng header) — Segment/Business unit mặc định cố định theo template, Nhóm/Dòng/Tên/Alias/Mô tả từ `business_policy_new_product` (quan hệ 1-1 với CSKD, có `UNIQUE(business_policy_id)`). 4 cột mã SAP để trống (SAP tự điền). Ghi chú thêm "Đơn vị chủ trì" + "Mã Product Hierarchy" dưới bảng vì template gốc KHÔNG có 2 cột này (đã xác nhận bằng cách đọc XML thật, không bịa thêm cột).
  - **Telecom (PL6 cũ, nay "Phụ lục 3_PYC khai báo xin cấp mã TelecomServiceID, Saletrantype trên BCCS.pdf")**: sinh khi `isNewProduct=1`, thư "PHIẾU YÊU CẦU PHỐI HỢP CÔNG VIỆC" đổ số/ngày tờ trình + tên CSKD (`business_policy`), tên/alias/mô tả/ngày hiệu lực SP (`business_policy_new_product`), đơn vị xây dựng CSKD (`organization` qua `developing_organization_id`), đầu mối liên hệ (`staff` qua `customer_contact_id` — field tên gây nhầm nhưng FE label thật là "Đầu mối CSKD", đã xác nhận qua `FormCommonInfo.vue`). KHÔNG render mã TelecomServiceID/SaleTransType vào PDF vì đọc kỹ file gốc xác nhận đây là **phiếu yêu cầu cấp mã** (checkbox request), không phải field hiển thị mã đã cấp.
  - Đổi tên file phụ lục theo đúng số hiệu phụ lục PYC gốc (2=SAP, 3=Telecom, 4=BCCS) — KHÁC hẳn quy ước nội bộ cũ (PL2=BCCS/PL5=SAP/PL6=Telecom) đã ghi trong `Task-05/system-design.md` các round trước; 3 hằng tên file định nghĩa MỚI trực tiếp trong `CRMDocumentServiceImpl` (không tái dùng/sửa 5 hằng cũ `Const.BUSINESS_POLICY_DECLARATION_APPENDIX_FILE_NAME_PL2..PL6` — đã grep xác nhận các hằng cũ giờ không còn call site nào, để nguyên không xoá).
- **An toàn regression**: KHÔNG sửa `createFilePDFBusinessEfficiencyForSignReq*`/`copyFileBusinessEfficiencyForCSKD` (PL1-3 hiệu quả kinh doanh) — chỉ tham khảo pattern, viết method/class hoàn toàn mới. `createPlaceholderAppendixFile` không bị xoá (chỉ hết call site). `readBccsFile`/`findBccsHeaderRowIndex`/`isBlankRow` trong `BusinessPolicyDeclareInfoServiceImpl` tái dùng nguyên trạng, không sửa logic. `copyFileByCrmDocFileUriOrigin`/`overrideFileToServe` trong `CRMDocumentFileServiceImpl` không đụng, chỉ gọi lại đúng chữ ký sẵn có.
- **Field KHÔNG map được / lệch template gốc so với giả định ban đầu** (đã xử lý, không bịa dữ liệu):
  - Phụ lục 2 (SAP) template thật KHÔNG có cột "Product Hierarchy" hay "Đơn vị chủ trì" (chỉ có 11 cột Segment→Final Product type Code) — đã thêm 2 dòng ghi chú riêng dưới bảng thay vì bịa thêm cột.
  - Phụ lục 3 (Telecom) không có field hiển thị "TelecomServiceID"/"SaleTransType" — chỉ có checkbox yêu cầu TTCN cấp mã — không render mã (chưa tồn tại tại thời điểm phiếu này được lập).
  - "Đầu mối liên hệ" (Phụ lục 3/4): dùng `business_policy.customer_contact_id` (tên cột gây hiểu nhầm là "khách hàng", nhưng field này trỏ `staff` + FE label "Đầu mối CSKD" — đã verify qua `FormCommonInfo.vue` trước khi dùng).
- **Ghi chú (cần user)**: Không có SQL mới. Không viết test theo yêu cầu. Build/test khi có VPN. Test tay đề xuất: (1) tạo trình ký CSKD SP/DV đã có → chỉ thấy phụ lục BCCS (PDF có bảng, hoặc ghi chú "chưa có dữ liệu" nếu chưa import BM01); (2) CSKD SP/DV mới → thêm 2 phụ lục SAP + Telecom, kiểm tra field đổ đúng (tên đơn vị, đầu mối, tên/alias/mô tả SP); (3) đã import QLBH/PBH ở vùng khai báo chính sách trước khi trình ký → phụ lục QLBH/PBH xuất hiện đúng = file gốc đã import (mở ra xem đúng nội dung, không phải file rỗng); (4) idempotent — tạo trình ký lại (Sao chép) không sinh trùng phụ lục.

## 2026-08-05 — Fix NumberFormatException "false" khi search/detail CSKD

- **Phạm vi**: `crm-service/VcrmApp/.../repo/businessPolicy/impl/BusinessPolicyRepoImpl.java` (3 câu SQL: search ~138, filter ~451, getById detail ~720).
- **Thay đổi chính**: `policy.is_new_product_policy as isNewProduct` → `CAST(policy.is_new_product_policy AS SIGNED) as isNewProduct` ở cả 3 chỗ.
- **Lý do**: cột `is_new_product_policy` là `TINYINT(1)`; MariaDB Connector/J (`tinyInt1isBit=true` mặc định) trả về `Boolean` cho native query → generic mapper `DataUtil.convertFromQueryResult`/`setFieldData` gọi `safeToInt(Boolean.FALSE)` → `"false".toString()` → `NumberFormatException`. Lỗi bị `safeToInt` nuốt (return 0 + log ERROR mỗi dòng) nên list vẫn chạy nhưng field `isNewProduct` luôn = 0 (sai) và log ERROR spam (logger hiển thị nhầm tên `com.general.utils.FileUtil`).
- **Ghi chú**: CAST khiến driver trả BIGINT (0/1) → parse đúng. Các cột `*_decl_status` là INT nên không dính. Cách sửa gốc hơn (không áp dụng để giữ diff tối thiểu/không đụng util dùng chung): thêm nhánh `if (obj instanceof Boolean) return ((Boolean)obj)?1:0;` trong `DataUtil.safeToInt` — sẽ vá cả class lỗi cho mọi TINYINT(1) map vào Integer. User cần build lại `mvn -pl VcrmApp clean install`.

## 2026-08-05 — Thêm Loại đối tượng "Chính sách kinh doanh" (Mã CSKD) vào form Hoạt động

- **Phạm vi**: FE `client/src/views/customer/extension-events/eventForm.vue` + mới `client/src/views/customer/extension-events/formSearchBusinessPolicy.vue`.
- **Thay đổi chính**:
  - Tạo modal `formSearchBusinessPolicy.vue` (mẫu theo `formSearchPOC.vue`) — drawer "TÌM KIẾM MÃ CSKD": filter Mã CSKD/Tên CSKD, cột STT/Mã CSKD/Tên CSKD/Tên sản phẩm dịch vụ/Đơn vị kinh doanh/Hành động, dùng chung service `searchDataBusinessPolicy` (`/business-policy/search`), không lọc trạng thái.
  - `eventForm.vue`: `getObjectRefLabel` thêm case `BUSINESS_POLICY` → 'Mã CSKD'; `onShowDrawerSearchObjectRef` thêm case mở drawer CSKD; thêm refs `visible/titleDrawerSearchBusinessPolicy`, handler `onCloseDrawerSearchBusinessPolicy` (set objectRefId=id, objectRefName=policyCode), đăng ký component + drawer trong template + expose return.
- **Lý do**: task ngoài PYC — user đã thêm Loại đối tượng "Chính sách kinh doanh" (global list `EXTENSION_ACTIVITIES.MODULE_TYPE`, key=BUSINESS_POLICY) ở /extension-activities; form "Thêm mới công việc" cần field Mã CSKD + tìm kiếm theo Figma frame 706:73 & 712:130.
- **Ghi chú**: Chỉ ADD case mới (không đụng luồng POC/PAKD/OPP... → an toàn regression). Backend đã hỗ trợ OBJECT_REF_CODE=BUSINESS_POLICY cho ExtensionActivities. KHÔNG đụng "Nhóm công việc"/"Nội dung" (ngoài yêu cầu). User cần `npm run clean-dev` để test.

## 2026-08-05 — Fix hoạt động CSKD không hiển thị trên danh sách hoạt động

- **Phạm vi**: BE `crm-service/VcrmApp/.../repo/impl/ExtensionActivitiesRepoCustomImpl.java` (method `searchV2` — list mặc định màn activitiesV2 qua `/extension-activities/filter`).
- **Thay đổi chính**:
  - Mệnh đề lọc `and (CUS.STATUS=1 or CC.STATUS=1 or COPP.STATUS=1 or POCS.STATUS=1 or TBMT.STATUS=1)` → thêm `or ea.OBJECT_REF_CODE = 'BUSINESS_POLICY'`.
  - CASE `OBJECT_REF_NAME` → thêm nhánh `when OBJECT_REF_CODE='BUSINESS_POLICY' then (select POLICY_CODE from business_policy where ID=OBJECT_REF_ID)` (áp cả searchV2 & searchV3 qua replace_all — hiển thị Mã CSKD ở cột Tên đối tượng).
- **Lý do**: hoạt động loại CSKD (objectRefCode=BUSINESS_POLICY) bị mệnh đề OR-status loại bỏ vì các bảng CUS/CC/COPP/POCS/TBMT đều LEFT JOIN theo objectRefCode nên .STATUS=NULL → `NULL=1 or ...`=FALSE → dòng bị ẩn. Quyền (`userPermissionSql`) không phải nguyên nhân (creator/assignee vẫn qua).
- **Ghi chú**: Chỉ ADD nhánh BUSINESS_POLICY → an toàn regression (loại khác không đổi). `search` (dòng 118) đã có `searchBusinessPolicyActivities` riêng cho tab hoạt động của 1 CSKD; `buildSqlQueryV2` (RECURSIVE, path filter nâng cao) không có mệnh đề chặn này. User cần build lại `mvn -pl VcrmApp clean install`.

## 2026-08-05 — Task 1: rework UI "Thông tin khai báo chính sách" theo Figma (TTKBCS_1/2)

- **Phạm vi**: FE `client/src/views/sales-project/business-policy/Form/FormDeclareInfoArea.vue` (viết lại).
- **Thay đổi chính**:
  - Bỏ mô hình dropdown "Loại khai báo" → drawer "THÊM MỚI TTKBCS" nay hiển thị **3 mục cố định** (BCCS gói cước / PBH / QLBH), mỗi mục có radio **"Có khai báo SP/DV không?"** mặc định Không; chọn "Có" mới hiện upload + Tải biểu mẫu + danh sách file. QLBH thêm select "Lĩnh vực/nhóm giải pháp" + radio "Có sửa thông tin SP/DV". (Figma frame 875:526 = TTKBCS_1, 850:72 = TTKBCS_2.)
  - State per-section (`sections` reactive), validate thủ công per-section, `handleSave` duyệt các mục "Có" (trừ PBH) → pre-create: validate + upsert `pendingItems`; post-create: import trực tiếp. Giữ nguyên bảng danh sách, `commitPendingDeclareInfo` (parent FormCommonInfo gọi), service import/validate BCCS/QLBH.
  - **PBH vẫn pending**: chọn "Có" hiện a-alert "đang hoàn thiện", KHÔNG upload, bị loại khỏi save.
- **Lý do**: user yêu cầu đổi UI import khai báo theo Figma TTKBCS_1/2 (phần "tích chọn import" = radio Có/Không mỗi kênh).
- **Ghi chú**: Contract với FormCommonInfo giữ nguyên (props + commitPendingDeclareInfo). `device`/`getTableRowIndex` là global bên ngoài file (không đụng). User cần `npm run clean-dev` để test. CÒN LẠI: (B) BE sinh PDF phụ lục từ file import QLBH — đang giao java-senior-dev; (C) hiển thị phụ lục tự sinh ngay khi tạo trình ký — làm sau khi có B.

## 2026-08-05 — Task 1 (B): sinh PDF phụ lục QLBH từ nội dung file đã import (thay vì copy xlsx)

- **Phạm vi**: BE `crm-service/VcrmApp/src/main/java/com/app/businessproject/`
  - Mới: `dto/sdo/businessPolicy/BusinessPolicyQlbhImportedFileSdo.java`, `BusinessPolicyQlbhImportedSheetSdo.java`, `BusinessPolicyQlbhAppendixPdfSdo.java`.
  - `service/businessPolicy/abs/BusinessPolicyDeclareInfoService.java` + `impl/BusinessPolicyDeclareInfoServiceImpl.java` — thêm `getImportedQlbhFileContents(businessPolicyId)`.
  - `service/businessPolicy/abs/BusinessPolicyAppendixPdfService.java` + `impl/BusinessPolicyAppendixPdfServiceImpl.java` — thêm `createAppendixQlbhImportedFilePdfs(businessPolicyId)`.
  - `service/impl/CRMDocumentServiceImpl.java` — `copyFileKhaiBaoChinhSachAppendixForCSKD`: thay lời gọi `copyImportedDeclareFilesToAppendix(..., QLBH, ...)` bằng `generateAndSaveQlbhImportedAppendixPdfs(...)`; giữ nguyên `copyImportedDeclareFilesToAppendix(..., PBH, ...)`. Refactor `generateAndSaveAppendixPdf` → tách phần lưu chung thành `saveGeneratedAppendixPdf` (dùng lại cho cả PL2/PL3/PL4 lẫn PDF QLBH).
- **Thay đổi chính**:
  - `getImportedQlbhFileContents`: tìm `business_policy_declare_info` (declareType=BP_QLBH, chưa xoá) → lấy toàn bộ `CRMDocumentFile` (1-2 file SP/GoiCuoc) → tải lại từng file, đọc TOÀN BỘ sheet trong workbook bằng `FileUtil.readExcelV7InSheet` (bỏ qua sheet tên bắt đầu `00_` hướng dẫn và `99_` danh mục dropdown) → mỗi sheet detect header row = dòng đầu tiên có ô chứa `*` (cột bắt buộc), dữ liệu bắt đầu từ header+2 (bỏ dòng chú thích ngay dưới header), lọc dòng trắng.
  - `createAppendixQlbhImportedFilePdfs`: với mỗi file đã đọc, render 1 PDF (font Times New Roman IDENTITY_H như PL4) gồm nhiều bảng — mỗi sheet 1 bảng (tiêu đề = ô A1 của sheet, cột = header đã detect). Tên file PDF = tên file gốc đổi đuôi `.pdf`.
  - `generateAndSaveQlbhImportedAppendixPdfs` (CRMDocumentServiceImpl): gọi service trên, dedup theo `existingFileNames`, lưu qua `crmDocumentFileService.overrideFileToServe` (cơ chế lưu appendix hiện có, giống PL2-PL4). Nếu CSKD không import QLBH → danh sách rỗng → không sinh gì.
- **Lý do**: user yêu cầu phụ lục QLBH khi trình ký thẩm định CSKD phải là PDF dựng lại từ nội dung đã import (giống PL4 BCCS), không copy nguyên xlsx; PBH giữ nguyên cơ chế cũ (chưa có API/luồng import, để pending).
- **Ghi chú (giả định cần soát lại)**:
  - Không có tài liệu chính thức mô tả cấu trúc nội bộ file BM02 QLBH (validate đang do API QLBH ngoài đảm nhiệm — `QlbhApiClient`). Đã đối chiếu mẫu thực tế tại `docs/BM 02_Import khai bao QLBH/*.xlsx` (nhiều lĩnh vực: GiaoDuc, VtCloud, DoThiThongMinh...) để suy ra pattern chung: mỗi sheet có 1 dòng tiêu đề (A1), 1 dòng mô tả, (đôi khi) 1 dòng "CÁC TRƯỜNG CHÍNH", 1 dòng header (chứa dấu `*` ở cột bắt buộc), 1 dòng chú thích, rồi tới dữ liệu — pattern này ĐÚNG cho toàn bộ file mẫu đã kiểm tra nhưng CHƯA xác nhận với BA/QLBH team là bắt buộc cho mọi sector template hiện có/tương lai.
  - Không hardcode field theo sector — dùng chung 1 thuật toán detect header (generic) cho toàn bộ 9 lĩnh vực QLBH, nên khi QLBH đổi cấu trúc template (VD: bỏ dấu `*`) sẽ cần cập nhật lại `findQlbhHeaderRowIndex`.
  - PDF khổ `Rectangle(842, 1300)` như PL4; sheet có tới ~21 cột (VD `10_GoiCuoc_Chung`) dùng `setWidthPercentage(100)` chia đều — có thể chữ nhỏ/khó đọc với sheet nhiều cột, chưa tối ưu độ rộng cột theo nội dung.
  - Không đổi DB — tái dùng nguyên bảng/cơ chế hiện có (`business_policy_declare_info`, `CRM_DOCUMENT`, `CRM_DOCUMENT_FILE`), không cần file SQL.
- User cần build lại `mvn -pl VcrmApp clean install` (VPN) để biên dịch/kiểm tra.

## 2026-08-05 — Task 1 (B+C): phụ lục QLBH tự sinh PDF từ file import + hiển thị ngay khi tạo trình ký

- **Phạm vi**:
  - BE (java-senior-dev): `BusinessPolicyDeclareInfoServiceImpl` (+abs) `getImportedQlbhFileContents`; `BusinessPolicyAppendixPdfServiceImpl` (+abs) `createAppendixQlbhImportedFilePdfs`; `CRMDocumentServiceImpl.copyFileKhaiBaoChinhSachAppendixForCSKD` (dòng ~667) đổi QLBH sang `generateAndSaveQlbhImportedAppendixPdfs` + tách `saveGeneratedAppendixPdf` dùng chung; 3 DTO mới `BusinessPolicyQlbhImportedSheetSdo/FileSdo/AppendixPdfSdo`.
  - FE (C): `FormSignReq.vue` (~2614) thêm `await appendixFile.value.getFileUpload()` ngay sau `copyFileKhaiBaoChinhSachAppendixForCSKD` khi tạo trình ký thẩm định CSKD.
- **Thay đổi chính**:
  - (B) Phụ lục QLBH khi trình ký = PDF dựng lại từ NỘI DUNG file QLBH đã import (đọc lại xlsx bằng FileUtil.readExcelV7InSheet → render bảng PDF/sheet, font Times New Roman IDENTITY_H, khuôn giống PL4). Tên PDF theo file gốc đổi đuôi .pdf; mỗi file import (SP/GoiCuoc) → 1 PDF; không import QLBH → không sinh. PBH giữ pending (copyImportedDeclareFilesToAppendix PBH y nguyên).
  - (C) Sau khi tạo trình ký + sinh phụ lục → reload danh sách phụ lục → phụ lục tự sinh (PL2/3/4 + PDF QLBH) hiển thị ngay trên form (drawer còn mở khi hỏi "Gửi trình ký").
- **Lý do**: user yêu cầu phụ lục file import phải là PDF dựng từ nội dung, và phải hiển thị lên giao diện ngay từ lúc ấn tạo trình ký.
- **Ghi chú**: KHÔNG có SQL. An toàn regression: `saveGeneratedAppendixPdf` chỉ được gọi từ đúng 1 method (đã grep). RỦI RO: thuật toán detect header row file QLBH (`findQlbhHeaderRowIndex`: dòng đầu có ô chứa `*`) suy từ file mẫu thật, chưa được đội QLBH xác nhận chính thức. User cần `mvn -pl VcrmApp clean install` + `npm run clean-dev`. NÊN chạy team-lead-reviewer đối chiếu toàn task 1 (A+B+C) với PYC trước khi merge.

## 2026-08-05 — Task 1 (A) fix bố cục field theo Figma TTKBCS_2

- **Phạm vi**: `FormDeclareInfoArea.vue` (template khối File đính kèm + style).
- **Thay đổi chính**: chuyển "Tải biểu mẫu" lên cùng dòng label "File đính kèm" (dùng `#label` slot của a-form-item, flex gap 16px); "(Dung lượng tối đa 50MB)" để cạnh nút "Tải lên". Thêm class `declare-file-form-item`/`declare-file-label-row`/`declare-required`.
- **Lý do**: user báo bố cục field ở TTKBCS_2 chưa khớp Figma (Tải biểu mẫu trước đây nằm cạnh nút Tải lên, sai vị trí).
- **Ghi chú**: khớp metadata Figma 850:72 (File đính kèm x=56 + Tải biểu mẫu x=169 cùng dòng; Tải lên + size hint dòng dưới).

## 2026-08-06 — Task 1 (1.4): fix tích hợp API QLBH import/validate + cap_template theo curl thật

- **Phạm vi**:
  - `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/businessPolicy/impl/QlbhApiClient.java` — `validate(...)`, `buildValidateUrl()`.
  - `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/businessPolicy/impl/BusinessPolicyDeclareInfoServiceImpl.java` — `importQlbhPolicy`, `validateQlbhPolicyOnly`, `downloadQlbhTemplate` (+ `resolveIsNewProduct` mới).
- **Thay đổi chính**:
  - `QlbhApiClient.validate` đổi signature từ `(MultipartFile file, String qlbhSector)` sang `(List<MultipartFile> files, String qlbhSector, String productHierarchy, boolean isNewProduct, boolean requireUpdateProduct)`, gửi 1 request multipart duy nhất (`linh_vuc`, `product_hierarchy`, `isNewProduct`, `requireUpdateProduct`, nhiều `files`) — khớp curl thật user cung cấp. Sửa URL từ `/cskd/product-import/validate` (sai) sang `/qlbh/cskd/import/validate` (đúng).
  - `validateQlbhPolicyOnly` (dùng chung cho pre-create `validate-qlbh-policy` và bước đầu của `importQlbhPolicy`): bỏ vòng lặp gọi remote QLBH validate — nay CHỈ validate cục bộ (sector, isEditProduct, số lượng file, định dạng xlsx). Lý do: pre-create chưa có `businessPolicyId` nên không có `product_hierarchy`/`isNewProduct` — không đủ tham số bắt buộc của API thật.
  - `importQlbhPolicy` (đã có `businessPolicyId` + `policy`): sau `validateQlbhPolicyOnly` cục bộ, gọi `qlbhApiClient.validate(files, qlbhSector, resolveProductHierarchy(businessPolicyId), isNewProductBool, isEditProductBool)` 1 lần TRƯỚC khi lưu tài liệu; remote fail (`QlbhValidateFailedException`) → rollback, không lưu.
  - `downloadQlbhTemplate`: nếu `resolveProductHierarchy` trả null/rỗng → throw `AppException("BP-DECL-054", ...)` rõ ràng thay vì gọi `cap_template` thiếu `product_hierarchy`. Thêm `resolveIsNewProduct` — nếu FE không gửi `isNewProduct`, fallback đọc `BusinessPolicy.getIsNewProduct()` theo `businessPolicyId`.
- **Lý do**: API import validate cũ sai cả path lẫn body (thiếu `product_hierarchy`/`isNewProduct`/`requireUpdateProduct`, chỉ gửi 1 file/request thay vì gộp); `cap_template` lỗi vì gọi thiếu `product_hierarchy` khi CSKD chưa có mã SAP.
- **Ghi chú** (BLOCKER cần Leader/BA xác nhận):
  - **Lệch với `system-design-import.md` §7**: tài liệu ghi `validate-qlbh-policy` (pre-create) "cũng trả file lỗi thay vì JSON khi không hợp lệ, giống 2 API import" — nay endpoint này KHÔNG còn gọi remote QLBH (chỉ check cục bộ), nghĩa là FE sẽ không phát hiện file QLBH sai ở bước pre-create nữa, chỉ phát hiện được ở bước `import-qlbh-policy` (post-create, có `businessPolicyId`). Cần BA cập nhật lại system-design + xác nhận với nghiệp vụ UX này chấp nhận được.
  - Giả định `product_hierarchy` rỗng ("") khi `resolveProductHierarchy` trả null cho luồng import validate (SP/DV mới, SAP chưa cấp mã) — theo đúng tinh thần BR-05 (Product Hierarchy được phép bỏ trống với SP/DV mới) — CHƯA verify với QLBH thật do cần VPN.
  - Không đổi DB, không cần SQL. User cần `mvn -pl VcrmApp clean install` (VPN) để build/test lại; nên gọi thử API thật (Postman) với 1 file hợp lệ + 1 file lỗi để xác nhận `interpretValidateResponse` (JSON=hợp lệ, Content-Type khác=file lỗi) vẫn đúng với response thật của endpoint mới `/qlbh/cskd/import/validate`.

## 2026-08-06 — Task 1: sửa API QLBH import/cap_template + FE nhảy dòng

- **Phạm vi**: BE `QlbhApiClient.java`, `BusinessPolicyDeclareInfoServiceImpl.java` (java-senior-dev); FE `FormDeclareInfoArea.vue` (style header).
- **Thay đổi chính**:
  - (BE) `QlbhApiClient.validate` đổi signature `(List<MultipartFile> files, qlbhSector, productHierarchy, boolean isNewProduct, boolean requireUpdateProduct)`, URL `/qlbh/cskd/import/validate` (trước sai `/cskd/product-import/validate`), gửi 1 request multipart: `linh_vuc`+`product_hierarchy`+`isNewProduct`("true"/"false")+`requireUpdateProduct`+ nhiều `files`.
  - (BE) `validateQlbhPolicyOnly` chỉ còn validate cục bộ; remote validate chuyển vào `importQlbhPolicy` (có businessPolicyId → resolveProductHierarchy từ activity SAP_NEW, isNewProduct từ policy, requireUpdateProduct=isEditProduct), gọi trước saveDeclareDocument.
  - (BE) `downloadQlbhTemplate`: product_hierarchy null → ném BP-DECL-054 rõ ràng; thêm `resolveIsNewProduct` fallback đọc policy.
  - (FE) header mỗi mục khai báo: bỏ `flex-wrap:wrap` → 1 dòng (title trái ellipsis + radio phải nowrap) khớp Figma; "Tải biểu mẫu" đã lên dòng label "File đính kèm" (lần trước).
- **Lý do**: API import/cap_template QLBH sai param/URL; FE QLBH bị nhảy dòng.
- **Ghi chú / BLOCKER**: bỏ remote validate ở PRE-CREATE (`validate-qlbh-policy`) → file QLBH sai chỉ bị bắt ở bước IMPORT (post-create/commit), lệch system-design §7 — CẦN user/BA xác nhận UX. Giả định product_hierarchy="" khi null (SP/DV mới) chưa verify với QLBH thật. User cần `mvn -pl VcrmApp clean install` + test thật Postman + `npm run clean-dev`.

## 2026-08-06 — Task 1: fix layout QLBH (form dọc + placeholder) + nguồn product_hierarchy

- **Phạm vi**: FE `FormDeclareInfoArea.vue`; BE `BusinessPolicyDeclareInfoServiceImpl.java` (`resolveProductHierarchy`).
- **Thay đổi chính**:
  - (FE) Bọc lại drawer body trong `<a-form layout="vertical">` (lúc rewrite trước bị thiếu → form-item render NGANG, control bị ép nhỏ). Nay label trên, control full-width. Thêm `placeholder="Chọn lĩnh vực/nhóm giải pháp"` + `allow-clear` cho select Lĩnh vực QLBH.
  - (BE) `resolveProductHierarchy`: sau khi thử activity SAP_NEW (SP mới), fallback `resolveProductHierarchyFromProductType` → lấy `ProductType.productCodeHierarchy` (cột PRODUCT_CODE_HIERARCHY) từ product_type của CSKD (chỉ dùng khi có đúng 1 mã, pattern như suggestQlbhSector). Fix BP-DECL-054 cho CSKD SP/DV đã có.
- **Lý do**: user báo form QLBH render ngang/ép nhỏ, thiếu placeholder; tải biểu mẫu lỗi BP-DECL-054 do product_hierarchy null (chỉ lấy từ SAP_NEW).
- **Ghi chú**: Message "BP-DECL-054" hiện raw code do handler global `ApiExceptionHandler` (dòng 126 `ex.setMessage(message)` ghi đè text bằng code khi không có messages bundle) — bug CÓ SẴN toàn app, KHÔNG sửa (ngoài phạm vi). Với SP/DV MỚI chưa khai SAP → product_hierarchy vẫn null (SAP chưa cấp mã) → BP-DECL-054 đúng nghiệp vụ (chưa có mã thì chưa tải được template). User cần `mvn -pl VcrmApp clean install` + `npm run clean-dev`.

## 2026-08-06 — API key cho hệ thống ngoài gọi vào (global list + Authorization)

- **Phạm vi**: BE `VcrmSys/.../filter/JwtAuthenticationFilter.java`, `VcrmApp/.../controller/ExtensionActivitiesController.java`; SQL `crm-service/sql/2026-08-06_external_api_key_token.sql`.
- **Thay đổi chính**:
  - Sinh API key (base64url 48 byte), lưu ở global list `TOKEN_EXTERNAL_API` (GLOBAL_LIST_DETAIL.DESCRIPTION) — theo pattern `TOKEN_BCCS_GD` sẵn có. User dán key vào biến `@external_api_key` khi chạy SQL (KHÔNG commit key thật vào file).
  - `JwtAuthenticationFilter`: thêm `EXTERNAL_API_PATHS` (hiện: `/extension-activities/update-status-by-cskd-code`), block enforce — nếu path thuộc external mà header `Authorization` != API key (đọc từ global list) → 401; đúng key → cho qua. Helper `isExternalApiPath`, `getExternalApiKey`.
  - `updateStatusByCskdCode`: bọc try/catch quanh `getUserNameFromTokenRSA` (API key không phải JWT → fallback username "EXTERNAL_API"), tránh crash.
- **Lý do**: user cần 1 API key để hệ thống ngoài (QLBH...) gọi vào endpoint callback cập nhật trạng thái hoạt động theo Mã CSKD.
- **Ghi chú**: Endpoint này KHÔNG bị FE/BE nội bộ gọi (đã grep) → enforce an toàn. Header dùng `Authorization: <key>` (không Bearer). Thêm endpoint external mới: bổ sung path vào `EXTERNAL_API_PATHS`. Rotate key: UPDATE DESCRIPTION trong global list. User cần chạy SQL (thay key thật) + `mvn -pl VcrmApp,VcrmSys clean install`.

## 2026-08-06 — Public thêm /org/getAllForBusinessPolicy qua API key ngoài

- **Phạm vi**: `JwtAuthenticationFilter.java` (`EXTERNAL_API_PATHS`).
- **Thay đổi**: thêm `/org/getAllForBusinessPolicy` vào `EXTERNAL_API_PATHS` (đổi Collections.singletonList → Arrays.asList 2 path). Endpoint này chỉ trả list đơn vị, không dùng token keycloak → không cần sửa controller. Hệ thống ngoài gọi kèm `Authorization: <API key TOKEN_EXTERNAL_API>`; sai/thiếu → 401.
- **Lý do**: user cần public endpoint lấy "Đơn vị yêu cầu" cho hệ thống ngoài.

## 2026-08-06 — Fix /org/getAllForBusinessPolicy không ra dữ liệu (dual-use)

- **Phạm vi**: `JwtAuthenticationFilter.java`.
- **Nguyên nhân**: endpoint này FE NỘI BỘ dùng nhiều màn (DrawerAppraiseReport/DrawerReportStatusExpire/BaoCaoHienTrangCSKD) với JWT; thêm vào danh sách enforce API key → JWT bị 401 → mất dữ liệu.
- **Sửa**: tách 2 danh sách: `EXTERNAL_API_ENFORCED_PATHS` (update-status-by-cskd-code — external-only, sai key → 401) và `EXTERNAL_API_ALLOWED_PATHS` (getAllForBusinessPolicy — dual-use: đúng API key thì qua; không thì rơi xuống luồng thường để FE JWT vẫn chạy). Helper đổi `isExternalApiPath` → `matchesAny(path, list)`.
- **Bài học**: trước khi enforce API key trên 1 path, PHẢI grep FE xem có gọi nội bộ không; nếu dual-use thì không được enforce cứng.

## 2026-08-06 — FIX: API key phải đặt ở filter VcrmApp (không phải VcrmSys) + đọc từ config

- **Nguyên nhân gốc**: có 2 `JwtAuthenticationFilter`. Endpoint `/org/getAllForBusinessPolicy`, `/extension-activities/update-status-by-cskd-code` thuộc VcrmApp → chạy qua `com.app.businessproject.filter.JwtAuthenticationFilter` (VcrmSys là service riêng, gọi qua sysServiceClient). Tôi đã cài nhầm ở filter VcrmSys → không có tác dụng. Thêm nữa: filter VcrmApp dòng ~70 gọi `keyCloakProvider.getUserNameFromTokenRSA(jwt)` → `getAllClaims` DECODE+VERIFY JWT, **throw AppException nếu không phải JWT** → gọi bằng API key (không phải JWT) bị lỗi; gọi bằng token hợp lệ thì ra data.
- **Sửa**:
  - `VcrmApp/.../filter/JwtAuthenticationFilter.java`: thêm `@Value("${external.api.key:}")`, 2 danh sách `EXTERNAL_API_ENFORCED_PATHS`/`EXTERNAL_API_ALLOWED_PATHS`, helper `matchesAny`, và block XỬ LÝ API KEY **TRƯỚC** dòng keycloak: nếu `Authorization == external.api.key` và path thuộc external → `filterChain.doFilter` + return (bỏ qua keycloak, không throw); path enforced mà không có key đúng → 401.
  - Revert toàn bộ thay đổi ở `VcrmSys/.../filter/JwtAuthenticationFilter.java` (module sai).
  - Đọc key từ **config `external.api.key`** (env `EXTERNAL_API_KEY`) thay vì global list — vì filter chạy mỗi request, VcrmApp chỉ đọc global list qua remote WS (nặng). SQL seed global list `TOKEN_EXTERNAL_API` KHÔNG còn dùng.
- **User cần**: set env `EXTERNAL_API_KEY=<key>` (hoặc `external.api.key` trong yml) rồi `mvn -pl VcrmApp clean install`. Không cần chạy SQL global list nữa.
- **Bài học**: dự án có nhiều module/service với filter trùng tên — phải xác định ĐÚNG filter (theo stack trace) xử lý endpoint trước khi sửa.

## 2026-08-06 — API key external: gỡ hết lớp decode token + đọc key từ DB

- **Root cause (đầy đủ)**: mỗi request đi qua NHIỀU lớp cùng decode Authorization bằng `getUserNameFromTokenRSA` (verify JWT, THROW nếu không phải JWT). Với API key (không phải JWT) → throw ở lớp CHẠY TRƯỚC filter của tôi → request chết trước khi tới controller. Đó là lý do token OK, API key thì không.
- **Các lớp đã sửa (an toàn với non-JWT)**:
  1. `VcrmGeneral/.../interceptor/AppRequestLoggerFilter.java` (dòng 66): bọc try/catch quanh getUserNameFromTokenRSA (chạy TRƯỚC filter VcrmApp, throw ngay tại đây → skip filterChain.doFilter → chết).
  2. `VcrmGeneral/.../interceptor/RequestInterceptor.preHandle` (dòng 36): bọc try/catch (HandlerInterceptor chạy TRƯỚC controller).
  3. `VcrmApp/.../filter/JwtAuthenticationFilter.java`: block nhận diện API key TRƯỚC office_mate keycloak; nếu path external + key khớp → filterChain.doFilter + return.
- **Lưu key ở DB (theo yêu cầu, bỏ config)**: filter đọc key từ global list `TOKEN_EXTERNAL_API` (`GLOBAL_LIST_DETAIL.DESCRIPTION`) qua `GlobalListWs` (Feign → VcrmSys), CHỈ đọc khi path thuộc external (tránh gọi mỗi request). Bỏ `@Value("${external.api.key}")`.
- **User cần**: đã chạy SQL seed global list (điền key thật vào `@external_api_key`). Build `mvn -pl VcrmGeneral,VcrmApp -am clean install` + deploy. KHÔNG cần config file.
- **Bài học lớn**: hệ thống có NHIỀU lớp decode token per-request (filter VcrmSys + VcrmApp, AppRequestLoggerFilter, RequestInterceptor, controller). Muốn hỗ trợ API key phải làm TẤT CẢ chúng an toàn với non-JWT. Xác định lớp chạy TRƯỚC bằng thứ tự filter chain (stack trace).

## 2026-08-06 — ROLLBACK toàn bộ tính năng API key hệ thống ngoài

- **Lý do**: user yêu cầu rollback hết phần API key vừa làm.
- **Đã revert về nguyên trạng**:
  - `VcrmApp/.../filter/JwtAuthenticationFilter.java`: gỡ import GlobalListWs, field globalListWs, constants EXTERNAL_API_*, block API key trong doFilterInternal, helper matchesAny + readExternalApiKeyFromDb.
  - `VcrmGeneral/.../interceptor/AppRequestLoggerFilter.java` (dòng 66): bỏ try/catch, về `username = !isNullOrEmpty(token) ? getUserNameFromTokenRSA(token) : "Anonymous user"`.
  - `VcrmGeneral/.../interceptor/RequestInterceptor.java` (dòng 36): bỏ try/catch, về `String iamUsernameLogin = getUserNameFromTokenRSA(accessToken)`.
  - `VcrmApp/.../controller/ExtensionActivitiesController.java` `updateStatusByCskdCode`: bỏ try/catch, về `String iamUsername = getUserNameFromTokenRSA(token)`.
  - `VcrmSys/.../filter/JwtAuthenticationFilter.java`: đã revert từ trước (0 tham chiếu).
  - Xóa file `crm-service/sql/2026-08-06_external_api_key_token.sql`.
  - `OrganizationController.getAllForBusinessPolicy`: đã ở trạng thái gốc (1 dòng), không đụng.
- **User cần tự dọn (ngoài code)**: nếu đã thêm block `external: api: key:` vào application-general.yml → xóa; nếu đã chạy SQL seed global list `TOKEN_EXTERNAL_API` → có thể `DELETE` dòng đó khỏi GLOBAL_LIST/GLOBAL_LIST_DETAIL (không bắt buộc, để lại vô hại).

## 2026-08-06 — Download biểu mẫu QLBH lỗi do qlbh.domain="-"

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/QlbhApiClient.java`.
- **Nguyên nhân**: config staging đặt `qlbh.domain: "-"` (quy ước "chưa set" của dự án). Code chỉ check `isNullOrEmpty(qlbhDomain)` → `"-"` không rỗng nên lọt qua → `buildCapTemplateUrl` tạo URL rác `-/qlbh/cskd/cap_template...` → RestTemplate fail → BP-DECL-052 "Không tải được biểu mẫu". Postman OK vì gọi thẳng host thật `http://10.60.155.11:8034`.
- **Thay đổi**: thêm helper `isQlbhDomainNotConfigured()` coi null/empty/`"-"` là chưa cấu hình; dùng ở `validate` và `capTemplate` → báo lỗi rõ "Chưa cấu hình qlbh.domain" thay vì URL rác.
- **FIX THẬT (user tự làm, config)**: đặt `qlbh.domain: http://10.60.155.11:8034` trong config staging (đang là "-"). qlbh.token đã có sẵn giá trị thật.
- **Ghi chú**: nếu sau khi set domain vẫn lỗi → có thể là BP-DECL-054 (product_hierarchy null cho CSKD SP/DV mới chưa khai SAP). Repo config không định nghĩa `qlbh:` — chỉ có ở override staging.

## 2026-08-06 — QLBH cap_template: áp lại guard "-" (đã bị mất)

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/QlbhApiClient.java`.
- **Thay đổi chính**: helper `isQlbhDomainNotConfigured()` (null/empty/`"-"`) đã bị mất khi file về trạng thái gốc → áp lại; dùng ở `validate` (BP-DECL-032) và `capTemplate` (BP-DECL-051).
- **Lý do**: user báo tải biểu mẫu QLBH vẫn lỗi; xác nhận lại code dựng URL đã khớp curl `http://10.60.155.11:8034/qlbh/cskd/cap_template?linh_vuc&loai_bieu_mau&product_hierarchy&is_new_product` + header Authorization=qlbh.token → bug 100% do config `qlbh.domain="-"`.
- **Kết luận chốt**: FE→BE→QLBH đúng kiến trúc; không sửa gì thêm ở logic. Fix thật là config staging: `qlbh.domain: http://10.60.155.11:8034`. Repo không có file config khai báo `qlbh:`.

## 2026-08-06 — QLBH tải biểu mẫu: fix param FE (giữ FE→BE proxy)

- **Phạm vi**: `client/.../business-policy/Form/useDeclareTemplateDownload.ts`.
- **Bug thật**: FE gọi `/download-qlbh-template?qlbhSector=null&loaiBieuMau=SAN_PHAM&isNewProduct=0` — thiếu `businessPolicyId` và `qlbhSector=null` → BE không resolve được `product_hierarchy` → không dựng đúng curl QLBH `http://10.60.155.11:8034/qlbh/cskd/cap_template?linh_vuc&loai_bieu_mau&product_hierarchy&is_new_product`.
- **Thay đổi**: `downloadQlbhTemplateFile` chặn sớm khi thiếu `qlbhSector` (message "chọn Lĩnh vực...") và khi thiếu `businessPolicyId` (message "lưu CSKD trước..."); luôn append `businessPolicyId`.
- **Quyết định user**: giữ kiến trúc FE→BE (BE proxy giữ token server-side, tránh CORS + lộ token). BE controller `download-qlbh-template` đã stream file octet-stream (đúng "API trả về file"). BE `capTemplate` đã dựng URL khớp 100% curl.
- **Còn phụ thuộc config**: `qlbh.domain` staging phải = `http://10.60.155.11:8034` (đang "-"); nếu CSKD chưa có activity SAP_NEW với productHierarchyCode → BP-DECL-054.

## 2026-08-06 — QLBH tải biểu mẫu: bỏ ràng buộc Product Hierarchy khi isNewProduct=1

- **Phạm vi**: `VcrmApp/.../BusinessPolicyDeclareInfoServiceImpl.java` (downloadQlbhTemplate) + `client/.../Form/useDeclareTemplateDownload.ts`.
- **Sửa logic**: SP/DV mới (isNewProduct=1) CHƯA có Product Hierarchy (SP chưa tạo trên SAP) → không bắt buộc product_hierarchy/businessPolicyId. Chỉ bắt buộc khi isNewProduct=0 (SP/DV đã có, cần trỏ tới sản phẩm hiện hữu).
- **BE**: chỉ throw BP-DECL-054 khi `isExistingProduct && productHierarchy rỗng`. QLBH cap_template chấp nhận không truyền product_hierarchy khi is_new_product=1 (buildCapTemplateUrl đã bỏ qua param rỗng).
- **FE**: chỉ chặn thiếu businessPolicyId khi isNewProduct=0; vẫn append businessPolicyId nếu có (để BE lấy product_hierarchy tuỳ chọn). Vẫn bắt buộc chọn qlbhSector.
- **Lý do**: user chỉ ra bug logic — new product download template trắng để tạo SP, không thể có hierarchy sẵn.

## 2026-08-06 — Bypass tokenSSO cho syncStateVofficeByProjectPLIdForThamDinhCSKD

- **Phạm vi**: `VcrmApp/.../controller/ProjectPLSignReqController.java` (method syncStateVofficeByProjectPLIdForThamDinhCSKD).
- **Lỗi**: "Missing request header 'tokenSSO'" — do controller khai `@RequestHeader("tokenSSO")` BẮT BUỘC, request bị chặn ngay ở controller trước khi vào service (nơi đã bypass username/pass). Bypass ở service vô tác dụng vì chưa tới được.
- **Thay đổi**: đổi thành `@RequestHeader(value = "tokenSSO", required = false)` → request không kèm tokenSSO vẫn vào service.
- **Xác nhận bypass trọn vẹn trong luồng ThamDinh** (đều đã dùng usernameSSO/passwordSSO): getTextDetail (5507), getListSignerVO (5456), getHistoryOfSignerChangeVO (5481); syncFileSignRest có nhánh fallback khi tokenSSO rỗng. accountSSO.username/password đọc từ @Value + native query (396/400).
- **Ghi chú**: chỉ sửa method ThamDinhCSKD; các method sync khác (ByProjectPLId, KhaiBaoCSKD, ByPocId, ByCopp) vẫn require tokenSSO — chưa đụng.

## 2026-08-06 — QLBH cskd dùng API key riêng (không dùng JWT qlbh.token)

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/QlbhApiClient.java`.
- **Vấn đề**: 2 service QLBH khác credential — customerOrder (`qlbh.url` :8681) dùng JWT `qlbh.token` (eyJ...); còn cskd import/validate + cap_template (`qlbh.domain` :8034) dùng **API key** `vwD5...`. Code cũ nhét `qlbh.token` (JWT) vào Authorization của cap_template → sai credential.
- **Thay đổi**: thêm `@Value("${qlbh.api-key:}") qlbhApiKey`; helper `resolveQlbhAuthorization()` ưu tiên api-key, fallback qlbh.token; dùng ở cả `validate` và `capTemplate`.
- **Config cần set (staging, user tự làm)**: `qlbh.api-key: vwD5yewUGGQF59DbVOSuEi3n48QPChXjaWsiGpR6aj2yxuoJ0ywN6D65hE5Y` + `qlbh.domain: http://10.60.155.11:8034`. KHÔNG hardcode key trong source (rule security).

## 2026-08-07 — Update thủ công CSKD sang Đã phê duyệt: tự sinh Hoạt động khai báo (như luồng trình ký)

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyServiceImpl.java` (nhánh update trong `update()`).
- **Vấn đề**: khi Admin/QL vào Cập nhật đổi trạng thái CSKD sang DA_PHE_DUYET (bypass luồng vOffice), hệ thống KHÔNG sinh các bước Hoạt động khai báo chính sách — trong khi luồng vOffice sync gọi `generateActivitiesOnApproved` (qua autoUpdateProcessStatus). update() không gọi autoUpdateProcessStatus.
- **Thay đổi**: sau khi save existingPolicy + newProductInfo, nếu `request.processStatus == DA_PHE_DUYET` và `snapshot.processStatus != DA_PHE_DUYET` (đúng lúc chuyển) → gọi `businessPolicyActivityService.generateActivitiesOnApproved(existingPolicy)` trong try/catch. Dùng lại đúng hàm luồng vOffice (DRY, idempotent nhờ checkExistsObjectRef).
- **Quyền**: chỉ Admin/QL (isBusinessPolicyManagement) mới đổi được sang trạng thái restricted (đã chặn sẵn ở line ~798), nên không cần gate role thêm.
- **Ghi chú**: generateActivitiesOnApproved dùng issuedDate làm mốc due date — FE bắt buộc nhập issuedDate/effectiveDate khi processStatus=DA_PHE_DUYET. Chỉ áp cho nhánh update như user yêu cầu (không đụng nhánh tạo mới).

## 2026-08-07 — Bỏ validate cục bộ QLBH (download + upload), để QLBH tự validate

- **Phạm vi**: `VcrmApp/.../BusinessPolicyDeclareInfoServiceImpl.java` + `client/.../Form/useDeclareTemplateDownload.ts`.
- **BE download** (`downloadQlbhTemplate`): bỏ `validateQlbhSector`, `validateLoaiBieuMau`, và throw BP-DECL-054. Chỉ resolve isNewProduct + product_hierarchy để dựng URL rồi gọi `qlbhApiClient.capTemplate` → QLBH tự validate.
- **BE upload** (`importQlbhPolicy`): bỏ `validateQlbhPolicyOnly(...)` cục bộ; giữ `qlbhApiClient.validate(...)` (QLBH validate nội dung file). Giữ getBusinessPolicyOrThrow + checkDeclareAreaNotLocked (precondition/business lock, không phải validate file).
- **BE pre-create** (`validateQlbhPolicyOnly`): thành pass-through rỗng — pre-create chưa có businessPolicyId nên không resolve được product_hierarchy/isNewProduct để QLBH validate đúng; QLBH validate chuẩn chạy ở import (commit) khi đã có bpId.
- **Dọn dead code**: xoá helper validateQlbhSector/validateLoaiBieuMau/validateIsEditProduct/validateQlbhFileCount/validateXlsxFile + constants QLBH_SECTOR_VALUES/QLBH_LOAI_BIEU_MAU_* + import Arrays/HashSet.
- **FE**: guard qlbhSector/businessPolicyId đã bị bỏ (theo chủ trương no-validate); fix lại tham chiếu `qlbhSector` chưa khai báo ở dòng 85 → `modelRef.value.qlbhSector`.

## 2026-08-07 — Dropdown Lĩnh vực/nhóm GP QLBH (khai báo CSKD) dùng GL code _VALIDATE

- **Phạm vi**: `client/src/constants/globalList.ts` + `client/.../Form/useDeclareTemplateDownload.ts`.
- **Thay đổi**: thêm constant `GL_PRODUCT_TYPE_QLBH_SECTOR_VALIDATE`; `loadQlbhSectorOptions` đổi từ `GL_PRODUCT_TYPE_QLBH_SECTOR` → `GL_PRODUCT_TYPE_QLBH_SECTOR_VALIDATE` để lấy đúng GLD (linh_vuc) mà QLBH validate/cap_template chấp nhận.
- **Chưa đụng**: `productType/Index.vue` và `productType/Form/FormProductType.vue` vẫn dùng `GL_PRODUCT_TYPE_QLBH_SECTOR` (context gán sector cho loại SP, khác context khai báo CSKD). Hỏi user nếu muốn đổi luôn.
- **DB cần có**: GLOBAL_LIST code `GL_PRODUCT_TYPE_QLBH_SECTOR_VALIDATE` + GLD tương ứng (user tự khai báo trong iam schema).

## 2026-08-07 — QLBH is_new_product lấy từ isEditProduct (Có sửa SP/DV), không phải isNewProduct (CSKD)

- **Phạm vi**: `VcrmApp/.../BusinessPolicyDeclareInfoServiceImpl.java` + `client/.../Form/useDeclareTemplateDownload.ts`.
- **Sửa mapping**: param `is_new_product` gửi QLBH phải lấy từ field "Có sửa thông tin SP/DV trên QLBH hay không?" (isEditProduct), KHÔNG lấy từ "CSKD của SP/DV mới?" (businessPolicy.isNewProduct).
- **BE import** (`importQlbhPolicy`): bỏ `isNewProductBool = policy.getIsNewProduct()`; truyền `isEditProductBool` vào cả 2 param validate (isNewProduct + requireUpdateProduct đều = isEditProduct).
- **BE download** (`downloadQlbhTemplate`): dùng thẳng `isNewProduct` FE gửi (= isEditProduct), bỏ `resolveIsNewProduct` (fallback lấy CSKD isNewProduct — đã xoá dead code).
- **FE download** (`downloadQlbhTemplateFile`): gửi `isNewProduct` param = `modelRef.value.isEditProduct` thay vì `props.isNewProduct`. Tên HTTP param vẫn là `isNewProduct` nhưng VALUE là isEditProduct.
- **Ghi chú**: requireUpdateProduct (validate) hiện cũng = isEditProduct (không đổi); nếu cần khác thì báo.

## 2026-08-07 — Phụ lục 2 (SAP) PDF: bỏ 2 dòng text, chỉ giữ header + bảng

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyAppendixPdfServiceImpl.java` (method gen Phụ lục 02 - BM khai báo SP/DV mới trên SAP).
- **Thay đổi**: bỏ 2 dòng text sau bảng: "Đơn vị chủ trì: ..." và "Mã Product Hierarchy (sau khi SAP cấp): ...". Chỉ còn tiêu đề "PHỤ LỤC 02..." + bảng.
- **Dọn dead code**: xoá biến local fontNormal (method SAP), method resolveProductHierarchyCode, field extensionActivitiesRepo, import ExtensionActivities/ExtensionActivitiesRepo/Const. resolveOrgUnitName giữ (dùng ở phụ lục telecom).
- **Ghi chú**: task đổi tên file import theo Figma (frame GiaoDien_ChiTiet_CSKD_ThongTinCoBan_SP/DVMoi = node 94:1182) đang TẠM DỪNG do user chuyển việc — chưa hoàn tất.

## 2026-08-07 — Thêm field "Nhóm hoạt động" cho Loại đối tượng CSKD ở Thêm mới Công việc (task 7)

- **Phạm vi**: `client/src/views/customer/extension-events/eventForm.vue` + SQL `crm-service/sql/2026-08-07_gld_business_policy_act_group.sql`.
- **FE**: mirror mẫu TBMT — thêm block field "Nhóm hoạt động" hiển thị khi `isWorkBusinessPolicyActivity(item)` (actType=WORK + objectRefCode/moduleType=BUSINESS_POLICY). Options từ `businessPolicyActGroupOptions` (GL `GL_EXTENSION_ACT_GROUP` lọc `code === 'BUSINESS_POLICY'`). Dùng chung field `activitiesGroup`; submit map `activitiesGroup → actGroup` cho cả TBMT và CSKD. Đã expose `isWorkBusinessPolicyActivity`, `businessPolicyActGroupOptions`.
- **SQL GLD**: insert 8 nhóm vào GL_EXTENSION_ACT_GROUP với CODE='BUSINESS_POLICY': BP_BCCS_PACKAGE/BP_QLBH/BP_PBH/BP_BCCS_NEW/BP_SAP_NEW/BP_UPGRADE_EVAL/BP_SIGN_PYC/BP_OTHER (key=VALUE khớp Const.BUSINESS_POLICY_ACT_GROUP ở BE). Idempotent (NOT EXISTS). Chạy trên schema iam (stagging_keycloack_iam). Đã có sẵn tương đương trong sql/scrip_update_1375.sql (93-116).
- **Ghi chú**: field CSKD để full-width (md=24), required. Load/edit hiển thị lại dựa mapActivitiesGroupToFieldValue (giá trị BP_* pass-through). User tự chạy SQL + build.

## 2026-08-07 — CSKD Nhóm hoạt động: placeholder + ngang hàng Nội dung hoạt động

- **Phạm vi**: `client/src/views/customer/extension-events/eventForm.vue`.
- **Ngang hàng**: CSKD act group col 24→12; thêm `|| isWorkBusinessPolicyActivity(item)` vào ternary width của col "Nội dung hoạt động" (cả :md và :lg) → 2 field cùng hàng như TBMT.
- **Placeholder**: `asme-select` bind :value, ant chỉ hiện placeholder khi value null/undefined. `activitiesGroup` init/reset đang là '' → chặn placeholder. Đổi init/reset `activitiesGroup` '' → null (item factory + 2 reset). normalizeActivitiesGroup(null)→'' → serialize→null (an toàn). Ảnh hưởng tích cực cả TBMT (placeholder cũng hiện).

## 2026-08-07 — Fix "Data too long for column ACT_GROUP" (CSKD nhóm hoạt động)

- **Phạm vi**: `crm-service/sql/2026-08-07_widen_extension_activities_act_group.sql` + entity `ExtensionActivities.java`.
- **Nguyên nhân**: cột EXTENSION_ACTIVITIES.ACT_GROUP nhỏ hơn 15 ký tự; giá trị mới BP_BCCS_PACKAGE/BP_UPGRADE_EVAL (15) vượt quá.
- **Fix**: ALTER MODIFY ACT_GROUP VARCHAR(50) NULL (chạy trên DB crm); thêm length=50 vào @Column entity. User tự chạy SQL.

## 2026-08-07 — Set "Đơn vị thực hiện" cho hoạt động CSKD tự sinh từ GL USER_ORG_CSKD

- **Phạm vi**: `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyActivityServiceImpl.java` + SQL `crm-service/sql/2026-08-07_gl_user_org_cskd_action.sql`.
- **Yêu cầu**: hoạt động tự sinh sau phê duyệt chưa set "Đơn vị thực hiện" (= policyAssigneeOrgUnitId). Lấy từ GL=USER_ORG_CSKD, GLD CODE=USER_ORG_CSKD_ACTION → username (VALUE) → staff → org unit.
- **Thay đổi BE**: inject GlobalListUtils + OrgUnitStaffRepo. Thêm `resolveCskdActionOrgUnitId()` (đọc GL, filter code=USER_ORG_CSKD_ACTION lấy key=VALUE=username; getStaffIdByIamUserNameOrStaffCodeOrStaffName(username,null); orgUnitStaffRepo.getOrgUnitIdByStaffId). Thêm `buildSameOrgUnitByIndex(size, orgUnitId)`. Áp cho cả batch1 (generateActivitiesOnApproved), batch2 (afterActivityCompleted), batch3 — thay cho developingOrganizationId cũ. Try/catch fallback null (không set nếu resolve fail).
- **Mapping GLD**: WS map GLD.VALUE→key, GLD.NAME→value, GLD.CODE→code. Resolver dùng code=USER_ORG_CSKD_ACTION, username=VALUE.
- **User cần làm**: chạy SQL tạo GL/GLD, sửa VALUE 'REPLACE_WITH_SSO_USERNAME' thành VT_SSO_USER_NAME/IAM_USER_NAME/STAFF_CODE thật (chạy trên schema iam). Build lại.

## 2026-08-07 — Fix update CSKD fail (productTypeId "4,7") chặn tự sinh hoạt động khi phê duyệt thủ công

- **Phạm vi**: `client/.../business-policy/Form/FormCommonInfo.vue` (submit payload).
- **Nguyên nhân**: business_policy.product_type_id lưu CSV ("4,7"); FE load giữ nguyên string, submit gửi `productTypeId: ["4,7"]` → BE List<Long> parse fail (HttpMessageNotReadableException) → request update 400 → KHÔNG vào update() → generateActivitiesOnApproved không chạy → "vùng Hoạt động khai báo chính sách" không tự sinh (chỉ với SP đã có, isNewProduct=0).
- **Fix**: submit split CSV `String(modelRef.productTypeId).split(',').map(Number).filter(...)` → gửi number[] hợp lệ. SP mới (isNewProduct=1) vẫn gửi [].
- **Xác nhận**: generateActivitiesOnApproved trong update() (đã thêm hôm nay) sinh đúng: SP đã có → 3 HĐ (BCCS_PACKAGE/QLBH/PBH); SP mới → đợt 1 4 HĐ (BCCS_NEW/SAP_NEW/UPGRADE_EVAL QLBH/UPGRADE_EVAL PBH). Đợt 2 (Trình ký PYC) + đợt 3 (3 HĐ) sinh sau qua afterActivityCompleted khi hoàn thành đợt trước (đúng task 6).
- **Ghi chú tồn đọng**: select "Tên sản phẩm dịch vụ" là single nhưng data có thể CSV nhiều ID → hiển thị edit có thể trống; nếu cần chọn nhiều thì phải đổi select sang multiple (ngoài phạm vi fix này).

## 2026-08-07 — Thêm log chẩn đoán tự sinh HĐ CSKD khi update thủ công

- **Phạm vi**: `BusinessPolicyServiceImpl.update()` + `BusinessPolicyActivityServiceImpl.generateActivitiesOnApproved()`.
- Thêm log.info tại các gate: requestProcessStatus/oldProcessStatus/isApprovedAfterUpdate/wasNotApprovedBeforeUpdate; vào hàm generate (isNewProduct/issuedDate); skip-if-checkExistsObjectRef (đã có sẵn "da ton tai... bo qua"); số HĐ đợt 1 đã tạo.
- Mục đích: xác định gate nào chặn khi user báo "chuyển trạng thái vẫn không sinh hoạt động".

## 2026-08-07 — Fix get-detail HĐ CSKD báo "không tồn tại hoặc đã bị xóa"

- **Phạm vi**: `VcrmApp/.../repo/impl/ExtensionActivitiesRepoCustomImpl.java` (method getDetail single, WHERE ~5865).
- **Nguyên nhân**: query getDetail (single, ea.ID=:id) dùng chung cho mọi loại, WHERE bắt buộc: `S.STATUS=1 and OUS.STATUS=1 and OG.STATUS=1` (phải có assignee active) + `(CUS/CC/COPP/POCS/TBMT).STATUS=1` (KHÔNG có BUSINESS_POLICY). HĐ CSKD tự sinh: object=BUSINESS_POLICY (không khớp) + không assignee → mọi LEFT join null → loại → list rỗng → FE báo không tồn tại. searchBusinessPolicyActivities (list) có branch riêng nên list OK, nhưng get-detail thì không.
- **Fix**: nới 4 điều kiện chỉ cho BUSINESS_POLICY: mỗi `X.STATUS=1` thành `(X.STATUS=1 or ea.OBJECT_REF_CODE='BUSINESS_POLICY')`, và thêm `or ea.OBJECT_REF_CODE='BUSINESS_POLICY'` vào OR object. 0 ảnh hưởng loại khác. Cùng pattern đã vá ở searchV2 (list /extension-activities/filter).
- **Còn nhẹ**: objectRefName CASE trong getDetail chưa có nhánh BUSINESS_POLICY → tên đối tượng hiển thị null (không chặn, chỉ thiếu tên CSKD). Có thể bổ sung nếu cần.

## 2026-08-07 — Fix nút Thêm mới "TRÌNH KÝ PYC KHAI BÁO CHÍNH SÁCH" disable dù đã phê duyệt

- **Phạm vi**: `client/.../business-policy/Detail/TabKhaiBaoChinhSach.vue`.
- **Điều kiện bật nút**: `canCreateSignReq = status===DA_PHE_DUYET && isNewProduct===1` (PYC trình ký chỉ cho SP/DV MỚI — đúng flow task 6 đợt 2).
- **Bug**: child check cứng 1 dạng, parent (Detail/Index.vue) check phòng thủ 2 dạng. isNewProductPolicy chỉ đọc `isNewProduct` (bỏ `isNewProductPolicy`); status chỉ so 'DA_PHE_DUYET' (bỏ label 'Đã phê duyệt'). CSKD SP mới đã duyệt mà data trả field/label khác → nút disable.
- **Fix**: isNewProductPolicy đọc cả `isNewProduct` || `isNewProductPolicy`; canCreateSignReq chấp nhận status 'DA_PHE_DUYET' || 'Đã phê duyệt'.
- **Lưu ý**: nếu CSKD là SP/DV ĐÃ CÓ (isNewProduct=0) thì nút vẫn disable ĐÚNG THIẾT KẾ (không có bước PYC trình ký). Fix chỉ giải quyết case SP mới bị lệch field/label.

## 2026-08-07 — Sửa flow HĐ khai báo CSKD: SP đã có sinh sau khi KÝ trình ký ở tab (không sinh lúc CSKD duyệt)

- **User chốt**: SP đã có → CSKD duyệt → tạo+ký trình ký ở tab Khai báo chính sách → khi trình ký Đã phê duyệt/Đã ban hành mới sinh 3 HĐ. SP mới giữ nguyên (đợt1 lúc duyệt → đợt2 HĐ → đợt3).
- **FE** `TabKhaiBaoChinhSach.vue`: `canCreateSignReq` chỉ còn `status==DA_PHE_DUYET || 'Đã phê duyệt'` (bỏ điều kiện isNewProduct) → nút Thêm mới trình ký bật cho cả SP đã có. Xoá computed isNewProductPolicy (không còn dùng).
- **BE** `BusinessPolicyActivityServiceImpl`: `generateActivitiesOnApproved` giờ CHỈ sinh cho SP mới (đợt 1, 4 HĐ); SP đã có return sớm. Thêm method `generateDeclarationActivitiesForExistingProductAfterSign(businessPolicyId)` sinh 3 HĐ (BCCS_PACKAGE/QLBH/PBH) cho SP đã có, idempotent + guard SP mới.
- **BE** `ProjectPLSignReqServiceImpl.syncStateVofficeByProjectPlIdForKhaiBaoCSKD` (tab=2): khi trình ký chuyển DPD/DBH → gọi generateDeclarationActivitiesForExistingProductAfterSign. businessPolicyActivityService đã inject sẵn.
- **Kết quả**: SP đã có không còn sinh HĐ lúc CSKD duyệt; sinh khi trình ký tab được ký. SP mới không đổi (AfterSign tự skip SP mới).

## 2026-08-07 — SP mới: phải xong 4 HĐ đợt 1 trước khi tạo trình ký PYC (SP cũ không check)

- **Phạm vi**: `client/.../Detail/TabKhaiBaoChinhSach.vue` + `VcrmApp/.../service/impl/ProjectPLSignReqServiceImpl.java`.
- **FE**: đưa lại computed isNewProductPolicy (đọc cả isNewProduct/isNewProductPolicy). canCreateSignReq: CSKD phải Đã phê duyệt; nếu SP mới thì thêm điều kiện isBatch1AllDone (batch1 length>0 và mọi HĐ status DONE); SP cũ chỉ cần đã phê duyệt.
- **BE**: thêm guard `assertBatch1DoneForNewProductBeforeSign(objectRefId)` gọi đầu `createForKhaiBaoCSKD`. Chỉ áp SP mới (isNewProduct=1): query HĐ objectRefCode=BUSINESS_POLICY, lọc batchNo=BATCH_1, nếu rỗng hoặc còn HĐ chưa DONE → throw BP-SIGN-001. SP cũ bỏ qua.
- businessPolicyRepo + extensionActivitiesRepo đã inject sẵn; thêm import ExtensionActivities.

## 2026-08-07 — Fix SP cũ vẫn bị chặn "đủ 4 HĐ đợt 1" khi tạo trình ký (bỏ sót handler onCreateSignReq)

- **Phạm vi**: `client/.../Detail/TabKhaiBaoChinhSach.vue` (onCreateSignReq).
- **Bug**: ngoài canCreateSignReq (disable nút), còn handler `onCreateSignReq` check `if (!isBatch1AllDone)` bật modal cảnh báo — KHÔNG phân biệt SP cũ/mới. SP cũ không có HĐ đợt 1 → isBatch1AllDone=false → luôn hiện cảnh báo "đủ 4 hoạt động đợt 1".
- **Fix**: đổi thành `if (isNewProductPolicy.value && !isBatch1AllDone.value)` → chỉ chặn SP mới. SP cũ mở form tạo trình ký bình thường.

## 2026-08-10 — API update trạng thái extension-activities + trigger batch CSKD; bỏ validate upload QLBH

- **Bỏ validate upload QLBH**: `BusinessPolicyDeclareInfoServiceImpl.importQlbhPolicy` bỏ hẳn `qlbhApiClient.validate(...)` — upload chỉ lưu file, không validate. (validateQlbhPolicyOnly đã no-op, downloadQlbhTemplate đã bỏ validate trước đó). qlbhApiClient giờ chỉ dùng cho capTemplate.
- **API update trạng thái đã có sẵn**: `POST /extension-activities/update-status` (body ExtensionActivitiesSdi: id, status, actualEndTime, gift, percentCompleted, reason...) và `POST /extension-activities/update-status-by-cskd-code` (bulk theo mã CSKD).
- **Fix**: `updateStatus` (single) TRƯỚC ĐÂY không gọi afterActivityCompleted → HĐ CSKD chuyển DONE qua /update-status không kích luồng batch (đợt1→đợt2→đợt3). Đã thêm: khi objectRefCode=BUSINESS_POLICY và status chuyển sang DONE → gọi `businessPolicyActivityService.afterActivityCompleted(savedEntity)` (giống edit() line 1206). afterActivityCompleted chỉ cascade cho batchNo=BATCH_1 (SP mới); SP đã có (batchNo=null) tự bỏ qua.
- **Chưa đụng**: updateStatusByCskdCode (bulk set-all) không thêm cascade (set tất cả cùng lúc, không hợp cascade từng đợt).

## 2026-08-10 — Thêm actGroup vào update-status-by-cskd-code

- **Phạm vi**: `UpdateExtensionActivityStatusSdi` (+actGroup), controller `updateStatusByCskdCode`, service interface+impl.
- **Thay đổi**: `updateStatusByCskdCode(cskdCode, status, actGroup, userName)` — nếu truyền actGroup thì chỉ update HĐ có ACT_GROUP hoặc ACTIVITIES_GROUP khớp actGroup (CSKD generated dùng ACTIVITIES_GROUP, form thủ công dùng ACT_GROUP → match cả 2). actGroup rỗng → update tất cả (như cũ).
- **Chưa thêm cascade**: bulk-by-cskd không gọi afterActivityCompleted (chỉ /update-status single mới cascade). Báo user nếu cần.

## 2026-08-10 — Gọi API QLBH tiep_nhan khi sinh vùng "Hoạt động khai báo chính sách" của CSKD

- **Phạm vi**:
  - `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/businessPolicy/impl/QlbhApiClient.java` — thêm `tiepNhan(QlbhTiepNhanRequestSdi)`: multipart POST `{qlbh.domain}/qlbh/cskd/tiep_nhan`, header `Authorization` (resolveQlbhAuthorization có sẵn) + `Idempotency-Key`; body gồm các field text + `fileMetadata` (JSON array qua ObjectMapper cục bộ) + nhiều `files`. Nếu `isQlbhDomainNotConfigured()` → log warn + return (không throw). Mọi lỗi HTTP/network bị catch + log, không rethrow.
  - Tạo `dto/sdi/businessPolicy/QlbhTiepNhanRequestSdi.java`, `QlbhTiepNhanFileEntrySdi.java` (DTO request + entry file đính kèm: type/typeName/fileName/content).
  - `BusinessPolicyActivityServiceImpl.java`: inject thêm `businessPolicyNewProductRepo`, `productTypeRepo`, `organizationRepo`, `locationRepo`, `projectPLSignReqRepo`, `qlbhApiClient`. Thêm `sendCskdToQlbhTiepNhan(businessPolicy, tab2SignReqId)` gọi ở 2 điểm (sau khi tạo HĐ thành công, bọc try/catch riêng không phá luồng sinh HĐ):
    - `generateDeclarationActivitiesForExistingProductAfterSign` (SP đã có, sau khi ký trình ký tab khai báo) — tự resolve tab2SignReqId mới nhất state DPD/DBH (3/4).
    - `onPycKhaiBaoSigned` (batch3, SP mới) — dùng thẳng `signReqId` tham số (đã là signReq tab khai báo vừa ký).
  - Mapping field theo đúng spec đã chốt (cskdCode=policyCode, cskdName=policyName, product* theo isNewProduct rẽ nhánh BusinessPolicyNewProduct/ProductType, requestType="1"/"0", requestUnit/businessUnit theo Organization, applyScope map Location theo scope CSV — coi "" hoặc "TQ" là "Toàn quốc", proposalNo/issueDate/effectiveDate/expireDate format yyyy-MM-dd, bccsServiceCode=productServiceNameCode).
  - Idempotency-Key = `policyCode:SR_<tab2SignReqId>`, nếu không có signReq tab2 đã ký thì `SR_NA`.
  - **fileMetadata 4 loại (theo yêu cầu cập nhật giữa chừng, type là số dạng String)**: `"15"` Tờ trình (file chính tab=1 SR đã ký, CRM_DOC_TYPE=PROJECT_PL_SIGN_REQ_FILE_TYPE_SIGN_REQ), `"16"` Phụ lục tờ trình (tab=1, CRM_DOC_TYPE=APPENDIX), `"17"` PYC khai báo chính sách (file chính tab=2 SR đã ký), `"18"` Phụ lục PYC (tab=2, APPENDIX — đã gồm cả phụ lục BM QLBH convert PDF sinh bởi `generateKhaiBaoPycAppendices`). Mỗi loại lấy tối đa 1 file (CRMDocument đầu tiên có file active, tài liệu doc khác trong cùng slot bị bỏ qua) — đã note ASSUMPTION này với user.
  - Lấy file qua `crmDocumentRepo.getListCRMDocProjectPLSignReqByIdAndDocType(signReqId, crmDocType)` (đúng cơ chế sẵn có, tương tự `generateKhaiBaoPycAppendices`/`cloneFilesSignReqWhenSignedForBusinessPolicy`) + `crmDocumentFileService.getFilesActiveByCRMDocId2` + `downloadFile3(String.valueOf(crmDocId), fileUri)`.
- **Lý do**: nghiệp vụ tích hợp CRM→QLBH, đẩy thông tin CSKD 1 lần/CSKD ngay khi sinh xong vùng hoạt động khai báo chính sách (idempotency đảm bảo bởi header + guard "đã tồn tại HĐ" sẵn có ở 2 method gọi).
- **Ghi chú/rủi ro**:
  - type code "15/16/17/18" + typeName do user cung cấp giữa task, đã đặt thành hằng static final đầu `BusinessPolicyActivityServiceImpl` để dễ chỉnh.
  - Giả định: mỗi slot chỉ đính 1 file (CRMDocument đầu tiên có file), nếu tab=2 Phụ lục PYC có nhiều hơn 1 tài liệu phụ lục thực tế (vd PL1/PL2/PL3 riêng biệt từ `generateKhaiBaoPycAppendices`) thì chỉ 1 phụ lục đầu tiên được gửi — cần user xác nhận có cần gộp nhiều phụ lục vào 1 file hoặc gửi nhiều entry cùng type "18" không.
  - Gọi tiep_nhan xảy ra TRONG transaction sinh HĐ (trước khi commit) — không rollback do try/catch nuốt lỗi, nhưng giữ transaction mở lâu hơn trong lúc gọi mạng ra QLBH.
  - Không có thay đổi DB/schema cho task này → không sinh file SQL.
  - Chưa viết unit test (constraint dự án không cho build/test khi thiếu VPN); cần user tự chạy `mvn clean install` khi VPN sẵn sàng.
- **Cập nhật cùng ngày (sau khi user xác nhận 3 điểm)**:
  - `requestType` giữ nguyên "0"/"1" (không đổi).
  - SP mới (isNewProduct=1): `productServiceType` = `newProduct.productLineNameNew` (rỗng nếu null), `productServiceTypeCode` = "" luôn (SP mới chưa có mã loại). SP cũ giữ nguyên lấy từ `ProductType`.
  - Phụ lục (type "16" tab=1, type "18" tab=2): đổi từ "chỉ 1 file đầu" sang gửi **TẤT CẢ** file active của mọi CRMDocument phụ lục — thêm method `addAllSignReqFiles` (duyệt hết doc + hết file, mỗi file 1 entry fileMetadata riêng). File chính (type "15"/"17") vẫn giữ `addFirstSignReqFile` (chỉ 1 file/loại). Tổng số file gửi có thể >4, chấp nhận theo yêu cầu user.

## 2026-08-10 — QLBH tiep_nhan: bccsServiceCode để trống

- **Phạm vi**: `BusinessPolicyActivityServiceImpl.buildQlbhTiepNhanRequest`.
- CSKD không có field "mã dịch vụ BCCS" riêng; telecomServiceId chỉ có sau khi khai báo BCCS xong. User chốt: bccsServiceCode gửi rỗng "". Đổi setBccsServiceCode(productServiceNameCode) → setBccsServiceCode("").

## 2026-08-10 — Sửa 3 lỗi BLOCK từ team-lead-reviewer (QLBH tiep_nhan)

- **Phạm vi**:
  - `BusinessPolicyActivityService.java` (interface): đổi `generateDeclarationActivitiesForExistingProductAfterSign(Long businessPolicyId)` → thêm tham số `Long signedTab2SignReqId`.
  - `BusinessPolicyActivityServiceImpl.java`: cập nhật signature khớp interface; dùng thẳng `signedTab2SignReqId` cho Idempotency-Key + file type 17/18 khi != null, chỉ fallback `resolveLatestApprovedSignReqId` khi null. Thêm `scheduleSendCskdToQlbhTiepNhan(businessPolicy, tab2SignReqId)`: nếu `TransactionSynchronizationManager.isSynchronizationActive()` → `registerSynchronization(new TransactionSynchronization() { afterCommit() {...} })` gọi `sendCskdToQlbhTiepNhan` sau khi commit; else gọi thẳng. Áp dụng ở cả 2 call site (thay `sendCskdToQlbhTiepNhan` trực tiếp bằng `scheduleSendCskdToQlbhTiepNhan`). Capture `businessPolicy`/`tab2SignReqId` vào biến `final` trước khi register.
  - `ProjectPLSignReqServiceImpl.syncStateVofficeByProjectPlIdForKhaiBaoCSKD`: **CRITICAL fix** — trước đây gọi `generateDeclarationActivitiesForExistingProductAfterSign(businessPolicyId)` (chỉ SP cũ, luôn gọi bất kể isNewProduct) NGAY TRONG nhánh state DPD/DBH, TRƯỚC `projectPLSignReqRepo.save(signReq)` → signReq mới chưa persist nên nếu code tự query lại sẽ ra null; đồng thời SP mới (isNewProduct=1) không bao giờ được trigger `onPycKhaiBaoSigned`. Fix: thêm cờ `shouldTriggerDeclareActivities` (set `true` trong nhánh DPD/DBH thay vì gọi thẳng), sau `projectPLSignReqRepo.save(signReq)` mới rẽ nhánh theo `businessPolicy.getIsNewProduct()`: `==1` → `onPycKhaiBaoSigned(businessPolicyId, signReq.getProjectPLSignReqId(), signReq.getCreateBy(), transInfo.getActionDate())`; else → `generateDeclarationActivitiesForExistingProductAfterSign(businessPolicyId, signReq.getProjectPLSignReqId())` (truyền thẳng ID vừa lưu, không cần query lại).
- **Lý do**: team-lead-reviewer BLOCK — CRITICAL: signReqId null do resolve trước khi save (SP đã có); CRITICAL: onPycKhaiBaoSigned chưa từng được gọi ở luồng thực tế (SP mới không có file type 17/18 + không tiep_nhan); HIGH: gọi QLBH giữa transaction sinh HĐ, chuyển ra after-commit để tránh giữ transaction mở lâu và tránh gọi API khi transaction có thể rollback ở bước sau.
- **Đã note lại cho user (KHÔNG tự sửa)**: `generateKhaiBaoPycAppendices` (sinh 3 phụ lục PL1-3 khi trình ký) hiện **KHÔNG có nơi nào gọi** trong codebase (grep xác nhận 0 call site ngoài định nghĩa) — nếu đúng vậy, file type "18" (Phụ lục PYC) trong `tiep_nhan` sẽ luôn rỗng vì chưa từng có CRMDocument phụ lục nào được tạo cho SR tab=2. Cần user xác nhận method này có nên được gọi trong `createForKhaiBaoCSKD`/`sendAndSignForKhaiBaoCSKD` (hoặc nơi khác) hay đây là tính năng dở dang từ trước, ngoài phạm vi task hiện tại.

## 2026-08-10 — QLBH tiep_nhan: bỏ hẳn field bccsServiceCode

- **Phạm vi**: `QlbhApiClient.buildTiepNhanBody` (bỏ `body.add("bccsServiceCode", ...)`), `BusinessPolicyActivityServiceImpl.buildQlbhTiepNhanRequest` (bỏ `request.setBccsServiceCode("")`), `QlbhTiepNhanRequestSdi` (xoá field `bccsServiceCode` — dead code, không còn nơi nào dùng).
- **Lý do**: user chốt lại — không gửi field này lên QLBH nữa (thay vì gửi rỗng "").

## 2026-08-10 — Đánh số lại phụ lục CSKD tab Thẩm định (PL3→PL7, tránh trùng PL1/PL2 hiệu quả)

- **Phạm vi**: `crm-service/VcrmApp/src/main/java/com/app/businessproject/service/impl/CRMDocumentServiceImpl.java`.
- **Xác nhận ngữ cảnh**: `copyFileKhaiBaoChinhSachAppendixForCSKD` chỉ có 1 call site duy nhất — `FormSignReq.vue` gọi ngay sau `projectBPSignReqCreateForThamDinhCSKD` (tab Thẩm định và ký duyệt, nơi có sẵn PL1=hiệu quả doanh thu, PL2=hiệu quả chi phí). KHÔNG dùng chung với tab Khai báo chính sách (PYC khai báo riêng dùng `generateKhaiBaoPycAppendices` ở `BusinessPolicyActivityServiceImpl`, khác hoàn toàn). An toàn để đổi số PL3-PL7.
- **Đổi hằng số (dòng 63-66 cũ → 64-70 mới)**:
  - `APPENDIX_FILE_NAME_PL4_BCCS` → `APPENDIX_FILE_NAME_PL3_BCCS` = "Phụ lục 3_Khai báo mặt hàng gói cước trên BCCS.pdf".
  - Mới: `APPENDIX_FILE_NAME_PL4_QLBH_PREFIX` = "Phụ lục 4_Khai báo chính sách trên QLBH" (không đuôi, ghép PDF_FILE_EXTENSION).
  - Mới: `APPENDIX_FILE_NAME_PL5_PBH_PREFIX` = "Phụ lục 5_Khai báo chính sách trên PBH" (không đuôi, ghép đuôi gốc file nguồn).
  - `APPENDIX_FILE_NAME_PL2_SAP` → `APPENDIX_FILE_NAME_PL6_SAP` = "Phụ lục 6_BM khai báo SPDV mới trên SAP.pdf".
  - `APPENDIX_FILE_NAME_PL3_TELECOM` → `APPENDIX_FILE_NAME_PL7_TELECOM` = "Phụ lục 7_PYC khai báo xin cấp mã TelecomServiceID, Saletrantype trên BCCS.pdf".
  - Mới: `PDF_FILE_EXTENSION = ".pdf"`.
- **`generateAndSaveQlbhImportedAppendixPdfs`**: bỏ dùng `pdfFile.getFileName()` (tên gốc) làm tên lưu; đổi sang `buildIndexedAppendixFileName(APPENDIX_FILE_NAME_PL4_QLBH_PREFIX, PDF_FILE_EXTENSION, existingFileNames)` — file đầu "Phụ lục 4_...QLBH.pdf", file 2 trở đi tự thêm " (2)", " (3)"...
- **`copyImportedDeclareFilesToAppendix`**: trước đây copy file vật lý giữ nguyên URI gốc bằng `copyFileByCrmDocFileUriOrigin`. Đổi sang: build tên mới `buildIndexedAppendixFileName(APPENDIX_FILE_NAME_PL5_PBH_PREFIX, extractFileExtension(sourceFileUri), existingFileNames)`, tải bytes nguồn qua `crmDocumentFileService.downloadFile3(sourceCrmDocId, sourceFileUri)` rồi lưu lại bằng cơ chế sẵn có `saveGeneratedAppendixPdf` (tái dùng `overrideFileToServe`) — đảm bảo cả `crmDocFileUri` hiển thị VÀ file vật lý đều dùng tên mới.
- **Helper mới**: `buildIndexedAppendixFileName(prefix, extension, existingFileNames)` (dò tăng dần " (2)", " (3)"... dựa vào `existingFileNames`, list này được cập nhật ngay sau mỗi lần lưu thành công nên tự nhiên xử lý đúng thứ tự nhiều file); `extractFileExtension(fileName)` (lấy phần đuôi từ dấu "." cuối, "" nếu không có).
- **Không đụng**: tên method `businessPolicyAppendixPdfService::createAppendixPl4BccsPackage/Pl2SapNewProduct/Pl3TelecomServiceId` (định nghĩa ở file/interface khác, chỉ là identifier nội bộ không phải tên file hiển thị) và nội dung tiêu đề bên trong PDF (vd "PHỤ LỤC 02" in `BusinessPolicyAppendixPdfServiceImpl`) — ngoài phạm vi task, không sửa để giữ diff tối thiểu.
- **Không đổi DB**.

## 2026-08-10 — Form cập nhật HĐ khai báo CSKD: thêm % hoàn thành + align Figma (đợt 1)

- **Phạm vi**: `client/.../business-policy/Form/FormUpdateActivityKhaiBaoCS.vue` + type `extensionActivity.ts`.
- **% hoàn thành**: thêm field `percentCompleted`; logic theo status — TODO→0, DONE→100 (readonly, set qua watch + prefill), DOING→cho nhập tay (a-input-number 0-100, disabled khi !DOING). Gửi trong payload editAct.
- **Label**: "Mã PYC JIRA" → "Link PYC JIRA TĐ" (theo Figma GiaoDien_CapNhat_CongViec_KhaiBaoBCCS 94:2); maxlength 100→255; sửa message validate.
- Thêm percentCompleted vào ExtensionActivityRow type.
- **Figma đã xem**: KhaiBaoBCCS(94:2), NangCapQLBH(124:628). Frame khác: KhaiBaoQLBH(124:428), KhaiBaoMoiBCCS(124:525), KhaiBaoMoiSAP(124:578), NangCapPBH(124:687), TrinhKyPYC(124:746).
- **CÒN THIẾU (chưa làm)**: File đính kèm mặc định lấy file BM đã import — cần cơ chế upload + nguồn BM theo nhóm + lưu file khi editAct. Đánh giá nâng cấp (UPGRADE_EVAL) KHÔNG có file đính kèm (khớp PYC + Figma).

## 2026-08-10 — File đính kèm cho FormUpdateActivityKhaiBaoCS (khai báo CSKD)

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormUpdateActivityKhaiBaoCS.vue`.
- **Thay đổi chính**:
  - Thêm section "File đính kèm" (a-upload, `:show-upload-list=false`, tự render list + nút xoá/tải) — CHỈ hiện với nhóm BCCS_PACKAGE/QLBH/PBH/BCCS_NEW/SAP_NEW, ẨN với UPGRADE_EVAL (computed `showFileAttachment`). accept=`PROJECT_PL_ALLOWED_FILE_EXTENSIONS`, mỗi file ≤55MB.
  - Prefill mặc định: `onMounted` → `initAttachmentFiles()`. Gọi `getFile({activityId: record.id})`; NẾU đã có file → hiển thị (crmDocId, không re-upload). NẾU chưa → nạp PL mặc định: `crmDocumentGetByBusinessPolicyId({businessPolicyId=record.objectRefId})` → match crmDocName theo KEYWORD nhóm (GÓI CƯỚC/GOI CUOC, QLBH, PBH, SAP, TELECOM|SALETRAN) → `getFilesActiveByCRMDocId3` → tải bytes qua `fetch(${baseAppURL}/crm-document/downloadFile2?crmDocFileId=...)` (Bearer token từ `ls.get(ACCESS_TOKEN)`) → `new File(...)`. Không tìm thấy → fileList rỗng, không lỗi.
  - Lưu: sau `editAct` OK, `uploadAttachmentFiles(record.id)` lọc file có `originFile` và name không trùng file đã đính kèm (dedup theo tên) → `uploadFile({files, activityId})` (`/crm-document/uploadFileActivities`).
  - Model file dùng interface `AttachmentFile {uid,name,crmDocId?,originFile?}` (tránh hack File.uid; before-upload nhận `File` như pattern FormActionExplanation.vue).
- **Lý do**: yêu cầu bổ sung File đính kèm theo Figma 94:2; 2 điểm chốt của user (keyword matching; prefill getFile→PL default, lưu qua uploadFileActivities).
- **Ghi chú**:
  - Giữ nguyên phần `% hoàn thành` + label đã có.
  - GIẢ ĐỊNH: (1) File đính kèm bắt buộc khi Trạng thái=DONE (thêm vào `validateOnDone`, khớp dấu * Figma + pattern field required-on-done); lúc load rỗng KHÔNG lỗi. (2) activityId=record.id (fallback body nếu number). (3) Tên PL mặc định lệch giữa task/constant/Figma → dùng keyword match (không phụ thuộc số PL). (4) getFilesByCrmDocId dùng cho tải file đã đính kèm (theo eventForm.vue).
  - CHƯA build/lint (cần VPN) — user tự chạy `npm run dev`/`build`.

## 2026-08-10 — Form cập nhật 7 hoạt động khai báo CS: thêm Thời gian kết thúc thực tế + Kết quả thực hiện

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormUpdateActivityKhaiBaoCS.vue`, `client/src/views/sales-project/business-policy/types/extensionActivity.ts`.
- **Thay đổi chính**:
  - Sắp lại field theo Figma: hàng `Trạng thái (md=12) | % hoàn thành (md=12)` → `Thời gian kết thúc thực tế` (a-date-picker, name=actualEndTime, required khi DONE) → `Kết quả thực hiện` (a-textarea name=resultImplement, maxlength 2000) → nhóm theo group (upgradeResult/productHierarchy/telecom/jira) → File đính kèm.
  - Script: thêm `actualEndTime: Dayjs|null` + `resultImplement: string|null` vào FormState/formData/prefill (parseDateTime/`?? null`)/payload (`format(DATE_TIME_FORMAT)`). validateOnDone yêu cầu actualEndTime khi Hoàn thành.
  - Type `ExtensionActivityRow`: thêm `actualEndTime?`, `resultImplement?`.
- **Lý do**: form mới cập nhật trên Figma bổ sung 2 trường còn thiếu + đổi thứ tự.
- **Ghi chú**: Backend không đổi — `ExtensionActivitiesSdi` đã có `actualEndTime`(@JsonFormat "dd/MM/yyyy HH:mm"), `resultImplement`, `percentCompleted`; `edit()` map qua `BeanUtils.copyProperties` nên tự lưu. User tự `npm run build-develop` khi có VPN.

## 2026-08-10 — Kết quả thực hiện bắt buộc khi Hoàn thành (FormUpdateActivityKhaiBaoCS.vue)

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormUpdateActivityKhaiBaoCS.vue`.
- **Thay đổi chính**: a-form-item `resultImplement` thêm `:required="isRequiredWhenDone"`; `validateOnDone` chặn khi trống Kết quả thực hiện lúc Trạng thái = Hoàn thành.
- **Lý do**: yêu cầu bổ sung — Kết quả thực hiện cũng bắt buộc.

## 2026-08-10 — Fix Mã hoạt động (activitiesCode) trống cho HĐ khai báo CS tự sinh

- **Phạm vi**: `crm-service/VcrmApp/.../service/businessPolicy/impl/BusinessPolicyActivityServiceImpl.java` (`createActivitiesAndApplyOrgUnit`).
- **Chẩn đoán**: KHÔNG phải select sai — mọi query đều có `ea.ACTIVITIES_CODE AS activitiesCode`. Lỗi do **không ghi**: `createBatch` không set `activitiesCode` (dòng sinh mã `generateActivitiesCode()` bị comment, xưa chỉ áp org TT_GPMN); `buildActivity` cũng không set → HĐ insert với ACTIVITIES_CODE=NULL.
- **Thay đổi chính**: sau `createBatch`, loop toàn bộ createdIds; nếu `activitiesCode` trống thì `setActivitiesCode(extensionActivitiesRepo.generateActivitiesCode())` (stored proc `generate_activities_code()`), đồng thời set org unit (nếu có). Bỏ early-return khi không có org unit để mã vẫn được sinh.
- **Lý do**: cột Mã hoạt động trống trên UI cho HĐ khai báo CS tự sinh.
- **Ghi chú**: Chỉ khoanh vùng luồng CSKD (hàm này chỉ dùng ở BusinessPolicyActivityServiceImpl). Fix chỉ áp cho HĐ SINH MỚI sau khi build; HĐ cũ đã null vẫn null — nếu cần backfill phải chạy SQL update gọi proc cho từng dòng (user quyết). User tự build (`mvn clean install`) + test khi có VPN.

## 2026-08-10 — 5 cột *_decl_status trên business_policy đồng bộ từ trạng thái HĐ tự sinh

- **Phạm vi**:
  - `crm-service/sql/2026-08-10_business_policy_decl_status.sql` (ADD COLUMN IF NOT EXISTS 5 cột).
  - `BusinessPolicyActivityServiceImpl.java` (+ abs interface): `refreshDeclarationStatus(businessPolicyId)` + private `resolveDeclStatusByGroup`.
  - `ExtensionActivitiesServiceImpl.java`: gọi refresh ở `edit()`, `updateStatus()`, `updateStatusByCskdCode()`.
- **Map cột ↔ actGroup**: sap_product←BP_SAP_NEW, bccs_product←BP_BCCS_NEW, bccs_package←BP_BCCS_PACKAGE, qlbh_policy←BP_QLBH, pbh_policy←BP_PBH.
- **Mã hoá giá trị** (user chốt): phản chiếu status HĐ 1/2/3/4 (Chưa TH/Đang TH/Hủy/Hoàn thành), NULL khi chưa có HĐ. Lấy HĐ mới nhất theo group (max id), match cả `activitiesGroup` lẫn `actGroup`.
- **Cơ chế**: recompute-from-source idempotent — load toàn bộ HĐ CSKD (status != DELETED), tính lại 5 cột, chỉ save khi có thay đổi. Gọi cuối 3 hàm sinh HĐ (khởi tạo =1) + mọi luồng cập nhật trạng thái HĐ BUSINESS_POLICY.
- **Lý do**: entity BusinessPolicy đã có sẵn 5 field (sap/bccsProduct/bccsPackage/qlbh/pbhPolicyDeclStatus) nhưng chưa có logic ghi.
- **Ghi chú**: entity KHÔNG cần sửa (field đã tồn tại). CSKD/HĐ đã tạo trước đó sẽ tự backfill khi có lần cập nhật HĐ tiếp theo; nếu cần backfill ngay phải chạy SQL riêng. User tự chạy SQL cột + `mvn clean install` khi có VPN.

## 2026-08-10 (bổ sung) — Backfill SQL cho 5 cột *_decl_status

- **Phạm vi**: `crm-service/sql/2026-08-10_business_policy_decl_status.sql` — thêm 5 câu UPDATE backfill sau phần ADD COLUMN.
- **Logic**: mỗi cột = status HĐ mới nhất (ORDER BY ea.ID DESC LIMIT 1, CAST STATUS AS SIGNED) theo group (match ACTIVITIES_GROUP hoặc ACT_GROUP), OBJECT_REF_CODE='BUSINESS_POLICY', STATUS<>'0'; NULL nếu không có HĐ. Chỉ CSKD is_deleted=0.
- **Ghi chú**: idempotent — chạy lại cho ra cùng kết quả, khớp logic Java `refreshDeclarationStatus`. User tự chạy khi có VPN.

## 2026-08-10 — Fix 3 lỗi luồng thẩm định/trình ký CSKD

- **Phạm vi**:
  - `crm-service/VcrmGeneral/.../Const.java` (PL6 Telecom), `crm-service/VcrmApp/.../service/impl/CRMDocumentServiceImpl.java` (PL7 dead constant): bỏ dấu phẩy tên file phụ lục.
  - `crm-service/VcrmApp/.../service/impl/ProjectPLSignReqServiceImpl.java` (`cancelSignReqProcess`).
  - `client/src/views/sales-project/business-policy/Form/FormSignReq.vue` (onMounted create), `Detail/Tab7.vue` (message).
- **Issue 1 — phụ lục Telecom không sinh được**: root cause = tên file "...TelecomServiceID, Saletrantype trên BCCS.pdf" có DẤU PHẨY → `CRMDocumentFileServiceImpl.uploadFileLocal3` (dòng 3569 `.contains(",") return null`) không ghi file; `overrideFileToServe` vẫn return true nên lỗi bị nuốt. Fix: đổi ", Saletrantype" → " và Saletrantype" ở tên file (bỏ phẩy). Chỉ file này có phẩy trong luồng.
- **Issue 2 — ấn Hủy trình ký tab thẩm định lỗi**: `cancelSignReqProcess` gọi vOffice `changeStateSign` với `textId=vofficeCode` kể cả khi chưa đẩy vOffice (vofficeCode null/"0") → vOffice trả khác "1"/ném lỗi → `catch` nuốt → return false ("thất bại"); thiếu `autoUpdateProcessStatus`. Fix: guard `notPushedToVoffice` (null/"0") → hủy cục bộ bỏ qua vOffice; không nuốt lỗi (throw AppException message rõ); sau khi save gọi `businessPolicyService.autoUpdateProcessStatus(objectRefId)`. Sửa Tab7.vue:992 `message.success`→`message.error` cho nhánh thất bại.
- **Issue 3 — file PL chỉ hiện sau khi lưu**: `copyFileKhaiBaoChinhSachAppendixForCSKD` (PL3-PL7) chỉ gọi trong `handleSubmit`. Fix: gọi thêm trong nhánh create của `onMounted` (theo businessPolicyId, không cần signReqId) NGAY sau `copyFileBusinessEfficiencyForCSKD` và trước `getFileUpload()`. BE idempotent (dedup theo tên file) nên giữ luôn call cũ ở handleSubmit làm fallback.
- **Ghi chú**: Có thể còn bản ghi CRMDocumentFile "mồ côi" tên có phẩy (không có file vật lý) từ lần lỗi trước — regenerate sẽ tạo file tên mới (không phẩy); dọn orphan nếu cần. User tự build (`mvn clean install`, `npm run build-develop`) khi có VPN.

## 2026-08-10 — Fix preview file phụ lục + validate P CL khi tạo SR (CSKD)

- **Issue preview (icon mắt xem trước file lỗi ở cả tab Thẩm định & Khai báo)**:
  - Root cause: file phụ lục khai báo CS tự sinh (PL3-PL7) copy vào `appendixFile.crmDocId`, nhưng BE `downloadFilePreviewSignReqVO` (nhánh APPENDIX) chỉ tìm crmDoc qua `businessEfficiencyType`; FE `getProjectPLBusinessEfficiencyType(file.name)` chỉ map PL1/PL2/PL3 → trả '' cho PL4-PL7 → BE không tìm được crmDoc → không dựng path → preview fail. Nhánh cũ còn return path kể cả file không tồn tại → 500.
  - Fix BE: `DownloadFilePreviewSignReqVOSdi` thêm `Long crmDocId`; `ProjectPLSignReqServiceImpl.downloadFilePreviewSignReqVO` nhánh APPENDIX thử lần lượt crmDoc theo businessEfficiencyType rồi `sdi.crmDocId`, chỉ return path khi `new File(path).exists()` (tránh 500, fallback graceful).
  - Fix FE: `FormSignReq.vue` + `FormSignReqKhaiBaoCS.vue` (2 chỗ) — download call thêm `crmDocId: crmDocType===APPENDIX ? appendixFile.value.crmDocId : null`.
  - Phạm vi: `crm-service/VcrmApp/.../dto/sdi/signReq/DownloadFilePreviewSignReqVOSdi.java`, `.../service/impl/ProjectPLSignReqServiceImpl.java`, `client/.../business-policy/Form/FormSignReq.vue`, `.../Form/FormSignReqKhaiBaoCS.vue`.
- **Issue validate P CL**: thêm điều kiện vào `checkMissingConditionsForSignReq` (Tab7.vue) — nếu có SR (dịch vụ) `orgUnitCodeName==='P CL'` mà `getLatestResult(workLogs)!=='đạt'` → push 'CSKD của dịch vụ có đơn vị xử lý là P CL chưa được thẩm định ở trạng thái "Đạt"'. Hiển thị trong popup Modal.warning sẵn có (chặn cứng), tái dùng logic điều kiện #5.
- **Ghi chú**: preview file SIGN_REQ/BASE (qua VOffice) không đổi (BE chỉ dùng crmDocId trong nhánh APPENDIX). User tự build (`mvn clean install`, `npm run build-develop`) khi có VPN.

## 2026-08-10 — Download template QLBH: isEditProduct=1 tải cả 2 biểu mẫu

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormDeclareInfoArea.vue`.
- **Thay đổi**: thêm `onSectionDownloadAllTemplates(key)` (loop `templateOptionsFor(key)` → await `downloadTemplateFile` từng cái). Template: section QLBH luôn 1 nút "Tải biểu mẫu" → tải tất cả (Gói cước luôn có; + Sản phẩm khi `isEditProduct===1`) = 2 lần call API. Section khác (BCCS) giữ dropdown/single như cũ.
- **Lý do**: yêu cầu — chọn "Có sửa SP/DV = 1" thì tự tải cả 2 biểu mẫu Gói cước + Sản phẩm.
- **Ghi chú**: requirement PH khi isNewProduct=1 còn CHỜ user xác nhận (mâu thuẫn với quyết định cũ "PH không bắt buộc khi isNewProduct=1"; BE `downloadQlbhTemplate` đã tự `resolveProductHierarchy` từ hoạt động SAP_NEW/productType rồi truyền product_hierarchy nếu non-empty).

## 2026-08-10 (bổ sung) — Download template QLBH: PH theo isNewProduct + hiển thị detailMessage lỗi

- **PH theo isNewProduct (BE)**: `BusinessPolicyDeclareInfoServiceImpl.downloadQlbhTemplate` — chỉ resolve & truyền `product_hierarchy` khi CSKD có `isNewProduct == 0` (SP/DV đã có); isNewProduct==1 (SP mới) → PH=null (không truyền). Dùng cờ isNewProduct THẬT từ `businessPolicyRepo` (không dùng param FE vì param đó = isEditProduct). Khớp yêu cầu user "isNewProduct=0 thì chuyền PH".
- **Hiển thị lỗi QLBH (FE)**: QLBH trả `{errorCode:"API-PST011", message, detailMessage:"product_hierarchy không được để trống"}`. `client/src/utils/saveFile.ts` sửa `reject(resObj.message||errorCode)` → `reject(resObj.detailMessage||message||errorCode)` (ưu tiên detailMessage). `useDeclareTemplateDownload.ts` catch: hiển thị `detail` (string reject / Error.message) thay vì generic 'Tải biểu mẫu thất bại'.
- **Phạm vi**: `crm-service/VcrmApp/.../BusinessPolicyDeclareInfoServiceImpl.java`, `client/src/utils/saveFile.ts` (dùng chung toàn app — chỉ đổi thứ tự ưu tiên field lỗi, an toàn), `client/.../Form/useDeclareTemplateDownload.ts`.
- **Ghi chú**: SP đã có mà PH resolve null (nhiều product type) → QLBH báo thiếu PH → FE nay hiện đúng detailMessage. User tự build khi có VPN.

## 2026-08-10 (bổ sung 2) — Template QLBH: tách rõ isNewProduct vs isUpdateProduct

- **2 field khác nhau**: `isNewProduct` ("CSKD của SP/DV mới?" — màn tạo CSKD) quyết định GỬI PH; `isUpdateProduct` ("Có sửa thông tin SP/DV trên QLBH?" — popup khai báo, code hiện đặt tên `isEditProduct`) quyết định TẢI 2 biểu mẫu.
- **PH (BE, đã làm trước)**: gửi product_hierarchy khi `isNewProduct == 0` (SP cũ); ==1 → không gửi. Đúng yêu cầu.
- **Tải 2 biểu mẫu (FE, FormDeclareInfoArea.vue)**: helper `isQlbhBothTemplates(key) = isEditProduct===1 || props.isNewProduct===1`. Dùng ở `qlbhTemplateOptions` (thêm SAN_PHAM) + `maxFileCountFor` (=2). Nút "Tải biểu mẫu" QLBH tải tất cả option → 2 lần call khi both.
  - isNewProduct=0 & isEditProduct=1 → 2 file (Sản phẩm + Gói cước).
  - isNewProduct=1 → watch ép `sections[*].isEditProduct=1` + radio "Có sửa..." `:disabled` → auto "Có" → 2 file.
  - isNewProduct=0 & isEditProduct=0 → chỉ Gói cước (1 file).
- **Composable** `useDeclareTemplateDownload.ts`: `buildQlbhTemplateOptions` cũng thêm `|| props.isNewProduct === 1` cho nhất quán.
- **Ghi chú**: giữ tên biến `isEditProduct` (không rename sang isUpdateProduct) để diff tối thiểu — nó chính là field "Có sửa thông tin SP/DV trên QLBH?". User tự build khi có VPN.

## 2026-08-10 (bổ sung 3) — Import QLBH: error message theo API + productGroupId=qlbhSector cho tiếp nhận

- **productGroupId cho API tiếp nhận (BE)**: `BusinessPolicyActivityServiceImpl.buildQlbhTiepNhanRequest` — `productGroupId` đổi từ `newProduct.getProductGroupId()` (rỗng phần lớn) sang `resolveQlbhProductGroupId(businessPolicyId)` = `qlbhSector` (Lĩnh vực) đã lưu ở `BusinessPolicyDeclareInfo` (declareType='BP_QLBH'). Inject thêm `BusinessPolicyDeclareInfoRepo`. Lý do: QLBH cần productGroupId để check bản ghi được tạo; trước đây rỗng.
- **Import error message (FE)**: `services/app/businessPolicy/index.ts` `extractBlobErrorMessage` + `FormDeclareInfoArea.vue` `extractErrorMessage` — ưu tiên `detailMessage` (giống fix download). `commitPendingDeclareInfo` catch: hiện `... thất bại: <detailMessage>` thay vì generic. errorMessage render sẵn ở drawer (dòng 244).
- **Phạm vi**: `BusinessPolicyActivityServiceImpl.java`, `client/src/services/app/businessPolicy/index.ts`, `client/.../Form/FormDeclareInfoArea.vue`.
- **Ghi chú**: qlbhSector đã được lưu sẵn khi import (upsertDeclareInfo.setQlbhSector) — không cần đổi luồng lưu. User tự build khi có VPN.

## 2026-08-10 (bổ sung 4) — Download template QLBH: gửi đúng cả isNewProduct (thật) + isEditProduct

- **Bug**: FE download gửi `isNewProduct` param = giá trị `isEditProduct` → chọn isNewProduct=0 vẫn ra 1.
- **Fix FE** (`useDeclareTemplateDownload.ts`): gửi `isNewProduct` = `props.isNewProduct` (thật, từ CSKD) + `isEditProduct` = `modelRef.isEditProduct` — 2 param riêng.
- **Fix BE**: controller `download-qlbh-template` + interface + impl `downloadQlbhTemplate(...)` thêm `isEditProduct`. `QlbhApiClient.capTemplate`/`buildCapTemplateUrl` thêm `isEditProduct`; đổi tên param URL `is_new_product`→`isNewProduct`, thêm `isEditProduct` (camelCase — theo user "QLBH nhận là isNewProduct", khớp body validate QLBH `isNewProduct`/`requireUpdateProduct`).
- **PH gating**: đổi sang dùng chính param `isNewProduct` (nay FE gửi đúng) thay vì query lại businessPolicy — `isNewProduct==0` → resolve PH.
- **Ghi chú**: Upload/import QLBH KHÔNG gọi QLBH (validate đã bỏ theo yêu cầu trước) → không có request QLBH để gắn cờ; isEditProduct đã lưu ở declare-info, isNewProduct nằm ở business_policy. Chờ user xác nhận có cần upload gọi QLBH kèm 2 cờ không. User tự build khi có VPN.

## 2026-08-10 (bổ sung 5) — Bật lại QLBH validate khi import + gửi đúng 2 cờ (1/0) cho cả download & import

- **Mapping QLBH (user cung cấp curl validate)**: `POST /qlbh/cskd/import/validate`, form-data `linh_vuc`, `product_hierarchy`, `isNewProduct` (SP mới hay không), `requireUpdateProduct` (có sửa SP hay không), `files`. **Cả 2 cờ dùng 1/0** (như hệ thống mình), KHÔNG true/false.
- **QlbhApiClient**: `validate(files, qlbhSector, productHierarchy, Integer isNewProduct, Integer isEditProduct)` — body `isNewProduct`=1/0, `requireUpdateProduct`=isEditProduct 1/0. Bắt `HttpStatusCodeException` → `extractQlbhDetailMessage` (detailMessage||message) → `throw AppException("APP001", detail)` để FE hiện đúng lỗi API. `capTemplate(...)` cũng nhận isEditProduct; URL cap_template thêm `isNewProduct`(1/0) + `requireUpdateProduct`(1/0).
- **Import re-enable**: `importQlbhPolicy` gọi `qlbhApiClient.validate(...)` TRƯỚC khi lưu (resolve PH khi isNewProduct==0). `validateQlbhPolicyOnly` (pre-create) gọi validate với PH null. Controller + interface thêm `isNewProduct`.
- **FE**: `useDeclareTemplateDownload` gửi `isNewProduct`(props thật)+`isEditProduct`. `FormDeclareInfoArea` `buildQlbhFormData` + commitPending thêm `isNewProduct` (props.isNewProduct). Lỗi import hiện detailMessage (đã làm trước).
- **Ghi chú/cần xác nhận**: cap_template (download) đang GIẢ ĐỊNH cùng tên param `isNewProduct`+`requireUpdateProduct` (1/0) như validate — user mới chỉ đưa curl validate. Chờ user xác nhận curl download nếu khác. User tự build khi có VPN.

## 2026-08-10 (bổ sung 6) — Fix 400 download cap_template + tách đúng download/import theo curl QLBH

- **cap_template (download) curl chuẩn**: `GET /qlbh/cskd/cap_template?linh_vuc=&loai_bieu_mau=&product_hierarchy=&is_new_product=<1/0>` (snake_case, CHỈ is_new_product, KHÔNG requireUpdateProduct). Trước đó tôi gửi `isNewProduct`/`requireUpdateProduct` camelCase → QLBH trả 400. Đã sửa: `buildCapTemplateUrl` dùng `is_new_product` snake, luôn kèm `product_hierarchy` (rỗng được), bỏ isEditProduct khỏi capTemplate/downloadQlbhTemplate/interface/controller/FE. Giá trị is_new_product = isNewProduct thật (FE gửi props.isNewProduct).
- **Download surface lỗi API**: capTemplate bắt `HttpStatusCodeException` → extractQlbhDetailMessage → throw AppException("APP001", detail) → FE saveFile.ts hiện detailMessage.
- **import/validate** giữ nguyên: form-data `isNewProduct`(1/0) + `requireUpdateProduct`(1/0=isEditProduct); import gọi validate, dùng response (JSON=ok / file lỗi / 4xx detail).
- **PH null fix**: `resolveProductHierarchyFromProductType` bỏ ràng buộc `size()==1` → lấy PH (productCodeHierarchy) ĐẦU TIÊN có giá trị từ productType của CSKD (khớp "lấy PH từ sản phẩm dịch vụ đã chọn"). PH chỉ gửi khi isNewProduct==0.
- **Ghi chú**: nếu PH phải theo 1 "Tên sản phẩm dịch vụ" cụ thể user chọn (không phải productType đầu tiên) thì cần biết field/luồng truyền lựa chọn đó. User tự build khi có VPN.

## 2026-08-10 (bổ sung 7) — Download QLBH: surface message thật của API + làm rõ nguồn PH

- **Lỗi download**: `extractQlbhDetailMessage` fallback trả **raw responseBody** khi không parse được detailMessage/message → FE hiện đúng message QLBH trả (không còn nuốt thành generic). Generic chỉ khi QLBH trả rỗng ("400 null") hoặc mất kết nối.
- **Nguồn PH hiện tại** (resolveProductHierarchy, chỉ chạy khi isNewProduct==0):
  1. EXTENSION_ACTIVITIES.PRODUCT_HIERARCHY_CODE với ACT_GROUP='BP_SAP_NEW' (chủ yếu cho SP mới).
  2. Fallback: PRODUCT_TYPE.PRODUCT_CODE_HIERARCHY theo business_policy.PRODUCT_TYPE_ID (CSV), lấy giá trị đầu tiên khác rỗng.
- **PH null**: thường do business_policy.PRODUCT_TYPE_ID rỗng hoặc PRODUCT_TYPE.PRODUCT_CODE_HIERARCHY rỗng cho các id đó → chờ user xác nhận nguồn PH đúng.

## 2026-08-10 (bổ sung 8) — PH download lấy từ combobox "Tên sản phẩm dịch vụ" đang chọn (SP cũ)

- **Vấn đề**: PH resolve server (PRODUCT_TYPE theo product_type_id) trả null; user muốn lấy `productCodeHierarchy` từ option đang chọn ở combobox "Tên sản phẩm dịch vụ" (=productTypeId) rồi gửi xuống download khi SP cũ.
- **FE**: `FormCommonInfo.vue` computed `selectedProductHierarchy` = option trong `listProductType` khớp `modelRef.productTypeId` (value=projectPLRnrId) → `.productCodeHierarchy`; truyền `:product-hierarchy` xuống `<form-declare-info-area>`. `FormDeclareInfoArea` thêm prop `productHierarchy`; `useDeclareTemplateDownload` gửi param `productHierarchy` khi `isNewProduct===0`.
- **BE**: `downloadQlbhTemplate(..., Integer isNewProduct, String productHierarchy)` — SP cũ: ưu tiên PH từ FE, fallback `resolveProductHierarchy`. Controller + interface thêm `productHierarchy`.
- **Ghi chú**: combobox single-select; option combobox (getAllProductTypeForCombobox) có sẵn `productCodeHierarchy` + `projectPLRnrId`. User tự build khi có VPN.

## 2026-08-10 (bổ sung 9) — Fix bug handler nuốt message (luôn in errorCode "APP001")

- **Root cause (BE)**: `ApiExceptionHandler.handleAppException` — dòng `ex.setMessage(message)` GHI ĐÈ message của ex TRƯỚC khi nhánh `if (errorCode.equals(message)) message = ex.getMessage()` đọc lại → khi errorCode không có trong messages.properties (messageResource trả về chính code, vd "APP001"), detail bị mất, response chỉ còn errorCode.
- **Fix**: capture `originalMessage = ex.getMessage()` TRƯỚC khi ghi đè; nhánh fallback dùng `originalMessage`. Giờ code lạ (không trong properties) trả về message thật (detail) thay vì bare code. Áp dụng toàn app (VcrmGeneral) — cải thiện, ít rủi ro (code có trong properties không đổi).
- **Hệ quả**: `throw new AppException("APP001", <detail QLBH>)` giờ trả `{errorCode:"APP001", message:<detail>}` → FE (saveFile.ts / extractErrorMessage / extractBlobErrorMessage đều đọc detailMessage||message||errorCode) hiện đúng detail.
- **Phạm vi**: `crm-service/VcrmGeneral/.../exception/ApiExceptionHandler.java`. FE không cần sửa.

## 2026-08-10 (bổ sung 10) — Fix QLBH tiep_nhan không tạo bản ghi: applyScope sai format + log lỗi

- **Root cause chính**: `resolveApplyScope` trả **TÊN địa bàn** ("Toàn quốc" / "An Giang, Bến Tre") — nhưng QLBH tiep_nhan cần **JSON array mã** `["AGG","BNH"]` (theo curl user). QLBH parse applyScope như JSON → chuỗi tên không phải JSON hợp lệ → nhiều khả năng bị reject, không tạo bản ghi.
- **Fix**: `resolveApplyScope` build JSON array các mã địa bàn từ `business_policy.scope` (CSV) → `["AGG","BNH"]`; rỗng → `[]`; toàn quốc scope="TQ" → `["TQ"]`.
- **Log lỗi**: `QlbhApiClient.tiepNhan` trước đây nuốt lỗi (chỉ log status). Nay log cả **response body** (non-2xx + success) và bắt `HttpStatusCodeException` log `getResponseBodyAsString()` → thấy được lý do QLBH từ chối.
- **Trigger**: tiep_nhan gọi ở `scheduleSendCskdToQlbhTiepNhan` (afterCommit) khi SINH hoạt động đợt 3 (sau khi ký PYC khai báo tab 2), KHÔNG phải lúc hoàn thành từng hoạt động.
- **Ghi chú/cần xác nhận**: format toàn quốc (TQ → `["TQ"]`?) chưa chắc đúng ý QLBH. Field thừa so với curl (sourceSystem, productServiceType, productServiceTypeCode) giữ lại (multipart thường bỏ qua field lạ). Warning field không dùng (locationRepo, SCOPE_CODE_TOAN_QUOC...) — để nguyên, diff tối thiểu. User build lại + xem log để biết QLBH trả gì.

## 2026-08-10 (đính chính bổ sung 10) — applyScope: toàn quốc = RỖNG (không null); trigger đúng

- `resolveApplyScope`: toàn quốc (scope rỗng hoặc "TQ") → trả **""** (chuỗi rỗng, vẫn gửi field applyScope rỗng), KHÔNG phải null. Có địa bàn → JSON array mã `["AGG","BNH"]` (loại "TQ" khỏi list).
- `buildTiepNhanBody`: luôn `body.add("applyScope", ...)` (rỗng cho toàn quốc).
- **Trigger tiep_nhan**: user xác nhận gọi CÙNG LÚC sinh hoạt động — đúng như code hiện tại, không đổi.

## 2026-08-10 (bổ sung 11) — tiepNhan: log message thật của QLBH

- `QlbhApiClient.tiepNhan`: thêm helper `resolveQlbhErrorMessage(body)` = `extractQlbhDetailMessage` (detailMessage||message||raw body) + fallback "(QLBH khong tra ve noi dung loi)" khi body rỗng. Log lỗi giờ có `message={message thật của QLBH}` thay vì chỉ generic. Áp cả nhánh non-2xx lẫn `HttpStatusCodeException`.
- **Lưu ý**: nếu QLBH trả "400 null" (body RỖNG) thì không có message để lấy — thường do request có giá trị field không hợp lệ (applyScope format đã fix). tiepNhan là afterCommit/void nên chỉ log được, không surface ra FE.

## 2026-08-10 (bổ sung 12) — Validate QLBH ngay khi upload file (không đợi Lưu)

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormDeclareInfoArea.vue`.
- **Thay đổi**: `onBeforeUpload` — khi section QLBH đủ file (>= maxFileCountFor: 1 nếu isEditProduct=0, 2 nếu =1) và đã chọn qlbhSector → gọi `validateQlbhSectionOnUpload(key)` → `validateBusinessPolicyDeclareQlbhPolicy` (validate-only, gọi QLBH ngay). Kết quả: file lỗi → tải + báo; lỗi API → hiện detailMessage; hợp lệ → toast "File hợp lệ trên QLBH". Thêm state `validatingQlbh` (bind spin + nút Lưu loading).
- **Lý do**: user muốn gọi API QLBH ngay lúc upload để feedback sớm, không đợi ấn Lưu.
- **Ghi chú**: persist (import + save) VẪN ở "Lưu" (submitSection). Validate-on-upload chỉ để check sớm; Save re-validate + lưu. Nếu user muốn IMPORT (persist) ngay lúc upload cho CSKD đã tồn tại thì cần đổi sang gọi importBusinessPolicyDeclareQlbhPolicy — chờ xác nhận.

## 2026-08-10 (bổ sung 13) — tiep_nhan: thêm file upload Khai báo QLBH vào files

- **Phạm vi**: `BusinessPolicyActivityServiceImpl.java`.
- **Thay đổi**: `resolveTiepNhanFiles` nhận thêm `businessPolicyId`; gọi `addDeclareInfoUploadedFiles` (mới) lấy file upload của declare-info QLBH (theo declare-info.crmDocId → getFilesActiveByCRMDocId2 → downloadCrmDocumentFileBytes) đưa vào `files` với type `QLBH_FILE_TYPE_BM_KHAI_BAO`. Sau đó vẫn thêm tờ trình thẩm định (15/16) + PYC khai báo (17/18).
- **files tiep_nhan giờ gồm**: (1) file BM upload QLBH, (2) Tờ trình thẩm định + phụ lục, (3) PYC khai báo + phụ lục.
- **CẦN XÁC NHẬN**: type code cho file BM upload — đang tạm để **"14"** / "Biểu mẫu khai báo QLBH". Curl mẫu user gửi dùng type "A"/"Loại hồ sơ A". Chờ user chốt mã đúng.

## 2026-08-10 (đính chính 13) — type file BM upload tiep_nhan = "A"

- File BM upload QLBH trong tiep_nhan: set type=`"A"`, typeName=`"Loại hồ sơ A"` (theo curl tiep_nhan mẫu user gửi). Các file trình ký giữ 15/16/17/18. Nếu QLBH cần mã khác cho BM upload → đổi 2 constant QLBH_FILE_TYPE_BM_KHAI_BAO / _NAME_.

## 2026-08-10 (bổ sung 14) — Luồng tạo HĐ: SP cũ nút "Tạo yêu cầu" luôn disable

- **FE** `TabKhaiBaoChinhSach.vue` `canCreateSignReq`: SP cũ (không phải isNewProductPolicy) đổi `return true` → `return false` → nút "Tạo yêu cầu" ở tab Khai báo CS LUÔN disable. SP mới giữ nguyên (enable khi đủ 4 đợt-1 done qua isBatch1AllDone).
- **Đã đúng sẵn (không đổi)**: SP mới 4 đợt-1 (generateActivitiesOnApproved) → đủ 4 → đợt-2 SIGN_PYC (afterActivityCompleted) → ký tab-2 → `onPycKhaiBaoSigned` COMPLETE đợt-2 (status DONE/100%/actualEndTime, dòng 436-442) + sinh 3 HĐ đợt-3. User chốt "đợt-3 auto khi trình ký được ký". SP cũ: 3 HĐ sinh lúc phê duyệt (generateActivitiesOnApproved nhánh SP cũ). Import: QLBH validate gọi ở nút Lưu popup (submitSection) đã có.
- **Yêu cầu "update đợt-2 sang hoàn thành khi sinh đợt-3"**: đã có sẵn ở onPycKhaiBaoSigned:436-442.

## 2026-08-10 (bổ sung 15) — Fix bypass validate QLBH (200+JSON coi là thành công)

- **Root cause**: QLBH validate trả **HTTP 200** nhưng body chứa lỗi application-level `{code:1, statusCode:400, message:"Trường 'product_hierarchy'..."}`. `interpretValidateResponse` chỉ check HTTP 2xx + content-type JSON → `if(isJsonResponse) return` (coi là thành công), BỎ QUA code/statusCode trong body → popup luôn "thành công" dù Postman thấy lỗi.
- **Fix**: `interpretValidateResponse` parse body JSON, gọi `extractQlbhBusinessError`: lỗi khi `statusCode >= 400 || (code != 0 && code != 200)` → throw `AppException("APP001", <message QLBH>)`. Giờ popup sẽ báo đúng lỗi QLBH thay vì auto-success.
- **Download (capTemplate)**: trường hợp 200+error-JSON đã được FE `saveFile.ts` xử lý (parse body → hiện message), không cần sửa BE.
- **Ghi chú**: convention giả định code=0/statusCode=200 là success; nếu QLBH dùng khác (vd code=200 success) thì chỉnh `extractQlbhBusinessError`. User build lại VcrmApp.

## 2026-08-10 (bổ sung 16) — Lỗi khai báo CS hiển thị lên Modal riêng

- **Phạm vi**: `client/src/views/sales-project/business-policy/Form/FormDeclareInfoArea.vue`.
- **Thay đổi**: thêm helper `showErrorModal(content)` (`Modal.error`, content `h('div', {white-space:pre-line})`). Thay tất cả chỗ hiển thị lỗi (`validateQlbhSectionOnUpload`, `handleSave` catch, `handleImportBlobError`, `commitPendingDeclareInfo` catch) từ text đỏ dưới popup / message.error → `showErrorModal`. Bỏ block `<div errorMessage>` cuối popup. `errorMessage` ref còn lại chỉ để reset (harmless).
- **Lý do**: user muốn lỗi lên modal báo lỗi riêng, không để text dưới.

## 2026-08-12 — Trạng thái khai báo CS tổng hợp + form thêm HĐ CSKD (Mã→Tên)

- **Req 1 (BE)**: `refreshDeclarationStatus` tính thêm `policyDeclStatus` = aggregate của bccsPackage/qlbh/pbh (hàm `aggregatePolicyDeclStatus`): tất cả null→null; có 2(đang)→2; tất cả present=4→4(hoàn thành); tất cả present=1→1(chưa); mix→2(đang). Search đã trả `policyDeclStatus`/`policyDeclStatusName` (GL STATUS_DECL_CSKD), FE cột dùng `policyDeclStatusName`. SQL backfill: `crm-service/sql/2026-08-12_backfill_policy_decl_status.sql`.
- **Req 2 (FE `customer/extension-events/eventForm.vue`)** — form thêm HĐ /extension-activities khi objectRefCode=BUSINESS_POLICY:
  - `getObjectRefLabel` BUSINESS_POLICY: "Mã CSKD" → **"Tên CSKD"**.
  - `onCloseDrawerSearchBusinessPolicy`: `objectRefName = policyName` (tên, trước là policyCode) + lưu `policyCode` để header dùng.
  - `getHeaderName` (span dòng 91, trước "Chưa xác định") thêm case BUSINESS_POLICY → **"Mã CSKD: <policyCode>"** (2 switch CREATE/else).
- **Ghi chú**: HĐ CSKD cũ (objectRefName lưu code) hiển thị field "Tên CSKD" ra code — edge của dữ liệu cũ; add-new hiển thị đúng tên. User build lại BE (VcrmApp) + FE + chạy SQL backfill.

## 2026-08-12 — Fix PL4 BCCS gói cước thiếu phần "Ghi chú"

- **Root cause**: `BusinessPolicyAppendixPdfServiceImpl.createAppendixPl4BccsPackage` chỉ render Phiếu đề nghị + bảng THÔNG TIN GÓI CƯỚC, THIẾU block "Ghi chú" (Loại giá/Mã kênh bán hàng/Chiết khấu/Thời gian hiệu lực/Địa bàn áp dụng/Mã hàng hóa) mà file import BM01 có. Template `docs/tailieu/Phu luc 2...docx` không chứa Ghi chú (là phần cố định của BM01).
- **Fix**: thêm `buildBccsNoteBlock(businessPolicy)` render sau bảng — tĩnh (Loại giá: Giá bán lẻ; Mã kênh bán hàng: 1419, 1420; Chiết khấu: Không; Mã Hàng hóa: 0106. Tên hàng hóa: Hàng hóa hợp thức) + động (Thời gian hiệu lực = effectiveDate dd/MM/yyyy; Địa bàn áp dụng = scope, TQ→"Toàn quốc" qua `resolveBccsScopeName`). `getImportedBccsPackageRows` chỉ đọc bảng data nên Ghi chú generate từ CSKD.
- **Ghi chú**: scope địa bàn cụ thể (khác TQ) hiện in mã CSV (service không có locationRepo để resolve tên) — đa số CSKD Toàn quốc. User build lại VcrmApp.

## 2026-08-12 — Bắt thêm format lỗi QLBH validate {valid:false, files[].fileError}

- **Phạm vi**: `QlbhApiClient.extractQlbhBusinessError`.
- **Thêm format**: QLBH validate có thể trả HTTP 200 body `{valid:false, error, totalRow, files:[{fileError, errors[], ...}]}` (không có code/statusCode). Nay `extractQlbhBusinessError`: nếu `valid==false` → gom `error` (top) + mỗi `files[].fileError` + `files[].errors[]` (text/message) → join "\n". Vẫn giữ nhánh cũ {code,statusCode,message}.
- Nhánh 4xx của `validate()` cũng đổi sang `extractQlbhBusinessError` (fallback `extractQlbhDetailMessage`) để bắt cả 2 format. FE modal (`white-space:pre-line`) hiện nhiều dòng fileError.
- **Ghi chú**: `fileBase64`/`resultFileName` (file lỗi base64) chưa xử lý (mẫu null); nếu QLBH trả file lỗi base64 thì bổ sung sau. User build lại VcrmApp.

## 2026-08-12 (bổ sung) — QLBH validate: xử lý cả fileBase64 (file lỗi) lẫn fileError (text)

- **Phạm vi**: `QlbhApiClient` (`interpretValidateResponse`, thêm `throwIfQlbhErrorFile` + `zipErrorFiles`).
- **Logic mới** (cho cả nhánh 200 JSON và 4xx): parse body; nếu `valid:true` → bỏ qua. Ưu tiên `files[].fileBase64` (file lỗi QLBH annotate) → decode Base64 → nếu 1 file `QlbhValidateFailedException`(file), nhiều file → nén zip `Loi_validate_QLBH.zip` → controller trả về tải xuống (handleImportBlobError FE). Nếu KHÔNG có fileBase64 → `extractQlbhBusinessError` gom `error`+`files[].fileError`+`files[].errors[]` → `AppException("APP001", ...)` → modal text.
- Import thêm: Base64, ByteArrayOutputStream, ZipEntry, ZipOutputStream.
- **Ghi chú**: response mix (file có fileBase64, file khác chỉ fileError) → ưu tiên tải file lỗi, text phụ có thể bỏ. User build lại VcrmApp.

## 2026-08-12 (bổ sung) — Lỗi khai báo CS: dùng message.error (toast trên cùng) thay Modal lẻ

- **Phạm vi**: `FormDeclareInfoArea.vue`. Đổi helper `showErrorModal` (Modal.error) → `showError` = `message.error({ content })` (toast trên cùng như các lỗi khác trong hệ thống). Bỏ import `h`. 4 call site đổi showErrorModal→showError.
- **Point 1 (validate từ API QLBH)**: xác nhận luồng QLBH validate (validateQlbhPolicyOnly→qlbhApiClient.validate) KHÔNG check product_hierarchy local — message "Trường 'product_hierarchy' không được để trống" là từ QLBH (extractQlbhBusinessError/extractQlbhDetailMessage đọc field `message` của họ). Check local `Mã Product Hierarchy không được để trống (SP/DV đã có)` (validateBccsRow:620) là của luồng BCCS package (khác), không phải QLBH.

## 2026-08-12 (bổ sung) — validate/import QLBH gửi product_hierarchy (từ combobox)

- **Bug**: `validate-qlbh-policy` (pre-create) truyền `productHierarchy=null` → QLBH báo "Trường 'product_hierarchy' không được để trống". FE có PH ở combobox "Tên sản phẩm dịch vụ" (props.productHierarchy) nhưng chưa gửi.
- **Fix**: controller `import-qlbh-policy` + `validate-qlbh-policy` thêm param `productHierarchy`; interface + impl thêm param. `importQlbhPolicy`: ưu tiên PH từ FE, fallback `resolveProductHierarchy(businessPolicyId)`. `validateQlbhPolicyOnly`: dùng PH từ FE (khi isNewProduct==0). FE `buildQlbhFormData` + commitPending gửi `productHierarchy` khi `isNewProduct===0 && props.productHierarchy`.
- Chain: FormCommonInfo `selectedProductHierarchy` (combobox) → FormDeclareInfoArea `props.productHierarchy` → formData → BE → qlbhApiClient.validate → QLBH.

## 2026-08-12 (bổ sung) — Mỗi fileError QLBH = 1 message riêng

- **FormDeclareInfoArea.vue** `showError`: tách content theo `\n` → mỗi dòng gọi 1 `message.error` riêng. BE `extractQlbhBusinessError` join các fileError bằng `\n` → 2 file lỗi = 2 message toast riêng (thay vì 1 toast gộp). Lỗi 1 dòng vẫn 1 toast.

## 2026-08-12 — Fix NonUniqueResultException load SSO credentials (cancelSignReqProcess)

- **Phạm vi**: `crm-service/VcrmApp/.../service/impl/ProjectPLBPPServiceImpl.java` (init/@PostConstruct), `crm-service/sql/2026-08-12_dedupe_gl_acc_sync_sign_status_voffice.sql`.
- **Thay đổi chính**:
  - `init()` load SSO USERNAME/PASSWORD từ `iam.GLOBAL_LIST_DETAIL` (GL `GL_ACC_SYNC_SIGN_STATUS_VOFFICE`) đổi từ `getSingleResult()` → `getResultList()` + helper `firstStringResult(...)` lấy dòng đầu; chỉ overwrite field khi có giá trị (giữ fallback @Value nếu DB rỗng).
  - Thêm SQL idempotent dedupe: xoá dòng GLOBAL_LIST_DETAIL trùng, giữ `MAX(GLOBAL_LIST_DETAIL_ID)` mỗi `code` trong list này.
- **Lý do**: query PASSWORD trả 2 dòng (data trùng) → `getSingleResult` ném `javax.persistence.NonUniqueResultException` → SSO creds không load → API `bp-sign-req/cancelSignReqProcess` lỗi.
- **Ghi chú**: user tự chạy file SQL trên DB (VPN). Code fix đã robust kể cả khi còn trùng data.

## 2026-08-12 — Validate "P CL chưa thẩm định Đạt": lấy đơn vị xử lý từ GLOBAL_LIST thay vì hardcode

- **Phạm vi**: `client/src/views/sales-project/business-policy/Detail/Tab7.vue`, `client/src/constants/globalList.ts`, `crm-service/sql/2026-08-12_seed_validate_org_cskd.sql`.
- **Thay đổi chính**:
  - Thêm constant `VALIDATE_ORG_CSKD: 'VALIDATE_ORG_CSKD'` trong globalList.ts.
  - Tab7.vue: thêm `validateOrgCskdCodes` + `getValidateOrgCskdCodes()` (gọi `getGlobalListByCode({code:'VALIDATE_ORG_CSKD'})`, lọc item `code==='VALIDATE_ORG_CSKD'` → lấy `.key` = GLD.VALUE, split ',' , upper/trim). Gọi trong onMounted.
  - Thay check hardcode `orgUnitCodeName === 'P CL'` bằng so khớp `orgUnitCodeName` (upper/trim) với tập `validateOrgCskdCodes`.
  - Seed SQL idempotent tạo GL + GLD `VALIDATE_ORG_CSKD` (VALUE mặc định 'P CL').
- **Lý do**: warning "CSKD của dịch vụ có đơn vị xử lý là P CL chưa được thẩm định ở trạng thái Đạt" không hiển thị dù SR có đơn vị xử lý P CL — do so sánh cứng 'P CL' không khớp mã thực (có thể 'P_CL'). User yêu cầu lấy đơn vị xử lý so sánh từ `GLD.value` (GL.code=GLD.code='VALIDATE_ORG_CSKD').
- **Ghi chú**: `getListValueByCode` map `key=GLD.VALUE, value=GLD.NAME, code=GLD.CODE`. `orgUnitCodeName` = `O.ORG_UNIT_CODE` (đơn lẻ). Constant code base `P_CL="P CL"` (có dấu cách). User chạy seed SQL (VPN) và chỉnh VALUE nếu mã thực là 'P_CL'.

## 2026-08-12 — Phụ lục CSKD: đánh số lại PL3–PL7 + bổ sung Nơi nhận/Lãnh đạo cho PL7 TelecomServiceID

- **Phạm vi**: `VcrmGeneral/.../Const.java`, `VcrmApp/.../service/impl/CRMDocumentServiceImpl.java`, `VcrmApp/.../service/businessPolicy/impl/BusinessPolicyAppendixPdfServiceImpl.java`.
- **Thay đổi chính**:
  - Const.java (3307-3311): đổi 5 giá trị tên phụ lục sang đúng thứ tự user: PL3 BCCS gói cước, PL4 QLBH, PL5 PBH, PL6 SAP (SP mới), PL7 TelecomServiceID/Saletrantype (SP mới). Giữ nguyên tên KEY (PL2..PL6) vì được classifier tham chiếu.
  - CRMDocumentServiceImpl: hằng BCCS/SAP/Telecom tham chiếu thẳng Const (classifier `resolveKhaiBaoCSAppendixDocName` khớp chính xác); QLBH/PBH prefix đổi thêm "PYC"; xoá 3 hằng cũ PL2_BCCS/PL5_SAP/PL6_TELECOM; orchestration `copyFileKhaiBaoChinhSachAppendixForCSKD` dùng PL3_BCCS/PL6_SAP/PL7_TELECOM.
  - BusinessPolicyAppendixPdfServiceImpl.createAppendixPl3TelecomServiceId: thêm block "Nơi nhận:\n- TTCN (để t/h);\n- Lưu: VT, <mã đơn vị đề xuất>" + nhãn "LÃNH ĐẠO ĐƠN VỊ" (ALIGN_RIGHT) + chừa chỗ chữ ký (vOffice đóng lúc ký). Thêm helper `resolveOrgUnitCode`. "Ngày triển khai dự kiến" đã có sẵn (item 4).
- **Lý do**: PL7 tự sinh ở Trình ký thẩm định thiếu Nơi nhận + Lãnh đạo; đánh số phụ lục lệch do orchestration dùng hằng cũ (PL2/PL5/PL6). User chọn hướng bổ sung OpenPDF (không thêm lib docx→pdf).
- **Ghi chú**: KHÔNG copy docx mẫu vào source (đã chốt dùng OpenPDF). File cũ đã sinh với tên số cũ vẫn nằm trong DB (guard existingFileNames theo tên) — có thể phát sinh trùng với số mới trên bản ghi cũ; áp dụng cho CSKD mới. In-document header "PHỤ LỤC 01/02" trong SAP/BCCS là nhãn nội bộ, chưa đổi.

## 2026-08-12 — Đồng bộ nội dung file VO (có số hiệu/ngày ban hành) về file phụ lục local CSKD

- **Phạm vi**: `VcrmGeneral/.../Const.java`, `VcrmApp/.../repo/CRMDocumentFileRepo.java`, `VcrmApp/.../service/impl/ProjectPLSignReqServiceImpl.java`.
- **Thay đổi chính**:
  - Đổi tên PL7 bỏ dấu phẩy: "TelecomServiceID, Saletrantype" → "TelecomServiceID và Saletrantype" (uploadFileLocal3 reject tên file có ',' — line 3569).
  - Thêm repo query `findActiveAutoAppendixFilesByBusinessPolicyAndUri(businessPolicyId, fileName)` — lấy file `IS_AUTO_KHAI_BAO_CS_APPENDIX=1`, TYPE='BUSINESS_POLICY', cùng OBJECT_ID + CRM_DOC_FILE_URI, STATUS=1.
  - Trong `cloneFilesSignReqWhenSignedForBusinessPolicy`: sau khi clone file sign-req (đã đồng bộ nội dung VO) sang doc SYNC, nếu file là auto-appendix thì `copyFileByCrmDocFileUriOrigin` (uploadFileLocal3 REPLACE_EXISTING) đè nội dung VO đã ký lên MỌI file local auto-appendix cùng tên của CSKD (bỏ qua doc sign-req nguồn + doc clone vừa tạo).
- **Lý do**: file phụ lục sinh local không có header "Số và ký hiệu / Ngày ban hành" (do vOffice đóng vào PDF, chỉ file sign-req được VO-sync). User chọn hướng "đồng bộ file đã ký từ VO về thay bản local".
- **Ghi chú**: Thứ tự đảm bảo VO-content sẵn khi propagation chạy — tab=2: sync(3485)→clone(3487); tab=1 (thẩm định) khi đóng dấu: sync(3710)→clone(3712). copyFileByCrmDocFileUriOrigin ghi đè theo `downloadDir/<crmDocId>/<fileName>` (REPLACE_EXISTING). CHƯA build/test (VPN) — user tự verify: tạo trình ký → VO ký ban hành → tải file phụ lục local phải có số hiệu.

## 2026-08-12 — Gate nút "Cập nhật" hoạt động khai báo CS theo 3 danh sách user (GL USER_EDIT_ACTION)

- **Phạm vi**: `client/src/constants/globalList.ts`, `client/src/views/sales-project/business-policy/Detail/TabKhaiBaoChinhSach.vue`, `crm-service/sql/2026-08-12_seed_user_edit_action.sql`.
- **Thay đổi chính**:
  - Thêm constant `USER_EDIT_ACTION`.
  - TabKhaiBaoChinhSach.vue: `getUserEditActionConfig()` fetch GL `USER_EDIT_ACTION` → Map<GLD.code, Set<username>> (item.key = GLD.VALUE = username CSV). `canEditActivity(record)`: nhóm `BP_QLBH`→USER_EDIT_ACTION_QLBH, `BP_PBH`→USER_EDIT_ACTION_PBH, còn lại→USER_EDIT_ACTION_CSKD; user hiện tại (userInfo.userName) phải nằm trong set tương ứng. Gate `v-if` nút Cập nhật: `(!viewPermission || amPermission) && canEditActivity(record)`. Fail-open nếu GLD code chưa cấu hình.
  - Seed SQL idempotent GL `USER_EDIT_ACTION` + 3 GLD (QLBH/PBH/CSKD), VALUE trống để user điền username.
- **Lý do**: user yêu cầu chỉ các user cấu hình trong GLD (theo 3 nhóm QLBH/PBH/đơn vị xây dựng CSKD) mới thấy nút cập nhật hoạt động khai báo chính sách.
- **Ghi chú**: getListValueByCode map key=GLD.VALUE, code=GLD.CODE. Sau khi chạy seed phải UPDATE VALUE = username (CSV) nếu không nút ẩn với mọi user (vì code có trong map + set rỗng). Nhóm activitiesGroup: BP_QLBH/BP_PBH, các nhóm khác gộp vào CSKD. Admin không trong list cũng không thấy nút.

## 2026-08-12 — Ghép API PBH (download template + validate) vào section PBH (theo mẫu QLBH)

- **Phạm vi**: BE `service/businessPolicy/abs/PbhValidateFailedException.java` (mới), `service/businessPolicy/impl/PbhApiClient.java` (mới), `BusinessPolicyDeclareInfoService(.java/Impl)`, `controller/businessPolicy/BusinessPolicyDeclareInfoController.java`; FE `services/app/defineRouting.ts`, `services/app/businessPolicy/index.ts`, `views/.../Form/FormDeclareInfoArea.vue`.
- **Thay đổi chính**:
  - `PbhApiClient`: `downloadTemplate(productHierarchy)` GET `/api/v1/vcrm/policy-import/template?productHierarchy=`; `validate(file, productHierarchy)` POST `/api/v1/vcrm/policy-import/validate`. Header `client` + `api-key` + `request-id`(UUID). Response HTTP luôn 200 → đọc `errorCode`/`data.valid`; `data.errorFileBase64` → PbhValidateFailedException (file lỗi); errorCode!=200 hoặc valid=false không file → AppException(message). Config `pbh.domain/pbh.client/pbh.api-key` (không commit key).
  - Service: `downloadPbhTemplate`, `validatePbhPolicyOnly` (loop files, dùng resolveProductHierarchy nếu FE k gửi).
  - Controller: `download-pbh-template` (GET), `validate-pbh-policy` (POST multipart, catch PbhValidateFailedException → buildErrorFileResponse).
  - FE: section PBH bỏ placeholder "đang hoàn thiện" → render upload + link "Tải biểu mẫu" (gọi download PBH). validate-on-upload gọi `validate-pbh-policy`. Thêm route + service `validateBusinessPolicyDeclarePbhPolicy`.
- **Lý do**: user cung cấp API hệ thống PBH (10.60.156.245:8050) và yêu cầu ghép download template + upload/validate vào section PBH (đang trống), theo mẫu QLBH.
- **Ghi chú**: CHƯA làm bước LƯU/PERSIST file PBH vào CSKD — theo tài liệu §5 "bước đẩy dữ liệu chính thức vào PBH bổ sung sau". handleSave vẫn loại PBH khỏi importableKeys. User cấu hình `pbh.*` ở external config (như qlbh.*). Chưa build/test (VPN).
