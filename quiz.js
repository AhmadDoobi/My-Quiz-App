// quiz.js
// UI elements
const home         = document.getElementById('home');
const selector     = document.getElementById('selector');
const quizPage     = document.getElementById('quiz');
const chapterList  = document.getElementById('chapter-list');
const startBtn     = document.getElementById('start-quiz');
const form         = document.getElementById('quiz-form');
const nextBtn      = document.getElementById('next-btn');
const restartBtn   = document.getElementById('restart-btn');
const showWrongs   = document.getElementById('show-wrongs');
const progress     = document.getElementById('progress');
const selectorTitle= document.getElementById('selector-title');

let allChapters   = [];   // from chapters.json
let selectedFiles = [];   // files picked by user
let quizData      = [];   // current batch of questions
let wrongQs       = [];   // questions answered incorrectly
let current       = 0;    // index of current question

// Load chapters.json on startup
fetch('chapters.json')
  .then(r => r.json())
  .then(data => allChapters = data)
  .catch(console.error);

// Helper to switch views
function show(view) {
  [home, selector, quizPage].forEach(el => el.classList.add('hidden'));
  view.classList.remove('hidden');
}

// “Back to Home” buttons
document.querySelectorAll('.back-btn')
  .forEach(btn => btn.addEventListener('click', () => show(home)));

// Home screen buttons
document.getElementById('single-chapter-btn')
  .onclick = () => enterSelector(false);
document.getElementById('multi-chapter-btn')
  .onclick = () => enterSelector(true);

// CHAPTER SELECTION SCREEN
function enterSelector(multi) {
  show(selector);
  selectorTitle.textContent = multi
    ? 'Choose Chapters (multiple)'
    : 'Choose One Chapter';
  chapterList.innerHTML = '';
  allChapters.forEach(ch => {
    const lbl = document.createElement('label');
    const inp = document.createElement('input');
    inp.type  = multi ? 'checkbox' : 'radio';
    inp.name  = 'chap';
    inp.value = ch.file;
    lbl.appendChild(inp);
    lbl.append(` ${ch.title}`);
    chapterList.appendChild(lbl);
  });
  startBtn.disabled = true;

  chapterList.onchange = () => {
    const chosen = Array.from(
      chapterList.querySelectorAll('input:checked')
    ).map(i => i.value);
    if ((!multi && chosen.length === 1) || (multi && chosen.length >= 1)) {
      selectedFiles = chosen;
      startBtn.disabled = false;
    } else {
      startBtn.disabled = true;
    }
  };

  startBtn.onclick = () => loadQuiz(selectedFiles);
}

// LOAD + NORMALIZE + SELECT QUESTIONS
async function loadQuiz(files) {
  // fetch & normalize each chapter into its own list
  const chapterPools = await Promise.all(files.map(async f => {
    const data = await fetch(f).then(r => r.json());
    return data.map(item => ({
      question:    item["the qustion"],
      allTexts:    ['a','b','c','d'].map(l => item[l] || ''),
      correctText: item[item.correct],
      explanation: item.explanation || ''
    }));
  }));

  quizData = [];
  if (files.length === 1) {
    // single chapter → 30 random questions
    const pool = shuffle(chapterPools[0]);
    quizData = pool.slice(0, 30);
  } else {
    // multiple chapters → 60 questions equally divided
    const total = 60;
    const perChap = Math.floor(total / files.length);
    chapterPools.forEach(pool => {
      const sel = shuffle(pool).slice(0, perChap);
      quizData = quizData.concat(sel);
    });
    // if any remainder (due to non-divisible), fill from first pool
    const remainder = total - quizData.length;
    if (remainder > 0) {
      const extra = shuffle(chapterPools[0]).slice(perChap, perChap + remainder);
      quizData = quizData.concat(extra);
    }
    quizData = shuffle(quizData);
  }

  wrongQs = [];
  current = 0;
  renderQuestion();
  show(quizPage);
}

// RENDER ONE QUESTION & ANSWERS
function renderQuestion() {
  form.innerHTML = '';
  nextBtn.disabled = true;
  progress.textContent = `${current + 1} / ${quizData.length}`;

  const q  = quizData[current];
  const fs = document.createElement('fieldset');
  const lg = document.createElement('legend');
  lg.textContent = q.question;
  fs.appendChild(lg);

  // Build options differently for True/False vs. multiple-choice
  let options;
  const texts = q.allTexts.map(txt => txt.trim());
  if (texts[0] && texts[1] && !texts[2] && !texts[3]) {
    // True/False
    options = [
      { letter:'a', text:texts[0], isCorrect:texts[0]===q.correctText },
      { letter:'b', text:texts[1], isCorrect:texts[1]===q.correctText }
    ];
  } else {
    // Multiple-choice: shuffle texts but keep letters in order
    const shuffledTexts = shuffle([...q.allTexts]);
    const letters = ['a','b','c','d'];
    options = shuffledTexts.map((txt,i) => ({
      letter:    letters[i],
      text:      txt,
      isCorrect: txt === q.correctText
    }));
  }

  options.forEach(opt => {
    const lbl = document.createElement('label');
    const inp = document.createElement('input');
    inp.type  = 'radio';
    inp.name  = 'q';
    inp.value = opt.letter;
    lbl.appendChild(inp);
    lbl.append(` ${opt.letter.toUpperCase()}. ${opt.text}`);
    fs.appendChild(lbl);
  });

  form.appendChild(fs);

  fs.onclick = e => {
    if (e.target.tagName !== 'INPUT') return;
    const chosen = options.find(o => o.letter === e.target.value);
    if (chosen.isCorrect) {
      e.target.parentElement.classList.add('correct');
      if (q.explanation) {
        const ex = document.createElement('div');
        ex.classList.add('explanation');
        ex.textContent = q.explanation;
        fs.appendChild(ex);
      }
      nextBtn.disabled = false;
    } else {
      e.target.parentElement.classList.add('wrong');
      if (!wrongQs.includes(q)) wrongQs.push(q);
      e.target.disabled = true;
    }
  };
}

// CONTROLS
nextBtn.onclick = () => {
  current++;
  if (current < quizData.length) {
    renderQuestion();
  } else {
    alert(`Quiz finished! You missed ${wrongQs.length} question(s).`);
  }
};
restartBtn.onclick = () => loadQuiz(selectedFiles);
showWrongs.onclick = () => {
  if (wrongQs.length === 0) {
    alert("You didn't miss any questions!");
  } else {
    alert(
      'Questions you got wrong:\n\n' +
      wrongQs.map((w,i) => `${i+1}. ${w.question}`).join('\n\n')
    );
  }
};

// UTILITY: simple shuffle
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}