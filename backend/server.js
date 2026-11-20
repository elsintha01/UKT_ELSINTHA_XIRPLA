const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ pesan: "Backend Peminjaman Alat Praktik Berhasil Berjalan!" });
});

// 1. GET Semua Kategori Alat
app.get("/api/kategori", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM kategori_alat ORDER BY id_kategori ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal memuat kategori alat" });
  }
});

// 2. GET Semua Alat + Nama Kategori (LEFT JOIN)
app.get("/api/alat", async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id_alat,
        a.id_kategori,
        a.nama_alat,
        a.kondisi,
        a.stok,
        a.lokasi,
        k.nama_kategori
      FROM alat a
      LEFT JOIN kategori_alat k ON a.id_kategori = k.id_kategori
      ORDER BY a.id_alat ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal memuat data alat" });
  }
});

// 3. GET Semua Data Peminjaman + Nama Alat
app.get("/api/peminjaman", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_peminjaman,
        p.id_alat,
        p.nama_peminjam,
        p.kelas,
        p.tanggal_pinjam,
        p.tanggal_kembali,
        p.jumlah,
        p.status,
        a.nama_alat
      FROM peminjaman p
      LEFT JOIN alat a ON p.id_alat = a.id_alat
      ORDER BY p.id_peminjaman DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal memuat data peminjaman" });
  }
});

// 4. POST Pinjam Alat (Menyertakan kolom 'jumlah' & default status 'Dipinjam' agar Trigger memotong stok)
app.post("/api/peminjaman", async (req, res) => {
  try {
    const { id_alat, nama_peminjam, kelas, jumlah , tanggal_pinjam ,tanggal_kembali } = req.body;
    const query = `
      INSERT INTO peminjaman (id_alat, nama_peminjam, kelas, jumlah, tanggal_pinjam, tanggal_kembali ,status)
      VALUES ($1, $2, $3, $4, $5 , $6 , 'Dipinjam')
      RETURNING *
    `;
    const result = await pool.query(query, [id_alat, nama_peminjam, kelas, jumlah , tanggal_pinjam, tanggal_kembali]);
    res.status(201).json(result.rows);
  } catch (err) {
    console.error(err.message);
    // Menangkap RAISE EXCEPTION 'Stok alat tidak mencukupi untuk peminjaman ini!'
    res.status(400).json({ error: err.message });
  }
});

// 5. PUT Kembalikan Alat (Ubah status menjadi 'Dikembalikan' agar Trigger menambah stok kembali)
app.put("/api/peminjaman/:id/kembali", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE peminjaman
      SET status = 'Dikembalikan'  
      WHERE id_peminjaman = $1
      AND status = 'Dipinjam' 
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.lenght === 0) {
      return res.status(404).json({
        error:"Data peminjaman tidak ditemukan atau sudah di kembalikan."
      });

    }
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE Hapus Riwayat yang Sudah Dikembalikan
app.delete("/api/peminjaman/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM peminjaman
      WHERE id_peminjaman = $1
      AND status = 'Dikembalikan'
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Data hanya bisa dihapus jika sudah dikembalikan."
      });
    }

    res.json({
      pesan: "Riwayat peminjaman berhasil dihapus!"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});