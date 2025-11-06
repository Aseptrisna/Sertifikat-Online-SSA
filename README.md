Panduan Arsitektur: Generator Sertifikat v2 (Node.js + MongoDB)

Ini adalah panduan lengkap untuk membuat sistem yang diminta, versi 2, dengan UI yang menampilkan tabel yang dapat dicari dan menggunakan file .env untuk keamanan.

Arsitektur Sistem

Backend: Node.js

Express.js: Server web dan API.

Mongoose: Koneksi ke MongoDB.

pdf-lib: Modifikasi PDF.

dotenv: Membaca variabel dari file .env.

fs (File System): Membaca template.

Database: MongoDB.

Frontend: HTML, Tailwind CSS, dan JavaScript.

Alur Kerja (Workflow)

Bagian 1: Pembuatan Sertifikat (Poin 1 & 2)

Proses satu kali (batch process) dari terminal Anda.

Anda siapkan template.pdf.

Anda siapkan file .env (isi MONGO_URI).

Anda siapkan generateCertificates.js.

Anda masukkan 34 nama peserta ke dalam array participantNames.

Jalankan: node generateCertificates.js.

Skrip akan membaca MONGO_URI dari .env, terhubung ke DB, membuat 34 PDF di /public/certificates/, dan menyimpan data ke MongoDB.

Bagian 2: Halaman Unduh (Poin 3)

Server web yang berjalan terus-menerus.

Jalankan: node server.js.

Server akan membaca MONGO_URI dari .env dan menyajikan index.html.

Peserta membuka http://localhost:3000.

JavaScript di frontend memanggil API GET /all-certificates.

server.js mengambil semua data dari MongoDB dan mengirimkannya sebagai JSON.

JavaScript di frontend membuat tabel yang dapat difilter secara instan.

Peserta mengklik "Unduh".

Cara Menjalankan Proyek Ini

Prasyarat: Instal Node.js dan punya akses ke MongoDB.

Langkah 1: Pengaturan Proyek

Buat folder baru, misal: proyek-sertifikat.

Masuk ke folder itu: cd proyek-sertifikat.

Inisialisasi proyek: npm init -y.

Instal dependensi (termasuk dotenv yang baru):

npm install express mongoose pdf-lib dotenv


Buat folder untuk file publik:

mkdir -p public/certificates


Tempatkan template Anda di folder root: template.pdf.

Buat file generateCertificates.js dan server.js (dari bawah) di folder root.

Buat file index.html dan letakkan di dalam folder public.

BARU: Buat file .env di folder root (sudah saya sediakan). Isi MONGO_URI di dalamnya.

Langkah 2: Edit Koordinator (PENTING)

Buka generateCertificates.js. Anda HARUS mengubah nilai x dan y agar pas dengan template Anda.

// ...
firstPage.drawText(name, {
  x: 350, // <-- UBAH INI (Jarak dari kiri)
  y: 300, // <-- UBAH INI (Jarak dari bawah)
  size: 30,
  // ...
});
// ...


Langkah 3: Jalankan Skrip Generator (Poin 1 & 2)

Pastikan MongoDB berjalan.

node generateCertificates.js


Langkah 4: Jalankan Server Web (Poin 3)

node server.js


Server akan berjalan di http://localhost:3000.

PENTING (Keamanan): Jika Anda menggunakan Git, tambahkan .env ke file .gitignore Anda agar tidak ter-upload!