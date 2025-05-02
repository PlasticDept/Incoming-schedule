document.addEventListener("DOMContentLoaded", function () {
  const table = $("#containerTable").DataTable();
  const baseId = "appxekctFAWmMVFzc";
  const tableName = "data-cont";
  const token = "Bearer patiH2AOAO9YAtJhA.61cafc7228a34200466c4235f324b0a9368cf550d04e83656db17d3374ec35d4";

  function renderRow(row, index) {
    if (!row || !row["FEET"] || !row["PACKAGE"]) return "";

    const feet = row["FEET"].trim().toUpperCase();
    const packageVal = row["PACKAGE"].trim().toUpperCase();

    let np20 = "", np40 = "", p20 = "", p40 = "";
    const isBag = packageVal.includes("BAG");

    if (feet === '1X20' && isBag) np20 = '✔';
    else if (feet === '1X40' && isBag) np40 = '✔';
    else if (feet === '1X20' && !isBag) p20 = '✔';
    else if (feet === '1X40' && !isBag) p40 = '✔';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${row["NO CONTAINER"] || ""}</td>
        <td>${feet}</td>
        <td>${np20}</td>
        <td>${np40}</td>
        <td>${p20}</td>
        <td>${p40}</td>
        <td>${row["INVOICENO"] || ""}</td>
        <td>${row["PACKAGE"] || ""}</td>
        <td>${row["INCOMING PLAN"] || ""}</td>
        <td>${row["STATUS PROGRESS"] || ""}</td>
        <td>${row["TIME IN"] || ""}</td>
        <td>${row["UNLOADING TIME"] || ""}</td>
        <td>${row["FINISH"] || ""}</td>
      </tr>
    `;
  }

  function loadAirtableData() {
    console.log("📥 Memuat data dari Airtable...");
    fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`, {
      headers: { Authorization: token }
    })
      .then(res => res.json())
      .then(data => {
        table.clear();
        const rows = data.records.map(r => r.fields);
        console.log(`📄 ${rows.length} record diterima dari Airtable`);

        rows
          .filter(row => row["FEET"] && row["PACKAGE"])
          .forEach((row, i) => {
            const html = renderRow(row, i);
            if (html) table.row.add($(html));
          });

        table.draw();
      })
      .catch(err => console.error("❌ Gagal ambil data dari Airtable:", err));
  }

  async function deleteAllAirtableRecords() {
    console.log("🛠 Memulai proses hapus semua record di Airtable...");
    const headers = {
      Authorization: token,
      "Content-Type": "application/json"
    };

    const allRecords = [];
    let offset = "";

    try {
      do {
        const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ""}`, {
          headers: { Authorization: token }
        });
        const json = await res.json();

        if (json.records) {
          allRecords.push(...json.records.map(r => r.id));
          offset = json.offset;
        } else {
          offset = null;
        }
      } while (offset);

      console.log(`🔎 Total record ditemukan: ${allRecords.length}`);

      for (let i = 0; i < allRecords.length; i += 10) {
  const batch = allRecords.slice(i, i + 10);
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ records: batch }) // ← yang ini penting
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Gagal hapus batch:", res.status, errorText);
  } else {
    const result = await res.json();
    console.log(`✅ Dihapus ${result.records?.length || 0} record`);
  }
}


      console.log("✅ Semua record lama berhasil dihapus.");
    } catch (err) {
      console.error("❌ Error saat menghapus semua record:", err);
    }
  }

  function uploadToAirtable(records) {
    console.log(`📤 Mengupload ${records.length} record ke Airtable...`);
    const chunks = [];
    for (let i = 0; i < records.length; i += 10) {
      chunks.push(records.slice(i, i + 10));
    }

    const uploads = chunks.map(chunk => {
      const payload = {
        records: chunk.map(fields => ({ fields }))
      };

      return fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    });

    return Promise.all(uploads);
  }

  async function parseAndUploadCSV(file) {
    console.log("📂 Parsing file CSV...");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data;
        console.log(`📊 ${rows.length} record ditemukan di CSV`);

        await deleteAllAirtableRecords();
        await uploadToAirtable(rows);
        alert("✅ Data berhasil dikirim ke Airtable!");
        loadAirtableData();
      }
    });
  }

  document.getElementById("csvFile").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) parseAndUploadCSV(file);
  });

  loadAirtableData();
});
