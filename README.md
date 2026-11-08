# GDGoC UNSRI Management System — Back-End REST API

> **Google Developer Groups on Campus (GDGoC) Universitas Sriwijaya**  
> Robust, scalable, and secure RESTful API built with Node.js, Express.js, and PostgreSQL for managing chapter members, multi-track events, concurrent registrations, and verifiable attendance.

---

## 📋 Daftar Isi
1. [Tech Stack](#-tech-stack)
2. [Arsitektur & Clean Code](#-arsitektur--clean-code)
3. [Fitur Utama](#-fitur-utama)
4. [Akun Pengujian (Test Accounts)](#-akun-pengujian-test-accounts)
5. [Prasyarat Sistem](#-prasyarat-sistem)
6. [Menjalankan Aplikasi (1 Perintah via Docker)](#-menjalankan-aplikasi-1-perintah-via-docker)
7. [Menjalankan Aplikasi Secara Manual](#-menjalankan-aplikasi-secara-manual)
8. [Automated Testing & CI/CD](#-automated-testing--cicd)
9. [Dokumentasi API (OpenAPI 3.0 / Swagger)](#-dokumentasi-api-openapi-30--swagger)
10. [Mitigasi Keamanan](#-mitigasi-keamanan)
11. [Deployment](#-deployment)

---

## 🛠 Tech Stack

- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18+)
- **Web Framework**: [Express.js](https://expressjs.com/) v4
- **Database Engine**: [PostgreSQL](https://www.postgresql.org/) (v15+)
- **Database Client**: `pg` (node-postgres) dengan parameterized queries (Bebas ORM overhead demi performa & pencegahan SQL Injection mutlak)
- **Authentication**: Stateless JSON Web Token (`jsonwebtoken`) — Dual Token (Access Token 15 menit + Refresh Token 7 hari)
- **Password Hashing**: `bcrypt` (12 salt rounds)
- **Input Validation**: `express-validator` (Strict schema & sanitation)
- **Security Middleware**: `helmet`, `cors`, `express-rate-limit`
- **Testing Suite**: `jest` + `supertest`
- **Containerization**: `Docker` + `docker-compose`
- **CI/CD**: GitHub Actions

---

## 🏗 Arsitektur & Clean Code

Infrastruktur backend dibangun menggunakan arsitektur modular berlapis (*Layered Clean Architecture*) dengan pemisahan tanggung jawab yang tegas:

```
src/
├── config/             # Konfigurasi database pool, environment validation
├── middleware/         # Autentikasi JWT, otorisasi RBAC, rate limiter, error handling
├── modules/            # Domain-driven feature modules
│   ├── auth/           # Routing, controller, service, validator autentikasi
│   ├── members/        # Manajemen anggota (CRUD, pagination, filter, search, sort, soft delete)
│   ├── events/         # Siklus hidup event
│   ├── registrations/  # Pendaftaran event dengan pessimistic locking (concurrency safe)
│   ├── attendances/    # Absensi idempoten dengan time-window check
│   ├── audit-logs/     # Audit trail immutable untuk perubahan data sensitif
│   └── divisions/      # Master data divisi GDGoC
├── scripts/            # Script migrasi database terprogram
├── utils/              # Respon standar, JWT helper, hashing password, audit logger
├── app.js              # Inisialisasi Express & konfigurasi middleware pipeline
└── server.js           # Server entry point & graceful shutdown handler
```

---

## ✨ Fitur Utama

1. **Role-Based Access Control (RBAC 3 Tingkat)**:
   - `LEAD`: Akses penuh ke seluruh data organisasi, promosi role anggota, audit log, dan hapus event.
   - `DIVISION_HEAD`: Mengelola event divisi dan memantau absensi anggota.
   - `MEMBER`: Eksplorasi event, pendaftaran event bersaing, absensi mandiri pada jam aktif, dan edit profil pribadi.
2. **Pencegahan Race Condition Kuota**:
   - Transaksi database dengan *Pessimistic Locking* (`SELECT ... FOR UPDATE`) memastikan kuota event tidak pernah terlampaui (*no overselling*), meskipun ratusan request mendaftar di milidetik yang sama pada slot terakhir.
3. **Absensi Idempoten & Verifikasi Ketat**:
   - Absensi hanya valid bagi anggota yang terdaftar pada event tersebut.
   - Absensi dibatasi pada jendela waktu pelaksanaan event (`start_time <= now <= end_time`).
   - Eksekusi idempoten menggunakan klausul `ON CONFLICT DO NOTHING`, sehingga klik ganda/network retry tidak menimbulkan duplikasi data atau error.
4. **Audit Trail Sensitif**:
   - Setiap perubahan role anggota dicatat ke tabel `audit_logs` (menyimpan actor, target, old value, new value, IP address, dan timestamp).
5. **Soft Delete**:
   - Anggota yang dihapus ditandai `is_deleted = TRUE` dan dikeluarkan dari query publik, menjaga integritas referensial data historis.

---

## 👥 Akun Pengujian (Test Accounts)

Database seed telah menyediakan akun pengujian untuk 7 Role resmi GDGoC UNSRI:

| Role | Email | Password | Divisi |
| :--- | :--- | :--- | :--- |
| **LEAD** | `lead.gdgoc@gmail.com` | `Password123!` | Core Team |
| **CO_LEAD** | `colead.gdgoc@gmail.com` | `Password123!` | Core Team |
| **SECRETARY** | `secretary.gdgoc@gmail.com` | `Password123!` | Core Team |
| **TREASURER** | `treasurer.gdgoc@gmail.com` | `Password123!` | Core Team |
| **TECHNICAL_DIVISION** | `tech.gdgoc@gmail.com` | `Password123!` | Technical Division |
| **NON_TECHNICAL_DIVISION** | `nontech.gdgoc@gmail.com` | `Password123!` | Non-Technical Division |
| **MEMBER** | `davingabrieljonathan@gmail.com` | `Password123!` | Technical Division |
| **MEMBER (Secondary)** | `member.gdgoc@gmail.com` | `Password123!` | Non-Technical Division |

---

## 💻 Prasyarat Sistem

- **Node.js** v18.0.0 atau lebih baru
- **PostgreSQL** v15 atau lebih baru (jika dijalankan manual)
- **Docker Desktop** (opsional, direkomendasikan untuk menjalankan dengan satu perintah)

---

## 🐳 Menjalankan Aplikasi (1 Perintah via Docker)

Aplikasi telah dilengkapi dengan konfigurasi containerisasi lengkap. Cukup jalankan satu perintah:

```bash
docker compose up --build
```

Layanan akan otomatis:
1. Menjalankan container PostgreSQL 15 dan melakukan inisialisasi schema dari direktori `migrations/`.
2. Melakukan health-check hingga database siap menerima koneksi.
3. Menjalankan container API Express pada port `3000`.

Akses server: `http://localhost:3000/api/health`

Untuk mematikan container:
```bash
docker compose down
```

---

## ⚙️ Menjalankan Aplikasi Secara Manual

### 1. Salin Environment Variable
```bash
cp .env.example .env
```
Sesuaikan nilai variabel di `.env` (berikut contoh konfigurasi lokal maupun Supabase PostgreSQL):
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://gdgoc_user:gdgoc_pass@localhost:5432/gdgoc_unsri
JWT_ACCESS_SECRET=gdgoc_unsri_access_secret_key_2025_super_secure
JWT_REFRESH_SECRET=gdgoc_unsri_refresh_secret_key_2025_super_secure
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```
*(Catatan: Jika `DATABASE_URL` diarahkan ke cloud seperti Supabase PostgreSQL Pooler/Direct Connection, SSL akan aktif secara otomatis).*

### 2. Install Dependensi
```bash
npm install
```

### 3. Jalankan Migrasi Database
```bash
npm run migrate
```
Perintah ini akan mengeksekusi seluruh file SQL migrasi di folder `migrations/` secara berurutan.

### 4. Jalankan Database Seeder
```bash
npm run seed
```
Perintah ini akan memasukkan data master divisi, akun pengujian, dan event contoh.

### 5. Jalankan Server
- Mode Produksi:
  ```bash
  npm start
  ```
- Mode Development (Auto Reload):
  ```bash
  npm run dev
  ```

---

## 🧪 Automated Testing & CI/CD

Proyek dilengkapi dengan automated test suite menggunakan Jest dan Supertest yang menguji logika bisnis kritis:
1. **Quota Race Condition**: Menguji dua request concurrent yang mendaftar bersamaan pada slot terakhir. Memvalidasi bahwa hanya 1 request yang berhasil (status 201) dan 1 ditolak (status 409).
2. **Role Authorization**: Memvalidasi bahwa role `MEMBER` ditolak (403) saat mengakses endpoint `LEAD` seperti audit logs.
3. **Idempotency Absensi**: Menguji check-in ganda oleh user yang sama pada event aktif, memastikan data tetap tunggal dan respon konsisten.

Jalankan test suite dengan:
```bash
npm test
```

Pipeline CI di `.github/workflows/ci.yml` secara otomatis menjalankan pengujian unit & integrasi pada setiap push dan Pull Request menggunakan database PostgreSQL service container di GitHub Actions.

---

## 📖 Dokumentasi API (OpenAPI 3.0 / Swagger)

Spesifikasi OpenAPI 3.0 lengkap tersedia di file:
`docs/openapi.yaml`

Endpoint utama meliputi:
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/google` (Supabase OAuth), `/api/auth/refresh`, `/api/auth/me`
- **Members**: `/api/members` (GET, POST - LEAD only), `/api/members/:id` (GET, PUT, DELETE), `/api/members/:id/role` (PATCH - LEAD only)
- **Events**: `/api/events` (GET, POST), `/api/events/:id` (GET, PUT, DELETE)
- **Registrations**: `/api/events/:id/register` (POST, DELETE), `/api/events/:id/registrations` (GET)
- **Attendances**: `/api/events/:id/checkin` (POST), `/api/events/:id/attendances` (GET), `/api/attendances/my` (GET)
- **Audit Logs**: `/api/audit-logs` (GET - LEAD only; mencatat `ROLE_CHANGE`, `MEMBER_CREATE`, `USER_DELETE`, dan `EVENT_DELETE`)
- **Divisions**: `/api/divisions` (GET)

---

## 🛡 Mitigasi Keamanan

| Vektor Serangan | Langkah Mitigasi yang Diimplementasikan |
| :--- | :--- |
| **IDOR (Insecure Direct Object Reference)** | Ownership validation di tingkat service layer: user hanya dapat mengedit profil diri sendiri; modifikasi user lain dibatasi khusus role `LEAD`. |
| **Mass Assignment** | DTO filtering dan strict body destructuring di controller; role dan flag status tidak dapat disusupi melalui request body. |
| **SQL Injection** | Seluruh query menggunakan parameterized binding `$1, $2` via driver `pg`. Whitelist strict diterapkan pada kolom sorting. |
| **Input Validation** | Middleware `express-validator` memvalidasi tipe data, format UUID, panjang string, dan format email sebelum mencapai controller. |
| **Brute Force Login** | `express-rate-limit` membatasi percobaan login maksimal 5 request per 15 menit per alamat IP. |
| **Password Storage** | Algoritma `bcrypt` dengan cost factor 12 salt rounds; password plaintext tidak pernah disimpan atau dicatat di log. |
| **Kebocoran Secret** | `.env` terdaftar di `.gitignore`; file `.env.example` disediakan tanpa data rahasia produksi. |
| **Penyembunyian Error Internal** | `errorHandler` menyaring seluruh error: pesan sensitif dan stack trace tidak pernah dibocorkan ke client (hanya kode error generik terstandarisasi). |

---

## 🌐 Deployment (Supabase PostgreSQL + Vercel / Railway / Render)

- **Repository GitHub**: [https://github.com/Davin164/BE_Program_DavinGabrielJonathan](https://github.com/Davin164/BE_Program_DavinGabrielJonathan)
- **Database Cloud**: **Supabase PostgreSQL** (mendukung Transaction/Session Pooler dengan SSL otomatis).
  1. Buat project di [Supabase](https://supabase.com/), salin **Connection String (URI)** dari *Connect -> Transaction/Session Pooler* ke `DATABASE_URL`.
  2. Jalankan migrasi & seeder satu kali ke database Supabase dari lokal:
     ```bash
     npm run migrate
     npm run seed
     ```
- **Target Platform Hosting API**:
  - **Vercel Serverless** (`api/index.js` & `vercel.json` sudah dikonfigurasi siap pakai), atau
  - **Railway / Render / Google Cloud Run** (`Dockerfile` multi-stage siap pakai).
  - Masukkan seluruh variabel `.env` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) di dashboard hosting.
