# GDGoC UNSRI Management System — Back-End REST API

> **Google Developer Groups on Campus (GDGoC) Universitas Sriwijaya**  
> RESTful API berbasis Node.js, Express.js, dan PostgreSQL untuk manajemen anggota chapter, event, pendaftaran konkuren, dan presensi.

## Daftar Isi
1. [Tech Stack](#tech-stack)
2. [Arsitektur dan Clean Code](#arsitektur-dan-clean-code)
3. [Fitur Utama](#fitur-utama)
4. [Akun Pengujian (Test Accounts)](#akun-pengujian-test-accounts)
5. [Prasyarat Sistem](#prasyarat-sistem)
6. [Menjalankan Aplikasi via Docker (Satu Perintah)](#menjalankan-aplikasi-via-docker-satu-perintah)
7. [Menjalankan Aplikasi Secara Manual](#menjalankan-aplikasi-secara-manual)
8. [Automated Testing dan CI/CD](#automated-testing-dan-cicd)
9. [Dokumentasi API (OpenAPI 3.0 / Swagger)](#dokumentasi-api-openapi-30--swagger)
10. [Mitigasi Keamanan](#mitigasi-keamanan)
11. [Deployment](#deployment)

## Tech Stack

- **Runtime Environment**: [Node.js](https://nodejs.org/) (v18+)
- **Web Framework**: [Express.js](https://expressjs.com/) v4
- **Database Engine**: [PostgreSQL](https://www.postgresql.org/) (v15+)
- **Database Client**: `pg` (node-postgres) dengan parameterized queries (tanpa ORM overhead untuk performa dan keamanan query)
- **Authentication**: Stateless JSON Web Token (`jsonwebtoken`) — Dual Token (Access Token 15 menit + Refresh Token 7 hari)
- **Password Hashing**: `bcrypt` (12 salt rounds)
- **Input Validation**: `express-validator` (skema dan sanitasi ketat)
- **Security Middleware**: `helmet`, `cors`, `express-rate-limit`
- **Testing Suite**: `jest` + `supertest`
- **Containerization**: `Docker` + `docker-compose`
- **CI/CD**: GitHub Actions

## Arsitektur dan Clean Code

Infrastruktur backend dibangun menggunakan arsitektur modular berlapis (*Layered Architecture*) dengan pemisahan tanggung jawab yang jelas:

```
src/
├── config/             # Konfigurasi database pool, validasi environment
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

## Fitur Utama

1. **Role-Based Access Control (RBAC 3 Tingkat / 8 Role)**:
   - `LEAD`: Akses penuh ke seluruh data organisasi, mutasi role anggota, audit log, dan hapus event.
   - Eksekutif (`CO_LEAD`, `SECRETARY_1/2`, `TREASURER_1/2`, `CORE_TEAM`): Mengelola event dan memantau absensi peserta.
   - `MEMBER`: Katalog event, pendaftaran event, absensi mandiri pada jam aktif, dan edit profil pribadi.
2. **Pencegahan Race Condition Kuota**:
   - Transaksi database dengan *Pessimistic Locking* (`SELECT ... FOR UPDATE`) memastikan kuota event tidak pernah terlampaui saat banyak request mendaftar di milidetik yang sama pada slot terakhir.
3. **Absensi Idempoten dan Verifikasi Waktu**:
   - Absensi hanya valid bagi anggota yang terdaftar pada event tersebut.
   - Absensi dibatasi pada jendela waktu pelaksanaan event (`start_time <= now <= end_time`).
   - Eksekusi idempoten menggunakan klausul `ON CONFLICT DO NOTHING`, sehingga klik ganda atau network retry tidak menimbulkan duplikasi data.
4. **Audit Trail Sensitif**:
   - Setiap perubahan role anggota dicatat ke tabel `audit_logs` (menyimpan actor, target, old value, new value, IP address, dan timestamp).
5. **Soft Delete**:
   - Anggota yang dihapus ditandai `is_deleted = TRUE` dan dikecualikan dari query aktif, menjaga integritas referensial data historis.

## Akun Pengujian (Test Accounts)

Database seed menyediakan akun pengujian untuk seluruh role resmi GDGoC UNSRI (password untuk seluruh akun: `Password123!`):

| Role | Email | Password | Divisi |
| :--- | :--- | :--- | :--- |
| **LEAD** | `lead.gdgoc@gmail.com` | `Password123!` | Project Management |
| **CO_LEAD** | `colead.gdgoc@gmail.com` | `Password123!` | Human Resource |
| **SECRETARY_1** | `sec1.gdgoc@gmail.com` | `Password123!` | Public Relation |
| **SECRETARY_2** | `sec2.gdgoc@gmail.com` | `Password123!` | Copywriting |
| **TREASURER_1** | `treas1.gdgoc@gmail.com` | `Password123!` | Project Management |
| **TREASURER_2** | `treas2.gdgoc@gmail.com` | `Password123!` | Public Relation |
| **CORE_TEAM** | `core.tech@gmail.com` | `Password123!` | Web Development |
| **CORE_TEAM (ML)** | `core.ml@gmail.com` | `Password123!` | Machine Learning |
| **MEMBER (Davin)** | `davin4@gmail.com` | `Password123!` | Web Development |
| **MEMBER (Siti)** | `member.gdgoc@gmail.com` | `Password123!` | UI/UX |

## Prasyarat Sistem

- **Node.js** v18.0.0 atau lebih baru
- **PostgreSQL** v15 atau lebih baru (jika dijalankan manual)
- **Docker Desktop** (opsional, direkomendasikan untuk menjalankan dengan satu perintah)

## Menjalankan Aplikasi via Docker (Satu Perintah)

Aplikasi telah dilengkapi dengan konfigurasi containerisasi lengkap:

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

## Menjalankan Aplikasi Secara Manual

### 1. File Konfigurasi Lingkungan
File `.env` sudah disediakan di folder proyek ini dengan konfigurasi lokal:
```bash
cp .env.example .env
```
Contoh konfigurasi lokal:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gdgoc_db
JWT_SECRET=your-jwt-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-key
BCRYPT_ROUNDS=12
```

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

## Automated Testing dan CI/CD

Proyek dilengkapi dengan automated test suite menggunakan Jest dan Supertest yang menguji logika bisnis kritis:
1. **Quota Race Condition**: Menguji dua request concurrent yang mendaftar bersamaan pada slot terakhir. Memvalidasi bahwa hanya 1 request yang berhasil (status 201) dan 1 ditolak (status 409).
2. **Role Authorization**: Memvalidasi bahwa role `MEMBER` ditolak (403) saat mengakses endpoint `LEAD` seperti audit logs.
3. **Idempotency Absensi**: Menguji check-in ganda oleh user yang sama pada event aktif, memastikan data tetap tunggal dan respon konsisten.

Jalankan test suite dengan:
```bash
npm test
```

Pipeline CI di `.github/workflows/ci.yml` secara otomatis menjalankan pengujian unit dan integrasi pada setiap push dan Pull Request menggunakan database PostgreSQL service container di GitHub Actions.

## Dokumentasi API (OpenAPI 3.0 / Swagger)

Spesifikasi OpenAPI 3.0 lengkap tersedia di:
- YAML: `docs/openapi.yaml` atau endpoint `GET /openapi.yaml`
- UI Interaktif: endpoint `GET /docs` (atau root `/`)

Endpoint utama meliputi:
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/refresh`, `/api/auth/me`
- **Members**: `/api/members` (GET, POST - LEAD only), `/api/members/:id` (GET, PUT, DELETE), `/api/members/:id/role` (PATCH - LEAD only)
- **Events**: `/api/events` (GET, POST), `/api/events/:id` (GET, PUT, DELETE)
- **Registrations**: `/api/events/:id/register` (POST, DELETE), `/api/events/:id/registrations` (GET)
- **Attendances**: `/api/events/:id/checkin` (POST), `/api/events/:id/attendances` (GET), `/api/attendances/my` (GET)
- **Audit Logs**: `/api/audit-logs` (GET - LEAD only)
- **Divisions**: `/api/divisions` (GET)

## Mitigasi Keamanan

| Vektor Serangan | Langkah Mitigasi yang Diimplementasikan |
| :--- | :--- |
| **IDOR (Insecure Direct Object Reference)** | Ownership validation di service layer: user hanya dapat mengedit profil diri sendiri; modifikasi user lain dibatasi khusus role `LEAD`. |
| **Mass Assignment** | Whitelisting field di controller; role dan flag status tidak dapat disusupi melalui request body publik. |
| **SQL Injection** | Seluruh query menggunakan parameterized binding `$1, $2` via driver `pg`. Whitelist strict diterapkan pada kolom sorting. |
| **Input Validation** | Middleware `express-validator` memvalidasi tipe data, format UUID, panjang string, dan format email sebelum mencapai controller. |
| **Brute Force Login** | `express-rate-limit` membatasi login, register, dan OAuth maksimal 15 request per 15 menit per alamat IP, ditambah batas global 200 request per 15 menit. |
| **Password Storage** | Algoritma `bcrypt` dengan cost factor 12 salt rounds; password plaintext tidak pernah disimpan atau dicatat di log. |
| **Kebocoran Secret** | `.env` terdaftar di `.gitignore`; file `.env.example` disediakan tanpa data rahasia produksi. |
| **Penyembunyian Error Internal** | `errorHandler` menyaring seluruh error: pesan sensitif dan stack trace tidak pernah dibocorkan ke client di mode produksi. |

## Deployment

- **Repository GitHub**: [https://github.com/Davin164/BE_Program_DavinGabrielJonathan](https://github.com/Davin164/BE_Program_DavinGabrielJonathan)
- **Live Deployment URL**: [https://be-program-davin-gabriel-jonathan.vercel.app](https://be-program-davin-gabriel-jonathan.vercel.app)
- **Swagger Documentation**: [https://be-program-davin-gabriel-jonathan.vercel.app/docs](https://be-program-davin-gabriel-jonathan.vercel.app/docs)
