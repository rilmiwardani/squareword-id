# 🟩 SQUAREWORD INDONESIA (Squareword ID)

> Permainan Teka-Teki Kata 5×5 Harian Bahasa Indonesia berbasis Kamus Besar Bahasa Indonesia (KBBI).

---

## 🎮 Tentang Permainan
**Squareword ID** adalah adaptasi Bahasa Indonesia dari game puzzle kata populer *SquareWord*. Pemain menebak kata 5-huruf yang valid untuk mengungkap 10 kata tersembunyi di dalam kotak 5×5 (5 kata mendatar dan 5 kata menurun) dengan tebakan sesedikit mungkin.

### 🌟 Fitur Utama:
- **Teka-Teki Harian (Daily Mode)**: Teka-teki baru setiap hari yang tersinkronisasi otomatis dengan zona waktu lokal.
- **Mode Bebas (Practice Mode)**: Mainkan tanpa batas untuk mengasah kosakata kapan saja dengan pilihan tingkat kesulitan (Mudah, Sedang, Sulit, Ekstrem).
- **Arsip Teka-Teki (Archives)**: Mainkan kembali seluruh teka-teki harian sebelumnya.
- **Statistik Lengkap**: Pelacakan kemenangan (*streak*, *win rate*, distribusi tebakan) dan statistik per hari.
- **Mode Gelap & Mode Terang**: Tampilan responsif dengan kontras tinggi untuk kenyamanan mata.
- **Mode Layar Penuh (Full Screen)**: Pengalaman bermain imersif tanpa gangguan bilah peramban.
- **Efek Suara Sintetis & Animasi**: Web Audio API responsif tanpa dependensi file audio eksternal.
- **Kamus KBBI Valid**: Bank kata divalidasi berdasarkan kata baku Bahasa Indonesia.

---

## 🚀 Cara Menjalankan Secara Lokal

Cukup buka `index.html` langsung di peramban web modern, atau jalankan server lokal sederhana:

```bash
# Menggunakan Python
python -m http.server 3000

# Atau menggunakan Node (npx)
npx serve .
```

Buka peramban di `http://localhost:3000`.

---

## 📦 Panduan Upload ke GitHub & Deploy ke Vercel

### 1. Upload ke GitHub

1. Buka terminal di direktori proyek ini.
2. Inisialisasi Git dan buat commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Squareword Indonesia"
   ```
3. Buat repositori baru di [GitHub](https://github.com/new).
4. Hubungkan remote dan push ke GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```

### 2. Deploy ke Vercel

1. Buka dashboard [Vercel](https://vercel.com) dan login (bisa via akun GitHub).
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repositori GitHub `Squareword` yang baru saja Anda upload, lalu klik **"Import"**.
4. Di bagian **Framework Preset**, biarkan **"Other"** (karena ini adalah situs web statis murni tanpa build step).
5. Klik **"Deploy"**.
6. Selesai! Dalam hitungan detik game Anda sudah aktif secara global dengan domain gratis `https://nama-proyek.vercel.app`.

---

## 🛠️ Struktur Proyek

```
squareword/
├── css/
│   └── style.css            # Desain sistem responsif (Dark & Light Theme)
├── js/
│   ├── app.js               # Game engine, controller, & interaksi UI
│   ├── audio.js             # Efek suara sintetis (Web Audio API)
│   ├── puzzles.js           # Bank teka-teki 5x5 (10 kata unik per puzzle)
│   └── words.js             # Kamus kata valid KBBI
├── index.html               # Halaman utama aplikasi
├── vercel.json              # Konfigurasi deployment & caching Vercel
├── .gitignore               # Daftar file yang diabaikan git
└── README.md                # Dokumentasi proyek
```

---

## 📄 Lisensi
Squareword ID © 2026.
