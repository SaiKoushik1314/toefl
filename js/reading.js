/* =============================================
   TOEFL Prep Hub – Reading Section JS
   ============================================= */

   let currentTask = null;
   let taskData = null;
   let questions = [];
   let currentQ = 0;
   let answers = {};
   let timerInterval = null;
   let timeLeft = 0;
   let totalCorrect = 0;
   let taskAnswered = false;
   
   const DATA_PATHS = {
     'complete-the-words': 'data/reading/q1.json',
     'reading-daily-life': 'data/reading/q2.json',
     'academic-reading': 'data/reading/q3.json'
   };
   
   // ---- AD MANAGEMENT ----
   function showVideoAd(onClose) {
     const overlay = document.getElementById('videoAd');
     overlay.style.display = 'flex';
     overlay._onClose = onClose;
     let secs = 30;
     document.getElementById('adCountdown').textContent = secs;
     const skipBtn = document.getElementById('skipBtn');
     skipBtn.classList.remove('visible');
     const t = setInterval(() => {
       secs--;
       document.getElementById('adCountdown').textContent = secs;
       if (secs <= 5) skipBtn.classList.add('visible');
       if (secs <= 0) { clearInterval(t); closeAd(); }
     }, 1000);
     overlay._timer = t;
   }
   
   function closeAd() {
     const overlay = document.getElementById('videoAd');
     clearInterval(overlay._timer);
     overlay.style.display = 'none';
     if (typeof overlay._onClose === 'function') overlay._onClose();
   }
   
   // ---- LOAD TASK ----
   async function loadTask(taskType) {
     currentTask = taskType;
     try {
       const res = await fetch(DATA_PATHS[taskType]);
       taskData = await res.json();
       showIntroModal(taskData);
     } catch (e) {
       alert('Could not load questions. Please make sure data files are in the /data/ directory.');
       console.error(e);
     }
   }
   
   function showIntroModal(data) {
     document.getElementById('modalBadge').textContent = data.taskTitle;
     document.getElementById('modalTitle').textContent = 'About: ' + data.taskTitle;
     document.getElementById('modalDesc').textContent = getTaskDescription(data.taskType);
   
     const expectList = document.getElementById('modalExpect');
     expectList.innerHTML = '';
     (data.whatToExpect || []).forEach(t => {
       const li = document.createElement('li');
       li.innerHTML = `<span class="check-icon">✓</span> ${t}`;
       li.style.cssText = 'display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';
       expectList.appendChild(li);
     });
   
     const tipsList = document.getElementById('modalTips');
     tipsList.innerHTML = '';
     (data.tips || []).forEach(t => {
       const li = document.createElement('li');
       li.textContent = t;
       tipsList.appendChild(li);
     });
   
     document.getElementById('introOverlay').style.display = 'flex';
   }
   
   function getTaskDescription(type) {
     const descs = {
       'complete-the-words': 'In this task, you will read academic paragraphs with some words partially hidden. Type the missing letters to complete each word. This tests your academic vocabulary knowledge.',
       'reading-daily-life': 'In this task, you will read everyday texts like emails, notices, and messages, then answer comprehension questions about them. These are shorter and more practical than academic reading.',
       'academic-reading': 'In this task, you will read 200-word academic passages and answer five questions covering factual information, vocabulary, rhetorical purpose, and the new paragraph relationship question type.'
     };
     return descs[type] || '';
   }
   
   function startTask() {
     document.getElementById('introOverlay').style.display = 'none';
     document.getElementById('taskSelection').style.display = 'none';
     document.getElementById('practiceArea').style.display = 'block';
   
     buildQuestions();
     currentQ = 0;
     answers = {};
     totalCorrect = 0;
     taskAnswered = false;
   
     document.getElementById('taskHeading').textContent = taskData.taskTitle;
     timeLeft = taskData.timeSeconds;
     startTimer();
     renderQuestion();
   }
   
   // ---- BUILD FLAT QUESTION LIST ----
   function buildQuestions() {
     questions = [];
     const t = taskData.taskType;
   
     if (t === 'complete-the-words') {
       taskData.passages.forEach((p, pi) => {
         questions.push({ type: 'cloze', passageIdx: pi, passage: p });
       });
     } else if (t === 'reading-daily-life') {
       taskData.passages.forEach((p, pi) => {
         p.questions.forEach((q, qi) => {
           questions.push({ type: 'mcq', passageIdx: pi, questionIdx: qi, passage: p, question: q });
         });
       });
     } else if (t === 'academic-reading') {
       taskData.passages.forEach((p, pi) => {
         p.questions.forEach((q, qi) => {
           questions.push({ type: 'mcq', passageIdx: pi, questionIdx: qi, passage: p, question: q });
         });
       });
     }
   }
   
   // ---- RENDER QUESTION ----
   function renderQuestion() {
     const area = document.getElementById('questionArea');
     const q = questions[currentQ];
     const total = questions.length;
   
     document.getElementById('qProgress').textContent = `Question ${currentQ + 1} of ${total}`;
     document.getElementById('progressFill').style.width = `${((currentQ) / total) * 100}%`;
     document.getElementById('prevBtn').style.display = currentQ > 0 ? 'inline-flex' : 'none';
     document.getElementById('nextBtn').style.display = currentQ < total - 1 ? 'inline-flex' : 'none';
     document.getElementById('submitBtn').style.display = currentQ === total - 1 ? 'inline-flex' : 'none';
   
     area.innerHTML = '';
   
     if (q.type === 'cloze') {
       renderCloze(area, q);
     } else {
       renderMCQ(area, q);
     }
   }
   
   // ---- CLOZE (Complete the Words) ----
   function renderCloze(area, q) {
     const p = q.passage;
     const html = `
       <div class="question-card">
         <div class="question-number">${q.passageIdx + 1}</div>
         <p style="margin-bottom:16px; font-weight:600;">Fill in the missing letters to complete each word.</p>
         <div class="cloze-text" id="clozeText"></div>
         <div style="margin-top:20px;">
           <button class="btn btn-primary btn-sm" onclick="checkCloze(${q.passageIdx})">Check Answers</button>
           <button class="btn btn-secondary btn-sm" onclick="revealCloze(${q.passageIdx})" style="margin-left:8px;">Reveal Answers</button>
         </div>
         <div class="feedback-panel" id="clozeFeedback"></div>
       </div>
     `;
     area.innerHTML = html;
   
     const clozeContainer = document.getElementById('clozeText');
     let fullHTML = '';
     p.segments.forEach((seg, i) => {
       fullHTML += seg.before;
       if (seg.word) {
         const half = seg.hint;
         const missing = seg.word.slice(half.length);
         const blankWidth = Math.max(60, missing.length * 16);
         fullHTML += `<strong>${half}</strong><input
           class="cloze-input"
           id="cloze-${q.passageIdx}-${i}"
           data-answer="${missing}"
           data-fullword="${seg.word}"
           style="width:${blankWidth}px"
           placeholder="${'_'.repeat(missing.length)}"
           autocomplete="off" autocorrect="off" spellcheck="false"
         />`;
       }
     });
     clozeContainer.innerHTML = fullHTML;
   }
   
   function checkCloze(pi) {
     const inputs = document.querySelectorAll(`[id^="cloze-${pi}-"]`);
     let correct = 0;
     inputs.forEach(inp => {
       const val = inp.value.trim().toLowerCase();
       const ans = inp.dataset.answer.toLowerCase();
       inp.classList.remove('correct-ans', 'wrong-ans');
       if (val === ans) {
         inp.classList.add('correct-ans');
         correct++;
       } else {
         inp.classList.add('wrong-ans');
       }
     });
     const fb = document.getElementById('clozeFeedback');
     const pct = Math.round((correct / inputs.length) * 100);
     fb.className = `feedback-panel show ${pct >= 70 ? 'correct' : pct >= 40 ? 'partial' : 'incorrect'}`;
     fb.innerHTML = `<h4>${pct >= 70 ? '🎉 Great job!' : pct >= 40 ? '👍 Decent effort!' : '📚 Keep practicing!'}</h4>
       <p>You got <strong>${correct}/${inputs.length}</strong> words correct (${pct}%). Red fields show incorrect answers.</p>`;
     answers[`cloze-${pi}`] = { correct, total: inputs.length };
     updateSidebarScore();
   }
   
   function revealCloze(pi) {
     const inputs = document.querySelectorAll(`[id^="cloze-${pi}-"]`);
     inputs.forEach(inp => {
       inp.value = inp.dataset.answer;
       inp.classList.add('correct-ans');
     });
   }
   
   // ---- MCQ (Reading in Daily Life & Academic Reading) ----
   function renderMCQ(area, q) {
     const passage = q.passage;
     const question = q.question;
     const saved = answers[question.id];
   
     // Check if this is a new passage (first question of a passage)
     const isFirstInPassage = q.questionIdx === 0;
   
     let passageHTML = '';
     if (isFirstInPassage || currentQ === 0) {
       const label = passage.label || passage.title || '';
       const typeLabel = passage.type === 'short' ? 'Short Passage' : passage.type === 'long' ? 'Long Passage' : 'Academic Passage';
       passageHTML = `
         <div class="passage-box">
           <h4>${label ? '📄 ' + label : '📄 ' + typeLabel}</h4>
           <div style="white-space: pre-line; font-size:0.97rem;">${passage.text}</div>
         </div>
       `;
     }
   
     const optionsHTML = (question.options || []).map((opt, i) => {
       let cls = '';
       if (saved !== undefined) {
         if (i === question.answer) cls = 'correct';
         else if (i === saved && saved !== question.answer) cls = 'incorrect';
       } else if (saved === i) {
         cls = 'selected';
       }
       return `
         <li class="option-item ${cls}" onclick="selectAnswer('${question.id}', ${i}, ${question.answer})" id="opt-${question.id}-${i}">
           <span class="option-letter">${String.fromCharCode(65 + i)}</span>
           <span>${opt}</span>
         </li>
       `;
     }).join('');
   
     const feedbackHTML = saved !== undefined ? `
       <div class="feedback-panel show ${saved === question.answer ? 'correct' : 'incorrect'}">
         <h4>${saved === question.answer ? '✅ Correct!' : '❌ Incorrect'}</h4>
         <p>${question.explanation || ''}</p>
       </div>
     ` : '<div class="feedback-panel" id="fb-' + question.id + '"></div>';
   
     area.innerHTML = `
       ${passageHTML}
       <div class="question-card">
         <div class="question-number">Q${q.questionIdx + 1}</div>
         <div class="question-text">${question.text}</div>
         <ul class="options-list">${optionsHTML}</ul>
         ${feedbackHTML}
       </div>
     `;
   }
   
   function selectAnswer(qId, selected, correct) {
     if (answers[qId] !== undefined) return; // already answered
     answers[qId] = selected;
   
     const opts = document.querySelectorAll(`[id^="opt-${qId}-"]`);
     opts.forEach((el, i) => {
       el.onclick = null;
       if (i === correct) el.classList.add('correct');
       else if (i === selected && selected !== correct) el.classList.add('incorrect');
     });
   
     const fb = document.getElementById(`fb-${qId}`);
     if (fb) {
       const q = questions[currentQ].question;
       fb.className = `feedback-panel show ${selected === correct ? 'correct' : 'incorrect'}`;
       fb.innerHTML = `<h4>${selected === correct ? '✅ Correct!' : '❌ Incorrect'}</h4><p>${q.explanation || ''}</p>`;
     }
   
     if (selected === correct) totalCorrect++;
     updateSidebarScore();
   }
   
   // ---- NAVIGATION ----
   function nextQuestion() {
     if (currentQ < questions.length - 1) {
       currentQ++;
       renderQuestion();
       window.scrollTo(0, 0);
     }
   }
   
   function prevQuestion() {
     if (currentQ > 0) {
       currentQ--;
       renderQuestion();
       window.scrollTo(0, 0);
     }
   }
   
   // ---- SUBMIT ----
   function submitTask() {
     stopTimer();
     // Count cloze scores
     let clozeCorrect = 0, clozeTotal = 0;
     Object.values(answers).forEach(v => {
       if (v && v.correct !== undefined) {
         clozeCorrect += v.correct;
         clozeTotal += v.total;
       }
     });
     const mcqTotal = questions.filter(q => q.type === 'mcq').length;
     const finalCorrect = totalCorrect + clozeCorrect;
     const finalTotal = mcqTotal + clozeTotal || questions.length;
     const pct = Math.round((finalCorrect / finalTotal) * 100);
   
     document.getElementById('questionArea').style.display = 'none';
     document.getElementById('prevBtn').style.display = 'none';
     document.getElementById('nextBtn').style.display = 'none';
     document.getElementById('submitBtn').style.display = 'none';
   
     const summary = document.getElementById('scoreSummary');
     summary.style.display = 'block';
     summary.innerHTML = `
       <div class="score-summary">
         <h2>${pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good Work!' : '📚 Keep Practicing!'}</h2>
         <div class="score-circle" style="background: conic-gradient(var(--primary) ${pct}%, var(--surface2) 0%);">
           <div class="score-inner">
             <span class="score-num">${pct}%</span>
             <span class="score-label">Score</span>
           </div>
         </div>
         <p style="margin-bottom:24px; color:var(--text-muted);">You answered <strong>${finalCorrect} out of ${finalTotal}</strong> correctly.</p>
         <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
           <button class="btn btn-primary" onclick="location.reload()">Try Another Task</button>
           <a href="mock-test.html" class="btn btn-secondary">Take Full Mock Test</a>
         </div>
       </div>
     `;
   
     showVideoAd(() => {});
   }
   
   // ---- TIMER ----
   function startTimer() {
     updateTimerDisplay();
     timerInterval = setInterval(() => {
       timeLeft--;
       updateTimerDisplay();
       if (timeLeft <= 0) { stopTimer(); submitTask(); }
     }, 1000);
   }
   
   function stopTimer() { clearInterval(timerInterval); }
   
   function updateTimerDisplay() {
     const m = Math.floor(timeLeft / 60);
     const s = timeLeft % 60;
     const el = document.getElementById('timerDisplay');
     el.textContent = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
     el.className = 'timer-display' + (timeLeft < 60 ? ' danger' : timeLeft < 180 ? ' warning' : '');
   }
   
   // ---- SIDEBAR SCORE ----
   function updateSidebarScore() {
     document.getElementById('sideScoreNum').textContent = totalCorrect;
   }