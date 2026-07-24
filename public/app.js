"use strict";

const LEGACY_STORAGE_KEY = "coach_jeremy_state_v1";
const LEGACY_STORAGE_KEY_V2 = "coach_jeremy_state_v2";
const LEGACY_SYNC_META_KEY = "coach_jeremy_sync_meta_v1";
const PROFILE_REGISTRY_KEY = "serie_profile_registry_v1";
const PROFILE_STATE_PREFIX = "serie_profile_state_v1_";
const PROFILE_SYNC_PREFIX = "serie_profile_sync_v1_";
const APP_SCHEMA = "1.1";
const SUPPORTED_SCHEMAS = new Set(["1.0", "1.1"]);
const APP_VERSION = "1.0";
const CHAT_PROMPT_VERSION = "1.1";
const SYNC_ENDPOINT = "/api/sync";
const SYNC_DELAY_MS = 1800;

const PROFILE_COLORS = {
  blue:   { label: "Bleu", accent: "#007aff", dark: "#0a84ff", soft: "#e8f2ff", softDark: "#102b49", gradient: ["#4ca3ff", "#0065d8"] },
  indigo: { label: "Indigo", accent: "#5856d6", dark: "#5e5ce6", soft: "#efefff", softDark: "#282744", gradient: ["#7775ee", "#4b48c7"] },
  violet: { label: "Violet", accent: "#af52de", dark: "#bf5af2", soft: "#f8ecff", softDark: "#3a2147", gradient: ["#ca75ef", "#9340c2"] },
  teal:   { label: "Turquoise", accent: "#0096a6", dark: "#40c8e0", soft: "#e6f7f8", softDark: "#15383d", gradient: ["#38c1cc", "#007b89"] },
  green:  { label: "Vert", accent: "#248a3d", dark: "#30d158", soft: "#e8f6eb", softDark: "#15371e", gradient: ["#55bd6c", "#1f7a35"] },
  orange: { label: "Orange", accent: "#e87500", dark: "#ff9f0a", soft: "#fff1df", softDark: "#402b12", gradient: ["#ffad3b", "#d46600"] },
  pink:   { label: "Rose", accent: "#d83a7c", dark: "#ff375f", soft: "#ffeaf2", softDark: "#471e2f", gradient: ["#f06a9f", "#c42c6c"] },
  red:    { label: "Rouge", accent: "#d92d28", dark: "#ff453a", soft: "#ffebe9", softDark: "#451b19", gradient: ["#ef625d", "#bd211d"] }
};

const storage = (() => {
  try {
    const candidate = globalThis.localStorage;
    const testKey = "__serie_storage_test__";
    candidate.setItem(testKey, "1");
    candidate.removeItem(testKey);
    return candidate;
  } catch {
    const memory = new Map();
    return {
      getItem: key => memory.has(key) ? memory.get(key) : null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: key => memory.delete(key),
      clear: () => memory.clear()
    };
  }
})();

const STATUS_LABELS = {
  planned: "À faire",
  in_progress: "En cours",
  done: "Terminée",
  skipped: "Non réalisée"
};

const EXERCISE_STATUSES = [
  ["planned", "À faire"],
  ["success", "Réussi"],
  ["partial", "Partiel"],
  ["failed", "Échec"],
  ["replaced", "Remplacé"],
  ["skipped", "Non réalisé"]
];

const FINISHED_EXERCISE_STATUSES = new Set(["success", "partial", "failed", "replaced", "skipped"]);

const ISSUE_OPTIONS = [
  ["too_heavy", "Charge trop lourde"],
  ["technique", "Problème technique"],
  ["pain", "Douleur / gêne"],
  ["fatigue", "Fatigue générale"],
  ["time", "Manque de temps"],
  ["equipment", "Matériel indisponible"],
  ["replaced", "Exercice remplacé"],
  ["other", "Autre"]
];

const TECHNIQUE_OPTIONS = [
  ["instability", "Instabilité"],
  ["range", "Amplitude"],
  ["trajectory", "Trajectoire"],
  ["bracing", "Perte de gainage"],
  ["tempo", "Tempo non respecté"],
  ["coordination", "Coordination"]
];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyWeeklyReview() {
  return { sleep: "", energy: "", hunger: "", protein: "", steps: "", cardio: "", events: "", feeling: "" };
}

function blankProgram(profileName = "") {
  return {
    schema_version: APP_SCHEMA,
    athlete_profile: profileName ? { name: profileName } : {},
    week: {
      id: `week-${cryptoRandomId(10)}`,
      number: 1,
      block_name: "Mon programme",
      title: "Aucune semaine importée",
      objective: "Configure ChatGPT puis importe ton programme.",
      start_date: "",
      sessions: []
    }
  };
}

function makeInitialState(program = null, history = [], profile = null) {
  const base = clone(program || blankProgram(profile?.name || ""));
  return {
    app_version: APP_VERSION,
    schema_version: APP_SCHEMA,
    profile: profile ? { id: profile.id, name: profile.name, color: profile.color } : {},
    athlete_profile: base.athlete_profile || {},
    week: base.week,
    daily_weights: {},
    session_results: {},
    weekly_review: emptyWeeklyReview(),
    history: clone(history || []),
    integration: { prompt_version: CHAT_PROMPT_VERSION, prompt_copied_at: "" },
    updated_at: new Date().toISOString()
  };
}

let profileRegistry = loadProfileRegistry();
let activeProfile = null;
let state = null;
let currentSessionId = null;
let activeExerciseId = null;
let currentViewId = "weekView";
let deferredInstallPrompt = null;
let pendingImport = null;
let issueContext = null;
let timerRemaining = 0;
let timerRunning = false;
let timerInterval = null;
let syncMeta = null;
let syncTimer = null;
let syncInFlight = false;
let pendingRemoteConflict = null;
let weightRange = "30";
let exerciseMenuContext = null;
let selectedNewProfileColor = "blue";
let selectedEditProfileColor = "blue";
let pendingInviteProfile = null;
let profileActivationVersion = 0;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function profileStateKey(profileId) {
  return `${PROFILE_STATE_PREFIX}${profileId}`;
}

function profileSyncKey(profileId) {
  return `${PROFILE_SYNC_PREFIX}${profileId}`;
}

function cryptoRandomId(bytes = 18) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map(value => value.toString(36).padStart(2, "0")).join("").slice(0, bytes * 2);
}

function hash128(text) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < text.length; i++) {
    k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1, h2, h3, h4].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
}

function legacyProfileRecord(parsed, name) {
  const seedState = clone(parsed);
  delete seedState.updated_at;
  delete seedState.app_version;
  delete seedState.profile;
  const digest = hash128(JSON.stringify(seedState));
  return {
    id: `p_${digest}`,
    access_token: `k_${hash128(`serie-legacy-${digest}`)}`,
    name: String(name || "Profil importé").slice(0, 32),
    color: "blue",
    created_at: new Date().toISOString(),
    last_opened_at: ""
  };
}

function createProfileRecord(name, color = "blue") {
  return {
    id: `p_${cryptoRandomId(18)}`,
    access_token: `k_${cryptoRandomId(32)}`,
    name: String(name || "Profil").trim().slice(0, 32) || "Profil",
    color: PROFILE_COLORS[color] ? color : "blue",
    created_at: new Date().toISOString(),
    last_opened_at: ""
  };
}

function loadProfileRegistry() {
  try {
    const parsed = JSON.parse(storage.getItem(PROFILE_REGISTRY_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.profiles)) return { version: 1, last_profile_id: "", profiles: [] };
    return {
      version: 1,
      last_profile_id: parsed.last_profile_id || "",
      profiles: parsed.profiles.filter(profile => profile?.id && profile?.access_token).map(profile => ({
        ...profile,
        name: String(profile.name || "Profil").slice(0, 32),
        color: PROFILE_COLORS[profile.color] ? profile.color : "blue"
      }))
    };
  } catch (error) {
    console.warn("Impossible de charger les profils", error);
    return { version: 1, last_profile_id: "", profiles: [] };
  }
}

function saveProfileRegistry() {
  storage.setItem(PROFILE_REGISTRY_KEY, JSON.stringify(profileRegistry));
}

function migrateLegacyProfileIfNeeded() {
  if (profileRegistry.profiles.length) return;
  const raw = storage.getItem(LEGACY_STORAGE_KEY_V2) || storage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.week || !Array.isArray(parsed.week.sessions)) return;
    const name = parsed.athlete_profile?.name || parsed.profile?.name || "Profil importé";
    const profile = legacyProfileRecord(parsed, name);
    profileRegistry.profiles.push(profile);
    profileRegistry.last_profile_id = profile.id;
    saveProfileRegistry();
    parsed.profile = { id: profile.id, name: profile.name, color: profile.color };
    storage.setItem(profileStateKey(profile.id), JSON.stringify(parsed));
    storage.setItem(profileSyncKey(profile.id), JSON.stringify({
      device_id: createDeviceId(), remote_revision: 0, last_synced_at: "", dirty: true,
      configured: null, last_error: ""
    }));
  } catch (error) {
    console.warn("Migration de l’ancien profil impossible", error);
  }
}

function initialsFor(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
}

function profileColor(profile = activeProfile) {
  return PROFILE_COLORS[profile?.color] || PROFILE_COLORS.blue;
}

function applyProfileTheme(profile = activeProfile) {
  const theme = profileColor(profile);
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const root = document.documentElement;
  root.style.setProperty("--accent", dark ? theme.dark : theme.accent);
  root.style.setProperty("--accent-soft", dark ? theme.softDark : theme.soft);
  root.style.setProperty("--blue", dark ? theme.dark : theme.accent);
  root.style.setProperty("--blue-soft", dark ? theme.softDark : theme.soft);
  root.style.setProperty("--profile-gradient-start", theme.gradient[0]);
  root.style.setProperty("--profile-gradient-end", theme.gradient[1]);
  root.dataset.profileColor = profile?.color || "blue";
}

function buildProfileLink(profile = activeProfile) {
  if (!profile) return "";
  const params = new URLSearchParams({
    profile: profile.id,
    key: profile.access_token,
    name: profile.name,
    color: profile.color
  });
  return `${location.origin}${location.pathname}#${params.toString()}`;
}

function parseProfileInvite() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const id = params.get("profile") || "";
  const accessToken = params.get("key") || "";
  if (!/^p_[a-z0-9_-]{12,80}$/i.test(id) || accessToken.length < 24) return null;
  return {
    id,
    access_token: accessToken,
    name: (params.get("name") || "Profil partagé").slice(0, 32),
    color: PROFILE_COLORS[params.get("color")] ? params.get("color") : "blue",
    created_at: new Date().toISOString(),
    last_opened_at: ""
  };
}

function addInviteProfile(invite) {
  if (!invite) return null;
  let profile = profileRegistry.profiles.find(item => item.id === invite.id);
  if (!profile) {
    profile = invite;
    profileRegistry.profiles.push(profile);
  } else {
    profile.access_token = invite.access_token;
    profile.name = invite.name || profile.name;
    profile.color = invite.color || profile.color;
  }
  profileRegistry.last_profile_id = profile.id;
  saveProfileRegistry();
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  return profile;
}

function renderProfileGate() {
  const gate = $("#profileGate");
  if (!gate) return;
  const profiles = [...profileRegistry.profiles].sort((a, b) => {
    if (a.id === profileRegistry.last_profile_id) return -1;
    if (b.id === profileRegistry.last_profile_id) return 1;
    return String(b.last_opened_at || "").localeCompare(String(a.last_opened_at || ""));
  });
  $("#profileGateTitle").textContent = profiles.length ? "Choisir un profil" : "Bienvenue";
  $("#profileGateSubtitle").textContent = profiles.length
    ? "Chaque profil garde son programme, son historique et sa couleur."
    : "Crée ton espace en quelques secondes. Aucun compte ni mot de passe.";
  $("#profileGateList").innerHTML = profiles.map((profile, index) => {
    const theme = profileColor(profile);
    return `<button class="profile-gate-item ${index === 0 ? "featured" : ""}" type="button" data-profile-id="${escapeHtml(profile.id)}" style="--profile-card-accent:${theme.accent};--profile-card-soft:${theme.soft}">
      <span class="profile-gate-avatar">${escapeHtml(initialsFor(profile.name))}</span>
      <span class="profile-gate-copy"><strong>${escapeHtml(profile.name)}</strong><small>${index === 0 ? "Dernier profil utilisé" : "Ouvrir ce profil"}</small></span>
      <span class="profile-gate-chevron">${chevronRightIcon()}</span>
    </button>`;
  }).join("");
  $$(".profile-gate-item").forEach(button => button.addEventListener("click", () => activateProfile(button.dataset.profileId)));
  gate.classList.remove("hidden");
  document.body.classList.add("profile-gate-open");
}

function hideProfileGate() {
  $("#profileGate")?.classList.add("hidden");
  document.body.classList.remove("profile-gate-open");
}

function loadState() {
  if (!activeProfile) return null;
  try {
    const raw = storage.getItem(profileStateKey(activeProfile.id));
    if (!raw) return makeInitialState(null, [], activeProfile);
    const parsed = JSON.parse(raw);
    if (!parsed.week || !Array.isArray(parsed.week.sessions)) throw new Error("État invalide");
    return migrateState(parsed);
  } catch (error) {
    console.warn("Impossible de charger les données locales", error);
    return makeInitialState(null, [], activeProfile);
  }
}

function migrateState(parsed) {
  const migrated = {
    ...parsed,
    app_version: APP_VERSION,
    schema_version: SUPPORTED_SCHEMAS.has(parsed.schema_version) ? parsed.schema_version : APP_SCHEMA,
    profile: {
      id: activeProfile?.id || parsed.profile?.id || "",
      name: activeProfile?.name || parsed.profile?.name || parsed.athlete_profile?.name || "Profil",
      color: activeProfile?.color || parsed.profile?.color || "blue"
    },
    athlete_profile: parsed.athlete_profile || {},
    week: { ...(parsed.week || blankProgram(activeProfile?.name).week), sessions: Array.isArray(parsed.week?.sessions) ? parsed.week.sessions : [] },
    daily_weights: parsed.daily_weights || {},
    session_results: parsed.session_results || {},
    weekly_review: { ...emptyWeeklyReview(), ...(parsed.weekly_review || {}) },
    history: Array.isArray(parsed.history) ? parsed.history : [],
    integration: { prompt_version: CHAT_PROMPT_VERSION, prompt_copied_at: "", ...(parsed.integration || {}) }
  };
  migrated.week.sessions.forEach(session => {
    session.exercises = Array.isArray(session.exercises) ? session.exercises : [];
    session.exercises.forEach(exerciseData => {
      exerciseData.sets = Array.isArray(exerciseData.sets) ? exerciseData.sets : [];
    });
    const sr = migrated.session_results[session.id];
    if (!sr) return;
    sr.completed_at = sr.completed_at || (sr.status === "done" ? parsed.updated_at || "" : "");
    sr.skipped_at = sr.skipped_at || "";
    sr.skip_reason = sr.skip_reason || "";
    sr.exercises = sr.exercises || {};
    session.exercises.forEach(exerciseData => {
      const er = sr.exercises[exerciseData.id];
      if (!er) return;
      er.issues = er.issues || [];
      er.technique_flags = er.technique_flags || [];
      er.pain = er.pain || { area: "", intensity: "", continued: false };
      er.overall_rpe = er.overall_rpe ?? "";
      er.overall_rir = er.overall_rir ?? "";
      er.show_sets = Boolean(er.show_sets);
      er.show_rpe = Boolean(er.show_rpe);
      er.show_all_rpe = Boolean(er.show_all_rpe);
      er.sets = (er.sets || []).map((setData, index) => {
        const planned = exerciseData.sets[index] || {};
        return {
          weight_kg: setData.weight_kg ?? planned.weight_kg ?? "",
          reps: setData.reps ?? planned.reps ?? planned.reps_min ?? "",
          duration_sec: setData.duration_sec ?? planned.duration_sec ?? "",
          distance_m: setData.distance_m ?? planned.distance_m ?? "",
          rpe: setData.rpe ?? "",
          rir: setData.rir ?? "",
          completed: typeof setData.completed === "boolean" ? setData.completed : FINISHED_EXERCISE_STATUSES.has(er.status)
        };
      });
    });
  });
  storage.setItem(profileStateKey(activeProfile.id), JSON.stringify(migrated));
  return migrated;
}

function saveState({ render = false, sync = true } = {}) {
  if (!state || !activeProfile) return;
  state.updated_at = new Date().toISOString();
  state.app_version = APP_VERSION;
  state.profile = { id: activeProfile.id, name: activeProfile.name, color: activeProfile.color };
  storage.setItem(profileStateKey(activeProfile.id), JSON.stringify(state));
  if (sync && syncMeta) {
    syncMeta.dirty = true;
    persistSyncMeta();
    scheduleAutoSync();
  }
  renderSyncPanel();
  if (render) renderCurrentView();
  else {
    renderSummary();
    updateResumeButton();
  }
}

function sessionResult(sessionId, targetState = state) {
  if (!targetState.session_results[sessionId]) {
    targetState.session_results[sessionId] = {
      status: "planned",
      weight_kg: "",
      energy_before: "",
      actual_duration_min: "",
      global_rpe: "",
      comment: "",
      completed_at: "",
      skipped_at: "",
      skip_reason: "",
      exercises: {}
    };
  }
  return targetState.session_results[sessionId];
}

function exerciseResult(sessionId, exerciseData, targetState = state) {
  const session = sessionResult(sessionId, targetState);
  if (!session.exercises[exerciseData.id]) {
    session.exercises[exerciseData.id] = {
      status: "planned",
      issues: [],
      technique_flags: [],
      pain: { area: "", intensity: "", continued: false },
      filmed: false,
      note: "",
      overall_rpe: "",
      overall_rir: "",
      show_sets: false,
      show_rpe: false,
      show_all_rpe: false,
      sets: (exerciseData.sets || []).map(planned => ({
        weight_kg: planned.weight_kg ?? "",
        reps: planned.reps ?? planned.reps_min ?? "",
        duration_sec: planned.duration_sec ?? "",
        distance_m: planned.distance_m ?? "",
        rpe: "",
        rir: "",
        completed: false
      }))
    };
  }
  return session.exercises[exerciseData.id];
}

function activateProfile(profileId, { invited = false } = {}) {
  const profile = profileRegistry.profiles.find(item => item.id === profileId);
  if (!profile) return;
  profileActivationVersion += 1;
  clearTimeout(syncTimer);
  syncInFlight = false;
  stopTimer();
  activeProfile = profile;
  activeProfile.last_opened_at = new Date().toISOString();
  profileRegistry.last_profile_id = profile.id;
  saveProfileRegistry();
  applyProfileTheme(profile);
  state = loadState();
  syncMeta = loadSyncMeta();
  currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
  activeExerciseId = null;
  pendingImport = null;
  pendingRemoteConflict = null;
  currentViewId = "weekView";
  hideProfileGate();
  renderProfileUI();
  hydrateReview();
  renderAll();
  showView("weekView");
  window.setTimeout(() => synchronize({ reason: invited ? "invite" : "initial", silent: !invited }), 220);
}

function renderProfileUI() {
  if (!activeProfile || !state) return;
  const initials = initialsFor(activeProfile.name);
  $("#headerProfileInitials").textContent = initials;
  $("#dataProfileAvatar").textContent = initials;
  $("#dataProfileName").textContent = activeProfile.name;
  const sessionCount = state.week?.sessions?.length || 0;
  $("#dataProfileMeta").textContent = sessionCount
    ? `${sessionCount} séance${sessionCount > 1 ? "s" : ""} dans la semaine active`
    : "Aucun programme importé";
  const promptDate = state.integration?.prompt_copied_at;
  $("#chatPromptStatus").textContent = promptDate
    ? `Prompt copié ${formatCompactDate(promptDate)} · protocole ${CHAT_PROMPT_VERSION}`
    : "Le prompt ne modifie pas le fond de ton coaching.";
}

function renderProfileColorChoices(container, selectedColor, inputName) {
  container.innerHTML = Object.entries(PROFILE_COLORS).map(([key, color]) => `
    <label class="profile-color-choice" title="${escapeHtml(color.label)}">
      <input type="radio" name="${inputName}" value="${key}" ${key === selectedColor ? "checked" : ""}>
      <span style="--choice-color:${color.accent}"><i></i></span>
      <small>${escapeHtml(color.label)}</small>
    </label>`).join("");
}

function openCreateProfileDialog() {
  selectedNewProfileColor = "blue";
  $("#newProfileName").value = "";
  $("#newProfilePreviewName").textContent = "Ton profil";
  $("#newProfilePreviewAvatar").textContent = "?";
  renderProfileColorChoices($("#newProfileColors"), selectedNewProfileColor, "newProfileColor");
  updateNewProfilePreview();
  $("#createProfileDialog").showModal();
  window.setTimeout(() => $("#newProfileName").focus(), 120);
}

function updateNewProfilePreview() {
  const name = $("#newProfileName").value.trim() || "Ton profil";
  const color = PROFILE_COLORS[selectedNewProfileColor] || PROFILE_COLORS.blue;
  $("#newProfilePreviewName").textContent = name;
  $("#newProfilePreviewAvatar").textContent = initialsFor(name);
  $("#newProfilePreviewAvatar").style.setProperty("--preview-color", color.accent);
}

function createProfileFromForm(event) {
  event.preventDefault();
  const name = $("#newProfileName").value.trim();
  if (!name) return;
  const profile = createProfileRecord(name, selectedNewProfileColor);
  profileRegistry.profiles.push(profile);
  profileRegistry.last_profile_id = profile.id;
  saveProfileRegistry();
  storage.setItem(profileStateKey(profile.id), JSON.stringify(makeInitialState(null, [], profile)));
  storage.setItem(profileSyncKey(profile.id), JSON.stringify({
    device_id: createDeviceId(), remote_revision: 0, last_synced_at: "", dirty: true,
    configured: null, last_error: ""
  }));
  $("#createProfileDialog").close();
  $("#profileSwitcherDialog")?.close();
  activateProfile(profile.id);
  $("#chatOnboardingDialog").showModal();
}

function renderProfileSwitcher() {
  if (!activeProfile) return;
  $("#profileSwitcherList").innerHTML = profileRegistry.profiles.map(profile => {
    const theme = profileColor(profile);
    const active = profile.id === activeProfile.id;
    return `<button class="profile-switcher-item ${active ? "active" : ""}" type="button" data-profile-id="${escapeHtml(profile.id)}" style="--profile-card-accent:${theme.accent};--profile-card-soft:${theme.soft}">
      <span class="profile-switcher-avatar">${escapeHtml(initialsFor(profile.name))}</span>
      <span><strong>${escapeHtml(profile.name)}</strong><small>${active ? "Profil ouvert" : "Changer de profil"}</small></span>
      <span class="profile-switcher-check">${active ? checkIcon() : chevronRightIcon()}</span>
    </button>`;
  }).join("");
  $$(".profile-switcher-item").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.profileId === activeProfile.id) return;
    $("#profileSwitcherDialog").close();
    activateProfile(button.dataset.profileId);
  }));
}

function openProfileSwitcher() {
  renderProfileSwitcher();
  $("#profileSwitcherDialog").showModal();
}

function openProfileSettings() {
  if (!activeProfile) return;
  $("#editProfileName").value = activeProfile.name;
  selectedEditProfileColor = activeProfile.color;
  renderProfileColorChoices($("#editProfileColors"), selectedEditProfileColor, "editProfileColor");
  $("#profileSettingsDialog").showModal();
}

function saveProfileSettings(event) {
  event.preventDefault();
  if (!activeProfile) return;
  const name = $("#editProfileName").value.trim();
  if (!name) return;
  activeProfile.name = name.slice(0, 32);
  activeProfile.color = PROFILE_COLORS[selectedEditProfileColor] ? selectedEditProfileColor : "blue";
  state.profile = { id: activeProfile.id, name: activeProfile.name, color: activeProfile.color };
  if (!state.athlete_profile?.name) state.athlete_profile = { ...(state.athlete_profile || {}), name: activeProfile.name };
  saveProfileRegistry();
  applyProfileTheme();
  saveState({ render: true });
  renderProfileUI();
  $("#profileSettingsDialog").close();
  toast("Profil mis à jour");
}

async function shareApplication() {
  const url = `${location.origin}${location.pathname}`;
  const payload = {
    title: "Série — Carnet d’entraînement",
    text: "Transforme ton programme ChatGPT en carnet d’entraînement interactif.",
    url
  };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await copyTextToClipboard(url);
  toast("Lien de Série copié");
}

async function copyProfileLink() {
  const link = buildProfileLink();
  if (!link) return;
  try { await navigator.clipboard.writeText(link); }
  catch { fallbackCopy(link); }
  toast("Lien du profil copié");
}

function deleteCurrentProfile() {
  if (!activeProfile) return;
  const profile = activeProfile;
  confirmAction(
    `Supprimer ${profile.name} ?`,
    "Le programme et l’historique seront supprimés de cet appareil et de la synchronisation en ligne. Télécharge une sauvegarde auparavant si nécessaire.",
    async () => {
      try { await deleteRemoteProfile(profile); } catch (error) { console.warn("Suppression distante impossible", error); }
      storage.removeItem(profileStateKey(profile.id));
      storage.removeItem(profileSyncKey(profile.id));
      profileRegistry.profiles = profileRegistry.profiles.filter(item => item.id !== profile.id);
      profileRegistry.last_profile_id = profileRegistry.profiles[0]?.id || "";
      saveProfileRegistry();
      activeProfile = null;
      state = null;
      syncMeta = null;
      $("#profileSettingsDialog").close();
      renderProfileGate();
    }
  );
}

async function deleteRemoteProfile(profile) {
  if (!navigator.onLine || !profile) return;
  const response = await fetchWithTimeout(`${SYNC_ENDPOINT}?profile_id=${encodeURIComponent(profile.id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${profile.access_token}`, accept: "application/json" }
  });
  if (!response.ok && response.status !== 404) throw new Error("Suppression distante impossible");
}

function init() {
  bindStaticEvents();
  bindProfileEvents();
  migrateLegacyProfileIfNeeded();
  pendingInviteProfile = parseProfileInvite();
  if (pendingInviteProfile) {
    const profile = addInviteProfile(pendingInviteProfile);
    registerServiceWorker();
    activateProfile(profile.id, { invited: true });
    toast("Profil ajouté sur cet appareil");
    return;
  }
  registerServiceWorker();
  renderProfileGate();
}


function bindProfileEvents() {
  $("#createProfileFromGate").addEventListener("click", openCreateProfileDialog);
  $("#profileMenuBtn").addEventListener("click", openProfileSwitcher);
  $("#openProfileSettingsBtn").addEventListener("click", openProfileSettings);
  $("#closeCreateProfile").addEventListener("click", () => $("#createProfileDialog").close());
  $("#createProfileForm").addEventListener("submit", createProfileFromForm);
  $("#newProfileName").addEventListener("input", updateNewProfilePreview);
  $("#newProfileColors").addEventListener("change", event => {
    if (!event.target.matches('input[name="newProfileColor"]')) return;
    selectedNewProfileColor = event.target.value;
    updateNewProfilePreview();
  });

  $("#closeProfileSwitcher").addEventListener("click", () => $("#profileSwitcherDialog").close());
  $("#addProfileFromSwitcher").addEventListener("click", () => {
    $("#profileSwitcherDialog").close();
    openCreateProfileDialog();
  });
  $("#manageCurrentProfileBtn").addEventListener("click", () => {
    $("#profileSwitcherDialog").close();
    openProfileSettings();
  });

  $("#closeProfileSettings").addEventListener("click", () => $("#profileSettingsDialog").close());
  $("#profileSettingsForm").addEventListener("submit", saveProfileSettings);
  $("#editProfileColors").addEventListener("change", event => {
    if (event.target.matches('input[name="editProfileColor"]')) selectedEditProfileColor = event.target.value;
  });
  $("#copyProfileLinkBtn").addEventListener("click", copyProfileLink);
  $("#deleteProfileBtn").addEventListener("click", deleteCurrentProfile);

  $("#copyChatSetupPromptBtn").addEventListener("click", copyChatSetupPrompt);
  $("#copyConversionPromptBtn").addEventListener("click", copyConversionPrompt);
  $("#openChatGptBtn").addEventListener("click", () => window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer"));
  $("#shareAppBtn").addEventListener("click", shareApplication);
  $("#onboardingCopyPromptBtn").addEventListener("click", async () => {
    await copyChatSetupPrompt();
    $("#chatOnboardingDialog").close();
    showView("dataView");
  });
  $("#onboardingLaterBtn").addEventListener("click", () => $("#chatOnboardingDialog").close());
  $("#closeChatOnboarding").addEventListener("click", () => $("#chatOnboardingDialog").close());

  const appearance = window.matchMedia?.("(prefers-color-scheme: dark)");
  appearance?.addEventListener?.("change", () => activeProfile && applyProfileTheme());
}

function bindStaticEvents() {
  $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$(".history-tab").forEach(button => button.addEventListener("click", () => showHistoryPanel(button.dataset.historyPanel)));
  $$(".weight-range-btn").forEach(button => button.addEventListener("click", () => {
    weightRange = button.dataset.weightRange;
    $$(".weight-range-btn").forEach(item => item.classList.toggle("active", item === button));
    renderWeightHistory();
  }));
  $("#backToWeek").addEventListener("click", () => showView("weekView"));

  $("#dailyWeight").addEventListener("change", event => {
    const value = numberOrBlank(event.target.value);
    if (value === "") delete state.daily_weights[todayKey()];
    else state.daily_weights[todayKey()] = value;
    const todaySession = findNextSession();
    if (todaySession && value !== "" && !sessionResult(todaySession.id).weight_kg) sessionResult(todaySession.id).weight_kg = value;
    saveState();
    renderWeightTrend();
  });

  $("#sessionWeight").addEventListener("change", event => {
    const result = sessionResult(currentSessionId);
    result.weight_kg = numberOrBlank(event.target.value);
    if (result.weight_kg !== "") state.daily_weights[todayKey()] = result.weight_kg;
    saveState();
    renderWeightTrend();
  });
  $("#actualDuration").addEventListener("change", event => updateSessionField("actual_duration_min", numberOrBlank(event.target.value)));
  $("#sessionComment").addEventListener("input", debounce(event => updateSessionField("comment", event.target.value), 250));
  $("#completeSessionBtn").addEventListener("click", () => {
    completeCurrentSession();
    $("#finishSessionDialog").close();
  });
  $("#completeDockBtn").addEventListener("click", openFinishDialog);
  $("#closeFinishDialog").addEventListener("click", () => $("#finishSessionDialog").close());

  $("#sessionMenuBtn").addEventListener("click", () => $("#sessionActionsDialog").showModal());
  $("#closeSessionActions").addEventListener("click", () => $("#sessionActionsDialog").close());
  $("#skipSessionBtn").addEventListener("click", () => {
    $("#sessionActionsDialog").close();
    openSkipSessionDialog();
  });
  $("#skipSessionForm").addEventListener("submit", confirmSkipCurrentSession);
  $("#closeSkipDialog").addEventListener("click", () => $("#skipSessionDialog").close());

  $("#closeExerciseMenu").addEventListener("click", () => $("#exerciseMenuDialog").close());
  $("#exerciseProblemAction").addEventListener("click", () => {
    if (!exerciseMenuContext) return;
    const { sessionId, exerciseId } = exerciseMenuContext;
    $("#exerciseMenuDialog").close();
    openIssueDialog(sessionId, exerciseId);
  });
  $("#exerciseFilmedAction").addEventListener("change", event => {
    if (!exerciseMenuContext) return;
    const session = state.week.sessions.find(item => item.id === exerciseMenuContext.sessionId);
    const exerciseData = session?.exercises.find(item => item.id === exerciseMenuContext.exerciseId);
    if (!session || !exerciseData) return;
    exerciseResult(session.id, exerciseData).filmed = event.target.checked;
    saveState();
    renderSession(session.id);
    reopenExercise(exerciseData.id);
  });
  $("#exerciseReplaceAction").addEventListener("click", () => setExerciseManualStatus("replaced"));
  $("#exerciseSkipAction").addEventListener("click", () => setExerciseManualStatus("skipped"));

  ["Steps", "Cardio", "Events", "Feeling"].forEach(name => {
    const element = $(`#review${name}`);
    const key = name.toLowerCase();
    element.addEventListener(element.tagName === "TEXTAREA" || element.type === "text" ? "input" : "change", debounce(event => {
      state.weekly_review[key] = event.target.value;
      saveState();
      refreshReportPreview();
    }, 250));
  });

  $("#copyReportBtn").addEventListener("click", copyReport);
  $("#downloadReportBtn").addEventListener("click", downloadReport);
  $("#pasteImportBtn").addEventListener("click", pasteImport);
  $("#previewImportBtn").addEventListener("click", previewImport);
  $("#backupBtn").addEventListener("click", downloadBackup);
  $("#restoreInput").addEventListener("change", restoreBackup);
  $("#syncNowBtn").addEventListener("click", () => synchronize({ reason: "manual" }));
  $("#pushLocalBtn").addEventListener("click", forcePushCurrentState);
  $("#pullRemoteBtn").addEventListener("click", forcePullRemoteState);
  $("#useRemoteBtn").addEventListener("click", resolveConflictWithRemote);
  $("#keepLocalBtn").addEventListener("click", resolveConflictWithLocal);
  $("#downloadConflictBackupBtn").addEventListener("click", downloadBackup);
  window.addEventListener("online", () => synchronize({ reason: "online", silent: true }));
  window.addEventListener("offline", renderSyncPanel);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") synchronize({ reason: "resume", silent: true });
  });

  $("#resetDemoBtn").addEventListener("click", () => confirmAction(
    "Réinitialiser l’avancement ?",
    "Le programme et l’historique seront conservés. Seules les saisies, pesées et validations de la semaine actuelle seront effacées.",
    () => {
      state.daily_weights = {};
      state.session_results = {};
      state.weekly_review = emptyWeeklyReview();
      currentSessionId = state.week.sessions[0]?.id || null;
      activeExerciseId = null;
      pendingImport = null;
      stopTimer();
      saveState();
      hydrateReview();
      renderAll();
      showView("weekView");
      toast("Avancement de la semaine réinitialisé");
    }
  ));

  $("#resumeSessionBtn").addEventListener("click", () => {
    const inProgress = findInProgressSession();
    if (inProgress) openSession(inProgress.id);
  });

  $("#prevExerciseBtn").addEventListener("click", () => moveExercise(-1));
  $("#nextExerciseBtn").addEventListener("click", () => moveExercise(1));
  $("#timerBtn").addEventListener("click", toggleTimer);
  $("#addTimerBtn").addEventListener("click", () => {
    timerRemaining += 30;
    if (!timerRunning) startTimerInterval();
    updateTimerDisplay();
  });

  const updateKeyboardState = () => {
    const vv = window.visualViewport;
    const keyboardOpen = vv ? window.innerHeight - vv.height > 150 : ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    document.body.classList.toggle("keyboard-open", keyboardOpen);
  };
  window.visualViewport?.addEventListener("resize", updateKeyboardState);
  document.addEventListener("focusin", updateKeyboardState);
  document.addEventListener("focusout", () => setTimeout(updateKeyboardState, 120));

  bindIssueDialog();

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#installBtn").classList.remove("hidden");
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#installBtn").classList.add("hidden");
  });
}
function bindIssueDialog() {
  const dialog = $("#issueDialog");
  $("#issueForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!issueContext) return;
    const session = state.week.sessions.find(item => item.id === issueContext.sessionId);
    const exerciseData = session?.exercises.find(item => item.id === issueContext.exerciseId);
    if (!session || !exerciseData) return;
    const result = exerciseResult(session.id, exerciseData);
    result.issues = [...$("#issueChoices").querySelectorAll("input:checked")].map(input => input.value);
    result.technique_flags = [...$("#techniqueChoices").querySelectorAll("input:checked")].map(input => input.value);
    result.pain = {
      area: $("#painArea").value.trim(),
      intensity: numberOrBlank($("#painIntensity").dataset.value),
      continued: $("#painContinued").checked
    };
    result.note = $("#issueNote").value.trim();
    if (result.issues.includes("replaced")) result.status = "replaced";
    saveState();
    dialog.close();
    renderSession(session.id);
    reopenExercise(exerciseData.id);
    toast(result.issues.length ? "Problème enregistré" : "Signalement supprimé");
  });

  $("#issueChoices").addEventListener("change", toggleConditionalIssueFields);
  $("#closeIssueDialog").addEventListener("click", () => dialog.close());
}

function showView(viewId) {
  currentViewId = viewId;
  $$(".view").forEach(view => view.classList.toggle("active", view.id === viewId));
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === viewId));
  const titles = { weekView: "Accueil", sessionView: "Séance", historyView: "Historique", reviewView: "Bilan", dataView: "Données" };
  $("#pageTitle").textContent = titles[viewId] || "Série";
  document.body.classList.toggle("session-mode", viewId === "sessionView");
  const activeSessionClosed = currentSessionId ? ["done", "skipped"].includes(sessionResult(currentSessionId).status) : true;
  $("#trainingDock").classList.toggle("hidden", viewId !== "sessionView" || activeSessionClosed);
  if (viewId === "weekView") renderWeek();
  if (viewId === "sessionView") renderSession(currentSessionId);
  if (viewId === "historyView") renderHistory();
  if (viewId === "dataView") { renderSyncPanel(); renderProfileUI(); }
  if (viewId === "reviewView") {
    hydrateReview();
    renderReviewSummary();
    refreshReportPreview();
  }
  updateResumeButton();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderCurrentView() {
  if (currentViewId === "weekView") renderWeek();
  else if (currentViewId === "sessionView") renderSession(currentSessionId);
  else if (currentViewId === "historyView") renderHistory();
  else if (currentViewId === "dataView") renderSyncPanel();
  else if (currentViewId === "reviewView") {
    hydrateReview();
    renderReviewSummary();
    refreshReportPreview();
  }
}

function renderAll() {
  if (!state) return;
  renderWeek();
  renderSession(currentSessionId);
  renderHistory();
  renderReviewSummary();
  refreshReportPreview();
  updateResumeButton();
}

function renderWeek() {
  if (!state) return;
  const hasProgram = Boolean(state.week?.sessions?.length);
  $(".week-overview").classList.toggle("hidden", !hasProgram);
  $(".weight-entry-row").classList.toggle("hidden", !hasProgram);
  $("#programSectionHeading").classList.toggle("hidden", !hasProgram);
  $("#resetDemoBtn").classList.toggle("hidden", !hasProgram);
  $("#sessionList").classList.toggle("hidden", !hasProgram);
  $("#blockLabel").textContent = state.week.block_name || "Bloc actuel";
  $("#weekTitle").textContent = state.week.title || `Semaine ${state.week.number}`;
  $("#weekObjective").textContent = state.week.objective || "Objectif non renseigné";
  $("#dailyWeight").value = state.daily_weights[todayKey()] ?? "";
  renderTodayCard();
  renderWeightTrend();

  $("#sessionList").innerHTML = state.week.sessions.map((session, index) => {
    const result = sessionResult(session.id);
    const doneExercises = session.exercises.filter(ex => FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status)).length;
    const pct = session.exercises.length ? Math.round(doneExercises / session.exercises.length * 100) : 0;
    const cardClass = result.status === "done" ? "done" : result.status === "skipped" ? "skipped" : result.status === "in_progress" ? "progress" : "";
    const dateText = result.status === "done" && result.completed_at
      ? `Réalisée ${formatCompactDate(result.completed_at)}`
      : result.status === "skipped" && result.skipped_at
        ? `Non réalisée ${formatCompactDate(result.skipped_at)}`
        : sessionSuggestionText(session);
    return `
      <button class="session-card ${cardClass} open-session" type="button" data-session-id="${escapeHtml(session.id)}">
        <div class="session-card-main">
          <span class="session-index">${result.status === "done" ? checkIcon() : result.status === "skipped" ? "—" : index + 1}</span>
          <div class="session-card-copy">
            <p class="session-day">Jour ${index + 1}</p>
            <h3>${escapeHtml(session.title)}</h3>
          </div>
          <span class="session-card-go">${chevronRightIcon()}</span>
        </div>
        <div class="session-card-meta">
          <span>${session.estimated_duration_min || "—"} min</span>
          <span>•</span>
          <span>${doneExercises}/${session.exercises.length} exercices</span>
          <span>•</span>
          <span>${escapeHtml(dateText || STATUS_LABELS[result.status] || "À faire")}</span>
        </div>
        <div class="mini-progress"><span style="width:${pct}%"></span></div>
      </button>`;
  }).join("");

  $$(".open-session").forEach(button => button.addEventListener("click", () => openSession(button.dataset.sessionId)));
  renderSummary();
}

function renderTodayCard() {
  const container = $("#todayCard");
  if (!state.week?.sessions?.length) {
    container.innerHTML = `<article class="program-empty-card">
      <div class="program-empty-visual" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="context-label">Première étape</p>
      <h2>Transforme ton programme ChatGPT</h2>
      <p>Garde ta conversation et ta méthode. Série convertit simplement les séances en interface interactive.</p>
      <button class="primary-button setup-chat-button" type="button">Configurer mon chat</button>
      <button class="text-button import-response-button" type="button">J’ai déjà une réponse à importer</button>
    </article>`;
    container.querySelector(".setup-chat-button").addEventListener("click", () => $("#chatOnboardingDialog").showModal());
    container.querySelector(".import-response-button").addEventListener("click", () => { showView("dataView"); window.setTimeout(pasteImport, 180); });
    return;
  }
  const session = findNextSession();
  if (!session) {
    container.innerHTML = `<article class="today-rest"><p class="context-label">Semaine clôturée</p><h2>Toutes les séances sont traitées</h2><p class="muted">Tu peux compléter le bilan puis exporter la semaine vers ChatGPT.</p></article>`;
    return;
  }
  const index = state.week.sessions.findIndex(item => item.id === session.id);
  const result = sessionResult(session.id);
  const done = session.exercises.filter(ex => FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status)).length;
  const suggestion = sessionSuggestionText(session);
  container.innerHTML = `
    <article class="today-session">
      <div class="today-label">${calendarIcon()} Prochaine séance</div>
      <div class="today-title-line"><span>Jour ${index + 1}</span>${suggestion ? `<small>${escapeHtml(suggestion)}</small>` : ""}</div>
      <h2>${escapeHtml(session.title)}</h2>
      <p>${escapeHtml(session.goal || "")}</p>
      <div class="today-meta"><span>${session.estimated_duration_min || "—"} min</span><span>${session.exercises.length} exercices</span><span>${done}/${session.exercises.length} validés</span></div>
      <button class="primary-button start-today" type="button">${result.status === "in_progress" ? "Reprendre la séance" : "Commencer la séance"}</button>
    </article>`;
  container.querySelector(".start-today").addEventListener("click", () => openSession(session.id));
}

function renderSummary() {
  if (!state.week?.sessions) return;
  const metrics = calculateMetrics(state);
  const usesRir = metrics.avgRpe === null && metrics.avgRir !== null;
  $("#doneSessions").textContent = `${metrics.doneSessions}/${metrics.totalSessions}`;
  $("#progressValue").textContent = `${metrics.weekProgress}%`;
  $("#progressRing").style.width = `${metrics.weekProgress}%`;
  $("#weekWeight").textContent = metrics.avgWeight ? `${metrics.avgWeight.toFixed(1)} kg` : "—";
  $("#weekRpe").textContent = usesRir ? metrics.avgRir.toFixed(1) : metrics.avgRpe ? metrics.avgRpe.toFixed(1) : "—";
  $("#weekEffortLabel").textContent = usesRir ? "RIR moyen" : "RPE moyen";
}

function renderWeightTrend() {
  const all = allWeightEntries();
  const latest = all.at(-1)?.value;
  const lastSeven = all.slice(-7).map(item => item.value);
  const previousSeven = all.slice(-14, -7).map(item => item.value);
  const avg7 = lastSeven.length ? average(lastSeven) : null;
  const prevAvg = previousSeven.length ? average(previousSeven) : null;
  const delta = avg7 !== null && prevAvg !== null ? avg7 - prevAvg : null;
  const parts = [];
  if (avg7 !== null) parts.push(`Moy. 7 pesées ${avg7.toFixed(1)} kg`);
  if (delta !== null) parts.push(`${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`);
  if (!parts.length && latest) parts.push(`Dernière ${latest.toFixed(1)} kg`);
  $("#weightTrend").textContent = parts.join(" · ") || "Aucune pesée enregistrée";
}
function openSession(sessionId) {
  currentSessionId = sessionId;
  const session = state.week.sessions.find(item => item.id === sessionId);
  if (!session) return;
  const result = sessionResult(sessionId);
  if (result.status === "planned") result.status = "in_progress";
  const firstIncomplete = session.exercises.find(ex => !FINISHED_EXERCISE_STATUSES.has(exerciseResult(sessionId, ex).status));
  activeExerciseId = firstIncomplete?.id || session.exercises[0]?.id || null;
  saveState();
  renderSession(sessionId);
  showView("sessionView");
}

function renderSession(sessionId) {
  const session = state.week.sessions.find(item => item.id === sessionId) || state.week.sessions[0];
  if (!session) return;
  currentSessionId = session.id;
  const result = sessionResult(session.id);
  if (!activeExerciseId || !session.exercises.some(ex => ex.id === activeExerciseId)) {
    activeExerciseId = session.exercises.find(ex => !FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status))?.id || session.exercises[0]?.id || null;
  }

  const sessionIndex = state.week.sessions.findIndex(item => item.id === session.id);
  $("#sessionDay").textContent = sessionHeaderLabel(session, sessionIndex);
  $("#sessionTitle").textContent = session.title;
  $("#sessionGoal").textContent = session.goal || "";
  $("#sessionStatusPill").textContent = STATUS_LABELS[result.status] || "À faire";
  $("#sessionWeight").value = result.weight_kg || state.daily_weights[todayKey()] || "";
  $("#actualDuration").value = result.actual_duration_min || "";
  $("#sessionComment").value = result.comment || "";
  $("#completeSessionBtn").textContent = result.status === "done" ? "Séance terminée ✓" : "Valider la séance";
  $("#completeSessionBtn").disabled = result.status === "done" || result.status === "skipped";
  $("#sessionMenuBtn").classList.toggle("hidden", result.status === "done" || result.status === "skipped");
  const completionMeta = $("#sessionCompletionMeta");
  const completionText = result.status === "done" && result.completed_at
    ? `Réalisée le ${formatDateTime(result.completed_at)}`
    : result.status === "skipped" && result.skipped_at
      ? `Non réalisée le ${formatDateTime(result.skipped_at)}${result.skip_reason ? ` · ${result.skip_reason}` : ""}`
      : "";
  completionMeta.textContent = completionText;
  completionMeta.classList.toggle("hidden", !completionText);

  renderRatingStepper($("#sessionEnergy"), result.energy_before, 1, 10, value => updateSessionField("energy_before", value));
  renderRpeButtons($("#sessionRpe"), result.global_rpe, value => updateSessionField("global_rpe", value));
  renderSessionProgress(session);

  $("#exerciseList").innerHTML = session.exercises.map((exerciseData, index) => renderExerciseCard(session, exerciseData, index)).join("");
  bindExerciseEvents(session);
  updateDockNavigation(session);
}

function renderSessionProgress(session) {
  const done = session.exercises.filter(ex => FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status)).length;
  const pct = session.exercises.length ? Math.round(done / session.exercises.length * 100) : 0;
  $("#sessionProgressText").textContent = `${done}/${session.exercises.length} exercices`;
  $("#sessionProgressPct").textContent = `${pct}%`;
  $("#sessionProgressBar").style.width = `${pct}%`;
  const result = sessionResult(session.id);
  const ready = done === session.exercises.length && !["done", "skipped"].includes(result.status);
  const dock = $("#trainingDock");
  dock.classList.toggle("ready", ready);
  $("#completeDockBtn").classList.toggle("hidden", !ready);
}
function exerciseEffortMode(exerciseData) {
  const sets = exerciseData.sets || [];
  const hasRpe = sets.some(setData => numberOrBlank(setData.target_rpe_min) !== "" || numberOrBlank(setData.target_rpe_max) !== "");
  const hasRir = sets.some(setData => numberOrBlank(setData.target_rir) !== "");
  return hasRir && !hasRpe ? "rir" : "rpe";
}

function renderExerciseCard(session, exerciseData, index) {
  const result = exerciseResult(session.id, exerciseData);
  const completed = FINISHED_EXERCISE_STATUSES.has(result.status);
  const hasIssue = result.issues.length > 0;
  const isOpen = activeExerciseId === exerciseData.id;
  const issueText = buildIssueSummary(result);
  const hasGuidance = Boolean(exerciseData.instructions || exerciseData.adaptation_rule || exerciseData.general_notes);
  const effortMode = exerciseEffortMode(exerciseData);
  const effortValue = effortMode === "rir" ? result.overall_rir : result.overall_rpe;
  const showEffort = Boolean(result.show_rpe || effortValue !== "" || completed);
  const quickValues = effortMode === "rir" ? relevantRirValues(exerciseData, effortValue) : relevantRpeValues(exerciseData, effortValue);
  const effortLabel = effortMode === "rir" ? "RIR de l’exercice" : "RPE de l’exercice";
  const superset = exerciseData.superset_group ? `<span class="superset-badge">Groupe ${escapeHtml(exerciseData.superset_group)}</span>` : "";
  return `
    <article class="exercise-card ${isOpen ? "open" : ""} ${completed ? "completed" : ""} ${hasIssue ? "has-issue" : ""}" data-exercise-id="${escapeHtml(exerciseData.id)}">
      <button class="exercise-summary" type="button">
        <div class="exercise-summary-copy">
          <div class="exercise-title-row"><h3>${index + 1}. ${escapeHtml(exerciseData.name)}</h3>${superset}</div>
          <p>${escapeHtml(prescriptionText(exerciseData.sets))}${completed ? ` · ${labelFor(EXERCISE_STATUSES, result.status)}` : ""}</p>
        </div>
        <span class="exercise-state-icon">${completed ? checkIcon() : `<span class="exercise-chevron">${chevronDownIcon()}</span>`}</span>
      </button>
      <div class="exercise-body">
        ${hasGuidance ? `
          <details class="exercise-guidance">
            <summary><span>Consignes</span><span>${chevronDownIcon()}</span></summary>
            <div class="guidance-content">
              ${exerciseData.instructions ? `<p><strong>Exécution :</strong> ${escapeHtml(exerciseData.instructions)}</p>` : ""}
              ${exerciseData.adaptation_rule ? `<p><strong>Adaptation :</strong> ${escapeHtml(exerciseData.adaptation_rule)}</p>` : ""}
              ${exerciseData.general_notes ? `<p>${escapeHtml(exerciseData.general_notes)}</p>` : ""}
            </div>
          </details>` : ""}

        <div class="exercise-quick-actions">
          <button class="conform-button" type="button">Conforme</button>
          <button class="adjust-button" type="button">Ajuster</button>
          <button class="more-button" type="button" aria-label="Plus d’actions">•••</button>
        </div>
        ${issueText ? `<div class="issue-summary">${escapeHtml(issueText)}</div>` : ""}
        ${result.filmed ? `<span class="film-badge">${cameraIcon()} Série filmée</span>` : ""}

        <div class="exercise-rpe-panel ${showEffort ? "open" : "hidden-panel"}" data-effort-mode="${effortMode}">
          <div class="panel-label-row"><span>${effortLabel}</span><small>${targetEffortLabel(exerciseData)}</small></div>
          <div class="rpe-strip exercise-rpe quick-rpe-row">
            ${quickValues.map(value => `<button class="rpe-chip ${Number(effortValue) === value ? "selected" : ""}" type="button" data-value="${value}">${String(value).replace(".", ",")}</button>`).join("")}
            ${effortMode === "rpe" ? `<button class="rpe-chip rpe-other-button" type="button">Autre</button>` : ""}
          </div>
          ${effortMode === "rpe" ? `<div class="rpe-strip exercise-rpe full-rpe-row ${result.show_all_rpe ? "open" : ""}">
            ${halfRange(5, 10).map(value => `<button class="rpe-chip ${Number(effortValue) === value ? "selected" : ""}" type="button" data-value="${value}">${String(value).replace(".", ",")}</button>`).join("")}
          </div>` : ""}
        </div>

        <div class="sets-panel ${result.show_sets ? "open" : ""}">
          <div class="panel-label-row"><span>Séries réalisées</span><small>Modifie uniquement les écarts</small></div>
          ${result.sets.map((actualSet, setIndex) => renderSetRow(exerciseData, actualSet, setIndex)).join("")}
          <button class="add-set" type="button">Ajouter une série</button>
        </div>

        ${(showEffort || result.show_sets || completed) ? `<div class="exercise-save-row"><button class="primary-button exercise-complete" type="button">${completed ? "Enregistrer les modifications" : "Valider l’exercice"}</button></div>` : ""}
      </div>
    </article>`;
}

function primaryMetricForSet(setData = {}) {
  if (Number.isFinite(Number(setData.duration_sec)) && setData.duration_sec !== null && setData.duration_sec !== "") return "duration_sec";
  if (Number.isFinite(Number(setData.distance_m)) && setData.distance_m !== null && setData.distance_m !== "") return "distance_m";
  return "reps";
}

function setMetricConfig(planned = {}, actual = {}) {
  const field = primaryMetricForSet({ ...planned, ...Object.fromEntries(Object.entries(actual).filter(([, value]) => value !== "" && value !== null && value !== undefined)) });
  if (field === "duration_sec") return { field, inputClass: "set-duration", label: "sec", step: 5, min: 0, placeholder: planned.duration_sec ?? "" };
  if (field === "distance_m") {
    const target = Number(planned.distance_m || 0);
    const step = target >= 1000 ? 100 : target >= 200 ? 50 : 10;
    return { field, inputClass: "set-distance", label: "m", step, min: 0, placeholder: planned.distance_m ?? "" };
  }
  const placeholder = planned.reps ?? (planned.reps_min !== null && planned.reps_min !== undefined
    ? `${planned.reps_min}${planned.reps_max !== null && planned.reps_max !== undefined ? `–${planned.reps_max}` : ""}`
    : "");
  return { field: "reps", inputClass: "set-reps", label: "reps", step: 1, min: 0, placeholder };
}

function shouldShowWeightControl(exerciseData, actualSet, planned) {
  return (exerciseData.sets || []).some(setData => setData.weight_kg !== null && setData.weight_kg !== undefined)
    || (actualSet.weight_kg !== "" && actualSet.weight_kg !== null && actualSet.weight_kg !== undefined)
    || exerciseData.tracking_mode === "weight_reps";
}

function setControlHtml({ field, inputClass, label, step, min, placeholder }, value) {
  const delta = field === "reps" ? 1 : step;
  return `<div class="set-control" data-control-field="${field}">
    <div class="stepper">
      <button class="step-button" type="button" data-field="${field}" data-delta="-${delta}" aria-label="Diminuer ${label}">−</button>
      <input class="${inputClass}" type="number" min="${min}" step="${step}" inputmode="decimal" value="${value ?? ""}" placeholder="${escapeHtml(String(placeholder ?? ""))}">
      <button class="step-button" type="button" data-field="${field}" data-delta="${delta}" aria-label="Augmenter ${label}">+</button>
    </div><span class="set-unit">${label}</span>
  </div>`;
}

function renderSetRow(exerciseData, actualSet, index) {
  const planned = exerciseData.sets[index] || {};
  const weightStep = inferWeightStep(exerciseData);
  const metric = setMetricConfig(planned, actualSet);
  const showWeight = shouldShowWeightControl(exerciseData, actualSet, planned);
  const weightControl = showWeight ? setControlHtml({ field: "weight_kg", inputClass: "set-weight", label: "kg", step: weightStep, min: 0, placeholder: planned.weight_kg ?? "" }, actualSet.weight_kg) : "";
  const metricControl = setControlHtml(metric, actualSet[metric.field]);
  const setNote = [planned.tempo ? `Tempo ${planned.tempo}` : "", planned.notes || ""].filter(Boolean).join(" · ");
  return `
    <div class="set-row ${actualSet.completed ? "checked" : ""} ${showWeight ? "" : "single-metric"}" data-set-index="${index}">
      <span class="set-number">${index + 1}</span>
      <div class="set-controls">${weightControl}${metricControl}</div>
      <div class="set-row-actions">
        <button class="set-check ${actualSet.completed ? "checked" : ""}" type="button" aria-label="Valider la série">${checkIcon()}</button>
        <button class="remove-set" type="button" aria-label="Supprimer la série">×</button>
      </div>
      ${setNote ? `<small class="set-plan-note">${escapeHtml(setNote)}</small>` : ""}
    </div>`;
}

function actualSetFromPlanned(planned = {}, completed = false) {
  return {
    weight_kg: planned.weight_kg ?? "",
    reps: planned.reps ?? planned.reps_min ?? "",
    duration_sec: planned.duration_sec ?? "",
    distance_m: planned.distance_m ?? "",
    rpe: "",
    rir: "",
    completed
  };
}

function bindExerciseEvents(session) {
  $$(".exercise-card").forEach(card => {
    const exerciseData = session.exercises.find(item => item.id === card.dataset.exerciseId);
    const result = exerciseResult(session.id, exerciseData);
    const effortMode = exerciseEffortMode(exerciseData);

    card.querySelector(".exercise-summary").addEventListener("click", () => {
      activeExerciseId = exerciseData.id;
      const opening = !card.classList.contains("open");
      $$(".exercise-card").forEach(other => other.classList.toggle("open", other === card && opening));
      if (opening) card.classList.add("open");
      updateDockNavigation(session);
    });

    card.querySelectorAll(".exercise-rpe .rpe-chip[data-value]").forEach(button => button.addEventListener("click", () => {
      const value = Number(button.dataset.value);
      if (effortMode === "rir") result.overall_rir = value;
      else result.overall_rpe = value;
      result.show_rpe = true;
      saveState();
      card.querySelectorAll(".exercise-rpe .rpe-chip[data-value]").forEach(item => item.classList.toggle("selected", Number(item.dataset.value) === value));
    }));

    card.querySelector(".rpe-other-button")?.addEventListener("click", () => {
      result.show_all_rpe = !result.show_all_rpe;
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelector(".conform-button").addEventListener("click", () => {
      result.sets = (exerciseData.sets || []).map(planned => actualSetFromPlanned(planned, true));
      result.status = "planned";
      result.show_sets = false;
      result.show_rpe = true;
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
      toast(`Conforme · indique le ${effortMode.toUpperCase()}`);
    });

    card.querySelector(".adjust-button").addEventListener("click", () => {
      result.show_sets = true;
      result.show_rpe = true;
      if (FINISHED_EXERCISE_STATUSES.has(result.status)) result.status = "planned";
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelector(".more-button").addEventListener("click", () => openExerciseMenu(session.id, exerciseData.id));
    card.querySelectorAll(".set-row").forEach(row => bindSetRow(row, result, exerciseData, session));

    card.querySelector(".add-set")?.addEventListener("click", () => {
      const last = result.sets.at(-1) || { weight_kg: "", reps: "", duration_sec: "", distance_m: "", rpe: "", rir: "", completed: false };
      result.sets.push({ ...last, rpe: "", rir: "", completed: false });
      result.show_sets = true;
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelector(".exercise-complete")?.addEventListener("click", () => {
      const effortValue = effortMode === "rir" ? result.overall_rir : result.overall_rpe;
      if (!["replaced", "skipped"].includes(result.status) && numberOrBlank(effortValue) === "") {
        toast(`Indique le ${effortMode.toUpperCase()} avant de valider`);
        return;
      }
      if (!["replaced", "skipped"].includes(result.status)) result.status = inferExerciseStatus(exerciseData, result);
      result.show_rpe = true;
      saveState();
      advanceAfterExercise(session, exerciseData.id, "Exercice enregistré");
    });
  });
}

function relevantRpeValues(exerciseData, selected) {
  const targets = (exerciseData.sets || []).flatMap(setData => [setData.target_rpe_min, setData.target_rpe_max]).map(numberOrBlank).filter(value => value !== "");
  const center = numberOrBlank(selected) !== "" ? Number(selected) : (targets.length ? roundToHalf(average(targets)) : 8);
  const values = [center - 1, center - .5, center, center + .5, center + 1]
    .map(value => Math.max(5, Math.min(10, roundToHalf(value))));
  return [...new Set(values)];
}

function relevantRirValues(exerciseData, selected) {
  const targets = (exerciseData.sets || []).map(setData => numberOrBlank(setData.target_rir)).filter(value => value !== "");
  const center = numberOrBlank(selected) !== "" ? Number(selected) : (targets.length ? Math.round(average(targets)) : 2);
  return [...new Set([center - 2, center - 1, center, center + 1, center + 2].map(value => Math.max(0, Math.min(5, Math.round(value)))))];
}

function targetEffortLabel(exerciseData) {
  if (exerciseEffortMode(exerciseData) === "rir") {
    const targets = (exerciseData.sets || []).map(setData => numberOrBlank(setData.target_rir)).filter(value => value !== "");
    if (!targets.length) return "";
    const min = Math.min(...targets);
    const max = Math.max(...targets);
    return min === max ? `Cible ${min}` : `Cible ${min}–${max}`;
  }
  const mins = (exerciseData.sets || []).map(setData => numberOrBlank(setData.target_rpe_min)).filter(value => value !== "");
  const maxs = (exerciseData.sets || []).map(setData => numberOrBlank(setData.target_rpe_max)).filter(value => value !== "");
  if (!mins.length && !maxs.length) return "Effort perçu";
  const min = mins.length ? Math.min(...mins) : Math.min(...maxs);
  const max = maxs.length ? Math.max(...maxs) : Math.max(...mins);
  return min === max ? `Cible ${String(min).replace(".", ",")}` : `Cible ${String(min).replace(".", ",")}–${String(max).replace(".", ",")}`;
}

function setMatchesPlan(actual, planned) {
  if (planned.weight_kg !== null && planned.weight_kg !== undefined && numberOrBlank(actual.weight_kg) !== numberOrBlank(planned.weight_kg)) return false;
  if (planned.reps !== null && planned.reps !== undefined && numberOrBlank(actual.reps) !== numberOrBlank(planned.reps)) return false;
  if (planned.reps_min !== null && planned.reps_min !== undefined) {
    const reps = Number(actual.reps);
    const max = planned.reps_max ?? planned.reps_min;
    if (!Number.isFinite(reps) || reps < Number(planned.reps_min) || reps > Number(max)) return false;
  }
  if (planned.duration_sec !== null && planned.duration_sec !== undefined && numberOrBlank(actual.duration_sec) !== numberOrBlank(planned.duration_sec)) return false;
  if (planned.distance_m !== null && planned.distance_m !== undefined && numberOrBlank(actual.distance_m) !== numberOrBlank(planned.distance_m)) return false;
  return true;
}

function inferExerciseStatus(exerciseData, result) {
  const completed = result.sets.filter(setData => setData.completed);
  if (!completed.length) return "failed";
  if (completed.length < result.sets.length) return "partial";
  const sameLength = result.sets.length === (exerciseData.sets || []).length;
  const matchesPlan = sameLength && result.sets.every((setData, index) => setMatchesPlan(setData, exerciseData.sets[index] || {}));
  return matchesPlan ? "success" : "partial";
}

function openExerciseMenu(sessionId, exerciseId) {
  exerciseMenuContext = { sessionId, exerciseId };
  const session = state.week.sessions.find(item => item.id === sessionId);
  const exerciseData = session?.exercises.find(item => item.id === exerciseId);
  if (!session || !exerciseData) return;
  const result = exerciseResult(sessionId, exerciseData);
  $("#exerciseMenuTitle").textContent = exerciseData.name;
  $("#exerciseFilmedAction").checked = Boolean(result.filmed);
  $("#exerciseMenuDialog").showModal();
}

function setExerciseManualStatus(status) {
  if (!exerciseMenuContext) return;
  const session = state.week.sessions.find(item => item.id === exerciseMenuContext.sessionId);
  const exerciseData = session?.exercises.find(item => item.id === exerciseMenuContext.exerciseId);
  if (!session || !exerciseData) return;
  const result = exerciseResult(session.id, exerciseData);
  result.status = status;
  result.show_rpe = false;
  result.show_sets = false;
  saveState();
  $("#exerciseMenuDialog").close();
  advanceAfterExercise(session, exerciseData.id, status === "replaced" ? "Exercice marqué comme remplacé" : "Exercice non réalisé");
}

function openFinishDialog() {
  const session = state.week.sessions.find(item => item.id === currentSessionId);
  if (!session) return;
  const result = sessionResult(session.id);
  $("#actualDuration").value = result.actual_duration_min || session.estimated_duration_min || "";
  $("#sessionComment").value = result.comment || "";
  renderRpeButtons($("#sessionRpe"), result.global_rpe, value => updateSessionField("global_rpe", value));
  $("#finishSessionDialog").showModal();
}

function bindSetRow(row, result, exerciseData, session) {
  const index = Number(row.dataset.setIndex);
  const inputByField = field => row.querySelector({
    weight_kg: ".set-weight",
    reps: ".set-reps",
    duration_sec: ".set-duration",
    distance_m: ".set-distance"
  }[field]);
  const persistInputs = () => {
    if (!result.sets[index]) return;
    ["weight_kg", "reps", "duration_sec", "distance_m"].forEach(field => {
      const input = inputByField(field);
      if (input) result.sets[index][field] = numberOrBlank(input.value);
    });
    saveState();
  };
  row.querySelectorAll("input[type=number]").forEach(input => input.addEventListener("change", persistInputs));
  row.querySelectorAll(".step-button").forEach(button => button.addEventListener("click", () => {
    const field = button.dataset.field;
    const delta = Number(button.dataset.delta);
    const input = inputByField(field);
    if (!input) return;
    const current = numberOrBlank(input.value);
    const planned = exerciseData.sets[index]?.[field] ?? (field === "reps" ? exerciseData.sets[index]?.reps_min : 0);
    const base = current === "" ? Number(planned ?? 0) : Number(current);
    let next = Math.max(0, base + delta);
    if (field === "reps" || field === "duration_sec" || field === "distance_m") next = Math.round(next);
    else next = roundToHalf(next);
    input.value = next;
    result.sets[index][field] = next;
    saveState();
  }));
  row.querySelector(".set-check").addEventListener("click", () => {
    persistInputs();
    result.sets[index].completed = !result.sets[index].completed;
    const nowCompleted = result.sets[index].completed;
    if (nowCompleted) startRest(exerciseData.sets[index]?.rest_sec || 90);
    saveState();
    row.classList.toggle("checked", nowCompleted);
    row.querySelector(".set-check").classList.toggle("checked", nowCompleted);
    renderSessionProgress(session);
  });
  row.querySelector(".remove-set").addEventListener("click", () => {
    result.sets.splice(index, 1);
    if (!result.sets.length) result.sets.push({ weight_kg: "", reps: "", duration_sec: "", distance_m: "", rpe: "", rir: "", completed: false });
    saveState();
    renderSession(session.id);
    reopenExercise(exerciseData.id);
  });
}

function advanceAfterExercise(session, exerciseId, message) {
  const index = session.exercises.findIndex(ex => ex.id === exerciseId);
  const next = session.exercises.slice(index + 1).find(ex => !FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status)) || session.exercises[index + 1];
  activeExerciseId = next?.id || exerciseId;
  renderSession(session.id);
  if (next) reopenExercise(next.id, true);
  toast(message);
}

function reopenExercise(exerciseId, scroll = false) {
  requestAnimationFrame(() => {
    const card = document.querySelector(`.exercise-card[data-exercise-id="${CSS.escape(exerciseId)}"]`);
    if (!card) return;
    $$(".exercise-card").forEach(other => other.classList.toggle("open", other === card));
    if (scroll) card.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function updateSessionField(field, value) {
  const result = sessionResult(currentSessionId);
  result[field] = value;
  if (result.status === "planned") result.status = "in_progress";
  saveState();
}

function completeCurrentSession() {
  const session = state.week.sessions.find(item => item.id === currentSessionId);
  if (!session) return;
  const result = sessionResult(currentSessionId);
  result.status = "done";
  if (!result.completed_at) result.completed_at = new Date().toISOString();
  result.skipped_at = "";
  result.skip_reason = "";
  session.exercises.forEach(exerciseData => {
    const exResult = exerciseResult(currentSessionId, exerciseData);
    if (exResult.status === "planned") {
      const doneSets = exResult.sets.filter(setData => setData.completed).length;
      exResult.status = doneSets === exResult.sets.length && doneSets > 0 ? "success" : doneSets > 0 ? "partial" : "skipped";
    }
  });
  stopTimer();
  $("#trainingDock").classList.add("hidden");
  saveState();
  renderHistory();
  showView("weekView");
  toast("Séance terminée");
}

function openSkipSessionDialog() {
  const result = sessionResult(currentSessionId);
  if (["done", "skipped"].includes(result.status)) return;
  $("#skipSessionForm").reset();
  $("#skipReasonNote").value = "";
  $("#skipSessionDialog").showModal();
}

function confirmSkipCurrentSession(event) {
  event.preventDefault();
  const selected = $("#skipReasonChoices input:checked")?.value || "";
  const note = $("#skipReasonNote").value.trim();
  if (!selected && !note) {
    toast("Indique la raison de la séance non réalisée");
    return;
  }
  const session = state.week.sessions.find(item => item.id === currentSessionId);
  if (!session) return;
  const result = sessionResult(currentSessionId);
  result.status = "skipped";
  result.completed_at = "";
  result.skipped_at = new Date().toISOString();
  result.skip_reason = [selected, note].filter(Boolean).join(" — ");
  session.exercises.forEach(exerciseData => {
    const exResult = exerciseResult(currentSessionId, exerciseData);
    if (exResult.status === "planned") exResult.status = "skipped";
  });
  $("#skipSessionDialog").close();
  stopTimer();
  $("#trainingDock").classList.add("hidden");
  saveState();
  renderHistory();
  showView("weekView");
  toast("Séance notée comme non réalisée");
}

function sessionSuggestionText(session) {
  const value = String(session?.day || "").trim();
  if (!value || /^jour\s*\d+/i.test(value) || /^séance\s*\d+/i.test(value)) return "";
  return `Suggestion : ${value}`;
}

function sessionHeaderLabel(session, index) {
  const suggestion = sessionSuggestionText(session);
  return `Jour ${index + 1}${suggestion ? ` · ${suggestion}` : ""}`;
}

function renderRatingButtons(container, values, selected, onSelect, suffix = "") {
  container.dataset.value = selected ?? "";
  container.innerHTML = values.map(value => `<button type="button" class="rating-button ${String(selected) === String(value) ? "selected" : ""}" data-value="${value}">${value}${suffix}</button>`).join("");
  container.querySelectorAll(".rating-button").forEach(button => button.addEventListener("click", () => {
    container.dataset.value = button.dataset.value;
    container.querySelectorAll(".rating-button").forEach(item => item.classList.toggle("selected", item === button));
    onSelect(numberOrBlank(button.dataset.value));
  }));
}


function renderRatingStepper(container, selected, min, max, onSelect, suffix = "/10") {
  let value = Number(selected) || null;
  const paint = () => {
    container.dataset.value = value ?? "";
    container.innerHTML = `<div class="rating-stepper"><button type="button" data-delta="-1" aria-label="Diminuer">−</button><strong>${value ?? "—"}${suffix}</strong><button type="button" data-delta="1" aria-label="Augmenter">+</button></div>`;
    container.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      const base = value ?? Math.round((min + max) / 2);
      value = Math.max(min, Math.min(max, base + Number(button.dataset.delta)));
      onSelect(value);
      paint();
    }));
  };
  paint();
}

function renderRpeButtons(container, selected, onSelect) {
  container.innerHTML = rpeButtonsHtml(selected);
  container.querySelectorAll(".rpe-chip").forEach(button => button.addEventListener("click", () => {
    container.querySelectorAll(".rpe-chip").forEach(item => item.classList.toggle("selected", item === button));
    onSelect(Number(button.dataset.value));
  }));
}

function rpeButtonsHtml(selected) {
  return halfRange(5, 10).map(value => `<button type="button" class="rpe-chip ${String(selected) === String(value) ? "selected" : ""}" data-value="${value}">${String(value).replace(".5", ",5")}</button>`).join("");
}

function hydrateReview() {
  const review = state.weekly_review;
  renderRatingStepper($("#reviewSleep"), review.sleep, 1, 10, value => updateReview("sleep", value));
  renderRatingStepper($("#reviewEnergy"), review.energy, 1, 10, value => updateReview("energy", value));
  renderRatingStepper($("#reviewHunger"), review.hunger, 1, 10, value => updateReview("hunger", value));
  renderRatingStepper($("#reviewProtein"), review.protein, 1, 7, value => updateReview("protein", value), "/7");
  $("#reviewSteps").value = review.steps || "";
  $("#reviewCardio").value = review.cardio || "";
  $("#reviewEvents").value = review.events || "";
  $("#reviewFeeling").value = review.feeling || "";
}

function updateReview(field, value) {
  state.weekly_review[field] = value;
  saveState();
  refreshReportPreview();
}

function renderReviewSummary() {
  const metrics = calculateMetrics(state);
  const hasProgram = metrics.totalSessions > 0;
  $("#reviewView .review-card").classList.toggle("hidden", !hasProgram);
  $("#reviewView .export-card").classList.toggle("hidden", !hasProgram);
  $("#copyReportBtn").disabled = !hasProgram;
  $("#downloadReportBtn").disabled = !hasProgram;
  if (!hasProgram) {
    $("#reviewAutoSummary").innerHTML = `<div class="empty-state review-empty-state"><strong>Aucune semaine à analyser</strong><br><span>Importe d’abord ton programme depuis l’onglet Données.</span></div>`;
    return;
  }
  const usesRir = metrics.avgRpe === null && metrics.avgRir !== null;
  const effortValue = usesRir ? metrics.avgRir : metrics.avgRpe;
  $("#reviewAutoSummary").innerHTML = `
    <div class="summary-tile"><strong>${metrics.doneSessions}/${metrics.totalSessions}</strong><span>séances réalisées</span></div>
    <div class="summary-tile"><strong>${metrics.skippedSessions}</strong><span>séance${metrics.skippedSessions > 1 ? "s" : ""} non réalisée${metrics.skippedSessions > 1 ? "s" : ""}</span></div>
    <div class="summary-tile"><strong>${metrics.setCompletion}%</strong><span>séries validées</span></div>
    <div class="summary-tile"><strong>${effortValue !== null ? effortValue.toFixed(1) : "—"}</strong><span>${usesRir ? "RIR" : "RPE"} moyen</span></div>`;
}

function refreshReportPreview() {
  const preview = $("#reportPreview");
  if (preview) preview.textContent = generateReport().slice(0, 2400) + (generateReport().length > 2400 ? "\n\n[…]" : "");
}

function renderHistory() {
  const archived = state.history || [];
  const currentIsMeaningful = Boolean((state.week?.sessions || []).length || Object.keys(state.daily_weights || {}).length || Object.keys(state.session_results || {}).length);
  const totalWeeks = archived.length + (currentIsMeaningful ? 1 : 0);
  const allSnapshots = currentIsMeaningful ? [...archived, snapshotCurrent(false)] : [...archived];
  const totalSessions = allSnapshots.reduce((sum, snapshot) => sum + calculateMetrics(snapshot).doneSessions, 0);
  const allWeights = allWeightEntries();
  const latestWeight = allWeights.at(-1)?.value;
  $("#historyOverview").innerHTML = totalWeeks ? `
    <article class="history-hero">
      <h3>${totalWeeks} semaine${totalWeeks > 1 ? "s" : ""} suivie${totalWeeks > 1 ? "s" : ""}</h3>
      <div class="history-stats">
        <div><strong>${totalSessions}</strong><span>séances réalisées</span></div>
        <div><strong>${archived.length}</strong><span>semaines archivées</span></div>
        <div><strong>${latestWeight ? `${latestWeight.toFixed(1)} kg` : "—"}</strong><span>dernière pesée</span></div>
      </div>
    </article>` : `<div class="empty-state history-empty-state"><strong>Aucun historique pour le moment</strong><br><span>Il se construira au fil des semaines et des pesées.</span></div>`;

  if (!archived.length) {
    $("#historyList").innerHTML = `<div class="empty-state"><strong>Aucune semaine archivée</strong><br><span>La première apparaîtra lors de l’import du prochain programme.</span></div>`;
  } else {
    const ordered = [...archived].map((snapshot, index) => ({ snapshot, index })).reverse();
    const groups = groupItemsByMonth(ordered, item => item.snapshot.archived_at);
    $("#historyList").innerHTML = groups.map(group => `
      <div class="history-month-label">${escapeHtml(group.label)}</div>
      ${group.items.map(({ snapshot, index }) => {
        const metrics = calculateMetrics(snapshot);
        return `<details class="history-card">
          <summary>
            <div><p class="session-day">${escapeHtml(snapshot.week.block_name || "Bloc")}</p><h3>${escapeHtml(snapshot.week.title || `Semaine ${snapshot.week.number}`)}</h3><p class="secondary-text small">${metrics.doneSessions}/${metrics.totalSessions} séances · ${metrics.avgWeight ? `${metrics.avgWeight.toFixed(1)} kg` : "poids non renseigné"}</p></div>
            <span>${chevronDownIcon()}</span>
          </summary>
          <div class="history-body">
            <div class="history-metrics">
              <div><strong>${metrics.doneSessions}/${metrics.totalSessions}</strong><span>réalisées</span></div>
              <div><strong>${metrics.skippedSessions}</strong><span>non réalisées</span></div>
              <div><strong>${metrics.avgWeight ? `${metrics.avgWeight.toFixed(1)} kg` : "—"}</strong><span>poids moyen</span></div>
              <div><strong>${metrics.avgRpe ? metrics.avgRpe.toFixed(1) : "—"}</strong><span>RPE moyen</span></div>
            </div>
            <button class="secondary-button full-button download-history" type="button" data-history-index="${index}">Télécharger le bilan</button>
          </div>
        </details>`;
      }).join("")}`).join("");
    $$(".download-history").forEach(button => button.addEventListener("click", event => {
      event.preventDefault();
      const snapshot = state.history[Number(button.dataset.historyIndex)];
      downloadText(`bilan-semaine-${snapshot.week.number || "archive"}.txt`, generateReport(snapshot), "text/plain;charset=utf-8");
    }));
  }
  renderRecords();
  renderWeightHistory();
}

function showHistoryPanel(panel) {
  const records = panel === "records";
  const weights = panel === "weights";
  $("#historyWeeksPanel").classList.toggle("hidden", records || weights);
  $("#historyRecordsPanel").classList.toggle("hidden", !records);
  $("#historyWeightsPanel").classList.toggle("hidden", !weights);
  $$(".history-tab").forEach(button => {
    const active = button.dataset.historyPanel === panel;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (records) renderRecords();
  if (weights) renderWeightHistory();
}

function renderRecords() {
  const records = calculateExerciseRecords();
  $("#recordsOverview").innerHTML = `
    <article class="records-hero">
      <div><h3>Records de charge</h3><p>${records.length} exercice${records.length > 1 ? "s" : ""} suivi${records.length > 1 ? "s" : ""}</p></div>
      <span class="records-medal">${trophyIcon()}</span>
    </article>`;
  if (!records.length) {
    $("#recordsList").innerHTML = `<div class="empty-state"><strong>Aucun record enregistré</strong><br><span>Un record apparaît après validation d’une séance chargée.</span></div>`;
    return;
  }
  $("#recordsList").innerHTML = records.map(record => `
    <article class="record-card">
      <div class="record-copy"><h3>${escapeHtml(record.name)}</h3><p>${record.reps} rep${record.reps > 1 ? "s" : ""} · ${escapeHtml(record.sessionLabel)}</p></div>
      <div class="record-value"><strong>${record.weight.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong><span>kg</span><small>${formatCompactDate(record.date)}</small></div>
    </article>`).join("");
}

function renderWeightHistory() {
  const entries = allWeightEntries();
  const latest = entries.at(-1);
  const recent = entries.slice(-7).map(item => item.value);
  const first = entries[0];
  const averageSeven = recent.length ? average(recent) : null;
  const totalDelta = latest && first && entries.length > 1 ? latest.value - first.value : null;

  $("#weightHistoryOverview").innerHTML = `
    <article class="weight-history-hero">
      <div class="weight-history-title"><div><h3>${entries.length} pesée${entries.length > 1 ? "s" : ""} enregistrée${entries.length > 1 ? "s" : ""}</h3><p>${latest ? `Dernière mesure le ${formatDate(latest.date)}` : "Renseigne ton poids depuis l’accueil ou une séance."}</p></div><span class="weight-scale-icon">${scaleIcon()}</span></div>
      <div class="weight-history-stats">
        <div><strong>${latest ? `${latest.value.toFixed(1)} kg` : "—"}</strong><span>dernière</span></div>
        <div><strong>${averageSeven !== null ? `${averageSeven.toFixed(1)} kg` : "—"}</strong><span>moyenne 7</span></div>
        <div><strong>${totalDelta === null ? "—" : `${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)} kg`}</strong><span>depuis le début</span></div>
      </div>
    </article>`;

  const displayed = filterWeightEntries(entries, weightRange);
  renderWeightChart(displayed, entries.length);
  if (!entries.length) {
    $("#weightHistoryList").innerHTML = `<div class="empty-state"><strong>Aucune pesée enregistrée</strong><br><span>Chaque poids saisi apparaîtra ici avec sa date.</span></div>`;
    return;
  }

  const descending = [...entries].reverse();
  const groups = groupItemsByMonth(descending, item => item.date);
  $("#weightHistoryList").innerHTML = groups.map((group, groupIndex) => `
    <details class="weight-month-group" ${groupIndex === 0 ? "open" : ""}>
      <summary>${escapeHtml(group.label)} <span>${group.items.length} pesée${group.items.length > 1 ? "s" : ""}</span></summary>
      <div class="weight-month-body">
        ${group.items.map(entry => {
          const chronologicalIndex = entries.findIndex(item => item.date === entry.date);
          const previous = entries[chronologicalIndex - 1];
          const delta = previous ? entry.value - previous.value : null;
          const deltaLabel = delta === null ? "Première mesure" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg vs précédente`;
          const deltaClass = delta === null ? "neutral" : delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
          return `<article class="weight-entry-card"><div class="weight-entry-date"><strong>${formatDate(entry.date)}</strong><span class="weight-delta ${deltaClass}">${deltaLabel}</span></div><div class="weight-entry-value"><strong>${entry.value.toFixed(1)}</strong><span>kg</span></div></article>`;
        }).join("")}
      </div>
    </details>`).join("");
}

function renderWeightChart(entries, totalCount = entries.length) {
  const container = $("#weightChart");
  const labels = { "30": "30 jours", "90": "3 mois", all: "Toutes" };
  $("#weightChartRange").textContent = labels[weightRange] || `${entries.length} mesures`;
  if (!entries.length) {
    container.innerHTML = `<div class="weight-chart-empty">La courbe apparaîtra après ta première pesée.</div>`;
    return;
  }

  if (entries.length === 1) {
    const only = entries[0];
    container.innerHTML = `<svg class="weight-svg" viewBox="0 0 340 168" role="img" aria-label="Une pesée de ${only.value.toFixed(1)} kg"><line class="weight-grid-line" x1="20" y1="82" x2="320" y2="82"/><circle class="weight-chart-dot latest" cx="170" cy="82" r="5"/><text class="weight-chart-value" x="170" y="62" text-anchor="middle">${only.value.toFixed(1)} kg</text><text class="weight-chart-date" x="170" y="146" text-anchor="middle">${escapeHtml(formatCompactDate(only.date))}</text></svg>`;
    return;
  }

  const width = 340, height = 168, left = 22, right = 18, top = 22, bottom = 34;
  const values = entries.map(item => item.value);
  const moving = rollingAverage(entries, 7);
  const allValues = [...values, ...moving.map(item => item.value)].filter(Number.isFinite);
  let min = Math.min(...allValues), max = Math.max(...allValues);
  const spread = Math.max(.8, max - min);
  min -= Math.max(.35, spread * .18); max += Math.max(.35, spread * .18);
  const x = index => left + (index / (entries.length - 1)) * (width - left - right);
  const y = value => top + ((max - value) / (max - min)) * (height - top - bottom);
  const points = entries.map((item, index) => `${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const avgPoints = moving.map((item, index) => `${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const areaPoints = `${left},${height-bottom} ${points} ${width-right},${height-bottom}`;
  const latest = entries.at(-1);
  const middleValue = (min + max) / 2;
  const dateIndices = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];

  const labelX = Math.max(left + 30, x(entries.length - 1) - 28);
  const labelY = Math.max(20, y(latest.value) - 17);
  container.innerHTML = `
    <svg class="weight-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du poids de ${entries[0].value.toFixed(1)} à ${latest.value.toFixed(1)} kg">
      <defs><linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".20"/><stop offset="100%" stop-color="currentColor" stop-opacity=".01"/></linearGradient></defs>
      <line class="weight-grid-line" x1="${left}" y1="${y(max).toFixed(1)}" x2="${width-right}" y2="${y(max).toFixed(1)}"/>
      <line class="weight-grid-line" x1="${left}" y1="${y(middleValue).toFixed(1)}" x2="${width-right}" y2="${y(middleValue).toFixed(1)}"/>
      <line class="weight-grid-line" x1="${left}" y1="${y(min).toFixed(1)}" x2="${width-right}" y2="${y(min).toFixed(1)}"/>
      <polygon class="weight-chart-area" points="${areaPoints}"/><polyline class="weight-chart-line" points="${points}"/><polyline class="weight-average-line" points="${avgPoints}"/>
      ${entries.map((item,index) => `<circle class="weight-chart-dot ${index === entries.length-1 ? "latest" : ""}" cx="${x(index).toFixed(1)}" cy="${y(item.value).toFixed(1)}" r="${index === entries.length-1 ? 4.8 : 2.5}"/>`).join("")}
      <rect class="weight-value-pill" x="${(labelX-29).toFixed(1)}" y="${(labelY-13).toFixed(1)}" width="58" height="20" rx="9"/>
      <text class="weight-chart-value" x="${labelX.toFixed(1)}" y="${(labelY+1).toFixed(1)}" text-anchor="middle">${latest.value.toFixed(1)} kg</text>
      ${dateIndices.map(index => `<text class="weight-chart-date" x="${x(index).toFixed(1)}" y="${height-10}" text-anchor="${index===0 ? "start" : index===entries.length-1 ? "end" : "middle"}">${escapeHtml(formatCompactDate(entries[index].date))}</text>`).join("")}
    </svg>`;
}

function filterWeightEntries(entries, rangeValue) {
  if (rangeValue === "all" || !entries.length) return entries;
  const days = Number(rangeValue) || 30;
  const end = new Date(`${entries.at(-1).date}T12:00:00`);
  const start = new Date(end); start.setDate(start.getDate() - days + 1);
  return entries.filter(item => new Date(`${item.date}T12:00:00`) >= start);
}

function rollingAverage(entries, windowSize) {
  return entries.map((item, index) => {
    const values = entries.slice(Math.max(0, index - windowSize + 1), index + 1).map(entry => entry.value);
    return { date: item.date, value: average(values) };
  });
}

function groupItemsByMonth(items, dateGetter) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const groups = [];
  items.forEach(item => {
    const raw = dateGetter(item) || "";
    const date = new Date(String(raw).length <= 10 ? `${raw}T12:00:00` : raw);
    const key = Number.isNaN(date.getTime()) ? "unknown" : `${date.getFullYear()}-${date.getMonth()}`;
    let group = groups.find(candidate => candidate.key === key);
    if (!group) {
      group = { key, label: Number.isNaN(date.getTime()) ? "Sans date" : formatter.format(date).replace(/^./, letter => letter.toUpperCase()), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
}
function calculateExerciseRecords() {
  const snapshots = [...(state.history || []), snapshotCurrent(false)];
  const records = new Map();
  snapshots.forEach(snapshot => {
    (snapshot.week?.sessions || []).forEach((session, sessionIndex) => {
      const sr = sessionResult(session.id, snapshot);
      if (sr.status !== "done") return;
      const date = sr.completed_at || snapshot.archived_at || "";
      session.exercises.forEach(exerciseData => {
        const er = exerciseResult(session.id, exerciseData, snapshot);
        er.sets.forEach(setData => {
          const weight = Number(setData.weight_kg);
          const reps = Number(setData.reps);
          if (!setData.completed || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) return;
          const key = normalizeText(exerciseData.name);
          const candidate = {
            name: exerciseData.name,
            weight,
            reps,
            date,
            sessionLabel: `Jour ${sessionIndex + 1} · ${session.title}`
          };
          const current = records.get(key);
          if (!current || weight > current.weight || (weight === current.weight && reps > current.reps) || (weight === current.weight && reps === current.reps && String(date) > String(current.date))) {
            records.set(key, candidate);
          }
        });
      });
    });
  });
  return [...records.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function calculateMetrics(targetState) {
  const sessions = targetState.week?.sessions || [];
  let plannedSets = 0;
  let completedSets = 0;
  let doneExercises = 0;
  let totalExercises = 0;
  let issueCount = 0;
  const rpes = [];
  const rirs = [];
  sessions.forEach(session => {
    const sr = sessionResult(session.id, targetState);
    (session.exercises || []).forEach(exerciseData => {
      totalExercises += 1;
      plannedSets += (exerciseData.sets || []).length;
      const er = exerciseResult(session.id, exerciseData, targetState);
      if (FINISHED_EXERCISE_STATUSES.has(er.status)) doneExercises += 1;
      completedSets += er.sets.filter(setData => setData.completed).length;
      issueCount += er.issues.length ? 1 : 0;
      if (numberOrBlank(er.overall_rpe) !== "") rpes.push(Number(er.overall_rpe));
      if (numberOrBlank(er.overall_rir) !== "") rirs.push(Number(er.overall_rir));
      er.sets.forEach(setData => {
        if (numberOrBlank(setData.rpe) !== "") rpes.push(Number(setData.rpe));
        if (numberOrBlank(setData.rir) !== "") rirs.push(Number(setData.rir));
      });
    });
    if (numberOrBlank(sr.global_rpe) !== "") rpes.push(Number(sr.global_rpe));
  });
  const weights = Object.values(targetState.daily_weights || {}).map(Number).filter(Number.isFinite);
  const doneSessions = sessions.filter(session => sessionResult(session.id, targetState).status === "done").length;
  const skippedSessions = sessions.filter(session => sessionResult(session.id, targetState).status === "skipped").length;
  return {
    totalSessions: sessions.length,
    doneSessions,
    skippedSessions,
    totalExercises,
    doneExercises,
    plannedSets,
    completedSets,
    setCompletion: plannedSets ? Math.round(completedSets / plannedSets * 100) : 0,
    weekProgress: totalExercises ? Math.round(doneExercises / totalExercises * 100) : 0,
    avgRpe: rpes.length ? average(rpes) : null,
    avgRir: rirs.length ? average(rirs) : null,
    avgWeight: weights.length ? average(weights) : null,
    issueCount
  };
}

function plannedSetReport(setData, index) {
  const parts = [`${index + 1}) ${plannedMetricText(setData)}`];
  if (setData.weight_kg !== null && setData.weight_kg !== undefined) parts.push(formatWeight(setData.weight_kg));
  const effort = plannedEffortText(setData);
  if (effort) parts.push(effort);
  if (setData.rest_sec) parts.push(`repos ${setData.rest_sec} s`);
  if (setData.tempo) parts.push(`tempo ${setData.tempo}`);
  if (setData.notes) parts.push(setData.notes);
  return parts.join(", ");
}

function actualSetReport(setData, planned, index) {
  const metric = primaryMetricForSet(planned || setData);
  let metricText = "mesure non renseignée";
  if (metric === "duration_sec") metricText = `${setData.duration_sec || "—"} s`;
  else if (metric === "distance_m") metricText = `${setData.distance_m || "—"} m`;
  else metricText = `${setData.reps || "—"} reps`;
  const parts = [`${index + 1}) ${metricText}`];
  if (setData.weight_kg !== "" && setData.weight_kg !== null && setData.weight_kg !== undefined) parts.push(formatWeight(setData.weight_kg));
  if (numberOrBlank(setData.rpe) !== "") parts.push(`RPE ${setData.rpe}`);
  if (numberOrBlank(setData.rir) !== "") parts.push(`RIR ${setData.rir}`);
  if (setData.completed) parts.push("validée");
  return parts.join(", ");
}

function generateReport(targetState = state) {
  const metrics = calculateMetrics(targetState);
  const weights = Object.entries(targetState.daily_weights || {}).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => `${date}: ${value} kg`);
  const sessionSections = (targetState.week.sessions || []).map((session, index) => {
    const result = sessionResult(session.id, targetState);
    const exercises = (session.exercises || []).map((exerciseData, exIndex) => {
      const ex = exerciseResult(session.id, exerciseData, targetState);
      const planned = (exerciseData.sets || []).map((setData, i) => plannedSetReport(setData, i)).join(" ; ");
      const actual = ex.sets.map((setData, i) => actualSetReport(setData, exerciseData.sets?.[i] || {}, i)).join(" ; ");
      const issues = ex.issues.length ? ex.issues.map(value => labelFor(ISSUE_OPTIONS, value)).join(", ") : "aucun signalé";
      const technique = ex.technique_flags.length ? ex.technique_flags.map(value => labelFor(TECHNIQUE_OPTIONS, value)).join(", ") : "aucun";
      const pain = ex.issues.includes("pain") ? `${ex.pain.area || "zone non précisée"}, intensité ${ex.pain.intensity || "—"}/10, exercice ${ex.pain.continued ? "poursuivi" : "arrêté ou non précisé"}` : "aucune";
      const effortMode = exerciseEffortMode(exerciseData);
      const effortValue = effortMode === "rir" ? ex.overall_rir : ex.overall_rpe;
      return [
        `${exIndex + 1}. ${exerciseData.name}`,
        `   - Statut : ${labelFor(EXERCISE_STATUSES, ex.status)}`,
        `   - ${effortMode.toUpperCase()} exercice : ${numberOrBlank(effortValue) !== "" ? effortValue : "non renseigné"}`,
        `   - Prévu : ${planned}`,
        `   - Réalisé : ${actual}`,
        `   - Problèmes : ${issues}`,
        `   - Détail technique : ${technique}`,
        `   - Douleur : ${pain}`,
        `   - Filmé : ${ex.filmed ? "oui" : "non"}${exerciseData.film_requested ? " (demandé)" : ""}`,
        `   - Note : ${ex.note || "aucune"}`
      ].join("\n");
    }).join("\n\n");

    return [
      `SÉANCE ${index + 1} — JOUR ${index + 1} — ${session.title}`,
      `Jour suggéré : ${sessionSuggestionText(session) || "aucun"}`,
      `Objectif : ${session.goal || "—"}`,
      `Statut : ${STATUS_LABELS[result.status] || result.status}`,
      `Date de réalisation : ${result.completed_at ? formatDateTime(result.completed_at) : "non réalisée"}`,
      `Date de clôture sans réalisation : ${result.skipped_at ? formatDateTime(result.skipped_at) : "—"}`,
      `Cause de non-réalisation : ${result.skip_reason || "—"}`,
      `Poids : ${result.weight_kg ? `${result.weight_kg} kg` : "non renseigné"}`,
      `Énergie avant : ${result.energy_before ? `${result.energy_before}/10` : "non renseignée"}`,
      `Durée réelle : ${result.actual_duration_min ? `${result.actual_duration_min} min` : "non renseignée"}`,
      `Difficulté globale : ${result.global_rpe ? `${result.global_rpe}/10` : "non renseignée"}`,
      `Commentaire : ${result.comment || "aucun"}`,
      "",
      exercises
    ].join("\n");
  }).join("\n\n----------------------------------------\n\n");

  const profile = targetState.athlete_profile || {};
  const review = targetState.weekly_review || emptyWeeklyReview();
  const displayName = profile.name || targetState.profile?.name || activeProfile?.name || "Utilisateur";
  return `SPORT_APP_WEEKLY_REPORT_START

SCHEMA_APPLICATION: ${APP_SCHEMA}
APPLICATION: Série

PROFIL ATHLÈTE COMPACT
- Nom : ${displayName}
- Âge : ${profile.age || "—"}
- Taille : ${profile.height_m || "—"} m
- Fréquence habituelle : ${profile.usual_frequency || "—"}
- Objectif actuel : ${profile.current_goal || "—"}
- Contraintes : ${(profile.constraints || []).join(" ; ") || "—"}

SEMAINE
- Bloc : ${targetState.week.block_name || "—"}
- Numéro : ${targetState.week.number || "—"}
- Titre : ${targetState.week.title || "—"}
- Objectif : ${targetState.week.objective || "—"}
- Séances réalisées : ${metrics.doneSessions}/${metrics.totalSessions}
- Séances non réalisées : ${metrics.skippedSessions}
- Séries validées : ${metrics.completedSets}/${metrics.plannedSets} (${metrics.setCompletion} %)
- RPE moyen : ${metrics.avgRpe !== null ? metrics.avgRpe.toFixed(1) : "non calculable"}
- RIR moyen : ${metrics.avgRir !== null ? metrics.avgRir.toFixed(1) : "non calculable"}
- Problèmes signalés : ${metrics.issueCount}

PESÉES
${weights.length ? weights.map(item => `- ${item}`).join("\n") : "- Aucune pesée renseignée"}

BILAN HEBDOMADAIRE
- Sommeil : ${review.sleep ? `${review.sleep}/10` : "non renseigné"}
- Énergie générale : ${review.energy ? `${review.energy}/10` : "non renseignée"}
- Faim : ${review.hunger ? `${review.hunger}/10` : "non renseignée"}
- Protéines : ${review.protein ? `${review.protein}/7 jours` : "non renseignées"}
- Pas moyens : ${review.steps || "non renseignés"}
- Cardio / activités : ${review.cardio || "aucun renseignement"}
- Événements particuliers : ${review.events || "aucun"}
- Impression visuelle / ressenti : ${review.feeling || "non renseigné"}

DÉTAIL DES SÉANCES

${sessionSections || "Aucune séance dans la semaine."}

DEMANDE À CHATGPT
Analyse cette semaine en conservant le profil, l’historique et la méthode de coaching de cette conversation. Génère la semaine suivante. Réponds d’abord avec une analyse lisible, puis avec un JSON strictement conforme au schéma Série ${APP_SCHEMA}, compris entre SPORT_APP_IMPORT_START et SPORT_APP_IMPORT_END.

SPORT_APP_WEEKLY_REPORT_END`;
}

function buildChatSetupPrompt() {
  const profileName = activeProfile?.name || "l’utilisateur";
  return `PROTOCOLE SERIE_APP — VERSION ${CHAT_PROMPT_VERSION}

CONTEXTE
Tu es déjà le coach ou l’assistant de programmation sportive de ${profileName}. Ce message ne remplace ni le profil athlète, ni l’historique, ni la méthode de progression, ni les décisions déjà prises dans cette conversation. Il ajoute uniquement un protocole de mise en forme compatible avec l’application Série.

RÔLE DE L’APPLICATION
Série n’invente pas le programme. Elle affiche les séances, collecte le réalisé et génère un bilan structuré. Le fond du coaching reste entièrement le tien.

TÂCHE À EXÉCUTER MAINTENANT
1. Retrouve dans cette conversation le dernier programme complet et validé que l’utilisateur doit réellement exécuter.
2. Conserve strictement son fond : nombre et ordre des séances, exercices, séries, répétitions, charges, RPE ou RIR, temps de repos, consignes, adaptations, supersets, finishers, demandes de vidéo et objectifs.
3. Convertis ce programme au schéma Série ci-dessous. Ne demande pas à l’utilisateur de le recopier.
4. Commence par une vérification très courte et lisible.
5. Termine par un unique bloc compris entre SPORT_APP_IMPORT_START et SPORT_APP_IMPORT_END.
6. À l’intérieur des marqueurs, écris uniquement du JSON valide, sans commentaire et sans balise Markdown.

FONCTIONNEMENT À L’AVENIR
Lorsque l’utilisateur colle un bilan entre SPORT_APP_WEEKLY_REPORT_START et SPORT_APP_WEEKLY_REPORT_END :
- analyse-le à partir du profil, de l’historique et de la méthode déjà présents dans cette conversation ;
- adapte le programme selon tes règles habituelles ;
- retourne la semaine suivante dans le même format d’import ;
- explique brièvement les choix avant le bloc JSON ;
- ne modifie jamais le fond du coaching uniquement pour satisfaire le format technique.

SCHÉMA D’IMPORT SERIE_APP ${CHAT_PROMPT_VERSION}
{
  "schema_version": "1.1",
  "athlete_profile": {
    "name": "facultatif",
    "current_goal": "facultatif",
    "constraints": ["facultatif"]
  },
  "week": {
    "id": "identifiant-unique-de-la-semaine",
    "number": 1,
    "block_name": "nom du bloc",
    "title": "titre de la semaine",
    "objective": "objectif général",
    "start_date": "",
    "sessions": [
      {
        "id": "identifiant-unique-de-la-seance",
        "day": "suggestion facultative, par exemple Lundi",
        "title": "titre de la séance",
        "goal": "objectif de la séance",
        "estimated_duration_min": 60,
        "general_notes": "consignes générales facultatives",
        "exercises": [
          {
            "id": "identifiant-unique-de-l-exercice",
            "name": "nom de l’exercice",
            "instructions": "consignes techniques facultatives",
            "film_requested": false,
            "adaptation_rule": "règle d’adaptation facultative",
            "superset_group": "facultatif, même valeur pour les exercices liés",
            "sets": [
              {
                "order": 1,
                "weight_kg": 100,
                "reps": 5,
                "reps_min": null,
                "reps_max": null,
                "duration_sec": null,
                "distance_m": null,
                "target_rpe_min": 7,
                "target_rpe_max": 8,
                "target_rir": null,
                "rest_sec": 120,
                "tempo": "",
                "notes": ""
              }
            ]
          }
        ]
      }
    ]
  }
}

RÈGLES TECHNIQUES
- L’ordre du tableau sessions définit Jour 1, Jour 2, Jour 3, etc. Le champ day n’est qu’une suggestion et ne fixe jamais la date réelle.
- La date réelle est enregistrée par l’application lorsque la séance est terminée.
- Chaque série prescrite doit être un objet distinct dans sets, même lorsque plusieurs séries sont identiques.
- Utilise des identifiants stables, courts, uniques et sans accent.
- Pour une charge libre ou un exercice au poids du corps, mets weight_kg à null.
- Pour une plage de répétitions, utilise reps_min et reps_max et mets reps à null.
- Pour un travail au temps, utilise duration_sec. Pour une distance, utilise distance_m.
- Utilise target_rpe_min/target_rpe_max pour le RPE, ou target_rir pour le RIR. Ne remplis pas les deux sans raison explicite.
- Mets null dans les champs numériques non utilisés et une chaîne vide dans les champs texte non utilisés.
- Une semaine peut contenir n’importe quel nombre de séances et une séance n’importe quel nombre d’exercices.
- Les circuits, supersets et finishers restent des exercices ordonnés ; utilise superset_group et general_notes pour préserver leur logique.
- Ne renomme aucune clé et n’ajoute aucun texte autour du JSON à l’intérieur des marqueurs.

FORMAT DE SORTIE OBLIGATOIRE
SPORT_APP_IMPORT_START
{ JSON conforme au schéma }
SPORT_APP_IMPORT_END`;
}

function buildConversionPrompt() {
  return `Applique maintenant le protocole Série déjà présent dans cette conversation. Retrouve le dernier programme complet et validé que je dois réellement exécuter, conserve strictement son fond et convertis-le au format SPORT_APP_IMPORT_START / SPORT_APP_IMPORT_END, sans balise Markdown autour du JSON. Ne me demande pas de recopier le programme.`;
}

async function copyTextToClipboard(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { fallbackCopy(text); }
}

async function copyChatSetupPrompt() {
  if (!state) return;
  await copyTextToClipboard(buildChatSetupPrompt());
  state.integration = { ...(state.integration || {}), prompt_version: CHAT_PROMPT_VERSION, prompt_copied_at: new Date().toISOString() };
  saveState({ sync: true });
  renderProfileUI();
  toast("Prompt de configuration copié");
}

async function copyConversionPrompt() {
  await copyTextToClipboard(buildConversionPrompt());
  toast("Demande de conversion copiée");
}

async function copyReport() {
  const report = generateReport();
  try {
    await navigator.clipboard.writeText(report);
    toast("Bilan copié pour ChatGPT");
  } catch {
    fallbackCopy(report);
    toast("Bilan copié");
  }
}

function downloadReport() {
  downloadText(`bilan-semaine-${state.week.number || "x"}.txt`, generateReport(), "text/plain;charset=utf-8");
}

async function pasteImport() {
  try {
    $("#importText").value = await navigator.clipboard.readText();
    previewImport();
    $("#rawImportDisclosure").open = false;
    toast("Semaine détectée");
  } catch {
    $("#rawImportDisclosure").open = true;
    $("#importText").focus();
    toast("Colle manuellement le contenu de ChatGPT");
  }
}

function previewImport() {
  const preview = $("#importPreview");
  try {
    pendingImport = parseImportText($("#importText").value);
    validateProgram(pendingImport);
    const totalExercises = pendingImport.week.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
    const totalMinutes = pendingImport.week.sessions.reduce((sum, session) => sum + Number(session.estimated_duration_min || 0), 0);
    preview.className = "import-preview";
    preview.removeAttribute("style");
    const replacesCurrentWeek = Boolean((state.week?.sessions || []).length || Object.keys(state.daily_weights || {}).length || Object.keys(state.session_results || {}).length);
    preview.innerHTML = `
      <strong>${escapeHtml(pendingImport.week.title || `Semaine ${pendingImport.week.number}`)}</strong>
      <p class="small">${pendingImport.week.sessions.length} séances · ${totalExercises} exercices · ${formatDuration(totalMinutes)}</p>
      <div class="import-session-list">${pendingImport.week.sessions.map((session, index) => `<span><b>Jour ${index + 1}</b><em>${escapeHtml(session.title)}${sessionSuggestionText(session) ? ` · ${escapeHtml(sessionSuggestionText(session))}` : ""}</em></span>`).join("")}</div>
      <button id="confirmImportBtn" class="primary-button full-button" type="button">${replacesCurrentWeek ? "Archiver la semaine actuelle et importer" : "Importer le programme"}</button>`;
    $("#confirmImportBtn").addEventListener("click", confirmImport);
  } catch (error) {
    pendingImport = null;
    preview.className = "import-preview";
    preview.style.background = "var(--red-soft)";
    preview.style.color = "var(--red)";
    preview.textContent = `Import impossible : ${error.message}`;
  }
}

function confirmImport() {
  if (!pendingImport) return;
  const shouldArchive = (state.week?.sessions || []).length > 0 || Object.keys(state.daily_weights || {}).length > 0 || Object.keys(state.session_results || {}).length > 0;
  confirmAction(
    shouldArchive ? "Importer la nouvelle semaine ?" : "Importer ce programme ?",
    shouldArchive ? "La semaine actuelle sera conservée dans l’historique avant d’être remplacée." : "Les séances seront ajoutées à ce profil.",
    () => {
      const history = shouldArchive ? [...(state.history || []), snapshotCurrent(true)] : [...(state.history || [])];
      const preservedAthleteProfile = pendingImport.athlete_profile || state.athlete_profile;
      const preservedIntegration = { ...(state.integration || {}) };
      state = makeInitialState(pendingImport, history, activeProfile);
      state.athlete_profile = preservedAthleteProfile;
      state.integration = preservedIntegration;
      currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
      activeExerciseId = null;
      pendingImport = null;
      saveState();
      $("#importText").value = "";
      $("#importPreview").classList.add("hidden");
      hydrateReview();
      renderAll();
      showView("weekView");
      toast("Nouvelle semaine importée");
    }
  );
}

function snapshotCurrent(archive = true) {
  return {
    app_version: APP_VERSION,
    schema_version: APP_SCHEMA,
    athlete_profile: clone(state.athlete_profile),
    week: clone(state.week),
    daily_weights: clone(state.daily_weights),
    session_results: clone(state.session_results),
    weekly_review: clone(state.weekly_review),
    archived_at: archive ? new Date().toISOString() : null
  };
}

function parseImportText(text) {
  if (!text.trim()) throw new Error("aucun contenu collé");
  const start = text.indexOf("SPORT_APP_IMPORT_START");
  const end = text.indexOf("SPORT_APP_IMPORT_END");
  let jsonText = text.trim();
  if (start !== -1 && end !== -1 && end > start) jsonText = text.slice(start + "SPORT_APP_IMPORT_START".length, end).trim();
  jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(jsonText);
}

function validateProgram(program) {
  if (!program || typeof program !== "object") throw new Error("contenu JSON invalide");
  if (!SUPPORTED_SCHEMAS.has(String(program.schema_version || ""))) throw new Error(`version acceptée : ${[...SUPPORTED_SCHEMAS].join(" ou ")}`);
  if (!program.week || !Array.isArray(program.week.sessions) || !program.week.sessions.length) throw new Error("la semaine ne contient aucune séance");
  const ids = new Set();
  program.schema_version = APP_SCHEMA;
  program.week.sessions.forEach((session, sessionIndex) => {
    if (!session.id || !session.title || !Array.isArray(session.exercises) || !session.exercises.length) throw new Error(`séance ${sessionIndex + 1} incomplète`);
    if (ids.has(session.id)) throw new Error(`identifiant de séance dupliqué : ${session.id}`);
    ids.add(session.id);
    session.day = session.day || "";
    session.goal = session.goal || "";
    session.general_notes = session.general_notes || "";
    session.exercises.forEach((exerciseData, exIndex) => {
      if (!exerciseData.id || !exerciseData.name || !Array.isArray(exerciseData.sets) || !exerciseData.sets.length) throw new Error(`exercice ${exIndex + 1} incomplet dans ${session.title}`);
      if (ids.has(exerciseData.id)) throw new Error(`identifiant dupliqué : ${exerciseData.id}`);
      ids.add(exerciseData.id);
      exerciseData.instructions = exerciseData.instructions || "";
      exerciseData.adaptation_rule = exerciseData.adaptation_rule || "";
      exerciseData.film_requested = Boolean(exerciseData.film_requested);
      exerciseData.sets.forEach((setData, setIndex) => {
        const numericOrNull = value => value === null || value === undefined || value === "" || Number.isFinite(Number(value));
        ["weight_kg", "reps", "reps_min", "reps_max", "duration_sec", "distance_m", "target_rpe_min", "target_rpe_max", "target_rir", "rest_sec"].forEach(field => {
          if (!numericOrNull(setData[field])) throw new Error(`${field} invalide, ${session.title} / ${exerciseData.name} / série ${setIndex + 1}`);
          if (setData[field] !== null && setData[field] !== undefined && setData[field] !== "") setData[field] = Number(setData[field]);
          else setData[field] = null;
        });
        const hasReps = setData.reps !== null || setData.reps_min !== null;
        const hasDuration = setData.duration_sec !== null;
        const hasDistance = setData.distance_m !== null;
        if (!hasReps && !hasDuration && !hasDistance) throw new Error(`aucune mesure de travail, ${session.title} / ${exerciseData.name} / série ${setIndex + 1}`);
        if (setData.reps_min !== null && setData.reps_max !== null && setData.reps_max < setData.reps_min) throw new Error(`plage de répétitions inversée, ${session.title} / ${exerciseData.name}`);
        setData.order = Number(setData.order || setIndex + 1);
        setData.tempo = setData.tempo || "";
        setData.notes = setData.notes || "";
      });
    });
  });
}

function downloadBackup() {
  const safeName = normalizeText(activeProfile?.name || "profil").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profil";
  downloadText(`serie-${safeName}-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function restoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.week?.sessions) throw new Error("format inconnu");
      state = migrateState(parsed);
      if (state.profile?.name) {
        activeProfile.name = state.profile.name;
        activeProfile.color = PROFILE_COLORS[state.profile.color] ? state.profile.color : activeProfile.color;
        saveProfileRegistry();
        applyProfileTheme();
      }
      currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
      activeExerciseId = null;
      saveState();
      hydrateReview();
      renderAll();
      renderProfileUI();
      toast("Sauvegarde restaurée");
    } catch (error) {
      toast(`Restauration impossible : ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function openIssueDialog(sessionId, exerciseId) {
  issueContext = { sessionId, exerciseId };
  const session = state.week.sessions.find(item => item.id === sessionId);
  const exerciseData = session?.exercises.find(item => item.id === exerciseId);
  if (!exerciseData) return;
  const result = exerciseResult(sessionId, exerciseData);
  $("#issueChoices").innerHTML = ISSUE_OPTIONS.map(([value, label]) => `<label class="choice-chip"><input type="checkbox" value="${value}" ${result.issues.includes(value) ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`).join("");
  $("#techniqueChoices").innerHTML = TECHNIQUE_OPTIONS.map(([value, label]) => `<label class="choice-chip"><input type="checkbox" value="${value}" ${result.technique_flags.includes(value) ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`).join("");
  $("#painArea").value = result.pain.area || "";
  $("#painContinued").checked = Boolean(result.pain.continued);
  $("#issueNote").value = result.note || "";
  renderRatingButtons($("#painIntensity"), range(1, 10), result.pain.intensity, value => { $("#painIntensity").dataset.value = value; });
  toggleConditionalIssueFields();
  $("#issueDialog").showModal();
}

function toggleConditionalIssueFields() {
  const selected = [...$("#issueChoices").querySelectorAll("input:checked")].map(input => input.value);
  $("#painFields").classList.toggle("hidden", !selected.includes("pain"));
  $("#techniqueFields").classList.toggle("hidden", !selected.includes("technique"));
}

function buildIssueSummary(result) {
  if (!result.issues.length) return "";
  const labels = result.issues.map(value => labelFor(ISSUE_OPTIONS, value));
  if (result.issues.includes("pain") && result.pain.area) labels.push(`${result.pain.area}${result.pain.intensity ? ` ${result.pain.intensity}/10` : ""}`);
  return labels.join(" · ");
}

function updateResumeButton() {
  const session = findInProgressSession();
  const button = $("#resumeSessionBtn");
  const shouldShow = Boolean(session) && currentViewId !== "sessionView";
  button.classList.toggle("hidden", !shouldShow);
  if (session) {
    const done = session.exercises.filter(ex => FINISHED_EXERCISE_STATUSES.has(exerciseResult(session.id, ex).status)).length;
    button.textContent = `Reprendre ${session.title} · ${done}/${session.exercises.length}`;
  }
}

function findInProgressSession() {
  return state.week.sessions.find(session => sessionResult(session.id).status === "in_progress");
}

function findNextSession() {
  return findInProgressSession()
    || state.week.sessions.find(session => !["done", "skipped"].includes(sessionResult(session.id).status))
    || null;
}

function updateDockNavigation(session) {
  const index = Math.max(0, session.exercises.findIndex(ex => ex.id === activeExerciseId));
  $("#prevExerciseBtn").disabled = index <= 0;
  $("#nextExerciseBtn").disabled = index >= session.exercises.length - 1;
}

function moveExercise(direction) {
  const session = state.week.sessions.find(item => item.id === currentSessionId);
  if (!session) return;
  const index = Math.max(0, session.exercises.findIndex(ex => ex.id === activeExerciseId));
  const nextIndex = Math.min(session.exercises.length - 1, Math.max(0, index + direction));
  activeExerciseId = session.exercises[nextIndex]?.id;
  renderSession(session.id);
  reopenExercise(activeExerciseId, true);
}

function startRest(seconds) {
  timerRemaining = Number(seconds) || 90;
  timerRunning = true;
  startTimerInterval();
  updateTimerDisplay();
}

function startTimerInterval() {
  clearInterval(timerInterval);
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (!timerRunning) return;
    timerRemaining = Math.max(0, timerRemaining - 1);
    updateTimerDisplay();
    if (timerRemaining === 0) {
      stopTimer();
      toast("Repos terminé");
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    }
  }, 1000);
}

function toggleTimer() {
  if (timerRemaining <= 0) {
    startRest(90);
    return;
  }
  timerRunning = !timerRunning;
  if (timerRunning) startTimerInterval();
  else clearInterval(timerInterval);
  updateTimerDisplay();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerRemaining = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = String(timerRemaining % 60).padStart(2, "0");
  $("#timerDisplay").textContent = timerRemaining ? `${minutes}:${seconds}` : "Repos";
  $("#timerHint").textContent = timerRemaining ? (timerRunning ? "Pause" : "Reprendre") : "Démarrer";
}

function inferWeightStep(exerciseData) {
  if (Number(exerciseData.weight_step_kg)) return Number(exerciseData.weight_step_kg);
  const name = normalizeText(exerciseData.name);
  if (/haltere|elevation|oiseau|fente|rdl unilateral/.test(name)) return 2;
  if (/poulie|tirage|leg curl|extension|presse/.test(name)) return 2.5;
  return 2.5;
}

function plannedMetricText(setData = {}) {
  if (setData.duration_sec !== null && setData.duration_sec !== undefined) return `${setData.duration_sec} s`;
  if (setData.distance_m !== null && setData.distance_m !== undefined) return `${setData.distance_m} m`;
  if (setData.reps !== null && setData.reps !== undefined) return `${setData.reps} rep${Number(setData.reps) > 1 ? "s" : ""}`;
  if (setData.reps_min !== null && setData.reps_min !== undefined) {
    const max = setData.reps_max ?? setData.reps_min;
    return `${setData.reps_min}${Number(max) !== Number(setData.reps_min) ? `–${max}` : ""} reps`;
  }
  return "série";
}

function plannedEffortText(setData = {}) {
  const rir = numberOrBlank(setData.target_rir);
  if (rir !== "") return `RIR ${rir}`;
  const min = numberOrBlank(setData.target_rpe_min);
  const max = numberOrBlank(setData.target_rpe_max);
  if (min === "" && max === "") return "";
  const low = min !== "" ? min : max;
  const high = max !== "" ? max : min;
  return low === high ? `RPE ${String(low).replace(".", ",")}` : `RPE ${String(low).replace(".", ",")}–${String(high).replace(".", ",")}`;
}

function prescriptionText(sets) {
  if (!sets?.length) return "Aucune série";
  const groups = [];
  sets.forEach(setData => {
    const key = JSON.stringify([
      setData.weight_kg ?? null, setData.reps ?? null, setData.reps_min ?? null, setData.reps_max ?? null,
      setData.duration_sec ?? null, setData.distance_m ?? null, setData.target_rpe_min ?? null,
      setData.target_rpe_max ?? null, setData.target_rir ?? null, setData.tempo || ""
    ]);
    const previous = groups.at(-1);
    if (previous?.key === key) previous.count += 1;
    else groups.push({ key, count: 1, set: setData });
  });
  return groups.map(group => {
    const setData = group.set;
    const parts = [`${group.count}×${plannedMetricText(setData)}`];
    if (setData.weight_kg !== null && setData.weight_kg !== undefined) parts.push(formatWeight(setData.weight_kg));
    const effort = plannedEffortText(setData);
    if (effort) parts.push(effort);
    if (setData.tempo) parts.push(`tempo ${setData.tempo}`);
    return parts.join(" · ");
  }).join(" puis ");
}


function loadSyncMeta() {
  try {
    if (!activeProfile) throw new Error("Aucun profil actif");
    const parsed = JSON.parse(storage.getItem(profileSyncKey(activeProfile.id)) || "{}");
    return {
      device_id: parsed.device_id || createDeviceId(),
      remote_revision: Number(parsed.remote_revision || 0),
      last_synced_at: parsed.last_synced_at || "",
      dirty: typeof parsed.dirty === "boolean" ? parsed.dirty : false,
      configured: typeof parsed.configured === "boolean" ? parsed.configured : null,
      last_error: parsed.last_error || ""
    };
  } catch {
    return { device_id: createDeviceId(), remote_revision: 0, last_synced_at: "", dirty: false, configured: null, last_error: "" };
  }
}

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function persistSyncMeta() {
  if (!activeProfile || !syncMeta) return;
  storage.setItem(profileSyncKey(activeProfile.id), JSON.stringify(syncMeta));
}

function scheduleAutoSync() {
  clearTimeout(syncTimer);
  if (!activeProfile || !syncMeta || syncMeta.configured === false || !navigator.onLine) return;
  syncTimer = setTimeout(() => synchronize({ reason: "auto", silent: true }), SYNC_DELAY_MS);
}

function renderSyncPanel() {
  const dot = $("#syncStatusDot");
  const label = $("#syncStatusLabel");
  const detail = $("#syncStatusDetail");
  const last = $("#lastSyncText");
  const button = $("#syncNowBtn");
  if (!dot || !label || !detail || !last || !button) return;
  if (!activeProfile || !syncMeta) {
    dot.className = "sync-status-dot pending";
    label.textContent = "Aucun profil ouvert";
    detail.textContent = "Choisis un profil pour synchroniser ses données.";
    last.textContent = "—";
    button.disabled = true;
    return;
  }

  let kind = "pending";
  let title = "Prêt à synchroniser";
  let description = "Les données restent disponibles hors connexion.";
  let actionLabel = "Synchroniser maintenant";
  if (!navigator.onLine) {
    kind = "offline";
    title = "Hors connexion";
    description = "Les modifications seront envoyées au retour du réseau.";
  } else if (syncInFlight) {
    kind = "syncing";
    title = "Synchronisation…";
    description = `Mise à jour du profil ${activeProfile?.name || ""}.`;
  } else if (pendingRemoteConflict) {
    kind = "error";
    title = "Choix nécessaire";
    description = "Deux versions différentes existent.";
    actionLabel = "Résoudre le conflit";
  } else if (syncMeta.configured === false) {
    kind = "error";
    title = "Configuration nécessaire";
    description = "Ajoute la liaison D1 DB dans Cloudflare Pages.";
  } else if (syncMeta.dirty) {
    kind = "pending";
    title = "Modifications en attente";
    description = "L’envoi en ligne va démarrer automatiquement.";
  } else if (syncMeta.last_synced_at) {
    kind = "synced";
    title = "À jour";
    description = `Profil ${activeProfile?.name || ""} à jour sur tes appareils.`;
  }

  dot.className = `sync-status-dot ${kind}`;
  label.textContent = title;
  detail.textContent = description;
  last.textContent = syncMeta.last_synced_at ? formatDateTime(syncMeta.last_synced_at) : "Jamais";
  button.disabled = syncInFlight || !navigator.onLine;
  button.classList.toggle("syncing", syncInFlight);
  button.setAttribute("aria-label", actionLabel);
  button.title = actionLabel;
}
function comparableState(value) {
  const copy = clone(value || {});
  delete copy.updated_at;
  delete copy.app_version;
  if (copy.profile) delete copy.profile.id;
  return JSON.stringify(copy);
}

function statesEquivalent(left, right) {
  try { return hash128(comparableState(left)) === hash128(comparableState(right)); }
  catch { return false; }
}

async function synchronize({ reason = "manual", silent = false } = {}) {
  if (!activeProfile || !state || !syncMeta || syncInFlight) return;
  if (pendingRemoteConflict) {
    showSyncConflictDialog(pendingRemoteConflict);
    return;
  }
  if (!navigator.onLine) {
    renderSyncPanel();
    if (!silent) toast("Pas de connexion Internet");
    return;
  }

  const context = {
    activation: profileActivationVersion,
    profile: { ...activeProfile },
    state,
    meta: syncMeta
  };
  context.isCurrent = () => profileActivationVersion === context.activation
    && activeProfile?.id === context.profile.id
    && state === context.state
    && syncMeta === context.meta;

  clearTimeout(syncTimer);
  syncInFlight = true;
  renderSyncPanel();
  try {
    const remote = await fetchRemoteState(context.profile);
    if (!context.isCurrent()) return;
    syncMeta.configured = true;
    syncMeta.last_error = "";

    if (!remote.exists) {
      await pushLocalState(0, { silent }, context);
      return;
    }

    if (!syncMeta.remote_revision) {
      if (hasMeaningfulLocalData()) {
        if (statesEquivalent(remote.state, state)) {
          applyRemoteState(remote);
          if (!silent) toast("Profil déjà synchronisé");
        } else {
          setSyncConflict(remote);
          if (!silent || reason === "initial") showSyncConflictDialog(remote);
        }
      } else {
        applyRemoteState(remote);
        if (!silent) toast("Version en ligne récupérée");
      }
      return;
    }

    if (remote.revision === syncMeta.remote_revision) {
      if (syncMeta.dirty) await pushLocalState(remote.revision, { silent }, context);
      else {
        syncMeta.last_synced_at = remote.updated_at || syncMeta.last_synced_at;
        persistSyncMeta();
        if (!silent) toast("Données déjà à jour");
      }
      return;
    }

    if (!syncMeta.dirty) {
      applyRemoteState(remote);
      if (!silent) toast("Dernière version récupérée");
      return;
    }

    setSyncConflict(remote);
    showSyncConflictDialog(remote);
  } catch (error) {
    if (context.isCurrent()) handleSyncError(error, silent);
  } finally {
    if (context.isCurrent()) {
      syncInFlight = false;
      renderSyncPanel();
    }
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  if (typeof AbortController === "undefined") return fetch(url, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("La synchronisation a pris trop de temps.");
      timeoutError.code = "SYNC_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRemoteState(profile = activeProfile) {
  if (!profile) throw new Error("Aucun profil actif");
  const response = await fetchWithTimeout(`${SYNC_ENDPOINT}?profile_id=${encodeURIComponent(profile.id)}`, {
    method: "GET",
    headers: { accept: "application/json", authorization: `Bearer ${profile.access_token}` },
    cache: "no-store"
  });
  const payload = await safeJson(response);
  if (!response.ok) {
    const error = new Error(payload.message || "La synchronisation est indisponible.");
    error.status = response.status;
    error.code = payload.error;
    throw error;
  }
  return payload;
}

async function pushLocalState(baseRevision, { silent = false, force = false } = {}, context = null) {
  const targetProfile = context?.profile || activeProfile;
  const targetState = context?.state || state;
  const targetMeta = context?.meta || syncMeta;
  const isCurrent = context?.isCurrent || (() => targetProfile?.id === activeProfile?.id && targetState === state && targetMeta === syncMeta);
  if (!targetProfile || !targetState || !targetMeta) throw new Error("Aucun profil actif");
  const response = await fetchWithTimeout(`${SYNC_ENDPOINT}?profile_id=${encodeURIComponent(targetProfile.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${targetProfile.access_token}` },
    body: JSON.stringify({
      state: targetState,
      base_revision: Number(baseRevision || 0),
      device_id: targetMeta.device_id,
      client_updated_at: targetState.updated_at
    })
  });
  const payload = await safeJson(response);
  if (!isCurrent()) return false;
  if (response.status === 409) {
    setSyncConflict(payload);
    showSyncConflictDialog(payload);
    return false;
  }
  if (!response.ok) {
    const error = new Error(payload.message || "Envoi impossible.");
    error.status = response.status;
    error.code = payload.error;
    throw error;
  }
  targetMeta.remote_revision = Number(payload.revision || baseRevision + 1);
  targetMeta.last_synced_at = payload.updated_at || new Date().toISOString();
  targetMeta.dirty = false;
  targetMeta.configured = true;
  targetMeta.last_error = "";
  storage.setItem(profileSyncKey(targetProfile.id), JSON.stringify(targetMeta));
  pendingRemoteConflict = null;
  if (!silent || force) toast("Données synchronisées");
  return true;
}

function applyRemoteState(remote) {
  if (remote.state?.profile && activeProfile) {
    activeProfile.name = remote.state.profile.name || activeProfile.name;
    activeProfile.color = PROFILE_COLORS[remote.state.profile.color] ? remote.state.profile.color : activeProfile.color;
    saveProfileRegistry();
    applyProfileTheme();
  }
  state = migrateState(clone(remote.state));
  currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
  activeExerciseId = null;
  pendingImport = null;
  syncMeta.remote_revision = Number(remote.revision || 0);
  syncMeta.last_synced_at = remote.updated_at || new Date().toISOString();
  syncMeta.dirty = false;
  syncMeta.configured = true;
  syncMeta.last_error = "";
  persistSyncMeta();
  hydrateReview();
  renderAll();
  renderProfileUI();
  renderSyncPanel();
}

function hasMeaningfulLocalData() {
  if ((state.week?.sessions || []).length) return true;
  if (Object.keys(state.daily_weights || {}).length) return true;
  if ((state.history || []).length) return true;
  if (Object.values(state.weekly_review || {}).some(value => String(value || "").trim())) return true;

  return (state.week?.sessions || []).some(session => {
    const result = state.session_results?.[session.id];
    if (!result) return false;
    if (result.status !== "planned" || result.weight_kg || result.energy_before || result.actual_duration_min || result.global_rpe || result.comment || result.completed_at || result.skipped_at || result.skip_reason) return true;
    return session.exercises.some(exerciseData => {
      const exerciseState = result.exercises?.[exerciseData.id];
      if (!exerciseState) return false;
      if (exerciseState.status !== "planned" || exerciseState.issues?.length || exerciseState.technique_flags?.length || exerciseState.pain?.area || exerciseState.pain?.intensity || exerciseState.pain?.continued || exerciseState.filmed || exerciseState.note || exerciseState.overall_rpe || exerciseState.overall_rir) return true;
      return (exerciseState.sets || []).some((setData, index) => {
        const planned = exerciseData.sets[index] || {};
        return setData.completed || setData.rpe || setData.rir
          || numberOrBlank(setData.weight_kg) !== numberOrBlank(planned.weight_kg)
          || numberOrBlank(setData.reps) !== numberOrBlank(planned.reps ?? planned.reps_min)
          || numberOrBlank(setData.duration_sec) !== numberOrBlank(planned.duration_sec)
          || numberOrBlank(setData.distance_m) !== numberOrBlank(planned.distance_m);
      });
    });
  });
}

function setSyncConflict(remote) {
  pendingRemoteConflict = remote;
  syncMeta.configured = true;
  syncMeta.last_error = "SYNC_CONFLICT";
  persistSyncMeta();
  renderSyncPanel();
}

function showSyncConflictDialog(remote = pendingRemoteConflict) {
  if (!remote) return;
  const dialog = $("#syncConflictDialog");
  const remoteDate = remote.updated_at ? formatDateTime(remote.updated_at) : "date inconnue";
  const localDate = state.updated_at ? formatDateTime(state.updated_at) : "date inconnue";
  $("#syncConflictText").textContent = `Version en ligne : ${remoteDate}. Version de cet appareil : ${localDate}. Aucune donnée ne sera écrasée sans ton choix.`;
  if (!dialog.open) dialog.showModal();
}

function resolveConflictWithRemote() {
  if (!pendingRemoteConflict) return;
  applyRemoteState(pendingRemoteConflict);
  $("#syncConflictDialog").close();
  pendingRemoteConflict = null;
  toast("Version en ligne utilisée");
}

async function resolveConflictWithLocal() {
  if (!pendingRemoteConflict || syncInFlight) return;
  const baseRevision = Number(pendingRemoteConflict.revision || 0);
  $("#syncConflictDialog").close();
  pendingRemoteConflict = null;
  syncInFlight = true;
  renderSyncPanel();
  try {
    await pushLocalState(baseRevision, { force: true });
  } catch (error) {
    handleSyncError(error, false);
  } finally {
    syncInFlight = false;
    renderSyncPanel();
  }
}

async function forcePushCurrentState() {
  confirmAction("Envoyer cette version ?", "La version présente sur cet appareil remplacera la version en ligne.", async () => {
    if (syncInFlight || !navigator.onLine) return;
    syncInFlight = true;
    renderSyncPanel();
    try {
      const remote = await fetchRemoteState();
      await pushLocalState(remote.exists ? remote.revision : 0, { force: true });
    } catch (error) {
      handleSyncError(error, false);
    } finally {
      syncInFlight = false;
      renderSyncPanel();
    }
  });
}

async function forcePullRemoteState() {
  confirmAction("Récupérer la version en ligne ?", "La version locale sera remplacée. Télécharge une sauvegarde auparavant si nécessaire.", async () => {
    if (syncInFlight || !navigator.onLine) return;
    syncInFlight = true;
    renderSyncPanel();
    try {
      const remote = await fetchRemoteState();
      if (!remote.exists) {
        toast("Aucune version en ligne");
        return;
      }
      applyRemoteState(remote);
      toast("Version en ligne récupérée");
    } catch (error) {
      handleSyncError(error, false);
    } finally {
      syncInFlight = false;
      renderSyncPanel();
    }
  });
}

function handleSyncError(error, silent) {
  syncMeta.last_error = error.code || error.message || "SYNC_FAILED";
  if (error.status === 503 || error.code === "DB_NOT_CONFIGURED") syncMeta.configured = false;
  persistSyncMeta();
  if (!silent) toast(syncMeta.configured === false ? "Base Cloudflare à configurer" : "Synchronisation impossible");
  console.warn("Synchronisation impossible", error);
}

async function safeJson(response) {
  try { return await response.json(); }
  catch { return {}; }
}

function allWeightEntries() {
  const entries = [];
  (state.history || []).forEach(snapshot => Object.entries(snapshot.daily_weights || {}).forEach(([date, value]) => {
    const number = Number(value);
    if (Number.isFinite(number)) entries.push({ date, value: number });
  }));
  Object.entries(state.daily_weights || {}).forEach(([date, value]) => {
    const number = Number(value);
    if (Number.isFinite(number)) entries.push({ date, value: number });
  });
  const deduped = new Map(entries.map(item => [item.date, item.value]));
  return [...deduped.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

function formatWeight(value) {
  return value === null || value === "" || typeof value === "undefined" ? "PDC" : `${value} kg`;
}

function labelFor(options, value) {
  return options.find(([key]) => key === value)?.[1] || value || "À faire";
}

function numberOrBlank(value) {
  if (value === "" || value === null || typeof value === "undefined") return "";
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : "";
}

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function halfRange(min, max) {
  const values = [];
  for (let number = min; number <= max; number += 0.5) values.push(number);
  return values;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function todayKey() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatCompactDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(minutes) {
  if (!minutes) return "durée non renseignée";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${String(rest).padStart(2, "0")}` : `${rest} min`;
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2500);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function confirmAction(title, text, onConfirm) {
  const dialog = $("#confirmDialog");
  $("#dialogTitle").textContent = title;
  $("#dialogText").textContent = text;
  const handler = () => {
    dialog.removeEventListener("close", handler);
    if (dialog.returnValue === "confirm") onConfirm();
  };
  dialog.addEventListener("close", handler);
  dialog.showModal();
}

function checkIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`; }
function chevronRightIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`; }
function chevronDownIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`; }
function calendarIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg>`; }
function cameraIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 10 4.5-2.5v9L15 14M4 6h11v12H4Z"/></svg>`; }
function alertIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 4.4 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z"/></svg>`; }
function scaleIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14a2 2 0 0 0 2-2V8a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v10a2 2 0 0 0 2 2Z"/><path d="M9 9a3 3 0 0 1 6 0M12 9l2-2"/></svg>`; }
function trophyIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 12v5m-4 3h8"/></svg>`; }

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.warn));
  }
}

init();
