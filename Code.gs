/**
 * ==============================================================================
 * Google Apps Script Backend - PKG 2025 Web Application
 * File: Code.gs
 * Master Template File ID: 16aTGfKoFbjSMAjE10JSjOnyqpH3jQ8Uc
 * Target Google Drive Folder ID: 1wOtpj-5XokbSn0DTBnfOrbdlUURRjcf7
 * ==============================================================================
 */

var TEMPLATE_FILE_ID = "16aTGfKoFbjSMAjE10JSjOnyqpH3jQ8Uc";
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
    service: 'PKG 2025 Master Template Service',
    templateId: TEMPLATE_FILE_ID,
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

/**
 * Menyimpan data guru ke Google Spreadsheet (Menggandakan Master Template 16aTGfKoFbjSMAjE10JSjOnyqpH3jQ8Uc)
 */
function saveDataToTeacherSpreadsheet(data, username) {
  var namaGuru = (data.identitas && data.identitas.namaGuru) ? data.identitas.namaGuru : username;
  var fileName = "PKG 2025 - " + namaGuru;
  
  var ss = getOrCreateUserSpreadsheet(fileName);
  
  // Isikan seluruh sheet berdasarkan template
  saveAllSheets(ss, data);

  return {
    fileId: ss.getId(),
    fileName: ss.getName(),
    fileUrl: ss.getUrl()
  };
}

/**
 * Mendapatkan atau menggandakan file dari Master Template Google Spreadsheet
 */
function getOrCreateUserSpreadsheet(fileName) {
  var folder;
  try {
    folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  } catch (err) {
    folder = DriveApp.getRootFolder();
  }

  // 1. Cek apakah file sudah ada di folder target
  var files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    var existingFile = files.next();
    return SpreadsheetApp.openById(existingFile.getId());
  }

  // 2. Jika belum ada, salin dari Master Template 16aTGfKoFbjSMAjE10JSjOnyqpH3jQ8Uc
  try {
    var templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
    var clonedFile = templateFile.makeCopy(fileName, folder);
    return SpreadsheetApp.openById(clonedFile.getId());
  } catch (e) {
    console.error("Error cloning master template, creating fallback spreadsheet:", e);
    var newSS = SpreadsheetApp.create(fileName);
    var fileId = newSS.getId();
    var driveFile = DriveApp.getFileById(fileId);
    if (folder) folder.addFile(driveFile);
    return newSS;
  }
}

/**
 * Mengisikan data ke dalam sel-sel template Google Spreadsheet secara presisi
 */
function saveAllSheets(ss, data) {
  // 1. Sheet "Isi data"
  if (data.identitas) {
    var sheetIsi = getOrCreateSheet(ss, "Isi data");
    
    // Mapping sel identitas guru, kepala sekolah, dan penilai
    var idMapping = [
      { row: 5, col: 3, val: data.identitas.namaGuru },
      { row: 6, col: 3, val: data.identitas.nipGuru },
      { row: 7, col: 3, val: data.identitas.tugasTambahan },
      { row: 8, col: 3, val: data.identitas.nuptk },
      { row: 9, col: 3, val: data.identitas.ttlGuru },
      { row: 10, col: 3, val: data.identitas.jabatanGuru },
      { row: 11, col: 3, val: data.identitas.pangkatGolGuru },
      { row: 12, col: 3, val: data.identitas.masaKerja },
      { row: 13, col: 3, val: data.identitas.jenisKelamin },
      { row: 14, col: 3, val: data.identitas.mapelDiampu },
      
      { row: 17, col: 3, val: data.identitas.namaKepalaSekolah },
      { row: 18, col: 3, val: data.identitas.nipKepalaSekolah },
      { row: 19, col: 3, val: data.identitas.namaInstansi },
      { row: 20, col: 3, val: data.identitas.npsn },
      { row: 21, col: 3, val: data.identitas.kecamatan },
      { row: 22, col: 3, val: data.identitas.kabupaten },
      
      { row: 25, col: 3, val: data.identitas.namaPenilai },
      { row: 26, col: 3, val: data.identitas.periodePenilaian },
      { row: 27, col: 3, val: data.identitas.tanggalPelaksanaan }
    ];

    idMapping.forEach(function(m) {
      if (m.val !== undefined && m.val !== null) {
        sheetIsi.getRange(m.row, m.col).setValue(m.val);
        sheetIsi.getRange(m.row, m.col - 1).setValue(m.val); // Fallback ke Col B jika sel di-merge
      }
    });
  }

  // 2. Sheet SubKom.1 s/d SubKom.14
  if (data.subkompetensi) {
    data.subkompetensi.forEach(function(sub) {
      var sheetSub = ss.getSheetByName(sub.name);
      if (!sheetSub) {
        sheetSub = ss.insertSheet(sub.name);
      }

      var lastRow = sheetSub.getLastRow();
      if (lastRow > 3) {
        // Sheet Template Ada: Isi skor pada Kolom C & Bukti Dukung pada Kolom D
        var rangeA = sheetSub.getRange(1, 1, Math.min(lastRow, 45), 1).getValues();
        sub.indicators.forEach(function(ind) {
          for (var r = 0; r < rangeA.length; r++) {
            var valA = rangeA[r][0];
            if (valA == ind.no || valA === ind.no.toString()) {
              sheetSub.getRange(r + 1, 3).setValue(ind.score); // Col C = Skor
              if (ind.evidence !== undefined && ind.evidence !== null) {
                sheetSub.getRange(r + 1, 4).setValue(ind.evidence); // Col D = Bukti Dukung
              }
              break;
            }
          }
        });
      } else {
        // Fallback untuk sheet kosong
        var subRows = [
          [sub.name + " - " + sub.title],
          ["No", "Indikator", "Skor (0, 1, 2)", "Bukti Dukung / Catatan Pengamatan"]
        ];
        sub.indicators.forEach(function(ind) {
          subRows.push([ind.no, ind.text, ind.score, ind.evidence || ""]);
        });
        subRows.push(["", "Total Skor", sub.totalScore, ""]);
        subRows.push(["", "Skor Maksimal", sub.maxScore, ""]);
        subRows.push(["", "Persentase", sub.percentage + "%", ""]);
        subRows.push(["", "Nilai Subkompetensi", sub.convertedScore, ""]);
        sheetSub.getRange(1, 1, subRows.length, 4).setValues(subRows);
      }
    });
  }

  // 3. Sheet "Instrumen Perilaku GuruKS"
  if (data.instrumenPerilaku) {
    var sheetPerilaku = getOrCreateSheet(ss, "Instrumen Perilaku GuruKS");
    var lastRowP = sheetPerilaku.getLastRow();
    
    if (lastRowP > 3) {
      // Sheet Template Ada: Isikan skor ke Kolom D
      var rangeA_P = sheetPerilaku.getRange(1, 1, Math.min(lastRowP, 60), 3).getValues();
      var stCounter = 1;
      
      data.instrumenPerilaku.forEach(function(kom) {
        kom.statements.forEach(function(st) {
          for (var r = 5; r < rangeA_P.length; r++) {
            var cellC = rangeA_P[r][2];
            var cellA = rangeA_P[r][0];
            if (cellC && (cellC.toString().indexOf(st.no + ".") === 0 || cellC.toString().indexOf(st.text.substring(0, 15)) >= 0 || cellA == stCounter)) {
              sheetPerilaku.getRange(r + 1, 4).setValue(st.score);
              stCounter++;
              break;
            }
          }
        });
      });
    } else {
      // Fallback sheet kosong
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
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
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
