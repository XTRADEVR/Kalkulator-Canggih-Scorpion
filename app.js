/* Mesin kalkulator, riwayat, background IndexedDB, dan PWA */
"use strict";

const $ = (id) => document.getElementById(id);
const expressionEl = $("expression");
const resultEl = $("result");
let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let history = JSON.parse(localStorage.getItem("scorpionCalcHistory") || "[]");
let toastTimer;

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}
function render() {
  expressionEl.textContent = expression || "0";
  try {
    if (!expression) resultEl.textContent = "0";
    else {
      const value = evaluateExpression(expression);
      resultEl.textContent = Number.isFinite(value) ? formatNumber(value) : "Tidak terdefinisi";
    }
  } catch (_) {
    resultEl.textContent = expression ? "…" : "0";
  }
}
function formatNumber(n) {
  if (Math.abs(n) < 1e-12) n = 0;
  return Number(n.toPrecision(12)).toString();
}
function addValue(value) {
  if (value === "Ans") value = formatNumber(lastAnswer);
  if (expression === "0" && /^[0-9]$/.test(value)) expression = "";
  expression += value;
  render();
}
function clearAll() { expression = ""; render(); }
function backspace() { expression = expression.slice(0, -1); render(); }

/* Parser rekursif agar ekspresi tidak dieksekusi memakai eval(). */
function evaluateExpression(input) {
  const normalized = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = normalized.match(/(?:\d+\.?\d*|\.\d+)|(?:[a-zA-Z]+)|[()+\-*/^%!]/g) || [];
  const compact = normalized.replace(/\s/g, "");
  if (tokens.join("") !== compact) throw new Error("Token tidak valid");
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = take(), right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  function parseTerm() {
    let value = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const op = take(), right = parseUnary();
      if (op === "/" && right === 0) throw new Error("Pembagian dengan nol");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }
  function parseUnary() {
    if (peek() === "+") { take(); return parseUnary(); }
    if (peek() === "-") { take(); return -parseUnary(); }
    return parsePower();
  }
  function parsePower() {
    let value = parsePostfix();
    if (peek() === "^") { take(); value = Math.pow(value, parseUnary()); }
    return value;
  }
  function parsePostfix() {
    let value = parsePrimary();
    while (peek() === "!" || peek() === "%") {
      const op = take();
      if (op === "!") {
        if (value < 0 || !Number.isInteger(value) || value > 170) throw new Error("Faktorial hanya untuk bilangan bulat 0–170");
        let f = 1; for (let i = 2; i <= value; i++) f *= i;
        value = f;
      } else value /= 100;
    }
    return value;
  }
  function parsePrimary() {
    const token = take();
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") throw new Error("Kurung belum ditutup");
      return value;
    }
    if (/^\d*\.?\d+$/.test(token || "")) return Number(token);
    if (token === "pi") return Math.PI;
    if (token === "e") return Math.E;
    if (token === "Ans") return lastAnswer;
    if (["sin", "cos", "tan", "log", "ln", "sqrt"].includes(token)) {
      if (take() !== "(") throw new Error("Fungsi harus diikuti tanda kurung");
      const arg = parseExpression();
      if (take() !== ")") throw new Error("Kurung fungsi belum ditutup");
      if (token === "sqrt") { if (arg < 0) throw new Error("Akar negatif tidak real"); return Math.sqrt(arg); }
      if (token === "log") { if (arg <= 0) throw new Error("Log harus lebih dari nol"); return Math.log10(arg); }
      if (token === "ln") { if (arg <= 0) throw new Error("Ln harus lebih dari nol"); return Math.log(arg); }
      const radians = angleMode === "DEG" ? arg * Math.PI / 180 : arg;
      if (token === "tan" && Math.abs(Math.cos(radians)) < 1e-12) throw new Error("Tan tidak terdefinisi");
      return Math[token](radians);
    }
    throw new Error("Ekspresi belum lengkap");
  }
  if (!tokens.length) throw new Error("Kosong");
  const answer = parseExpression();
  if (pos !== tokens.length || !Number.isFinite(answer)) throw new Error("Ekspresi tidak valid");
  return answer;
}
function calculate() {
  if (!expression) return;
  try {
    const answer = evaluateExpression(expression);
    lastAnswer = answer;
    const record = { expression, answer: formatNumber(answer), time: new Date().toLocaleString("id-ID") };
    history.unshift(record);
    history = history.slice(0, 20);
    localStorage.setItem("scorpionCalcHistory", JSON.stringify(history));
    renderHistory();
    expression = formatNumber(answer);
    render();
  } catch (err) {
    showToast(err.message || "Perhitungan tidak valid");
  }
}
function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = '<p class="empty-state">Belum ada riwayat.</p>';
    return;
  }
  history.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const left = document.createElement("div");
    left.innerHTML = `<div class="history-expression"></div><small class="small-note"></small>`;
    left.querySelector(".history-expression").textContent = item.expression;
    left.querySelector("small").textContent = item.time;
    const right = document.createElement("button");
    right.className = "history-answer";
    right.textContent = "= " + item.answer;
    right.addEventListener("click", () => { expression = item.answer; render(); closePanels(); });
    row.append(left, right); list.append(row);
  });
}
function closePanels() {
  ["settingsPanel", "historyPanel", "backgroundPanel"].forEach(id => $(id).classList.add("hidden"));
}
function openPanel(id) { closePanels(); $(id).classList.remove("hidden"); }

/* Input tombol kalkulator */
$("keypad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.action === "clear") clearAll();
  else if (button.dataset.action === "backspace") backspace();
  else if (button.dataset.action === "calculate") calculate();
  else if (button.dataset.value) addValue(button.dataset.value);
});
$("historyToggle").addEventListener("click", () => { renderHistory(); openPanel("historyPanel"); });
$("settingsToggle").addEventListener("click", () => openPanel("settingsPanel"));
$("backgroundToggle").addEventListener("click", () => openPanel("backgroundPanel"));
$("angleToggle").addEventListener("click", () => {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  $("angleMode").textContent = angleMode;
  $("angleToggle").textContent = angleMode + " / DEG";
  render();
});
document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).classList.add("hidden")));
$("clearHistory").addEventListener("click", () => {
  history = []; localStorage.removeItem("scorpionCalcHistory"); renderHistory(); showToast("Riwayat dihapus");
});

/* Keyboard fisik bila perangkat mendukungnya */
document.addEventListener("keydown", (event) => {
  if (/^[0-9.]$/.test(event.key)) addValue(event.key);
  else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(event.key)) addValue(event.key);
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); }
  else if (event.key === "Backspace") backspace();
  else if (event.key === "Escape") clearAll();
});

/* IndexedDB menyimpan Blob gambar, bukan base64 di localStorage. */
const DB_NAME = "scorpion-calculator-db";
const STORE = "preferences";
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function dbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
/* Resize gambar sisi klien agar file besar lebih ringan. */
async function compressImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("File yang dipilih bukan gambar.");
  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    result => result ? resolve(result) : reject(new Error("Gagal mengompres gambar.")), "image/jpeg", 0.82
  ));
  return blob;
}
let currentObjectUrl = null;
function applyBackground(blob, fit = "cover") {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = blob ? URL.createObjectURL(blob) : null;
  if (blob) {
    document.body.style.setProperty("--custom-bg", `url("${currentObjectUrl}")`);
    document.body.style.setProperty("--bg-fit", fit === "contain" ? "contain" : "cover");
    document.body.classList.toggle("blur-mode", fit === "blur");
    $("imageStatus").textContent = "Background kustom aktif.";
  } else {
    document.body.style.removeProperty("--custom-bg");
    document.body.style.removeProperty("--bg-fit");
    document.body.classList.remove("blur-mode");
    $("imageStatus").textContent = "Background default aktif.";
  }
}
$("imagePicker").addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) { showToast("Pemilihan gambar dibatalkan."); return; }
  try {
    $("imageStatus").textContent = "Memproses gambar…";
    const compressed = await compressImage(file);
    await dbSet("background", compressed);
    applyBackground(compressed, $("fitMode").value);
    showToast("Background berhasil disimpan.");
  } catch (err) {
    showToast(err.message || "Tidak dapat membuka gambar.");
    $("imageStatus").textContent = "Gagal memuat gambar.";
  } finally {
    event.target.value = ""; // memungkinkan memilih file yang sama lagi
  }
});
$("fitMode").addEventListener("change", async () => {
  const blob = await dbGet("background");
  applyBackground(blob || null, $("fitMode").value);
  localStorage.setItem("scorpionBgFit", $("fitMode").value);
});
async function resetBackground() {
  try { await dbDelete("background"); applyBackground(null); showToast("Background dikembalikan."); }
  catch (_) { showToast("Gagal menghapus background."); }
}
$("resetBackground").addEventListener("click", resetBackground);
$("resetBackground2").addEventListener("click", resetBackground);
$("removeBackground").addEventListener("click", resetBackground);

(async function init() {
  try {
    const fit = localStorage.getItem("scorpionBgFit") || "cover";
    $("fitMode").value = fit;
    const saved = await dbGet("background");
    applyBackground(saved || null, fit);
  } catch (_) { showToast("Penyimpanan gambar tidak tersedia di browser ini."); }
  render(); renderHistory();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    try { await navigator.serviceWorker.register("./sw.js"); }
    catch (err) { console.warn("Service worker gagal didaftarkan:", err); }
  }
  $("connectionState").textContent = navigator.onLine ? "• ONLINE" : "• OFFLINE";
})();
window.addEventListener("online", () => $("connectionState").textContent = "• ONLINE");
window.addEventListener("offline", () => $("connectionState").textContent = "• OFFLINE");
