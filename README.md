# SCORPION CALCULATOR PRO

PWA kalkulator scientific berbahasa Indonesia. Dibuat dengan HTML, CSS, dan JavaScript murni.

## Struktur
- `index.html` — antarmuka kalkulator
- `style.css` — desain responsif hitam-emas
- `app.js` — mesin hitung, riwayat, IndexedDB, kompresi gambar
- `sw.js` — cache offline
- `manifest.json` — metadata instalasi PWA
- `icons/` — ikon 192x192 dan 512x512

## Menjalankan dan memasang di Android
1. Buat repository GitHub baru, misalnya `scorpion-calculator-pro`.
2. Upload seluruh isi folder ini, termasuk folder `icons`.
3. Buka **Settings → Pages** pada repository.
4. Pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu Save.
5. Tunggu GitHub Pages menerbitkan alamat HTTPS.
6. Buka alamat HTTPS tersebut melalui Chrome Android.
7. Pilih menu Chrome (⋮) → **Tambahkan ke layar utama** atau **Install app**.

Service worker dan IndexedDB memerlukan HTTPS atau localhost. Saat pertama kali online, buka aplikasi dan tunggu sampai aset selesai di-cache. Setelah itu, shell aplikasi dapat dibuka offline.

## Catatan
- File gambar dipilih melalui file picker sistem Android. Jika kartu SD tersedia dan ditampilkan oleh Android, pengguna dapat memilihnya dari sana.
- Gambar dikompres menjadi JPEG maksimal sisi 1800 px sebelum disimpan di IndexedDB.
- Riwayat menyimpan maksimal 20 hasil di localStorage pada browser/perangkat yang sama.
- Data lokal tidak otomatis tersinkron ke perangkat lain.
