const pool = require("./db");

async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Mengosongkan data lama
    await pool.query(`
      TRUNCATE TABLE peminjaman, alat, kategori_alat
      RESTART IDENTITY CASCADE;
    `);

    // Membuat ENUM jika belum tersedia
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE status_kembali AS ENUM (
          'Dipinjam',
          'Dikembalikan',
          'Terlambat'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Memasukkan kategori alat
    await pool.query(`
      INSERT INTO kategori_alat (nama_kategori, deskripsi)
      VALUES
      ('Komputer & Jaringan', 'Peralatan lab komputer, server, dan jaringan'),  
      ('Multimedia', 'Peralatan fotografi, videografi, dan presentasi'),
      ('Elektronika', 'Komponen dan alat ukur kelistrikan');
    `);

    // Memasukkan data alat
    await pool.query(`
      INSERT INTO alat
      (id_kategori, nama_alat, kondisi, stok, lokasi)
      VALUES
      (1, 'Kabel UTP Cat6 (Roll)', 'Baik', 10, 'Lemari Jaringan A'),
      (1, 'Crimping Tool', 'Baik', 25, 'Lemari Jaringan B'),
      (2, 'Kamera DSLR Canon', 'Baik', 5, 'Loker Multimedia 1'),
      (2, 'Proyektor Epson', 'Baik', 8, 'Loker Multimedia 2'),
      (3, 'Multimeter Digital', 'Baik', 20, 'Rak Elektro C');
        `);

    // Membuat fungsi update stok
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_stok_alat()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'INSERT') THEN
          IF (NEW.status = 'Dipinjam') THEN
            IF (
              SELECT stok FROM alat
              WHERE id_alat = NEW.id_alat
            ) < NEW.jumlah THEN
              RAISE EXCEPTION
              'Stok alat tidak mencukupi untuk peminjaman ini!';
            END IF;

            UPDATE alat
            SET stok = stok - NEW.jumlah
            WHERE id_alat = NEW.id_alat;
          END IF;

          RETURN NEW;
        END IF;

        IF (TG_OP = 'UPDATE') THEN
          IF (
            OLD.status = 'Dipinjam'
            AND NEW.status = 'Dikembalikan'
          ) THEN
            UPDATE alat
            SET stok = stok + NEW.jumlah
            WHERE id_alat = NEW.id_alat;
          END IF;

          RETURN NEW;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Menghapus trigger lama
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_update_stok
      ON peminjaman;
    `);

    // Membuat trigger baru
    await pool.query(`
      CREATE TRIGGER trg_update_stok
      AFTER INSERT OR UPDATE ON peminjaman
      FOR EACH ROW
      EXECUTE FUNCTION update_stok_alat();
    `);

    console.log("Seeding berhasil!");
    console.log("Data alat berhasil diperbarui.");

  } catch (err) {
    console.error("Error saat seeding:", err);
  } finally {
    await pool.end();
  }
}

seedDatabase();