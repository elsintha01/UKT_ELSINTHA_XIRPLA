const API_URL = "http://localhost:5000/api";

function formatTanggal(tanggal) {
  if (!tanggal) return "-";

  const bagianTanggal = String(tanggal).split("T")[0];
  const [tahun, bulan, hari] = bagianTanggal.split("-");

  return `${hari}/${bulan}/${tahun}`;
}

async function loadAlat() {
  const res = await fetch(`${API_URL}/alat`);
  const data = await res.json();

  const tabelAlat = document.getElementById("tabelAlat");
  const selectAlat = document.getElementById("id_alat");
  tabelAlat.innerHTML = "";
  selectAlat.innerHTML = '<option value="">-- Pilih Alat --</option>';

  data.forEach((item) => {
    tabelAlat.innerHTML += `
      <tr>
        <td class="p-2.5 font-medium">${item.nama_alat}</td>
        <td class="p-2.5">${item.nama_kategori || "-"}</td>
        <td class="p-2.5">${item.kondisi}</td>
        <td class="p-2.5 text-center font-bold">${item.stok}</td>
        <td class="p-2.5">${item.lokasi}</td>
      </tr>
    `;

    selectAlat.innerHTML += `
      <option value="${item.id_alat}">${item.nama_alat} (Stok: ${item.stok})</option>
    `;
  });
}

async function loadPeminjaman() {
  const res = await fetch(`${API_URL}/peminjaman`);
  const data = await res.json();

  const tabelPeminjaman = document.getElementById("tabelPeminjaman");
  tabelPeminjaman.innerHTML = "";

  data.forEach((item) => {
   const tglPinjam = formatTanggal(item.tanggal_pinjam);
const tglKembali = formatTanggal(item.tanggal_kembali);

let statusAksi = "";

if (String(item.status).trim().toLowerCase() === "dikembalikan") {
  statusAksi = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <button
        type="button"
        disabled
        style="background-color: #16a34a; color: white; padding: 6px 12px; border-radius: 5px; border: none; font-size: 12px; cursor: default;">
        Dikembalikan
      </button>
    </div>
  `;

} else {
  const sekarang = new Date();
  const tahun = sekarang.getFullYear();
  const bulan = String(sekarang.getMonth() + 1).padStart(2, "0");
  const hari = String(sekarang.getDate()).padStart(2, "0");
  const hariIni = `${tahun}-${bulan}-${hari}`;
  const terlambat = hariIni > String(item.tanggal_kembali).split("T")[0];


   statusAksi = `
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
    ${terlambat ? '<span style="color: #dc2626; font-weight: 600; font-size: 12px;">Terlambat</span>' : ""}

    <button
      type="button"
      onclick="kembalikanAlat(${item.id_peminjaman})"
      style="background-color: #16a34a; color: white; padding: 6px 12px; border-radius: 5px; border: none; cursor: pointer; font-size: 12px;">
      Kembalikan
    </button>

    </div>
  `;
}

    tabelPeminjaman.innerHTML += `
      <tr>
        <td class="p-2.5">${item.nama_peminjam}</td>
        <td class="p-2.5">${item.kelas}</td>
        <td class="p-2.5">${item.nama_alat}</td>
        <td class="p-2.5 text-center">${item.jumlah}</td>
        <td class="p-2.5">${tglPinjam}</td>
        <td class="p-2.5">${tglKembali}</td>
        <td class="p-2.5 text-center">${statusAksi}</td>
      </tr>
    `;
  });
}

document.getElementById("formPinjam").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    id_alat: parseInt(document.getElementById("id_alat").value),
    nama_peminjam: document.getElementById("nama_peminjam").value,
    kelas: document.getElementById("kelas").value,
    jumlah: parseInt(document.getElementById("jumlah").value),
    tanggal_pinjam: document.getElementById("tanggal_pinjam").value,
    tanggal_kembali: document.getElementById("tanggal_kembali").value,
  };

  if (payload.tanggal_kembali < payload.tanggal_pinjam) {
  alert("Tanggal kembali tidak boleh sebelum tanggal pinjam!");
  return;
}

  const res = await fetch(`${API_URL}/peminjaman`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    alert("Gagal meminjam: " + result.error);
    return;
  }

  alert("Peminjaman berhasil dicatat!");
  e.target.reset();
  loadAlat();
  loadPeminjaman();
});

async function kembalikanAlat(id) {
  const res = await fetch(`${API_URL}/peminjaman/${id}/kembali`, {
    method: "PUT",
  });

  if (res.ok) {
    alert("Alat berhasil dikembalikan dan stok bertambah!");
    loadAlat();
    loadPeminjaman();
  }
}


loadAlat();
loadPeminjaman();