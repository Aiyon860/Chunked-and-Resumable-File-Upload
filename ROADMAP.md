# Roadmap Belajar: Chunked & Resumable File Upload

> **Stack:** Vanilla JS (Browser) · Node.js · Express · Multer · File System  
> **Tujuan:** Memahami cara upload file besar dalam potongan (chunks) yang bisa dilanjutkan jika koneksi terputus.

---

## Cara Pakai Roadmap Ini

- Kerjakan fase secara **berurutan**
- Tandai langkah selesai dengan mengganti `[ ]` → `[x]`
- Setiap fase punya **prompt siap pakai** untuk minta koreksi ke AI agent

---

## Fase 1 — Setup Project & Struktur Folder
> Frontend · Estimasi: ~1 jam

- [x] Buat struktur folder:
  ```
  project/
  ├── client/
  │   ├── index.html
  │   └── app.js
  └── server/
      ├── index.js
      ├── package.json
      └── uploads/
          ├── temp/
          └── final/
  ```
- [x] Masuk ke folder `server/`, jalankan `npm init -y`
- [x] Install dependency: `npm install express cors multer`
- [x] Buat `server/index.js` dengan Express minimal (listen di port 3000)
- [x] Pastikan `node index.js` berjalan tanpa error
- [x] Untuk menampilkan `client/index.html` di browser, gunakan salah satu cara berikut karena Zed belum punya built-in live server:
  - **Opsi A (recommended):** Install `serve` secara global → `npm install -g serve`, lalu jalankan `serve client/` dari terminal. Buka `http://localhost:3000` (atau port yang muncul di terminal).
  - **Opsi B:** Install `browser-sync` → `npm install -g browser-sync`, lalu jalankan `browser-sync start --server client/ --files "client/**/*"`. Auto-reload saat file berubah.
  - **Opsi C (paling simpel):** Drag & drop `index.html` ke browser, tapi **tidak bisa** hit backend karena CORS block `file://` protocol — pakai Opsi A atau B saja.

**Prompt koreksi AI:**
```
Saya sudah selesai fase 1 setup project. Tolong koreksi struktur folder 
dan file index.js Express saya berikut ini:

[paste kode kamu di sini]

Cek: apakah struktur sudah benar, Express sudah bisa jalan, dan CORS 
sudah dikonfigurasi agar frontend bisa hit backend di port berbeda.
```

**Hasil Pengerjaan Fase 1:**
✅ Struktur folder selesai: `client/`, `server/`, `server/uploads/temp`, `server/uploads/final`
✅ `server/package.json` dibuat dengan `"type": "module"` untuk ESM
✅ Dependency terinstall: `express`, `cors`, `multer`
✅ Express server berjalan di port 3000
✅ CORS diaktifkan secara wildcard untuk frontend di port yang berbeda
✅ Frontend disajikan menggunakan `serve client/` (Opsi A)

---

## Fase 2 — UI Upload di Browser
> Frontend · Estimasi: ~1 jam

- [x] Buat form HTML dengan elemen:
  - `<input type="file" id="fileInput">`
  - `<button id="uploadBtn">Upload</button>`
  - `<progress id="progressBar" value="0" max="100"></progress>`
  - `<p id="statusText"></p>` untuk feedback ke user
- [x] Tangkap event `change` pada input file
- [x] Ambil objek `File` dari `event.target.files[0]`
- [x] Tampilkan info file sebelum upload: nama, ukuran (MB), tipe
- [x] Disable tombol upload saat proses sedang berjalan
- [x] Enable kembali tombol setelah selesai atau error

**Prompt koreksi AI:**
```
Saya sudah selesai fase 2 UI upload. Tolong koreksi kode HTML dan JS berikut:

[paste kode kamu di sini]

Cek: apakah event handler file input sudah benar, info file sudah 
ditampilkan sebelum upload, dan tombol sudah di-disable saat upload berjalan.
```

**Hasil Pengerjaan Fase 2:**
✅ HTML: form dengan input file, button, progress bar, dan status text
✅ JS: event listener 'change' untuk menampilkan info file (nama, size MB, type)
✅ Tombol di-disable saat upload mulai, di-enable setelah selesai
⚠️ dragenter event belum berjalan optimal (perlu drop event untuk drag-drop)
⚠️ Simulasi upload belum terintegrasi dengan fetch (untuk fase lanjut)
```

---

## Fase 3 — Logika Chunking di Frontend ⭐
> Frontend · Estimasi: ~2 jam · **Inti materi**

- [x] Definisikan konstanta ukuran chunk:
  ```js
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB
  ```
- [x] Hitung total chunks:
  ```js
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  ```
- [x] Buat upload ID unik per sesi:
  ```js
  const uploadId = crypto.randomUUID();
  ```
- [x] Loop per chunk, potong file dengan `file.slice(start, end)`:
  ```js
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    // kirim chunk ke server
  }
  ```
- [x] Kirim tiap chunk via `fetch` menggunakan FormData berisi:
  - `chunk` (blob)
  - `uploadId`
  - `chunkIndex` (index saat ini)
  - `totalChunks`
  - `filename` (nama file asli)
- [x] Update progress bar setiap chunk berhasil:
  ```js
  progressBar.value = ((i + 1) / totalChunks) * 100;
  ```

**Prompt koreksi AI:**
```
Saya sudah selesai fase 3 logika chunking. Tolong koreksi kode JS berikut:

[paste kode kamu di sini]

Cek:
- Apakah kalkulasi start/end slice sudah benar untuk tiap chunk
- Apakah chunk terakhir ditangani dengan benar (tidak over-slice)
- Apakah uploadId dikirim konsisten di setiap request
- Apakah progress bar diupdate di tempat yang benar (setelah await fetch)
```

**Hasil Pengerjaan Fase 3:**
✅ Konstanta CHUNK_SIZE = 1 MB
✅ totalChunks dihitung dengan Math.ceil
✅ uploadId dibuat dengan crypto.randomUUID()
✅ Loop chunk dengan file.slice(start, end) - tidak over-slice
✅ FormData dibuat dengan .append() untuk semua field
✅ Progress bar diupdate setelah await fetch
✅ Error handling: tombol di-enable jika upload gagal

---

## Fase 4 — Backend: Terima & Simpan Chunks
> Backend · Estimasi: ~2 jam

- [x] Setup Multer dengan `memoryStorage()` untuk menerima chunk sebagai buffer
- [x] Buat endpoint `POST /upload/chunk`
- [x] Endpoint menerima field dari FormData: `chunk`, `uploadId`, `chunkIndex`, `totalChunks`, `filename`
- [x] Buat folder temp per uploadId jika belum ada:
  ```
  uploads/temp/{uploadId}/
  ```
- [x] Simpan chunk sebagai file `.part`:
  ```
  uploads/temp/{uploadId}/{chunkIndex}.part
  ```
- [x] Return JSON response per chunk:
  ```json
  { "received": 0, "status": "ok" }
  ```

**Prompt koreksi AI:**
```
Saya sudah selesai fase 4 backend penerima chunk. Tolong koreksi kode Express berikut:

[paste kode kamu di sini]

Cek:
- Apakah Multer sudah dikonfigurasi dengan benar untuk menerima multipart
- Apakah path penyimpanan chunk sudah benar (per uploadId)
- Apakah folder temp dibuat otomatis jika belum ada
- Apakah response JSON sudah dikirim setelah chunk tersimpan
```

**Hasil Pengerjaan Fase 4:**
✅ Multer dengan memoryStorage() untuk simpan chunk di memori
✅ Endpoint POST /upload/chunk dengan upload.single("chunk")
✅ Validasi: cek req.file, uploadId, dan chunkIndex sebelum proses
✅ Folder temp dibuat otomatis dengan fs.mkdir({ recursive: true })
✅ Chunk disimpan ke uploads/temp/{uploadId}/{chunkIndex}.part
✅ Response JSON { status: "ok", received: ... } dikirim per chunk

---

## Fase 5 — Backend: Gabungkan Chunks Jadi File
> Backend · Estimasi: ~1.5 jam

- [x] Setelah menerima chunk terakhir (`chunkIndex === totalChunks - 1`), jalankan proses assembly
- [x] Baca semua file `.part` secara **berurutan** dari index 0 sampai terakhir
- [x] Gabungkan ke file final menggunakan `fs.appendFileSync`:
  ```
  uploads/final/{uploadId}-{filename}
  ```
- [x] Hapus folder temp setelah file final berhasil dibuat:
  ```js
  fs.rmSync(`uploads/temp/${uploadId}`, { recursive: true });
  ```
- [x] Return response sukses ke frontend:
  ```json
  { "status": "complete", "filename": "uploadId-namafile.jpg" }
  ```

**Prompt koreksi AI:**
```
Saya sudah selesai fase 5 assembly chunks. Tolong koreksi kode berikut:

[paste kode kamu di sini]

Cek:
- Apakah chunks digabung secara urut berdasarkan index (bukan urutan OS)
- Apakah file final tersimpan di path yang benar
- Apakah folder temp dihapus setelah assembly berhasil
- Apakah ada penanganan jika salah satu file .part tidak ditemukan
```

**Hasil Pengerjaan Fase 5:**
✅ Assembly dijalankan saat semua chunk sudah diterima (cek length === totalChunks)
✅ Loop urut dari index 0 untuk gabung chunks dengan pipeline
✅ File final disimpan ke uploads/final/{uploadId}-{fileName}
✅ Folder temp dihapus setelah assembly berhasil dengan fsPromises.rm(recursive: true)
✅ Response JSON dengan status "completed" atau "uploading"

---

## Fase 6 — Fitur Resume Upload ⭐⭐
> Integrasi · Estimasi: ~2 jam · **Fitur utama resumable**

- [x] Buat endpoint baru `GET /upload/status/:uploadId` di backend:
  - Baca isi folder `uploads/temp/{uploadId}/`
  - Return daftar index chunk yang sudah ada sebagai array
  - Contoh response: `{ "received": [0, 1, 2] }`
- [x] Simpan `uploadId` ke `localStorage` setelah dibuat di frontend:
  ```js
  localStorage.setItem('uploadId_' + file.name, uploadId);
  ```
- [x] Sebelum mulai upload, cek apakah ada `uploadId` tersimpan untuk file ini
- [x] Jika ada, hit endpoint status untuk tahu chunk mana yang sudah diterima
- [x] Skip chunk yang sudah ada, mulai loop dari index yang belum dikirim
- [x] **Simulasi test resume:**
  1. Upload file besar, berhenti di tengah (tutup tab / matikan server)
  2. Buka kembali, pilih file yang sama
  3. Upload harus lanjut dari chunk terakhir yang belum dikirim

**Prompt koreksi AI:**
```
Saya sudah selesai fase 6 resume upload. Tolong koreksi kode berikut:

[paste kode frontend dan backend untuk fitur resume]

Cek:
- Apakah endpoint GET /upload/status/:uploadId mengembalikan index yang benar
- Apakah frontend membaca status dulu sebelum mulai loop chunk
- Apakah chunk yang sudah ada benar-benar di-skip (tidak dikirim ulang)
- Apakah uploadId tersimpan di localStorage dan diambil kembali dengan benar
```

**Hasil Pengerjaan Fase 6:**
✅ Backend: Endpoint GET /upload/status/:uploadId dengan .toSorted() untuk return array index
✅ Frontend: getFileMetadata() fetch status sebelum upload, simpan lastChunkIndex
✅ Loop start dari lastChunkIndex ?? 0 untuk skip chunk yang sudah ada
✅ localStorage simpan/uploadId dengan key uploadId_{fileName}
✅ Validasi MAX_FILE_SIZE dan ekstensi file di frontend

---

## Fase 7 — Error Handling & UX Feedback
> Integrasi · Estimasi: ~1 jam

- [x] Tambahkan retry logic per chunk (maksimal 3x percobaan):
  ```js
  async function uploadChunkWithRetry(chunkData, maxRetry = 3) {
    for (let attempt = 0; attempt < maxRetry; attempt++) {
      try {
        const res = await fetch('/upload/chunk', { ... });
        if (res.ok) return await res.json();
      } catch (err) {
        if (attempt === maxRetry - 1) throw err;
      }
    }
  }
  ```
- [x] Tampilkan status per chunk di UI: `"Mengirim chunk 3 dari 10..."`
- [x] Validasi di backend: return `400` jika `uploadId` atau `chunkIndex` tidak ada
- [x] Tampilkan pesan error yang jelas jika upload gagal total
- [x] Tampilkan pesan sukses + nama file setelah upload selesai

**Prompt koreksi AI:**
```
Saya sudah selesai fase 7 error handling. Tolong koreksi kode berikut:

[paste kode kamu di sini]

Cek:
- Apakah retry logic sudah benar (tidak infinite loop, ada batas maksimal)
- Apakah status text di UI update dengan benar per chunk
- Apakah backend memvalidasi input dan return status code yang tepat
- Apakah error dari backend ditampilkan ke user di frontend
```

**Hasil Pengerjaan Fase 7:**
✅ Retry logic max 3x dengan for loop dan break jika success
✅ chunkProgress menampilkan "Sending chunk X of Y"
✅ Backend validasi req.file, uploadId, chunkIndex return 400
✅ Backend return 500 jika gagal simpan/merge chunk
✅ Error handling di frontend: statusText "Upload failed", enable button
✅ Sukses: statusText "Upload complete! - File uploaded successfully: {filename}"

---

## Fase 8 — Bonus: Validasi & Optimasi (Opsional)
> Eksplorasi · Tidak ada estimasi

- [x] Validasi tipe file di frontend sebelum upload dimulai
- [x] Validasi ukuran maksimum file (misal: tolak > 500 MB)
- [x] Tambahkan estimasi waktu tersisa berdasarkan kecepatan rata-rata upload
- [x] Tambahkan endpoint `DELETE /upload/:uploadId` untuk cancel & cleanup upload

**Prompt koreksi AI:**
```
Saya menambahkan fitur bonus berikut ke aplikasi chunked upload saya:

[jelaskan fitur yang ditambahkan + paste kode]

Tolong koreksi implementasinya dan berikan saran optimasi jika ada.
```

**Hasil Pengerjaan Fase 8 (Bonus):**
✅ Validasi allowedMimeTypes (PNG, JPEG, PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT)
✅ Validasi MAX_FILE_SIZE (100 MB) dan ekstensi file
✅ Speed upload calculation: speed = uploadedBytes / elapsedTime
✅ Remaining time estimation: ((totalChunks - chunkIndex) * CHUNK_SIZE) / speed
✅ AbortController untuk cancel fetch request
✅ Cancel button yang memanggil DELETE endpoint + controller.abort()
✅ DELETE /upload/:uploadId endpoint untuk hapus folder temp

---

## Ringkasan Konsep Kunci

| Konsep | Di mana | Penjelasan singkat |
|---|---|---|
| `file.slice(start, end)` | Frontend | Memotong File object menjadi Blob |
| `crypto.randomUUID()` | Frontend | Membuat ID unik per sesi upload |
| `FormData` | Frontend | Membungkus chunk + metadata untuk dikirim |
| `localStorage` | Frontend | Menyimpan uploadId agar resume bisa jalan setelah refresh |
| `memoryStorage()` (Multer) | Backend | Menyimpan chunk sebagai buffer di memori sebelum ditulis ke disk |
| `.part` files | Backend | File chunk sementara sebelum digabung |
| `fs.appendFileSync` | Backend | Menggabungkan buffer chunk ke file final secara berurutan |
| `GET /upload/status` | Backend | Endpoint untuk cek chunk mana yang sudah diterima |
