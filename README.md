# Sekolah Absenku — Starter

Aplikasi React + Vite berbahasa Indonesia untuk pratinjau portal absensi sekolah.

## Fitur tampilan
- Login UI: Siswa, Guru, Admin Sekolah, Orang Tua
- Tombol Coba Demo tanpa akun
- Dashboard per peran, riwayat absensi, daftar siswa contoh, rekap contoh
- Kartu QR ilustrasi, notifikasi ilustrasi, cetak halaman
- Supabase client dan skema SQL awal

## Jalankan di Windows
1. Ekstrak ZIP.
2. Buka folder hasil ekstrak di VS Code.
3. Terminal > New Terminal.
4. Jalankan `npm install`.
5. Salin `.env.example` menjadi `.env.local`.
6. Isi URL Supabase dan Publishable Key di `.env.local`.
7. Jalankan `npm run dev`, lalu buka URL yang ditampilkan Vite.

## Supabase
- Buka SQL Editor pada proyek Supabase yang benar.
- Tinjau lalu jalankan `supabase/schema.sql`.
- Buat akun melalui Supabase Auth dan baris `profiles` dengan ID yang sama.
- Jangan masukkan service_role/secret key ke browser; gunakan publishable key.
- RLS aktif dan belum ada policy. Buat serta uji policy terbatas sesuai role sebelum menggunakan data sungguhan.

## Batasan penting
- Tombol Coba Demo dan data yang terlihat memakai data contoh, bukan database.
- Login online memakai Supabase Auth, tetapi profil/role harus dibuat di tabel `profiles`.
- Absensi online, scan QR sungguhan, notifikasi orang tua, dan operasi rekap database belum tersambung pada starter ini.
- QR pada kartu hanya ilustrasi, bukan QR presensi valid.
- Jangan menonaktifkan RLS atau membuka seluruh data ke publik demi menghilangkan error.
