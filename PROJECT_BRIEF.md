# HutangBestie — Project Brief (Tugas Komputasi Awan & Terdistribusi)

## 1. Gambaran Umum
**HutangBestie** adalah aplikasi web pencatat & penagih utang teman yang dirancang untuk di-deploy ke cloud (AWS) pada mata kuliah **CAK3EAB3 Komputasi Awan dan Terdistribusi**.

## 2. Syarat Teknis Wajib
- **Arsitektur:** Terdiri dari **Frontend** dan **Backend**.
- **Tanpa Database:** Tidak boleh menggunakan database (MySQL, PostgreSQL, SQLite, MongoDB, dll.). Seluruh data persistensi disimpan secara *hardcoded* / *in-memory* menggunakan struktur data **JSON / Dictionary (`dict`)**.
- **3 Entitas Utama (masing-masing wajib punya operasi CRUD: Create, Read, Update, Delete):**
  1. `Friends`: `id`, `name`, `phone`, `nickname`
  2. `Debts`: `id`, `friend_id`, `amount`, `description`, `date`, `status` (`"Belum Lunas"` / `"Lunas"`)
  3. `Reminders`: `id`, `friend_id`, `debt_id`, `message_template`, `sent_date`

## 3. Fitur yang Harus Dibangun
- **Manage Friends (CRUD):** Tambah, lihat, ubah, hapus data teman.
- **Manage Debts (CRUD):** Tambah, lihat, ubah, hapus catatan utang.
- **Manage Reminders (CRUD):** Buat, lihat, ubah template, hapus log pengingat.
- **Fitur Gabungan 1 (`Friends` + `Debts`):** Tambah utang & hitung otomatis total utang aktif per teman di backend.
- **Fitur Gabungan 2 (`Friends` + `Debts` + `Reminders`):** Generator pesan pengingat santai/lucu, simpan ke log `Reminders`, serta tandai utang lunas (*Settle Debt*).

## 4. UI/UX & Skill
- Skill **UI/UX Pro Max** sudah terpasang khusus di project ini (`.agents/skills/ui-ux-pro-max`).
- Gunakan skill tersebut untuk merancang tampilan Frontend yang modern, bersih, responsif, dan sesuai dengan elemen utama:
  - Header + tombol `+ Tambah Teman` dan `+ Catat Utang`
  - 3 Kartu Ringkasan (*Total Piutang*, *Teman Belum Lunas*, *Sudah Lunas*)
  - Tabel Daftar Utang Teman dengan tombol aksi (*Tagih*, *Lunas*, *Edit*, *Hapus*)
  - Panel Generator Pesan Pengingat Santai (*Salin Pesan* & *Simpan Log*)
