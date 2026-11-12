"use strict";
/* =========================================================
   SayoLearn – script.js
   Bagian: 1) Helper  2) Data  3) Navigasi  4) Dashboard
           5) Jadwal  6) Tugas  7) Kuis  8) Riwayat  9) Init
   ========================================================= */

/* ---------- 1) HELPER ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const KEY = { sch: "SayoLearn_schedule", task: "SayoLearn_tasks", res: "SayoLearn_results", name: "SayoLearn_name" };
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat" ];
const STATUS = ["Belum Dikerjakan", "Sedang Dikerjakan", "Selesai"];

// Baca & tulis LocalStorage (try/catch agar tidak error jika data rusak)
const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
// Cegah HTML injection dari teks yang diketik pengguna
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = n => String(n).padStart(2, "0");
const fmtTime = s => pad(Math.floor(s / 60)) + ":" + pad(s % 60);
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const longDate = str => new Date(str + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Notifikasi kecil (toast)
let toastTimer;
function toast(msg, type = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2500);
}

/* ---------- 2) DATA ---------- */
// Isi contoh saat pertama kali dibuka (hanya jika LocalStorage masih kosong)
if (localStorage.getItem(KEY.sch) === null) {
  save(KEY.sch, [
    { id: uid(), day: "Senin", subject: "Matematika", start: "07:00", end: "08:30", teacher: "Bu Sari" },
    { id: uid(), day: "Senin", subject: "Informatika", start: "08:30", end: "10:00", teacher: "Pak Dimas" },
  ]);
}
let schedules = load(KEY.sch, []);
let tasks = load(KEY.task, []);
let results = load(KEY.res, []);

// Bank soal: q = pertanyaan, o = pilihan A-D, a = indeks jawaban benar, e = pembahasan, c = kategori
const BANK = {
  "Matematika": [
    { q: "Hasil dari 12 × 8 adalah ...", o: ["86", "96", "106", "92"], a: 1, e: "12 × 8 = 96.", c: "Dasar" },
    { q: "Hasil dari 3/4 + 1/4 adalah ...", o: ["1/2", "3/4", "1", "2"], a: 2, e: "Penyebut sama: (3+1)/4 = 4/4 = 1.", c: "Dasar" },
    { q: "Akar kuadrat dari 144 adalah ...", o: ["10", "11", "12", "14"], a: 2, e: "12 × 12 = 144.", c: "Dasar" },
    { q: "Luas persegi panjang dengan panjang 10 cm dan lebar 6 cm adalah ...", o: ["32 cm²", "60 cm²", "16 cm²", "120 cm²"], a: 1, e: "Luas = p × l = 10 × 6 = 60 cm².", c: "Menengah" },
    { q: "Jika 2x + 6 = 14, maka x = ...", o: ["3", "4", "5", "10"], a: 1, e: "2x = 14 − 6 = 8, jadi x = 4.", c: "Menengah" },
  ],
  "Bahasa Indonesia": [
    { q: "Sinonim kata \"cantik\" adalah ...", o: ["Buruk", "Indah", "Kecil", "Kuat"], a: 1, e: "Sinonim = kata yang bermakna sama; cantik ≈ indah.", c: "Dasar" },
    { q: "Antonim kata \"rajin\" adalah ...", o: ["Giat", "Tekun", "Malas", "Pintar"], a: 2, e: "Antonim = lawan kata; lawan rajin adalah malas.", c: "Dasar" },
    { q: "Penulisan kata baku yang benar adalah ...", o: ["Apotik", "Apotek", "Apoteek", "Afotek"], a: 1, e: "Bentuk baku menurut KBBI adalah \"apotek\".", c: "Menengah" },
    { q: "Gagasan utama sebuah paragraf disebut ...", o: ["Kalimat penjelas", "Ide pokok", "Kesimpulan", "Judul"], a: 1, e: "Ide pokok adalah inti yang dibahas dalam paragraf.", c: "Menengah" },
    { q: "\"Dia bagaikan matahari bagi keluarganya\" mengandung majas ...", o: ["Hiperbola", "Personifikasi", "Simile", "Ironi"], a: 2, e: "Simile membandingkan dua hal memakai kata seperti/bagaikan.", c: "Menengah" },
  ],
  "Bahasa Inggris": [
    { q: "She ___ to school every day.", o: ["go", "goes", "going", "gone"], a: 1, e: "Subjek tunggal (she) pada simple present memakai verb + s/es.", c: "Dasar" },
    { q: "The past form of \"write\" is ...", o: ["writed", "written", "wrote", "writes"], a: 2, e: "Write – wrote – written.", c: "Dasar" },
    { q: "What is the meaning of \"library\"?", o: ["Toko buku", "Perpustakaan", "Laboratorium", "Kantin"], a: 1, e: "Library = perpustakaan.", c: "Dasar" },
    { q: "I have ___ apple.", o: ["a", "an", "the", "some"], a: 1, e: "\"apple\" diawali bunyi vokal, jadi memakai \"an\".", c: "Menengah" },
    { q: "The plural of \"child\" is ...", o: ["childs", "childes", "children", "childrens"], a: 2, e: "Child adalah plural tak beraturan: children.", c: "Menengah" },
  ],
  "Informatika": [
    { q: "CPU adalah singkatan dari ...", o: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Power Unit"], a: 0, e: "CPU = Central Processing Unit, otak komputer.", c: "Dasar" },
    { q: "Contoh perangkat input adalah ...", o: ["Monitor", "Printer", "Keyboard", "Speaker"], a: 2, e: "Keyboard memasukkan data ke komputer.", c: "Dasar" },
    { q: "Bahasa markup untuk membuat struktur halaman web adalah ...", o: ["CSS", "HTML", "SQL", "Python"], a: 1, e: "HTML menyusun struktur; CSS untuk tampilan.", c: "Menengah" },
    { q: "Bilangan biner 101 sama dengan desimal ...", o: ["3", "4", "5", "6"], a: 2, e: "1×4 + 0×2 + 1×1 = 5.", c: "Menengah" },
    { q: "Yang termasuk web browser adalah ...", o: ["Windows", "Chrome", "Excel", "Linux"], a: 1, e: "Chrome adalah browser untuk membuka website.", c: "Dasar" },
  ],
  "PPKn": [
    { q: "Sila pertama Pancasila berbunyi ...", o: ["Kemanusiaan yang adil dan beradab", "Persatuan Indonesia", "Ketuhanan Yang Maha Esa", "Keadilan sosial"], a: 2, e: "Sila ke-1: Ketuhanan Yang Maha Esa.", c: "Dasar" },
    { q: "Lambang sila ketiga Pancasila adalah ...", o: ["Bintang", "Rantai", "Pohon beringin", "Kepala banteng"], a: 2, e: "Sila Persatuan Indonesia dilambangkan pohon beringin.", c: "Menengah" },
    { q: "UUD 1945 disahkan pada tanggal ...", o: ["17 Agustus 1945", "18 Agustus 1945", "1 Juni 1945", "28 Oktober 1928"], a: 1, e: "PPKI mengesahkan UUD 1945 pada 18 Agustus 1945.", c: "Dasar" },
    { q: "Arti \"Bhinneka Tunggal Ika\" adalah ...", o: ["Bersatu kita teguh", "Berbeda-beda tetapi tetap satu", "Gotong royong", "Tanah air kita"], a: 1, e: "Semboyan persatuan dalam keberagaman.", c: "Dasar" },
    { q: "Salah satu hak warga negara Indonesia adalah ...", o: ["Membayar pajak", "Membela negara", "Memperoleh pendidikan", "Menaati hukum"], a: 2, e: "Hak: memperoleh pendidikan (Pasal 31 UUD 1945). Lainnya adalah kewajiban.", c: "Menengah" },
  ],
};

/* ---------- 3) NAVIGASI ---------- */
function showPage(name) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + name));
  $$("#nav button").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  window.scrollTo(0, 0);
  renderAll();
}
$("#nav").addEventListener("click", e => {
  const b = e.target.closest("button[data-page]");
  if (b) showPage(b.dataset.page);
});
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) showPage(g.dataset.go);
  if (e.target.closest("[data-close]")) e.target.closest("dialog").close();
});

function renderAll() { renderDashboard(); renderSchedule(); renderTasks(); renderResults(); }

/* ---------- 4) DASHBOARD ---------- */
function renderDashboard() {
  const now = new Date();
  const h = now.getHours();
  const hello = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  $("#greet").textContent = `${hello}, ${load(KEY.name, "Siswa")}!`;
  $("#today").textContent = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const done = tasks.filter(t => t.status === "Selesai").length;
  const doing = tasks.filter(t => t.status === "Sedang Dikerjakan").length;
  $("#stats").innerHTML = [["Total tugas", tasks.length], ["Selesai", done], ["Sedang dikerjakan", doing], ["Belum dikerjakan", tasks.length - done - doing]]
    .map(([l, n]) => `<div class="card stat"><strong>${n}</strong>${l}</div>`).join("");

  // getDay(): 0 = Minggu, 1 = Senin ... 6 = Sabtu
  const todayName = DAYS[now.getDay() - 1];
  const todays = schedules.filter(s => s.day === todayName).sort((a, b) => a.start.localeCompare(b.start));
  $("#d-schedule").innerHTML = todays.length
    ? todays.map(s => `<div class="item"><div><b>${esc(s.subject)}</b><small>${esc(s.teacher)}</small></div><span class="tag">${s.start}–${s.end}</span></div>`).join("")
    : `<p class="empty">${todayName ? "Tidak ada jadwal hari ini." : "Hari Minggu, waktunya istirahat."}</p>`;

  const near = tasks.filter(t => t.status !== "Selesai").sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4);
  $("#d-tasks").innerHTML = near.length
    ? near.map(t => `<div class="item"><div><b>${esc(t.name)}</b><small>${esc(t.subject)} · ${longDate(t.deadline)}</small></div>${deadlineTag(t)}</div>`).join("")
    : `<p class="empty">Semua tugas beres. 🎉</p>`;

  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;
  const last = results[0];
  $("#d-activity").innerHTML = `<div class="item"><span>Kuis dikerjakan</span><b>${results.length}</b></div>
    <div class="item"><span>Rata-rata nilai</span><b>${avg}</b></div>
    <div class="item"><span>Kuis terakhir</span><b>${last ? esc(last.subject) + " (" + last.score + ")" : "–"}</b></div>`;
}
$("#btn-name").addEventListener("click", () => {
  const n = prompt("Nama kamu:", load(KEY.name, "Siswa"));
  if (n && n.trim()) { save(KEY.name, n.trim().slice(0, 30)); toast("Nama diperbarui"); renderDashboard(); }
});

/* ---------- 5) JADWAL (CRUD) ---------- */
$("#sf-day").innerHTML = DAYS.map(d => `<option>${d}</option>`).join("");

function renderSchedule() {
  $("#sch-list").innerHTML = DAYS.map(day => {
    const list = schedules.filter(s => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
    const body = list.length ? list.map(s => `<div class="item"><div><b>${esc(s.subject)}</b><small>${s.start}–${s.end} · ${esc(s.teacher)}</small></div>
      <div class="acts"><button class="btn ghost small" data-act="edit-sch" data-id="${s.id}">Edit</button><button class="btn danger small" data-act="del-sch" data-id="${s.id}">Hapus</button></div></div>`).join("")
      : `<p class="empty">Belum ada jadwal.</p>`;
    return `<div class="card"><h2>${day}</h2>${body}</div>`;
  }).join("");
}
function openSchedule(s) {
  $("#sch-title").textContent = s ? "Edit jadwal" : "Tambah jadwal";
  $("#sf-id").value = s ? s.id : "";
  $("#sf-day").value = s ? s.day : DAYS[0];
  $("#sf-subject").value = s ? s.subject : "";
  $("#sf-start").value = s ? s.start : "";
  $("#sf-end").value = s ? s.end : "";
  $("#sf-teacher").value = s ? s.teacher : "";
  $("#sf-err").textContent = "";
  $("#dlg-sch").showModal();
}
$("#btn-add-sch").addEventListener("click", () => openSchedule());
$("#f-sch").addEventListener("submit", e => {
  e.preventDefault();
  const d = { day: $("#sf-day").value, subject: $("#sf-subject").value.trim(), start: $("#sf-start").value, end: $("#sf-end").value, teacher: $("#sf-teacher").value.trim() };
  // Validasi form
  let err = "";
  if (!d.subject) err = "Nama mata pelajaran wajib diisi.";
  else if (!d.start || !d.end) err = "Jam mulai dan selesai wajib diisi.";
  else if (d.end <= d.start) err = "Jam selesai harus setelah jam mulai.";
  else if (!d.teacher) err = "Nama guru wajib diisi.";
  if (err) { $("#sf-err").textContent = err; return; }

  const id = $("#sf-id").value;
  if (id) { schedules = schedules.map(s => (s.id === id ? { ...s, ...d } : s)); toast("Jadwal diperbarui"); }
  else { schedules.push({ id: uid(), ...d }); toast("Jadwal ditambahkan"); }
  save(KEY.sch, schedules);
  $("#dlg-sch").close();
  renderAll();
});

/* ---------- 6) TUGAS (CRUD + filter) ---------- */
$("#tf-status").innerHTML = STATUS.map(s => `<option>${s}</option>`).join("");
let taskFilter = "Semua";

// Label deadline: terlambat / segera / normal
function deadlineTag(t) {
  if (t.status === "Selesai") return `<span class="tag">Selesai</span>`;
  const diff = Math.round((new Date(t.deadline + "T00:00:00") - new Date(dateKey(new Date()) + "T00:00:00")) / 864e5);
  if (diff < 0) return `<span class="tag late">Terlambat</span>`;
  if (diff <= 3) return `<span class="tag warn">${diff === 0 ? "Hari ini" : diff + " hari lagi"}</span>`;
  return `<span class="tag">${diff} hari lagi</span>`;
}
function renderTasks() {
  const list = tasks.filter(t => taskFilter === "Semua" || t.status === taskFilter).sort((a, b) => a.deadline.localeCompare(b.deadline));
  $("#task-list").innerHTML = list.length ? list.map(t => `
    <div class="card ${t.status === "Selesai" ? "done" : ""}">
      <div class="item"><div><b class="tname">${esc(t.name)}</b><small>${esc(t.subject)} · Deadline ${longDate(t.deadline)}</small></div>${deadlineTag(t)}</div>
      ${t.desc ? `<p class="muted">${esc(t.desc)}</p>` : ""}
      <div class="row" style="margin-top:.5rem">
        <select data-status="${t.id}" aria-label="Status tugas">${STATUS.map(s => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select>
        <div class="acts"><button class="btn ghost small" data-act="edit-task" data-id="${t.id}">Edit</button><button class="btn danger small" data-act="del-task" data-id="${t.id}">Hapus</button></div>
      </div>
    </div>`).join("") : `<p class="empty">Tidak ada tugas di filter ini.</p>`;
}
$("#task-filter").addEventListener("click", e => {
  const b = e.target.closest("button[data-f]");
  if (!b) return;
  taskFilter = b.dataset.f;
  $$("#task-filter button").forEach(x => x.classList.toggle("active", x === b));
  renderTasks();
});
function openTask(t) {
  $("#task-title").textContent = t ? "Edit tugas" : "Tambah tugas";
  $("#tf-id").value = t ? t.id : "";
  $("#tf-name").value = t ? t.name : "";
  $("#tf-subject").value = t ? t.subject : "";
  $("#tf-deadline").value = t ? t.deadline : "";
  $("#tf-status").value = t ? t.status : STATUS[0];
  $("#tf-desc").value = t ? t.desc : "";
  $("#tf-err").textContent = "";
  $("#dlg-task").showModal();
}
$("#btn-add-task").addEventListener("click", () => openTask());
$("#f-task").addEventListener("submit", e => {
  e.preventDefault();
  const d = { name: $("#tf-name").value.trim(), subject: $("#tf-subject").value.trim(), deadline: $("#tf-deadline").value, status: $("#tf-status").value, desc: $("#tf-desc").value.trim() };
  let err = "";
  if (!d.name) err = "Nama tugas wajib diisi.";
  else if (!d.subject) err = "Mata pelajaran wajib diisi.";
  else if (!d.deadline) err = "Deadline wajib dipilih.";
  if (err) { $("#tf-err").textContent = err; return; }

  const id = $("#tf-id").value;
  if (id) { tasks = tasks.map(t => (t.id === id ? { ...t, ...d } : t)); toast("Tugas diperbarui"); }
  else { tasks.push({ id: uid(), ...d }); toast("Tugas ditambahkan"); }
  save(KEY.task, tasks);
  $("#dlg-task").close();
  renderAll();
});

// Ubah status langsung dari kartu tugas
document.addEventListener("change", e => {
  const sel = e.target.closest("[data-status]");
  if (!sel) return;
  tasks = tasks.map(t => (t.id === sel.dataset.status ? { ...t, status: sel.value } : t));
  save(KEY.task, tasks);
  toast("Status diperbarui");
  renderAll();
});

// Tombol Edit/Hapus (event delegation: satu listener untuk semua tombol)
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.act === "edit-sch") openSchedule(schedules.find(s => s.id === id));
  if (b.dataset.act === "edit-task") openTask(tasks.find(t => t.id === id));
  if (b.dataset.act === "del-sch" && confirm("Hapus jadwal ini?")) {
    schedules = schedules.filter(s => s.id !== id); save(KEY.sch, schedules); toast("Jadwal dihapus", "error"); renderAll();
  }
  if (b.dataset.act === "del-task" && confirm("Hapus tugas ini?")) {
    tasks = tasks.filter(t => t.id !== id); save(KEY.task, tasks); toast("Tugas dihapus", "error"); renderAll();
  }
});

/* ---------- 7) QUIZTIME ---------- */
let quiz = null; // { subject, cat, list, i, ans[], sec, timer }
$("#q-subject").innerHTML = Object.keys(BANK).map(s => `<option>${s}</option>`).join("");
const quizView = v => ["setup", "run", "done"].forEach(n => ($("#quiz-" + n).hidden = n !== v));

$("#btn-start").addEventListener("click", () => {
  const subject = $("#q-subject").value, cat = $("#q-cat").value;
  const list = BANK[subject].filter(q => cat === "Semua" || q.c === cat);
  if (!list.length) return toast("Belum ada soal untuk kategori ini", "error");
  if (quiz) clearInterval(quiz.timer);
  quiz = { subject, cat, list, i: 0, ans: Array(list.length).fill(null), sec: 0 };
  $("#q-time").textContent = "00:00";
  quiz.timer = setInterval(() => { quiz.sec++; $("#q-time").textContent = fmtTime(quiz.sec); }, 1000);
  quizView("run");
  renderQuestion();
});

function renderQuestion() {
  const q = quiz.list[quiz.i];
  $("#q-count").textContent = `Soal ${quiz.i + 1} dari ${quiz.list.length} · ${quiz.subject}`;
  $("#q-text").textContent = q.q;
  $("#q-options").innerHTML = q.o.map((t, n) =>
    `<button class="opt ${quiz.ans[quiz.i] === n ? "sel" : ""}" data-opt="${n}"><b>${"ABCD"[n]}.</b> ${esc(t)}</button>`).join("");
  $("#q-prev").disabled = quiz.i === 0;
  $("#q-next").textContent = quiz.i === quiz.list.length - 1 ? "Selesai" : "Berikutnya";
}
$("#q-options").addEventListener("click", e => {
  const b = e.target.closest("[data-opt]");
  if (!b) return;
  quiz.ans[quiz.i] = Number(b.dataset.opt);
  renderQuestion();
});
$("#q-prev").addEventListener("click", () => { quiz.i--; renderQuestion(); });
$("#q-next").addEventListener("click", () => {
  if (quiz.i < quiz.list.length - 1) { quiz.i++; renderQuestion(); return; }
  const blank = quiz.ans.filter(a => a === null).length;
  if (blank && !confirm(`${blank} soal belum dijawab. Tetap selesaikan?`)) return;
  finishQuiz();
});

function finishQuiz() {
  clearInterval(quiz.timer);
  const total = quiz.list.length;
  const correct = quiz.list.filter((q, n) => quiz.ans[n] === q.a).length;
  const score = Math.round((correct / total) * 100);
  results.unshift({ id: uid(), subject: quiz.subject, cat: quiz.cat, date: new Date().toISOString(), score, correct, total, sec: quiz.sec });
  save(KEY.res, results);
  toast("Hasil kuis tersimpan");

  $("#q-summary").innerHTML = `<h2>Hasil ${esc(quiz.subject)}</h2><div class="big">${score}</div>
    <p>Benar <b>${correct}</b> · Salah <b>${total - correct}</b> · Waktu <b>${fmtTime(quiz.sec)}</b></p>`;
  // Pembahasan setiap soal
  $("#q-review").innerHTML = quiz.list.map((q, n) => {
    const ok = quiz.ans[n] === q.a;
    const yours = quiz.ans[n] === null ? "Tidak dijawab" : "ABCD"[quiz.ans[n]] + ". " + q.o[quiz.ans[n]];
    return `<div class="card rv ${ok ? "ok" : ""}"><b>${n + 1}. ${esc(q.q)}</b>
      <p>Jawabanmu: ${esc(yours)} ${ok ? "✅" : "❌"}</p>
      <p>Jawaban benar: <b>${"ABCD"[q.a]}. ${esc(q.o[q.a])}</b></p>
      <p class="muted">Pembahasan: ${esc(q.e)}</p></div>`;
  }).join("");
  quizView("done");
  renderAll();
}
$("#btn-again").addEventListener("click", () => quizView("setup"));

/* ---------- 8) RIWAYAT KUIS ---------- */
function renderResults() {
  $("#res-list").innerHTML = results.length ? results.map(r => `
    <div class="card"><div class="item"><div><b>${esc(r.subject)}</b>
      <small>${new Date(r.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · ${r.correct} benar dari ${r.total}</small></div>
      <span class="tag ${r.score < 60 ? "late" : ""}">Nilai ${r.score}</span></div></div>`).join("")
    : `<p class="empty">Belum ada riwayat. Kerjakan kuis pertamamu di QuizTime.</p>`;
}
$("#btn-clear").addEventListener("click", () => {
  if (!results.length) return toast("Riwayat masih kosong", "error");
  if (!confirm("Hapus semua riwayat kuis?")) return;
  results = []; save(KEY.res, results); toast("Riwayat dihapus", "error"); renderAll();
});

lucide.createIcons();
/* ---------- 9) INIT ---------- */
renderAll();
