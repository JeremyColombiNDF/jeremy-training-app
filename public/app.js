"use strict";

const STORAGE_KEY = "coach_jeremy_state_v1";
const APP_SCHEMA = "1.0";

const STATUS_LABELS = {
  planned: "À faire",
  in_progress: "En cours",
  done: "Terminée"
};

const EXERCISE_STATUSES = [
  ["planned", "À faire"],
  ["success", "Réussi"],
  ["partial", "Partiel"],
  ["failed", "Échec"],
  ["replaced", "Remplacé"],
  ["skipped", "Non réalisé"]
];

const ISSUE_OPTIONS = [
  ["too_heavy", "Trop lourd"],
  ["pain", "Douleur / gêne"],
  ["technique", "Technique"],
  ["fatigue", "Fatigue"],
  ["equipment", "Matériel"],
  ["time", "Manque de temps"],
  ["feeling", "Mauvais ressenti"]
];

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

function makeInitialState(program = DEMO_PROGRAM) {
  const base = clone(program);
  return {
    schema_version: APP_SCHEMA,
    athlete_profile: base.athlete_profile || clone(DEMO_PROGRAM.athlete_profile),
    week: base.week,
    daily_weights: {},
    session_results: {},
    weekly_review: {
      sleep: "",
      energy: "",
      hunger: "",
      protein: "",
      steps: "",
      cardio: "",
      events: "",
      feeling: ""
    },
    updated_at: new Date().toISOString()
  };
}

let state = loadState();
let currentSessionId = state.week.sessions[0]?.id || null;
let deferredInstallPrompt = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed.week?.sessions) throw new Error("État invalide");
    return parsed;
  } catch (error) {
    console.warn("Impossible de charger les données locales", error);
    return makeInitialState();
  }
}

function saveState() {
  state.updated_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderSummary();
}

function sessionResult(sessionId) {
  if (!state.session_results[sessionId]) {
    state.session_results[sessionId] = {
      status: "planned",
      weight_kg: "",
      energy_before: "",
      actual_duration_min: "",
      global_rpe: "",
      comment: "",
      exercises: {}
    };
  }
  return state.session_results[sessionId];
}

function exerciseResult(sessionId, exerciseData) {
  const session = sessionResult(sessionId);
  if (!session.exercises[exerciseData.id]) {
    session.exercises[exerciseData.id] = {
      status: "planned",
      issues: [],
      filmed: false,
      note: "",
      sets: exerciseData.sets.map(planned => ({
        weight_kg: planned.weight_kg,
        reps: planned.reps,
        rpe: ""
      }))
    };
  }
  return session.exercises[exerciseData.id];
}

function initSelect(select, values, placeholder = "Choisir") {
  select.innerHTML = `<option value="">${placeholder}</option>` + values.map(value => `<option value="${value}">${value}/10</option>`).join("");
}

function init() {
  initSelect($("#sessionEnergy"), range(1, 10));
  initSelect($("#sessionRpe"), halfRange(5, 10));
  initSelect($("#reviewSleep"), range(1, 10));
  initSelect($("#reviewEnergy"), range(1, 10));
  initSelect($("#reviewHunger"), range(1, 10));
  $("#reviewProtein").innerHTML = '<option value="">Choisir</option>' + [1,2,3,4,5,6,7].map(v => `<option value="${v}">${v}/7 jours</option>`).join("");

  bindStaticEvents();
  hydrateReview();
  renderWeek();
  renderSession(currentSessionId);
  registerServiceWorker();
}

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function halfRange(min, max) {
  const values = [];
  for (let n = min; n <= max; n += 0.5) values.push(n);
  return values;
}

function bindStaticEvents() {
  $$(".nav-item").forEach(button => button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "sessionView" && !currentSessionId) currentSessionId = state.week.sessions[0]?.id;
    showView(view);
    if (view === "sessionView") renderSession(currentSessionId);
    if (view === "reviewView") hydrateReview();
  }));

  $("#backToWeek").addEventListener("click", () => showView("weekView"));
  $("#dailyWeight").addEventListener("change", event => {
    const key = todayKey();
    state.daily_weights[key] = numberOrBlank(event.target.value);
    const active = currentSessionId ? sessionResult(currentSessionId) : null;
    if (active && !active.weight_kg) active.weight_kg = numberOrBlank(event.target.value);
    saveState();
  });

  $("#sessionWeight").addEventListener("change", event => {
    const result = sessionResult(currentSessionId);
    result.weight_kg = numberOrBlank(event.target.value);
    if (result.weight_kg) state.daily_weights[todayKey()] = result.weight_kg;
    saveState();
  });
  $("#sessionEnergy").addEventListener("change", event => updateSessionField("energy_before", event.target.value));
  $("#actualDuration").addEventListener("change", event => updateSessionField("actual_duration_min", numberOrBlank(event.target.value)));
  $("#sessionRpe").addEventListener("change", event => updateSessionField("global_rpe", numberOrBlank(event.target.value)));
  $("#sessionComment").addEventListener("input", debounce(event => updateSessionField("comment", event.target.value), 300));
  $("#completeSessionBtn").addEventListener("click", completeCurrentSession);

  ["Sleep", "Energy", "Hunger", "Protein", "Steps", "Cardio", "Events", "Feeling"].forEach(name => {
    const element = $(`#review${name}`);
    const key = name.toLowerCase();
    element.addEventListener(element.tagName === "TEXTAREA" || element.type === "text" ? "input" : "change", debounce(event => {
      state.weekly_review[key] = event.target.value;
      saveState();
    }, 250));
  });

  $("#copyReportBtn").addEventListener("click", copyReport);
  $("#downloadReportBtn").addEventListener("click", downloadReport);
  $("#pasteImportBtn").addEventListener("click", pasteImport);
  $("#previewImportBtn").addEventListener("click", importProgram);
  $("#backupBtn").addEventListener("click", downloadBackup);
  $("#restoreInput").addEventListener("change", restoreBackup);
  $("#resetDemoBtn").addEventListener("click", () => confirmAction(
    "Réinitialiser la démonstration ?",
    "Toutes les saisies enregistrées dans ce navigateur seront supprimées.",
    () => {
      state = makeInitialState();
      currentSessionId = state.week.sessions[0]?.id || null;
      saveState();
      hydrateReview();
      renderWeek();
      renderSession(currentSessionId);
      toast("Démonstration réinitialisée");
    }
  ));

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

function showView(viewId) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === viewId));
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === viewId));
  const titles = { weekView: "Ma semaine", sessionView: "Ma séance", reviewView: "Bilan", dataView: "Mes données" };
  $("#pageTitle").textContent = titles[viewId] || "Coach Jérémy";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderWeek() {
  $("#blockLabel").textContent = state.week.block_name || "Bloc actuel";
  $("#weekTitle").textContent = state.week.title || `Semaine ${state.week.number}`;
  $("#weekObjective").textContent = state.week.objective || "Objectif non renseigné";
  const todayWeight = state.daily_weights[todayKey()] ?? "";
  $("#dailyWeight").value = todayWeight;

  $("#sessionList").innerHTML = state.week.sessions.map(session => {
    const result = sessionResult(session.id);
    const doneExercises = session.exercises.filter(ex => ["success", "partial", "failed", "replaced", "skipped"].includes(exerciseResult(session.id, ex).status)).length;
    const dotClass = result.status === "done" ? "done" : result.status === "in_progress" ? "progress" : "";
    return `
      <article class="session-card">
        <div class="session-card-top">
          <div>
            <p class="session-day">${escapeHtml(session.day || "Séance")}</p>
            <h3>${escapeHtml(session.title)}</h3>
            <p class="muted small">${escapeHtml(session.goal || "")}</p>
          </div>
          <span class="status-dot ${dotClass}" aria-label="${STATUS_LABELS[result.status]}"></span>
        </div>
        <div class="session-card-meta">
          <span class="pill soft">${session.estimated_duration_min || "—"} min</span>
          <span class="pill soft">${doneExercises}/${session.exercises.length} exercices</span>
          <span class="pill soft">${STATUS_LABELS[result.status] || "À faire"}</span>
        </div>
        <button class="primary-button open-session" type="button" data-session-id="${session.id}">${result.status === "done" ? "Voir la séance" : result.status === "in_progress" ? "Continuer" : "Commencer"}</button>
      </article>`;
  }).join("");

  $$(".open-session").forEach(button => button.addEventListener("click", () => {
    currentSessionId = button.dataset.sessionId;
    const result = sessionResult(currentSessionId);
    if (result.status === "planned") result.status = "in_progress";
    saveState();
    renderSession(currentSessionId);
    showView("sessionView");
  }));

  renderSummary();
}

function renderSummary() {
  if (!state.week?.sessions) return;
  const results = state.week.sessions.map(session => sessionResult(session.id));
  const done = results.filter(result => result.status === "done").length;
  const progress = state.week.sessions.length ? Math.round(done / state.week.sessions.length * 100) : 0;
  $("#doneSessions").textContent = `${done}/${state.week.sessions.length}`;
  $("#progressValue").textContent = `${progress}%`;
  $("#progressRing").style.setProperty("--progress", `${progress * 3.6}deg`);

  const weights = Object.values(state.daily_weights).map(Number).filter(Number.isFinite);
  $("#weekWeight").textContent = weights.length ? `${average(weights).toFixed(1)} kg` : "—";

  const rpes = [];
  results.forEach(result => {
    if (Number(result.global_rpe)) rpes.push(Number(result.global_rpe));
    Object.values(result.exercises || {}).forEach(ex => (ex.sets || []).forEach(s => {
      if (Number(s.rpe)) rpes.push(Number(s.rpe));
    }));
  });
  $("#weekRpe").textContent = rpes.length ? average(rpes).toFixed(1) : "—";
}

function renderSession(sessionId) {
  const session = state.week.sessions.find(item => item.id === sessionId) || state.week.sessions[0];
  if (!session) return;
  currentSessionId = session.id;
  const result = sessionResult(session.id);

  $("#sessionDay").textContent = session.day || "Séance";
  $("#sessionTitle").textContent = session.title;
  $("#sessionGoal").textContent = session.goal || "";
  $("#sessionDuration").textContent = `${session.estimated_duration_min || "—"} min prévues`;
  $("#sessionStatusPill").textContent = STATUS_LABELS[result.status] || "À faire";
  $("#sessionWeight").value = result.weight_kg || state.daily_weights[todayKey()] || "";
  $("#sessionEnergy").value = result.energy_before || "";
  $("#actualDuration").value = result.actual_duration_min || "";
  $("#sessionRpe").value = result.global_rpe || "";
  $("#sessionComment").value = result.comment || "";
  $("#completeSessionBtn").textContent = result.status === "done" ? "Séance terminée ✓" : "Terminer la séance";

  $("#exerciseList").innerHTML = session.exercises.map((exerciseData, index) => renderExerciseCard(session, exerciseData, index)).join("");
  bindExerciseEvents(session);
}

function renderExerciseCard(session, exerciseData, index) {
  const result = exerciseResult(session.id, exerciseData);
  const prescription = prescriptionText(exerciseData.sets);
  const completed = ["success", "partial", "failed", "replaced", "skipped"].includes(result.status);
  return `
    <article class="exercise-card ${index === 0 && !completed ? "open" : ""}" data-exercise-id="${exerciseData.id}">
      <button class="exercise-summary" type="button">
        <div>
          <h3>${index + 1}. ${escapeHtml(exerciseData.name)}</h3>
          <p class="muted small">${escapeHtml(prescription)}${completed ? ` · ${labelFor(EXERCISE_STATUSES, result.status)}` : ""}</p>
        </div>
        <span class="exercise-chevron">⌄</span>
      </button>
      <div class="exercise-body">
        <div class="prescription">
          <strong>Consigne</strong>
          <p>${escapeHtml(exerciseData.instructions || "Aucune consigne spécifique.")}</p>
          ${exerciseData.adaptation_rule ? `<p><strong>Adaptation :</strong> ${escapeHtml(exerciseData.adaptation_rule)}</p>` : ""}
        </div>

        <h4>Résultat</h4>
        <div class="status-selector">
          ${EXERCISE_STATUSES.map(([value, label]) => `
            <label class="choice-chip">
              <input type="radio" name="status-${exerciseData.id}" value="${value}" ${result.status === value ? "checked" : ""}>
              <span>${label}</span>
            </label>`).join("")}
        </div>

        <div class="sets-table">
          ${result.sets.map((actualSet, setIndex) => renderSetRow(exerciseData, actualSet, setIndex)).join("")}
        </div>
        <button class="add-set" type="button">＋ Ajouter une série</button>

        <div class="exercise-options">
          <h4>Un problème ?</h4>
          <div class="tag-selector">
            ${ISSUE_OPTIONS.map(([value, label]) => `
              <label class="choice-chip">
                <input type="checkbox" value="${value}" ${result.issues.includes(value) ? "checked" : ""}>
                <span>${label}</span>
              </label>`).join("")}
          </div>
          <label class="inline-toggle">
            <input class="filmed-toggle" type="checkbox" ${result.filmed ? "checked" : ""}>
            Série filmée ${exerciseData.film_requested ? "— demandée dans le programme" : ""}
          </label>
          <textarea class="exercise-note" rows="2" placeholder="Commentaire court sur l'exécution...">${escapeHtml(result.note || "")}</textarea>
          <button class="primary-button exercise-complete" type="button">${completed ? "Enregistrer les modifications" : "Valider l'exercice"}</button>
        </div>
      </div>
    </article>`;
}

function renderSetRow(exerciseData, actualSet, index) {
  const planned = exerciseData.sets[index] || {};
  return `
    <div class="set-row" data-set-index="${index}">
      <span class="set-number">${index + 1}</span>
      <div class="set-control">
        <label>kg</label>
        <input class="set-weight" type="number" step="0.5" inputmode="decimal" value="${actualSet.weight_kg ?? ""}" placeholder="${planned.weight_kg ?? "PDC"}">
      </div>
      <div class="set-control">
        <label>reps</label>
        <input class="set-reps" type="number" min="0" max="100" step="1" inputmode="numeric" value="${actualSet.reps ?? ""}">
      </div>
      <div class="set-control">
        <label>RPE</label>
        <select class="set-rpe">
          <option value="">—</option>
          ${halfRange(5, 10).map(rpe => `<option value="${rpe}" ${String(actualSet.rpe) === String(rpe) ? "selected" : ""}>${rpe}</option>`).join("")}
        </select>
      </div>
      <button class="remove-set" type="button" aria-label="Supprimer la série">×</button>
    </div>`;
}

function bindExerciseEvents(session) {
  $$(".exercise-card").forEach(card => {
    const exerciseData = session.exercises.find(item => item.id === card.dataset.exerciseId);
    const result = exerciseResult(session.id, exerciseData);
    card.querySelector(".exercise-summary").addEventListener("click", () => card.classList.toggle("open"));

    card.querySelectorAll(`input[name="status-${exerciseData.id}"]`).forEach(input => input.addEventListener("change", event => {
      result.status = event.target.value;
      saveState();
    }));

    card.querySelectorAll(".tag-selector input").forEach(input => input.addEventListener("change", () => {
      result.issues = [...card.querySelectorAll(".tag-selector input:checked")].map(item => item.value);
      saveState();
    }));

    card.querySelector(".filmed-toggle").addEventListener("change", event => {
      result.filmed = event.target.checked;
      saveState();
    });

    card.querySelector(".exercise-note").addEventListener("input", debounce(event => {
      result.note = event.target.value;
      saveState();
    }, 250));

    card.querySelectorAll(".set-row").forEach(row => bindSetRow(row, result, exerciseData));

    card.querySelector(".add-set").addEventListener("click", () => {
      const last = result.sets[result.sets.length - 1] || { weight_kg: "", reps: "", rpe: "" };
      result.sets.push({ weight_kg: last.weight_kg, reps: last.reps, rpe: "" });
      saveState();
      renderSession(session.id);
      reopenExercise(exerciseData.id);
    });

    card.querySelector(".exercise-complete").addEventListener("click", () => {
      syncCardSets(card, result);
      if (result.status === "planned") result.status = "success";
      const next = card.nextElementSibling;
      card.classList.remove("open");
      if (next?.classList.contains("exercise-card")) next.classList.add("open");
      saveState();
      renderSession(session.id);
      if (next) reopenExercise(next.dataset.exerciseId);
      toast("Exercice enregistré");
    });
  });
}

function bindSetRow(row, result, exerciseData) {
  const index = Number(row.dataset.setIndex);
  const update = () => {
    if (!result.sets[index]) return;
    result.sets[index].weight_kg = numberOrBlank(row.querySelector(".set-weight").value);
    result.sets[index].reps = numberOrBlank(row.querySelector(".set-reps").value);
    result.sets[index].rpe = numberOrBlank(row.querySelector(".set-rpe").value);
    saveState();
  };
  row.querySelector(".set-weight").addEventListener("change", update);
  row.querySelector(".set-reps").addEventListener("change", update);
  row.querySelector(".set-rpe").addEventListener("change", update);
  row.querySelector(".remove-set").addEventListener("click", () => {
    result.sets.splice(index, 1);
    if (!result.sets.length) result.sets.push({ weight_kg: "", reps: "", rpe: "" });
    saveState();
    renderSession(currentSessionId);
    reopenExercise(exerciseData.id);
  });
}

function syncCardSets(card, result) {
  result.sets = [...card.querySelectorAll(".set-row")].map(row => ({
    weight_kg: numberOrBlank(row.querySelector(".set-weight").value),
    reps: numberOrBlank(row.querySelector(".set-reps").value),
    rpe: numberOrBlank(row.querySelector(".set-rpe").value)
  }));
}

function reopenExercise(exerciseId) {
  requestAnimationFrame(() => {
    const card = document.querySelector(`.exercise-card[data-exercise-id="${CSS.escape(exerciseId)}"]`);
    if (card) card.classList.add("open");
  });
}

function updateSessionField(field, value) {
  const result = sessionResult(currentSessionId);
  result[field] = value;
  if (result.status === "planned") result.status = "in_progress";
  saveState();
}

function completeCurrentSession() {
  const result = sessionResult(currentSessionId);
  result.status = "done";
  state.week.sessions.find(session => session.id === currentSessionId)?.exercises.forEach(exerciseData => {
    const exResult = exerciseResult(currentSessionId, exerciseData);
    if (exResult.status === "planned") exResult.status = "success";
  });
  saveState();
  renderSession(currentSessionId);
  renderWeek();
  toast("Séance terminée");
}

function hydrateReview() {
  const r = state.weekly_review;
  $("#reviewSleep").value = r.sleep || "";
  $("#reviewEnergy").value = r.energy || "";
  $("#reviewHunger").value = r.hunger || "";
  $("#reviewProtein").value = r.protein || "";
  $("#reviewSteps").value = r.steps || "";
  $("#reviewCardio").value = r.cardio || "";
  $("#reviewEvents").value = r.events || "";
  $("#reviewFeeling").value = r.feeling || "";
}

function generateReport() {
  const weights = Object.entries(state.daily_weights).map(([date, value]) => `${date}: ${value} kg`);
  const sessionSections = state.week.sessions.map((session, index) => {
    const result = sessionResult(session.id);
    const exercises = session.exercises.map((exerciseData, exIndex) => {
      const ex = exerciseResult(session.id, exerciseData);
      const planned = exerciseData.sets.map((s, i) => `${i + 1}) ${formatWeight(s.weight_kg)} × ${s.reps} reps, RPE cible ${s.target_rpe_min}-${s.target_rpe_max}`).join(" ; ");
      const actual = ex.sets.map((s, i) => `${i + 1}) ${formatWeight(s.weight_kg)} × ${s.reps || "—"} reps${s.rpe ? `, RPE ${s.rpe}` : ""}`).join(" ; ");
      const issues = ex.issues.length ? ex.issues.map(value => labelFor(ISSUE_OPTIONS, value)).join(", ") : "aucun signalé";
      return [
        `${exIndex + 1}. ${exerciseData.name}`,
        `   - Statut : ${labelFor(EXERCISE_STATUSES, ex.status)}`,
        `   - Prévu : ${planned}`,
        `   - Réalisé : ${actual}`,
        `   - Problèmes : ${issues}`,
        `   - Filmé : ${ex.filmed ? "oui" : "non"}${exerciseData.film_requested ? " (demandé)" : ""}`,
        `   - Note : ${ex.note || "aucune"}`
      ].join("\n");
    }).join("\n\n");

    return [
      `SÉANCE ${index + 1} — ${session.day} — ${session.title}`,
      `Objectif : ${session.goal || "—"}`,
      `Statut : ${STATUS_LABELS[result.status]}`,
      `Poids : ${result.weight_kg ? `${result.weight_kg} kg` : "non renseigné"}`,
      `Énergie avant : ${result.energy_before ? `${result.energy_before}/10` : "non renseignée"}`,
      `Durée réelle : ${result.actual_duration_min ? `${result.actual_duration_min} min` : "non renseignée"}`,
      `Difficulté globale : ${result.global_rpe ? `${result.global_rpe}/10` : "non renseignée"}`,
      `Commentaire : ${result.comment || "aucun"}`,
      "",
      exercises
    ].join("\n");
  }).join("\n\n----------------------------------------\n\n");

  const profile = state.athlete_profile || {};
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
- Bloc : ${state.week.block_name || "—"}
- Numéro : ${state.week.number || "—"}
- Titre : ${state.week.title || "—"}
- Objectif : ${state.week.objective || "—"}
- Début : ${state.week.start_date || "—"}

PESÉES
${weights.length ? weights.map(item => `- ${item}`).join("\n") : "- Aucune pesée renseignée"}

BILAN HEBDOMADAIRE
- Sommeil : ${state.weekly_review.sleep ? `${state.weekly_review.sleep}/10` : "non renseigné"}
- Énergie générale : ${state.weekly_review.energy ? `${state.weekly_review.energy}/10` : "non renseignée"}
- Faim : ${state.weekly_review.hunger ? `${state.weekly_review.hunger}/10` : "non renseignée"}
- Protéines : ${state.weekly_review.protein ? `${state.weekly_review.protein}/7 jours` : "non renseignées"}
- Pas moyens : ${state.weekly_review.steps || "non renseignés"}
- Cardio / activités : ${state.weekly_review.cardio || "aucun renseignement"}
- Événements particuliers : ${state.weekly_review.events || "aucun"}
- Impression visuelle / ressenti : ${state.weekly_review.feeling || "non renseigné"}

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
    toast("Bilan copié dans le presse-papiers");
  } catch {
    fallbackCopy(report);
    toast("Bilan copié");
  }
}

function downloadReport() {
  const filename = `bilan-semaine-${state.week.number || "x"}.txt`;
  downloadText(filename, generateReport(), "text/plain;charset=utf-8");
}

async function pasteImport() {
  try {
    $("#importText").value = await navigator.clipboard.readText();
    toast("Contenu collé");
  } catch {
    toast("Autorise l'accès au presse-papiers ou colle manuellement");
  }
}

function importProgram() {
  try {
    const parsed = parseImportText($("#importText").value);
    validateProgram(parsed);
    const preview = $("#importPreview");
    preview.classList.remove("hidden");
    preview.innerHTML = `<strong>${escapeHtml(parsed.week.title || `Semaine ${parsed.week.number}`)}</strong><br>${parsed.week.sessions.length} séances · ${parsed.week.sessions.reduce((sum, s) => sum + s.exercises.length, 0)} exercices. Import effectué.`;

    const preservedProfile = parsed.athlete_profile || state.athlete_profile;
    state = makeInitialState(parsed);
    state.athlete_profile = preservedProfile;
    currentSessionId = state.week.sessions[0]?.id || null;
    saveState();
    hydrateReview();
    renderWeek();
    renderSession(currentSessionId);
    $("#importText").value = "";
    toast("Nouvelle semaine importée");
  } catch (error) {
    $("#importPreview").classList.remove("hidden");
    $("#importPreview").style.background = "var(--danger-soft)";
    $("#importPreview").style.color = "var(--danger)";
    $("#importPreview").textContent = `Import impossible : ${error.message}`;
  }
}

function parseImportText(text) {
  if (!text.trim()) throw new Error("aucun contenu collé");
  const start = text.indexOf("SPORT_APP_IMPORT_START");
  const end = text.indexOf("SPORT_APP_IMPORT_END");
  let jsonText = text.trim();
  if (start !== -1 && end !== -1 && end > start) {
    jsonText = text.slice(start + "SPORT_APP_IMPORT_START".length, end).trim();
  }
  jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(jsonText);
}

function validateProgram(program) {
  if (program.schema_version !== APP_SCHEMA) throw new Error(`version attendue ${APP_SCHEMA}`);
  if (!program.week || !Array.isArray(program.week.sessions) || !program.week.sessions.length) throw new Error("la semaine ne contient aucune séance");
  const ids = new Set();
  program.week.sessions.forEach((session, sessionIndex) => {
    if (!session.id || !session.title || !Array.isArray(session.exercises)) throw new Error(`séance ${sessionIndex + 1} incomplète`);
    if (ids.has(session.id)) throw new Error(`identifiant de séance dupliqué : ${session.id}`);
    ids.add(session.id);
    session.exercises.forEach((ex, exIndex) => {
      if (!ex.id || !ex.name || !Array.isArray(ex.sets) || !ex.sets.length) throw new Error(`exercice ${exIndex + 1} incomplet dans ${session.title}`);
      if (ids.has(ex.id)) throw new Error(`identifiant dupliqué : ${ex.id}`);
      ids.add(ex.id);
      ex.sets.forEach((s, setIndex) => {
        if (typeof s.reps !== "number") throw new Error(`répétitions invalides, ${session.title} / ${ex.name} / série ${setIndex + 1}`);
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
      state = parsed;
      currentSessionId = state.week.sessions[0]?.id || null;
      saveState();
      hydrateReview();
      renderWeek();
      renderSession(currentSessionId);
      toast("Sauvegarde restaurée");
    } catch (error) {
      toast(`Restauration impossible : ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function prescriptionText(sets) {
  if (!sets?.length) return "Aucune série";
  const groups = [];
  sets.forEach(s => {
    const key = `${s.weight_kg ?? "PDC"}|${s.reps}|${s.target_rpe_min}-${s.target_rpe_max}`;
    const previous = groups[groups.length - 1];
    if (previous?.key === key) previous.count += 1;
    else groups.push({ key, count: 1, set: s });
  });
  return groups.map(group => `${group.count}×${group.set.reps} @ ${formatWeight(group.set.weight_kg)} · RPE ${group.set.target_rpe_min}-${group.set.target_rpe_max}`).join(" puis ");
}

function formatWeight(value) {
  return value === null || value === "" || typeof value === "undefined" ? "PDC" : `${value} kg`;
}

function labelFor(options, value) {
  return options.find(([key]) => key === value)?.[1] || value || "À faire";
}

function numberOrBlank(value) {
  if (value === "" || value === null || typeof value === "undefined") return "";
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : "";
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function todayKey() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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
  toast.timer = setTimeout(() => element.classList.remove("show"), 2600);
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
  const handler = event => {
    dialog.removeEventListener("close", handler);
    if (dialog.returnValue === "confirm") onConfirm();
  };
  dialog.addEventListener("close", handler);
  dialog.showModal();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.warn));
  }
}

init();
