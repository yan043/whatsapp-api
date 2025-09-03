# 📱 WhatsApp Web API Gateway

**WhatsApp API Gateway** adalah solusi **multi-login** berbasis website yang memungkinkan Anda mengelola banyak sesi WhatsApp dan mengirim pesan (teks & media) melalui REST API.  
Cocok untuk notifikasi sistem, chatbot, broadcast, hingga kebutuhan bisnis lainnya!

---

## 🚀 Fitur Utama

- **Multi-Session**: Kelola banyak akun WhatsApp sekaligus
- **Login QR Code**: Scan QR seperti WhatsApp Web
- **Kirim Pesan & Media**: Kirim teks, gambar, dokumen via API
- **Broadcast Delay**: Atur jeda antar pesan broadcast (custom detik)
- **Dashboard Web**: Antarmuka visual untuk manajemen sesi
- **RESTful API**: Mudah diintegrasikan ke sistem Anda

---

## ⚡️ Instalasi & Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/yan043/whatsapp-api.git
cd whatsapp-api
```

### 2. Install Dependency

```bash
npm install
```

### 3. Jalankan Aplikasi

```bash
npm start
```

Aplikasi akan berjalan di port **6969** secara default.  
Buka browser dan akses: [http://localhost:6969](http://localhost:6969)

> **Catatan:**  
> - Untuk port/host custom, gunakan environment variable `PORT` dan `HOST`.
> - Kompatibel untuk Windows & Linux.

---

## 🖥️ Penggunaan

### 1. **Buka Dashboard**

Akses [http://localhost:6969](http://localhost:6969)  
Buat sesi baru dengan ID unik, lalu scan QR menggunakan WhatsApp Anda.

### 2. **Broadcast Pesan (Dengan Delay Custom)**

Akses menu **Broadcast** di [http://localhost:6969/broadcast](http://localhost:6969/broadcast)

- Masukkan ID Sender (sesi WhatsApp)
- Masukkan daftar nomor (pisahkan dengan koma)
- Isi pesan
- (Opsional) Upload media
- **Atur Delay** (jeda antar pesan, misal: 2 detik/pesan)
- Klik **Kirim Broadcast**

Setiap pesan akan dikirim satu per satu sesuai delay yang Anda tentukan.

### 3. **Kirim Pesan via API**

#### Endpoint Kirim Pesan Teks

```http
POST /send-message
Content-Type: application/json

{
  "sender": "id_session",
  "number": "6281234567890",
  "message": "Halo dari API!"
}
```

#### Endpoint Kirim Media

```http
POST /send-media
Content-Type: application/json

{
  "sender": "id_session",
  "number": "6281234567890",
  "caption": "Ini gambar",
  "file": "http://localhost:6969/assets/uploads/namafile.jpg"
}
```

#### Endpoint Broadcast (dengan delay)

```http
POST /broadcast
Content-Type: application/json

{
  "sender": "id_session",
  "numbers": "6281234567890,6289876543210",
  "message": "Promo spesial hari ini!",
  "file": "http://localhost:6969/assets/uploads/namafile.jpg", // opsional
  "delay": 30 // delay antar pesan dalam detik
}
```

#### Upload Media

```http
POST /upload
Content-Type: multipart/form-data

file: [pilih file]
```
Response:  
```json
{ "status": true, "url": "http://localhost:6969/assets/uploads/namafile.jpg" }
```

---

## 🗂️ Struktur Proyek

```bash
whatsapp-api/
├── index.js                 # Entry point utama aplikasi
├── helpers/
│   └── formatter.js         # Format nomor WhatsApp
├── assets/
│   ├── css/                 # File CSS (core, style, icon-font)
│   ├── icon/                # Favicon dan ikon
│   ├── images/              # Gambar banner dan lainnya
│   └── uploads/             # Folder upload media
├── views/
│   ├── index.html           # Dashboard multi-session
│   └── broadcast.html       # Halaman broadcast pesan (dengan delay)
├── sessions/                # Penyimpanan sesi login WhatsApp
└── README.md                # Dokumentasi proyek ini
```

---

## 💡 Tips & Catatan

- **Nomor WhatsApp** harus format internasional, contoh: `6281234567890` (tanpa `+`).
- Folder `sessions/` menyimpan sesi agar tidak perlu scan QR ulang saat restart.
- Folder `assets/uploads/` otomatis dibuat untuk upload file.
- Bisa dijalankan di **Windows** maupun **Linux** tanpa perlu ubah kode.
- Fitur delay broadcast sangat berguna untuk menghindari spam/blocking dari WhatsApp.

---

## 🤝 Kontribusi

Kontribusi sangat terbuka!

1. Fork repositori ini
2. Buat branch fitur/perbaikan
3. Kirim pull request untuk direview

---

## 📄 Lisensi

Proyek ini dirilis di bawah [MIT License](LICENSE).

---

## 🙏 Kredit

Dibuat oleh [yan043](https://github.com/yan043)  
Powered by Node.js & [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
