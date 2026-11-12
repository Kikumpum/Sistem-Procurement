# Ruang Pengadaan

Aplikasi React + Vite untuk mencatat permintaan pembelian, persetujuan, penawaran vendor, purchase order, dan penerimaan barang. Supabase Auth mengelola login. Supabase Postgres menyimpan data per akun sehingga akun yang sama bisa membukanya dari perangkat berbeda. Tekan **Muat Ulang** untuk mengambil perubahan terbaru.

## Menyiapkan Supabase

1. Buat proyek di Supabase. Buka **SQL Editor**, tempel isi [migrasi SQL](supabase/migrations/202611120001_procurement.sql), lalu jalankan sekali.
2. Buat pengguna melalui **Authentication → Users**. Gunakan email dan kata sandi akun tersebut untuk masuk. Jika aplikasi hanya untuk pengguna internal, matikan pendaftaran mandiri di pengaturan Auth.
3. Ambil **Project URL** dan **Publishable key** dari dialog **Connect** di Supabase. Untuk proyek lama, kunci `anon` bisa digunakan sebagai publishable key. Kunci `service_role` dan secret key harus tetap di lingkungan server.

Tabel `procurement_workspaces` menyimpan satu baris JSONB per akun. Kebijakan Row Level Security membatasi baca dan tulis ke akun pemilik. Kolom `revision` membantu mencegah perubahan dari dua perangkat saling menimpa. Persetujuan dicatat dalam ruang kerja akun yang sama.

## Menjalankan lokal

Gunakan Node.js 22 atau lebih baru. Salin `.env.example` ke `.env.local` lalu isi kedua variabel.

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

```sh
npm ci
npm run dev
```

## Hosting di Vercel

1. Impor repositori GitHub ini sebagai proyek baru di Vercel. Pilih direktori akar repositori sebagai **Root Directory**.
2. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di **Settings → Environment Variables**. Pilih lingkungan Production dan Preview sesuai kebutuhan.
3. Jalankan deploy. `vercel.json` memilih preset Vite, menjalankan `npm run build`, dan memakai folder keluaran `build`. Jalankan deploy baru setelah mengganti variabel lingkungan.

## Memindahkan data dari versi lama

Buka `dist/index.html` dari lokasi dan browser yang dipakai sebelumnya. Di Ringkasan, klik **Ekspor Data Lokal** untuk mengunduh catatan dari penyimpanan browser. Masuk ke versi React dengan akun yang ingin dipakai, pilih **Impor Data Versi Lama**, lalu unggah file JSON tersebut. Impor tersedia selama akun belum pernah menyimpan data di versi Supabase.

Folder `dist` memuat aplikasi lama untuk membantu ekspor. Vercel memakai hasil build React di folder `build`.
