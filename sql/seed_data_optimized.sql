-- ============================================================
-- PAM Travel seed data
-- Chay trong DataGrip tren database pam_travel, schema public.
-- Script co the chay lai nhieu lan ma khong bi trung du lieu.
-- Ghe LOCKED/PENDING duoc giu 3 phut tinh tu luc chay script.
-- ============================================================

BEGIN;

SET search_path TO public;

-- ============================================================
-- 1. DAM BAO CAC COT / BANG MO RONG DA TON TAI
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS loyalty_tier  VARCHAR(20) DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS total_tickets INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_trips   INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wallet_balance BIGINT DEFAULT 0;

ALTER TABLE operators
    ADD COLUMN IF NOT EXISTS banner_url  TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS rating      NUMERIC(2,1) DEFAULT 5.0;

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS assigned_driver_id BIGINT REFERENCES users(id);

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'ONLINE';

CREATE TABLE IF NOT EXISTS wallet_transactions (
                                                   id            BIGSERIAL PRIMARY KEY,
                                                   user_id       BIGINT NOT NULL REFERENCES users(id),
                                                   type          VARCHAR(20) NOT NULL,
                                                   amount        BIGINT NOT NULL,
                                                   balance_after BIGINT NOT NULL,
                                                   description   TEXT,
                                                   booking_id    BIGINT REFERENCES bookings(id),
                                                   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
                                       id            SERIAL PRIMARY KEY,
                                       title         VARCHAR(200),
                                       image_url     TEXT,
                                       link_url      TEXT,
                                       operator_id   INT REFERENCES operators(id),
                                       is_active     BOOLEAN NOT NULL DEFAULT TRUE,
                                       display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS popular_routes (
                                              id            SERIAL PRIMARY KEY,
                                              route_id      INT NOT NULL REFERENCES routes(id),
                                              image_url     TEXT,
                                              description   VARCHAR(300),
                                              display_order INT DEFAULT 0,
                                              is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS faqs (
                                    id       SERIAL PRIMARY KEY,
                                    keywords TEXT NOT NULL,
                                    question VARCHAR(500),
                                    answer   TEXT NOT NULL,
                                    category VARCHAR(50)
);

-- ============================================================
-- 2. XOA DU LIEU CU VA RESET ID
-- ============================================================

TRUNCATE TABLE
    wallet_transactions,
    faqs,
    popular_routes,
    banners,
    refunds,
    reviews,
    notifications,
    tickets,
    payments,
    booking_seats,
    bookings,
    trip_seat_status,
    trips,
    route_stops,
    routes,
    seats,
    vehicles,
    vehicle_types,
    operators,
    provinces,
    users
    RESTART IDENTITY CASCADE;

-- ============================================================
-- 3. MASTER DATA
-- ============================================================

INSERT INTO provinces (name, slug) VALUES
                                       ('Hà Nội',      'ha-noi'),
                                       ('Hồ Chí Minh', 'ho-chi-minh'),
                                       ('Đà Nẵng',     'da-nang'),
                                       ('Hải Phòng',   'hai-phong'),
                                       ('Cần Thơ',     'can-tho');

INSERT INTO operators (name, hotline, logo_url, is_active, banner_url, description, rating) VALUES
                                                                                                ('Nhà xe Phương Trang', '1900 6067', '/images/operators/phuong-trang.png', TRUE, '/images/banners/phuong-trang-offer.png', 'Mạng lưới tuyến phủ rộng, phù hợp khách đi liên tỉnh thường xuyên.', 4.8),
                                                                                                ('Nhà xe Thành Bưởi',   '1900 6918', '/images/operators/thanh-buoi.png',  TRUE, '/images/banners/thanh-buoi-offer.png',  'Dịch vụ ổn định, nhiều khung giờ trên các tuyến trọng điểm.', 4.7),
                                                                                                ('Nhà xe Hoàng Long',   '1900 6677', '/images/operators/hoang-long.png',  TRUE, '/images/banners/hoang-long-offer.png',  'Xe giường nằm đường dài, tối ưu cho hành trình Bắc Nam.', 4.6),
                                                                                                ('Nhà xe Kumho',        '1900 6060', '/images/operators/kumho.png',       TRUE, '/images/banners/kumho-offer.png',       'Không gian xe gọn gàng, phù hợp các tuyến đô thị lớn.', 4.5),
                                                                                                ('Nhà xe Hải Vân',      '1900 1234', '/images/operators/hai-van.png',     TRUE, '/images/banners/hai-van-offer.png',     'Tuyến ngắn linh hoạt, giá tốt cho hành khách đi trong ngày.', 4.6);

INSERT INTO vehicle_types (name, seat_layout_json, total_seats, floors) VALUES
                                                                            ('Limousine 16',  '{"floors":2,"floor_1":{"rows":4,"cols":2,"aisle_after_col":1},"floor_2":{"rows":4,"cols":2,"aisle_after_col":1}}', 16, 2),
                                                                            ('Giường nằm 16', '{"floors":2,"floor_1":{"rows":4,"cols":2,"aisle_after_col":1},"floor_2":{"rows":4,"cols":2,"aisle_after_col":1}}', 16, 2),
                                                                            ('Ghế ngồi 16',   '{"floors":2,"floor_1":{"rows":4,"cols":2,"aisle_after_col":1},"floor_2":{"rows":4,"cols":2,"aisle_after_col":1}}', 16, 2);

INSERT INTO users (phone_number, email, full_name, password_hash, role, is_active) VALUES
                                                                                       ('0398514436', 'admin@pamtravel.vn',   'Nguyễn Thùy Linh',  '$2b$10$F2JFjLqs3AuWb8v9uOTJx.Aaxk2GxlXlir/8xIz0TOUvJ50P.XM4a', 'ADMIN', TRUE),
                                                                                       ('0943560104', 'ckadmin@pamtravel.vn',   'Phạm Đức Anh',  '$2b$10$F2JFjLqs3AuWb8v9uOTJx.Aaxk2GxlXlir/8xIz0TOUvJ50P.XM4a', 'ADMIN', TRUE),
                                                                                       ('0912345678', 'driver1@travel.vn',   'Tài Văn Xế',  '$2b$10$BwZFmnRsbgKk/nh/LKQHH.yW/zuvFzT8RSDHsJvV1wHw3t7bY6gJS', 'DRIVER', TRUE),
                                                                                       ('0923456789', 'driver2@travel.vn',   'Lơ Thị Xe',   '$2b$10$BwZFmnRsbgKk/nh/LKQHH.yW/zuvFzT8RSDHsJvV1wHw3t7bY6gJS', 'DRIVER', TRUE),
                                                                                       ('0956789012', 'khach1@gmail.com', 'Lê Thị Hường',   '$2b$10$VXsMDOkOgzhfU8rieok3OOHWTk/CUeSDxrWfpifwcLTmocfUvW1ja', 'CUSTOMER',    TRUE);

INSERT INTO vehicles (operator_id, vehicle_type_id, license_plate, name) VALUES
                                                                             (1, 1, '51B-11111', 'Limousine PT-01'),
                                                                             (2, 1, '51B-22222', 'Limousine TB-01'),
                                                                             (3, 2, '29B-33333', 'Giường nằm HL-01'),
                                                                             (4, 2, '29B-44444', 'Giường nằm KH-01'),
                                                                             (5, 3, '43B-55555', 'Ghế ngồi HV-01');

INSERT INTO seats (vehicle_id, seat_name, floor_number, row_number, col_number) VALUES
                                                                                    (1,'1-A1',1,1,1),(1,'1-A2',1,1,2),(1,'1-B1',1,2,1),(1,'1-B2',1,2,2),
                                                                                    (1,'1-C1',1,3,1),(1,'1-C2',1,3,2),(1,'1-D1',1,4,1),(1,'1-D2',1,4,2),
                                                                                    (1,'2-A1',2,1,1),(1,'2-A2',2,1,2),(1,'2-B1',2,2,1),(1,'2-B2',2,2,2),
                                                                                    (1,'2-C1',2,3,1),(1,'2-C2',2,3,2),(1,'2-D1',2,4,1),(1,'2-D2',2,4,2),
                                                                                    (2,'1-A1',1,1,1),(2,'1-A2',1,1,2),(2,'1-B1',1,2,1),(2,'1-B2',1,2,2),
                                                                                    (2,'1-C1',1,3,1),(2,'1-C2',1,3,2),(2,'1-D1',1,4,1),(2,'1-D2',1,4,2),
                                                                                    (2,'2-A1',2,1,1),(2,'2-A2',2,1,2),(2,'2-B1',2,2,1),(2,'2-B2',2,2,2),
                                                                                    (2,'2-C1',2,3,1),(2,'2-C2',2,3,2),(2,'2-D1',2,4,1),(2,'2-D2',2,4,2),
                                                                                    (3,'1-A1',1,1,1),(3,'1-A2',1,1,2),(3,'1-B1',1,2,1),(3,'1-B2',1,2,2),
                                                                                    (3,'1-C1',1,3,1),(3,'1-C2',1,3,2),(3,'1-D1',1,4,1),(3,'1-D2',1,4,2),
                                                                                    (3,'2-A1',2,1,1),(3,'2-A2',2,1,2),(3,'2-B1',2,2,1),(3,'2-B2',2,2,2),
                                                                                    (3,'2-C1',2,3,1),(3,'2-C2',2,3,2),(3,'2-D1',2,4,1),(3,'2-D2',2,4,2),
                                                                                    (4,'1-A1',1,1,1),(4,'1-A2',1,1,2),(4,'1-B1',1,2,1),(4,'1-B2',1,2,2),
                                                                                    (4,'1-C1',1,3,1),(4,'1-C2',1,3,2),(4,'1-D1',1,4,1),(4,'1-D2',1,4,2),
                                                                                    (4,'2-A1',2,1,1),(4,'2-A2',2,1,2),(4,'2-B1',2,2,1),(4,'2-B2',2,2,2),
                                                                                    (4,'2-C1',2,3,1),(4,'2-C2',2,3,2),(4,'2-D1',2,4,1),(4,'2-D2',2,4,2),
                                                                                    (5,'1-A1',1,1,1),(5,'1-A2',1,1,2),(5,'1-B1',1,2,1),(5,'1-B2',1,2,2),
                                                                                    (5,'1-C1',1,3,1),(5,'1-C2',1,3,2),(5,'1-D1',1,4,1),(5,'1-D2',1,4,2),
                                                                                    (5,'2-A1',2,1,1),(5,'2-A2',2,1,2),(5,'2-B1',2,2,1),(5,'2-B2',2,2,2),
                                                                                    (5,'2-C1',2,3,1),(5,'2-C2',2,3,2),(5,'2-D1',2,4,1),(5,'2-D2',2,4,2);

INSERT INTO routes (origin_province_id, destination_province_id, base_price, duration_minutes) VALUES
                                                                                                   (1, 3, 350000,  960),
                                                                                                   (3, 2, 180000,  480),
                                                                                                   (1, 2, 500000, 1440),
                                                                                                   (1, 4,  80000,  120),
                                                                                                   (2, 5,  90000,  180);

INSERT INTO route_stops (route_id, province_id, stop_order, stop_name, offset_minutes, stop_type) VALUES
                                                                                                      (1, 1, 1, 'Bến xe Mỹ Đình',    0,    'PICKUP'),
                                                                                                      (1, 1, 2, 'Bến xe Giáp Bát',   30,   'PICKUP'),
                                                                                                      (1, 3, 3, 'Bến xe Đà Nẵng',    960,  'DROPOFF'),
                                                                                                      (1, 3, 4, 'Sân bay Đà Nẵng',   990,  'DROPOFF'),
                                                                                                      (2, 3, 1, 'Bến xe Đà Nẵng',    0,    'PICKUP'),
                                                                                                      (2, 3, 2, 'Sân bay Đà Nẵng',   20,   'PICKUP'),
                                                                                                      (2, 2, 3, 'Bến xe Miền Đông',  480,  'DROPOFF'),
                                                                                                      (2, 2, 4, 'Bến xe Miền Tây',   510,  'DROPOFF'),
                                                                                                      (3, 1, 1, 'Bến xe Mỹ Đình',    0,    'PICKUP'),
                                                                                                      (3, 1, 2, 'Bến xe Giáp Bát',   30,   'PICKUP'),
                                                                                                      (3, 2, 3, 'Bến xe Miền Đông',  1440, 'DROPOFF'),
                                                                                                      (3, 2, 4, 'Bến xe Miền Tây',   1470, 'DROPOFF'),
                                                                                                      (4, 1, 1, 'Bến xe Mỹ Đình',    0,    'PICKUP'),
                                                                                                      (4, 1, 2, 'Bến xe Gia Lâm',    20,   'PICKUP'),
                                                                                                      (4, 4, 3, 'Bến xe Hải Phòng',  120,  'DROPOFF'),
                                                                                                      (4, 4, 4, 'Cảng Hải Phòng',    140,  'DROPOFF'),
                                                                                                      (5, 2, 1, 'Bến xe Miền Tây',   0,    'PICKUP'),
                                                                                                      (5, 2, 2, 'Quận 8 HCM',        30,   'PICKUP'),
                                                                                                      (5, 5, 3, 'Bến xe Cần Thơ',    180,  'DROPOFF'),
                                                                                                      (5, 5, 4, 'Chợ Cần Thơ',       200,  'DROPOFF');

-- ============================================================
-- 4. TRIP / BOOKING / PAYMENT DATA
-- ============================================================

INSERT INTO trips (route_id, vehicle_id, operator_id, departure_time, arrival_time, price_override, status) VALUES
                                                                                                                (1, 1, 1, '2026-06-15 20:00:00+07', '2026-06-16 12:00:00+07', NULL,   'OPEN'),
                                                                                                                (1, 2, 2, '2026-06-15 08:00:00+07', '2026-06-16 00:00:00+07', 320000, 'OPEN'),
                                                                                                                (2, 3, 3, '2026-06-15 06:00:00+07', '2026-06-15 14:00:00+07', NULL,   'OPEN'),
                                                                                                                (3, 4, 4, '2026-06-16 18:00:00+07', '2026-06-17 18:00:00+07', 480000, 'OPEN'),
                                                                                                                (4, 5, 5, '2026-06-15 07:00:00+07', '2026-06-15 09:00:00+07', NULL,   'OPEN');

INSERT INTO bookings (user_id, trip_id, pickup_stop_id, dropoff_stop_id, total_amount, status, expires_at) VALUES
                                                                                                               (1, 1, 1,  3,  350000, 'CONFIRMED', NULL),
                                                                                                               (2, 1, 2,  4,  350000, 'CONFIRMED', NULL),
                                                                                                               (3, 2, 1,  3,  320000, 'PENDING',   NOW() + INTERVAL '5 minutes'),
                                                                                                               (4, 3, 5,  7,  180000, 'CANCELLED', NULL),
                                                                                                               (1, 4, 9, 11,  480000, 'CONFIRMED', NULL);

INSERT INTO booking_seats (booking_id, seat_id, passenger_name, passenger_phone) VALUES
                                                                                     (1, 1,  'Nguyễn Văn An',  '0901234567'),
                                                                                     (2, 2,  'Trần Thị Bình',  '0912345678'),
                                                                                     (3, 17, 'Lê Văn Cường',   '0923456789'),
                                                                                     (4, 33, 'Phạm Thị Dung',  '0934567890'),
                                                                                     (5, 49, 'Nguyễn Văn An',  '0901234567');

INSERT INTO trip_seat_status (trip_id, seat_id, status, locked_until, locked_by_user_id) VALUES
                                                                                             (1, 1,  'CONFIRMED', NULL, NULL),
                                                                                             (1, 2,  'CONFIRMED', NULL, NULL),
                                                                                             (2, 17, 'LOCKED',    NOW() + INTERVAL '5 minutes', 3),
                                                                                             (3, 33, 'AVAILABLE', NULL, NULL),
                                                                                             (4, 49, 'CONFIRMED', NULL, NULL);

INSERT INTO payments (booking_id, gateway, gateway_txn_id, amount, status, paid_at) VALUES
                                                                                        (1, 'VNPAY', 'VNPAY-001', 350000, 'SUCCESS', '2026-06-10 10:00:00+07'),
                                                                                        (2, 'MOMO',  'MOMO-002',  350000, 'SUCCESS', '2026-06-10 11:00:00+07'),
                                                                                        (3, 'VNPAY', 'VNPAY-003', 320000, 'PENDING', NULL),
                                                                                        (4, 'CARD',  'CARD-004',  180000, 'FAILED',  NULL),
                                                                                        (5, 'MOMO',  'MOMO-005',  480000, 'SUCCESS', '2026-06-10 12:00:00+07');

INSERT INTO tickets (booking_id, booking_seat_id, qr_code, status) VALUES
                                                                       (1, 1, 'PAM-1-1-001', 'ISSUED'),
                                                                       (2, 2, 'PAM-2-2-002', 'ISSUED'),
                                                                       (3, 3, 'PAM-3-3-003', 'ISSUED'),
                                                                       (4, 4, 'PAM-4-4-004', 'CANCELLED'),
                                                                       (5, 5, 'PAM-5-5-005', 'ISSUED');

INSERT INTO refunds (booking_id, payment_id, amount, refund_rate, status, requested_at) VALUES
                                                                                            (4, 4, 0,      0.00, 'COMPLETED',  '2026-06-10 08:00:00+07'),
                                                                                            (3, 3, 160000, 0.50, 'PENDING',    '2026-06-10 09:00:00+07'),
                                                                                            (1, 1, 350000, 1.00, 'PROCESSING', '2026-06-10 10:30:00+07'),
                                                                                            (2, 2, 175000, 0.50, 'COMPLETED',  '2026-06-10 11:30:00+07'),
                                                                                            (5, 5, 0,      0.00, 'PENDING',    '2026-06-10 12:30:00+07');

INSERT INTO reviews (trip_id, user_id, booking_id, rating, comment) VALUES
                                                                        (1, 1, 1, 5, 'Xe sạch, đúng giờ, tài xế thân thiện.'),
                                                                        (1, 2, 2, 4, 'Chuyến đi tốt, ghế hơi cứng.'),
                                                                        (2, 3, 3, 3, 'Trễ 20 phút, cần cải thiện.'),
                                                                        (3, 4, 4, 2, 'Xe cũ, điều hòa yếu.'),
                                                                        (4, 1, 5, 5, 'Tuyệt vời, admin xinh gái vcl.');

INSERT INTO notifications (user_id, type, content, is_read) VALUES
                                                                (1, 'BOOKING_CONFIRMED', 'Vé của bạn đã xác nhận. Chuyến HN→ĐN ngày 15/06.', FALSE),
                                                                (2, 'BOOKING_CONFIRMED', 'Vé của bạn đã xác nhận. Chuyến HN→ĐN ngày 15/06.', FALSE),
                                                                (3, 'TRIP_REMINDER',     'Chuyến xe của bạn khởi hành sau 2 tiếng.',           FALSE),
                                                                (4, 'REFUND_PROCESSED',  'Hoàn tiền 0đ đã xử lý (hủy trễ).',                  TRUE),
                                                                (1, 'TRIP_REMINDER',     'Nhắc nhở: Chuyến HN→HCM ngày 16/06.',               FALSE);

-- ============================================================
-- 5. LANDING / SUPPORT DATA
-- ============================================================

INSERT INTO banners (title, image_url, link_url, operator_id, is_active, display_order) VALUES
                                                                                            ('Phương Trang — Ưu đãi 20%', '/images/banners/phuong-trang-offer.png', NULL, 1, TRUE, 1),
                                                                                            ('Thành Bưởi — Giá tốt nhất', '/images/banners/thanh-buoi-offer.png',  NULL, 2, TRUE, 2),
                                                                                            ('Hoàng Long — Flash sale',   '/images/banners/hoang-long-offer.png',  NULL, 3, TRUE, 3);

INSERT INTO popular_routes (route_id, image_url, description, display_order) VALUES
                                                                                 (1, '/images/routes/ha-noi-da-nang.png',  'Hà Nội → Đà Nẵng, 16 giờ di chuyển',      1),
                                                                                 (2, '/images/routes/da-nang-sai-gon.png', 'Đà Nẵng → Hồ Chí Minh, 8 giờ di chuyển',  2),
                                                                                 (3, '/images/routes/ha-noi-sai-gon.png',  'Hà Nội → Hồ Chí Minh, 24 giờ di chuyển',  3);

INSERT INTO faqs (keywords, question, answer, category) VALUES
                                                            ('hủy,cancel,hoàn tiền',       'Hủy vé có mất phí không?',         'Hủy vé sẽ tính phí 10%, hoàn lại 90% số tiền đã thanh toán.',                   'cancel'),
                                                            ('thanh toán,pin,mật khẩu',    'Cách cài mật khẩu thanh toán?',    'Vào Settings → Cài PIN → Nhập 6 chữ số.',                                      'payment'),
                                                            ('ghế,chọn ghế,sơ đồ',         'Chọn ghế như thế nào?',            'Sau khi chọn chuyến, bấm vào ghế màu xanh trên sơ đồ để chọn.',                 'booking'),
                                                            ('ví,nạp tiền,số dư',          'Cách nạp tiền vào ví?',            'Vào Settings → Ví điện tử → Nạp tiền → Nhập số tiền → Xác nhận PIN + OTP.',     'wallet'),
                                                            ('vé,qr,check in',             'Cách dùng vé QR lên xe?',          'Vào Vé của tôi → Chọn vé → Hiện mã QR cho tài xế quét.',                        'ticket');

-- Giu logic don dep tu script cu, nhung dat truoc COMMIT de dam bao seed sach.
DELETE FROM tickets
WHERE booking_seat_id IN (
    SELECT id
    FROM booking_seats
    WHERE passenger_name = '' OR passenger_name IS NULL
);

DELETE FROM booking_seats
WHERE passenger_name = '' OR passenger_name IS NULL;

COMMIT;
