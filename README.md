# input-guard

Plugin OpenCode yang menjaga konteks per giliran tetap datar. Tanpa ini, riwayat sesi tumbuh linear dan setiap giliran membawa seluruh percakapan sebelumnya.

## Masalah

Pada sesi panjang, input mentah terus naik:

```
before=127.521  after=17.996
before=127.823  after=17.208
```

Setelah perbaikan budget, hasil probe menjadi:

```
before=128.732  after=14.006  dropped=151
before=128.949  after=14.222  dropped=151
before=129.453  after=14.483  dropped=153
before=127.907  after=14.260  dropped=151
```

Sebelum naik terus, sesudah stabil di bawah 15.000 token.

## Cara kerja

1. Hook `execute.before` membatasi `read` maksimal 150 baris per panggilan.
2. Hook `session.context` memperkirakan token (`panjang JSON / 4`).
3. Jika melebihi 15.000, pesan lama dibuang dari belakang sampai muat. Pesan pertama, system prompt, dan catatan yang disuntikkan ikut dihitung ke budget, dengan reserve 400 token.
4. Catatan dipush ke `system`: jumlah pesan yang dipangkas dan instruksi membaca `STATE.md`.
5. Setiap keputusan dicatat ke `%TEMP%/input-guard.log` (atau `$TMPDIR`).

## Pemasangan

Salin folder ini ke direktori plugin OpenCode:

```
~/.config/opencode/plugins/input-guard/index.ts
```

Daftarkan direktori plugin di `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["C:/Users/<nama>/.config/opencode/plugins/input-guard"]
}
```

Gunakan path absolut ke direktori, bukan ke file. Restart OpenCode setelah mengubah konfigurasi.

## Verifikasi

Build tanpa error:

```bash
bun build index.ts --target=bun --external "@opencode/plugin" --outfile=/tmp/ig.js
```

`@opencode/plugin` harus di-external karena modul itu disediakan runtime OpenCode, bukan `node_modules` lokal.

Cek log setelah beberapa giliran:

```bash
tail -n 10 "$TMPDIR/input-guard.log"
```

## Batasan

- Perkiraan token kasar (4 karakter per token). Bisa meleset untuk teks non-Latin atau kode padat.
- Pemangkasan membuang pesan utuh, bukan merangkumnya. Detail lama hilang; karena itu `STATE.md` dianjurkan sebagai handoff.
- Hook `ctx.tool.hook("execute.before")` dan `ctx.session.hook("context")` adalah API internal/eksperimental. Namanya bisa berubah antar versi OpenCode.
- Tidak ada deduplikasi output tool yang identik.

## Lisensi

MIT
