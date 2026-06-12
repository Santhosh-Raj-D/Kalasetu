CREATE DATABASE IF NOT EXISTS kalasetu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kalasetu;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','ARTISAN','CUSTOMER','CONSULTANT') NOT NULL,
  phone         VARCHAR(20),
  is_business   TINYINT(1) NOT NULL DEFAULT 0,
  business_name VARCHAR(150) NULL,
  status        ENUM('ACTIVE','PENDING','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artisan_profiles (
  user_id          INT UNSIGNED PRIMARY KEY,
  tribe_name       VARCHAR(100) NOT NULL,
  region           VARCHAR(120) NOT NULL,
  craft_tradition  VARCHAR(120) NOT NULL,
  story            TEXT,
  years_experience TINYINT UNSIGNED DEFAULT 0,
  profile_image    VARCHAR(255),
  cover_image      VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  slug        VARCHAR(90) NOT NULL UNIQUE,
  description VARCHAR(255),
  image       VARCHAR(255)
);

CREATE TABLE products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  artisan_id      INT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(150) NOT NULL,
  slug            VARCHAR(170) NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  craft_technique VARCHAR(150),
  materials       VARCHAR(200),
  price           DECIMAL(10,2) NOT NULL,
  stock           INT UNSIGNED NOT NULL DEFAULT 0,
  status          ENUM('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','DELISTED')
                  NOT NULL DEFAULT 'DRAFT',
  is_featured     TINYINT(1) NOT NULL DEFAULT 0,
  cultural_notes  TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artisan_id)  REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_status (status),
  INDEX idx_products_category (category_id)
);

CREATE TABLE product_images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE verification_reviews (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    INT UNSIGNED NOT NULL,
  consultant_id INT UNSIGNED NOT NULL,
  decision      ENUM('APPROVED','REJECTED') NOT NULL,
  feedback      TEXT,
  reviewed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id)    REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (consultant_id) REFERENCES users(id)
);

CREATE TABLE cart_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cart (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE wishlist_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_wishlist (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE coupons (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(30) NOT NULL UNIQUE,
  description      VARCHAR(200),
  discount_type    ENUM('PERCENT','FLAT') NOT NULL,
  discount_value   DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses         INT UNSIGNED NOT NULL DEFAULT 100,
  used_count       INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from       DATE NOT NULL,
  valid_to         DATE NOT NULL,
  created_by       INT UNSIGNED NOT NULL,
  artisan_id       INT UNSIGNED NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (artisan_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL UNIQUE,
  customer_id      INT UNSIGNED NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  coupon_id        INT UNSIGNED NULL,
  status           ENUM('PLACED','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')
                   NOT NULL DEFAULT 'PLACED',
  ship_name        VARCHAR(100) NOT NULL,
  ship_phone       VARCHAR(20)  NOT NULL,
  ship_address     VARCHAR(255) NOT NULL,
  ship_city        VARCHAR(80)  NOT NULL,
  ship_state       VARCHAR(80)  NOT NULL,
  ship_pincode     VARCHAR(12)  NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (coupon_id)   REFERENCES coupons(id)
);

CREATE TABLE order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  artisan_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (artisan_id) REFERENCES users(id),
  INDEX idx_oi_artisan (artisan_id)
);

CREATE TABLE payments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  method          ENUM('MOCK_CARD','MOCK_UPI','COD') NOT NULL,
  status          ENUM('SUCCESS','FAILED','PENDING') NOT NULL,
  transaction_ref VARCHAR(40),
  paid_at         TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review (product_id, customer_id),
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id)
);

CREATE TABLE conversations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  artisan_id  INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conv (customer_id, artisan_id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (artisan_id)  REFERENCES users(id),
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id)       REFERENCES users(id)
);

CREATE TABLE bulk_inquiries (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_user_id INT UNSIGNED NOT NULL,
  product_id       INT UNSIGNED NOT NULL,
  quantity         INT UNSIGNED NOT NULL,
  target_price     DECIMAL(10,2) NULL,
  message          TEXT,
  status           ENUM('OPEN','QUOTED','ACCEPTED','DECLINED','CLOSED')
                   NOT NULL DEFAULT 'OPEN',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_user_id) REFERENCES users(id),
  FOREIGN KEY (product_id)       REFERENCES products(id)
);

CREATE TABLE inquiry_quotes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inquiry_id        INT UNSIGNED NOT NULL,
  artisan_id        INT UNSIGNED NOT NULL,
  quoted_unit_price DECIMAL(10,2) NOT NULL,
  lead_time_days    INT UNSIGNED NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inquiry_id) REFERENCES bulk_inquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (artisan_id) REFERENCES users(id)
);

CREATE TABLE support_tickets (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  raised_by         INT UNSIGNED NOT NULL,
  order_id          INT UNSIGNED NULL,
  subject           VARCHAR(150) NOT NULL,
  description       TEXT NOT NULL,
  status            ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  assigned_admin_id INT UNSIGNED NULL,
  resolution_note   TEXT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at       TIMESTAMP NULL,
  FOREIGN KEY (raised_by)         REFERENCES users(id),
  FOREIGN KEY (order_id)          REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_admin_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(255),
  link       VARCHAR(255),
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
);
