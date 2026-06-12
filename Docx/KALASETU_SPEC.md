# KalaSetu — Tribal Handicrafts Marketplace

> **Kala** (art) + **Setu** (bridge): a bridge between tribal artisans and the world.

A full-stack e-commerce platform where tribal artisans display and sell value-added handicrafts to local customers and global businesses, with cultural authenticity verification built into the product lifecycle. Designed as a professional portfolio project.

**This document is the single source of truth.** Claude Code: read this file fully before writing any code. Build phase-by-phase (see §12), and do not skip acceptance criteria.

---

## 1. Tech Stack (fixed — do not substitute)

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20+ | |
| Backend | Express 4 + TypeScript 5 | REST API, strict mode (`"strict": true`) |
| Database | MySQL 8 | Raw SQL via **`mysql2/promise`** connection pool. **No ORM.** All schema lives in `db/schema.sql` so it can be inspected/run in MySQL Workbench. |
| Auth | `jsonwebtoken` + `bcrypt` | JWT in httpOnly cookie, role-based middleware |
| Validation | `express-validator` | On every write endpoint |
| File uploads | `multer` | Product/profile images → `/public/uploads`, served statically |
| Frontend | Plain **HTML + CSS + vanilla TypeScript** | Multi-page app. Frontend TS compiled with `tsc` to `/public/js`. **No React/Angular/Vue/Tailwind/Bootstrap.** Hand-written CSS only. |
| Charts | Chart.js via CDN | Analytics dashboards only |
| Dev tooling | `ts-node-dev`, ESLint, Prettier | |

Why raw SQL: the author is learning database fundamentals via MySQL Workbench. Write clean, parameterized queries (always `?` placeholders — never string concatenation) in a dedicated repository layer so a future Prisma migration (§15) is a drop-in replacement.

---

## 2. Roles & Permissions

Four roles, stored in `users.role`: `ADMIN`, `ARTISAN`, `CUSTOMER`, `CONSULTANT`.

| Capability | Admin | Artisan | Customer | Consultant |
|---|---|---|---|---|
| Manage users (suspend/activate) | ✅ | | | |
| Manage categories | ✅ | | | |
| Create/edit own product listings | | ✅ | | |
| Approve/reject listings (authenticity review) | | | | ✅ |
| Delist any product | ✅ | | | |
| Buy products, cart, wishlist | | | ✅ | |
| Write reviews (verified purchase only) | | | ✅ | |
| Manage own orders (status updates) | | ✅ (their items) | ✅ (view/cancel) | |
| Monitor all transactions | ✅ | | | |
| Create coupons / feature products | ✅ | ✅ (own-shop coupons) | | |
| Message (customer ↔ artisan) | | ✅ | ✅ | |
| Raise support tickets | | ✅ | ✅ | |
| Resolve support tickets | ✅ | | | |
| Submit B2B bulk inquiries | | | ✅ (business accounts) | |
| Respond to bulk inquiries with quotes | | ✅ | | |
| Edit heritage/profile page | | ✅ | | |
| Add cultural notes to crafts | | | | ✅ |
| Analytics: platform-wide | ✅ | | | |
| Analytics: own sales | | ✅ | | |

Registration: customers self-register (with optional "I'm a business" toggle → business name field). Artisans self-register but start as `PENDING` until an admin activates them. Consultant and additional admin accounts are created by an admin from the admin panel. One seeded admin account.

---

## 3. Module Map (10 modules)

1. **Auth & Accounts** — register, login, logout, JWT, role guards, profile settings.
2. **Product Catalog** — categories, product CRUD (artisan), search/filter/sort, product detail with image gallery, craft technique & materials metadata.
3. **Craft Authenticity & Verification** ⭐ — every new/edited listing enters `PENDING_REVIEW`; a Cultural Consultant approves (grants **Authenticity Badge** ✔ shown on product cards) or rejects with feedback; consultants attach public *cultural notes* describing the craft tradition (e.g., "Dhokra is a 4,000-year-old lost-wax casting technique of the Ojha metalsmiths…").
4. **Artisan Heritage Pages** ⭐ — public profile per artisan: tribe, region, craft tradition, personal story, photo gallery, their products. The storytelling layer that differentiates the platform.
5. **Cart, Checkout & Orders** — cart, address form, coupon application, **mock payment flow** (fake card/UPI form → always succeeds with a generated `MOCK-TXN-xxxx` ref, with a "simulate failure" checkbox for demoing error handling), order lifecycle `PLACED → CONFIRMED → SHIPPED → DELIVERED` (+ `CANCELLED`), per-artisan order views.
6. **Reviews & Ratings** — 1–5 stars + comment, only by customers who have a `DELIVERED` order containing that product ("Verified Purchase" tag), average rating on cards.
7. **Promotions & Coupons** — admin platform-wide coupons, artisan shop-level coupons, percent/flat types with min-order and expiry; admin can mark products **Featured** (homepage carousel "Craft of the Month").
8. **B2B Bulk Inquiry** ⭐ — business customers request wholesale quotes on a product (quantity, target price, message); the artisan responds with a quote (unit price, lead time); status flow `OPEN → QUOTED → ACCEPTED/DECLINED`.
9. **Messaging & Support** — customer ↔ artisan conversations (simple 5s polling, no websockets); support tickets raised by customers/artisans, triaged and resolved by admin.
10. **Analytics Dashboards** — Artisan: revenue over time, top products, order counts. Admin: GMV, orders/day, top categories/artisans, user growth. Chart.js + SQL `GROUP BY` aggregates.

Cross-cutting: **Notifications** (in-app bell: order updates, review decisions, quotes, messages) and **Wishlist**.

---

## 4. Database Schema (`db/schema.sql`)

MySQL 8, InnoDB, `utf8mb4`. Claude Code: create this exact schema file; it must run cleanly in MySQL Workbench against a fresh `kalasetu` database. Add indexes on all FKs and frequently filtered columns.

```sql
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
  region           VARCHAR(120) NOT NULL,        -- e.g. 'Bastar, Chhattisgarh'
  craft_tradition  VARCHAR(120) NOT NULL,        -- e.g. 'Dhokra metal casting'
  story            TEXT,                          -- heritage narrative
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
  cultural_notes  TEXT NULL,                     -- written by consultant on approval
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (artisan_id)  REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_status (status),
  INDEX idx_products_category (category_id)
);
-- Authenticity Badge = status 'APPROVED' (badge rendered from status; no separate flag)

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
  feedback      TEXT,                            -- private feedback to artisan
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
  created_by       INT UNSIGNED NOT NULL,         -- admin (platform-wide) or artisan
  artisan_id       INT UNSIGNED NULL,             -- NULL = platform-wide; else applies to that artisan's items only
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (artisan_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL UNIQUE,   -- e.g. KS-20260611-0001
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
  artisan_id INT UNSIGNED NOT NULL,               -- denormalized for artisan order views
  quantity   INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,              -- price snapshot at purchase time
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
  transaction_ref VARCHAR(40),                    -- MOCK-TXN-<random>
  paid_at         TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,          -- validate 1..5 in app layer
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
  product_id  INT UNSIGNED NULL,                  -- optional context product
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
  type       VARCHAR(40) NOT NULL,    -- ORDER_UPDATE, REVIEW_DECISION, NEW_QUOTE, NEW_MESSAGE, TICKET_UPDATE
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(255),
  link       VARCHAR(255),
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
);
```

**Business rules enforced in the service layer:**
- Stock decremented atomically inside a transaction at order placement; reject if insufficient.
- Order placement (order + items + payment + stock + coupon `used_count`) is **one SQL transaction** with rollback on failure.
- Editing an `APPROVED` product resets it to `PENDING_REVIEW` (re-verification) — except stock/price-only edits, which keep approval.
- Review allowed only if a `DELIVERED` order by that customer contains the product.
- Coupon validation: active, date window, min order, uses remaining, and artisan-scope match.
- Only `APPROVED` products with stock > 0 appear in the public shop.

---

## 5. REST API Reference

Base path `/api`. Auth via JWT in an httpOnly cookie; middleware: `requireAuth`, `requireRole('ADMIN' | ...)`. Response envelope: `{ success, data?, error? }`. Paginate lists with `?page=&limit=` (default 12). Errors centralized in one error-handler middleware.

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`

**Catalog (public)** — `GET /products` (`?search=&category=&minPrice=&maxPrice=&sort=newest|price_asc|price_desc|rating&featured=true`), `GET /products/:slug`, `GET /categories`, `GET /artisans`, `GET /artisans/:id` (heritage page payload: profile + products + cultural notes)

**Artisan** — `GET /artisan/products`, `POST /artisan/products` (multipart, up to 5 images), `PATCH /artisan/products/:id`, `DELETE /artisan/products/:id` (delist), `POST /artisan/products/:id/submit` (DRAFT → PENDING_REVIEW), `GET /artisan/orders`, `PATCH /artisan/orders/:orderId/status` (CONFIRMED→SHIPPED→DELIVERED, own items' orders only), `PATCH /artisan/profile`, `GET /artisan/analytics/summary`, `GET /artisan/analytics/revenue?range=30d`

**Consultant** — `GET /consultant/queue` (PENDING_REVIEW products), `GET /consultant/queue/:id`, `POST /consultant/reviews` ({productId, decision, feedback, culturalNotes}), `GET /consultant/history`

**Customer** — `GET|POST|PATCH|DELETE /cart(/:itemId)`, `GET|POST|DELETE /wishlist(/:productId)`, `POST /checkout/validate-coupon`, `POST /checkout/place-order`, `POST /payments/mock` ({orderId, method, simulateFailure}), `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` (only while PLACED), `POST /reviews`

**B2B** — `POST /inquiries` (business customers only), `GET /inquiries` (role-filtered: own for business, incoming for artisan), `POST /inquiries/:id/quote` (artisan), `PATCH /inquiries/:id/status` (business: ACCEPTED/DECLINED)

**Messaging** — `GET /conversations`, `POST /conversations` ({artisanId, productId?}), `GET /conversations/:id/messages?after=<id>` (polling), `POST /conversations/:id/messages`

**Support** — `POST /tickets`, `GET /tickets` (own; admin sees all), `PATCH /tickets/:id` (admin: status/assignment/resolution)

**Notifications** — `GET /notifications`, `PATCH /notifications/read-all`

**Admin** — `GET /admin/users` (+ `PATCH /admin/users/:id/status`, `POST /admin/users` for consultant/admin creation), `GET /admin/products` (+ `PATCH /admin/products/:id/feature`, `PATCH /admin/products/:id/delist`), `POST|GET|PATCH /admin/coupons`, `GET /admin/transactions` (all payments + filters), `GET /admin/analytics/summary`, `GET /admin/analytics/charts`, `POST|PATCH /admin/categories`

---

## 6. Frontend Pages

Multi-page app under `/public`. Shared header (logo, nav, search bar, cart count, notification bell, role-aware menu) and footer injected by a shared TS module. Each page has its own `.html`, a page TS module, and shared CSS + page CSS. All API calls via a single `apiFetch()` helper that handles the JSON envelope and 401 redirects.

**Public:** `index.html` (hero, featured "Craft of the Month" carousel, category grid, artisan spotlight, how-verification-works strip) · `shop.html` (filter sidebar + product grid + pagination) · `product.html?slug=` (gallery, price, badge, craft technique/materials, cultural notes panel, reviews, add-to-cart/wishlist, "Message artisan", "Request bulk quote" for business users) · `artisans.html` (directory) · `artisan.html?id=` (heritage page: cover image, story, tribe/region/craft, product grid) · `about.html` · `login.html` / `register.html`

**Customer:** `cart.html` · `checkout.html` (address + coupon + summary) · `payment.html` (mock card/UPI form, simulate-failure toggle) · `order-success.html` · `orders.html` / `order.html?id=` (status timeline) · `wishlist.html` · `messages.html` · `tickets.html` · `inquiries.html` (business accounts)

**Artisan:** `artisan/dashboard.html` (stats cards + revenue chart) · `artisan/products.html` (table with status chips) · `artisan/product-form.html` (create/edit + image upload preview) · `artisan/orders.html` · `artisan/inquiries.html` (quote response form) · `artisan/profile.html` (heritage page editor with live preview) · `artisan/messages.html`

**Consultant:** `consultant/queue.html` · `consultant/review.html?id=` (full product view + decision form: approve with cultural notes / reject with feedback) · `consultant/history.html`

**Admin:** `admin/dashboard.html` (KPI cards + charts) · `admin/users.html` · `admin/products.html` · `admin/transactions.html` · `admin/coupons.html` · `admin/tickets.html` · `admin/categories.html`

Role-gated pages: on load, call `GET /auth/me`; redirect to login if missing role. (Server-side JWT checks remain the real security boundary.)

---

## 7. Design System — "Mud & Metal"

The visual identity draws from the crafts themselves: the white-on-earth geometry of **Warli painting**, the burnished glow of **Dhokra bronze**, and **indigo-dyed textiles**. It must NOT look like a generic Shopify/Bootstrap store, and must not use the clichéd cream-background + terracotta-accent template.

**Palette (CSS custom properties in `:root`):**

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#231A15` | Deep umber — primary text, footer/nav background |
| `--mud` | `#8A5A33` | Warli mud-wall brown — section backgrounds (tints), borders |
| `--bronze` | `#B0782B` | Dhokra bronze — primary buttons, prices, links |
| `--indigo` | `#2E4057` | Indigo dye — secondary actions, headings on light bg |
| `--bone` | `#F1E8DA` | Bone white — page background |
| `--leaf` | `#5C7C4C` | Success / "Authentic" badge green |

**Type:** Display — `Fraunces` (Google Fonts; warm, characterful serif for headings and hero). Body — `Karla`. Utility/monospace — `IBM Plex Mono` for order numbers, transaction refs, prices in tables. Clear scale: 14/16/20/28/40/56px.

**Signature element:** a hand-drawn **Warli figure frieze** — a thin repeating SVG strip of stick figures, drums, and triangular dancers in single-line style — used as the section divider across the site and as the loading state. Build it once as an inline SVG pattern in `shared.css`/a partial; reuse everywhere. This is the one bold element; keep everything else quiet and disciplined.

**Components:** product cards with a subtle 2px `--mud` border and the green **✔ Authentic** badge chip; status chips color-coded per ENUM; order status as a horizontal timeline; toasts for actions; skeleton loaders on grids. Buttons: solid `--bronze` primary, outlined `--indigo` secondary, consistent verb labels ("Place order" → toast "Order placed").

**Quality floor:** fully responsive to 360px (hamburger nav, single-column grids), visible keyboard focus rings, `prefers-reduced-motion` respected, alt text on all images, semantic HTML (`<main>`, `<nav>`, `<article>`).

---

## 8. Project Structure

```
kalasetu/
├── db/
│   ├── schema.sql
│   └── seed.sql
├── src/                        # backend (TypeScript)
│   ├── server.ts               # express app bootstrap
│   ├── config/db.ts            # mysql2 pool from .env
│   ├── middleware/             # auth.ts, roles.ts, errorHandler.ts, upload.ts, validate.ts
│   ├── routes/                 # auth.routes.ts, product.routes.ts, ... one per module
│   ├── controllers/            # thin: parse req → call service → respond
│   ├── services/               # business rules, transactions
│   ├── repositories/           # ALL SQL lives here (userRepo.ts, productRepo.ts, ...)
│   ├── utils/                  # jwt.ts, slugify.ts, orderNumber.ts, notify.ts
│   └── types/                  # shared interfaces & enums
├── public/                     # frontend
│   ├── *.html, artisan/, consultant/, admin/
│   ├── css/ (shared.css + per-page)
│   ├── js/                     # tsc output — never edit by hand
│   └── uploads/                # multer destination (gitignore contents)
├── frontend-src/               # frontend TypeScript source
│   ├── lib/ (api.ts, auth.ts, layout.ts, toast.ts, format.ts)
│   └── pages/ (one module per page)
├── .env.example
├── package.json                # scripts: dev, build, build:frontend, start, seed
├── tsconfig.json  tsconfig.frontend.json
└── README.md
```

Layering rule: `routes → controllers → services → repositories`. Controllers never write SQL; repositories never contain business logic. This is what makes the future Prisma swap (§15) a repositories-only change.

`.env.example`:
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kalasetu
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
```

---

## 9. Security & Validation Checklist

- bcrypt (cost 10) for passwords; never return `password_hash` in any query's SELECT list.
- JWT in `httpOnly`, `sameSite=lax` cookie; `requireRole` middleware on every protected route.
- Parameterized queries only (`pool.execute(sql, params)`).
- `express-validator` on all writes; escape user content when injecting into DOM (use `textContent`, never `innerHTML` with user data — XSS).
- Multer: images only (mime whitelist), 2MB limit, randomized filenames.
- Ownership checks: artisan can touch only own products/orders/quotes; customer only own cart/orders/tickets.
- Rate-limit `/auth/login` (simple in-memory counter is fine).

---

## 10. Seed Data (`db/seed.sql` + `npm run seed`)

Realistic, respectful demo data (placeholder images from `/public/uploads/seed/` — generate simple colored placeholder images at build time or use plain CSS placeholders; do NOT hotlink external photos):

- 1 admin (`admin@kalasetu.in` / `Admin@123`), 1 consultant, 4 artisans (ACTIVE), 3 customers (one with `is_business=1`, "Terra Decor Imports").
- Artisan profiles spanning real Indian craft traditions — describe traditions accurately and respectfully: **Dhokra metal casting** (Bastar, Chhattisgarh), **Warli painting** (Palghar, Maharashtra), **Gond painting** (Dindori, Madhya Pradesh), **Lambani/Banjara embroidery** (Vijayanagara, Karnataka). Stories of 3–4 sentences each.
- 6 categories: Metal Craft, Paintings, Textiles & Embroidery, Bamboo & Cane, Pottery & Terracotta, Jewellery.
- ~16 products across statuses (mostly APPROVED with cultural notes, 2 PENDING_REVIEW so the consultant demo works, 1 REJECTED, 1 DRAFT).
- 4–5 orders in mixed statuses with payments, 6+ reviews, 2 coupons (`TRIBALART10` percent platform-wide, one artisan flat coupon), 1 bulk inquiry with a quote, 2 support tickets, 1 conversation with messages, 2 featured products.

---

## 11. Code Quality Bar

- TypeScript strict; no `any` except narrowly-typed third-party gaps.
- Every service function ≤ ~40 lines; descriptive names; no dead code.
- Consistent envelope + HTTP codes (200/201/400/401/403/404/409/500).
- Comments only where the *why* isn't obvious (transactions, re-verification rule).
- Conventional commits per phase: `feat(orders): checkout with transactional stock decrement`.

---

## 12. Build Phases (Claude Code: execute in order; each phase must compile, run, and pass its acceptance criteria before the next)

**Phase 0 — Scaffold.** Repo structure, tsconfigs, ESLint/Prettier, express bootstrap with health route, static serving, error handler, `.env` wiring, npm scripts (`dev`, `build`, `build:frontend`, `start`). ✅ `GET /api/health` returns `{success:true}`; a placeholder index.html is served.

**Phase 1 — DB + Auth.** `schema.sql`, db pool, auth module (register/login/logout/me), role middleware, login/register pages, shared layout (header/footer/nav) + design tokens. ✅ All four roles can log in; protected route returns 403 for wrong role; schema runs clean in Workbench.

**Phase 2 — Catalog + Artisan listings.** Categories, product CRUD with image upload, artisan products table + form, public shop with search/filter/sort/pagination, product detail page, heritage pages + artisan directory, artisan profile editor. ✅ Artisan creates a draft with 3 images and submits for review; shop shows only APPROVED; heritage page renders story + products.

**Phase 3 — Verification.** Consultant queue, review page, approve-with-cultural-notes / reject-with-feedback, badge rendering, re-verification on edit, notifications to artisan. ✅ Pending product approved → appears in shop with ✔ badge and cultural notes panel; rejected → artisan sees feedback.

**Phase 4 — Cart → Checkout → Mock payment → Orders.** Cart, wishlist, coupon validation, transactional order placement, mock payment page (success + simulated failure path), order history + status timeline, artisan order management with status updates, notifications. ✅ Full happy path works; simulate-failure leaves order unpaid and stock restored; stock at 1 cannot be bought twice.

**Phase 5 — Reviews + Promotions.** Verified-purchase reviews, rating aggregates on cards/sort, admin + artisan coupon CRUD, featured products + homepage carousel. ✅ Non-purchaser blocked from reviewing (403); expired coupon rejected with clear message.

**Phase 6 — Messaging + Support.** Conversations with 5s polling, unread badges, ticket creation + admin triage/resolve flow. ✅ Two browsers chat without refresh; ticket lifecycle OPEN→RESOLVED visible to raiser.

**Phase 7 — B2B Bulk Inquiry.** Inquiry form (business accounts only), artisan quote response, accept/decline, notifications. ✅ End-to-end OPEN→QUOTED→ACCEPTED demo with seeded business account.

**Phase 8 — Admin + Analytics.** Admin users/products/transactions/categories pages, Chart.js dashboards (admin: GMV, orders/day, top categories; artisan: revenue 30d, top products). ✅ Charts render from real SQL aggregates; suspend blocks login with clear error.

**Phase 9 — Polish + Seed + README.** Seed script, responsive/a11y pass, empty states for every list, Warli frieze divider everywhere, README with screenshots placeholder, architecture diagram (Mermaid), setup steps, demo credentials table, feature list.

---

## 13. README Requirements (portfolio-facing)

Hero banner, one-line pitch, badges (Node/TS/MySQL), feature list grouped by role, architecture diagram (Mermaid: browser → Express → service → repo → MySQL), ER summary, screenshots section, local setup (Workbench-friendly: "run db/schema.sql, run db/seed.sql, npm run dev"), demo credentials table, roadmap (§15). Write it so a recruiter understands the project in 60 seconds.

## 14. Explicit Non-Goals (do not build)

Real payment gateways, websockets, email/SMS, multi-language i18n, Docker, tests beyond a couple of service-layer examples, image CDN/processing. Keep scope tight and finishable.

## 15. Roadmap / Learning Path (document, don't build yet)

1. **Prisma migration** — replace `repositories/*` with Prisma client calls; `prisma db pull` introspects the existing MySQL schema. The layering in §8 makes this a contained change.
2. Razorpay test-mode integration replacing the mock payment service.
3. Order-item-level fulfillment for multi-artisan orders.
4. Hindi/Telugu i18n; image optimization (sharp).

---

*Claude Code: when ambiguity arises, choose the simplest implementation consistent with §4 business rules and §11 quality bar, and note the decision in the README's "Design decisions" section.*
