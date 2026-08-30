const STORAGE_KEY = "cisa-flashcards-known";

const state = {
  words: [],
  filtered: [],
  currentIndex: 0,
  knownIds: new Set(),
  activeTab: "cards",
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
};

const els = {
  knownCount: document.getElementById("knownCount"),
  searchInput: document.getElementById("searchInput"),
  sourceFilter: document.getElementById("sourceFilter"),
  statusFilter: document.getElementById("statusFilter"),
  tabs: document.querySelectorAll(".tab-button"),
  panels: {
    cards: document.getElementById("cardsPanel"),
    quiz: document.getElementById("quizPanel"),
    list: document.getElementById("listPanel"),
  },
  emptyState: document.getElementById("emptyState"),
  flashcard: document.getElementById("flashcard"),
  cardPosition: document.getElementById("cardPosition"),
  cardSource: document.getElementById("cardSource"),
  cardWord: document.getElementById("cardWord"),
  cardSimple: document.getElementById("cardSimple"),
  cardArabic: document.getElementById("cardArabic"),
  cardExample: document.getElementById("cardExample"),
  prevBtn: document.getElementById("prevBtn"),
  flipBtn: document.getElementById("flipBtn"),
  nextBtn: document.getElementById("nextBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  knownBtn: document.getElementById("knownBtn"),
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
  loadProgress();
  bindEvents();

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
  els.searchInput.addEventListener("input", applyFilters);
  els.sourceFilter.addEventListener("change", applyFilters);
  els.statusFilter.addEventListener("change", applyFilters);

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.flashcard.addEventListener("click", flipCard);
  els.flashcard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard();
    }
  });

  els.flipBtn.addEventListener("click", flipCard);
  els.prevBtn.addEventListener("click", previousCard);
  els.nextBtn.addEventListener("click", nextCard);
  els.shuffleBtn.addEventListener("click", shuffleCards);
  els.knownBtn.addEventListener("click", toggleKnownCurrent);
  els.nextQuizBtn.addEventListener("click", nextQuizQuestion);
  els.exportBtn.addEventListener("click", exportCsv);
}

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.knownIds = new Set(stored);
  } catch {
    state.knownIds = new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.knownIds]));
  els.knownCount.textContent = state.knownIds.size;
}

function populateSourceFilter() {
  const sources = [...new Set(state.words.map((word) => word.source))].sort();
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

  saveProgress();
  renderAll();
}

function renderAll() {
  const hasWords = state.filtered.length > 0;
  els.emptyState.hidden = hasWords;
  renderCard();
  renderQuiz();
  renderList();
}

function renderCard() {
  const word = state.filtered[state.currentIndex];
  const buttons = [els.prevBtn, els.flipBtn, els.nextBtn, els.shuffleBtn, els.knownBtn];

  els.flashcard.classList.remove("flipped");
  buttons.forEach((button) => {
    button.disabled = !word;
  });

  if (!word) {
    els.cardPosition.textContent = "0 / 0";
    els.cardSource.textContent = "No source";
    els.cardWord.textContent = "No words";
    els.cardSimple.textContent = "Try changing your filters.";
    els.cardArabic.textContent = "لا توجد كلمات";
    els.cardExample.textContent = "";
    return;
  }

  els.cardPosition.textContent = `${state.currentIndex + 1} / ${state.filtered.length}`;
  els.cardSource.textContent = word.source;
  els.cardWord.textContent = word.word;
  els.cardSimple.textContent = word.simple;
  els.cardArabic.textContent = word.arabic;
  els.cardExample.textContent = word.example;
  els.knownBtn.textContent = state.knownIds.has(word.id) ? "Mark New" : "Mark Known";
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
  els.quizQuestion.textContent = `What does "${word.word}" mean?`;

  const options = buildQuizOptions(word);
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.arabic;
    button.addEventListener("click", () => answerQuiz(button, option.id === word.id, word.arabic));
    els.quizOptions.appendChild(button);
  });
}

function renderList() {
  els.wordsList.innerHTML = "";

  state.filtered.forEach((word) => {
    const row = document.createElement("article");
    row.className = "word-row";

    const content = document.createElement("div");
    content.innerHTML = `
      <h3>${escapeHtml(word.word)}</h3>
      <p dir="rtl">${escapeHtml(word.arabic)}</p>
      <p>${escapeHtml(word.simple)} · ${escapeHtml(word.example)}</p>
      <div class="tag-row">
        <span class="tag">${escapeHtml(word.source)}</span>
        <span class="tag">${escapeHtml(word.category)}</span>
        <span class="tag">${escapeHtml(getStatus(word))}</span>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state.knownIds.has(word.id) ? "Mark New" : "Mark Known";
    button.addEventListener("click", () => {
      toggleKnown(word.id);
      renderAll();
    });

    row.append(content, button);
    els.wordsList.appendChild(row);
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  Object.entries(els.panels).forEach(([name, panel]) => {
    panel.classList.toggle("active", name === tabName);
  });
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
  renderAll();
}

function toggleKnownCurrent() {
  const word = state.filtered[state.currentIndex];
  if (!word) return;
  toggleKnown(word.id);
  renderAll();
}

function toggleKnown(id) {
  if (state.knownIds.has(id)) {
    state.knownIds.delete(id);
  } else {
    state.knownIds.add(id);
  }
  saveProgress();
}

function getStatus(word) {
  if (state.knownIds.has(word.id)) {
    return "known";
  }
  return word.status || "new";
}

function buildQuizOptions(correctWord) {
  const choices = state.words
    .filter((word) => word.id !== correctWord.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return [correctWord, ...choices].sort(() => Math.random() - 0.5);
}

function answerQuiz(button, isCorrect, correctArabic) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  [...els.quizOptions.children].forEach((optionButton) => {
    optionButton.disabled = true;
    if (optionButton.textContent === correctArabic) {
      optionButton.classList.add("correct");
    }
  });

  if (isCorrect) {
    state.quizScore += 1;
    button.classList.add("correct");
    els.quizFeedback.textContent = "Correct.";
  } else {
    button.classList.add("wrong");
    els.quizFeedback.textContent = `Not quite. Correct answer: ${correctArabic}`;
  }

  els.quizScore.textContent = `Score ${state.quizScore}`;
}

function nextQuizQuestion() {
  if (state.filtered.length === 0) return;
  state.quizIndex = (state.quizIndex + 1) % state.filtered.length;
  state.quizAnswered = false;
  renderQuiz();
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
  els.cardWord.textContent = "Could not load words";
  els.cardSimple.textContent = error.message;
  els.cardArabic.textContent = "تعذر تحميل الكلمات";
  els.quizQuestion.textContent = "Could not load quiz.";
  els.emptyState.hidden = false;
  els.emptyState.textContent = "Make sure data/words.json exists next to these files.";
}
