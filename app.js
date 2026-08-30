const STATUS_KEY = "cisa-flashcards-statuses";
const STAR_KEY = "cisa-flashcards-stars";

const statusLabels = {
  new: "Not studied",
  learning: "Still learning",
  known: "Mastered",
};

const state = {
  words: [],
  filtered: [],
  currentIndex: 0,
  statuses: {},
  starredIds: new Set(),
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  voiceIndex: 0,
  voices: [],
};

const els = {
  backBtn: document.getElementById("backBtn"),
  topTermCount: document.getElementById("topTermCount"),
  termCount: document.getElementById("termCount"),
  shuffleTopBtn: document.getElementById("shuffleTopBtn"),
  searchInput: document.getElementById("searchInput"),
  sourceFilter: document.getElementById("sourceFilter"),
  statusFilter: document.getElementById("statusFilter"),
  modeCards: document.querySelectorAll(".mode-card"),
  quizPanel: document.getElementById("quizPanel"),
  emptyState: document.getElementById("emptyState"),
  flashcard: document.getElementById("flashcard"),
  cardPosition: document.getElementById("cardPosition"),
  cardStatus: document.getElementById("cardStatus"),
  cardSpeakBtn: document.getElementById("cardSpeakBtn"),
  voiceLabel: document.getElementById("voiceLabel"),
  cardWord: document.getElementById("cardWord"),
  cardSimple: document.getElementById("cardSimple"),
  cardArabic: document.getElementById("cardArabic"),
  cardExample: document.getElementById("cardExample"),
  cardDots: document.getElementById("cardDots"),
  prevBtn: document.getElementById("prevBtn"),
  flipBtn: document.getElementById("flipBtn"),
  nextBtn: document.getElementById("nextBtn"),
  notStudiedBtn: document.getElementById("notStudiedBtn"),
  learningBtn: document.getElementById("learningBtn"),
  masteredBtn: document.getElementById("masteredBtn"),
  notStudiedCount: document.getElementById("notStudiedCount"),
  learningCount: document.getElementById("learningCount"),
  masteredCount: document.getElementById("masteredCount"),
  progressCards: document.querySelectorAll(".progress-card"),
  quizProgress: document.getElementById("quizProgress"),
  quizScore: document.getElementById("quizScore"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizOptions: document.getElementById("quizOptions"),
  quizFeedback: document.getElementById("quizFeedback"),
  nextQuizBtn: document.getElementById("nextQuizBtn"),
  wordsList: document.getElementById("wordsList"),
  exportBtn: document.getElementById("exportBtn"),
};

init();

async function init() {
  loadLocalState();
  bindEvents();
  refreshVoices();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  try {
    const response = await fetch("data/words.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load words.");
    }

    state.words = await response.json();
    populateSourceFilter();
    applyFilters();
  } catch (error) {
    showLoadError(error);
  }
}

function bindEvents() {
  els.backBtn.addEventListener("click", () => {
    state.currentIndex = 0;
    renderCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.searchInput.addEventListener("input", applyFilters);
  els.sourceFilter.addEventListener("change", applyFilters);
  els.statusFilter.addEventListener("change", applyFilters);
  els.shuffleTopBtn.addEventListener("click", shuffleCards);

  els.modeCards.forEach((card) => {
    card.addEventListener("click", () => switchMode(card.dataset.tab, card));
  });

  els.progressCards.forEach((card) => {
    card.addEventListener("click", () => {
      els.statusFilter.value = card.dataset.statusFilter;
      applyFilters();
      document.querySelector(".terms-section").scrollIntoView({ behavior: "smooth" });
    });
  });

  els.flashcard.addEventListener("click", flipCard);
  els.flashcard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard();
    }
  });

  els.flipBtn.addEventListener("click", flipCard);
  els.cardSpeakBtn.addEventListener("click", speakCurrentWord);
  els.prevBtn.addEventListener("click", previousCard);
  els.nextBtn.addEventListener("click", nextCard);
  els.notStudiedBtn.addEventListener("click", () => setCurrentStatus("new"));
  els.learningBtn.addEventListener("click", () => setCurrentStatus("learning"));
  els.masteredBtn.addEventListener("click", () => setCurrentStatus("known"));
  els.nextQuizBtn.addEventListener("click", nextQuizQuestion);
  els.exportBtn.addEventListener("click", exportCsv);
}

function loadLocalState() {
  try {
    state.statuses = JSON.parse(localStorage.getItem(STATUS_KEY) || "{}");
  } catch {
    state.statuses = {};
  }

  try {
    state.starredIds = new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]"));
  } catch {
    state.starredIds = new Set();
  }
}

function saveLocalState() {
  localStorage.setItem(STATUS_KEY, JSON.stringify(state.statuses));
  localStorage.setItem(STAR_KEY, JSON.stringify([...state.starredIds]));
}

function populateSourceFilter() {
  const sources = [...new Set(state.words.map((word) => word.source))].sort();
  els.sourceFilter.innerHTML = '<option value="all">All sources</option>';

  sources.forEach((source) => {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source;
    els.sourceFilter.appendChild(option);
  });
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  const source = els.sourceFilter.value;
  const status = els.statusFilter.value;

  state.filtered = state.words.filter((word) => {
    const computedStatus = getStatus(word);
    const searchable = [
      word.word,
      word.arabic,
      word.simple,
      word.example,
      word.source,
      word.category,
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query))
      && (source === "all" || word.source === source)
      && (status === "all" || computedStatus === status);
  });

  state.currentIndex = Math.min(state.currentIndex, Math.max(state.filtered.length - 1, 0));
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;

  renderAll();
}

function renderAll() {
  const totalText = `${state.words.length} terms`;
  els.termCount.textContent = totalText;
  els.topTermCount.textContent = totalText;
  els.emptyState.hidden = state.filtered.length > 0;

  renderCard();
  renderProgress();
  renderQuiz();
  renderList();
}

function renderCard() {
  const word = state.filtered[state.currentIndex];
  const controls = [
    els.prevBtn,
    els.flipBtn,
    els.nextBtn,
    els.cardSpeakBtn,
    els.notStudiedBtn,
    els.learningBtn,
    els.masteredBtn,
    els.shuffleTopBtn,
  ];

  els.flashcard.classList.remove("flipped");
  controls.forEach((button) => {
    button.disabled = !word;
  });

  if (!word) {
    els.cardPosition.textContent = "0 / 0";
    els.cardStatus.textContent = "No terms";
    els.cardWord.textContent = "No terms";
    els.cardSimple.textContent = "Try changing your filters.";
    els.cardArabic.textContent = "لا توجد كلمات";
    els.cardExample.textContent = "";
    updateStatusButtons(null);
    updateVoiceLabel();
    renderDots();
    return;
  }

  els.cardPosition.textContent = `${state.currentIndex + 1} / ${state.filtered.length}`;
  els.cardStatus.textContent = statusLabels[getStatus(word)];
  els.cardWord.textContent = word.word;
  els.cardSimple.textContent = word.simple;
  els.cardArabic.textContent = word.arabic;
  els.cardExample.textContent = word.example;
  updateStatusButtons(word);
  updateVoiceLabel();
  renderDots();
}

function renderDots() {
  els.cardDots.innerHTML = "";
  const maxDots = Math.min(state.filtered.length, 12);

  for (let index = 0; index < maxDots; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `card-dot${index === state.currentIndex ? " active" : ""}`;
    dot.setAttribute("aria-label", `Go to card ${index + 1}`);
    dot.addEventListener("click", () => {
      state.currentIndex = index;
      renderCard();
    });
    els.cardDots.appendChild(dot);
  }
}

function renderProgress() {
  const counts = { new: 0, learning: 0, known: 0 };

  state.words.forEach((word) => {
    counts[getStatus(word)] += 1;
  });

  els.notStudiedCount.textContent = counts.new;
  els.learningCount.textContent = counts.learning;
  els.masteredCount.textContent = counts.known;
}

function renderQuiz() {
  const word = state.filtered[state.quizIndex];
  els.quizOptions.innerHTML = "";
  els.quizFeedback.textContent = "";
  els.nextQuizBtn.disabled = !word;

  if (!word) {
    els.quizProgress.textContent = "Question 0 / 0";
    els.quizScore.textContent = "Score 0";
    els.quizQuestion.textContent = "No quiz questions available.";
    return;
  }

  els.quizProgress.textContent = `Question ${state.quizIndex + 1} / ${state.filtered.length}`;
  els.quizScore.textContent = `Score ${state.quizScore}`;
  els.quizQuestion.textContent = `What is the definition of "${word.word}"?`;

  buildQuizOptions(word).forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.simple;
    button.addEventListener("click", () => answerQuiz(button, option.id === word.id, word));
    els.quizOptions.appendChild(button);
  });
}

function renderList() {
  els.wordsList.innerHTML = "";

  state.filtered.forEach((word, index) => {
    const card = document.createElement("article");
    card.className = "term-card";

    const content = document.createElement("button");
    content.className = "term-content";
    content.type = "button";
    content.innerHTML = `
      <h3>${escapeHtml(word.word)}</h3>
      <p class="term-arabic" dir="rtl">${escapeHtml(word.arabic)}</p>
      <p class="term-simple">${escapeHtml(word.simple)}</p>
      <p class="term-source">${escapeHtml(word.source)} · ${escapeHtml(statusLabels[getStatus(word)])}</p>
    `;
    content.addEventListener("click", () => selectWord(index));

    const actions = document.createElement("div");
    actions.className = "term-actions";

    const speak = document.createElement("button");
    speak.className = "term-action";
    speak.type = "button";
    speak.innerHTML = '<span class="speak-icon" aria-hidden="true"><span></span></span>';
    speak.setAttribute("aria-label", `Pronounce ${word.word}`);
    speak.addEventListener("click", () => speakWord(word.word));

    const star = document.createElement("button");
    star.className = `term-action${state.starredIds.has(word.id) ? " starred" : ""}`;
    star.type = "button";
    star.textContent = "☆";
    star.setAttribute("aria-label", `Star ${word.word}`);
    star.addEventListener("click", () => toggleStar(word.id));

    actions.append(speak, star);
    card.append(content, actions);
    els.wordsList.appendChild(card);
  });
}

function switchMode(mode, selectedCard) {
  els.modeCards.forEach((card) => card.classList.toggle("active", card === selectedCard));
  els.quizPanel.hidden = mode !== "quiz";

  if (mode === "cards") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    els.quizPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function flipCard() {
  if (state.filtered.length === 0) return;
  els.flashcard.classList.toggle("flipped");
}

function previousCard() {
  if (state.filtered.length === 0) return;
  state.currentIndex = (state.currentIndex - 1 + state.filtered.length) % state.filtered.length;
  renderCard();
}

function nextCard() {
  if (state.filtered.length === 0) return;
  state.currentIndex = (state.currentIndex + 1) % state.filtered.length;
  renderCard();
}

function shuffleCards() {
  for (let index = state.filtered.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [state.filtered[index], state.filtered[randomIndex]] = [state.filtered[randomIndex], state.filtered[index]];
  }

  state.currentIndex = 0;
  state.quizIndex = 0;
  state.quizAnswered = false;
  renderAll();
}

function setCurrentStatus(status) {
  const word = state.filtered[state.currentIndex];
  if (!word) return;

  setStatus(word.id, status);
  renderAll();
}

function updateStatusButtons(word) {
  const buttons = [
    [els.notStudiedBtn, "new"],
    [els.learningBtn, "learning"],
    [els.masteredBtn, "known"],
  ];
  const currentStatus = word ? getStatus(word) : "";

  buttons.forEach(([button, status]) => {
    button.classList.toggle("active", status === currentStatus);
  });
}

function setStatus(id, status) {
  state.statuses[id] = status;
  saveLocalState();
}

function getStatus(word) {
  return state.statuses[word.id] || word.status || "new";
}

function buildQuizOptions(correctWord) {
  const choices = state.words
    .filter((word) => word.id !== correctWord.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return [correctWord, ...choices].sort(() => Math.random() - 0.5);
}

function answerQuiz(button, isCorrect, correctWord) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  [...els.quizOptions.children].forEach((optionButton) => {
    optionButton.disabled = true;
    if (optionButton.textContent === correctWord.simple) {
      optionButton.classList.add("correct");
    }
  });

  if (isCorrect) {
    state.quizScore += 1;
    setStatus(correctWord.id, "known");
    button.classList.add("correct");
    els.quizFeedback.textContent = "Correct. Marked as mastered.";
  } else {
    setStatus(correctWord.id, "learning");
    button.classList.add("wrong");
    els.quizFeedback.textContent = `Correct answer: ${correctWord.simple}`;
  }

  els.quizScore.textContent = `Score ${state.quizScore}`;
  renderProgress();
  renderList();
}

function nextQuizQuestion() {
  if (state.filtered.length === 0) return;
  state.quizIndex = (state.quizIndex + 1) % state.filtered.length;
  state.quizAnswered = false;
  renderQuiz();
}

function selectWord(index) {
  state.currentIndex = index;
  renderCard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function speakCurrentWord() {
  const word = state.filtered[state.currentIndex];
  if (!word) return;

  speakWord(word.word);
}

function refreshVoices() {
  if (!("speechSynthesis" in window)) {
    state.voices = [];
    updateVoiceLabel();
    return;
  }

  state.voices = window.speechSynthesis
    .getVoices()
    .filter((voice) => /^en[-_]/i.test(voice.lang))
    .slice(0, 5);
  updateVoiceLabel();
}

function updateVoiceLabel() {
  if (!els.voiceLabel) return;

  const count = state.voices.length;
  els.voiceLabel.textContent = count > 1
    ? `Listen ${(state.voiceIndex % count) + 1}/${count}`
    : "Listen";
}

function speakWord(word) {
  if (!("speechSynthesis" in window)) return;

  if (state.voices.length === 0) {
    refreshVoices();
  }

  const voices = state.voices;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.88;

  if (voices.length > 0) {
    utterance.voice = voices[state.voiceIndex % voices.length];
    state.voiceIndex = (state.voiceIndex + 1) % voices.length;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  updateVoiceLabel();
}

function toggleStar(id) {
  if (state.starredIds.has(id)) {
    state.starredIds.delete(id);
  } else {
    state.starredIds.add(id);
  }

  saveLocalState();
  renderList();
}

function exportCsv() {
  const headers = ["id", "word", "arabic", "simple", "example", "source", "category", "status"];
  const rows = state.filtered.map((word) => [
    word.id,
    word.word,
    word.arabic,
    word.simple,
    word.example,
    word.source,
    word.category,
    getStatus(word),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cisa-words.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showLoadError(error) {
  els.cardPosition.textContent = "0 / 0";
  els.cardStatus.textContent = "No terms";
  els.cardWord.textContent = "Could not load terms";
  els.cardSimple.textContent = error.message;
  els.cardArabic.textContent = "تعذر تحميل الكلمات";
  els.cardExample.textContent = "";
  els.emptyState.hidden = false;
  els.emptyState.textContent = "Make sure data/words.json exists next to these files.";
}
