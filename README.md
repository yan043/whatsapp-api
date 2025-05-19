# 📱 WhatsApp Web API Gateway

**WhatsApp API Gateway** adalah solusi **multi-login** berbasis website yang memungkinkan Anda mengelola sesi WhatsApp dan mengirim pesan melalui REST API. Cocok untuk keperluan notifikasi sistem, chatbot, hingga kebutuhan bisnis lainnya!

![banner](https://user-images.githubusercontent.com/10343216/128694250-498be648-1981-4e0c-a8d2-02281b4f2ff5.png)

---

## ✨ Fitur Unggulan

- ✅ **Multi-Session Support**  
  Menjalankan lebih dari satu sesi WhatsApp dalam satu aplikasi

- 📱 **QR Code Login**  
  Login mudah dengan scan QR seperti WhatsApp Web

- 📤 **Kirim Pesan via API**  
  Kirim pesan teks langsung dari sistem Anda

- 🌐 **Dashboard Web**  
  Antarmuka visual untuk manajemen sesi

- 🔌 **RESTful API**  
  Mudah diintegrasikan dengan berbagai platform

---

## ⚙️ Instalasi & Menjalankan

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

🌐 Buka browser dan akses: [http://localhost:3000](http://localhost:3000)

---

## 🧠 Struktur Proyek

```bash
whatsapp-api/
├── app.js                 # Entry point utama aplikasi
├── helpers/
│   └── helper.js          # Fungsi-fungsi bantu (random id, filename generator)
├── assets/
│   └── style.css          # CSS untuk tampilan halaman web
├── index.html             # Halaman frontend untuk login & kirim pesan
├── sessions/              # Folder penyimpanan sesi login WhatsApp
└── README.md              # Dokumentasi proyek ini
```

---

## 🔌 Endpoint API

| Method | Endpoint            | Deskripsi                        |
|--------|---------------------|----------------------------------|
| GET    | `/`                 | Halaman utama (login + kirim)    |
| POST   | `/send-message`     | Kirim pesan ke nomor WhatsApp    |

**Contoh request kirim pesan:**

```http
POST /send-message
Content-Type: application/json

{
  "session": "namasession",
  "number": "6281234567890",
  "message": "Halo dari API!"
}
```

---

## 🧪 Fungsi & Logika Utama

- **app.js**
  - Membuat sesi WhatsApp menggunakan [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
  - Menangani koneksi QR dan penyimpanan sesi ke file
  - Menyediakan route REST API untuk mengirim pesan

- **helpers/helper.js**
  - Fungsi untuk generate nama file secara acak
  - Fungsi timestamp atau ID generator

- **index.html**
  - Tampilan login QR per sesi
  - Formulir untuk kirim pesan ke nomor tujuan

---

## 💡 Catatan Tambahan

- Folder `sessions/` digunakan untuk menyimpan sesi agar tidak perlu scan QR ulang saat restart.
- Format nomor WhatsApp yang valid dimulai dengan kode negara, contoh: `6281234567890` (tanpa `+`).

---

## 🙌 Kontribusi

Kami membuka kontribusi dari siapa pun!

1. Fork repositori ini
2. Buat branch fitur atau perbaikan
3. Kirim pull request untuk kami review

---

## 📄 Lisensi

Proyek ini dirilis di bawah [MIT License](LICENSE).

---

## 🤝 Kredit

Dibuat oleh [yan043](https://github.com/yan043) dengan ❤️ menggunakan Node.js dan whatsapp-web.js
