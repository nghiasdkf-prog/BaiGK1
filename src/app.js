// Danh sách ngôn ngữ theo yêu cầu
const supportedLanguages = [
  { code: "en", name: "English" },
  { code: "vi", name: "Vietnamese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "ru", name: "Russian" },
  { code: "th", name: "Thai" },
];

/** DOM <select> — luôn dùng .value khi gửi API, không truyền cả element. */
const sourceLangEl = document.getElementById("sourceLang");
const targetLangEl = document.getElementById("targetLang");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const swapBtn = document.getElementById("swapBtn");
const loading = document.getElementById("loading");
const errorMsg = document.getElementById("errorMsg");
const toggleDark = document.getElementById("toggleDark");
const charCounter = document.getElementById("charCounter");
const speakInputBtn = document.getElementById("speakInputBtn");
const speakOutputBtn = document.getElementById("speakOutputBtn");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const retryBtn = document.getElementById("retryBtn");
const autoTranslateToggle = document.getElementById("autoTranslateToggle");
const pauseAutoBtn = document.getElementById("pauseAutoBtn");
const detectedLang = document.getElementById("detectedLang");
const cacheBadge = document.getElementById("cacheBadge");
const ttsRate = document.getElementById("ttsRate");
const ttsPitch = document.getElementById("ttsPitch");
const ttsVolume = document.getElementById("ttsVolume");
const ttsRateValue = document.getElementById("ttsRateValue");
const ttsPitchValue = document.getElementById("ttsPitchValue");
const ttsVolumeValue = document.getElementById("ttsVolumeValue");
const ttsVoiceInputOverride = document.getElementById("ttsVoiceInputOverride");
const ttsVoiceOutputOverride = document.getElementById("ttsVoiceOutputOverride");
const ttsPlayPauseBtn = document.getElementById("ttsPlayPauseBtn");
const ttsStopBtn = document.getElementById("ttsStopBtn");
const ttsDebug = document.getElementById("ttsDebug");
const ttsActiveVoice = document.getElementById("ttsActiveVoice");
const ttsVoiceWarn = document.getElementById("ttsVoiceWarn");
const historyFilterLang = document.getElementById("historyFilterLang");
const toast = document.getElementById("toast");
const voiceInputBtn = document.getElementById("voiceInputBtn");
const downloadBtn = document.getElementById("downloadBtn");
const fileTxtInput = document.getElementById("fileTxtInput");
const favoriteCurrentBtn = document.getElementById("favoriteCurrentBtn");
const realtimeLangEl = document.getElementById("realtimeLang");
const tabHistoryBtn = document.getElementById("tabHistoryBtn");
const tabFavoritesBtn = document.getElementById("tabFavoritesBtn");
const tabPanelHistory = document.getElementById("tabPanelHistory");
const tabPanelFavorites = document.getElementById("tabPanelFavorites");
const historyToolbar = document.getElementById("historyToolbar");
const favoritesToolbar = document.getElementById("favoritesToolbar");
const favoritesList = document.getElementById("favoritesList");
const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");

const HISTORY_KEY = "translationHistory";
const HISTORY_MAX = 10;
const CACHE_KEY = "translationCacheV1";
const FAVORITES_KEY = "translationFavoritesV1";
const FAVORITES_MAX = 40;
const DETECTION_CACHE_KEY = "detectionCacheV1";

let autoTranslateTimer = null;
let isAutoPaused = false;
let lastRequestPayload = null;
let currentController = null;
let toastTimer = null;
let realtimeDetectTimer = null;
let detectController = null;
let recognitionInstance = null;
let isVoiceListening = false;

/** Cache voices sau khi engine load (Chrome/Edge load bất đồng bộ). */
let cachedVoices = [];
let ttsVoicesReady = false;
/** Khóa UI TTS khi đang gọi API dịch. */
let ttsBlocked = false;
/** Lần đọc gần nhất — dùng cho Replay. */
let lastTtsPayload = null;
let currentTtsSlot = "output";

/** === ADVANCED AUTO LANGUAGE DETECTION === */
/** Regex patterns để phát hiện ngôn ngữ cục bộ */
const LANGUAGE_PATTERNS = {
  // Vietnamese: Ư, ư, Ơ, ơ, ă, Ă, đ, Đ, ặ, Ặ, etc.
  vi: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi,
  // Chinese: CJK Unified Ideographs range
  zh: /[\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF]/g,
  // Japanese Hiragana/Katakana
  ja: /[\u3040-\u309F\u30A0-\u30FF]/g,
  // Korean Hangul
  ko: /[\uAC00-\uD7AF\u1100-\u11FF]/g,
  // Russian Cyrillic
  ru: /[а-яёА-ЯЁ]/g,
  // Thai
  th: /[\u0E00-\u0E7F]/g,
};

/**
 * Phát hiện ngôn ngữ cục bộ bằng regex patterns
 * @param {string} text - Text cần phát hiện
 * @returns {object} { language: code, confidence: 0-1 }
 */
function detectLanguageLocally(text) {
  if (!text || text.length < 3) {
    console.log("DETECT: Text quá ngắn, không phát hiện");
    return { language: null, confidence: 0 };
  }

  let maxMatches = 0;
  let detectedLang = null;
  const results = {};

  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = (text.match(pattern) || []).length;
    results[lang] = matches;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedLang = lang;
    }
  }

  const textLength = text.length;
  const confidence = maxMatches / textLength;

  console.log(`DETECT: Local detection - lang=${detectedLang}, confidence=${confidence.toFixed(2)}, matches=${maxMatches}/${textLength}`, results);
  
  // Chỉ trả về kết quả nếu confidence > 0.15 (15% ký tự phù hợp)
  if (confidence > 0.15) {
    return { language: detectedLang, confidence, local: true };
  }

  console.log("DETECT: Confidence quá thấp, cần API detection");
  return { language: null, confidence: 0, local: true };
}

/**
 * Cache detection kết quả
 */
function getDetectionCache() {
  try {
    return JSON.parse(localStorage.getItem(DETECTION_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setDetectionCache(text, lang) {
  const key = text.slice(0, 50); // Dùng 50 ký tự đầu làm key
  const cache = getDetectionCache();
  cache[key] = { lang, timestamp: Date.now() };
  localStorage.setItem(DETECTION_CACHE_KEY, JSON.stringify(cache));
  console.log(`DETECT: Cached detection - key="${key}", lang="${lang}"`);
}

function checkDetectionCache(text) {
  const key = text.slice(0, 50);
  const cache = getDetectionCache();
  const cached = cache[key];
  if (cached) {
    console.log(`DETECT: Cache hit - key="${key}", lang="${cached.lang}"`);
    return cached.lang;
  }
  return null;
}

/**
 * API Detection fallback (dùng LibreTranslate với source=auto)
 */
async function detectLanguageViaAPI(text) {
  console.log("DETECT: Gọi API detection...");
  try {
    const payload = {
      q: text,
      source: "auto",
      target: "en",
      format: "text",
    };
    const res = await fetch("https://translate.argosopentech.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const detectedLang = data.detected?.language;
    console.log(`DETECT: API detection result - lang="${detectedLang}"`);
    
    if (detectedLang) {
      setDetectionCache(text, detectedLang);
      return detectedLang;
    }
  } catch (e) {
    console.error("DETECT: API error -", e);
  }
  return null;
}

/**
 * Advanced Auto Detect: Local first, then API fallback
 */
async function advancedAutoDetect(text) {
  console.log("DETECT: Bắt đầu advanced auto-detect");
  
  // 1. Check cache trước
  const cached = checkDetectionCache(text);
  if (cached) return cached;

  // 2. Local detection first
  const local = detectLanguageLocally(text);
  if (local.language && local.confidence > 0.15) {
    setDetectionCache(text, local.language);
    return local.language;
  }

  // 3. API fallback
  const apiDetected = await detectLanguageViaAPI(text);
  return apiDetected || "en"; // Fallback to English
}
/** === END ADVANCED AUTO DETECTION === */

function createLangOption(lang) {
  const option = document.createElement("option");
  option.value = lang.code;
  option.textContent = `${lang.name} (${lang.code})`;
  return option;
}

// Render option cho cả source và target
for (const lang of supportedLanguages) {
  sourceLangEl.appendChild(createLangOption(lang));
  targetLangEl.appendChild(createLangOption(lang));
  historyFilterLang.appendChild(createLangOption(lang));
}
sourceLangEl.value = "auto";
targetLangEl.value = "vi";

function setLoading(isLoading) {
  translateBtn.disabled = isLoading;
  ttsBlocked = isLoading;
  speakInputBtn.disabled = isLoading;
  speakOutputBtn.disabled = isLoading;
  if (isLoading) {
    window.speechSynthesis?.cancel();
  }
  loading.classList.toggle("hidden", !isLoading);
  loading.classList.toggle("flex", isLoading);
  applyTtsReadyState();
}

function showToast(message, kind = "info") {
  toast.textContent = message;
  toast.classList.remove("hidden", "bg-rose-700", "bg-emerald-700", "bg-slate-900", "text-white");
  toast.classList.add("text-white");
  if (kind === "error") {
    toast.classList.add("bg-rose-700");
  } else if (kind === "success") {
    toast.classList.add("bg-emerald-700");
  } else {
    toast.classList.add("bg-slate-900");
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function setError(message = "") {
  if (message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove("hidden");
    showToast(message, "error");
  } else {
    errorMsg.textContent = "";
    errorMsg.classList.add("hidden");
  }
}

function setDetectedLanguage(code = "-") {
  detectedLang.textContent = `Detected: ${code || "-"}`;
}

function setRealtimeLanguageDisplay(label) {
  realtimeLangEl.textContent = `Realtime: ${label}`;
}

function setCacheBadge(show) {
  cacheBadge.classList.toggle("hidden", !show);
}

/** Khóa ổn định để so sánh favorite / trùng lặp. */
function favoriteKeyFromParts(input, output, source, target) {
  return `${source}|${target}|${input}|${output}`;
}

function getFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list.slice(0, FAVORITES_MAX)));
}

function isFavoriteItem(item) {
  const k = favoriteKeyFromParts(item.input, item.output, item.source, item.target);
  return getFavorites().some((x) => favoriteKeyFromParts(x.input, x.output, x.source, x.target) === k);
}

function toggleFavoriteFromHistory(item) {
  const list = getFavorites();
  const k = favoriteKeyFromParts(item.input, item.output, item.source, item.target);
  const idx = list.findIndex((x) => favoriteKeyFromParts(x.input, x.output, x.source, x.target) === k);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveFavorites(list);
    showToast("Da xoa khoi favorites.", "info");
  } else {
    list.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      input: item.input,
      output: item.output,
      source: item.source,
      target: item.target,
      detected: item.detected,
      timestamp: Date.now(),
    });
    saveFavorites(list);
    showToast("Da them vao favorites.", "success");
  }
  renderFavoritesList();
  renderHistory();
}

function applyEntryToUI(item) {
  sourceLangEl.value = item.source;
  targetLangEl.value = item.target;
  inputText.value = item.input;
  outputText.value = item.output;
  updateCharacterCounter();
  setError("");
  setDetectedLanguage(item.detected || "-");
  scheduleRealtimeDetect();
}

function renderFavoritesList() {
  const list = getFavorites().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  favoritesList.innerHTML = "";
  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.className = "text-xs text-slate-500 dark:text-slate-400";
    empty.textContent = "Chưa có mục yêu thích.";
    favoritesList.appendChild(empty);
    return;
  }
  for (const item of list) {
    const li = document.createElement("li");
    li.className = "rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-800 dark:bg-amber-950/40";
    const meta = document.createElement("div");
    meta.className = "mb-1 flex items-center justify-between gap-2";
    const pair = document.createElement("p");
    pair.className = "text-xs text-amber-800 dark:text-amber-200";
    pair.textContent = `${item.source} → ${item.target}`;
    const time = document.createElement("p");
    time.className = "text-xs text-slate-500 dark:text-slate-400";
    time.textContent = new Date(item.timestamp).toLocaleString();
    meta.append(pair, time);
    const inEl = document.createElement("p");
    inEl.className = "text-sm font-medium truncate";
    inEl.textContent = item.input;
    const outEl = document.createElement("p");
    outEl.className = "mb-2 text-xs truncate text-slate-700 dark:text-slate-300";
    outEl.textContent = item.output;
    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";
    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => applyEntryToUI(item));
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => {
      saveFavorites(getFavorites().filter((x) => x.id !== item.id));
      renderFavoritesList();
      renderHistory();
      showToast("Da xoa favorites.", "info");
    });
    actions.append(useBtn, delBtn);
    li.append(meta, inEl, outEl, actions);
    favoritesList.appendChild(li);
  }
}

function favoriteCurrentTranslation() {
  const input = inputText.value.trim();
  const output = outputText.value.trim();
  if (!input || !output) {
    setError("Can co ca van ban nguon va ket qua de luu favorites.");
    return;
  }
  const entry = {
    input,
    output,
    source: sourceLangEl.value,
    target: targetLangEl.value,
    detected: detectedLang.textContent.replace(/^Detected:\s*/i, "").trim(),
  };
  if (isFavoriteItem(entry)) {
    showToast("Ban dich nay da co trong favorites.", "info");
    return;
  }
  const list = getFavorites();
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    ...entry,
    timestamp: Date.now(),
  });
  saveFavorites(list);
  renderFavoritesList();
  renderHistory();
  showToast("Da luu vao favorites.", "success");
}

function downloadTranslatedTxt() {
  const text = outputText.value;
  if (!text.trim()) {
    setError("Chua co ket qua de tai xuong.");
    return;
  }
  // UTF-8 + BOM giup Notepad Windows hien thi dung.
  const blob = new Blob(["\uFEFF", text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "translated.txt";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setError("");
  showToast("Da tai translated.txt (UTF-8).", "success");
}

function handleTxtUpload(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const raw = String(reader.result ?? "");
    inputText.value = raw.replace(/\r\n/g, "\n").slice(0, 5000);
    updateCharacterCounter();
    scheduleRealtimeDetect();
    scheduleAutoTranslate();
    showToast("Da nap file .txt vao o nhap.", "success");
  };
  reader.onerror = () => setError("Khong doc duoc file.");
  reader.readAsText(file, "UTF-8");
}

/** Map mã ngôn ngữ sang locale cho SpeechRecognition. */
function recognitionLocaleFromSource(code) {
  if (code === "auto") return "en-US";
  const map = {
    en: "en-US",
    vi: "vi-VN",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    th: "th-TH",
  };
  return map[code] || "en-US";
}

function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    voiceInputBtn.disabled = true;
    voiceInputBtn.title = "Trình duyệt không hỗ trợ nhận diện giọng nói.";
    return;
  }
  recognitionInstance = new SR();
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = recognitionLocaleFromSource(sourceLangEl.value);

  recognitionInstance.onresult = (ev) => {
    let chunk = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      if (ev.results[i].isFinal) {
        chunk += ev.results[i][0].transcript;
      }
    }
    if (!chunk) return;
    const cur = inputText.value;
    const sep = cur && !/\s$/.test(cur) ? " " : "";
    inputText.value = (cur + sep + chunk).slice(0, 5000);
    updateCharacterCounter();
    scheduleRealtimeDetect();
    scheduleAutoTranslate();
  };

  recognitionInstance.onerror = (ev) => {
    showToast(`Lỗi microphone: ${ev.error}`, "error");
    stopVoiceInput();
  };

  recognitionInstance.onend = () => {
    isVoiceListening = false;
    voiceInputBtn.classList.remove("ring-2", "ring-rose-500", "ring-offset-2");
  };
}

function startVoiceInput() {
  if (!recognitionInstance) return;
  try {
    recognitionInstance.lang = recognitionLocaleFromSource(sourceLangEl.value);
    recognitionInstance.start();
    isVoiceListening = true;
    voiceInputBtn.classList.add("ring-2", "ring-rose-500", "ring-offset-2");
    showToast("Dang nghe...", "info");
  } catch {
    showToast("Khong the bat microphone.", "error");
  }
}

function stopVoiceInput() {
  if (!recognitionInstance || !isVoiceListening) return;
  try {
    recognitionInstance.stop();
  } catch {
    /* ignore */
  }
  isVoiceListening = false;
  voiceInputBtn.classList.remove("ring-2", "ring-rose-500", "ring-offset-2");
}

function toggleVoiceInput() {
  if (!recognitionInstance) {
    setError("Trinh duyet khong ho tro SpeechRecognition.");
    return;
  }
  if (isVoiceListening) stopVoiceInput();
  else startVoiceInput();
}

/** Gọi API nhẹ (mẫu ngắn) để đoán ngôn ngữ khi đang gõ — debounce để tránh spam. */
function scheduleRealtimeDetect() {
  clearTimeout(realtimeDetectTimer);
  if (sourceLangEl.value !== "auto") {
    console.log(`REALTIME_DETECT: Skipped - source is fixed to "${sourceLangEl.value}"`);
    setRealtimeLanguageDisplay(`${sourceLangEl.value} (nguồn cố định)`);
    return;
  }
  const raw = inputText.value.trim();
  if (raw.length < 3) {
    console.log("REALTIME_DETECT: Input too short");
    setRealtimeLanguageDisplay("-");
    return;
  }
  console.log(`REALTIME_DETECT: Scheduling in 500ms`);
  realtimeDetectTimer = setTimeout(() => runRealtimeLanguageDetect(raw.slice(0, 280)), 500);
}

async function runRealtimeLanguageDetect(sample) {
  if (detectController) detectController.abort();
  detectController = new AbortController();
  setRealtimeLanguageDisplay("...");
  
  try {
    console.log(`REALTIME_DETECT: Sample="${sample.substring(0, 50)}..."`);
    
    // Try advanced local detection first
    const local = detectLanguageLocally(sample);
    if (local.language && local.confidence > 0.15) {
      console.log(`REALTIME_DETECT: Local detection success - "${local.language}" (confidence=${local.confidence.toFixed(2)})`);
      setRealtimeLanguageDisplay(local.language);
      return;
    }

    const tgt = targetLangEl.value;
    console.log("REALTIME_DETECT: Local detection uncertain, calling API");
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sample)}&langpair=auto|${tgt}`;
    const res = await fetch(url, { signal: detectController.signal });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const det =
      data?.responseData?.detectedLanguage ||
      data?.responseData?.ld_src ||
      data?.ld_result?.source_language ||
      data?.responseData?.ld_result?.source_language ||
      null;
    if (det && typeof det === "string") {
      console.log(`REALTIME_DETECT: API detection result - "${det}"`);
      setRealtimeLanguageDisplay(det);
    } else {
      console.log("REALTIME_DETECT: API no result");
      setRealtimeLanguageDisplay("(không xác định)");
    }
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("REALTIME_DETECT: Request aborted");
      return;
    }
    console.error("REALTIME_DETECT: Error -", err);
    setRealtimeLanguageDisplay("(lỗi mạng)");
  }
}

function setActiveTab(which) {
  const isHistory = which === "history";
  const activeCls =
    "rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:bg-slate-700 dark:text-slate-100";
  const idleCls =
    "rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800";
  tabHistoryBtn.className = isHistory ? activeCls : idleCls;
  tabFavoritesBtn.className = !isHistory ? activeCls : idleCls;
  tabPanelHistory.classList.toggle("hidden", !isHistory);
  tabPanelFavorites.classList.toggle("hidden", isHistory);
  historyToolbar.classList.toggle("hidden", !isHistory);
  favoritesToolbar.classList.toggle("hidden", isHistory);
}

function updateCharacterCounter() {
  charCounter.textContent = `${inputText.value.length}/5000`;
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
}

function renderHistory() {
  const filter = historyFilterLang.value;
  const history = getHistory().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const filtered = filter === "all" ? history : history.filter((x) => x.source === filter || x.target === filter);
  historyList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "text-xs text-slate-500 dark:text-slate-400";
    empty.textContent = "Chưa có lịch sử dịch.";
    historyList.appendChild(empty);
    return;
  }

  for (const item of filtered) {
    const li = document.createElement("li");
    li.className = "rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-900";

    const row1 = document.createElement("div");
    row1.className = "mb-1 flex items-center justify-between gap-2";
    const pair = document.createElement("p");
    pair.className = "text-xs text-slate-500 dark:text-slate-400";
    pair.textContent = `${item.source} → ${item.target}`;
    const time = document.createElement("p");
    time.className = "text-xs text-slate-500 dark:text-slate-400";
    time.textContent = new Date(item.timestamp).toLocaleString();
    row1.append(pair, time);

    const inEl = document.createElement("p");
    inEl.className = "text-sm font-medium truncate";
    inEl.textContent = item.input;
    const outEl = document.createElement("p");
    outEl.className = "mb-2 text-xs truncate text-slate-600 dark:text-slate-300";
    outEl.textContent = item.output;

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap items-center gap-2";

    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = "rounded border border-amber-400 px-2 py-1 text-sm text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950";
    starBtn.title = "Thêm / bỏ favorites";
    starBtn.textContent = isFavoriteItem(item) ? "★" : "☆";
    starBtn.addEventListener("click", () => toggleFavoriteFromHistory(item));

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => applyEntryToUI(item));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteHistoryItem(item.id));

    actions.append(starBtn, useBtn, delBtn);
    li.append(row1, inEl, outEl, actions);
    historyList.appendChild(li);
  }
}

function pushHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  const unique = [];
  const seen = new Set();
  for (const item of history) {
    const key = `${item.input}|${item.output}|${item.source}|${item.target}`;
    if (!seen.has(key)) {
      unique.push(item);
      seen.add(key);
    }
  }
  saveHistory(unique);
  renderHistory();
}

function deleteHistoryItem(id) {
  const list = getHistory().filter((x) => x.id !== id);
  saveHistory(list);
  renderHistory();
}

function getCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function cacheKey(text, source, target) {
  return `${source}|${target}|${text}`;
}

function getCachedTranslation(text, source, target) {
  const cache = getCache();
  return cache[cacheKey(text, source, target)] || null;
}

function setCachedTranslation(text, source, target, payload) {
  const cache = getCache();
  cache[cacheKey(text, source, target)] = payload;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function applyTtsReadyState() {
  const lock = ttsBlocked || !ttsVoicesReady;
  ttsVoiceInputOverride.disabled = lock;
  ttsVoiceOutputOverride.disabled = lock;
  ttsPlayPauseBtn.disabled = lock;
  ttsStopBtn.disabled = lock;
}

function refreshVoicesCache() {
  if (!("speechSynthesis" in window)) {
    cachedVoices = [];
    ttsVoicesReady = false;
    return;
  }
  cachedVoices = window.speechSynthesis.getVoices() || [];
  ttsVoicesReady = cachedVoices.length > 0;
}

/** Chuẩn BCP-47 ưu tiên cho khớp voice (vd vi → vi-VN). */
function resolveLangBcp47(langCode) {
  if (!langCode || langCode === "auto") return "en-US";
  const map = {
    en: "en-US",
    vi: "vi-VN",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    ru: "ru-RU",
    th: "th-TH",
  };
  return map[langCode] || `${langCode}-${langCode.toUpperCase()}`;
}

/**
 * Chọn voice: exact lang → prefix (xx-YY / xx) → English → đầu danh sách.
 * Trả về { voice, utterLang, usedEnglishFallback }.
 */
function pickBestVoiceForLang(langCode) {
  refreshVoicesCache();
  const primary = resolveLangBcp47(langCode === "auto" ? "en" : langCode).toLowerCase();
  const base = primary.split("-")[0];
  const voices = cachedVoices;
  if (!voices.length) {
    return { voice: null, utterLang: primary, usedEnglishFallback: true };
  }
  const exact = voices.find((v) => v.lang && v.lang.toLowerCase() === primary);
  if (exact) {
    return { voice: exact, utterLang: exact.lang, usedEnglishFallback: false };
  }
  const prefixRegion = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(`${base}-`));
  if (prefixRegion) {
    return { voice: prefixRegion, utterLang: prefixRegion.lang, usedEnglishFallback: false };
  }
  const prefixBare = voices.find((v) => v.lang && v.lang.toLowerCase() === base);
  if (prefixBare) {
    return { voice: prefixBare, utterLang: prefixBare.lang, usedEnglishFallback: false };
  }
  const en =
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en-us")) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en")) ||
    voices[0];
  return { voice: en, utterLang: primary, usedEnglishFallback: true };
}

function setTtsVoiceWarnVisible(show) {
  ttsVoiceWarn.classList.toggle("hidden", !show);
}

function fillVoiceSelect(selectEl, langCode, restoreUri) {
  const base = (langCode === "auto" ? "en" : langCode).toLowerCase().split("-")[0];
  const sorted = [...cachedVoices].sort((a, b) => {
    const al = (a.lang || "").toLowerCase();
    const bl = (b.lang || "").toLowerCase();
    const rank = (l) => {
      if (!l) return 3;
      if (l === base || l.startsWith(`${base}-`)) return 0;
      if (l.startsWith(base)) return 1;
      return 2;
    };
    const d = rank(al) - rank(bl);
    if (d !== 0) return d;
    return (a.name || "").localeCompare(b.name || "");
  });

  selectEl.innerHTML = "";
  const autoOpt = document.createElement("option");
  autoOpt.value = "";
  autoOpt.textContent =
    langCode === "auto" ? "Auto (gợi ý theo en khi Auto)" : `Auto (ưu tiên ${base})`;
  selectEl.appendChild(autoOpt);
  for (const v of sorted) {
    const opt = document.createElement("option");
    opt.value = v.voiceURI;
    opt.textContent = `${v.name || "Voice"} — ${v.lang || "?"}`;
    selectEl.appendChild(opt);
  }
  if (restoreUri && [...selectEl.options].some((o) => o.value === restoreUri)) {
    selectEl.value = restoreUri;
  }
}

function repopulateVoiceSelects() {
  refreshVoicesCache();
  const inUri = ttsVoiceInputOverride.value;
  const outUri = ttsVoiceOutputOverride.value;
  fillVoiceSelect(ttsVoiceInputOverride, sourceLangEl.value, inUri);
  fillVoiceSelect(ttsVoiceOutputOverride, targetLangEl.value, outUri);
  applyTtsReadyState();
}

function attachUtteranceHandlers(utterance, slot) {
  utterance.onboundary = (e) => {
    if (typeof e.charIndex !== "number") return;
    const ta = slot === "output" ? outputText : inputText;
    try {
      const len = e.charLength > 0 ? e.charLength : 1;
      const end = Math.min(e.charIndex + len, ta.value.length);
      ta.focus();
      ta.setSelectionRange(e.charIndex, end);
    } catch (_) {
      /* readonly hoặc trình duyệt không hỗ trợ selection */
    }
  };
  utterance.onend = () => {
    try {
      inputText.setSelectionRange(inputText.value.length, inputText.value.length);
      outputText.setSelectionRange(outputText.value.length, outputText.value.length);
    } catch (_) {}
    applyTtsReadyState();
  };
  utterance.onerror = () => {
    applyTtsReadyState();
  };
}

function speakText(text, langCode, slot = "output") {
  if (!("speechSynthesis" in window)) {
    setError("Trình duyệt không hỗ trợ Text-to-Speech.");
    return;
  }
  refreshVoicesCache();
  if (!ttsVoicesReady) {
    setError("Đang tải danh sách giọng — thử lại sau vài giây (Chrome/Edge).");
    return;
  }
  const value = text.trim();
  if (!value) {
    setError("Không có nội dung để đọc.");
    return;
  }
  setError("");
  const synth = window.speechSynthesis;
  synth.cancel();

  currentTtsSlot = slot;
  const effectiveLang = langCode === "auto" ? "en" : langCode;
  lastTtsPayload = { text: value, langCode, slot };

  const utterance = new SpeechSynthesisUtterance(value);
  utterance.rate = Number(ttsRate.value);
  utterance.pitch = Number(ttsPitch.value);
  utterance.volume = Number(ttsVolume.value);

  const overrideUri = slot === "input" ? ttsVoiceInputOverride.value : ttsVoiceOutputOverride.value;
  let chosenName = "";

  if (overrideUri) {
    const manual = cachedVoices.find((v) => v.voiceURI === overrideUri);
    if (manual) {
      utterance.voice = manual;
      utterance.lang = manual.lang || resolveLangBcp47(effectiveLang);
      setTtsVoiceWarnVisible(false);
      chosenName = manual.name || "";
    } else {
      const pick = pickBestVoiceForLang(effectiveLang);
      if (!pick.voice) {
        setError("Không có voice khả dụng (override không tìm thấy).");
        setTtsVoiceWarnVisible(true);
        return;
      }
      utterance.voice = pick.voice;
      utterance.lang = pick.usedEnglishFallback ? pick.utterLang : pick.voice.lang || pick.utterLang;
      setTtsVoiceWarnVisible(pick.usedEnglishFallback);
      if (pick.usedEnglishFallback) {
        showToast("Voice not available — using English voice with lang tag.", "info");
      }
      chosenName = pick.voice.name || "";
    }
  } else {
    const pick = pickBestVoiceForLang(effectiveLang);
    if (!pick.voice) {
      setError("Không có voice khả dụng trên trình duyệt.");
      setTtsVoiceWarnVisible(true);
      return;
    }
    utterance.voice = pick.voice;
    if (pick.usedEnglishFallback) {
      utterance.lang = pick.utterLang;
      setTtsVoiceWarnVisible(true);
      showToast("Voice not available — using English voice with lang tag.", "info");
    } else {
      utterance.lang = pick.voice.lang || pick.utterLang;
      setTtsVoiceWarnVisible(false);
    }
    chosenName = pick.voice.name || "";
  }

  if (!utterance.voice) {
    setError("Không gán được voice để đọc.");
    setTtsVoiceWarnVisible(true);
    return;
  }

  attachUtteranceHandlers(utterance, slot);
  ttsActiveVoice.textContent = `Voice: ${chosenName || "—"}`;
  ttsActiveVoice.title = chosenName;

  if (ttsDebug.checked) {
    console.log("[TTS] speaking with", { name: chosenName, utterLang: utterance.lang, uri: utterance.voice?.voiceURI });
  }

  synth.speak(utterance);
  applyTtsReadyState();
}

function ttsPlayPauseResume() {
  const s = window.speechSynthesis;
  if (!s || !ttsVoicesReady || ttsBlocked) return;
  if (s.speaking && !s.paused) s.pause();
  else if (s.paused) s.resume();
  else if (lastTtsPayload) {
    speakText(lastTtsPayload.text, lastTtsPayload.langCode, lastTtsPayload.slot);
  }
}

function ttsStopPlayback() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  try {
    inputText.setSelectionRange(inputText.value.length, inputText.value.length);
    outputText.setSelectionRange(outputText.value.length, outputText.value.length);
  } catch (_) {}
  applyTtsReadyState();
}

let ttsLabelIntervalStarted = false;
function initSpeechSynthesisVoices() {
  if (!("speechSynthesis" in window)) return;
  refreshVoicesCache();
  repopulateVoiceSelects();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoicesCache();
    repopulateVoiceSelects();
    if (ttsDebug.checked) {
      console.log("[TTS voices]", cachedVoices.length, cachedVoices);
    }
  };
  if (!ttsLabelIntervalStarted) {
    ttsLabelIntervalStarted = true;
    setInterval(() => {
      if (!window.speechSynthesis) return;
      const syn = window.speechSynthesis;
      if (syn.speaking && !syn.paused) ttsPlayPauseBtn.textContent = "Pause";
      else if (syn.paused) ttsPlayPauseBtn.textContent = "Resume";
      else ttsPlayPauseBtn.textContent = "Replay";
    }, 250);
  }
  // Chrome đôi khi trả voices sau vài trăm ms — làm mới thêm một lần.
  setTimeout(() => {
    refreshVoicesCache();
    repopulateVoiceSelects();
  }, 400);
}

async function translateText(payload) {
  const text = (payload?.text ?? inputText.value).trim();
  // Chuỗi từ <select>, không bao giờ truyền DOM element vào langpair / cache.
  const sourceRaw = payload?.source ?? sourceLangEl.value ?? "auto";
  const targetRaw = payload?.target ?? targetLangEl.value ?? "vi";
  const source = String(sourceRaw).trim() || "auto";
  const target = String(targetRaw).trim() || "vi";
  
  console.log(`TRANSLATE_TEXT: text="${text.substring(0, 50)}...", source="${source}", target="${target}"`);

  setError("");
  outputText.value = "";
  setCacheBadge(false);
  retryBtn.classList.add("hidden");

  if (!text) {
    setError("Vui lòng nhập văn bản trước khi dịch.");
    console.log("TRANSLATE_TEXT: Input empty");
    return;
  }

  if (source === target) {
    outputText.value = text;
    setDetectedLanguage(source);
    console.log("TRANSLATE_TEXT: source === target, skip");
    return;
  }

  // Ưu tiên dùng cache để giảm số lần gọi API.
  const cached = getCachedTranslation(text, source, target);
  if (cached) {
    outputText.value = cached.output;
    setDetectedLanguage(cached.detected || "-");
    setCacheBadge(true);
    console.log(`TRANSLATE_TEXT: Cache hit - detected="${cached.detected || source}"`);
    showToast("Da dung ban dich tu cache.", "success");
    highlightOutput();
    return;
  }

  // Hủy request cũ để tránh bản dịch bị ghi đè bởi response chậm.
  if (currentController) {
    currentController.abort();
  }
  currentController = new AbortController();
  setLoading(true);
  lastRequestPayload = { text, source, target };

  try {
    let actualSource = source;
    
    // Advanced Auto Detect: nếu source = auto, phát hiện ngôn ngữ thực
    if (source === "auto") {
      console.log("TRANSLATE_TEXT: source=auto, running advanced detection");
      actualSource = await advancedAutoDetect(text);
      console.log(`TRANSLATE_TEXT: Advanced detection result: "${actualSource}"`);
    }

    // Skip if detected === target
    if (actualSource === target) {
      console.log(`TRANSLATE_TEXT: Detected === target (${actualSource}), skip translation`);
      outputText.value = text;
      setDetectedLanguage(actualSource);
      setCachedTranslation(text, source, target, { output: text, detected: actualSource });
      return;
    }

    console.log(`TRANSLATE_TEXT: Calling API with source="${actualSource}"`);
    const encodedText = encodeURIComponent(text);
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${actualSource}|${target}`;

    const res = await fetch(endpoint, { signal: currentController.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    const detected = data?.responseData?.match ? actualSource : data?.responseData?.detectedLanguage || actualSource;

    if (!translated) {
      throw new Error("No translation result");
    }

    console.log(`TRANSLATE_TEXT: API success - detected="${detected}", result="${translated.substring(0, 50)}..."`);

    outputText.value = translated;
    setDetectedLanguage(source === "auto" ? detected : actualSource);
    setCachedTranslation(text, source, target, { output: translated, detected: source === "auto" ? detected : actualSource });
    pushHistory({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      input: text,
      output: translated,
      source,
      target,
      detected: source === "auto" ? detected : actualSource,
      timestamp: Date.now(),
    });
    highlightOutput();
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("TRANSLATE_TEXT: Request aborted");
      return;
    }
    console.error("TRANSLATE_TEXT: Error -", error);
    // Fallback khi API lỗi để người dùng không bị mất trải nghiệm
    outputText.value = "Khong the dich luc nay. Vui long thu lai sau.";
    setError(`Dich that bai: ${error.message}`);
    retryBtn.classList.remove("hidden");
  } finally {
    setLoading(false);
  }
}

/**
 * Core translate trả về kết quả để tái dùng cho các popup (hover/highlight/mini/OCR/conversation).
 * Không đụng tới UI chính (inputText/outputText) khi recordHistory=false.
 */
async function translateValue(text, source, target, options = {}) {
  const recordHistory = options.recordHistory ?? false;
  const controller = options.controller || new AbortController();

  const t = String(text ?? "").trim();
  let s = String(source ?? "auto").trim() || "auto";
  const tg = String(target ?? "vi").trim() || "vi";

  if (!t) return { output: "", detected: "-", fromCache: false };

  console.log(`TRANSLATE: Input="${t.substring(0, 50)}...", source="${s}", target="${tg}"`);

  // Advanced Auto Detect: nếu source = auto, phát hiện ngôn ngữ thực
  let detectedLang = null;
  if (s === "auto") {
    console.log("TRANSLATE: Source=auto, chạy advanced detection");
    detectedLang = await advancedAutoDetect(t);
    s = detectedLang || "auto";
    console.log(`TRANSLATE: Detected language: "${s}"`);
  }

  // Skip translation nếu source === target
  if (s === tg) {
    console.log(`TRANSLATE: Source === Target (${s}), skip translation`);
    return { output: t, detected: s, fromCache: false };
  }

  // Check cache
  const cached = getCachedTranslation(t, s, tg);
  if (cached) {
    console.log(`TRANSLATE: Cache hit - detected="${cached.detected || s}"`);
    setDetectedLanguage(cached.detected || s);
    return { output: cached.output, detected: cached.detected || s, fromCache: true };
  }

  try {
    console.log(`TRANSLATE: Gọi API với source="${s}"`);
    const encodedText = encodeURIComponent(t);
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${s}|${tg}`;
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("No translation result");

    // Extract detected language from API response
    const detected = data?.responseData?.detectedLanguage || s;
    console.log(`TRANSLATE: API response - detected="${detected}", translated="${translated.substring(0, 50)}..."`);

    setCachedTranslation(t, s, tg, { output: translated, detected: detected });
    setDetectedLanguage(detected);
    
    if (recordHistory) {
      pushHistory({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        input: t,
        output: translated,
        source: s,
        target: tg,
        detected,
        timestamp: Date.now(),
      });
    }

    return { output: translated, detected, fromCache: false };
  } catch (e) {
    console.error(`TRANSLATE: Error -`, e);
    // Retry mechanism: nếu source=auto fail, retry với fallback
    if (s === "auto" && source === "auto") {
      console.log("TRANSLATE: Auto-detect failed, retrying with en fallback");
      return translateValue(t, "en", tg, { ...options, controller });
    }
    throw e;
  }
}

async function copyResult() {
  const text = outputText.value.trim();
  if (!text) {
    setError("Chua co ket qua de copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setError("");
    showToast("Da copy ket qua.", "success");
  } catch {
    setError("Khong the copy tu dong. Hay copy thu cong.");
  }
}

function clearAllText() {
  inputText.value = "";
  outputText.value = "";
  setError("");
  updateCharacterCounter();
  setRealtimeLanguageDisplay("-");
  inputText.focus();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
  renderFavoritesList();
  renderHistory();
  showToast("Da xoa favorites.", "info");
}

function scheduleAutoTranslate() {
  clearTimeout(autoTranslateTimer);
  if (!autoTranslateToggle.checked || isAutoPaused) {
    console.log(`AUTO_TRANSLATE: Skipped - toggle=${autoTranslateToggle.checked}, paused=${isAutoPaused}`);
    return;
  }
  const text = inputText.value.trim();
  if (!text) {
    console.log("AUTO_TRANSLATE: Input empty");
    return;
  }
  console.log(`AUTO_TRANSLATE: Scheduling in 800ms`);
  autoTranslateTimer = setTimeout(() => {
    console.log("AUTO_TRANSLATE: Executing after debounce");
    if (inputText.value.trim()) {
      translateText();
    }
  }, 800);
}

function togglePauseAuto() {
  isAutoPaused = !isAutoPaused;
  pauseAutoBtn.textContent = isAutoPaused ? "Resume auto" : "Pause auto";
}

function retryLastRequest() {
  if (!lastRequestPayload) {
    setError("Chua co yeu cau de retry.");
    return;
  }
  translateText(lastRequestPayload);
}

function highlightOutput() {
  outputText.classList.add("ring-2", "ring-emerald-400");
  setTimeout(() => outputText.classList.remove("ring-2", "ring-emerald-400"), 850);
}

function swapLanguages() {
  const prevSource = sourceLangEl.value;
  const prevTarget = targetLangEl.value;

  sourceLangEl.value = prevTarget;
  targetLangEl.value = prevSource === "auto" ? "en" : prevSource;

  // Đổi cả nội dung để thuận tiện kiểm tra bản dịch ngược
  const input = inputText.value;
  inputText.value = outputText.value;
  outputText.value = input;
  updateCharacterCounter();
  scheduleRealtimeDetect();
  scheduleAutoTranslate();
}

function applySavedTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

toggleDark.addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
translateBtn.addEventListener("click", translateText);
clearBtn.addEventListener("click", clearAllText);
copyBtn.addEventListener("click", copyResult);
downloadBtn.addEventListener("click", downloadTranslatedTxt);
fileTxtInput.addEventListener("change", handleTxtUpload);
favoriteCurrentBtn.addEventListener("click", favoriteCurrentTranslation);
swapBtn.addEventListener("click", swapLanguages);
clearHistoryBtn.addEventListener("click", clearHistory);
clearFavoritesBtn.addEventListener("click", clearFavorites);
tabHistoryBtn.addEventListener("click", () => setActiveTab("history"));
tabFavoritesBtn.addEventListener("click", () => setActiveTab("favorites"));
speakInputBtn.addEventListener("click", () => speakText(inputText.value, sourceLangEl.value, "input"));
speakOutputBtn.addEventListener("click", () => speakText(outputText.value, targetLangEl.value, "output"));
ttsPlayPauseBtn.addEventListener("click", ttsPlayPauseResume);
ttsStopBtn.addEventListener("click", ttsStopPlayback);
ttsDebug.addEventListener("change", () => {
  if (ttsDebug.checked) {
    refreshVoicesCache();
    console.log("[TTS voices debug]", cachedVoices.length, cachedVoices);
  }
});
retryBtn.addEventListener("click", retryLastRequest);
pauseAutoBtn.addEventListener("click", togglePauseAuto);
autoTranslateToggle.addEventListener("change", scheduleAutoTranslate);
historyFilterLang.addEventListener("change", renderHistory);
inputText.addEventListener("input", () => {
  if (currentController) {
    currentController.abort();
  }
  updateCharacterCounter();
  scheduleRealtimeDetect();
  scheduleAutoTranslate();
});
sourceLangEl.addEventListener("change", () => {
  scheduleRealtimeDetect();
  scheduleAutoTranslate();
  repopulateVoiceSelects();
});
targetLangEl.addEventListener("change", () => {
  scheduleRealtimeDetect();
  scheduleAutoTranslate();
  repopulateVoiceSelects();
});
voiceInputBtn.addEventListener("click", toggleVoiceInput);
ttsRate.addEventListener("input", () => {
  ttsRateValue.textContent = Number(ttsRate.value).toFixed(1);
});
ttsPitch.addEventListener("input", () => {
  ttsPitchValue.textContent = Number(ttsPitch.value).toFixed(1);
});
ttsVolume.addEventListener("input", () => {
  ttsVolumeValue.textContent = Number(ttsVolume.value).toFixed(2);
});

// Phím tắt Ctrl + Enter theo yêu cầu
inputText.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    translateText();
  }
});

initSpeechSynthesisVoices();
setupSpeechRecognition();
updateCharacterCounter();
ttsRateValue.textContent = Number(ttsRate.value).toFixed(1);
ttsPitchValue.textContent = Number(ttsPitch.value).toFixed(1);
ttsVolumeValue.textContent = Number(ttsVolume.value).toFixed(2);
setDetectedLanguage("-");
setRealtimeLanguageDisplay("-");
setActiveTab("history");
renderFavoritesList();
renderHistory();
scheduleRealtimeDetect();

// --- Upgrade 6: OCR / Hover / Highlight / Mini / Conversation ---
const toggleHoverTranslate = document.getElementById("toggleHoverTranslate");
const toggleHighlightTranslate = document.getElementById("toggleHighlightTranslate");
const toggleMiniTranslator = document.getElementById("toggleMiniTranslator");
const toggleConversationMode = document.getElementById("toggleConversationMode");

const hoverTranslatePopup = document.getElementById("hoverTranslatePopup");
const hoverFromText = document.getElementById("hoverFromText");
const hoverToText = document.getElementById("hoverToText");

const highlightTranslatePopup = document.getElementById("highlightTranslatePopup");
const highlightSelectedText = document.getElementById("highlightSelectedText");
const highlightTranslatedText = document.getElementById("highlightTranslatedText");
const highlightCloseBtn = document.getElementById("highlightCloseBtn");
const highlightUseBtn = document.getElementById("highlightUseBtn");
const highlightTranslateBtn = document.getElementById("highlightTranslateBtn");

const openOcrBtn = document.getElementById("openOcrBtn");
const ocrModal = document.getElementById("ocrModal");
const ocrCloseBtn = document.getElementById("ocrCloseBtn");
const ocrImageInput = document.getElementById("ocrImageInput");
const ocrPreviewImg = document.getElementById("ocrPreviewImg");
const ocrDetectorStatus = document.getElementById("ocrDetectorStatus");
const ocrTranslateBtn = document.getElementById("ocrTranslateBtn");
const ocrExtractedText = document.getElementById("ocrExtractedText");
const ocrOutputText = document.getElementById("ocrOutputText");

const openConversationBtn = document.getElementById("openConversationBtn");
const conversationModal = document.getElementById("conversationModal");
const conversationCloseBtn = document.getElementById("conversationCloseBtn");
const convMicA = document.getElementById("convMicA");
const convMicB = document.getElementById("convMicB");
const conversationStatus = document.getElementById("conversationStatus");
const conversationLog = document.getElementById("conversationLog");

const miniTranslatorFab = document.getElementById("miniTranslatorFab");
const miniTranslatorPanel = document.getElementById("miniTranslatorPanel");
const miniTranslatorCloseBtn = document.getElementById("miniTranslatorCloseBtn");
const miniSourceLang = document.getElementById("miniSourceLang");
const miniTargetLang = document.getElementById("miniTargetLang");
const miniInputText = document.getElementById("miniInputText");
const miniTranslateBtn = document.getElementById("miniTranslateBtn");
const miniCopyBtn = document.getElementById("miniCopyBtn");
const miniOutputText = document.getElementById("miniOutputText");

function setHoverPopupVisible(visible) {
  hoverTranslatePopup.classList.toggle("hidden", !visible);
}

function positionPopupNearClient(x, y, popupEl) {
  popupEl.style.left = `${x}px`;
  popupEl.style.top = `${y}px`;
}

// Mini translator UI
function populateMiniLangSelects() {
  miniSourceLang.innerHTML = "";
  miniTargetLang.innerHTML = "";

  const optAuto = document.createElement("option");
  optAuto.value = "auto";
  optAuto.textContent = "Auto detect";
  miniSourceLang.appendChild(optAuto);

  for (const lang of supportedLanguages) {
    const opt1 = document.createElement("option");
    opt1.value = lang.code;
    opt1.textContent = `${lang.name} (${lang.code})`;
    miniSourceLang.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = lang.code;
    opt2.textContent = `${lang.name} (${lang.code})`;
    miniTargetLang.appendChild(opt2);
  }

  miniSourceLang.value = sourceLangEl.value;
  miniTargetLang.value = targetLangEl.value;
}

function openMiniPanel() {
  miniTranslatorPanel.classList.toggle("hidden", false);
}
function closeMiniPanel() {
  miniTranslatorPanel.classList.toggle("hidden", true);
}

if (toggleMiniTranslator) {
  miniTranslatorFab.classList.toggle("hidden", !toggleMiniTranslator.checked);
  if (!toggleMiniTranslator.checked) closeMiniPanel();
}

toggleMiniTranslator?.addEventListener("change", () => {
  miniTranslatorFab.classList.toggle("hidden", !toggleMiniTranslator.checked);
  if (!toggleMiniTranslator.checked) closeMiniPanel();
});

miniTranslatorFab.addEventListener("click", () => {
  if (!toggleMiniTranslator.checked) return;
  if (miniTranslatorPanel.classList.contains("hidden")) openMiniPanel();
  else closeMiniPanel();
});
miniTranslatorCloseBtn.addEventListener("click", closeMiniPanel);

sourceLangEl.addEventListener("change", () => {
  if (!miniTranslatorPanel.classList.contains("hidden")) miniSourceLang.value = sourceLangEl.value;
});
targetLangEl.addEventListener("change", () => {
  if (!miniTranslatorPanel.classList.contains("hidden")) miniTargetLang.value = targetLangEl.value;
});

populateMiniLangSelects();
closeMiniPanel();

miniTranslateBtn.addEventListener("click", async () => {
  const t = miniInputText.value.trim();
  if (!t) {
    showToast("Mini: Chua co van ban.", "error");
    return;
  }
  try {
    miniTranslateBtn.disabled = true;
    const result = await translateValue(t, miniSourceLang.value, miniTargetLang.value, { recordHistory: false });
    miniOutputText.value = result.output;
    showToast(result.fromCache ? "Mini: from cache." : "Mini: done.", result.fromCache ? "info" : "success");
  } catch (e) {
    showToast("Mini translate that bai.", "error");
  } finally {
    miniTranslateBtn.disabled = false;
  }
});

miniCopyBtn.addEventListener("click", async () => {
  const t = miniOutputText.value.trim();
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
    showToast("Mini: copied.", "success");
  } catch {
    showToast("Mini: copy khong tu dong.", "error");
  }
});

// Hover Translate (ALT + hover in history/favorites)
let hoverTimer = null;
let hoverLastKey = "";
let hoverController = null;
document.addEventListener("mouseover", (e) => {
  if (!toggleHoverTranslate.checked) return;
  if (!e.altKey) return;
  if (!historyList.contains(e.target) && !favoritesList.contains(e.target)) return;

  const text = (e.target?.textContent || "").trim();
  if (!text || text.length > 80) return;

  const key = `${text}|${sourceLangEl.value}|${targetLangEl.value}`;
  if (key === hoverLastKey) return;
  hoverLastKey = key;

  const x = e.clientX;
  const y = e.clientY;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(async () => {
    try {
      if (hoverController) hoverController.abort();
      hoverController = new AbortController();
      const result = await translateValue(text, sourceLangEl.value, targetLangEl.value, { controller: hoverController });
      hoverFromText.textContent = text;
      hoverToText.textContent = result.output || "";
      positionPopupNearClient(x, y, hoverTranslatePopup);
      setHoverPopupVisible(true);
    } catch (err) {
      // Ignore abort / transient errors
    }
  }, 450);
});
document.addEventListener("mousemove", (e) => {
  if (!toggleHoverTranslate.checked) return;
  if (!e.altKey) setHoverPopupVisible(false);
});

// Highlight Translate (selection in input/output)
let highlightController = null;
let lastHighlightTranslation = "";
let lastHighlightText = "";
let highlightFromTextArea = null;

function hideHighlightPopup() {
  highlightTranslatePopup.classList.add("hidden");
  highlightController?.abort?.();
  highlightController = null;
}

function tryShowHighlightFromTextarea(textarea) {
  if (!toggleHighlightTranslate.checked) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  if (end <= start) {
    hideHighlightPopup();
    return;
  }

  const selected = textarea.value.slice(start, end).trim();
  if (!selected || selected.length > 300) {
    hideHighlightPopup();
    return;
  }

  lastHighlightText = selected;
  lastHighlightTranslation = "";
  highlightFromTextArea = textarea;
  highlightSelectedText.textContent = selected;
  highlightTranslatedText.textContent = "...";

  const r = textarea.getBoundingClientRect();
  highlightTranslatePopup.style.left = `${Math.max(8, r.left)}px`;
  highlightTranslatePopup.style.top = `${r.bottom + 8}px`;
  highlightTranslatePopup.classList.remove("hidden");
}

async function translateHighlightNow() {
  if (!lastHighlightText) return;
  try {
    highlightTranslateBtn.disabled = true;
    if (highlightController) highlightController.abort();
    highlightController = new AbortController();
    const result = await translateValue(lastHighlightText, sourceLangEl.value, targetLangEl.value, {
      controller: highlightController,
      recordHistory: false,
    });
    lastHighlightTranslation = result.output || "";
    highlightTranslatedText.textContent = lastHighlightTranslation;
  } catch (e) {
    highlightTranslatedText.textContent = "Translation failed.";
  } finally {
    highlightTranslateBtn.disabled = false;
  }
}

inputText.addEventListener("mouseup", () => {
  tryShowHighlightFromTextarea(inputText);
  translateHighlightNow();
});
inputText.addEventListener("keyup", () => {
  tryShowHighlightFromTextarea(inputText);
  translateHighlightNow();
});
outputText.addEventListener("mouseup", () => {
  tryShowHighlightFromTextarea(outputText);
  translateHighlightNow();
});

highlightCloseBtn.addEventListener("click", hideHighlightPopup);
highlightTranslateBtn.addEventListener("click", translateHighlightNow);
highlightUseBtn.addEventListener("click", () => {
  if (!lastHighlightTranslation) return;
  outputText.value = lastHighlightTranslation;
  highlightOutput();
  hideHighlightPopup();
});

// OCR translate (TextDetector if available)
function openOcrModal() {
  ocrModal.classList.remove("hidden");
  ocrModal.classList.add("flex");
}
function closeOcrModal() {
  ocrModal.classList.add("hidden");
  ocrModal.classList.remove("flex");
}

openOcrBtn.addEventListener("click", () => {
  // ToggleConversationMode không áp dụng cho OCR.
  openOcrModal();
  ocrExtractedText.value = "";
  ocrOutputText.value = "";
  ocrTranslateBtn.disabled = true;
  ocrDetectorStatus.textContent = "";
  ocrDetectorStatus.classList.add("hidden");
  ocrPreviewImg.classList.add("hidden");
});
ocrCloseBtn.addEventListener("click", closeOcrModal);

async function runOcrOnImageFile(file) {
  ocrDetectorStatus.textContent = "";
  ocrDetectorStatus.classList.remove("hidden");
  ocrDetectorStatus.textContent = "Đang nhận diện...";
  console.log("OCR: Bắt đầu nhận diện ảnh");

  // Kiểm tra Tesseract.js có sẵn không
  if (!window.Tesseract) {
    ocrDetectorStatus.textContent = "Tesseract.js chưa tải xong, vui lòng tải lại trang.";
    ocrTranslateBtn.disabled = true;
    console.error("OCR: Tesseract.js không có");
    return;
  }

  const { createWorker } = window.Tesseract;
  let worker = null;
  let previewUrl = null;
  
  try {
    // Tạo data URL cho preview ảnh (thay vì blob URL)
    console.log("OCR: Tạo preview ảnh từ file");
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = () => {
        previewUrl = reader.result;
        ocrPreviewImg.src = previewUrl;
        ocrPreviewImg.classList.remove("hidden");
        console.log("OCR: Preview ảnh đã tải");
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    console.log("OCR: Tạo Tesseract worker với ngôn ngữ: vie+eng");
    ocrDetectorStatus.textContent = "Đang nhận diện... (có thể mất vài giây)";

    // Tạo worker với hỗ trợ tiếng Việt + tiếng Anh
    worker = await createWorker(["vie", "eng"], 1, {
      logger: (m) => {
        console.log("OCR Progress:", m);
        if (m.status === "recognizing") {
          const percent = Math.round(m.progress * 100);
          ocrDetectorStatus.textContent = `Đang nhận diện... ${percent}%`;
        }
      },
    });

    console.log("OCR: Worker được tạo thành công, bắt đầu nhận diện");
    // QUAN TRỌNG: Truyền File object trực tiếp, không dùng blob URL
    const result = await worker.recognize(file);
    const extracted = result.data.text.trim().slice(0, 5000);
    console.log("OCR: Kết quả nhận diện:", extracted.substring(0, 100) + "...");

    if (extracted) {
      ocrExtractedText.value = extracted;
      ocrTranslateBtn.disabled = false;

      // TỰ ĐỘNG ĐƯA TEXT VÀO TEXTAREA NGUỒN
      console.log("OCR: Tự động đưa text vào source textarea");
      inputText.value = extracted;
      
      // Kích hoạt sự kiện input để trigger auto-translate nếu enabled
      inputText.dispatchEvent(new Event("input", { bubbles: true }));

      // Tự động dịch
      const translationResult = await translateValue(
        extracted,
        sourceLangEl.value,
        targetLangEl.value,
        { recordHistory: false }
      );
      ocrOutputText.value = translationResult.output || "";
      ocrDetectorStatus.textContent = translationResult.fromCache
        ? "✓ Hoàn tất (từ cache)"
        : "✓ Hoàn tất";
      console.log("OCR: Dịch xong, từ cache:", translationResult.fromCache);
    } else {
      ocrDetectorStatus.textContent = "❌ Không tách được chữ từ ảnh.";
      console.warn("OCR: Không tách được chữ");
      ocrTranslateBtn.disabled = true;
    }
  } catch (e) {
    console.error("OCR: Lỗi -", e);
    ocrDetectorStatus.textContent = `❌ Lỗi: ${e.message || "OCR thất bại"}`;
    ocrTranslateBtn.disabled = true;
  } finally {
    // Dừng worker để giải phóng tài nguyên
    if (worker) {
      try {
        await worker.terminate();
        console.log("OCR: Worker terminated");
      } catch (e) {
        console.error("OCR: Lỗi khi terminate worker:", e);
      }
    }
  }
}

ocrImageInput.addEventListener("change", () => {
  const file = ocrImageInput.files && ocrImageInput.files[0];
  if (!file) {
    console.log("OCR: Không chọn ảnh");
    return;
  }
  console.log("OCR: Chọn ảnh:", file.name, file.size, "bytes");
  ocrTranslateBtn.disabled = true;
  ocrOutputText.value = "";
  ocrExtractedText.value = "";
  ocrDetectorStatus.textContent = "";
  runOcrOnImageFile(file);
});

ocrTranslateBtn.addEventListener("click", async () => {
  const extracted = ocrExtractedText.value.trim();
  if (!extracted) return;
  try {
    ocrTranslateBtn.disabled = true;
    const result = await translateValue(extracted, sourceLangEl.value, targetLangEl.value, { recordHistory: false });
    ocrOutputText.value = result.output || "";
  } finally {
    ocrTranslateBtn.disabled = !extracted;
  }
});

// Conversation mode (two mic buttons)
let conversationRecognition = null;
let conversationController = null;

function appendConversationLine(who, fromLang, toLang, text, translated) {
  const item = document.createElement("div");
  item.className = "rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900";
  item.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-200">${who} (${fromLang} → ${toLang})</div>
      <div class="text-[11px] text-slate-500 dark:text-slate-400">${new Date().toLocaleTimeString()}</div>
    </div>
    <div class="mt-1 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">${text}</div>
    <div class="mt-2 text-xs text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap break-words">${translated || ""}</div>
  `;
  conversationLog.appendChild(item);
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function stopConversation() {
  try {
    conversationRecognition?.stop?.();
  } catch {}
  conversationRecognition = null;
  if (conversationController) conversationController.abort();
  conversationController = null;
  conversationStatus.textContent = "";
}

function openConversationModal() {
  conversationModal.classList.remove("hidden");
  conversationModal.classList.add("flex");
  conversationLog.innerHTML = "";
}
function closeConversationModal() {
  conversationModal.classList.add("hidden");
  conversationModal.classList.remove("flex");
  stopConversation();
}

openConversationBtn.addEventListener("click", () => {
  if (toggleConversationMode && !toggleConversationMode.checked) return;
  openConversationModal();
});
conversationCloseBtn.addEventListener("click", closeConversationModal);

function startConversationMic(mode) {
  if (!toggleConversationMode.checked) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("SpeechRecognition không được hỗ trợ trên trình duyệt.", "error");
    return;
  }
  stopConversation();

  const fromLang = mode === "A" ? sourceLangEl.value : targetLangEl.value;
  const toLang = mode === "A" ? targetLangEl.value : sourceLangEl.value;
  const speakLang = recognitionLocaleFromSource(fromLang);

  conversationStatus.textContent = "Đang nghe...";
  convMicA.disabled = mode !== "A";
  convMicB.disabled = mode !== "B";

  const rec = new SR();
  conversationRecognition = rec;
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = speakLang;

  const transcriptParts = [];

  rec.onresult = async (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const res = ev.results[i];
      const chunk = res[0]?.transcript || "";
      if (!chunk) continue;
      if (res.isFinal) {
        transcriptParts.push(chunk);
        const transcript = transcriptParts.join(" ").trim().slice(0, 5000);
        if (!transcript) continue;
        conversationController = new AbortController();
        conversationStatus.textContent = "Đang dịch...";
        try {
          const result = await translateValue(transcript, fromLang, toLang, { controller: conversationController, recordHistory: false });
          appendConversationLine(mode === "A" ? "A" : "B", fromLang, toLang, transcript, result.output);
        } catch {
          appendConversationLine(mode === "A" ? "A" : "B", fromLang, toLang, transcript, "[Lỗi dịch]");
        } finally {
          conversationStatus.textContent = "Sẵn sàng nghe tiếp.";
          convMicA.disabled = false;
          convMicB.disabled = false;
          transcriptParts.length = 0;
        }
      }
    }
  };

  rec.onerror = (ev) => {
    conversationStatus.textContent = `Micro error: ${ev.error || "unknown"}`;
    convMicA.disabled = false;
    convMicB.disabled = false;
  };
  rec.onend = () => {
    conversationStatus.textContent = conversationStatus.textContent || "Ngừng nghe.";
    convMicA.disabled = false;
    convMicB.disabled = false;
  };

  try {
    rec.start();
  } catch {
    conversationStatus.textContent = "Không thể bắt đầu microphone.";
    convMicA.disabled = false;
    convMicB.disabled = false;
  }
}

convMicA.addEventListener("click", () => startConversationMic("A"));
convMicB.addEventListener("click", () => startConversationMic("B"));
// --- End Upgrade 6 ---
/* ===============================
   Browser API Safety Patch
   =============================== */

// Speech Recognition support
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  if (voiceInputBtn) voiceInputBtn.disabled = true;
  if (openConversationBtn) openConversationBtn.disabled = true;

  console.warn("SpeechRecognition not supported");
}

// OCR TextDetector support
if (!("TextDetector" in window)) {
  const ocrBtn = document.getElementById("openOcrBtn");
  const ocrStatus = document.getElementById("ocrDetectorStatus");

  if (ocrBtn) ocrBtn.disabled = false; // vẫn cho mở modal
  if (ocrStatus) {
    ocrStatus.classList.remove("hidden");
    ocrStatus.textContent =
      "OCR native không hỗ trợ — sẽ dùng fallback";
  }

  window.TextDetector = null; // tránh undefined crash
}

// Speech Synthesis support
if (!("speechSynthesis" in window)) {
  speakInputBtn.disabled = true;
  speakOutputBtn.disabled = true;
  console.warn("SpeechSynthesis not supported");
}

/* ===============================
   Fix manual translate when auto off
   =============================== */

translateBtn.addEventListener("click", () => {
  if (!inputText.value.trim()) return;
  translateTextSafe();
});

function translateTextSafe() {
  try {
    translateText(); // gọi hàm gốc của bạn
  } catch (err) {
    console.error(err);
    showToast("Translate lỗi — thử lại", "error");
  }
}

/* ===============================
   Safe auto translate
   =============================== */

function scheduleAutoTranslateSafe() {
  if (!autoTranslateToggle.checked) return;

  clearTimeout(autoTranslateTimer);
  autoTranslateTimer = setTimeout(() => {
    translateTextSafe();
  }, 600);
}

/* ===============================
   Safe Conversation Mode
   =============================== */

if (typeof openConversationBtn !== "undefined") {
  openConversationBtn?.addEventListener("click", () => {
    if (!SpeechRecognition) {
      showToast(
        "Conversation mode không hỗ trợ trên trình duyệt này",
        "error"
      );
      return;
    }

    conversationModal.classList.remove("hidden");
  });
}

/* ===============================
   Safe OCR handler
   =============================== */

document.getElementById("openOcrBtn")?.addEventListener("click", () => {
  ocrModal.classList.remove("hidden");

  if (!("TextDetector" in window)) {
    document.getElementById("ocrDetectorStatus").textContent =
      "Trình duyệt không hỗ trợ OCR native. Bạn có thể dùng API ngoài.";
  }
});

/* ===============================
   Prevent crash
   =============================== */

window.addEventListener("error", (e) => {
  console.warn("Runtime error:", e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  console.warn("Promise error:", e.reason);
});

applySavedTheme();
