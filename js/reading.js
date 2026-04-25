/* =============================================
   TOEFL Prep Hub – Reading Section JS
   Timer removed from practice mode.
   ============================================= */

   var currentTask = null;
   var taskData = null;
   var questions = [];
   var currentQ = 0;
   var answers = {};
   var totalCorrect = 0;
   
   var DATA_PATHS = {
     'complete-the-words': 'data/reading/q1.json',
     'reading-daily-life':  'data/reading/q2.json',
     'academic-reading':    'data/reading/q3.json'
   };
   
   // =============================================
   // LOAD TASK + INTRO MODAL
   // =============================================
   async function loadTask(taskType) {
     currentTask = taskType;
     try {
       var res = await fetch(DATA_PATHS[taskType]);
       taskData = await res.json();
       showIntroModal(taskData);
     } catch(e) {
       alert('Could not load questions. Make sure data files are in the /data/ directory.');
       console.error(e);
     }
   }
   
   function showIntroModal(data) {
     document.getElementById('modalBadge').textContent = data.taskTitle;
     document.getElementById('modalTitle').textContent = 'About: ' + data.taskTitle;
     document.getElementById('modalDesc').textContent = getTaskDescription(data.taskType);
   
     var expectList = document.getElementById('modalExpect');
     expectList.innerHTML = '';
     (data.whatToExpect || []).forEach(function(t) {
       var li = document.createElement('li');
       li.innerHTML = '<span style="color:var(--success)">✓</span> ' + t;
       li.style.cssText = 'display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';
       expectList.appendChild(li);
     });
   
     var tipsList = document.getElementById('modalTips');
     tipsList.innerHTML = '';
     (data.tips || []).forEach(function(t) {
       var li = document.createElement('li');
       li.textContent = t;
       tipsList.appendChild(li);
     });
   
     // Set guide button URL based on task type
     var guideUrls = {
       'complete-the-words':  'reading/complete-the-words.html',
       'reading-daily-life':  'reading/reading-daily-life.html',
       'academic-reading':    null
     };
     var guideBtn = document.getElementById('modalGuideBtn');
     var guideUrl = guideUrls[taskType] || null;
     if (guideBtn) {
       if (guideUrl) {
         guideBtn.href = guideUrl;
         guideBtn.style.display = 'inline-flex';
       } else {
         guideBtn.style.display = 'none';
       }
     }
     var overlay = document.getElementById('introOverlay');
     overlay.style.display = 'flex';
     overlay.onclick = function(e) { if (e.target === overlay) closeIntroModal(); };
     document.addEventListener('keydown', handleEscKey);
   }
   
   function closeIntroModal() {
     document.getElementById('introOverlay').style.display = 'none';
     document.removeEventListener('keydown', handleEscKey);
   }
   function handleEscKey(e) { if (e.key === 'Escape') closeIntroModal(); }
   
   function getTaskDescription(type) {
     var descs = {
       'complete-the-words': 'Read academic paragraphs with hidden word endings. Type the missing letters to complete each word. Tests your academic vocabulary.',
       'reading-daily-life': 'Read everyday texts like emails, notices, and messages, then answer comprehension questions.',
       'academic-reading':   'Read 200-word academic passages and answer five questions covering factual information, vocabulary, rhetorical purpose, and paragraph relationships.'
     };
     return descs[type] || '';
   }
   
   // =============================================
   // START TASK — no timer in practice mode
   // =============================================
   function startTask() {
     closeIntroModal();
     document.getElementById('taskSelection').style.display = 'none';
     var practiceArea = document.getElementById('practiceArea');
     practiceArea.style.display = 'block';
   
     // Hide timer — practice mode has no time limit
     var timerEl = document.getElementById('timerDisplay');
     if (timerEl) timerEl.style.display = 'none';
   
     if (!document.getElementById('backToTasksBtn')) {
       var backBtn = document.createElement('button');
       backBtn.id = 'backToTasksBtn';
       backBtn.className = 'back-to-tasks-btn';
       backBtn.textContent = '← Back to Tasks';
       backBtn.onclick = backToTasks;
       practiceArea.insertBefore(backBtn, practiceArea.firstChild);
     }
   
     buildQuestions();
     currentQ = 0;
     answers = {};
     totalCorrect = 0;
     document.getElementById('taskHeading').textContent = taskData.taskTitle;
     renderQuestion();
   }
   
   function backToTasks() {
     document.getElementById('practiceArea').style.display = 'none';
     document.getElementById('taskSelection').style.display = 'block';
     document.getElementById('scoreSummary').style.display = 'none';
     document.getElementById('questionArea').innerHTML = '';
     document.getElementById('questionArea').style.display = 'block';
     document.getElementById('prevBtn').style.display = 'none';
     document.getElementById('nextBtn').style.display = 'inline-flex';
     document.getElementById('submitBtn').style.display = 'none';
     var btn = document.getElementById('backToTasksBtn');
     if (btn) btn.remove();
     updateSidebarScore();
   }
   
   // =============================================
   // BUILD QUESTIONS
   // =============================================
   function buildQuestions() {
     questions = [];
     var t = taskData.taskType;
     if (t === 'complete-the-words') {
       taskData.passages.forEach(function(p, pi) {
         questions.push({ type: 'cloze', passageIdx: pi, passage: p });
       });
     } else {
       taskData.passages.forEach(function(p) {
         p.questions.forEach(function(q, qi) {
           questions.push({ type: 'mcq', passage: p, question: q, qIdx: qi });
         });
       });
     }
   }
   
   // =============================================
   // RENDER
   // =============================================
   function renderQuestion() {
     var area = document.getElementById('questionArea');
     var q = questions[currentQ];
     var total = questions.length;
   
     document.getElementById('qProgress').textContent = 'Question ' + (currentQ + 1) + ' of ' + total;
     document.getElementById('progressFill').style.width = ((currentQ / total) * 100) + '%';
     document.getElementById('prevBtn').style.display   = currentQ > 0 ? 'inline-flex' : 'none';
     document.getElementById('nextBtn').style.display   = currentQ < total - 1 ? 'inline-flex' : 'none';
     document.getElementById('submitBtn').style.display = currentQ === total - 1 ? 'inline-flex' : 'none';
   
     area.innerHTML = '';
     if (q.type === 'cloze') renderCloze(area, q);
     else renderMCQ(area, q);
   }
   
   // =============================================
   // CLOZE
   // =============================================
   function renderCloze(area, q) {
     var p = q.passage;
     area.innerHTML =
       '<div class="question-card">' +
       '<div class="question-number">' + (q.passageIdx + 1) + '</div>' +
       '<p style="margin-bottom:16px;font-weight:600;">Fill in the missing letters to complete each word.</p>' +
       '<div class="cloze-text" id="clozeText"></div>' +
       '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">' +
       '<button class="btn btn-primary btn-sm" onclick="checkCloze(' + q.passageIdx + ')">Check Answers</button>' +
       '<button class="btn btn-secondary btn-sm" onclick="revealCloze(' + q.passageIdx + ')">Reveal Answers</button>' +
       '</div>' +
       '<div class="feedback-panel" id="clozeFeedback"></div>' +
       '</div>';
   
     var ct = document.getElementById('clozeText');
     var html = '';
     p.segments.forEach(function(seg, i) {
       html += seg.before;
       if (seg.word) {
         var missing = seg.word.slice(seg.hint.length);
         html += '<strong>' + seg.hint + '</strong>' +
           '<input class="cloze-input" id="cloze-' + q.passageIdx + '-' + i + '" ' +
           'data-answer="' + missing + '" ' +
           'style="width:' + Math.max(60, missing.length * 16) + 'px" ' +
           'placeholder="' + '_'.repeat(missing.length) + '" ' +
           'autocomplete="off" autocorrect="off" spellcheck="false"/>';
       }
     });
     ct.innerHTML = html;
   }
   
   function checkCloze(pi) {
     var inputs = document.querySelectorAll('[id^="cloze-' + pi + '-"]');
     var correct = 0;
     inputs.forEach(function(inp) {
       inp.classList.remove('correct-ans', 'wrong-ans');
       if (inp.value.trim().toLowerCase() === inp.dataset.answer.toLowerCase()) {
         inp.classList.add('correct-ans'); correct++;
       } else {
         inp.classList.add('wrong-ans');
       }
     });
     var pct = Math.round((correct / inputs.length) * 100);
     var fb = document.getElementById('clozeFeedback');
     fb.className = 'feedback-panel show ' + (pct >= 70 ? 'correct' : pct >= 40 ? 'partial' : 'incorrect');
     fb.innerHTML = '<h4>' + (pct >= 70 ? '✅ Great job!' : pct >= 40 ? '🟡 Decent effort!' : '❌ Keep practicing!') + '</h4>' +
       '<p>You got <strong>' + correct + '/' + inputs.length + '</strong> words correct (' + pct + '%).</p>';
     answers['cloze-' + pi] = { correct: correct, total: inputs.length };
     updateSidebarScore();
     injectAdAfter('clozeFeedback');
   }
   
   function revealCloze(pi) {
     document.querySelectorAll('[id^="cloze-' + pi + '-"]').forEach(function(inp) {
       inp.value = inp.dataset.answer;
       inp.classList.add('correct-ans');
     });
   }
   
   // =============================================
   // MCQ
   // =============================================
   function renderMCQ(area, item) {
     var q = item.question;
     var p = item.passage;
     var saved = answers[q.id];
     var passHTML = '';
   
     if (item.qIdx === 0) {
       var lbl = p.label || p.title || 'Passage';
       passHTML = '<div class="passage-box" id="passageBox"><h4>' + lbl + '</h4><div style="white-space:pre-line;font-size:0.97rem;">' + p.text + '</div></div>';
     }
   
     var optHTML = (q.options || []).map(function(opt, i) {
       var cls = '';
       if (saved !== undefined) {
         if (i === q.answer) cls = 'correct';
         else if (i === saved) cls = 'incorrect';
       }
       return '<li class="option-item ' + cls + '" onclick="selectAnswer(\'' + q.id + '\',' + i + ',' + q.answer + ')" id="opt-' + q.id + '-' + i + '">' +
         '<span class="option-letter">' + String.fromCharCode(65 + i) + '</span><span>' + opt + '</span></li>';
     }).join('');
   
     var fbHTML = saved !== undefined
       ? '<div class="feedback-panel show ' + (saved === q.answer ? 'correct' : 'incorrect') + '">' +
         '<h4>' + (saved === q.answer ? '✅ Correct!' : '❌ Incorrect') + '</h4>' +
         '<p>' + (q.explanation || '') + '</p></div>'
       : '<div class="feedback-panel" id="fb-' + q.id + '"></div>';
   
     area.innerHTML = passHTML +
       '<div class="question-card">' +
       '<div class="question-number">Q' + (item.qIdx + 1) + '</div>' +
       '<div class="question-text">' + q.text + '</div>' +
       '<ul class="options-list">' + optHTML + '</ul>' +
       fbHTML +
       '</div>';
   
     if (item.qIdx === 0 && passHTML) {
       injectAdAfter('passageBox');
     }
   }
   
   function selectAnswer(qId, selected, correct) {
     if (answers[qId] !== undefined) return;
     answers[qId] = selected;
   
     document.querySelectorAll('[id^="opt-' + qId + '-"]').forEach(function(el, i) {
       el.onclick = null;
       if (i === correct) el.classList.add('correct');
       else if (i === selected) el.classList.add('incorrect');
     });
   
     var fb = document.getElementById('fb-' + qId);
     if (fb) {
       var q = questions[currentQ].question;
       fb.className = 'feedback-panel show ' + (selected === correct ? 'correct' : 'incorrect');
       fb.innerHTML = '<h4>' + (selected === correct ? '✅ Correct!' : '❌ Incorrect') + '</h4><p>' + (q.explanation || '') + '</p>';
       injectAdAfter('fb-' + qId);
     }
   
     if (selected === correct) totalCorrect++;
     updateSidebarScore();
   }
   
   // =============================================
   // AD INJECTION
   // =============================================
   var AD_CLIENT = 'ca-pub-9028393226994516';
   var AD_SLOT   = '4417173607';
   
   function injectAdAfter(elementId) {
     var el = document.getElementById(elementId);
     if (!el) return;
     if (el.nextSibling && el.nextSibling.className && el.nextSibling.className.indexOf('injected-ad') !== -1) return;
     var div = document.createElement('div');
     div.className = 'injected-ad';
     div.style.cssText = 'margin:20px 0;text-align:center;';
     div.innerHTML =
       '<ins class="adsbygoogle" style="display:block" ' +
       'data-ad-client="' + AD_CLIENT + '" ' +
       'data-ad-slot="' + AD_SLOT + '" ' +
       'data-ad-format="auto" ' +
       'data-full-width-responsive="true"></ins>';
     el.parentNode.insertBefore(div, el.nextSibling);
     (window.adsbygoogle = window.adsbygoogle || []).push({});
   }
   
   // =============================================
   // NAVIGATION
   // =============================================
   function nextQuestion() {
     if (currentQ < questions.length - 1) { currentQ++; renderQuestion(); window.scrollTo(0, 0); }
   }
   function prevQuestion() {
     if (currentQ > 0) { currentQ--; renderQuestion(); window.scrollTo(0, 0); }
   }
   
   // =============================================
   // SUBMIT
   // =============================================
   function submitTask() {
     var clozeCorrect = 0, clozeTotal = 0;
     Object.values(answers).forEach(function(v) {
       if (v && v.correct !== undefined) { clozeCorrect += v.correct; clozeTotal += v.total; }
     });
     var mcqTotal = questions.filter(function(q) { return q.type === 'mcq'; }).length;
     var finalCorrect = totalCorrect + clozeCorrect;
     var finalTotal   = mcqTotal + clozeTotal || questions.length;
     var pct = Math.round((finalCorrect / finalTotal) * 100);
   
     document.getElementById('questionArea').style.display = 'none';
     document.getElementById('prevBtn').style.display = 'none';
     document.getElementById('nextBtn').style.display = 'none';
     document.getElementById('submitBtn').style.display = 'none';
     var backBtn = document.getElementById('backToTasksBtn');
     if (backBtn) backBtn.style.display = 'none';
   
     var summary = document.getElementById('scoreSummary');
     summary.style.display = 'block';
     summary.innerHTML =
       '<div class="score-summary">' +
       '<h2>' + (pct >= 80 ? '🎉 Excellent!' : pct >= 60 ? '👍 Good Work!' : '📚 Keep Practicing!') + '</h2>' +
       '<div class="score-circle" style="background:conic-gradient(var(--primary) ' + pct + '%, var(--surface2) 0%);">' +
       '<div class="score-inner"><span class="score-num">' + pct + '%</span><span class="score-label">Score</span></div>' +
       '</div>' +
       '<p style="margin-bottom:24px;color:var(--text-muted);">You answered <strong>' + finalCorrect + ' out of ' + finalTotal + '</strong> correctly.</p>' +
       '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
       '<button class="btn btn-secondary" onclick="backToTasks()">Try Another Task</button>' +
       '<a href="mock-test.html" class="btn btn-primary">Full Mock Test</a>' +
       '</div></div>' +
       '<div class="injected-ad" style="margin:20px 0;text-align:center;">' +
       '<ins class="adsbygoogle" style="display:block" ' +
       'data-ad-client="' + AD_CLIENT + '" data-ad-slot="' + AD_SLOT + '" ' +
       'data-ad-format="auto" data-full-width-responsive="true"></ins>' +
       '</div>';
     (window.adsbygoogle = window.adsbygoogle || []).push({});
   }
   
   function updateSidebarScore() {
     var el = document.getElementById('sideScoreNum');
     if (el) el.textContent = totalCorrect || '-';
   }