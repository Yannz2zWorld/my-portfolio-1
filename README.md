# my-portfolio-1

Portfolio pribadi bergaya profil sosial media (X / Instagram / TikTok), dengan **Diriku Panel** untuk mengatur semua isinya tanpa edit kode.

- `/`: halaman portfolio (banner, foto profil + centang biru, cerita, sorotan, grid karya, kontak, sosial media)
- `/panel`: Diriku Panel, dikunci dengan password

Project ini berdiri sendiri: tanpa database dan tanpa framework. Isi portfolio disimpan di `data/portfolio.json` di repo ini. Setiap kali kamu klik **Simpan** di panel, perubahan dikirim sebagai commit ke repo, lalu Vercel deploy ulang otomatis (±1 menit).

## Deploy ke Vercel

1. **Import** repo ini di [vercel.com/new](https://vercel.com/new). Framework: *Other*, tanpa build command.
2. Buat **GitHub token** di [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) (fine-grained):
   - Repository access: *Only select repositories* → `my-portfolio-1`
   - Permissions → Repository → **Contents: Read and write**
3. Di Vercel → Project → **Settings → Environment Variables**, isi:

   | Nama | Isi |
   | --- | --- |
   | `PANEL_PASSWORD` | password untuk masuk Diriku Panel (minimal 8 karakter) |
   | `GITHUB_TOKEN` | token dari langkah 2 |
   | `GITHUB_REPO` | opsional, `owner/nama-repo`; default: repo yang di-deploy Vercel |
   | `GITHUB_BRANCH` | opsional, default `main` |

4. **Redeploy** sekali supaya variabelnya terbaca, lalu buka `/panel`.

## Isi yang bisa diatur di panel

- Profil: nama, username, centang biru, bio, lokasi, website, teks bergabung
- Banner (16:9, 4:3, 3:1) dan foto profil: link foto, GIF, video (`.mp4`/`.webm`), atau YouTube
- Cerita: teks (dengan latar), foto, GIF, atau video. Tampilan **Overlay** (gelembung di samping foto profil, kartu dengan tombol View) atau **View** (lingkaran, layar penuh)
- Sorotan, karya portfolio, statistik, keahlian, pengalaman
- Kontak (email, telepon) dan platform digital: YouTube, TikTok, X, Instagram, WhatsApp, Facebook, Telegram, GitHub, LinkedIn, Threads, Spotify, Discord, Website

Link media harus diawali `https://`, `http://`, atau `/` (file di repo ini, misalnya taruh `media/banner.mp4` lalu tulis `/media/banner.mp4`). Link lain ditolak.

## Coba di komputer sendiri

```bash
PANEL_PASSWORD=rahasia123 npm run dev   # http://localhost:3000 dan /panel
npm test
```

Tanpa `GITHUB_TOKEN`, panel bisa dibuka tapi tombol Simpan akan bilang penyimpanan belum diatur.

## Struktur

```
index.html            halaman portfolio (membaca data/portfolio.json)
panel/index.html      Diriku Panel
data/portfolio.json   isi portfolio
api/portfolio.js      GET (publik), PUT/DELETE (password) → commit ke GitHub
api/auth.js           cek password panel
lib/portfolio.js      validasi isi (field yang dikenal, panjang teks, link aman)
lib/github.js         baca/tulis data/portfolio.json lewat GitHub API
lib/auth.js           password panel + cek asal permintaan
scripts/dev.js        server lokal yang meniru Vercel
tests/                node --test
```
