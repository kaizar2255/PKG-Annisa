# Aplikasi PKG 2025 (Penilaian Kinerja Guru)

Aplikasi Web modern untuk pengelolaan dan penilaian Kinerja Guru (PKG 2025) berbasis template data **PKG 2025 Abdul Rohim**. Aplikasi ini menyajikan navigasi sidebar 19 sheet lengkap, kalkulasi skor otomatis, format cetak siap pakai (Print/PDF A4), dan opsi penyimpanan ke **Google Sheets** via **Google Apps Script**.

---

## 🚀 Fitur Utama

1. **Sidebar Navigasi 19 Sheet**:
   - **Utama**: `Menu` (Dashboard), `Isi data` (Form Identitas Guru & Penilai), `Rekap` (Rekapitulasi Nilai & Predikat PKG).
   - **Instrumen Perilaku**: `Instrumen Perilaku GuruKS` & `Rekap Instrumen Perilaku GuruKS`.
   - **Sub Kompetensi**: `SubKom.1` s/d `SubKom.14` (Form Evaluasi 14 Indikator Kompetensi Guru).
2. **Form Interaktif & Perhitungan Otomatis**:
   - Mengubah skor indikator `0`, `1`, atau `2` secara otomatis memperhitungkan Total Skor, Persentase (%), Nilai Konversi (1-4), dan pembaruan otomatis pada tabel `Rekap`.
3. **Tombol Cetak (Print A4)**:
   - Dilengkapi CSS `@media print` teroptimasi untuk mencetak lembar PKG fisik atau simpan ke PDF tanpa menampilkan sidebar maupun tombol antarmuka.
4. **Tombol Simpan & Integrasi Google Sheets**:
   - **Mode Lokal**: Menyimpan data secara otomatis di `localStorage` browser.
   - **Mode Google Sheets**: Terhubung ke backend `Code.gs` Google Apps Script untuk menyimpan seluruh sheet langsung ke Google Spreadsheet Anda.

---

## 📂 Struktur File Proyek

```text
pkg-2025-app/
├── index.html            # Antarmuka utama aplikasi (Single Page Application)
├── styles.css            # Styling kustom & CSS cetak (@media print)
├── pkg_initial_data.js   # Data awal template PKG 2025 (14 SubKom & Identitas)
├── app.js                # Logika aplikasi (perhitungan, navigasi, simpan, cetak)
├── Code.gs               # Script backend untuk Google Apps Script (GAS)
└── README.md             # Petunjuk penggunaan aplikasi
```

---

## 🛠️ Cara Menggunakan Aplikasi Secara Lokal

1. Buka folder proyek: `C:\Users\Administrator\.gemini\antigravity\scratch\pkg-2025-app`.
2. Buka file `index.html` dengan mengklik dua kali atau membukanya menggunakan browser favorit Anda (Chrome, Edge, Firefox).
3. Anda langsung dapat berpindah antar sheet dari sidebar sebelah kiri, mengedit data identitas pada menu `Isi data`, dan memberi nilai pada `SubKom.1` - `SubKom.14`.
4. Klik tombol **Simpan** di pojok kanan atas untuk menyimpan perubahan data.

---

## 🌐 Cara Menghubungkan ke Google Sheets (Google Apps Script)

Jika Anda ingin data tersimpan langsung ke Google Spreadsheet:

1. Buka file Google Spreadsheet Anda (atau buat Spreadsheet baru di Google Drive).
2. Klik menu **Ekstensi (Extensions)** -> **Apps Script**.
3. Buka file `Code.gs` yang ada di proyek ini, salin seluruh isinya, lalu tempelkan ke editor Apps Script.
4. Klik tombol **Simpan (Save)**.
5. Klik tombol **Terapkan (Deploy)** -> **Penerapan Baru (New Deployment)**.
6. Pada jenis penerapan, pilih **Aplikasi Web (Web App)**:
   - *Jalankan sebagai*: **Saya (Me)**
   - *Siapa yang memiliki akses*: **Siapa saja (Anyone)**
7. Klik **Terapkan (Deploy)** dan berikan izin akses Google Account Anda.
8. Salin **URL Aplikasi Web** yang dihasilkan (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).
9. Buka aplikasi web PKG 2025 Anda, klik tombol **Mode Lokal / Setting (ikon gerigi)** di header kanan atas, masukkan URL Web App tersebut, lalu klik **Simpan Pengaturan**.
10. Sekarang setiap kali Anda mengklik tombol **Simpan**, data akan tersimpan ke Google Sheets Anda!
