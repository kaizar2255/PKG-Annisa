/**
 * Google Apps Script Backend for PKG 2025 Web Application
 * File: Code.gs
 * Target Google Drive Folder: https://drive.google.com/drive/folders/1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7
 */

var TARGET_FOLDER_ID = "1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7";

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getTeacherFiles') {
    var filesList = listTeacherFiles();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      folderId: TARGET_FOLDER_ID,
      folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID,
      files: filesList
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ready',
    service: 'PKG 2025 Multi-User Google Drive Service',
    folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    
    if (postData && postData.data) {
      var username = postData.username || "Guru";
      var result = saveDataToTeacherSpreadsheet(postData.data, username);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Data PKG 2025 (' + username + ') berhasil disimpan ke Google Drive!',
        fileUrl: result.fileUrl,
        fileId: result.fileId,
        fileName: result.fileName,
        folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error('Format data tidak valid');
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveDataToTeacherSpreadsheet(data, username) {
  var namaGuru = (data.identitas && data.identitas.namaGuru) ? data.identitas.namaGuru : username;
  var fileName = "PKG 2025 - " + namaGuru;
  
  var ss = getOrCreateUserSpreadsheet(fileName);
  
  // Save sheets in ss
  saveAllSheets(ss, data);

  return {
    fileId: ss.getId(),
    fileName: ss.getName(),
    fileUrl: ss.getUrl()
  };
}

function getOrCreateUserSpreadsheet(fileName) {
  var folder;
  try {
    folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  } catch (err) {
    folder = DriveApp.getRootFolder();
  }

  var files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    var existingFile = files.next();
    return SpreadsheetApp.openById(existingFile.getId());
  }

  // Create new Spreadsheet
  var newSS = SpreadsheetApp.create(fileName);
  var fileId = newSS.getId();
  var driveFile = DriveApp.getFileById(fileId);
  
  if (folder) {
    folder.addFile(driveFile);
    try {
      DriveApp.getRootFolder().removeFile(driveFile);
    } catch(e) {
      // Ignore if root removal fails
    }
  }

  return newSS;
}

function listTeacherFiles() {
  var filesList = [];
  try {
    var folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        filesList.push({
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl(),
          lastUpdated: file.getLastUpdated()
        });
      }
    }
  } catch(e) {
    console.error("Error listing files:", e);
  }
  return filesList;
}

function saveAllSheets(ss, data) {
  // 1. Save "Isi data" Sheet
  if (data.identitas) {
    var sheetIsi = getOrCreateSheet(ss, "Isi data");
    sheetIsi.clearContents();
    
    var idRows = [
      ["DATA GURU DAN PENILAI PKG 2025", ""],
      ["A. DATA GURU", ""],
      ["Nama guru", data.identitas.namaGuru || ""],
      ["NIP", data.identitas.nipGuru || ""],
      ["Tugas Tambahan", data.identitas.tugasTambahan || ""],
      ["NUPTK/NRG", data.identitas.nuptk || ""],
      ["Tempat. Tanggal lahir", data.identitas.ttlGuru || ""],
      ["Jabatan", data.identitas.jabatanGuru || ""],
      ["Pangkat/gol", data.identitas.pangkatGolGuru || ""],
      ["Masa kerja", data.identitas.masaKerja || ""],
      ["Jenis kelamin", data.identitas.jenisKelamin || ""],
      ["Mata pelajaran diampu", data.identitas.mapelDiampu || ""],
      ["", ""],
      ["B. DATA KEPALA SEKOLAH", ""],
      ["Nama Kepala Sekolah", data.identitas.namaKepalaSekolah || ""],
      ["NIP", data.identitas.nipKepalaSekolah || ""],
      ["Nama instansi", data.identitas.namaInstansi || ""],
      ["NPSN", data.identitas.npsn || ""],
      ["Kecamatan", data.identitas.kecamatan || ""],
      ["Kabupaten/Kota", data.identitas.kabupaten || ""],
      ["", ""],
      ["C. DATA PENILAI", ""],
      ["Nama penilai", data.identitas.namaPenilai || ""],
      ["Periode penilaian", data.identitas.periodePenilaian || ""],
      ["Tanggal pelaksanaan", data.identitas.tanggalPelaksanaan || ""]
    ];

    sheetIsi.getRange(1, 1, idRows.length, 2).setValues(idRows);
  }

  // 2. Save "Rekap" Sheet
  if (data.subkompetensi) {
    var sheetRekap = getOrCreateSheet(ss, "Rekap");
    sheetRekap.clearContents();

    var rekapRows = [
      ["REKAPITULASI HASIL PENILAIAN KINERJA GURU 2025"],
      ["Nama Guru:", data.identitas ? data.identitas.namaGuru : ""],
      ["Sekolah:", data.identitas ? data.identitas.namaInstansi : ""],
      [""],
      ["No", "Sub-Kompetensi PKG", "Skor Maks", "Skor Diraih", "Persentase (%)", "Nilai (1-4)"]
    ];

    var grandTotal = 0;
    data.subkompetensi.forEach(function(sub, idx) {
      grandTotal += sub.convertedScore || 0;
      rekapRows.push([
        idx + 1,
        sub.name + " - " + sub.title,
        sub.maxScore,
        sub.totalScore,
        sub.percentage + "%",
        sub.convertedScore
      ]);
    });

    rekapRows.push(["", "TOTAL NILAI KONVERSI PKG", "", "", "", grandTotal]);
    sheetRekap.getRange(1, 1, rekapRows.length, 6).setValues(rekapRows);

    // 3. Save SubKom 1-14 Sheets
    data.subkompetensi.forEach(function(sub) {
      var sheetSub = getOrCreateSheet(ss, sub.name);
      sheetSub.clearContents();

      var subRows = [
        [sub.name + " - " + sub.title],
        ["No", "Indikator", "Skor (0, 1, 2)", "Bukti Dukung / Catatan Pengamatan"]
      ];

      sub.indicators.forEach(function(ind) {
        subRows.push([
          ind.no,
          ind.text,
          ind.score,
          ind.evidence || ""
        ]);
      });

      subRows.push(["", "Total Skor", sub.totalScore, ""]);
      subRows.push(["", "Skor Maksimal", sub.maxScore, ""]);
      subRows.push(["", "Persentase", sub.percentage + "%", ""]);
      subRows.push(["", "Nilai Subkompetensi", sub.convertedScore, ""]);

      sheetSub.getRange(1, 1, subRows.length, 4).setValues(subRows);
    });
  }

  // 4. Save "Instrumen Perilaku GuruKS" Sheet
  if (data.instrumenPerilaku) {
    var sheetPerilaku = getOrCreateSheet(ss, "Instrumen Perilaku GuruKS");
    sheetPerilaku.clearContents();

    var perilakuRows = [
      ["INSTRUMEN PENILAIAN PRILAKU KINERJA GURU / KEPALA SEKOLAH OLEH PESERTA DIDIK/SISWA"],
      ["Nama Guru / KS:", data.identitas ? data.identitas.namaGuru : ""],
      ["NIP:", data.identitas ? data.identitas.nipGuru : ""],
      ["Tugas Tambahan:", data.identitas ? data.identitas.tugasTambahan : ""],
      [""],
      ["NO", "KOMPONEN", "PERNYATAAN", "SKOR (0 / 1 / 2)"]
    ];

    var totalPerilaku = 0;
    data.instrumenPerilaku.forEach(function(kom) {
      kom.statements.forEach(function(st, idx) {
        totalPerilaku += (st.score || 0);
        perilakuRows.push([
          idx === 0 ? kom.id : "",
          idx === 0 ? kom.name : "",
          st.no + ". " + st.text,
          st.score
        ]);
      });
    });

    perilakuRows.push(["", "", "TOTAL SKOR PERILAKU", totalPerilaku]);
    sheetPerilaku.getRange(1, 1, perilakuRows.length, 4).setValues(perilakuRows);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
