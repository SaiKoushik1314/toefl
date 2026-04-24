/* =============================================
   TOEFL Prep Hub – Mock Test JS
   Orchestrates Reading → Ad → Writing → Results
   ============================================= */

   const SECTIONS = [
    { name: 'Reading', icon: '📖', label: 'Section 1 – Reading', tasks: [
      { file: 'data/reading/q1.json', type: 'reading' },
      { file: 'data/reading/q2.json', type: 'reading' },
      { file: 'data/reading/q3.json', type: 'reading' }
    ]},
    { name: 'Writing', icon: '✍️', label: 'Section 2 – Writing', tasks: [
      { file: 'data/writing/q1.json', type: 'writing' },
      { file: 'data/writing/q2.json', type: 'writing' },
      { file: 'data/writing/q3.json', type: 'writing' }
    ]}
  ];
  
  let currentSection = 0;
  let allData = [];        // loaded JSON for all tasks
  let flatQuestions = [];  // flat list across all tasks in section
  let currentQ = 0;
  let answers = {};
  let timerInterval = null;
  let timeLeft = 0;
  let sectionScores = [];
  
  // ---- AD ----
  function showVideoAd(cb) {
    const ov = document.getElementById('videoAd');
    ov.style.display = 'flex';
    ov._cb = cb;
    let s = 30;
    document.getElementById('adCountdown').textContent = s;
    const skip = document.getElementById('skipBtn');
    skip.classList.remove('visible');
    const t = setInterval(() => {
      s--;
      document.getElementById('adCountdown').textContent = s;
      if (s <= 5) skip.classList.add('visible');
      if (s <= 0) { clearInterval(t); closeAd(); }
    }, 1000);
    ov._t = t;
  }
  function closeAd() {
    const ov = document.getElementById('videoAd');
    clearInterval(ov._t);
    ov.style.display = 'none';
    if (typeof ov._cb === 'function') ov._cb();
  }
  
  // ---- START MOCK ----
  async function startMock() {
    document.getElementById('mockIntro').style.display = 'none';
    document.getElementById('testArea').style.display = 'block';
    await loadSection(0);
  }
  
  async function loadSection(idx) {
    currentSection = idx;
    const sec = SECTIONS[idx];
    document.getElementById('sectionLabel').textContent = sec.label;
    answers = {};
    currentQ = 0;
  
    // Load all task JSON files for this section
    allData = await Promise.all(sec.tasks.map(t => fetch(t.file).then(r => r.json())));
  
    // Build flat question list
    flatQuestions = [];
    let totalTime = 0;
    allData.forEach((data, di) => {
      totalTime += data.timeSeconds || 600;
      const type = data.taskType;
      if (type === 'complete-the-words') {
        data.passages.forEach((p, pi) => flatQuestions.push({ kind: 'cloze', data, passage: p, passageIdx: pi, taskIdx: di }));
      } else if (type === 'reading-daily-life' || type === 'academic-reading') {
        data.passages.forEach((p) => p.questions.forEach((q, qi) => flatQuestions.push({ kind: 'mcq', data, passage: p, question: q, qIdx: qi, taskIdx: di })));
      } else if (type === 'build-a-sentence') {
        data.questions.forEach((q, qi) => flatQuestions.push({ kind: 'bas', data, question: q, qIdx: qi, taskIdx: di }));
      } else if (type === 'write-email') {
        data.prompts.forEach((p, pi) => flatQuestions.push({ kind: 'email', data, prompt: p, promptIdx: pi, taskIdx: di }));
      } else if (type === 'academic-discussion') {
        data.prompts.forEach((p, pi) => flatQuestions.push({ kind: 'discussion', data, prompt: p, promptIdx: pi, taskIdx: di }));
      }
    });
  
    timeLeft = totalTime;
    startTimer();
    renderQ();
  }
  
  // ---- RENDER ----
  function renderQ() {
    const area = document.getElementById('testQuestionArea');
    const total = flatQuestions.length;
    const q = flatQuestions[currentQ];
  
    document.getElementById('testHeading').textContent = q.data.taskTitle;
    document.getElementById('testProgress').textContent = `Question ${currentQ + 1} of ${total}`;
    document.getElementById('testProgressFill').style.width = `${(currentQ / total) * 100}%`;
    document.getElementById('testPrevBtn').style.display = currentQ > 0 ? 'inline-flex' : 'none';
    document.getElementById('testNextBtn').style.display = currentQ < total - 1 ? 'inline-flex' : 'none';
    document.getElementById('testSubmitBtn').style.display = currentQ === total - 1 ? 'inline-flex' : 'none';
  
    area.innerHTML = '';
  
    if (q.kind === 'cloze') renderCloze(area, q);
    else if (q.kind === 'mcq') renderMCQ(area, q);
    else if (q.kind === 'bas') renderBAS(area, q);
    else if (q.kind === 'email') renderEmail(area, q);
    else if (q.kind === 'discussion') renderDiscussion(area, q);
  }
  
  // ---- CLOZE ----
  function renderCloze(area, item) {
    const p = item.passage;
    area.innerHTML = `
      <div class="question-card">
        <div class="question-number">${item.passageIdx + 1}</div>
        <p style="margin-bottom:16px; font-weight:600;">Fill in the missing letters to complete each word.</p>
        <div class="cloze-text" id="clozeText"></div>
        <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="checkCloze_mock('${item.passageIdx}-${item.taskIdx}')">Check</button>
        <div class="feedback-panel" id="clozeFB"></div>
      </div>
    `;
    const ct = document.getElementById('clozeText');
    let html = '';
    p.segments.forEach((seg, i) => {
      html += seg.before;
      if (seg.word) {
        html += `<strong>${seg.hint}</strong><input class="cloze-input" id="ci-${i}" data-answer="${seg.word.slice(seg.hint.length)}" style="width:${Math.max(60,seg.word.length*14)}px" autocomplete="off" autocorrect="off" spellcheck="false"/>`;
      }
    });
    ct.innerHTML = html;
  }
  
  function checkCloze_mock(key) {
    const inputs = document.querySelectorAll('[id^="ci-"]');
    let correct = 0;
    inputs.forEach(inp => {
      inp.classList.remove('correct-ans','wrong-ans');
      if (inp.value.trim().toLowerCase() === inp.dataset.answer.toLowerCase()) { inp.classList.add('correct-ans'); correct++; }
      else inp.classList.add('wrong-ans');
    });
    const fb = document.getElementById('clozeFB');
    fb.className = `feedback-panel show ${correct >= inputs.length * 0.7 ? 'correct' : 'partial'}`;
    fb.innerHTML = `<h4>Score: ${correct}/${inputs.length}</h4>`;
    answers[key] = { correct, total: inputs.length };
  }
  
  // ---- MCQ ----
  function renderMCQ(area, item) {
    const q = item.question;
    const p = item.passage;
    const saved = answers[q.id];
    const isFirst = item.qIdx === 0;
  
    let passHTML = '';
    if (isFirst) {
      const lbl = p.label || p.title || 'Passage';
      passHTML = `<div class="passage-box"><h4>📄 ${lbl}</h4><div style="white-space:pre-line;font-size:0.95rem;">${p.text}</div></div>`;
    }
  
    area.innerHTML = `
      ${passHTML}
      <div class="question-card">
        <div class="question-number">Q${item.qIdx + 1}</div>
        <div class="question-text">${q.text}</div>
        <ul class="options-list">
          ${q.options.map((o, i) => {
            let cls = saved !== undefined ? (i === q.answer ? 'correct' : (i === saved ? 'incorrect' : '')) : (saved === i ? 'selected' : '');
            return `<li class="option-item ${cls}" onclick="pickMCQ('${q.id}', ${i}, ${q.answer})" id="mopt-${q.id}-${i}">
              <span class="option-letter">${String.fromCharCode(65+i)}</span><span>${o}</span>
            </li>`;
          }).join('')}
        </ul>
        ${saved !== undefined ? `<div class="feedback-panel show ${saved === q.answer ? 'correct' : 'incorrect'}"><h4>${saved === q.answer ? '✅ Correct' : '❌ Incorrect'}</h4><p>${q.explanation}</p></div>` : '<div class="feedback-panel" id="mcqFB"></div>'}
      </div>
    `;
  }
  
  function pickMCQ(id, sel, ans) {
    if (answers[id] !== undefined) return;
    answers[id] = sel;
    document.querySelectorAll(`[id^="mopt-${id}-"]`).forEach((el, i) => {
      el.onclick = null;
      if (i === ans) el.classList.add('correct');
      else if (i === sel) el.classList.add('incorrect');
    });
    const fb = document.getElementById('mcqFB');
    if (fb) {
      const q = flatQuestions[currentQ].question;
      fb.className = `feedback-panel show ${sel === ans ? 'correct' : 'incorrect'}`;
      fb.innerHTML = `<h4>${sel === ans ? '✅ Correct' : '❌ Incorrect'}</h4><p>${q.explanation}</p>`;
    }
  }
  
  // ---- BUILD A SENTENCE (simplified click-to-move for mock) ----
  function renderBAS(area, item) {
    const q = item.question;
    const shuffled = shuffle([...q.words]);
    area.innerHTML = `
      <div class="question-card">
        <div class="question-number">${item.qIdx + 1}</div>
        <div class="sentence-context">${q.context}</div>
        <p class="question-text">${q.prompt}</p>
        ${q.fixedStart ? `<p style="margin-bottom:8px;"><strong>${q.fixedStart}</strong></p>` : ''}
        <div class="drop-zone" id="dz-mock" style="min-height:50px;"></div>
        ${q.fixedEnd ? `<p><strong>${q.fixedEnd}</strong></p>` : ''}
        <p style="font-size:0.83rem; color:var(--text-muted); margin:10px 0 6px;">Click words to place them:</p>
        <div class="word-bank" id="wb-mock"></div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="checkBAS_mock(${item.qIdx})">Check</button>
          <button class="btn btn-secondary btn-sm" onclick="clearBAS_mock()">Clear</button>
        </div>
        <div class="feedback-panel" id="basFB"></div>
      </div>
    `;
    const bank = document.getElementById('wb-mock');
    shuffled.forEach(w => {
      const span = document.createElement('span');
      span.className = 'word-chip';
      span.textContent = w;
      span.onclick = () => {
        const dz = document.getElementById('dz-mock');
        const hint = dz.querySelector('#dz-hint');
        if (hint) hint.remove();
        if (span.parentElement === bank) dz.appendChild(span);
        else bank.appendChild(span);
      };
      bank.appendChild(span);
    });
    const dz = document.getElementById('dz-mock');
    dz.innerHTML = '<span id="dz-hint" style="color:var(--text-light);font-size:0.85rem;">Click words above to place them here...</span>';
  }
  
  function checkBAS_mock(qi) {
    const q = flatQuestions[currentQ].question;
    const placed = [...document.getElementById('dz-mock').querySelectorAll('.word-chip')].map(c => c.textContent);
    const correct = JSON.stringify(placed) === JSON.stringify(q.answer);
    answers[`bas-${qi}`] = { correct };
    const fb = document.getElementById('basFB');
    fb.className = `feedback-panel show ${correct ? 'correct' : 'incorrect'}`;
    fb.innerHTML = correct
      ? `<h4>✅ Correct!</h4><p>${q.fullSentence}</p>`
      : `<h4>❌ Not quite.</h4><p>Correct: <strong>${q.fullSentence}</strong></p>`;
  }
  
  function clearBAS_mock() {
    const dz = document.getElementById('dz-mock');
    const bank = document.getElementById('wb-mock');
    [...dz.querySelectorAll('.word-chip')].forEach(c => bank.appendChild(c));
    dz.innerHTML = '<span id="dz-hint" style="color:var(--text-light);font-size:0.85rem;">Click words above to place them here...</span>';
  }
  
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // ---- EMAIL ----
  function renderEmail(area, item) {
    const p = item.prompt;
    area.innerHTML = `
      <div class="question-card">
        <div class="question-number">${item.promptIdx + 1}</div>
        <h3 style="margin-bottom:12px;">📧 Write an Email</h3>
        <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:18px;margin-bottom:14px;font-size:0.92rem;line-height:1.7;">${p.scenario}</div>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;">
          <strong style="color:var(--accent);">Include all three:</strong>
          <ol style="padding-left:18px;margin-top:6px;">${p.requiredPoints.map(r => `<li style="margin-bottom:4px;font-size:0.88rem;">${r}</li>`).join('')}</ol>
        </div>
        <textarea class="writing-area" id="emailTA" placeholder="Dear ${p.recipient},&#10;&#10;..." style="min-height:180px;">${answers['email-'+item.promptIdx]||''}</textarea>
        <div class="word-count-bar"><span>Words: <span class="word-count-num" id="emailWC">0</span></span><span>Target: 130–140</span></div>
      </div>
    `;
    const ta = document.getElementById('emailTA');
    const wc = document.getElementById('emailWC');
    ta.addEventListener('input', () => {
      const w = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = w;
      answers['email-'+item.promptIdx] = ta.value;
    });
  }
  
  // ---- DISCUSSION ----
  function renderDiscussion(area, item) {
    const p = item.prompt;
    area.innerHTML = `
      <div class="question-card">
        <div class="question-number">${item.promptIdx + 1}</div>
        <h3 style="margin-bottom:12px;">💬 Academic Discussion</h3>
        <div style="background:#f8faff;border:1px solid #ddd6fe;border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;">
          <strong style="color:var(--primary);">Professor ${p.professor.name}:</strong>
          <p style="margin-top:8px;font-size:0.92rem;line-height:1.7;">${p.professor.question}</p>
        </div>
        ${p.students.map(s => `<div style="background:var(--surface2);border-left:3px solid var(--primary-light);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;">
          <strong style="color:var(--primary);">${s.name}:</strong>
          <p style="margin-top:6px;font-size:0.88rem;line-height:1.65;">${s.response}</p>
        </div>`).join('')}
        <textarea class="writing-area" id="discussTA" placeholder="Write your response..." style="min-height:160px;margin-top:12px;">${answers['disc-'+item.promptIdx]||''}</textarea>
        <div class="word-count-bar"><span>Words: <span class="word-count-num" id="discWC">0</span></span><span>Target: 120+</span></div>
      </div>
    `;
    const ta = document.getElementById('discussTA');
    const wc = document.getElementById('discWC');
    ta.addEventListener('input', () => {
      const w = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = w;
      answers['disc-'+item.promptIdx] = ta.value;
    });
  }
  
  // ---- NAV ----
  function testNext() { if (currentQ < flatQuestions.length - 1) { currentQ++; renderQ(); window.scrollTo(0,0); } }
  function testPrev() { if (currentQ > 0) { currentQ--; renderQ(); window.scrollTo(0,0); } }
  
  // ---- SUBMIT SECTION ----
  function submitSection() {
    stopTimer();
    // Calculate score for this section
    let correct = 0, total = 0;
    flatQuestions.forEach((q, i) => {
      if (q.kind === 'mcq') {
        total++;
        if (answers[q.question.id] === q.question.answer) correct++;
      } else if (q.kind === 'bas') {
        total++;
        if (answers[`bas-${q.qIdx}`]?.correct) correct++;
      } else if (q.kind === 'cloze') {
        const key = `${q.passageIdx}-${q.taskIdx}`;
        if (answers[key]) { total += answers[key].total; correct += answers[key].correct; }
      }
    });
    sectionScores.push({ section: SECTIONS[currentSection].name, correct, total });
  
    // Show transition
    document.getElementById('testArea').style.display = 'none';
    const trans = document.getElementById('transitionArea');
    trans.style.display = 'block';
    const hasNext = currentSection < SECTIONS.length - 1;
  
    document.getElementById('transIcon').textContent = hasNext ? '📺' : '🎉';
    document.getElementById('transTitle').textContent = hasNext ? `${SECTIONS[currentSection].name} Section Done!` : 'Test Complete!';
    document.getElementById('transMsg').textContent = hasNext
      ? `Great work! A short ad break is coming, then you'll move on to the ${SECTIONS[currentSection + 1].name} section.`
      : 'You have completed both sections. View your results below.';
    document.getElementById('transContinueBtn').textContent = hasNext ? 'Continue After Ad →' : 'See Full Results →';
  }
  
  function continueToNext() {
    document.getElementById('transitionArea').style.display = 'none';
    const hasNext = currentSection < SECTIONS.length - 1;
    if (hasNext) {
      showVideoAd(async () => {
        document.getElementById('testArea').style.display = 'block';
        await loadSection(currentSection + 1);
      });
    } else {
      showFinalResults();
    }
  }
  
  // ---- FINAL RESULTS ----
  function showFinalResults() {
    const el = document.getElementById('finalResults');
    el.style.display = 'block';
  
    const totalC = sectionScores.reduce((a, s) => a + s.correct, 0);
    const totalT = sectionScores.reduce((a, s) => a + s.total, 0);
    const overall = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  
    el.innerHTML = `
      <div class="score-summary" style="margin-bottom:24px;">
        <h2>🎉 Mock Test Complete!</h2>
        <div class="score-circle" style="background: conic-gradient(var(--primary) ${overall}%, var(--surface2) 0%);">
          <div class="score-inner">
            <span class="score-num">${overall}%</span>
            <span class="score-label">Overall</span>
          </div>
        </div>
        <p style="color:var(--text-muted); margin-bottom:20px;">You answered <strong>${totalC}/${totalT}</strong> scored questions correctly.</p>
      </div>
      ${sectionScores.map(s => `
        <div class="card" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">${s.section === 'Reading' ? '📖' : '✍️'} ${s.section} Section</h3>
          <div class="progress-bar-wrap" style="margin-bottom:8px;">
            <div class="progress-bar-fill" style="width:${s.total > 0 ? Math.round((s.correct/s.total)*100) : 0}%"></div>
          </div>
          <p style="color:var(--text-muted); font-size:0.9rem;">${s.correct} / ${s.total} correct (${s.total > 0 ? Math.round((s.correct/s.total)*100) : 0}%)</p>
        </div>
      `).join('')}
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:24px;">
        <button class="btn btn-primary" onclick="location.reload()">Retake Mock Test</button>
        <a href="reading.html" class="btn btn-secondary">📖 Practice Reading</a>
        <a href="writing.html" class="btn btn-secondary">✍️ Practice Writing</a>
      </div>
      <p style="text-align:center; margin-top:20px; font-size:0.8rem; color:var(--text-muted);">⚠️ This score is for practice only and does not reflect your official TOEFL iBT score.</p>
    `;
  }
  
  // ---- TIMER ----
  function startTimer() {
    updateTimer();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) { stopTimer(); submitSection(); }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerInterval); }
  function updateTimer() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const el = document.getElementById('testTimer');
    if (!el) return;
    el.textContent = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.className = 'timer-display' + (timeLeft < 60 ? ' danger' : timeLeft < 180 ? ' warning' : '');
  }