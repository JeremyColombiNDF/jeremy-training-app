"use strict";

const STORAGE_KEY = "coach_jeremy_state_v2";
const LEGACY_STORAGE_KEY = "coach_jeremy_state_v1";
const APP_SCHEMA = "1.0";
const APP_VERSION = "0.5";
const SYNC_META_KEY = "coach_jeremy_sync_meta_v1";
const SYNC_ENDPOINT = "/api/sync";
const SYNC_DELAY_MS = 1800;

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
const DEMO_PROGRAM = {
  schema_version: APP_SCHEMA,
  athlete_profile: {
    name: "Jérémy",
    age: 26,
    height_m: 1.79,
    usual_frequency: "5 séances consécutives en semaine, 60 à 75 minutes",
    current_goal: "Construire un nouveau bloc performant en conservant la masse musculaire, avec priorité épaules, dos et jambes.",
    constraints: [
      "Poignet droit à surveiller",
      "Pas de trap bar ni landmine",
      "Progressions barre principalement par paliers de 5 kg",
      "Préférence pour les tractions, dips et tirages en étirement"
    ]
  },
  week: {
    id: "demo-week-1",
    number: 1,
    block_name: "Nouveau bloc",
    title: "Semaine de lancement",
    objective: "Reprendre des repères propres, conserver de la marge et établir les charges de départ.",
    start_date: "2026-07-27",
    sessions: [
      {
        id: "s1-upper-force",
        day: "Lundi",
        title: "Upper force",
        goal: "Bench propre, dos lourd et travail d'épaules maîtrisé.",
        estimated_duration_min: 70,
        general_notes: "Aucune répétition grindée sur le développé couché.",
        exercises: [
          exercise("bench-main", "Développé couché", "Monter progressivement, trajectoire stable et pause contrôlée.", true, [
            set(1, 115, 1, 7, 8, 180), set(2, 105, 4, 7, 8, 150), set(3, 105, 4, 7, 8, 150), set(4, 105, 4, 7.5, 8.5, 150), set(5, 105, 4, 8, 9, 150)
          ]),
          exercise("pullup-weighted", "Tractions pronation lestées", "Poitrine vers la barre, amplitude complète.", false, [
            set(1, 20, 4, 7, 8, 150), set(2, 20, 4, 7, 8, 150), set(3, 20, 4, 8, 9, 150), set(4, 20, 4, 8, 9, 150)
          ]),
          exercise("military-bench", "Développé militaire sur banc", "Ne pas forcer si le poignet droit se manifeste.", false, [
            set(1, 30, 8, 7, 8, 120), set(2, 30, 8, 7, 8, 120), set(3, 30, 8, 8, 9, 120)
          ]),
          exercise("cable-row", "Tirage poulie pronation", "Chercher l'étirement sans arrondir le bas du dos.", false, [
            set(1, 65, 10, 7, 8, 90), set(2, 65, 10, 7, 8, 90), set(3, 65, 10, 8, 9, 90)
          ])
        ]
      },
      {
        id: "s2-quads",
        day: "Mardi",
        title: "Jambes — quadriceps",
        goal: "Squat technique et volume quadriceps sans dégrader l'amplitude.",
        estimated_duration_min: 70,
        general_notes: "Filmer la première série de squat de travail.",
        exercises: [
          exercise("pause-squat", "Back squat pause", "Pause nette en bas, remontée verticale.", true, [
            set(1, 100, 3, 7, 8, 180), set(2, 100, 3, 7, 8, 180), set(3, 100, 3, 7.5, 8.5, 180), set(4, 100, 3, 8, 9, 180), set(5, 100, 3, 8, 9, 180)
          ]),
          exercise("walking-lunge", "Fentes marchées haltères", "Pas suffisamment long, genou stable.", false, [
            set(1, 30, 10, 7, 8, 120), set(2, 30, 10, 8, 9, 120), set(3, 30, 10, 8, 9, 120)
          ]),
          exercise("leg-press", "Presse à cuisses", "Amplitude contrôlée et bassin collé.", false, [
            set(1, 180, 12, 7, 8, 120), set(2, 180, 12, 8, 9, 120), set(3, 180, 12, 8, 9, 120)
          ]),
          exercise("leg-extension", "Leg extension", "Contraction forte, retour contrôlé.", false, [
            set(1, 55, 15, 8, 9, 75), set(2, 55, 15, 8, 9, 75), set(3, 55, 15, 9, 10, 75)
          ])
        ]
      },
      {
        id: "s3-upper-volume",
        day: "Mercredi",
        title: "Upper volume",
        goal: "Accumuler du volume propre sur le haut du corps sans fatiguer excessivement le bench.",
        estimated_duration_min: 65,
        general_notes: "Rester à deux répétitions de l'échec sur les mouvements secondaires.",
        exercises: [
          exercise("pause-bench", "Développé couché pause", "Pause d'une seconde, vitesse constante.", false, [
            set(1, 90, 6, 7, 8, 120), set(2, 90, 6, 7, 8, 120), set(3, 90, 6, 8, 9, 120), set(4, 90, 6, 8, 9, 120)
          ]),
          exercise("lat-pulldown", "Tirage vertical pronation", "Épaules basses, étirement complet.", false, [
            set(1, 70, 10, 7, 8, 90), set(2, 70, 10, 8, 9, 90), set(3, 70, 10, 8, 9, 90), set(4, 70, 10, 8, 9, 90)
          ]),
          exercise("lateral-raise", "Élévations latérales", "Pas d'élan, tension continue.", false, [
            set(1, 12, 15, 8, 9, 60), set(2, 12, 15, 8, 9, 60), set(3, 12, 15, 9, 10, 60), set(4, 12, 15, 9, 10, 60)
          ]),
          exercise("dips", "Dips", "Amplitude confortable pour le poignet et l'épaule.", false, [
            set(1, 10, 8, 7, 8, 90), set(2, 10, 8, 8, 9, 90), set(3, 10, 8, 8, 9, 90)
          ])
        ]
      },
      {
        id: "s4-weightlifting",
        day: "Jeudi",
        title: "Haltérophilie & épaules",
        goal: "Technique explosive et stabilité overhead sans douleur.",
        estimated_duration_min: 65,
        general_notes: "Arrêter immédiatement le snatch si le poignet devient douloureux.",
        exercises: [
          exercise("snatch-drill", "Complexe éducatif snatch", "Tall snatch, muscle snatch puis overhead squat léger.", true, [
            set(1, 20, 3, 5, 6, 90), set(2, 20, 3, 5, 6, 90), set(3, 20, 3, 6, 7, 90), set(4, 20, 3, 6, 7, 90)
          ]),
          exercise("power-clean", "Power clean EMOM", "Réception haute et rapide, aucune répétition lente.", true, [
            set(1, 70, 2, 6, 7, 60), set(2, 70, 2, 6, 7, 60), set(3, 75, 2, 7, 8, 60), set(4, 75, 2, 7, 8, 60), set(5, 80, 1, 8, 9, 60), set(6, 80, 1, 8, 9, 60)
          ]),
          exercise("strict-press", "Strict press", "Gainage fort, pas de compensation lombaire.", false, [
            set(1, 55, 5, 7, 8, 120), set(2, 55, 5, 7, 8, 120), set(3, 55, 5, 8, 9, 120), set(4, 55, 5, 8, 9, 120)
          ]),
          exercise("rear-delt", "Oiseau à la poulie", "Tirer par les coudes, amplitude propre.", false, [
            set(1, 12.5, 15, 8, 9, 60), set(2, 12.5, 15, 8, 9, 60), set(3, 12.5, 15, 9, 10, 60)
          ])
        ]
      },
      {
        id: "s5-posterior",
        day: "Vendredi",
        title: "Chaîne postérieure",
        goal: "Fessiers et ischios lourds, gainage solide.",
        estimated_duration_min: 70,
        general_notes: "Garder deux répétitions de marge au RDL unilatéral.",
        exercises: [
          exercise("hip-thrust", "Hip thrust", "Verrouillage complet sans hyperextension lombaire.", true, [
            set(1, 150, 6, 7, 8, 150), set(2, 150, 6, 7, 8, 150), set(3, 150, 6, 8, 9, 150), set(4, 150, 6, 8, 9, 150)
          ]),
          exercise("single-rdl", "RDL unilatéral haltère", "Bassin stable, étirement ischio.", false, [
            set(1, 36, 8, 7, 8, 90), set(2, 36, 8, 8, 9, 90), set(3, 36, 8, 8, 9, 90)
          ]),
          exercise("leg-curl", "Leg curl", "Retour lent de deux secondes.", false, [
            set(1, 50, 10, 7, 8, 90), set(2, 50, 10, 8, 9, 90), set(3, 50, 10, 8, 9, 90), set(4, 50, 10, 9, 10, 90)
          ]),
          exercise("ab-wheel", "Ab wheel", "Bassin rétroversé, amplitude contrôlée.", false, [
            set(1, null, 10, 7, 8, 60), set(2, null, 10, 8, 9, 60), set(3, null, 10, 8, 9, 60)
          ])
        ]
      }
    ]
  }
};

function set(order, weightKg, reps, rpeMin, rpeMax, restSec) {
  return { order, weight_kg: weightKg, reps, target_rpe_min: rpeMin, target_rpe_max: rpeMax, rest_sec: restSec };
}

function exercise(id, name, instructions, filmRequested, sets) {
  return {
    id,
    name,
    instructions,
    film_requested: filmRequested,
    adaptation_rule: "Ajuster si la technique se dégrade ou si la douleur dépasse 3/10.",
    sets
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyWeeklyReview() {
  return { sleep: "", energy: "", hunger: "", protein: "", steps: "", cardio: "", events: "", feeling: "" };
}

function makeInitialState(program = DEMO_PROGRAM, history = []) {
  const base = clone(program);
  return {
    app_version: APP_VERSION,
    schema_version: APP_SCHEMA,
    athlete_profile: base.athlete_profile || clone(DEMO_PROGRAM.athlete_profile),
    week: base.week,
    daily_weights: {},
    session_results: {},
    weekly_review: emptyWeeklyReview(),
    history: clone(history || []),
    updated_at: new Date().toISOString()
  };
}

let state = loadState();
let currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
let activeExerciseId = null;
let currentViewId = "weekView";
let deferredInstallPrompt = null;
let pendingImport = null;
let issueContext = null;
let timerRemaining = 0;
let timerRunning = false;
let timerInterval = null;
let syncMeta = loadSyncMeta();
let syncTimer = null;
let syncInFlight = false;
let pendingRemoteConflict = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed.week?.sessions) throw new Error("État invalide");
    return migrateState(parsed);
  } catch (error) {
    console.warn("Impossible de charger les données locales", error);
    return makeInitialState();
  }
}

function migrateState(parsed) {
  const migrated = {
    ...parsed,
    app_version: APP_VERSION,
    schema_version: parsed.schema_version || APP_SCHEMA,
    daily_weights: parsed.daily_weights || {},
    session_results: parsed.session_results || {},
    weekly_review: { ...emptyWeeklyReview(), ...(parsed.weekly_review || {}) },
    history: Array.isArray(parsed.history) ? parsed.history : []
  };
  migrated.week.sessions.forEach(session => {
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
      er.overall_rpe = er.overall_rpe || "";
      er.show_sets = Boolean(er.show_sets);
      er.sets = (er.sets || []).map((setData, index) => ({
        weight_kg: setData.weight_kg ?? exerciseData.sets[index]?.weight_kg ?? "",
        reps: setData.reps ?? exerciseData.sets[index]?.reps ?? "",
        rpe: setData.rpe ?? "",
        completed: typeof setData.completed === "boolean" ? setData.completed : FINISHED_EXERCISE_STATUSES.has(er.status)
      }));
    });
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function saveState({ render = false, sync = true } = {}) {
  state.updated_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (sync) {
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
      show_sets: false,
      sets: exerciseData.sets.map(planned => ({
        weight_kg: planned.weight_kg,
        reps: planned.reps,
        rpe: "",
        completed: false
      }))
    };
  }
  return session.exercises[exerciseData.id];
}

function init() {
  bindStaticEvents();
  hydrateReview();
  renderWeek();
  renderSession(currentSessionId);
  renderHistory();
  renderReviewSummary();
  updateResumeButton();
  registerServiceWorker();
  renderSyncPanel();
  window.setTimeout(() => synchronize({ reason: "initial", silent: true }), 250);
}

function bindStaticEvents() {
  $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$(".history-tab").forEach(button => button.addEventListener("click", () => showHistoryPanel(button.dataset.historyPanel)));
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
  $("#completeSessionBtn").addEventListener("click", completeCurrentSession);
  $("#skipSessionBtn").addEventListener("click", openSkipSessionDialog);
  $("#skipSessionForm").addEventListener("submit", confirmSkipCurrentSession);

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
  const titles = { weekView: "Accueil", sessionView: "Ma séance", historyView: "Historique", reviewView: "Bilan", dataView: "Mes données" };
  $("#pageTitle").textContent = titles[viewId] || "Coach Jérémy";
  const activeSessionClosed = currentSessionId ? ["done", "skipped"].includes(sessionResult(currentSessionId).status) : true;
  $("#trainingDock").classList.toggle("hidden", viewId !== "sessionView" || activeSessionClosed);
  if (viewId === "weekView") renderWeek();
  if (viewId === "sessionView") renderSession(currentSessionId);
  if (viewId === "historyView") renderHistory();
  if (viewId === "dataView") renderSyncPanel();
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
  renderWeek();
  renderSession(currentSessionId);
  renderHistory();
  renderReviewSummary();
  refreshReportPreview();
  updateResumeButton();
}

function renderWeek() {
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
  const session = findNextSession();
  const container = $("#todayCard");
  if (!session) {
    container.innerHTML = `<article class="today-rest"><p class="section-kicker">SEMAINE CLÔTURÉE</p><h2>Toutes les séances sont traitées</h2><p class="muted">Tu peux compléter le bilan puis exporter la semaine vers ChatGPT.</p></article>`;
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
  $("#doneSessions").textContent = `${metrics.doneSessions}/${metrics.totalSessions}`;
  $("#progressValue").textContent = `${metrics.weekProgress}%`;
  $("#progressRing").style.setProperty("--progress", `${metrics.weekProgress * 3.6}deg`);
  $("#weekWeight").textContent = metrics.avgWeight ? `${metrics.avgWeight.toFixed(1)} kg` : "—";
  $("#weekRpe").textContent = metrics.avgRpe ? metrics.avgRpe.toFixed(1) : "—";
}

function renderWeightTrend() {
  const all = allWeightEntries();
  const latest = all.at(-1)?.value;
  const lastSeven = all.slice(-7).map(item => item.value);
  const previousSeven = all.slice(-14, -7).map(item => item.value);
  const avg7 = lastSeven.length ? average(lastSeven) : null;
  const prevAvg = previousSeven.length ? average(previousSeven) : null;
  const delta = avg7 !== null && prevAvg !== null ? avg7 - prevAvg : null;
  $("#weightTrend").innerHTML = `
    <div><strong>${latest ? `${latest.toFixed(1)} kg` : "—"}</strong><span>dernière pesée</span></div>
    <div><strong>${avg7 ? `${avg7.toFixed(1)} kg` : "—"}</strong><span>moyenne 7 pesées</span></div>
    <div><strong>${delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}</strong><span>évolution</span></div>`;
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
  $("#completeSessionBtn").textContent = result.status === "done" ? "Séance terminée ✓" : result.status === "skipped" ? "Séance non réalisée" : "Terminer la séance";
  $("#completeSessionBtn").disabled = result.status === "skipped";
  $("#skipSessionBtn").classList.toggle("hidden", result.status === "done" || result.status === "skipped");
  const completionMeta = $("#sessionCompletionMeta");
  const completionText = result.status === "done" && result.completed_at
    ? `Réalisée le ${formatDateTime(result.completed_at)}`
    : result.status === "skipped" && result.skipped_at
      ? `Non réalisée le ${formatDateTime(result.skipped_at)}${result.skip_reason ? ` · ${result.skip_reason}` : ""}`
      : "";
  completionMeta.textContent = completionText;
  completionMeta.classList.toggle("hidden", !completionText);

  renderRatingButtons($("#sessionEnergy"), range(1, 10), result.energy_before, value => updateSessionField("energy_before", value));
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
}

function renderExerciseCard(session, exerciseData, index) {
  const result = exerciseResult(session.id, exerciseData);
  const completed = FINISHED_EXERCISE_STATUSES.has(result.status);
  const hasIssue = result.issues.length > 0;
  const checkedSets = result.sets.filter(setData => setData.completed).length;
  const isOpen = activeExerciseId === exerciseData.id;
  const issueText = buildIssueSummary(result);
  const hasGuidance = Boolean(exerciseData.instructions || exerciseData.adaptation_rule);
  return `
    <article class="exercise-card ${isOpen ? "open" : ""} ${completed ? "completed" : ""} ${hasIssue ? "has-issue" : ""}" data-exercise-id="${escapeHtml(exerciseData.id)}">
      <button class="exercise-summary" type="button">
        <div class="exercise-summary-copy">
          <h3>${index + 1}. ${escapeHtml(exerciseData.name)}</h3>
          <p class="muted small">${escapeHtml(prescriptionText(exerciseData.sets))}${completed ? ` · ${labelFor(EXERCISE_STATUSES, result.status)}` : ""}</p>
        </div>
        <span class="exercise-state-icon">${completed ? checkIcon() : `<span class="exercise-chevron">${chevronDownIcon()}</span>`}</span>
      </button>
      <div class="exercise-body">
        ${hasGuidance ? `
        <details class="prescription-disclosure">
          <summary><span>Consignes & adaptation</span><span class="disclosure-chevron">${chevronDownIcon()}</span></summary>
          <div class="prescription-content">
            ${exerciseData.instructions ? `<div><strong>Exécution</strong><p>${escapeHtml(exerciseData.instructions)}</p></div>` : ""}
            ${exerciseData.adaptation_rule ? `<div><strong>Adaptation</strong><p>${escapeHtml(exerciseData.adaptation_rule)}</p></div>` : ""}
          </div>
        </details>` : ""}

        <div class="quick-actions">
          <button class="conform-button" type="button">${checkIcon()} Conforme</button>
          <button class="problem-button ${hasIssue ? "active" : ""}" type="button">${alertIcon()} ${hasIssue ? "Problème ajouté" : "Problème"}</button>
        </div>
        ${issueText ? `<div class="issue-summary">${escapeHtml(issueText)}</div>` : ""}

        <div class="exercise-rpe-block">
          <span class="field-label">RPE de l’exercice</span>
          <div class="rpe-strip exercise-rpe" data-exercise-id="${escapeHtml(exerciseData.id)}">${rpeButtonsHtml(result.overall_rpe)}</div>
        </div>

        <label class="exercise-status-row"><span>Statut</span><select class="exercise-status-select">${EXERCISE_STATUSES.map(([value, label]) => `<option value="${value}" ${result.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>

        <button class="sets-toggle" type="button"><span>Détail des séries</span><span>${checkedSets}/${result.sets.length} ${chevronDownIcon()}</span></button>
        <div class="sets-panel ${result.show_sets ? "open" : ""}">
          ${result.sets.map((actualSet, setIndex) => renderSetRow(exerciseData, actualSet, setIndex)).join("")}
          <button class="add-set" type="button">＋ Ajouter une série</button>
        </div>

        <div class="exercise-footer">
          <label class="film-toggle"><input class="filmed-toggle" type="checkbox" ${result.filmed ? "checked" : ""}> ${cameraIcon()} ${exerciseData.film_requested ? "À filmer" : "Filmé"}</label>
          <button class="primary-button exercise-complete" type="button">${completed ? "Enregistrer" : "Valider"}</button>
        </div>
      </div>
    </article>`;
}

function renderSetRow(exerciseData, actualSet, index) {
  const planned = exerciseData.sets[index] || {};
  const weightStep = inferWeightStep(exerciseData);
  return `
    <div class="set-row ${actualSet.completed ? "checked" : ""}" data-set-index="${index}">
      <span class="set-number">${index + 1}</span>
      <div>
        <div class="stepper">
          <button class="step-button" type="button" data-field="weight_kg" data-delta="-${weightStep}">−</button>
          <input class="set-weight" type="number" step="${weightStep}" inputmode="decimal" value="${actualSet.weight_kg ?? ""}" placeholder="${planned.weight_kg ?? "PDC"}">
          <button class="step-button" type="button" data-field="weight_kg" data-delta="${weightStep}">+</button>
        </div><span class="set-unit">kg</span>
      </div>
      <div>
        <div class="stepper">
          <button class="step-button" type="button" data-field="reps" data-delta="-1">−</button>
          <input class="set-reps" type="number" min="0" max="100" step="1" inputmode="numeric" value="${actualSet.reps ?? ""}">
          <button class="step-button" type="button" data-field="reps" data-delta="1">+</button>
        </div><span class="set-unit">reps</span>
      </div>
      <button class="set-check ${actualSet.completed ? "checked" : ""}" type="button" aria-label="Valider la série">${checkIcon()}</button>
      <button class="remove-set" type="button" aria-label="Supprimer la série">×</button>
    </div>`;
}

function bindExerciseEvents(session) {
  $$(".exercise-card").forEach(card => {
    const exerciseData = session.exercises.find(item => item.id === card.dataset.exerciseId);
    const result = exerciseResult(session.id, exerciseData);

    card.querySelector(".exercise-summary").addEventListener("click", () => {
      activeExerciseId = exerciseData.id;
      $$(".exercise-card").forEach(other => other.classList.toggle("open", other === card && !card.classList.contains("open")));
      if (!card.classList.contains("open")) card.classList.add("open");
      updateDockNavigation(session);
    });

    card.querySelectorAll(".exercise-rpe .rpe-chip").forEach(button => button.addEventListener("click", () => {
      result.overall_rpe = Number(button.dataset.value);
      saveState();
      card.querySelectorAll(".exercise-rpe .rpe-chip").forEach(item => item.classList.toggle("selected", item === button));
    }));

    card.querySelector(".conform-button").addEventListener("click", () => {
      result.sets = exerciseData.sets.map(planned => ({ weight_kg: planned.weight_kg, reps: planned.reps, rpe: "", completed: true }));
      result.status = "success";
      saveState();
      advanceAfterExercise(session, exerciseData.id, "Exercice validé conforme");
    });

    card.querySelector(".problem-button").addEventListener("click", () => openIssueDialog(session.id, exerciseData.id));

    card.querySelector(".exercise-status-select").addEventListener("change", event => {
      result.status = event.target.value;
      saveState();
      renderSessionProgress(session);
    });

    card.querySelector(".sets-toggle").addEventListener("click", () => {
      result.show_sets = !result.show_sets;
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelectorAll(".set-row").forEach(row => bindSetRow(row, result, exerciseData, session));

    card.querySelector(".add-set").addEventListener("click", () => {
      const last = result.sets.at(-1) || { weight_kg: "", reps: "", rpe: "", completed: false };
      result.sets.push({ weight_kg: last.weight_kg, reps: last.reps, rpe: "", completed: false });
      result.show_sets = true;
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelector(".filmed-toggle").addEventListener("change", event => {
      result.filmed = event.target.checked;
      saveState();
    });

    card.querySelector(".exercise-complete").addEventListener("click", () => {
      const completeSets = result.sets.filter(setData => setData.completed).length;
      if (result.status === "planned") {
        result.status = completeSets === result.sets.length ? "success" : completeSets > 0 ? "partial" : "success";
      }
      saveState();
      advanceAfterExercise(session, exerciseData.id, "Exercice enregistré");
    });
  });
}

function bindSetRow(row, result, exerciseData, session) {
  const index = Number(row.dataset.setIndex);
  const persistInputs = () => {
    if (!result.sets[index]) return;
    result.sets[index].weight_kg = numberOrBlank(row.querySelector(".set-weight").value);
    result.sets[index].reps = numberOrBlank(row.querySelector(".set-reps").value);
    saveState();
  };
  row.querySelector(".set-weight").addEventListener("change", persistInputs);
  row.querySelector(".set-reps").addEventListener("change", persistInputs);
  row.querySelectorAll(".step-button").forEach(button => button.addEventListener("click", () => {
    const field = button.dataset.field;
    const delta = Number(button.dataset.delta);
    const input = field === "weight_kg" ? row.querySelector(".set-weight") : row.querySelector(".set-reps");
    const current = numberOrBlank(input.value);
    const planned = exerciseData.sets[index]?.[field];
    const base = current === "" ? Number(planned ?? 0) : Number(current);
    const next = field === "reps" ? Math.max(0, Math.round(base + delta)) : Math.max(0, roundToHalf(base + delta));
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
    if (!result.sets.length) result.sets.push({ weight_kg: "", reps: "", rpe: "", completed: false });
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
  renderSession(currentSessionId);
  renderWeek();
  renderHistory();
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
  renderSession(currentSessionId);
  renderWeek();
  renderHistory();
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
  renderRatingButtons($("#reviewSleep"), range(1, 10), review.sleep, value => updateReview("sleep", value));
  renderRatingButtons($("#reviewEnergy"), range(1, 10), review.energy, value => updateReview("energy", value));
  renderRatingButtons($("#reviewHunger"), range(1, 10), review.hunger, value => updateReview("hunger", value));
  renderRatingButtons($("#reviewProtein"), range(1, 7), review.protein, value => updateReview("protein", value), "/7");
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
  $("#reviewAutoSummary").innerHTML = `
    <div class="summary-tile"><strong>${metrics.doneSessions}/${metrics.totalSessions}</strong><span>séances réalisées</span></div>
    <div class="summary-tile"><strong>${metrics.skippedSessions}</strong><span>séance${metrics.skippedSessions > 1 ? "s" : ""} non réalisée${metrics.skippedSessions > 1 ? "s" : ""}</span></div>
    <div class="summary-tile"><strong>${metrics.setCompletion}%</strong><span>séries validées</span></div>
    <div class="summary-tile"><strong>${metrics.avgRpe ? metrics.avgRpe.toFixed(1) : "—"}</strong><span>RPE moyen</span></div>`;
}

function refreshReportPreview() {
  const preview = $("#reportPreview");
  if (preview) preview.textContent = generateReport().slice(0, 2400) + (generateReport().length > 2400 ? "\n\n[…]" : "");
}

function renderHistory() {
  const archived = state.history || [];
  const totalWeeks = archived.length + 1;
  const allSnapshots = [...archived, snapshotCurrent(false)];
  const totalSessions = allSnapshots.reduce((sum, snapshot) => sum + calculateMetrics(snapshot).doneSessions, 0);
  const allWeights = allWeightEntries();
  const latestWeight = allWeights.at(-1)?.value;
  $("#historyOverview").innerHTML = `
    <article class="history-hero">
      <p class="section-kicker light">VUE D’ENSEMBLE</p>
      <h3>${totalWeeks} semaine${totalWeeks > 1 ? "s" : ""} suivie${totalWeeks > 1 ? "s" : ""}</h3>
      <div class="history-stats">
        <div><strong>${totalSessions}</strong><span>séances réalisées</span></div>
        <div><strong>${archived.length}</strong><span>semaines archivées</span></div>
        <div><strong>${latestWeight ? `${latestWeight.toFixed(1)} kg` : "—"}</strong><span>dernière pesée</span></div>
      </div>
    </article>`;

  if (!archived.length) {
    $("#historyList").innerHTML = `<div class="empty-state"><strong>Aucune semaine archivée</strong><br><span class="small">La première apparaîtra ici lors de l’import du prochain programme.</span></div>`;
  } else {
    $("#historyList").innerHTML = [...archived].reverse().map((snapshot, reverseIndex) => {
      const index = archived.length - 1 - reverseIndex;
      const metrics = calculateMetrics(snapshot);
      return `
        <details class="history-card">
          <summary>
            <div><p class="session-day">${escapeHtml(snapshot.week.block_name || "Bloc")}</p><h3>${escapeHtml(snapshot.week.title || `Semaine ${snapshot.week.number}`)}</h3><p class="muted small">Archivée le ${formatDate(snapshot.archived_at)}</p></div>
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
    }).join("");
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
      <div>
        <p class="section-kicker">RECORDS DE CHARGE</p>
        <h3>${records.length} exercice${records.length > 1 ? "s" : ""} suivi${records.length > 1 ? "s" : ""}</h3>
        <p>La charge la plus lourde validée, avec les répétitions et la date de la séance.</p>
      </div>
      <span class="records-medal">${trophyIcon()}</span>
    </article>`;
  if (!records.length) {
    $("#recordsList").innerHTML = `<div class="empty-state"><strong>Aucun record enregistré</strong><br><span class="small">Un record apparaît après validation d’une séance comportant une charge.</span></div>`;
    return;
  }
  $("#recordsList").innerHTML = records.map(record => `
    <article class="record-card">
      <div class="record-copy">
        <h3>${escapeHtml(record.name)}</h3>
        <p>${record.reps} rep${record.reps > 1 ? "s" : ""} · ${escapeHtml(record.sessionLabel)}</p>
      </div>
      <div class="record-value">
        <strong>${record.weight.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong><span>kg</span>
        <small>${formatCompactDate(record.date)}</small>
      </div>
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
      <div class="weight-history-title">
        <div>
          <p class="section-kicker">SUIVI DU POIDS</p>
          <h3>${entries.length} pesée${entries.length > 1 ? "s" : ""} enregistrée${entries.length > 1 ? "s" : ""}</h3>
          <p>${latest ? `Dernière mesure le ${formatDate(latest.date)}` : "Renseigne ton poids depuis l’accueil ou une séance."}</p>
        </div>
        <span class="weight-scale-icon" aria-hidden="true">${scaleIcon()}</span>
      </div>
      <div class="weight-history-stats">
        <div><strong>${latest ? `${latest.value.toFixed(1)} kg` : "—"}</strong><span>dernière</span></div>
        <div><strong>${averageSeven !== null ? `${averageSeven.toFixed(1)} kg` : "—"}</strong><span>moy. 7 pesées</span></div>
        <div><strong>${totalDelta === null ? "—" : `${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)} kg`}</strong><span>depuis le début</span></div>
      </div>
    </article>`;

  renderWeightChart(entries);
  if (!entries.length) {
    $("#weightHistoryList").innerHTML = `<div class="empty-state"><strong>Aucune pesée enregistrée</strong><br><span class="small">Chaque poids saisi apparaîtra ici avec sa date.</span></div>`;
    return;
  }

  const descending = [...entries].reverse();
  $("#weightHistoryList").innerHTML = descending.map((entry, reverseIndex) => {
    const chronologicalIndex = entries.length - 1 - reverseIndex;
    const previous = entries[chronologicalIndex - 1];
    const delta = previous ? entry.value - previous.value : null;
    const deltaLabel = delta === null ? "Première mesure" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg vs précédente`;
    const deltaClass = delta === null ? "neutral" : delta > 0 ? "up" : delta < 0 ? "down" : "neutral";
    return `
      <article class="weight-entry-card">
        <div class="weight-entry-date">
          <strong>${formatDate(entry.date)}</strong>
          <span class="weight-delta ${deltaClass}">${deltaLabel}</span>
        </div>
        <div class="weight-entry-value"><strong>${entry.value.toFixed(1)}</strong><span>kg</span></div>
      </article>`;
  }).join("");
}

function renderWeightChart(entries) {
  const container = $("#weightChart");
  if (!entries.length) {
    $("#weightChartRange").textContent = "Aucune donnée";
    container.innerHTML = `<div class="weight-chart-empty">La courbe apparaîtra après ta première pesée.</div>`;
    return;
  }

  const displayed = entries.slice(-30);
  $("#weightChartRange").textContent = entries.length > 30 ? "30 dernières pesées" : "Toutes les pesées";
  if (displayed.length === 1) {
    const only = displayed[0];
    container.innerHTML = `
      <svg class="weight-svg" viewBox="0 0 340 168" role="img" aria-label="Une pesée de ${only.value.toFixed(1)} kg">
        <line class="weight-grid-line" x1="20" y1="82" x2="320" y2="82" />
        <circle class="weight-chart-dot latest" cx="170" cy="82" r="5" />
        <text class="weight-chart-value" x="170" y="62" text-anchor="middle">${only.value.toFixed(1)} kg</text>
        <text class="weight-chart-date" x="170" y="146" text-anchor="middle">${escapeHtml(formatCompactDate(only.date))}</text>
      </svg>`;
    return;
  }

  const width = 340;
  const height = 168;
  const left = 22;
  const right = 18;
  const top = 22;
  const bottom = 34;
  const values = displayed.map(item => item.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const spread = Math.max(0.8, max - min);
  min -= Math.max(0.35, spread * 0.18);
  max += Math.max(0.35, spread * 0.18);
  const x = index => left + (index / (displayed.length - 1)) * (width - left - right);
  const y = value => top + ((max - value) / (max - min)) * (height - top - bottom);
  const points = displayed.map((item, index) => `${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const areaPoints = `${left},${height-bottom} ${points} ${width-right},${height-bottom}`;
  const latest = displayed.at(-1);
  const middleValue = (min + max) / 2;
  const dateIndices = [...new Set([0, Math.floor((displayed.length - 1) / 2), displayed.length - 1])];

  container.innerHTML = `
    <svg class="weight-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du poids de ${displayed[0].value.toFixed(1)} à ${latest.value.toFixed(1)} kg">
      <defs>
        <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity=".24"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity=".02"/>
        </linearGradient>
      </defs>
      <line class="weight-grid-line" x1="${left}" y1="${y(max).toFixed(1)}" x2="${width-right}" y2="${y(max).toFixed(1)}" />
      <line class="weight-grid-line" x1="${left}" y1="${y(middleValue).toFixed(1)}" x2="${width-right}" y2="${y(middleValue).toFixed(1)}" />
      <line class="weight-grid-line" x1="${left}" y1="${y(min).toFixed(1)}" x2="${width-right}" y2="${y(min).toFixed(1)}" />
      <polygon class="weight-chart-area" points="${areaPoints}" />
      <polyline class="weight-chart-line" points="${points}" />
      ${displayed.map((item, index) => `<circle class="weight-chart-dot ${index === displayed.length - 1 ? "latest" : ""}" cx="${x(index).toFixed(1)}" cy="${y(item.value).toFixed(1)}" r="${index === displayed.length - 1 ? 4.8 : 2.8}" />`).join("")}
      <text class="weight-chart-value" x="${x(displayed.length - 1).toFixed(1)}" y="${Math.max(15, y(latest.value)-13).toFixed(1)}" text-anchor="end">${latest.value.toFixed(1)} kg</text>
      ${dateIndices.map(index => `<text class="weight-chart-date" x="${x(index).toFixed(1)}" y="${height-10}" text-anchor="${index === 0 ? "start" : index === displayed.length - 1 ? "end" : "middle"}">${escapeHtml(formatCompactDate(displayed[index].date))}</text>`).join("")}
    </svg>`;
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
  sessions.forEach(session => {
    const sr = sessionResult(session.id, targetState);
    session.exercises.forEach(exerciseData => {
      totalExercises += 1;
      plannedSets += exerciseData.sets.length;
      const er = exerciseResult(session.id, exerciseData, targetState);
      if (FINISHED_EXERCISE_STATUSES.has(er.status)) doneExercises += 1;
      completedSets += er.sets.filter(setData => setData.completed).length;
      issueCount += er.issues.length ? 1 : 0;
      if (Number(er.overall_rpe)) rpes.push(Number(er.overall_rpe));
      er.sets.forEach(setData => { if (Number(setData.rpe)) rpes.push(Number(setData.rpe)); });
    });
    if (Number(sr.global_rpe)) rpes.push(Number(sr.global_rpe));
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
    avgWeight: weights.length ? average(weights) : null,
    issueCount
  };
}

function generateReport(targetState = state) {
  const metrics = calculateMetrics(targetState);
  const weights = Object.entries(targetState.daily_weights || {}).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => `${date}: ${value} kg`);
  const sessionSections = targetState.week.sessions.map((session, index) => {
    const result = sessionResult(session.id, targetState);
    const exercises = session.exercises.map((exerciseData, exIndex) => {
      const ex = exerciseResult(session.id, exerciseData, targetState);
      const planned = exerciseData.sets.map((setData, i) => `${i + 1}) ${formatWeight(setData.weight_kg)} × ${setData.reps} reps, RPE cible ${setData.target_rpe_min}-${setData.target_rpe_max}`).join(" ; ");
      const actual = ex.sets.map((setData, i) => `${i + 1}) ${formatWeight(setData.weight_kg)} × ${setData.reps || "—"} reps${setData.rpe ? `, RPE ${setData.rpe}` : ""}${setData.completed ? " ✓" : ""}`).join(" ; ");
      const issues = ex.issues.length ? ex.issues.map(value => labelFor(ISSUE_OPTIONS, value)).join(", ") : "aucun signalé";
      const technique = ex.technique_flags.length ? ex.technique_flags.map(value => labelFor(TECHNIQUE_OPTIONS, value)).join(", ") : "aucun";
      const pain = ex.issues.includes("pain") ? `${ex.pain.area || "zone non précisée"}, intensité ${ex.pain.intensity || "—"}/10, exercice ${ex.pain.continued ? "poursuivi" : "arrêté ou non précisé"}` : "aucune";
      return [
        `${exIndex + 1}. ${exerciseData.name}`,
        `   - Statut : ${labelFor(EXERCISE_STATUSES, ex.status)}`,
        `   - RPE exercice : ${ex.overall_rpe || "non renseigné"}`,
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
  return `SPORT_APP_WEEKLY_REPORT_START

SCHÉMA_APPLICATION: ${APP_SCHEMA}

PROFIL ATHLÈTE COMPACT
- Nom : ${profile.name || "Jérémy"}
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
- Début : ${targetState.week.start_date || "—"}
- Séances réalisées : ${metrics.doneSessions}/${metrics.totalSessions}
- Séances non réalisées : ${metrics.skippedSessions}
- Séries validées : ${metrics.completedSets}/${metrics.plannedSets} (${metrics.setCompletion} %)
- RPE moyen : ${metrics.avgRpe ? metrics.avgRpe.toFixed(1) : "non calculable"}
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

${sessionSections}

DEMANDE À CHATGPT
Analyse cette semaine en tenant compte du profil athlète et de l'historique du projet. Génère la semaine suivante. Réponds d'abord avec une analyse lisible, puis avec un JSON strictement conforme au schéma d'import SPORT_APP_SCHEMA_VERSION ${APP_SCHEMA}, compris entre SPORT_APP_IMPORT_START et SPORT_APP_IMPORT_END.

SPORT_APP_WEEKLY_REPORT_END`;
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
    toast("Contenu collé");
  } catch {
    toast("Autorise le presse-papiers ou colle manuellement");
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
    preview.innerHTML = `
      <strong>${escapeHtml(pendingImport.week.title || `Semaine ${pendingImport.week.number}`)}</strong>
      <p class="small">${pendingImport.week.sessions.length} séances · ${totalExercises} exercices · ${formatDuration(totalMinutes)}</p>
      <div class="import-session-list">${pendingImport.week.sessions.map((session, index) => `<span><b>Jour ${index + 1}</b><em>${escapeHtml(session.title)}${sessionSuggestionText(session) ? ` · ${escapeHtml(sessionSuggestionText(session))}` : ""}</em></span>`).join("")}</div>
      <button id="confirmImportBtn" class="primary-button full-button" type="button">Archiver la semaine actuelle et importer</button>`;
    $("#confirmImportBtn").addEventListener("click", confirmImport);
  } catch (error) {
    pendingImport = null;
    preview.className = "import-preview";
    preview.style.background = "var(--danger-soft)";
    preview.style.color = "var(--danger)";
    preview.textContent = `Import impossible : ${error.message}`;
  }
}

function confirmImport() {
  if (!pendingImport) return;
  confirmAction(
    "Importer la nouvelle semaine ?",
    "La semaine actuelle sera conservée dans l’historique avant d’être remplacée.",
    () => {
      const archived = snapshotCurrent(true);
      const history = [...(state.history || []), archived];
      const preservedProfile = pendingImport.athlete_profile || state.athlete_profile;
      state = makeInitialState(pendingImport, history);
      state.athlete_profile = preservedProfile;
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
  if (program.schema_version !== APP_SCHEMA) throw new Error(`version attendue ${APP_SCHEMA}`);
  if (!program.week || !Array.isArray(program.week.sessions) || !program.week.sessions.length) throw new Error("la semaine ne contient aucune séance");
  const ids = new Set();
  program.week.sessions.forEach((session, sessionIndex) => {
    if (!session.id || !session.title || !Array.isArray(session.exercises) || !session.exercises.length) throw new Error(`séance ${sessionIndex + 1} incomplète`);
    if (ids.has(session.id)) throw new Error(`identifiant de séance dupliqué : ${session.id}`);
    ids.add(session.id);
    session.exercises.forEach((exerciseData, exIndex) => {
      if (!exerciseData.id || !exerciseData.name || !Array.isArray(exerciseData.sets) || !exerciseData.sets.length) throw new Error(`exercice ${exIndex + 1} incomplet dans ${session.title}`);
      if (ids.has(exerciseData.id)) throw new Error(`identifiant dupliqué : ${exerciseData.id}`);
      ids.add(exerciseData.id);
      exerciseData.sets.forEach((setData, setIndex) => {
        if (typeof setData.reps !== "number") throw new Error(`répétitions invalides, ${session.title} / ${exerciseData.name} / série ${setIndex + 1}`);
      });
    });
  });
}

function downloadBackup() {
  downloadText(`coach-jeremy-backup-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
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
      currentSessionId = findNextSession()?.id || state.week.sessions[0]?.id || null;
      activeExerciseId = null;
      saveState();
      hydrateReview();
      renderAll();
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

function prescriptionText(sets) {
  if (!sets?.length) return "Aucune série";
  const groups = [];
  sets.forEach(setData => {
    const key = `${setData.weight_kg ?? "PDC"}|${setData.reps}|${setData.target_rpe_min}-${setData.target_rpe_max}`;
    const previous = groups.at(-1);
    if (previous?.key === key) previous.count += 1;
    else groups.push({ key, count: 1, set: setData });
  });
  return groups.map(group => `${group.count}×${group.set.reps} @ ${formatWeight(group.set.weight_kg)} · RPE ${group.set.target_rpe_min}-${group.set.target_rpe_max}`).join(" puis ");
}


function loadSyncMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}");
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
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
}

function scheduleAutoSync() {
  clearTimeout(syncTimer);
  if (syncMeta.configured === false || !navigator.onLine) return;
  syncTimer = setTimeout(() => synchronize({ reason: "auto", silent: true }), SYNC_DELAY_MS);
}

function renderSyncPanel() {
  const dot = $("#syncStatusDot");
  const label = $("#syncStatusLabel");
  const detail = $("#syncStatusDetail");
  const last = $("#lastSyncText");
  const button = $("#syncNowBtn");
  if (!dot || !label || !detail || !last || !button) return;

  let kind = "pending";
  let title = "Prêt à synchroniser";
  let description = "Les données restent enregistrées localement même hors connexion.";
  if (!navigator.onLine) {
    kind = "offline";
    title = "Hors connexion";
    description = "Tes modifications sont conservées et seront envoyées au retour du réseau.";
  } else if (syncInFlight) {
    kind = "syncing";
    title = "Synchronisation…";
    description = "Échange des données avec Cloudflare.";
  } else if (pendingRemoteConflict) {
    kind = "conflict";
    title = "Choix nécessaire";
    description = "Deux versions différentes existent. Choisis celle à conserver.";
  } else if (syncMeta.configured === false) {
    kind = "unavailable";
    title = "Configuration nécessaire";
    description = "Crée la base D1 et ajoute la liaison DB dans Cloudflare Pages.";
  } else if (syncMeta.dirty) {
    kind = "pending";
    title = "Modifications en attente";
    description = "La sauvegarde locale est à jour ; l’envoi en ligne va démarrer.";
  } else if (syncMeta.last_synced_at) {
    kind = "synced";
    title = "Données à jour";
    description = "Cette version est la même sur le PC et l’iPhone.";
  }

  dot.className = `sync-status-dot ${kind}`;
  label.textContent = title;
  detail.textContent = description;
  last.textContent = syncMeta.last_synced_at ? formatDateTime(syncMeta.last_synced_at) : "Jamais";
  button.disabled = syncInFlight || !navigator.onLine;
  button.textContent = syncInFlight ? "Synchronisation…" : pendingRemoteConflict ? "Résoudre le conflit" : "Synchroniser maintenant";
}

async function synchronize({ reason = "manual", silent = false } = {}) {
  if (syncInFlight) return;
  if (pendingRemoteConflict) {
    showSyncConflictDialog(pendingRemoteConflict);
    return;
  }
  if (!navigator.onLine) {
    renderSyncPanel();
    if (!silent) toast("Pas de connexion Internet");
    return;
  }

  clearTimeout(syncTimer);
  syncInFlight = true;
  renderSyncPanel();
  try {
    const remote = await fetchRemoteState();
    syncMeta.configured = true;
    syncMeta.last_error = "";

    if (!remote.exists) {
      await pushLocalState(0, { silent });
      return;
    }

    if (!syncMeta.remote_revision) {
      if (hasMeaningfulLocalData()) {
        setSyncConflict(remote);
        if (!silent || reason === "initial") showSyncConflictDialog(remote);
      } else {
        applyRemoteState(remote);
        if (!silent) toast("Version en ligne récupérée");
      }
      return;
    }

    if (remote.revision === syncMeta.remote_revision) {
      if (syncMeta.dirty) await pushLocalState(remote.revision, { silent });
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
    handleSyncError(error, silent);
  } finally {
    syncInFlight = false;
    renderSyncPanel();
  }
}

async function fetchRemoteState() {
  const response = await fetch(SYNC_ENDPOINT, { method: "GET", headers: { accept: "application/json" }, cache: "no-store" });
  const payload = await safeJson(response);
  if (!response.ok) {
    const error = new Error(payload.message || "La synchronisation est indisponible.");
    error.status = response.status;
    error.code = payload.error;
    throw error;
  }
  return payload;
}

async function pushLocalState(baseRevision, { silent = false, force = false } = {}) {
  const response = await fetch(SYNC_ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      state,
      base_revision: Number(baseRevision || 0),
      device_id: syncMeta.device_id,
      client_updated_at: state.updated_at
    })
  });
  const payload = await safeJson(response);
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
  syncMeta.remote_revision = Number(payload.revision || baseRevision + 1);
  syncMeta.last_synced_at = payload.updated_at || new Date().toISOString();
  syncMeta.dirty = false;
  syncMeta.configured = true;
  syncMeta.last_error = "";
  persistSyncMeta();
  pendingRemoteConflict = null;
  if (!silent || force) toast("Données synchronisées");
  return true;
}

function applyRemoteState(remote) {
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
  renderSyncPanel();
}

function hasMeaningfulLocalData() {
  if (state.week?.id && state.week.id !== DEMO_PROGRAM.week.id) return true;
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
      if (exerciseState.status !== "planned" || exerciseState.issues?.length || exerciseState.technique_flags?.length || exerciseState.pain?.area || exerciseState.pain?.intensity || exerciseState.pain?.continued || exerciseState.filmed || exerciseState.note || exerciseState.overall_rpe) return true;
      return (exerciseState.sets || []).some((setData, index) => {
        const planned = exerciseData.sets[index] || {};
        return setData.completed || setData.rpe || numberOrBlank(setData.weight_kg) !== numberOrBlank(planned.weight_kg) || numberOrBlank(setData.reps) !== numberOrBlank(planned.reps);
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
