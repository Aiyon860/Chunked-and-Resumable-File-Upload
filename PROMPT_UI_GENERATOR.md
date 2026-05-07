# System Prompt: UI Generator untuk Chunked File Upload

> Paste prompt ini ke AI agent (ChatGPT, Claude, Gemini, dsb) untuk generate UI siap pakai.  
> Kamu tinggal fokus ke logika JavaScript & backend — UI sudah beres.

---

## Prompt Lengkap (Copy semua teks di bawah garis ini)

---

Kamu adalah UI engineer senior yang bertugas membuatkan tampilan frontend 
untuk aplikasi chunked file upload yang sedang saya pelajari.

Tugasmu adalah membuat UI yang sudah jadi dan siap pakai, sehingga saya 
bisa langsung fokus belajar logika JavaScript dan backend-nya.

---

SPESIFIKASI UI YANG HARUS DIBUAT:

Buat satu file `client/index.html` yang berisi HTML + CSS inline (tidak perlu 
file CSS terpisah). Semua styling harus ada di dalam tag <style> di dalam file 
index.html itu sendiri.

ELEMEN YANG WAJIB ADA (dengan id yang PERSIS seperti di bawah — jangan diganti):

1. Input file:
   - id="fileInput"
   - Hanya terima semua tipe file (no restriction)

2. Tombol upload:
   - id="uploadBtn"
   - Teks: "Mulai Upload"
   - Harus bisa di-disable via JS: uploadBtn.disabled = true

3. Tombol cancel/reset:
   - id="cancelBtn"  
   - Teks: "Batalkan"
   - Default: tersembunyi (display: none), muncul saat upload berjalan

4. Progress bar:
   - id="progressBar"
   - Gunakan tag HTML native: <progress id="progressBar" value="0" max="100">
   - Tampilkan persentase di sebelahnya: <span id="progressPercent">0%</span>

5. Status text utama:
   - id="statusText"
   - Default kosong, diisi via JS
   - Contoh isi: "Mengirim chunk 3 dari 10..."

6. Info file sebelum upload:
   - id="fileInfo"
   - Default tersembunyi, muncul setelah file dipilih
   - Tampilkan: nama file, ukuran (dalam MB), tipe file

7. Area result setelah upload selesai:
   - id="resultArea"
   - Default tersembunyi
   - Tampilkan: pesan sukses + nama file yang berhasil diupload

8. Area error:
   - id="errorArea"
   - Default tersembunyi
   - Tampilkan pesan error jika upload gagal

9. Chunk progress detail:
   - id="chunkDetail"
   - Default tersembunyi, muncul saat upload berjalan
   - Tampilkan: "Chunk X / Y dikirim" yang diupdate real-time

10. Resume indicator:
    - id="resumeIndicator"
    - Default tersembunyi
    - Muncul dengan teks "Melanjutkan upload sebelumnya..." jika terdeteksi 
      ada sesi upload yang belum selesai

---

ATURAN PENTING UNTUK FILE HTML INI:

1. JANGAN buat file app.js atau script terpisah — hanya buat index.html
2. Di bagian bawah index.html, tambahkan tag:
   <script src="app.js"></script>
   (kosong, karena saya yang akan isi logikanya)
3. JANGAN tambahkan JavaScript apapun di dalam index.html — zero JS
4. Semua id di atas HARUS ada persis seperti yang disebutkan
5. Styling bebas, tapi harus:
   - Clean dan modern (tidak perlu framework CSS eksternal)
   - Responsive untuk desktop
   - Warna netral (putih/abu/aksen biru atau hijau)
   - Progress bar harus terlihat jelas
   - Status area mudah dibaca

---

STRUKTUR HTML YANG DIHARAPKAN (kamu boleh kembangkan tampilannya):

```
[Header] Chunked File Upload Demo

[Card Upload]
  [Drop zone / file input area]
  [File info area - hidden by default]
  [Resume indicator - hidden by default]
  
  [Tombol: Mulai Upload] [Tombol: Batalkan - hidden]

[Card Progress - hidden by default saat belum upload]
  [Progress bar + persentase]
  [Status text]
  [Chunk detail]

[Card Result - hidden by default]
  [Pesan sukses / error]
```

---

OUTPUT YANG DIHARAPKAN:

Berikan SATU file index.html yang lengkap dan langsung bisa dipakai.  
Tidak perlu penjelasan panjang — langsung kode saja.  
Pastikan semua id element sudah sesuai spesifikasi di atas.

---

## Cara Pakai File HTML yang Dihasilkan

1. Simpan output AI sebagai `client/index.html`
2. Buka di browser via terminal — karena menggunakan Zed (bukan VS Code), jalankan salah satu:
   - `npx serve client/` — tidak perlu install, langsung jalan
   - atau jika sudah install global: `serve client/`
   - Buka URL yang muncul di terminal (biasanya `http://localhost:3000`)
3. Semua element sudah siap — tinggal isi `client/app.js` dengan logika upload
4. Untuk mengontrol elemen dari app.js, gunakan:

```js
// Referensi element (copy-paste ini di awal app.js kamu)
const fileInput       = document.getElementById('fileInput');
const uploadBtn       = document.getElementById('uploadBtn');
const cancelBtn       = document.getElementById('cancelBtn');
const progressBar     = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const statusText      = document.getElementById('statusText');
const fileInfo        = document.getElementById('fileInfo');
const resultArea      = document.getElementById('resultArea');
const errorArea       = document.getElementById('errorArea');
const chunkDetail     = document.getElementById('chunkDetail');
const resumeIndicator = document.getElementById('resumeIndicator');
```

5. Contoh cara update elemen dari app.js:

```js
// Update progress
progressBar.value = 45;
progressPercent.textContent = '45%';

// Tampilkan status
statusText.textContent = 'Mengirim chunk 3 dari 10...';

// Tampilkan chunk detail
chunkDetail.style.display = 'block';
chunkDetail.textContent = 'Chunk 3 / 10 dikirim';

// Disable tombol upload
uploadBtn.disabled = true;
cancelBtn.style.display = 'inline-block';

// Tampilkan info file
fileInfo.style.display = 'block';
fileInfo.innerHTML = `
  <strong>${file.name}</strong> · 
  ${(file.size / 1024 / 1024).toFixed(2)} MB · 
  ${file.type}
`;

// Tampilkan result sukses
resultArea.style.display = 'block';
resultArea.textContent = 'Upload berhasil: namafile.jpg';

// Tampilkan error
errorArea.style.display = 'block';
errorArea.textContent = 'Upload gagal: koneksi terputus';

// Tampilkan resume indicator
resumeIndicator.style.display = 'block';
resumeIndicator.textContent = 'Melanjutkan upload sebelumnya...';
```
