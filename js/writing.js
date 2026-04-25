/* =============================================
   TOEFL Prep Hub – Writing Section JS
   ============================================= */

let currentTask = null, taskData = null, items = [], currentIdx = 0;
let results = [];

const DATA_PATHS = {
  'build-a-sentence': 'data/writing/q1.json',
  'write-email': 'data/writing/q2.json',
  'academic-discussion': 'data/writing/q3.json'
};

// =============================================
// DYNAMIC QUESTION COUNTS ON TASK CARDS
// =============================================
async function preloadTaskCounts() {
  const tasks = [
    { path: DATA_PATHS['build-a-sentence'], countEl: 'count-bas' },
    { path: DATA_PATHS['write-email'],      countEl: 'count-email' },
    { path: DATA_PATHS['academic-discussion'], countEl: 'count-discuss' }
  ];
  for (const t of tasks) {
    try {
      const r = await fetch(t.path);
      const data = await r.json();
      const count = (data.questions || data.prompts || []).length;
      const el = document.getElementById(t.countEl);
      if (el) el.textContent = count + ' questions';
    } catch(e) { console.warn('Could not load count for', t.countEl); }
  }
}
document.addEventListener('DOMContentLoaded', preloadTaskCounts);

// =============================================
// LOAD TASK + INTRO MODAL
// =============================================
async function loadTask(t) {
  currentTask = t;
  try {
    const r = await fetch(DATA_PATHS[t]);
    taskData = await r.json();
    showIntroModal(taskData);
  } catch(e) {
    alert('Could not load task data.');
    console.error(e);
  }
}

function showIntroModal(data) {
  const count = (data.questions || data.prompts || []).length;
  document.getElementById('modalBadge').textContent = data.taskTitle;
  document.getElementById('modalTitle').textContent = 'About: ' + data.taskTitle;
  const descs = {
    'build-a-sentence': 'Read what someone said. Then fill in the blanks using the scrambled words — one word is extra and should not be used.',
    'write-email': 'Write a polite, professional email addressing all 3 required points. Aim for 130-140 words.',
    'academic-discussion': "Read the professor's question and student responses, then add your own contribution. Aim for 120+ words."
  };
  document.getElementById('modalDesc').textContent = descs[data.taskType] || '';
  const countEl = document.getElementById('modalQuestionCount');
  if (countEl) countEl.textContent = count + ' questions';

  const el = document.getElementById('modalExpect');
  el.innerHTML = '';
  (data.whatToExpect || []).forEach(function(t) {
    const li = document.createElement('li');
    li.innerHTML = '<span style="color:var(--success)">✓</span> ' + t;
    li.style.cssText = 'display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';
    el.appendChild(li);
  });
  const tl = document.getElementById('modalTips');
  tl.innerHTML = '';
  (data.tips || []).forEach(function(t) {
    const li = document.createElement('li');
    li.textContent = t;
    tl.appendChild(li);
  });
  const ov = document.getElementById('introOverlay');
  ov.style.display = 'flex';
  ov.onclick = function(e) { if (e.target === ov) closeIntroModal(); };
  document.addEventListener('keydown', handleEscKey);
}

function closeIntroModal() {
  document.getElementById('introOverlay').style.display = 'none';
  document.removeEventListener('keydown', handleEscKey);
}
function handleEscKey(e) { if (e.key === 'Escape') closeIntroModal(); }

function startTask() {
  closeIntroModal();
  document.getElementById('taskSelection').style.display = 'none';
  const pa = document.getElementById('practiceArea');
  pa.style.display = 'block';
  if (!document.getElementById('backToTasksBtn')) {
    const b = document.createElement('button');
    b.id = 'backToTasksBtn'; b.className = 'back-to-tasks-btn';
    b.textContent = '← Back to Tasks'; b.onclick = backToTasks;
    pa.insertBefore(b, pa.firstChild);
  }
  items = taskData.questions || taskData.prompts || [];
  currentIdx = 0;
  results = new Array(items.length).fill(null);
  document.getElementById('taskHeading').textContent = taskData.taskTitle;

  // Hide timer — practice mode has no time limit
  const timerEl = document.getElementById('timerDisplay');
  if (timerEl) timerEl.style.display = 'none';

  if (currentTask !== 'build-a-sentence') {
    const card = document.getElementById('rubricsCard');
    const rubric = items[0] && items[0].scoringRubric;
    if (rubric && card) {
      card.style.display = 'block';
      document.getElementById('rubricList').innerHTML = Object.entries(rubric).map(function(entry) {
        return '<li style="padding:5px 0;border-bottom:1px solid var(--border);"><strong style="text-transform:capitalize;">' + entry[0] + ':</strong> ' + entry[1] + '</li>';
      }).join('');
    }
  }
  renderItem();
}

function backToTasks() {
  document.getElementById('practiceArea').style.display = 'none';
  document.getElementById('taskSelection').style.display = 'block';
  document.getElementById('scoreSummary').style.display = 'none';
  document.getElementById('questionArea').innerHTML = '';
  document.getElementById('navBtns').style.display = 'flex';
  const rc = document.getElementById('rubricsCard'); if (rc) rc.style.display = 'none';
  const b = document.getElementById('backToTasksBtn'); if (b) b.remove();
}

// =============================================
// RENDER DISPATCHER
// =============================================
function renderItem() {
  const area = document.getElementById('questionArea');
  const total = items.length;
  document.getElementById('qProgress').textContent = 'Question ' + (currentIdx + 1) + ' of ' + total;
  document.getElementById('progressFill').style.width = ((currentIdx / total) * 100) + '%';
  document.getElementById('prevBtn').style.display   = currentIdx > 0 ? 'inline-flex' : 'none';
  document.getElementById('nextBtn').style.display   = currentIdx < total - 1 ? 'inline-flex' : 'none';
  document.getElementById('submitBtn').style.display = currentIdx === total - 1 ? 'inline-flex' : 'none';
  area.innerHTML = '';
  if      (currentTask === 'build-a-sentence')    renderBuildSentence(area, items[currentIdx]);
  else if (currentTask === 'write-email')          renderWriteEmail(area, items[currentIdx]);
  else if (currentTask === 'academic-discussion')  renderDiscussion(area, items[currentIdx]);
}

// =============================================
// BUILD A SENTENCE — REAL EXAM FORMAT
// =============================================
function renderBuildSentence(area, q) {
  var saved = (results[currentIdx] && results[currentIdx].placed) || [];
  var parts = q.partialSentence.split('_____');
  var blankIdx = 0;
  var sentenceHtml = '<div class="bas-sentence" id="basSlots">';

  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') {
      sentenceHtml += '<span class="bas-fixed">' + parts[i].trim() + '</span>';
    }
    if (i < parts.length - 1) {
      var word = saved[blankIdx] || '';
      var filledClass = word ? ' filled' : '';
      var inner = word ? word : '<span class="bas-blank-hint">tap to remove</span>';
      sentenceHtml += '<span class="bas-blank' + filledClass + '" data-slot="' + blankIdx + '" onclick="removeFromSlot(this)">' + inner + '</span>';
      blankIdx++;
    }
  }
  sentenceHtml += '</div>';

  area.innerHTML =
    '<div class="question-card">' +
    '<div class="question-number">' + (currentIdx + 1) + '</div>' +
    '<p class="bas-prompt">' + q.prompt + '</p>' +
    '<div class="bas-sentence-wrapper">' + sentenceHtml + '</div>' +
    '<p style="font-size:0.84rem;color:var(--text-muted);margin:14px 0 8px;">👆 Tap words to fill blanks in order. Tap a filled blank to remove it.</p>' +
    '<div class="word-bank" id="wordBank"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" onclick="checkSentence(' + currentIdx + ')">Check Answer</button>' +
    '<button class="btn btn-secondary btn-sm" onclick="clearSentence(' + currentIdx + ')">Clear</button>' +
    '<button class="btn btn-sm" style="background:var(--surface2);color:var(--text-muted);" onclick="revealSentence(' + currentIdx + ')">Show Answer</button>' +
    '</div>' +
    '<div class="feedback-panel" id="basFeedback"></div>' +
    '</div>';

  var bank = document.getElementById('wordBank');
  var usedWords = saved.filter(Boolean);
  var remaining = shuffle(q.scrambled.slice()).filter(function(w) { return usedWords.indexOf(w) === -1; });
  remaining.forEach(function(w) { bank.appendChild(createChip(w)); });

  if (results[currentIdx] && results[currentIdx].checked) {
    showBASFeedback(q, results[currentIdx]);
  }
}

function createChip(word) {
  var span = document.createElement('span');
  span.className = 'word-chip';
  span.textContent = word;
  span.addEventListener('click', function() { placeWordInNextBlank(span); });
  return span;
}

function placeWordInNextBlank(chip) {
  var slots = document.querySelectorAll('.bas-blank');
  for (var i = 0; i < slots.length; i++) {
    if (!slots[i].classList.contains('filled')) {
      slots[i].textContent = chip.textContent;
      slots[i].classList.add('filled');
      chip.remove();
      saveBasState();
      return;
    }
  }
}

function removeFromSlot(slotEl) {
  if (!slotEl.classList.contains('filled')) return;
  var word = slotEl.textContent;
  slotEl.innerHTML = '<span class="bas-blank-hint">tap to remove</span>';
  slotEl.classList.remove('filled');
  var bank = document.getElementById('wordBank');
  if (bank) bank.appendChild(createChip(word));
  saveBasState();
}

function saveBasState() {
  var slots = document.querySelectorAll('.bas-blank');
  var placed = Array.from(slots).map(function(s) {
    return s.classList.contains('filled') ? s.textContent.trim() : '';
  });
  results[currentIdx] = Object.assign({}, results[currentIdx] || {}, { placed: placed });
}

function clearSentence(idx) {
  var slots = document.querySelectorAll('.bas-blank');
  var bank = document.getElementById('wordBank');
  slots.forEach(function(slot) {
    if (slot.classList.contains('filled')) {
      bank.appendChild(createChip(slot.textContent));
      slot.innerHTML = '<span class="bas-blank-hint">tap to remove</span>';
      slot.classList.remove('filled');
    }
  });
  results[currentIdx] = { placed: [], checked: false };
  var fb = document.getElementById('basFeedback');
  fb.className = 'feedback-panel'; fb.innerHTML = '';
}

function checkSentence(idx) {
  var q = items[idx];
  var slots = document.querySelectorAll('.bas-blank');
  var placed = Array.from(slots).map(function(s) {
    return s.classList.contains('filled') ? s.textContent.trim() : '';
  });
  var correct = JSON.stringify(placed.map(function(w) { return w.toLowerCase(); })) ===
                JSON.stringify(q.answer.map(function(w) { return w.toLowerCase(); }));
  results[idx] = { placed: placed, checked: true, correct: correct }; updateSidebarScore();
  showBASFeedback(q, results[idx]);
}

function showBASFeedback(q, result) {
  var fb = document.getElementById('basFeedback');
  if (!fb) return;
  fb.className = 'feedback-panel show ' + (result.correct ? 'correct' : 'incorrect');
  fb.innerHTML = result.correct
    ? '<h4>✅ Correct!</h4><p><strong>' + q.fullSentence + '</strong></p>'
    : '<h4>❌ Not quite.</h4>' +
      '<p style="margin-bottom:6px;">Correct: <strong>' + q.fullSentence + '</strong></p>' +
      '<p style="font-size:0.87rem;color:var(--text-muted);">Extra word: <strong>' + q.extraWord + '</strong> — ' + q.explanation + '</p>';
}

function revealSentence(idx) {
  var q = items[idx];
  var slots = document.querySelectorAll('.bas-blank');
  var bank = document.getElementById('wordBank');
  bank.innerHTML = '';
  slots.forEach(function(slot, i) {
    slot.textContent = q.answer[i] || '';
    slot.classList.add('filled');
  });
  var extra = createChip('✗ ' + q.extraWord);
  extra.style.cssText = 'background:#fee2e2;color:#dc2626;cursor:default;';
  bank.appendChild(extra);
  results[idx] = { placed: q.answer, checked: true, correct: true };
  showBASFeedback(q, results[idx]);
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// =============================================
// WRITE AN EMAIL
// =============================================
function renderWriteEmail(area, prompt) {
  var saved = (results[currentIdx] && results[currentIdx].text) || '';
  area.innerHTML =
    '<div class="question-card">' +
    '<div class="question-number">' + (currentIdx + 1) + '</div>' +
    '<h3 style="margin-bottom:14px;">Write an Email</h3>' +
    '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-bottom:16px;font-size:0.93rem;line-height:1.7;">' + prompt.scenario + '</div>' +
    '<div class="required-points"><h4>Required Points (include all three):</h4>' +
    '<ol style="padding-left:20px;margin-top:6px;">' + prompt.requiredPoints.map(function(p) { return '<li>' + p + '</li>'; }).join('') + '</ol></div>' +
    '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Write your email below (aim for 130-140 words):</p>' +
    '<textarea class="writing-area" id="emailArea" placeholder="Dear ' + prompt.recipient + ',&#10;&#10;...">' + saved + '</textarea>' +
    '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 130-140 words</span></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" id="scoreEmailBtn" onclick="scoreEmail(' + currentIdx + ')">Analyze &amp; Score</button>' +
    '<button class="sample-toggle" onclick="toggleSample(&quot;emailSample&quot;)">See Sample Answer</button>' +
    '</div><div id="emailFeedbackArea"></div>' +
    '<div class="sample-answer" id="emailSample">' + prompt.sampleResponse + '</div>' +
    '</div>';

  var ta = document.getElementById('emailArea');
  var wc = document.getElementById('wc');
  var update = function() {
    var w = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wc.textContent = w;
    wc.style.color = w >= 130 && w <= 180 ? 'var(--success)' : w > 100 ? 'var(--warning)' : 'var(--danger)';
    results[currentIdx] = { text: ta.value };
  };
  ta.addEventListener('input', update); update();
}

function scoreEmail(idx) {
  var text = document.getElementById('emailArea') ? document.getElementById('emailArea').value : '';
  if (text.trim().split(/\s+/).filter(Boolean).length < 20) {
    document.getElementById('emailFeedbackArea').innerHTML = '<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your email first.</div>';
    return;
  }
  var btn = document.getElementById('scoreEmailBtn');
  if (btn) { btn.textContent = 'Analyzing...'; btn.disabled = true; }
  setTimeout(function() {
    var result = SCORING.scoreEmail(text, items[idx]);
    var area = document.getElementById('emailFeedbackArea');
    if (area) area.innerHTML = SCORING.renderFeedback(result, 'email');
    if (btn) { btn.textContent = 'Re-analyze'; btn.disabled = false; }
  }, 1200);
}

// =============================================
// ACADEMIC DISCUSSION
// =============================================
function renderDiscussion(area, prompt) {
  var saved = (results[currentIdx] && results[currentIdx].text) || '';
  area.innerHTML =
    '<div class="question-card">' +
    '<div class="question-number">' + (currentIdx + 1) + '</div>' +
    '<h3 style="margin-bottom:14px;">Write for an Academic Discussion</h3>' +
    '<div class="discussion-context"><strong style="color:var(--primary);">Professor ' + prompt.professor.name + ':</strong>' +
    '<p style="margin-top:8px;font-size:0.93rem;line-height:1.7;">' + prompt.professor.question + '</p></div>' +
    prompt.students.map(function(s) {
      return '<div class="student-response"><strong>' + s.name + ':</strong><p style="margin-top:6px;font-size:0.9rem;line-height:1.65;">' + s.response + '</p></div>';
    }).join('') +
    '<div style="margin-top:20px;">' +
    '<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">Write your response (aim for 120+ words):</p>' +
    '<textarea class="writing-area" id="discussArea" placeholder="Write your contribution here..." style="min-height:180px;">' + saved + '</textarea>' +
    '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 120+ words</span></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" id="scoreDiscBtn" onclick="scoreDiscussion(' + currentIdx + ')">Analyze &amp; Score</button>' +
    '<button class="sample-toggle" onclick="toggleSample(&quot;discussSample&quot;)">See Sample Answer</button>' +
    '</div></div><div id="discussFeedbackArea"></div>' +
    '<div class="sample-answer" id="discussSample">' + prompt.sampleResponse + '</div>' +
    '</div>';

  var ta = document.getElementById('discussArea');
  var wc = document.getElementById('wc');
  var update = function() {
    var w = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wc.textContent = w;
    wc.style.color = w >= 120 ? 'var(--success)' : w > 80 ? 'var(--warning)' : 'var(--danger)';
    results[currentIdx] = { text: ta.value };
  };
  ta.addEventListener('input', update); update();
}

function scoreDiscussion(idx) {
  var text = document.getElementById('discussArea') ? document.getElementById('discussArea').value : '';
  if (text.trim().split(/\s+/).filter(Boolean).length < 20) {
    document.getElementById('discussFeedbackArea').innerHTML = '<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your response first.</div>';
    return;
  }
  var btn = document.getElementById('scoreDiscBtn');
  if (btn) { btn.textContent = 'Analyzing...'; btn.disabled = true; }
  setTimeout(function() {
    var result = SCORING.scoreDiscussion(text, items[idx]);
    var area = document.getElementById('discussFeedbackArea');
    if (area) area.innerHTML = SCORING.renderFeedback(result, 'discussion');
    if (btn) { btn.textContent = 'Re-analyze'; btn.disabled = false; }
  }, 1400);
}

// =============================================
// HELPERS
// =============================================
function toggleSample(id) {
  var el = document.getElementById(id);
  el.style.display = el.style.display === 'block' ? 'none' : 'block';
}
function nextQ() { if (currentIdx < items.length - 1) { currentIdx++; renderItem(); window.scrollTo(0,0); } }
function prevQ() { if (currentIdx > 0) { currentIdx--; renderItem(); window.scrollTo(0,0); } }
function finishTask() {
  document.getElementById('questionArea').innerHTML = '';
  document.getElementById('navBtns').style.display = 'none';
  var bb = document.getElementById('backToTasksBtn'); if (bb) bb.style.display = 'none';
  var correct = currentTask === 'build-a-sentence' ? results.filter(function(r) { return r && r.correct; }).length : 0;
  var sum = document.getElementById('scoreSummary');
  sum.style.display = 'block';
  sum.innerHTML =
    '<div class="score-summary"><h2>Task Complete! 🎉</h2>' +
    (currentTask === 'build-a-sentence'
      ? '<div class="score-circle" style="background:conic-gradient(var(--primary) ' + Math.round(correct/items.length*100) + '%, var(--surface2) 0%);">' +
        '<div class="score-inner"><span class="score-num">' + correct + '/' + items.length + '</span><span class="score-label">Correct</span></div></div>'
      : '<p style="font-size:1.05rem;margin-bottom:16px;">Review your feedback above or compare with the sample answers.</p>') +
    '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;">' +
    '<button class="btn btn-secondary" onclick="backToTasks()">Try Another Task</button>' +
    '<a href="mock-test.html" class="btn btn-primary">Full Mock Test</a>' +
    '</div></div>';
}

// =============================================
// SCORING ENGINE
// =============================================
var SCORING = {
  analyzeVocabulary: function(text) {
    var words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    var unique = new Set(words);
    var ratio = words.length ? unique.size / words.length : 0;
    var academicWords = ['furthermore','moreover','however','consequently','therefore','nevertheless','alternatively','significantly','demonstrate','indicate','suggest','evidence','argue','contend','perspective','consideration','substantial','fundamental','emphasize','acknowledge','conclude','examine','analyze','assess','evaluate','implement','establish','maintain','ensure','facilitate','contribute','represent','influence','determine','identify','propose','address','complex','significant','effective','essential','relevant','appropriate','specific','particular'];
    var weakWords = ['good','bad','nice','thing','stuff'];
    return {
      ratio: Math.round(ratio * 100),
      academicCount: academicWords.filter(function(w) { return text.toLowerCase().includes(w); }).length,
      weakCount: weakWords.filter(function(w) { return text.toLowerCase().includes(w); }).length,
      uniqueWords: unique.size
    };
  },
  analyzeGrammar: function(text) {
    var issues = [];
    if (/\bi is\b/i.test(text)) issues.push('subject-verb agreement');
    if (/\bhe have\b|\bshe have\b|\bit have\b/i.test(text)) issues.push('subject-verb agreement');
    if (/\btheir is\b/i.test(text)) issues.push('there/their confusion');
    return {
      issues: issues,
      sophisticationScore:
        (/\b(is|are|was|were|been|being)\s+\w+ed\b/.test(text) ? 1 : 0) +
        (/\b(if|unless|should|would|could|might)\b/i.test(text) ? 1 : 0) +
        (/\b(have|has|had)\s+\w+(ed|en)\b/.test(text) ? 1 : 0) +
        (/\w+ing\s+\w+/.test(text) ? 1 : 0)
    };
  },
  analyzeCoherence: function(text) {
    var t = text.toLowerCase();
    var cats = 0;
    var groups = [
      ['furthermore','moreover','in addition','additionally','also'],
      ['however','nevertheless','on the other hand','in contrast','although','despite'],
      ['therefore','consequently','as a result','thus','because','since'],
      ['for example','for instance','such as','to illustrate'],
      ['indeed','in fact','clearly','importantly']
    ];
    groups.forEach(function(g) { if (g.some(function(w) { return t.includes(w); })) cats++; });
    return { categories: cats };
  },
  scoreEmail: function(text, prompt) {
    var words = text.trim().split(/\s+/).filter(Boolean); var wc = words.length;
    var vocab = this.analyzeVocabulary(text); var grammar = this.analyzeGrammar(text); var coherence = this.analyzeCoherence(text);
    var feedback = []; var breakdown = {};
    var pointsCovered = (prompt.requiredPoints || []).filter(function(p) {
      var kws = p.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(function(w) { return w.length > 4; });
      return kws.filter(function(kw) { return text.toLowerCase().includes(kw); }).length >= Math.ceil(kws.length * 0.4);
    }).length;
    breakdown.task = pointsCovered;
    feedback.push(pointsCovered === 3 ? {type:'good',text:'Task completion: All 3 required points addressed.'} : {type:pointsCovered>=2?'ok':'bad',text:'Task completion: '+pointsCovered+' of 3 required points detected.'});
    var wcScore = wc >= 130 && wc <= 180 ? 2 : wc >= 110 ? 1 : 0; breakdown.length = wcScore;
    feedback.push(wc >= 130 && wc <= 180 ? {type:'good',text:'Length: '+wc+' words — excellent.'} : {type:wc>=110?'ok':'bad',text:'Length: '+wc+' words — aim for 130-140.'});
    var politeStarters = ['dear','to whom it may concern'];
    var politeClosers = ['sincerely','kind regards','yours faithfully','best regards','thank you'];
    var politeBody = ['would it be possible','i was wondering','i would appreciate','i would be grateful','could you please','i apologize','please let me know','i look forward'];
    var hasOpening = politeStarters.some(function(w) { return text.toLowerCase().trimStart().startsWith(w); });
    var hasClosing = politeClosers.some(function(w) { return text.toLowerCase().includes(w); });
    var politeBodyCount = politeBody.filter(function(w) { return text.toLowerCase().includes(w); }).length;
    var politeScore = Math.min(2, (hasOpening?0.5:0) + (hasClosing?0.5:0) + Math.min(1, politeBodyCount*0.5));
    breakdown.politeness = Math.round(politeScore);
    feedback.push(politeScore >= 1.5 ? {type:'good',text:'Politeness: Strong formal register with appropriate opening/closing.'} : {type:'ok',text:'Politeness: Add a formal greeting (e.g. "Dear...") and closing (e.g. "Kind regards").'});
    var vocabScore = vocab.academicCount >= 3 ? 1 : vocab.weakCount >= 2 ? 0 : 0.5; breakdown.vocabulary = Math.round(vocabScore);
    feedback.push(vocab.academicCount >= 3 ? {type:'good',text:'Vocabulary: Good use of formal/academic language.'} : {type:'ok',text:'Vocabulary: Try using more formal expressions.'});
    var grammarScore = grammar.issues.length === 0 && grammar.sophisticationScore >= 2 ? 1 : grammar.issues.length === 0 ? 0.5 : 0; breakdown.grammar = Math.round(grammarScore);
    feedback.push(grammarScore >= 1 ? {type:'good',text:'Grammar: Complex sentence structures detected.'} : {type:'ok',text:'Grammar: Try adding more varied sentence structures.'});
    var cohScore = coherence.categories >= 2 ? 1 : coherence.categories >= 1 ? 0.5 : 0; breakdown.coherence = Math.round(cohScore);
    feedback.push(cohScore >= 1 ? {type:'good',text:'Cohesion: Good use of linking words.'} : {type:'ok',text:'Cohesion: Add connectors like "Furthermore", "As a result", "In addition".'});
    var total = Math.min(10, Math.round(pointsCovered + wcScore + politeScore + vocabScore + grammarScore + cohScore));
    return { total:total, breakdown:breakdown, feedback:feedback, wc:wc, band:this.getBand(total) };
  },
  scoreDiscussion: function(text, prompt) {
    var words = text.trim().split(/\s+/).filter(Boolean); var wc = words.length;
    var vocab = this.analyzeVocabulary(text); var grammar = this.analyzeGrammar(text); var coherence = this.analyzeCoherence(text);
    var feedback = []; var breakdown = {};
    var wcScore = wc >= 150 ? 2 : wc >= 120 ? 1.5 : wc >= 90 ? 1 : 0; breakdown.length = Math.round(wcScore);
    feedback.push(wc >= 120 ? {type:'good',text:'Length: '+wc+' words — meets requirement.'} : {type:'bad',text:'Length: '+wc+' words — aim for 120+.'});
    var kws = prompt.keywords || [];
    var kwMatches = kws.filter(function(k) { return text.toLowerCase().includes(k.toLowerCase()); }).length;
    var topicScore = kws.length ? (kwMatches/kws.length >= 0.5 ? 2 : kwMatches/kws.length >= 0.3 ? 1.5 : 1) : 1;
    breakdown.relevance = Math.round(topicScore);
    feedback.push(topicScore >= 2 ? {type:'good',text:'Relevance: Strong — response addresses the topic directly.'} : {type:'ok',text:'Relevance: Try to use more topic-specific vocabulary.'});
    var hasOpinion = /\b(i think|i believe|i argue|in my view|in my opinion|i would argue)\b/i.test(text);
    var hasExample = /\b(for example|for instance|such as|to illustrate|in my experience)\b/i.test(text);
    var hasReasoning = /\b(because|therefore|as a result|consequently|this means|this suggests)\b/i.test(text);
    var argScore = (hasOpinion?0.7:0) + (hasExample?0.7:0) + (hasReasoning?0.6:0);
    breakdown.argument = Math.min(2, Math.round(argScore));
    feedback.push(hasOpinion && hasExample && hasReasoning ? {type:'good',text:'Argument: Clear opinion, example, and reasoning all present.'} : {type:'ok',text:'Argument: Include a clear position, a specific example, and your reasoning.'});
    var studentNames = (prompt.students || []).map(function(s) { return s.name.toLowerCase(); });
    var engages = studentNames.some(function(n) { return text.toLowerCase().includes(n); });
    breakdown.engagement = engages ? 1 : 0;
    feedback.push(engages ? {type:'good',text:'Engagement: Referenced your classmates — excellent.'} : {type:'ok',text:'Engagement: Try referencing classmates by name to show engagement.'});
    var vocabScore = Math.min(1, vocab.academicCount * 0.2 + (vocab.ratio > 60 ? 0.5 : 0.2) - vocab.weakCount * 0.1);
    var grammarScore = Math.min(1, grammar.sophisticationScore * 0.25 + (grammar.issues.length === 0 ? 0.5 : 0));
    var langScore = Math.min(2, vocabScore + grammarScore); breakdown.language = Math.round(langScore);
    feedback.push(langScore >= 1.5 ? {type:'good',text:'Language: Strong vocabulary range and complex structures.'} : {type:'ok',text:'Language: Try incorporating more academic vocabulary.'});
    var cohScore = coherence.categories >= 2 ? 1 : coherence.categories >= 1 ? 0.5 : 0; breakdown.coherence = Math.round(cohScore);
    feedback.push(cohScore >= 1 ? {type:'good',text:'Cohesion: Good use of discourse markers.'} : {type:'ok',text:'Cohesion: Use "However", "Moreover", "Therefore" to connect ideas.'});
    var total = Math.min(10, Math.round(wcScore + topicScore + Math.min(2,argScore) + breakdown.engagement + langScore + cohScore));
    return { total:total, breakdown:breakdown, feedback:feedback, wc:wc, band:this.getBand(total) };
  },
  getBand: function(score) {
    if (score >= 9) return { label:'Advanced', color:'#059669' };
    if (score >= 7) return { label:'Upper Intermediate', color:'#10b981' };
    if (score >= 5) return { label:'Intermediate', color:'#f59e0b' };
    if (score >= 3) return { label:'Lower Intermediate', color:'#f97316' };
    return { label:'Needs Development', color:'#ef4444' };
  },
  renderFeedback: function(result, type) {
    var total = result.total; var breakdown = result.breakdown; var feedback = result.feedback; var wc = result.wc; var band = result.band;
    var labels = {task:'Task Completion',length:'Word Count',politeness:'Politeness',vocabulary:'Vocabulary',grammar:'Grammar',coherence:'Cohesion',relevance:'Relevance',argument:'Argument',engagement:'Engagement',language:'Language'};
    var maxScores = type === 'email' ? {task:3,length:2,politeness:2,vocabulary:1,grammar:1,coherence:1} : {length:2,relevance:2,argument:2,engagement:1,language:2,coherence:1};
    var breakdownHtml = Object.entries(breakdown).map(function(entry) {
      var k = entry[0]; var v = entry[1];
      var max = maxScores[k] || 1; var pct = Math.round((v/max)*100);
      var color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
      return '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.83rem;"><span>'+(labels[k]||k)+'</span><span style="font-weight:700;color:'+color+'">'+v+'/'+max+'</span></div><div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;"><div style="background:'+color+';height:100%;width:'+pct+'%;border-radius:99px;transition:width 0.4s;"></div></div></div>';
    }).join('');
    var feedbackHtml = feedback.map(function(f) {
      var bg = f.type==='good'?'#d1fae5':f.type==='ok'?'#fef3c7':'#fee2e2';
      var border = f.type==='good'?'#10b981':f.type==='ok'?'#f59e0b':'#ef4444';
      return '<div style="background:'+bg+';border-left:3px solid '+border+';padding:8px 12px;border-radius:4px;margin-bottom:6px;font-size:0.87rem;">'+f.text+'</div>';
    }).join('');
    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px;">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">' +
      '<div style="background:conic-gradient('+band.color+' '+(total*10)+'%, #e2e8f0 0%);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<div style="background:#fff;width:60px;height:60px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
      '<span style="font-size:1.4rem;font-weight:900;color:'+band.color+';">'+total+'</span>' +
      '<span style="font-size:0.6rem;color:#64748b;text-transform:uppercase;">/ 10</span></div></div>' +
      '<div><div style="font-size:1.1rem;font-weight:700;">'+band.label+'</div>' +
      '<div style="font-size:0.85rem;color:#64748b;">'+wc+' words written</div></div></div>' +
      '<div style="margin-bottom:16px;">'+breakdownHtml+'</div>' +
      '<div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Detailed Feedback:</div>'+feedbackHtml+'</div>';
  }
};

// =============================================
// AD MANAGEMENT
// =============================================
function showVideoAd(cb) {
  var ov = document.getElementById('videoAd'); if (!ov) { if (cb) cb(); return; }
  ov.style.display = 'flex'; ov._cb = cb; var s = 30;
  document.getElementById('adCountdown').textContent = s;
  var skip = document.getElementById('skipBtn'); skip.classList.remove('visible');
  var t = setInterval(function() {
    s--; document.getElementById('adCountdown').textContent = s;
    if (s <= 5) skip.classList.add('visible');
    if (s <= 0) { clearInterval(t); closeAd(); }
  }, 1000);
  ov._t = t;
}
function closeAd() {
  var ov = document.getElementById('videoAd'); clearInterval(ov._t); ov.style.display = 'none';
  if (typeof ov._cb === 'function') ov._cb();
}

// =============================================
// SESSION SCORE — updates sidebar live
// =============================================
function updateSidebarScore() {
  var correct = results.filter(function(r) { return r && r.correct; }).length;
  var total   = results.filter(function(r) { return r && r.checked; }).length;
  var el = document.getElementById('sideScoreNum');
  if (!el) return;
  if (total === 0) { el.textContent = '—'; return; }
  el.textContent = correct + '/' + total;
  el.style.color = correct / total >= 0.7 ? 'var(--success)' : correct / total >= 0.4 ? 'var(--warning)' : 'var(--danger)';
}
