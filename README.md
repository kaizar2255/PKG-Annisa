# Aplikasi PKG 2025 (Penilaian Kinerja Guru & Perilaku)

Aplikasi Web modern untuk pengelolaan dan penilaian Kinerja Guru (PKG 2025) berbasis template data **PKG 2025 Abdul Rohim**. Dilengkapi navigasi 19 sheet lengkap, kalkulasi skor otomatis, sistem Multi-Login (Guru & Kepala Sekolah), validasi Kepala Sekolah (Draft, Menunggu Validasi, Divalidasi, Perlu Perbaikan), format cetak A4, serta **Integrasi Otomatis Google Drive (1 File Spreadsheet per Guru dalam Folder Google Drive)**.

---

## 📁 Folder Google Drive Target
📁 **Folder Google Drive**:  
[https://drive.google.com/drive/folders/1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7](https://drive.google.com/drive/folders/1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7)

Setiap kali akun guru baru dibuat atau data disimpan, sistem Google Apps Script akan secara otomatis membuat dan menyinkronkan 1 file Google Spreadsheet tersendiri untuk guru tersebut (contoh: `PKG 2025 - Abdul rohim, S.Pd`) di dalam folder Drive ini.

---

## 🚀 Fitur Utama

1. **Multi-Login & Multi-User Isolated**:
   - Akun **Kepala Sekolah** (`kepala_sekolah` / `123456` - Abdul Yakub, S.Ag): dapat meninjau, menyetujui/memvalidasi, atau mengembalikan penilain guru dengan catatan perbaikan.
   - Akun **Guru** (`guru1`, `guru2`, dan pendaftaran guru baru): dapat mengisikan identitas, indikator, bukti dukung, dan instrumen perilaku secara mandiri.
2. **Per-Teacher Google Spreadsheet Generation**:
   - Pembuatan 1 file Google Spreadsheet secara dinamis per guru dalam folder Google Drive target.
3. **Sidebar Navigasi 19 Sheet**:
   - **Utama**: `Menu` (Dashboard), `Isi data` (Form Identitas Guru & Penilai), `Rekap` (Rekapitulasi Nilai & Predikat PKG).
   - **Instrumen Perilaku**: `Instrumen Perilaku GuruKS` & `Rekap Instrumen Perilaku GuruKS`.
   - **Sub Kompetensi**: `SubKom.1` s/d `SubKom.14` (Form Evaluasi 14 Indikator Kompetensi Guru).
4. **Form Interaktif & Perhitungan Otomatis**:
   - Mengubah skor indikator `0`, `1`, atau `2` secara otomatis memperhitungkan Total Skor, Persentase (%), Nilai Konversi (1-4), dan pembaruan otomatis pada tabel `Rekap`.
5. **Format Bukti Dukung Clean & Left-Aligned**:
   - Teks bukti dukung otomatis diformat menjadi 1 paragraf tunggal yang rata kiri tanpa karakter enter berantakan.
6. **Tombol Cetak (Print A4 & PDF)**:
   - CSS `@media print` teroptimasi untuk mencetak lembar PKG A4 tanpa menampilkan tombol navigasi, serta tabel `tfoot` (Total) hanya berada di lembar paling akhir.

---

## 📂 Struktur File Proyek

```text
pkg-2025-app/
├── index.html            # Antarmuka utama aplikasi (Single Page Application)
├── styles.css            # Styling kustom, responsif mobile, & CSS cetak A4
├── pkg_initial_data.js   # Data awal template PKG 2025 (14 SubKom & Identitas)
├── app.js                # Logika aplikasi (multi-login, validasi KS, sync Drive)
├── Code.gs               # Script backend Google Apps Script untuk Google Drive
└── README.md             # Petunjuk penggunaan aplikasi
```

---

## 🌐 Cara Menghubungkan ke Google Drive (Google Apps Script)

Untuk mengaktifkan pembuatan file Spreadsheet otomatis di Folder Google Drive:

1. Buka [Google Apps Script](https://script.google.com/) dan buat proyek baru.
2. Salin seluruh isi file `Code.gs` dari proyek ini dan tempelkan ke editor Apps Script.
3. Pastikan `TARGET_FOLDER_ID` dalam `Code.gs` berisi `1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7`.
4. Klik tombol **Simpan (Save)**.
5. Klik **Terapkan (Deploy)** -> **Penerapan Baru (New Deployment)**.
6. Pilih jenis penerapan **Aplikasi Web (Web App)**:
   - **Jalankan sebagai**: `Saya (Me)`
   - **Siapa yang memiliki akses**: `Siapa saja (Anyone)`
7. Klik **Terapkan (Deploy)** dan berikan izin akses ke Google Drive.
8. Salin **URL Aplikasi Web** yang dihasilkan (contoh: `https://script.google.com/macros/s/AKfycbx.../exec`).
9. Di aplikasi PKG 2025, klik tombol **Mode Lokal / Settings (ikon gerigi)** di header kanan atas, tempelkan URL tersebut, dan klik **Simpan Pengaturan**.
10. Setiap kali guru mendaftar atau mengklik **Simpan**, 1 file Spreadsheet khusus guru akan dibuat secara otomatis di Folder Google Drive Anda!
