# PPKA Indonesia — National Rail Control Simulator (RailwayOp)

Simulator PPKA **edukasi & fiksi**. Bukan produk persinyalan, tidak tersertifikasi, tidak terhubung ke peralatan nyata, dan KA yang tampil **bukan** posisi KA KAI sebenarnya.

## Menjalankan
Ekstrak ZIP, buka `index.html` di Chrome/Firefox Android atau desktop. Tanpa server, tanpa API key, tanpa internet (skrip klasik, bukan ES module, agar jalan dari `file://`).

## Status data
- **Referensi nyata:** nama 16 stasiun lintas utara Jawa (Gambir–Surabaya Pasarturi) dan nama layanan (Argo Bromo Anggrek, Argo Muria, Argo Cheribon, Sembrani, Gumarang, Kertajaya, Tawang Jaya, Kaligung).
- **Simulasi/perkiraan:** kilometer, jumlah jalur/peron, nomor KA, headway, jadwal, perhentian, kecepatan, penempatan sinyal & wesel. Satu stasiun = 2 jalur utama (satu per arah) + Sepur 1 (jalur belok) dengan wesel masuk.

## Aturan simulasi (disederhanakan)
- **Blok absolut:** satu KA per petak/jalur emplasemen. Rute dikunci (reservasi) sebelum KA masuk; dilepas setelah ekor KA lewat.
- **Sinyal:** Merah = tidak ada rute ke petak berikut atau sinyal rusak; Kuning = petak berikut dipesan tapi petak sesudahnya belum; Hijau = keduanya dipesan. Tidak bisa dipaksa dari UI.
- **Wesel:** terkunci sejak rute dipesan sampai ekor KA lewat; ditolak jika terkunci, rusak, atau jalur dipesan.
- **Fisika KA:** akselerasi 0,5 m/s², rem 0,6 m/s² (barang 0,4), kurva pengereman √(2·b·0,85·d), batas kecepatan per jalur (lurus 80, belok 40 km/j), pembatasan kecepatan akibat gangguan.
- **Mode rute:** otomatis (KA lambat dialihkan ke Sepur 1 agar KA prioritas tinggi menyusul) atau manual per stasiun.
- **Lalu lintas:** dibangkitkan dari seed (PRNG deterministik), profil jam sibuk 06–09 & 16–19, pemanasan 3 jam sebelum jam sekarang.
- **Asisten PPKA:** hanya memberi saran; mesin interlocking tetap otoritatif.

## Struktur
`js/data.js` (jaringan & layanan) · `js/engine.js` (mesin simulasi, tanpa DOM) · `js/ui.js` (kanvas, panel, input) · `css/app.css`.

## Belum termasuk (versi ini)
Paket jaringan Jabodetabek, Sumatra, Sulawesi, dan Jawa selatan; editor jadwal; cabang/persilangan antar-jalur; Web Worker. Struktur `ST`/`SVC` dirancang agar paket baru bisa ditambahkan.
