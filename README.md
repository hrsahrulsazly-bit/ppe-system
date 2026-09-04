# Sistem Pengurusan & Serahan PPE

Aplikasi web untuk menguruskan permohonan dan serahan Peralatan Perlindungan Diri
(PPE). Dibina dengan Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase.

Rujuk `Spesifikasi-Sistem-PPE-ClaudeCode.md` untuk keperluan penuh sistem ini.

## Ciri-ciri

- **Borang pekerja (awam, tanpa log masuk)** — `/` — cari nama, pilih PPE layak
  mengikut jawatan, hantar permohonan.
- **Dashboard HR (log masuk Supabase Auth)** — `/hr/dashboard` — semak & lulus/tolak
  permohonan, urus stok, urus pekerja, lihat rekod, muat turun PDF serahan, import/eksport
  Excel.

## Persediaan (Setup)

### 1. Supabase

1. Cipta projek baharu di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan kandungan `supabase/migrations/0001_init.sql`.
   Ini akan cipta jadual, RLS policies, view awam (`employees_public`,
   `ppe_items_public`), fungsi RPC (`approve_request`, `reject_request`), dan
   seed data item PPE asas.
3. Salin **Project URL**, **anon public key** daripada Settings → API.

### 2. Environment Variables

Salin `.env.local.example` kepada `.env.local` dan isikan:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

`SUPABASE_SERVICE_ROLE_KEY` disediakan untuk keperluan admin masa depan (backup,
skrip). **Jangan** letak dalam kod client atau commit ke GitHub — hanya simpan
sebagai secret Environment Variable di Vercel jika diperlukan kelak.

### 3. Pasang & Jalankan Tempatan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk borang pekerja, dan
[http://localhost:3000/hr/login](http://localhost:3000/hr/login) untuk log masuk HR.

### 4. Akaun HR Pertama

Buka Supabase Dashboard → **Authentication** → **Add user** → masukkan emel &
kata laluan staf HR pertama. Log masuk di `/hr/login` menggunakan kelayakan itu.

### 5. Data Awal

- **Pekerja:** Tab *Pekerja* → *Import Excel* → guna templat yang disediakan.
- **Stok PPE:** Item PPE asas (7 jenis mengikut §6.1 spesifikasi) sudah diseed
  oleh migrasi dengan stok = 0. Kemaskini stok sebenar di tab *Stok PPE*
  (edit terus atau import Excel).
- **Rekod sejarah:** Tab *Rekod* → *Import Data Lama* jika ada rekod serahan
  PPE terdahulu untuk diarkibkan (tidak menolak stok semasa).

### 6. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import repo ke [Vercel](https://vercel.com/new).
3. Tetapkan Environment Variables yang sama seperti `.env.local` di Vercel
   Project Settings → Environment Variables.
4. Deploy. Setiap push ke `main` akan auto-deploy.

## Struktur Projek

```
app/
├── page.tsx                 # Borang pekerja (awam)
├── hr/
│   ├── login/page.tsx        # Log masuk HR
│   └── dashboard/
│       ├── layout.tsx        # Shell + proteksi auth
│       ├── inbox/page.tsx    # Papan pemuka + permohonan menunggu
│       ├── stock/page.tsx    # Urus stok PPE
│       ├── employees/page.tsx# Pangkalan data pekerja
│       ├── records/page.tsx  # Rekod & import data lama
│       └── settings/page.tsx # Tetapan syarikat
components/
├── worker/RequestForm.tsx
├── hr/{DashboardShell,RequestModal,ImportModal,KpiTile}.tsx
└── ui/{Button,Card,Badge,Modal}.tsx
lib/
├── supabase/{client,server,middleware}.ts
├── ppe-config.ts             # Peraturan kelayakan PPE & saiz/kuantiti (§6.1–6.2)
├── pdf/{handover,downloadForRequest}.ts
└── excel/{employees,stock,records,shared}.ts
supabase/migrations/0001_init.sql
proxy.ts                      # Proteksi laluan /hr/dashboard (Next.js 16 "proxy")
```

## Nota Seni Bina

- **Pekerja (anon key)** hanya boleh `SELECT` daripada view `employees_public`
  dan `ppe_items_public` (medan sensitif — No. IC & stok dalaman — disembunyikan),
  dan `INSERT` pada `requests` sahaja.
- **Lulus permohonan** dilaksanakan melalui RPC `approve_request` (transaksi
  atomik: tolak stok + tandakan status `issued` dalam satu transaksi Postgres).
- **PDF serahan** dijana di client (`jsPDF`) mengikut susunan tepat §6.5 —
  tidak memaparkan lajur "Keluar"/"Baki Stok".

