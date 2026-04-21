// Shared constants & storage helpers for index.html and admin.html

const KIDS = ["שִׁיָּה", "מִיכָאֵל", "יַעַר", "דִּין"];
const GENERAL_LABEL = "מְשִׂימוֹת כְּלָלִיּוֹת";
const ADMIN_PASSWORD = "1234"; // change here if needed

// Task types:
//   singular   = יחידנית — אחד מהילדים, ברוטציה יומית, ללא כפילות באותו יום
//   collective = קולקטיבית — כל ילד עושה לעצמו
//   general    = כללית — בטור הכלליות, מי שיעשה
const DEFAULT_TASKS = {
  morning: {
    title: "מְשִׂימוֹת בּוֹקֶר",
    icon: "🌅",
    tasks: [
      { name: "לְפַנּוֹת מֵדִיחַ", type: "singular" },
      { name: "לְהַכְנִיס כֵּלִים לַמֵּדִיחַ", type: "singular" },
      { name: "לְסַדֵּר מִטָּה", type: "collective" },
      { name: "לְסַדֵּר חֲדַר שֵׁינָה", type: "general" },
      { name: "לְסַדֵּר חֲדַר עֲבוֹדָה", type: "singular" },
      { name: "לְסַדֵּר חֲדַר אַמְבַּטְיָה אַחֲרֵי הִתְאַרְגְּנוּת", type: "general" },
      { name: "לְכַבּוֹת אוֹרוֹת", type: "singular" },
      { name: "לְסַדֵּר תִּיק לְבֵית הַסֵּפֶר", type: "collective" },
      { name: "לְמַלֵּא בַּקְבּוּק מַיִם", type: "collective" },
    ],
  },
  free: {
    title: "מְשִׂימוֹת חוֹפְשִׁיּוֹת",
    icon: "☀️",
    subtitle: "מָתַי שֶׁבָּא לָכֶם — רַק שֶׁיֵּעָשֶׂה הַיּוֹם",
    tasks: [
      { name: "לִקְרֹא", type: "collective" },
      { name: "לְקַפֵּל 30 פְּרִיטֵי כְּבִיסָה", type: "collective" },
      { name: "לְהָרִים דְּבָרִים מֵהָרִצְפָּה בַּמִּרְפֶּסֶת", type: "general" },
    ],
  },
  evening: {
    title: "מְשִׂימוֹת עֶרֶב",
    icon: "🌙",
    tasks: [
      { name: "מִקְלַחַת", type: "collective" },
      { name: "לְהָכִין בְּגָדִים לְמָחָר", type: "collective" },
      { name: "לְפַנּוֹת מֵדִיחַ", type: "singular" },
      { name: "לְהַכְנִיס כֵּלִים לַמֵּדִיחַ", type: "singular" },
      { name: "לְסַדֵּר חֲדַר אַמְבַּטְיָה", type: "general" },
      { name: "לְסַדֵּר שֵׁירוּתִים וְלִבְדֹּק שֶׁאֵין דְּבָרִים עַל הָרִצְפָּה", type: "general" },
      { name: "לִכְתֹּב מָה בַּכְּרִיכִים לְמָחָר", type: "singular" },
    ],
  },
};

const STORAGE_KEY = "hometasks_v3";
const TASKS_KEY = "hometasks_tasks_v3";

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_TASKS));
}
function saveTasks(t) { localStorage.setItem(TASKS_KEY, JSON.stringify(t)); }
function resetTasksToDefault() { localStorage.removeItem(TASKS_KEY); }

function loadCheckedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function saveCheckedState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function clearCheckedState() { localStorage.removeItem(STORAGE_KEY); }

// ===== Gist sync (cross-device) =====
const GIST_FILENAME = "tasks.json";
const GIST_ID_KEY = "hometasks_gist_id";
const GIST_TOKEN_KEY = "hometasks_gist_token";

// Strip everything except printable ASCII — kills RTL marks, BOMs, NBSP, etc.
// Headers and URLs must be ISO-8859-1, and pasted tokens often carry hidden Unicode.
function sanitizeAscii(s) {
  return (s || "").replace(/[^\x21-\x7E]/g, "");
}

function getGistConfig() {
  return {
    gistId: sanitizeAscii(localStorage.getItem(GIST_ID_KEY) || ""),
    token: sanitizeAscii(localStorage.getItem(GIST_TOKEN_KEY) || ""),
  };
}
function setGistConfig({ gistId, token }) {
  if (gistId !== undefined) {
    const v = sanitizeAscii(gistId);
    if (v) localStorage.setItem(GIST_ID_KEY, v);
    else localStorage.removeItem(GIST_ID_KEY);
  }
  if (token !== undefined) {
    const v = sanitizeAscii(token);
    if (v) localStorage.setItem(GIST_TOKEN_KEY, v);
    else localStorage.removeItem(GIST_TOKEN_KEY);
  }
}
function hasGistConfig() {
  const c = getGistConfig();
  return !!(c.gistId && c.token);
}

async function fetchTasksFromGist(cfg = getGistConfig()) {
  const gistId = sanitizeAscii(cfg.gistId);
  const token = sanitizeAscii(cfg.token);
  if (!gistId) throw new Error("חסר Gist ID");
  const headers = { "Accept": "application/vnd.github+json" };
  if (token) headers["Authorization"] = `token ${token}`;
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`קריאה נכשלה: ${res.status}`);
  const data = await res.json();
  // Prefer canonical filename, fall back to the first file in the gist
  let file = data.files && data.files[GIST_FILENAME];
  if (!file && data.files) {
    const names = Object.keys(data.files);
    if (names.length > 0) file = data.files[names[0]];
  }
  if (!file) return null; // empty gist — first push will create the file
  const content = (file.content || "").trim();
  if (!content || content === "{}") return null;
  try { return JSON.parse(content); }
  catch (e) { throw new Error("תוכן הגיסט אינו JSON תקין"); }
}

// Verify gist access without requiring the file to exist
async function pingGist({ gistId, token }) {
  gistId = sanitizeAscii(gistId);
  token = sanitizeAscii(token);
  if (!gistId) throw new Error("חסר Gist ID");
  if (!token) throw new Error("חסר Token");
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { "Accept": "application/vnd.github+json", "Authorization": `token ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("הגיסט לא נמצא (בדוק את ה-ID)");
  if (res.status === 401 || res.status === 403) throw new Error("טוקן לא תקין או חסר scope של gist");
  if (!res.ok) throw new Error(`גישה נכשלה: ${res.status}`);
  const data = await res.json();
  const hasCanonical = !!(data.files && data.files[GIST_FILENAME]);
  const fileCount = Object.keys(data.files || {}).length;
  return { hasCanonical, fileCount, files: Object.keys(data.files || {}) };
}

async function saveTasksToGist(tasks, cfg = getGistConfig()) {
  const gistId = sanitizeAscii(cfg.gistId);
  const token = sanitizeAscii(cfg.token);
  if (!gistId || !token) throw new Error("חסר Gist ID או Token");
  const body = { files: { [GIST_FILENAME]: { content: JSON.stringify(tasks, null, 2) } } };
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`שמירה נכשלה: ${res.status} ${text.slice(0, 150)}`);
  }
}

// Setup URL for cross-device handoff: encodes config in URL fragment (#setup=...)
function consumeSetupUrl() {
  if (!location.hash) return false;
  const m = location.hash.match(/setup=([^&]+)/);
  if (!m) return false;
  try {
    const cfg = JSON.parse(atob(decodeURIComponent(m[1])));
    if (cfg.gistId) localStorage.setItem(GIST_ID_KEY, cfg.gistId);
    if (cfg.token) localStorage.setItem(GIST_TOKEN_KEY, cfg.token);
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  } catch (e) { return false; }
}

function buildSetupUrl(baseUrl) {
  const cfg = getGistConfig();
  const encoded = encodeURIComponent(btoa(JSON.stringify({ gistId: cfg.gistId, token: cfg.token })));
  return `${baseUrl}#setup=${encoded}`;
}

// ===== Niqqud (Hebrew vowels) =====
// Returns true if the text already contains any Hebrew niqqud characters.
function hasNiqqud(text) {
  return /[֑-ֽֿׁ-ׂׄ-ׇׅ]/.test(text || "");
}

// Auto-vocalize Hebrew text via DICTA Nakdan API. Throws on network/parse failure.
async function nakdanText(text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch("https://nakdan-5-3.loadbalancer.dicta.org.il/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "nakdan", data: text, genre: "modern", addmorph: false }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Nakdan ${res.status}`);
    const arr = await res.json();
    return arr.map(w => {
      if (w.sep) return w.word;
      const opt = (w.options && w.options[0]) || w.word;
      return opt.replace(/\|/g, "");
    }).join("");
  } finally {
    clearTimeout(timer);
  }
}

// ===== Date helpers =====
function getEffectiveDate(d = new Date()) {
  const x = new Date(d);
  if (x.getHours() < 6) x.setDate(x.getDate() - 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getDayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
function formatHebrewDate(d) {
  const days = ["רִאשׁוֹן","שֵׁנִי","שְׁלִישִׁי","רְבִיעִי","חֲמִישִׁי","שִׁישִּׁי","שַׁבָּת"];
  const months = ["יָנוּאָר","פֶבְּרוּאָר","מֶרְץ","אַפְּרִיל","מַאי","יוּנִי","יוּלִי","אוֹגוּסְט","סֶפְּטֶמְבֶּר","אוֹקְטוֹבֶּר","נוֹבֶמְבֶּר","דֶּצֶמְבֶּר"];
  return `יוֹם ${days[d.getDay()]}, ${d.getDate()} בְּ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ===== Assignment algorithm =====
// Goals:
//   1. Singular tasks rotate fairly through kids over days.
//   2. The same task name never appears on two kids on the same day.
//   3. The same kid does not get the same task two days in a row.
//   4. Load is balanced — no kid gets piled with all the singular tasks.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildAssignments(tasks, date) {
  const out = {};
  const dayNum = getDayOfYear(date);

  // Init structure + collect singular slots in deterministic order
  const singularSlots = [];
  for (const sectionKey of Object.keys(tasks)) {
    out[sectionKey] = { perKid: {}, general: [] };
    KIDS.forEach(k => out[sectionKey].perKid[k] = []);
    tasks[sectionKey].tasks.forEach((task, idx) => {
      if (task.type === "collective") {
        KIDS.forEach(k => out[sectionKey].perKid[k].push(task.name));
      } else if (task.type === "general") {
        out[sectionKey].general.push(task.name);
      } else if (task.type === "singular") {
        singularSlots.push({ sectionKey, idx, taskName: task.name });
      }
    });
  }

  // Greedy assignment with constraints
  const kidLoad = {};
  const kidNamesToday = {};
  KIDS.forEach(k => { kidLoad[k] = 0; kidNamesToday[k] = new Set(); });

  for (const slot of singularSlots) {
    // Rotation base: shifts by 1 each day, ensuring same task moves to next kid daily
    const baseOffset = (dayNum + hashStr(slot.taskName)) % KIDS.length;
    const ranked = [];
    for (let i = 0; i < KIDS.length; i++) ranked.push(KIDS[(baseOffset + i) % KIDS.length]);

    // Eligible = those who don't have this task name today
    const eligible = ranked.filter(k => !kidNamesToday[k].has(slot.taskName));
    const pool = eligible.length > 0 ? eligible : ranked;

    // Pick least-loaded; tiebreaker = ranking order (preserves rotation)
    let picked = pool[0];
    let pickedLoad = kidLoad[pool[0]];
    for (const c of pool) {
      if (kidLoad[c] < pickedLoad) { picked = c; pickedLoad = kidLoad[c]; }
    }

    out[slot.sectionKey].perKid[picked].push(slot.taskName);
    kidLoad[picked]++;
    kidNamesToday[picked].add(slot.taskName);
  }

  return out;
}
