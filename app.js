// Application State Management for PKG 2025 Web App

let usersList = [];
let currentUser = null; // { username, role, nama, nip }
let activeTeacherUsername = ''; // Username of the teacher whose data is currently loaded
let pkgData = null;
let currentTab = 'Menu';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwqgUHSOUhvx20ZBOKV2LcGYRmCKUP4q381YDhevcYg-ucNdR8itvQ3PzRwP4qAyMqI_w/exec';
let gasUrl = DEFAULT_GAS_URL;

// Save current active teacher data to localStorage
function saveActiveTeacherData() {
  if (!activeTeacherUsername || !pkgData) return;
  localStorage.setItem('PKG_DATA_' + activeTeacherUsername, JSON.stringify(pkgData));
  localStorage.setItem('PKG_2025_DATA', JSON.stringify(pkgData)); // compatibility fallback
}

function formatSingleParagraph(str) {
  if (!str) return '';
  return str.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Load data for a specific teacher username
function loadTeacherData(username) {
  const user = usersList.find(u => u.username === username);
  const userNama = user ? user.nama : '';
  const userNip = user ? user.nip : '';

  const saved = localStorage.getItem('PKG_DATA_' + username);
  let data = null;

  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing teacher data:', e);
      data = createTeacherPackage(username, userNama, userNip);
    }
  } else if (username === 'guru1' && localStorage.getItem('PKG_2025_DATA')) {
    try {
      data = JSON.parse(localStorage.getItem('PKG_2025_DATA'));
    } catch (e) {
      data = createTeacherPackage(username, userNama, userNip);
    }
  } else {
    data = createTeacherPackage(username, userNama, userNip);
  }

  // Ensure default validation structure
  if (!data.validation) {
    data.validation = { status: 'Draft', submittedAt: null, validatedAt: null, validatorName: '', notes: '' };
  }

  // Filter invalid no:0 header artifacts & clean evidence to single paragraph
  if (data.subkompetensi) {
    data.subkompetensi.forEach(sub => {
      sub.indicators = sub.indicators.filter(ind => ind.no > 0);
      sub.indicators.forEach(ind => {
        if (ind.evidence) ind.evidence = formatSingleParagraph(ind.evidence);
        if (ind.text) ind.text = formatSingleParagraph(ind.text);
      });
    });
  }

  // Ensure fallback structures
  if (!data.instrumenPerilaku) {
    data.instrumenPerilaku = JSON.parse(JSON.stringify(INITIAL_PKG_DATA.instrumenPerilaku));
  }
  if (!data.rekapInstrumenPerilaku) {
    data.rekapInstrumenPerilaku = JSON.parse(JSON.stringify(INITIAL_PKG_DATA.rekapInstrumenPerilaku));
  }

  return data;
}

// Initialize Application Data & Multi-login State
function initApp() {
  // Load GAS URL (auto-update if legacy URL)
  const savedUrl = localStorage.getItem('PKG_GAS_URL');
  if (!savedUrl || savedUrl.includes('AKfycbxnnf-YaAGFwd')) {
    gasUrl = DEFAULT_GAS_URL;
  } else {
    gasUrl = savedUrl;
  }
  localStorage.setItem('PKG_GAS_URL', gasUrl);
  updateGasStatusUI();

  // Load Users List
  const savedUsers = localStorage.getItem('PKG_USERS_LIST');
  if (savedUsers) {
    try {
      usersList = JSON.parse(savedUsers);
    } catch (e) {
      usersList = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }
  } else {
    usersList = JSON.parse(JSON.stringify(DEFAULT_USERS));
    localStorage.setItem('PKG_USERS_LIST', JSON.stringify(usersList));
  }

  // Ensure Kepala Sekolah name is updated to Abdul Yakub, S. Ag.
  const ksUser = usersList.find(u => u.username === 'kepala_sekolah');
  if (ksUser) {
    ksUser.nama = "Abdul Yakub, S. Ag.";
    localStorage.setItem('PKG_USERS_LIST', JSON.stringify(usersList));
  }

  // Check Logged In User
  const savedCurrentUser = localStorage.getItem('PKG_CURRENT_USER');
  if (savedCurrentUser) {
    try {
      currentUser = JSON.parse(savedCurrentUser);
      if (currentUser.username === 'kepala_sekolah') {
        currentUser.nama = "Abdul Yakub, S. Ag.";
        localStorage.setItem('PKG_CURRENT_USER', JSON.stringify(currentUser));
      }
    } catch (e) {
      currentUser = null;
    }
  }

  if (!currentUser) {
    // Show Login Modal
    document.getElementById('modal-login').classList.remove('hidden');
    return;
  }

  // User is authenticated
  document.getElementById('modal-login').classList.add('hidden');
  updateUserHeaderProfileUI();

  // Set active teacher context
  if (currentUser.role === 'guru') {
    activeTeacherUsername = currentUser.username;
  } else if (currentUser.role === 'kepala_sekolah') {
    const savedActive = localStorage.getItem('PKG_ACTIVE_TEACHER');
    const guruUsers = usersList.filter(u => u.role === 'guru');
    if (savedActive && guruUsers.some(u => u.username === savedActive)) {
      activeTeacherUsername = savedActive;
    } else if (guruUsers.length > 0) {
      activeTeacherUsername = guruUsers[0].username;
    } else {
      activeTeacherUsername = 'guru1';
    }
  }

  // Load active teacher package
  pkgData = loadTeacherData(activeTeacherUsername);
  syncPenilai1Scores();
  recalculateAll();
  saveActiveTeacherData();

  // Populate KS Selector & Update Validation Bar
  populateKsTeacherSelect();
  updateValidationBarUI();

  // Render view
  switchTab(currentTab);
}

// Sync Penilai 1 scores with Instrumen Perilaku GuruKS
function syncPenilai1Scores() {
  if (pkgData && pkgData.instrumenPerilaku && pkgData.rekapInstrumenPerilaku && pkgData.rekapInstrumenPerilaku.scores) {
    if (!pkgData.rekapInstrumenPerilaku.scores['1']) {
      pkgData.rekapInstrumenPerilaku.scores['1'] = {};
    }
    pkgData.instrumenPerilaku.forEach(kom => {
      kom.statements.forEach(st => {
        if (st.no > 0) {
          pkgData.rekapInstrumenPerilaku.scores['1'][`${kom.id}_${st.no}`] = st.score;
        }
      });
    });
  }
}

// Recalculate SubKompetensi scores
function recalculateAll() {
  if (!pkgData || !pkgData.subkompetensi) return;

  pkgData.subkompetensi.forEach(sub => {
    sub.indicators = sub.indicators.filter(ind => ind.no > 0);
    
    sub.totalScore = sub.indicators.reduce((acc, ind) => acc + (parseInt(ind.score) || 0), 0);
    sub.maxScore = sub.indicators.length * 2;
    sub.percentage = sub.maxScore > 0 ? floatRound((sub.totalScore / sub.maxScore) * 100, 2) : 0;
    
    if (sub.percentage <= 49) sub.convertedScore = 1;
    else if (sub.percentage <= 68) sub.convertedScore = 2;
    else if (sub.percentage <= 84) sub.convertedScore = 3;
    else sub.convertedScore = 4;
  });
}

function floatRound(num, dec) {
  return +(Math.round(num + "e+" + dec) + "e-" + dec);
}

// AUTHENTICATION & MULTI-USER HANDLERS
function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginBtn.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-sky-600 text-sky-600 transition';
    regBtn.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition';
  } else {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    regBtn.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-emerald-600 text-emerald-600 transition';
    loginBtn.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition';
  }
}

function fillLogin(username, password) {
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();

  const found = usersList.find(user => (user.username === u || user.nip === u) && user.password === p);

  if (!found) {
    alert('Username/NIP atau password salah!');
    return;
  }

  currentUser = found;
  localStorage.setItem('PKG_CURRENT_USER', JSON.stringify(currentUser));
  initApp();
  showToast(`Selamat datang, ${currentUser.nama}!`, "user-check");
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const nama = document.getElementById('reg-nama').value.trim();
  const nip = document.getElementById('reg-nip').value.trim() || '-';
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();

  if (usersList.some(u => u.username === username)) {
    alert('Username sudah digunakan. Silakan pilih username lain.');
    return;
  }

  const newUser = { username, password, role: 'guru', nama, nip };
  usersList.push(newUser);
  localStorage.setItem('PKG_USERS_LIST', JSON.stringify(usersList));

  // Initialize teacher data
  const newData = createTeacherPackage(username, nama, nip);
  localStorage.setItem('PKG_DATA_' + username, JSON.stringify(newData));

  currentUser = newUser;
  localStorage.setItem('PKG_CURRENT_USER', JSON.stringify(currentUser));
  initApp();
  showToast(`Akun guru ${nama} berhasil didaftarkan!`, "user-plus");

  // Sync to Google Drive to create individual teacher file in Drive folder
  if (gasUrl && gasUrl.trim() !== '') {
    handleSave();
  }
}

function handleLogout() {
  localStorage.removeItem('PKG_CURRENT_USER');
  currentUser = null;
  document.getElementById('modal-login').classList.remove('hidden');
  showToast("Anda telah keluar dari aplikasi.", "log-out");
}

function updateUserHeaderProfileUI() {
  if (!currentUser) return;
  const roleBadge = document.getElementById('user-role-badge');
  const nameEl = document.getElementById('user-display-name');
  const ksSelector = document.getElementById('ks-teacher-selector-wrapper');
  const ksSidebar = document.getElementById('sidebar-ks-section');

  nameEl.innerText = currentUser.nama;

  if (currentUser.role === 'kepala_sekolah') {
    roleBadge.innerText = 'KEPALA SEKOLAH';
    roleBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold text-white bg-purple-600 uppercase';
    ksSelector.classList.remove('hidden');
    ksSidebar.classList.remove('hidden');
  } else {
    roleBadge.innerText = 'GURU';
    roleBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold text-white bg-blue-600 uppercase';
    ksSelector.classList.add('hidden');
    ksSidebar.classList.add('hidden');
  }
}

function populateKsTeacherSelect() {
  if (!currentUser || currentUser.role !== 'kepala_sekolah') return;
  const select = document.getElementById('ks-teacher-select');
  const guruUsers = usersList.filter(u => u.role === 'guru');

  select.innerHTML = guruUsers.map(g => `
    <option value="${g.username}" ${g.username === activeTeacherUsername ? 'selected' : ''}>
      ${g.nama} (${g.username})
    </option>
  `).join('');
}

function handleKsTeacherChange(username) {
  activeTeacherUsername = username;
  localStorage.setItem('PKG_ACTIVE_TEACHER', username);
  pkgData = loadTeacherData(username);
  syncPenilai1Scores();
  recalculateAll();
  saveActiveTeacherData();
  updateValidationBarUI();
  populateKsTeacherSelect();
  switchTab(currentTab);
  showToast(`Memeriksa data guru: ${pkgData.identitas.namaGuru}`, "user-search");
}

// VALIDATION WORKFLOW HANDLERS
function updateValidationBarUI() {
  const bar = document.getElementById('validation-bar');
  const iconWrapper = document.getElementById('validation-icon-wrapper');
  const icon = document.getElementById('validation-icon');
  const badge = document.getElementById('validation-badge');
  const desc = document.getElementById('validation-desc');
  const actions = document.getElementById('validation-actions');

  if (!pkgData || !pkgData.validation) {
    if (pkgData) pkgData.validation = { status: 'Draft', submittedAt: null, validatedAt: null, validatorName: '', notes: '' };
  }

  const v = pkgData.validation;
  const isKs = currentUser && currentUser.role === 'kepala_sekolah';

  if (v.status === 'Divalidasi') {
    bar.className = "no-print mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-emerald-50 border-emerald-200";
    iconWrapper.className = "p-2.5 rounded-lg text-white bg-emerald-600 shadow-sm";
    icon.setAttribute('data-lucide', 'check-circle-2');
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900";
    badge.innerText = "DIVALIDASI & DISETUJUI";
    desc.innerHTML = `Formulir penilaian telah divalidasi oleh <strong>${v.validatorName || 'Kepala Sekolah'}</strong> pada ${v.validatedAt || '-'}.`;

    actions.innerHTML = isKs ? `
      <button onclick="cancelValidation()" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition">
        Batalkan Status Validasi
      </button>
    ` : `
      <span class="text-xs font-semibold text-emerald-700 flex items-center gap-1">
        <i data-lucide="lock" class="w-3.5 h-3.5"></i> Data Terkunci (Disetujui KS)
      </span>
    `;
  } else if (v.status === 'Menunggu Validasi') {
    bar.className = "no-print mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-amber-50 border-amber-200";
    iconWrapper.className = "p-2.5 rounded-lg text-white bg-amber-500 shadow-sm";
    icon.setAttribute('data-lucide', 'clock');
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900";
    badge.innerText = "MENUNGGU VALIDASI KS";
    desc.innerHTML = `Guru telah mengajukan penilaian pada ${v.submittedAt || '-'}. Menunggu peninjauan Kepala Sekolah.`;

    actions.innerHTML = isKs ? `
      <button onclick="approveValidation()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="check-check" class="w-4 h-4"></i>
        <span>Validasi & Setujui</span>
      </button>
      <button onclick="openKsNotesModal()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="message-square" class="w-4 h-4"></i>
        <span>Minta Perbaikan</span>
      </button>
    ` : `
      <span class="text-xs font-semibold text-amber-700 flex items-center gap-1">
        <i data-lucide="send" class="w-3.5 h-3.5"></i> Sudah Diajukan ke Kepala Sekolah
      </span>
    `;
  } else if (v.status === 'Perlu Perbaikan') {
    bar.className = "no-print mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-rose-50 border-rose-200";
    iconWrapper.className = "p-2.5 rounded-lg text-white bg-rose-600 shadow-sm";
    icon.setAttribute('data-lucide', 'alert-triangle');
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900";
    badge.innerText = "PERLU PERBAIKAN";
    desc.innerHTML = `Catatan KS: <strong class="text-rose-900">"${v.notes || 'Silakan lengkapi instrumen'}"</strong>`;

    actions.innerHTML = isKs ? `
      <button onclick="approveValidation()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="check-check" class="w-4 h-4"></i>
        <span>Setujui Sekarang</span>
      </button>
    ` : `
      <button onclick="submitForValidation()" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="send" class="w-4 h-4"></i>
        <span>Ajukan Ulang Validasi</span>
      </button>
    `;
  } else {
    // Draft
    bar.className = "no-print mb-6 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-slate-50 border-slate-200";
    iconWrapper.className = "p-2.5 rounded-lg text-white bg-slate-500 shadow-sm";
    icon.setAttribute('data-lucide', 'file-clock');
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700";
    badge.innerText = "DRAFT";
    desc.innerText = "Guru sedang mengisikan instrumen penilaian.";

    actions.innerHTML = isKs ? `
      <button onclick="approveValidation()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="check-check" class="w-4 h-4"></i>
        <span>Validasi Langsung</span>
      </button>
    ` : `
      <button onclick="submitForValidation()" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5">
        <i data-lucide="send" class="w-4 h-4"></i>
        <span>Ajukan Validasi Ke Kepala Sekolah</span>
      </button>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

function submitForValidation() {
  pkgData.validation.status = 'Menunggu Validasi';
  pkgData.validation.submittedAt = new Date().toLocaleString('id-ID');
  saveActiveTeacherData();
  updateValidationBarUI();
  showToast("Penilaian berhasil diajukan ke Kepala Sekolah!", "send");
}

function approveValidation() {
  pkgData.validation.status = 'Divalidasi';
  pkgData.validation.validatedAt = new Date().toLocaleString('id-ID');
  pkgData.validation.validatorName = currentUser ? currentUser.nama : 'Kepala Sekolah';
  saveActiveTeacherData();
  updateValidationBarUI();
  showToast("Penilaian berhasil divalidasi & disetujui!", "check-circle-2");
}

function cancelValidation() {
  pkgData.validation.status = 'Draft';
  saveActiveTeacherData();
  updateValidationBarUI();
  showToast("Status validasi dikembalikan ke Draft.", "refresh-cw");
}

function openKsNotesModal() {
  document.getElementById('ks-notes-input').value = pkgData.validation.notes || '';
  document.getElementById('modal-ks-notes').classList.remove('hidden');
}

function closeKsNotesModal() {
  document.getElementById('modal-ks-notes').classList.add('hidden');
}

function submitKsNotes() {
  const notes = document.getElementById('ks-notes-input').value.trim();
  pkgData.validation.status = 'Perlu Perbaikan';
  pkgData.validation.notes = notes;
  saveActiveTeacherData();
  closeKsNotesModal();
  updateValidationBarUI();
  showToast("Catatan perbaikan telah dikirimkan ke Guru.", "message-square");
}

// Mobile Sidebar Toggle Handlers
function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar-container');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');

  if (sidebar) sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('hidden');
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar-container');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');

  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.add('hidden');
}

// Switch Sidebar Active Tab
function switchTab(tabName) {
  currentTab = tabName;
  closeMobileSidebar();

  document.querySelectorAll('.sidebar-link').forEach(el => {
    if (el.getAttribute('data-sheet') === tabName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const container = document.getElementById('content-container');

  if (tabName === 'Daftar Guru') {
    container.innerHTML = renderDaftarGuruView();
  } else if (tabName === 'Menu') {
    container.innerHTML = renderMenuView();
  } else if (tabName === 'Isi data') {
    container.innerHTML = renderIsiDataView();
  } else if (tabName === 'Rekap') {
    container.innerHTML = renderRekapView();
  } else if (tabName === 'Instrumen Perilaku GuruKS') {
    container.innerHTML = renderInstrumenPerilakuView();
  } else if (tabName === 'Rekap Instrumen Perilaku GuruKS') {
    container.innerHTML = renderRekapInstrumenPerilakuView();
  } else if (tabName.startsWith('SubKom.')) {
    const subId = parseInt(tabName.replace('SubKom.', ''));
    container.innerHTML = renderSubKomView(subId);
  }

  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// RENDER: Daftar Guru Dashboard for Kepala Sekolah
function renderDaftarGuruView() {
  const guruUsers = usersList.filter(u => u.role === 'guru');

  const teachersSummary = guruUsers.map(g => {
    const tData = loadTeacherData(g.username);
    const subTotal = tData.subkompetensi.reduce((acc, s) => {
      const indicators = s.indicators.filter(ind => ind.no > 0);
      const score = indicators.reduce((a, b) => a + (parseInt(b.score) || 0), 0);
      const maxScore = indicators.length * 2;
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      let conv = 1;
      if (pct <= 49) conv = 1;
      else if (pct <= 68) conv = 2;
      else if (pct <= 84) conv = 3;
      else conv = 4;
      return acc + conv;
    }, 0);

    const finalPct = floatRound((subTotal / 56) * 100, 2);
    let predikat = "Kurang";
    if (finalPct >= 91) predikat = "Amat Baik";
    else if (finalPct >= 76) predikat = "Baik";
    else if (finalPct >= 61) predikat = "Cukup";
    else if (finalPct >= 51) predikat = "Sedang";

    return {
      username: g.username,
      nama: tData.identitas.namaGuru || g.nama,
      nip: tData.identitas.nipGuru || g.nip,
      mapel: tData.identitas.mapelDiampu || 'Guru Bidang Studi',
      totalScore: subTotal,
      percentage: finalPct,
      predikat: predikat,
      validation: tData.validation || { status: 'Draft' }
    };
  });

  const totalGuru = teachersSummary.length;
  const totalMenunggu = teachersSummary.filter(t => t.validation.status === 'Menunggu Validasi').length;
  const totalDivalidasi = teachersSummary.filter(t => t.validation.status === 'Divalidasi').length;

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 class="text-xl font-bold text-purple-950 flex items-center gap-2">
            <i data-lucide="users" class="w-6 h-6 text-purple-600"></i>
            Daftar Guru & Validasi Penilaian Kinerja (PKG 2025)
          </h2>
          <p class="text-xs text-slate-500 mt-1">Panel kontrol Kepala Sekolah untuk memeriksa, menilai, dan memvalidasi isian guru.</p>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <i data-lucide="user-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Total Guru Terdaftar</div>
            <div class="text-xl font-extrabold text-purple-900">${totalGuru} Guru</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Menunggu Validasi</div>
            <div class="text-xl font-extrabold text-amber-900">${totalMenunggu} Guru</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <i data-lucide="check-circle-2" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Sudah Divalidasi</div>
            <div class="text-xl font-extrabold text-emerald-900">${totalDivalidasi} Guru</div>
          </div>
        </div>
      </div>

      <!-- Teachers List Table -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800 flex items-center justify-between">
          <span>Daftar Guru Yang Dinilai</span>
        </div>

        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th class="py-3 px-4 text-center w-12">No</th>
              <th class="py-3 px-4">Nama Guru & NIP</th>
              <th class="py-3 px-4">Mata Pelajaran</th>
              <th class="py-3 px-4 text-center">Skor PKG</th>
              <th class="py-3 px-4 text-center">Predikat</th>
              <th class="py-3 px-4 text-center">Status Validasi</th>
              <th class="py-3 px-4 text-center w-36">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${teachersSummary.map((t, idx) => {
              let badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
              let badgeLabel = "Draft";
              if (t.validation.status === 'Divalidasi') {
                badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                badgeLabel = "Divalidasi";
              } else if (t.validation.status === 'Menunggu Validasi') {
                badgeClass = "bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
                badgeLabel = "Menunggu Validasi";
              } else if (t.validation.status === 'Perlu Perbaikan') {
                badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
                badgeLabel = "Perlu Perbaikan";
              }

              return `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-3 px-4 text-center font-bold text-slate-500">${idx + 1}</td>
                  <td class="py-3 px-4">
                    <div class="font-bold text-slate-900">${t.nama}</div>
                    <div class="text-[11px] text-slate-500">NIP. ${t.nip}</div>
                  </td>
                  <td class="py-3 px-4 text-slate-700 font-medium">${t.mapel}</td>
                  <td class="py-3 px-4 text-center font-extrabold text-slate-900">${t.totalScore} / 56 (${t.percentage}%)</td>
                  <td class="py-3 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full font-bold text-[11px] bg-sky-50 text-sky-800 border border-sky-200">
                      ${t.predikat}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="px-2.5 py-1 rounded-full font-bold text-[11px] border ${badgeClass}">
                      ${badgeLabel}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <button onclick="inspectTeacherFromList('${t.username}')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm transition text-xs flex items-center justify-center gap-1 mx-auto">
                      <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                      <span>Periksa</span>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function inspectTeacherFromList(username) {
  handleKsTeacherChange(username);
  switchTab('Rekap');
}

// RENDER: Menu / Dashboard View
function renderMenuView() {
  const ident = pkgData.identitas;
  const totalConverted = pkgData.subkompetensi.reduce((acc, s) => acc + s.convertedScore, 0);
  const maxPossibleConverted = 14 * 4; // 56
  const finalPercentage = floatRound((totalConverted / maxPossibleConverted) * 100, 2);

  let predikat = "Kurang";
  let predikatBadgeClass = "bg-rose-100 text-rose-800 border-rose-300";

  if (finalPercentage >= 91) {
    predikat = "Amat Baik";
    predikatBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (finalPercentage >= 76) {
    predikat = "Baik";
    predikatBadgeClass = "bg-blue-100 text-blue-800 border-blue-300";
  } else if (finalPercentage >= 61) {
    predikat = "Cukup";
    predikatBadgeClass = "bg-amber-100 text-amber-800 border-amber-300";
  } else if (finalPercentage >= 51) {
    predikat = "Sedang";
    predikatBadgeClass = "bg-orange-100 text-orange-800 border-orange-300";
  }

  return `
    <div class="print-card space-y-6">
      <!-- Title & Hero Banner -->
      <div class="bg-gradient-to-r from-sky-700 to-indigo-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div class="relative z-10">
          <div class="flex items-center gap-2 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <i data-lucide="award" class="w-4 h-4"></i> Penilaian Kinerja Guru (PKG) Tahun 2025
          </div>
          <h2 class="text-2xl font-extrabold text-white mb-2">${ident.namaGuru}</h2>
          <p class="text-sm text-sky-100">${ident.namaInstansi} | ${ident.mapelDiampu}</p>
          <div class="mt-4 flex flex-wrap gap-4 text-xs font-medium text-sky-200">
            <span><strong class="text-white">NIP:</strong> ${ident.nipGuru}</span>
            <span><strong class="text-white">Periode:</strong> ${ident.periodePenilaian}</span>
            <span><strong class="text-white">Penilai:</strong> ${ident.namaPenilai}</span>
          </div>
        </div>
      </div>

      <!-- Quick Summary Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <i data-lucide="calculator" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Total Skor Konversi</div>
            <div class="text-xl font-extrabold text-slate-900">${totalConverted} / 56</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <i data-lucide="percent" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Persentase PKG</div>
            <div class="text-xl font-extrabold text-slate-900">${finalPercentage}%</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Kualifikasi / Predikat</div>
            <span class="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${predikatBadgeClass}">
              ${predikat}
            </span>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <i data-lucide="list-checks" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500">Sub-Kompetensi</div>
            <div class="text-xl font-extrabold text-slate-900">14 Indikator</div>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <div>
        <h3 class="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <i data-lucide="grid" class="w-5 h-5 text-sky-600"></i>
          Daftar Sheet Sub-Kompetensi
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${pkgData.subkompetensi.map(sub => `
            <div onclick="switchTab('${sub.name}')" class="bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md transition rounded-xl p-4 cursor-pointer flex items-center justify-between group">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-0.5 bg-slate-100 group-hover:bg-sky-100 text-slate-700 group-hover:text-sky-800 rounded">
                    ${sub.name}
                  </span>
                  <span class="text-xs text-slate-500 font-medium">${sub.indicators.length} Indikator</span>
                </div>
                <h4 class="text-sm font-semibold text-slate-800 group-hover:text-sky-700 transition line-clamp-1">
                  ${sub.title}
                </h4>
              </div>
              <div class="text-right flex-shrink-0 ml-3">
                <div class="text-sm font-extrabold text-slate-900">${sub.totalScore} / ${sub.maxScore}</div>
                <div class="text-xs font-semibold text-sky-600">${sub.percentage}% (Nilai: ${sub.convertedScore})</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// RENDER: Isi Data View (Form Profil Guru & Sekolah)
function renderIsiDataView() {
  const i = pkgData.identitas;

  return `
    <div class="print-card space-y-6 max-w-4xl mx-auto">
      <div class="border-b border-slate-200 pb-4">
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="user-check" class="w-5 h-5 text-sky-600"></i>
          Identitas & Informasi Data PKG 2025
        </h2>
        <p class="text-xs text-slate-500 mt-1">Perubahan pada form ini akan secara otomatis memperbarui seluruh sheet dan laporan cetak.</p>
      </div>

      <form id="form-isi-data" onchange="updateIdentitasFromForm()" class="space-y-6">
        <!-- Section: Identitas Guru -->
        <div class="bg-slate-50/50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 class="text-sm font-bold text-sky-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <i data-lucide="user" class="w-4 h-4"></i> A. Data Guru yang Dinilai
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Guru</label>
              <input type="text" id="ident_namaGuru" value="${i.namaGuru || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">NIP</label>
              <input type="text" id="ident_nipGuru" value="${i.nipGuru || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">NUPTK</label>
              <input type="text" id="ident_nuptk" value="${i.nuptk || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tempat, Tanggal Lahir</label>
              <input type="text" id="ident_ttlGuru" value="${i.ttlGuru || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Pangkat</label>
              <input type="text" id="ident_jabatanGuru" value="${i.jabatanGuru || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pangkat / Golongan</label>
              <input type="text" id="ident_pangkatGolGuru" value="${i.pangkatGolGuru || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran Diampu</label>
              <input type="text" id="ident_mapelDiampu" value="${i.mapelDiampu || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Masa Kerja</label>
              <input type="text" id="ident_masaKerja" value="${i.masaKerja || ''}" class="form-input text-xs">
            </div>
          </div>
        </div>

        <!-- Section: Identitas Penilai & Kepala Sekolah -->
        <div class="bg-slate-50/50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 class="text-sm font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <i data-lucide="user-check" class="w-4 h-4"></i> B. Data Penilai & Kepala Sekolah
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Penilai</label>
              <input type="text" id="ident_namaPenilai" value="${i.namaPenilai || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">NIP Penilai</label>
              <input type="text" id="ident_nipPenilai" value="${i.nipPenilai || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
              <input type="text" id="ident_namaKepalaSekolah" value="${i.namaKepalaSekolah || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input type="text" id="ident_nipKepalaSekolah" value="${i.nipKepalaSekolah || ''}" class="form-input text-xs">
            </div>
          </div>
        </div>

        <!-- Section: Data Sekolah & Pelaksanaan -->
        <div class="bg-slate-50/50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 class="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
            <i data-lucide="building-2" class="w-4 h-4"></i> C. Data Instansi & Tanggal Pelaksanaan
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Instansi / Sekolah</label>
              <input type="text" id="ident_namaInstansi" value="${i.namaInstansi || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">NPSN</label>
              <input type="text" id="ident_npsn" value="${i.npsn || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
              <input type="text" id="ident_kabupaten" value="${i.kabupaten || ''}" class="form-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pelaksanaan</label>
              <input type="text" id="ident_tanggalPelaksanaan" value="${i.tanggalPelaksanaan || ''}" class="form-input text-xs">
            </div>
          </div>
        </div>
      </form>
    </div>
  `;
}

// Update Identitas State from Form
function updateIdentitasFromForm() {
  const fields = [
    'namaGuru', 'nipGuru', 'nuptk', 'ttlGuru', 'jabatanGuru', 'pangkatGolGuru',
    'mapelDiampu', 'masaKerja', 'namaPenilai', 'nipPenilai', 'namaKepalaSekolah',
    'nipKepalaSekolah', 'namaInstansi', 'npsn', 'kabupaten', 'tanggalPelaksanaan'
  ];

  fields.forEach(field => {
    const el = document.getElementById(`ident_${field}`);
    if (el) {
      pkgData.identitas[field] = el.value.trim();
    }
  });

  saveActiveTeacherData();
}

// RENDER: Rekap View (Standard Format Rekap PKG)
function renderRekapView() {
  const i = pkgData.identitas;
  const subs = pkgData.subkompetensi;

  const totalConverted = subs.reduce((acc, s) => acc + s.convertedScore, 0);
  const maxPossible = 14 * 4; // 56
  const finalPct = floatRound((totalConverted / maxPossible) * 100, 2);

  let predikat = "Kurang";
  if (finalPct >= 91) predikat = "Amat Baik";
  else if (finalPct >= 76) predikat = "Baik";
  else if (finalPct >= 61) predikat = "Cukup";
  else if (finalPct >= 51) predikat = "Sedang";

  // Groupings for Competencies
  const groups = [
    { title: "A. PEDAGOGIK", ids: [1, 2, 3, 4, 5, 6, 7] },
    { title: "B. KEPRIBADIAN", ids: [8, 9, 10] },
    { title: "C. SOSIAL", ids: [11, 12] },
    { title: "D. PROFESIONAL", ids: [13, 14] }
  ];

  return `
    <div class="print-card space-y-4 text-xs leading-tight">
      <div class="text-center font-bold space-y-1 mb-4">
        <h2 class="text-sm uppercase tracking-wide">REKAPITULASI HASIL PENILAIAN KINERJA GURU</h2>
        <h3 class="text-xs text-slate-700">TAHUN 2025</h3>
      </div>

      <!-- Identity Header Table -->
      <table class="w-full border-none mb-3 text-xs">
        <tr>
          <td class="w-28 font-semibold py-0.5">Nama Guru</td>
          <td class="w-4 text-center py-0.5">:</td>
          <td class="font-bold py-0.5">${i.namaGuru}</td>
          <td class="w-28 font-semibold py-0.5">Nama Penilai</td>
          <td class="w-4 text-center py-0.5">:</td>
          <td class="font-bold py-0.5">${i.namaPenilai}</td>
        </tr>
        <tr>
          <td class="font-semibold py-0.5">NIP / NUPTK</td>
          <td class="text-center py-0.5">:</td>
          <td class="py-0.5">${i.nipGuru}</td>
          <td class="font-semibold py-0.5">NIP Penilai</td>
          <td class="text-center py-0.5">:</td>
          <td class="py-0.5">${i.nipPenilai || '-'}</td>
        </tr>
        <tr>
          <td class="font-semibold py-0.5">Mata Pelajaran</td>
          <td class="text-center py-0.5">:</td>
          <td class="py-0.5">${i.mapelDiampu}</td>
          <td class="font-semibold py-0.5">Instansi</td>
          <td class="text-center py-0.5">:</td>
          <td class="py-0.5">${i.namaInstansi}</td>
        </tr>
      </table>

      <!-- Main Rekap Table -->
      <div class="overflow-x-auto">
        <table class="table-pkg">
          <thead>
            <tr>
              <th class="w-10">NO</th>
              <th>KOMPETENSI</th>
              <th class="w-24">NILAI</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(g => {
              const groupSubs = subs.filter(s => g.ids.includes(s.id));
              return `
                <tr class="bg-slate-100 font-bold">
                  <td colspan="2" class="text-left">${g.title}</td>
                  <td></td>
                </tr>
                ${groupSubs.map(s => `
                  <tr>
                    <td class="text-center">${s.id}</td>
                    <td>${s.title}</td>
                    <td class="text-center font-bold text-slate-900">${s.convertedScore}</td>
                  </tr>
                `).join('')}
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="bg-slate-100 font-extrabold text-sm">
              <td colspan="2" class="text-right pr-4">Jumlah (Hasil Penilaian Kinerja Guru)</td>
              <td class="text-center text-sky-800 font-black">${totalConverted}</td>
            </tr>
            <tr class="bg-slate-50 font-bold">
              <td colspan="2" class="text-right pr-4">Nilai Maksimum PKG (14 x 4)</td>
              <td class="text-center">56</td>
            </tr>
            <tr class="bg-slate-100 font-extrabold">
              <td colspan="2" class="text-right pr-4">Persentase PKG = (Jumlah / 56) x 100%</td>
              <td class="text-center text-indigo-800">${finalPct}%</td>
            </tr>
            <tr class="bg-emerald-50 font-black text-sm">
              <td colspan="2" class="text-right pr-4 text-emerald-900">Sehingga Kualifikasi / Predikatnya adalah</td>
              <td class="text-center text-emerald-900">${predikat}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Official Approval Stamp (If Validated) -->
      ${pkgData.validation && pkgData.validation.status === 'Divalidasi' ? `
        <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <div class="flex items-center gap-2">
            <i data-lucide="shield-check" class="w-5 h-5 text-emerald-600"></i>
            <span>Formulir ini telah divalidasi dan disetujui secara resmi oleh <strong>${pkgData.validation.validatorName || 'Kepala Sekolah'}</strong> pada ${pkgData.validation.validatedAt || '-'}.</span>
          </div>
          <span class="font-black border-2 border-emerald-600 px-3 py-1 rounded text-emerald-700 uppercase tracking-widest text-[11px] transform -rotate-2">
            DIVALIDASI
          </span>
        </div>
      ` : ''}

      <!-- 4 Formal Signature Blocks -->
      <div class="signature-block pt-6 text-xs space-y-8">
        <div class="flex justify-end">
          <p>${i.kabupaten || 'Bekasi'}, ${i.tanggalPelaksanaan || '.....................'}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-8 text-center">
          <div>
            <p class="font-medium mb-16">Guru yang dinilai,</p>
            <p class="font-bold underline">${i.namaGuru}</p>
            <p class="text-slate-500">NIP. ${i.nipGuru || '-'}</p>
          </div>
          <div>
            <p class="font-medium mb-16">Penilai,</p>
            <p class="font-bold underline">${i.namaPenilai}</p>
            <p class="text-slate-500">NIP. ${i.nipPenilai || '-'}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8 text-center pt-4">
          <div>
            <p class="font-medium mb-16">Pengawas Pembina,</p>
            <p class="font-bold underline">......................................................</p>
            <p class="text-slate-500">NIP. ......................................................</p>
          </div>
          <div>
            <p class="font-medium mb-16">Kepala Sekolah,</p>
            <p class="font-bold underline">${i.namaKepalaSekolah}</p>
            <p class="text-slate-500">NIP. ${i.nipKepalaSekolah || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// RENDER: Instrumen Perilaku View
function renderInstrumenPerilakuView() {
  const i = pkgData.identitas;
  const inst = pkgData.instrumenPerilaku;

  return `
    <div class="print-card space-y-4 text-xs">
      <!-- Title & Subtitle Header -->
      <div class="text-center font-bold space-y-1 mb-4 pb-3 border-b border-slate-200">
        <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">INSTRUMEN PENILAIAN PRILAKU KINERJA GURU / KEPALA SEKOLAH</h2>
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">OLEH PESERTA DIDIK/SISWA</p>
      </div>

      <!-- Teacher Info Sub-Header Box -->
      <div class="bg-slate-50/60 border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
        <div class="flex items-center gap-2">
          <span class="text-slate-500 font-medium">Nama Guru / KS :</span>
          <span class="font-bold text-slate-900">${i.namaGuru}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-500 font-medium">NIP :</span>
          <span class="font-bold text-slate-900">${i.nipGuru || '-'}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-500 font-medium">Tugas Tambahan :</span>
          <span class="font-bold text-slate-900">${i.tugasTambahan || '-'}</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table-pkg">
          <thead>
            <tr class="bg-slate-100/70 text-slate-800 font-bold">
              <th rowspan="3" class="w-12 text-center align-middle border-b border-slate-300">NO</th>
              <th rowspan="3" class="w-40 text-center align-middle border-b border-slate-300">KOMPONEN</th>
              <th rowspan="3" class="text-center align-middle border-b border-slate-300">PERNYATAAN</th>
              <th colspan="3" class="text-center py-2 border-b border-slate-200">SKOR</th>
            </tr>
            <tr class="bg-slate-50/80 text-slate-700 text-[11px] font-semibold">
              <th class="w-24 text-center py-2 border-r border-slate-200">Tidak ada<br>bukti<br>(Tidak<br>terpenuhi)</th>
              <th class="w-24 text-center py-2 border-r border-slate-200">Terpenuhi<br>sebagian</th>
              <th class="w-24 text-center py-2">Seluruhnya<br>terpenuhi</th>
            </tr>
            <tr class="bg-slate-100/70 text-slate-900 font-bold text-xs">
              <th class="text-center py-1.5 border-t border-slate-200">0</th>
              <th class="text-center py-1.5 border-t border-slate-200">1</th>
              <th class="text-center py-1.5 border-t border-slate-200">2</th>
            </tr>
          </thead>
          <tbody>
            ${inst.map(kom => {
              const validStatements = kom.statements.filter(st => st.no > 0);
              return validStatements.map((st, idx) => {
                const is0 = st.score === 0;
                const is1 = st.score === 1;
                const is2 = st.score === 2;

                const cell0Bg = is0 ? 'bg-amber-50/60' : '';
                const cell1Bg = is1 ? 'bg-amber-50/60' : '';
                const cell2Bg = is2 ? 'bg-emerald-50/60' : '';

                const badge0 = is0 
                  ? `<div class="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">0</div>`
                  : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                const badge1 = is1
                  ? `<div class="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">1</div>`
                  : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                const badge2 = is2
                  ? `<div class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">2</div>`
                  : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                const statementText = formatSingleParagraph(st.text);
                const numberedStatement = statementText.startsWith(`${idx + 1}.`) ? statementText : `${idx + 1}. ${statementText}`;

                return `
                  <tr>
                    ${idx === 0 ? `<td rowspan="${validStatements.length}" class="text-center font-bold text-slate-700 py-3 border-r border-slate-300 align-middle">${kom.id}.</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${validStatements.length}" class="font-bold text-slate-800 bg-slate-50/60 align-middle py-3 px-3 border-r border-slate-300">${kom.name}</td>` : ''}
                    <td class="text-left align-middle leading-relaxed py-2.5 px-3 font-medium text-slate-800 border-r border-slate-300">${numberedStatement}</td>
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell0Bg}" onclick="setInstrumenPerilakuScore(${kom.id}, ${st.no}, 0)">
                      ${badge0}
                    </td>
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell1Bg}" onclick="setInstrumenPerilakuScore(${kom.id}, ${st.no}, 1)">
                      ${badge1}
                    </td>
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell2Bg}" onclick="setInstrumenPerilakuScore(${kom.id}, ${st.no}, 2)">
                      ${badge2}
                    </td>
                  </tr>
                `;
              }).join('');
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setInstrumenPerilakuScore(komId, stNo, newScore) {
  const kom = pkgData.instrumenPerilaku.find(k => k.id === komId);
  if (!kom) return;

  const st = kom.statements.find(s => s.no === stNo);
  if (!st) return;

  st.score = newScore;
  syncPenilai1Scores();
  saveActiveTeacherData();
  switchTab(currentTab);
}

// RENDER: Rekap Instrumen Perilaku View
function renderRekapInstrumenPerilakuView() {
  const inst = pkgData.instrumenPerilaku;
  const rekapScores = pkgData.rekapInstrumenPerilaku.scores || {};

  return `
    <div class="print-card space-y-4 text-xs">
      <!-- Title & Subtitle Header -->
      <div class="text-center font-bold space-y-1 mb-6 pb-4 border-b border-slate-200">
        <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">REKAP INSTRUMEN PENILAIAN PRILAKU KINERJA GURU / KEPALA SEKOLAH</h2>
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">OLEH PESERTA DIDIK / SISWA (5 RESPONDEN PENILAI)</p>
      </div>

      <div class="overflow-x-auto">
        <table class="table-pkg">
          <thead>
            <tr class="bg-slate-100/70 text-slate-800 font-bold">
              <th rowspan="3" class="w-10 text-center align-middle border-b border-slate-300">NO</th>
              <th rowspan="3" class="w-36 text-center align-middle border-b border-slate-300">KOMPONEN</th>
              <th rowspan="3" class="text-center align-middle border-b border-slate-300 min-w-[200px]">PERNYATAAN</th>
              <th colspan="3" class="text-center py-1.5 border-r border-slate-200">Penilai 1</th>
              <th colspan="3" class="text-center py-1.5 border-r border-slate-200">Penilai 2</th>
              <th colspan="3" class="text-center py-1.5 border-r border-slate-200">Penilai 3</th>
              <th colspan="3" class="text-center py-1.5 border-r border-slate-200">Penilai 4</th>
              <th colspan="3" class="text-center py-1.5">Penilai 5</th>
            </tr>
            <tr class="bg-slate-50/80 text-slate-700 text-[11px] font-semibold">
              <th colspan="3" class="text-center py-1 border-r border-slate-200">SKOR</th>
              <th colspan="3" class="text-center py-1 border-r border-slate-200">SKOR</th>
              <th colspan="3" class="text-center py-1 border-r border-slate-200">SKOR</th>
              <th colspan="3" class="text-center py-1 border-r border-slate-200">SKOR</th>
              <th colspan="3" class="text-center py-1">SKOR</th>
            </tr>
            <tr class="bg-slate-100/70 text-slate-900 font-bold text-xs">
              <!-- Penilai 1 -->
              <th class="w-7 text-center py-1 border-t border-slate-200">0</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">1</th>
              <th class="w-7 text-center py-1 border-t border-r border-slate-200">2</th>
              <!-- Penilai 2 -->
              <th class="w-7 text-center py-1 border-t border-slate-200">0</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">1</th>
              <th class="w-7 text-center py-1 border-t border-r border-slate-200">2</th>
              <!-- Penilai 3 -->
              <th class="w-7 text-center py-1 border-t border-slate-200">0</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">1</th>
              <th class="w-7 text-center py-1 border-t border-r border-slate-200">2</th>
              <!-- Penilai 4 -->
              <th class="w-7 text-center py-1 border-t border-slate-200">0</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">1</th>
              <th class="w-7 text-center py-1 border-t border-r border-slate-200">2</th>
              <!-- Penilai 5 -->
              <th class="w-7 text-center py-1 border-t border-slate-200">0</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">1</th>
              <th class="w-7 text-center py-1 border-t border-slate-200">2</th>
            </tr>
          </thead>
          <tbody>
            ${inst.map(kom => {
              const validStatements = kom.statements.filter(st => st.no > 0);
              return validStatements.map((st, idx) => {
                const key = `${kom.id}_${st.no}`;

                // Render option cells for Penilai 1..5
                const penilaiCells = [1, 2, 3, 4, 5].map(pNum => {
                  const pKey = String(pNum);
                  let scoreVal = rekapScores[pKey] ? rekapScores[pKey][key] : undefined;
                  if (scoreVal === undefined) scoreVal = 2; // default 2 as in screenshot

                  const is0 = scoreVal === 0;
                  const is1 = scoreVal === 1;
                  const is2 = scoreVal === 2;

                  const cell0Bg = is0 ? 'bg-amber-50/60' : '';
                  const cell1Bg = is1 ? 'bg-amber-50/60' : '';
                  const cell2Bg = is2 ? 'bg-emerald-50/60' : '';

                  const badge0 = is0 
                    ? `<div class="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-[11px] shadow-sm">0</div>`
                    : `<div class="w-6 h-6 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                  const badge1 = is1
                    ? `<div class="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-[11px] shadow-sm">1</div>`
                    : `<div class="w-6 h-6 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                  const badge2 = is2
                    ? `<div class="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-[11px] shadow-sm">2</div>`
                    : `<div class="w-6 h-6 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

                  const isLastPenilai = pNum === 5;
                  const borderRight = isLastPenilai ? '' : 'border-r border-slate-200';

                  return `
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell0Bg}" onclick="setRekapPerilakuScore(${pNum}, ${kom.id}, ${st.no}, 0)">
                      ${badge0}
                    </td>
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell1Bg}" onclick="setRekapPerilakuScore(${pNum}, ${kom.id}, ${st.no}, 1)">
                      ${badge1}
                    </td>
                    <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell2Bg} ${borderRight}" onclick="setRekapPerilakuScore(${pNum}, ${kom.id}, ${st.no}, 2)">
                      ${badge2}
                    </td>
                  `;
                }).join('');

                const statementText = formatSingleParagraph(st.text);
                const numberedStatement = statementText.startsWith(`${idx + 1}.`) ? statementText : `${idx + 1}. ${statementText}`;

                return `
                  <tr>
                    ${idx === 0 ? `<td rowspan="${validStatements.length}" class="text-center font-bold text-slate-700 py-3 border-r border-slate-300 align-middle">${kom.id}.</td>` : ''}
                    ${idx === 0 ? `<td rowspan="${validStatements.length}" class="font-bold text-slate-800 bg-slate-50/60 align-middle py-3 px-3 border-r border-slate-300">${kom.name}</td>` : ''}
                    <td class="text-left align-middle leading-relaxed py-2.5 px-3 font-medium text-slate-800 border-r border-slate-300">${numberedStatement}</td>
                    ${penilaiCells}
                  </tr>
                `;
              }).join('');
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setRekapPerilakuScore(penilaiNo, komId, stNo, scoreVal) {
  const pKey = String(penilaiNo);
  const key = `${komId}_${stNo}`;

  if (!pkgData.rekapInstrumenPerilaku.scores) {
    pkgData.rekapInstrumenPerilaku.scores = {};
  }
  if (!pkgData.rekapInstrumenPerilaku.scores[pKey]) {
    pkgData.rekapInstrumenPerilaku.scores[pKey] = {};
  }

  pkgData.rekapInstrumenPerilaku.scores[pKey][key] = scoreVal;

  if (penilaiNo === 1) {
    const kom = pkgData.instrumenPerilaku.find(k => k.id === komId);
    if (kom) {
      const st = kom.statements.find(s => s.no === stNo);
      if (st) st.score = scoreVal;
    }
  }

  saveActiveTeacherData();
  switchTab(currentTab);
}

function updateRekapPenilaiScore(penilaiNo, key, val) {
  const pNo = String(penilaiNo);
  if (!pkgData.rekapInstrumenPerilaku.scores[pNo]) {
    pkgData.rekapInstrumenPerilaku.scores[pNo] = {};
  }
  pkgData.rekapInstrumenPerilaku.scores[pNo][key] = parseInt(val) || 0;
  saveActiveTeacherData();
  switchTab(currentTab);
}

// // RENDER: SubKompetensi View (1-14)
function renderSubKomView(subId) {
  const i = pkgData.identitas;
  const sub = pkgData.subkompetensi.find(s => s.id === subId);

  if (!sub) return `<div class="p-4 text-center text-rose-600">Subkompetensi tidak ditemukan</div>`;

  const validIndicators = sub.indicators.filter(ind => ind.no > 0);

  return `
    <div class="print-card space-y-4 text-xs">
      <!-- Title & Subtitle Header -->
      <div class="text-center font-bold space-y-1 mb-6 pb-4 border-b border-slate-200">
        <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">SUBKOM.${sub.id} : ${sub.title.toUpperCase()}</h2>
        <p class="text-xs text-slate-500 font-medium">Evaluasi Kinerja Guru pada Sub-Kompetensi Ke-${sub.id}</p>
      </div>

      <div class="overflow-x-auto">
        <table class="table-pkg">
          <thead>
            <tr class="bg-slate-100/70 text-slate-800 font-bold">
              <th rowspan="3" class="w-12 text-center align-middle border-b border-slate-300">No</th>
              <th rowspan="3" class="col-indicator text-center align-middle border-b border-slate-300">Indikator</th>
              <th colspan="3" class="text-center py-2 border-b border-slate-200">Skor</th>
              <th rowspan="3" class="col-evidence w-72 text-center align-middle border-b border-slate-300">Bukti dukung/hal yang tampak</th>
            </tr>
            <tr class="bg-slate-50/80 text-slate-700 text-[11px] font-semibold">
              <th class="w-24 text-center py-2 border-r border-slate-200">Tidak ada<br>bukti<br>(tidak<br>terpenuhi)</th>
              <th class="w-24 text-center py-2 border-r border-slate-200">Terpenuhi<br>sebagian</th>
              <th class="w-24 text-center py-2">Seluruhnya<br>terpenuhi</th>
            </tr>
            <tr class="bg-slate-100/70 text-slate-900 font-bold text-xs">
              <th class="text-center py-1.5 border-t border-slate-200">0</th>
              <th class="text-center py-1.5 border-t border-slate-200">1</th>
              <th class="text-center py-1.5 border-t border-slate-200">2</th>
            </tr>
          </thead>
          <tbody>
            ${validIndicators.map(ind => {
              const is0 = ind.score === 0;
              const is1 = ind.score === 1;
              const is2 = ind.score === 2;

              const cell0Bg = is0 ? 'bg-amber-50/60' : '';
              const cell1Bg = is1 ? 'bg-amber-50/60' : '';
              const cell2Bg = is2 ? 'bg-emerald-50/60' : '';

              const badge0 = is0 
                ? `<div class="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">0</div>`
                : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

              const badge1 = is1
                ? `<div class="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">1</div>`
                : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

              const badge2 = is2
                ? `<div class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">2</div>`
                : `<div class="w-7 h-7 rounded-lg border-2 border-slate-200 bg-white inline-flex items-center justify-center"></div>`;

              const cleanEv = formatSingleParagraph(ind.evidence);
              const cleanTxt = formatSingleParagraph(ind.text);

              return `
                <tr>
                  <td class="text-center font-bold text-slate-700 py-3">${ind.no}</td>
                  <td class="col-indicator text-left align-middle leading-relaxed py-3 px-4 font-medium text-slate-800">${cleanTxt}</td>
                  <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell0Bg}" onclick="setIndicatorScore(${sub.id}, ${ind.no}, 0)">
                    ${badge0}
                  </td>
                  <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell1Bg}" onclick="setIndicatorScore(${sub.id}, ${ind.no}, 1)">
                    ${badge1}
                  </td>
                  <td class="score-cell text-center align-middle cursor-pointer hover:bg-slate-100/80 transition ${cell2Bg}" onclick="setIndicatorScore(${sub.id}, ${ind.no}, 2)">
                    ${badge2}
                  </td>
                  <td class="col-evidence p-2 text-left align-middle">
                    <div contenteditable="true" 
                         onblur="updateIndicatorEvidence(${sub.id}, ${ind.no}, this.innerText)"
                         class="evidence-editable text-left border border-slate-200 hover:border-slate-400 focus:border-sky-500 focus:bg-sky-50/50 bg-white leading-relaxed text-slate-700">
                      ${cleanEv}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="bg-sky-50 font-bold">
              <td colspan="2" class="text-left py-2.5 px-4 text-slate-800">Total skor untuk subkompetensi ${sub.id}</td>
              <td colspan="3" class="text-center text-sm font-extrabold text-sky-800 bg-sky-100/70 border-l border-r border-slate-300">${sub.totalScore}</td>
              <td></td>
            </tr>
            <tr class="bg-slate-50 font-bold">
              <td colspan="2" class="text-left py-2.5 px-4 text-slate-800">Skor maksimum subkompetensi ${sub.id} = jumlah indikator x 2</td>
              <td colspan="3" class="text-center text-sm font-bold text-slate-800 border-l border-r border-slate-300">${sub.maxScore}</td>
              <td></td>
            </tr>
            <tr class="bg-slate-50 font-bold">
              <td colspan="2" class="text-left py-2.5 px-4 text-slate-800">Persentase = (total skor/${sub.maxScore})x100%</td>
              <td colspan="3" class="text-center text-sm font-extrabold text-slate-900 bg-slate-100 border-l border-r border-slate-300">${sub.percentage}%</td>
              <td></td>
            </tr>
            <tr class="bg-slate-100 font-bold">
              <td colspan="2" class="text-left py-2.5 px-4 text-slate-800">Nilai untuk subkompetensi ${sub.id}</td>
              <td colspan="3" rowspan="2" class="text-center text-lg font-black text-emerald-700 bg-emerald-100 border-l border-r border-slate-300 align-middle">${sub.convertedScore}</td>
              <td rowspan="2"></td>
            </tr>
            <tr class="bg-slate-100 font-medium text-[11px] text-slate-600">
              <td colspan="2" class="text-left py-2 px-4">
                (0% &lt; X &le; 25% = 1; 25% &lt; X &le; 50% = 2; 50% &lt; X &le; 75% = 3; 75% &lt; X &le; 100% = 4)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Formal Signature Section for Printing -->
      <div class="signature-block pt-6 text-xs space-y-6">
        <div class="flex justify-end">
          <p>Kota ${i.kabupaten || 'Bekasi'}, ${i.tanggalPelaksanaan || '.....................'}</p>
        </div>
        <div class="grid grid-cols-2 gap-8 text-center">
          <div>
            <p class="font-medium mb-14">Penilai</p>
            <p class="font-bold underline">${i.namaPenilai}</p>
            <p class="text-slate-500">NIP. ${i.nipPenilai || '-'}</p>
          </div>
          <div>
            <p class="font-medium mb-14">Guru yang dinilai,</p>
            <p class="font-bold underline">${i.namaGuru}</p>
            <p class="text-slate-500">NIP. ${i.nipGuru || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Indicator Score Change Handler
function setIndicatorScore(subId, indNo, newScore) {
  const sub = pkgData.subkompetensi.find(s => s.id === subId);
  if (!sub) return;

  const ind = sub.indicators.find(i => i.no === indNo);
  if (!ind) return;

  ind.score = newScore;
  recalculateAll();
  saveActiveTeacherData();
  switchTab(currentTab);
}

// Indicator Evidence Change Handler
function updateIndicatorEvidence(subId, indNo, val) {
  const sub = pkgData.subkompetensi.find(s => s.id === subId);
  if (!sub) return;

  const ind = sub.indicators.find(i => i.no === indNo);
  if (ind) {
    ind.evidence = formatSingleParagraph(val);
    saveActiveTeacherData();
  }
}

// SAVE ACTION: Save to localStorage and Google Drive folder (if configured)
async function handleSave() {
  recalculateAll();
  saveActiveTeacherData();

  if (gasUrl && gasUrl.trim() !== '') {
    showToast("Mengirim data ke Google Drive...", "refresh-cw");

    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'save',
          username: activeTeacherUsername,
          role: currentUser ? currentUser.role : 'guru',
          timestamp: new Date().toISOString(),
          data: pkgData
        })
      });

      let resJson = null;
      try {
        resJson = await response.json();
      } catch (e) {
        // no-op if opaque
      }

      if (resJson && resJson.fileUrl) {
        if (pkgData) {
          pkgData.spreadsheetUrl = resJson.fileUrl;
          pkgData.spreadsheetName = resJson.fileName;
          saveActiveTeacherData();
        }
        showToast("File Spreadsheet Guru tersimpan di Drive Folder!", "check-circle-2");
      } else {
        showToast("Data tersimpan ke Google Drive & Lokal!", "check-circle-2");
      }
    } catch (err) {
      console.warn('GAS POST fetch attempt error, falling back to no-cors mode:', err);
      try {
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'save',
            username: activeTeacherUsername,
            role: currentUser ? currentUser.role : 'guru',
            timestamp: new Date().toISOString(),
            data: pkgData
          })
        });
        showToast("Tersimpan ke File Google Drive Guru!", "check-circle-2");
      } catch (err2) {
        console.error('GAS Save Error:', err2);
        showToast("Tersimpan di Lokal! (Gagal kirim ke Google Drive)", "alert-triangle");
      }
    }
  } else {
    showToast("Data berhasil disimpan di Penyimpanan Lokal!", "check-circle-2");
  }
}

// PRINT ACTION
function handlePrint() {
  window.print();
}

// GAS CONFIG MODAL HANDLERS
function openGasModal() {
  document.getElementById('input-gas-url').value = gasUrl;
  document.getElementById('modal-gas').classList.remove('hidden');
}

function closeGasModal() {
  document.getElementById('modal-gas').classList.add('hidden');
}

function saveGasConfig() {
  const url = document.getElementById('input-gas-url').value.trim();
  gasUrl = url;
  localStorage.setItem('PKG_GAS_URL', gasUrl);
  updateGasStatusUI();
  closeGasModal();
  showToast(gasUrl ? "Google Apps Script terhubung!" : "Mode Penyimpanan Lokal diaktifkan", "settings");
}

function updateGasStatusUI() {
  const dot = document.getElementById('gas-status-dot');
  const text = document.getElementById('gas-status-text');

  if (gasUrl && gasUrl.trim() !== '') {
    dot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
    text.innerText = "Google Sheets Terhubung";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-amber-500";
    text.innerText = "Mode Lokal";
  }
}

// TOAST NOTIFICATION
function showToast(message, iconName = "check-circle-2") {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  toastMsg.innerText = message;
  toastIcon.setAttribute('data-lucide', iconName);
  if (window.lucide) lucide.createIcons();

  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// Start application on page load
document.addEventListener('DOMContentLoaded', initApp);
