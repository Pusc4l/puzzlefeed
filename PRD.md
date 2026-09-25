# Product Requirement Document (PRD)

## Project Name: Puzzle Feed Generator & Interactive Game

---

### 1. Executive Summary
Aplikasi web interaktif berbasis Flask (Python) yang memungkinkan pengguna mengunggah gambar personal untuk dipotong menjadi grid puzzle feed (opsi grid dari 3x3 hingga 9x9). Gambar yang diunggah akan secara otomatis diacak menjadi sebuah permainan puzzle interaktif di browser, sekaligus menyediakan fitur unduh hasil potongan gambar dalam format ZIP.

---

### 2. User Target & Goals
- **Target User**: Kreator konten sosmed, penggiat Instagram feed, dan pengguna awam yang menyukai game puzzle interaktif.
- **User Goal**: 
  - Mengubah gambar tunggal menjadi potongan puzzle feed yang rapi.
  - Memainkan game susun gambar secara langsung di web dengan foto pilihan sendiri.

---

### 3. Functional Requirements

#### A. File Upload & Validation
- **Drag & Drop / File Picker**: Mengunggah file gambar dari perangkat lokal.
- **Supported Formats**: `.png`, `.jpg`, `.jpeg`, `.webp`.
- **Validation**:
  - Ukuran maks file: 10 MB.
  - Notifikasi pesan error jika file bukan gambar atau rusak.

#### B. Dynamic Grid Selection
- Pengguna dapat memilih dimensi grid via UI (*dropdown* atau *slider*):
  - **3x3** (9 Potongan) - Standar Instagram Feed
  - **4x4** (16 Potongan)
  - **5x5** (25 Potongan)
  - **6x6 hingga 9x9** (Hingga 81 Potongan untuk tingkat kesulitan tinggi)

#### C. Interactive Game Board (Frontend)
- **Auto-Shuffle**: Gambar yang diunggah langsung dipotong dan diacak posisinya menggunakan algoritma *Fisher-Yates*.
- **Tile Interaction**:
  - *Drag and Drop* potongan puzzle ke posisi lain untuk menukar tempat.
  - Alternatif *Click to Swap* untuk kemudahan navigasi di layar sentuh / hp.
- **Peek / Preview**: Tombol *hold/toggle* untuk mengintip susunan gambar asli sebagai panduan.
- **Victory Condition**:
  - Sistem mengecek posisi indeks tiap tile setelah terjadi pergeseran.
  - Menampilkan modal selebrasi (*Pop-up Win*) ketika semua tile berada di posisi yang benar.

#### D. Image Slicing & Export (Backend)
- Memotong gambar secara presisi menggunakan **Pillow (PIL)** sesuai dengan matriks grid pilihan.
- Mengompres seluruh potongan gambar menjadi 1 file `.zip` langsung di RAM tanpa mengotori memori server.
- Nama file di dalam ZIP terurut secara sistematis (contoh: `puzzle_tile_1.jpg`, `puzzle_tile_2.jpg`, dst.).

---

### 4. Non-Functional Requirements
- **Performance**: Pemotongan gambar dan kompresi ZIP di backend harus selesai di bawah 2 detik untuk ukuran standar.
- **Usability**: Tampilan UI simpel, bersih, tanpa distraksi, dan mendukung *dark mode*.
- **Responsiveness**: Grid puzzle menyesuaikan ukuran layar perangkat pengguna (*aspect-ratio 1:1*).

---

### 5. Technical Architecture & Stack
- **Backend Framework**: Python 3.x, Flask, Pillow, Zipfile, IO.
- **Frontend**: HTML5, Modern CSS3 (Flexbox/Grid), Vanilla JavaScript (ES6+).
- **Structure**:
  ```text
  puzzle-feed-app/
  ├── PRD.md
  ├── CLAUDE.md
  ├── app.py
  ├── templates/
  │   └── index.html
  └── static/
      ├── css/
      │   └── style.css
      └── js/
          └── script.js