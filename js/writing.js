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
// LOAD TASK CARDS WITH DYNAMIC QUESTION COUNT
// =============================================
async function preloadTaskCounts() {
  const tasks = [
    { key: 'build-a-sentence', path: DATA_PATHS['build-a-sentence'], countEl: 'count-bas' },
    { key: 'write-email', path: DATA_PATHS['write-email'], countEl: 'count-email' },
    { key: 'academic-discussion', path: DATA_PATHS['academic-discussion'], countEl: 'count-discuss' }
  ];
  for (const t of tasks) {
    try {
      const r = await fetch(t.path);
      const data = await r.json();
      const count = (data.questions || data.prompts || []).length;
      const el = document.getElementById(t.countEl);
      if (el) el.textContent = count + ' questions';
    } catch(e) { console.warn('Could not load count for', t.key); }
  }
}
document.addEventListener('DOMContentLoaded', preloadTaskCounts);

// =============================================
// INTRO MODAL
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

  // Show question count dynamically
  const countEl = document.getElementById('modalQuestionCount');
  if (countEl) countEl.textContent = count + ' questions';

  const el = document.getElementById('modalExpect');
  el.innerHTML = '';
  (data.whatToExpect || []).forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = '<span style="color:var(--success)">✓</span> ' + t;
    li.style.cssText = 'display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';
    el.appendChild(li);
  });
  const tl = document.getElementById('modalTips');
  tl.innerHTML = '';
  (data.tips || []).forEach(t => {
    const li = document.createElement('li'); li.textContent = t; tl.appendChild(li);
  });
  const ov = document.getElementById('introOverlay');
  ov.style.display = 'flex';
  ov.onclick = e => { if (e.target === ov) closeIntroModal(); };
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

  // Hide timer in practice mode
  const timerEl = document.getElementById('timerDisplay');
  if (timerEl) timerEl.style.display = 'none';

  if (currentTask !== 'build-a-sentence') {
    const card = document.getElementById('rubricsCard');
    const rubric = items[0]?.scoringRubric;
    if (rubric && card) {
      card.style.display = 'block';
      document.getElementById('rubricList').innerHTML = Object.entries(rubric).map(([k, v]) =>
        '<li style="padding:5px 0;border-bottom:1px solid var(--border);"><strong style="text-transform:capitalize;">' + k + ':</strong> ' + v + '</li>'
      ).join('');
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
// RENDER
// =============================================
function renderItem() {
  const area = document.getElementById('questionArea');
  const total = items.length;
  document.getElementById('qProgress').textContent = 'Question ' + (currentIdx + 1) + ' of ' + total;
  document.getElementById('progressFill').style.width = ((currentIdx / total) * 100) + '%';
  document.getElementById('prevBtn').style.display = currentIdx > 0 ? 'inline-flex' : 'none';
  document.getElementById('nextBtn').style.display = currentIdx < total - 1 ? 'inline-flex' : 'none';
  document.getElementById('submitBtn').style.display = currentIdx === total - 1 ? 'inline-flex' : 'none';
  area.innerHTML = '';
  if (currentTask === 'build-a-sentence') renderBuildSentence(area, items[currentIdx]);
  else if (currentTask === 'write-email') renderWriteEmail(area, items[currentIdx]);
  else if (currentTask === 'academic-discussion') renderDiscussion(area, items[currentIdx]);
}

// =============================================
// BUILD A SENTENCE — REAL EXAM FORMAT
// =============================================
function renderBuildSentence(area, q) {
  const saved = results[currentIdx]?.placed || [];
  const parts = q.partialSentence.split(/(_____)/).filter(Boolean);
  let blankIdx = 0;
  let sentenceHtml = '<div class="bas-sentence" id="basSlots">';
  parts.forEach(part => {
    if (part === '_____') {
      const word = saved[blankIdx] || '';
      sentenceHtml += `<span class="bas-blank ${word ? 'filled' : ''}" data-slot="${blankIdx}" onclick="removeFromSlot(this)">${word || '<span class=\"bas-blank-hint\">tap to remove</span>'}</span>`;
      blankIdx++;
    } else {
      sentenceHtml += '<span class="bas-fixed">' + part.trim() + '</span>';
    }
  });
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

  const bank = document.getElementById('wordBank');
  const usedWords = saved.filter(Boolean);
  shuffle([...q.scrambled]).filter(w => !usedWords.includes(w)).forEach(w => bank.appendChild(createChip(w)));

  if (results[currentIdx]?.checked) showBASFeedback(q, results[currentIdx]);
}

function createChip(word) {
  const span = document.createElement('span');
  span.className = 'word-chip';
  span.textContent = word;
  span.addEventListener('click', () => placeWordInNextBlank(span));
  return span;
}

function placeWordInNextBlank(chip) {
  const slots = document.querySelectorAll('.bas-blank');
  for (let slot of slots) {
    if (!slot.classList.contains('filled')) {
      slot.textContent = chip.textContent;
      slot.classList.add('filled');
      chip.remove();
      saveBasState();
      return;
    }
  }
}

function removeFromSlot(slotEl) {
  if (!slotEl.classList.contains('filled')) return;
  const word = slotEl.textContent;
  slotEl.innerHTML = '<span class="bas-blank-hint">tap to remove</span>';
  slotEl.classList.remove('filled');
  const bank = document.getElementById('wordBank');
  if (bank) bank.appendChild(createChip(word));
  saveBasState();
}

function saveBasState() {
  const slots = document.querySelectorAll('.bas-blank');
  const placed = [...slots].map(s => s.classList.contains('filled') ? s.textContent.trim() : '');
  results[currentIdx] = { ...(results[currentIdx] || {}), placed };
}

function clearSentence(idx) {
  const slots = document.querySelectorAll('.bas-blank');
  const bank = document.getElementById('wordBank');
  slots.forEach(slot => {
    if (slot.classList.contains('filled')) {
      bank.appendChild(createChip(slot.textContent));
      slot.innerHTML = '<span class="bas-blank-hint">tap to remove</span>';
      slot.classList.remove('filled');
    }
  });
  results[currentIdx] = { placed: [], checked: false };
  const fb = document.getElementById('basFeedback');
  fb.className = 'feedback-panel'; fb.innerHTML = '';
}

function checkSentence(idx) {
  const q = items[idx];
  const slots = document.querySelectorAll('.bas-blank');
  const placed = [...slots].map(s => s.classList.contains('filled') ? s.textContent.trim() : '');
  const correct = JSON.stringify(placed.map(w => w.toLowerCase())) === JSON.stringify(q.answer.map(w => w.toLowerCase()));
  results[idx] = { placed, checked: true, correct };
  showBASFeedback(q, results[idx]);
}

function showBASFeedback(q, result) {
  const fb = document.getElementById('basFeedback');
  if (!fb) return;
  fb.className = 'feedback-panel show ' + (result.correct ? 'correct' : 'incorrect');
  fb.innerHTML = result.correct
    ? '<h4>✅ Correct!</h4><p><strong>' + q.fullSentence + '</strong></p>'
    : '<h4>❌ Not quite.</h4>' +
      '<p style="margin-bottom:6px;">Correct: <strong>' + q.fullSentence + '</strong></p>' +
      '<p style="font-size:0.87rem;color:var(--text-muted);">Extra word: <strong>' + q.extraWord + '</strong> — ' + q.explanation + '</p>';
}

function revealSentence(idx) {
  const q = items[idx];
  const slots = document.querySelectorAll('.bas-blank');
  const bank = document.getElementById('wordBank');
  bank.innerHTML = '';
  slots.forEach((slot, i) => {
    slot.textContent = q.answer[i] || '';
    slot.classList.add('filled');
  });
  const extra = createChip('✗ ' + q.extraWord);
  extra.style.cssText = 'background:#fee2e2;color:#dc2626;cursor:default;';
  bank.appendChild(extra);
  results[idx] = { placed: q.answer, checked: true, correct: true };
  showBASFeedback(q, results[idx]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =============================================
// WRITE AN EMAIL
// =============================================
function renderWriteEmail(area, prompt) {
  const saved = results[currentIdx]?.text || '';
  area.innerHTML =
    '<div class="question-card">' +
    '<div class="question-number">' + (currentIdx + 1) + '</div>' +
    '<h3 style="margin-bottom:14px;">Write an Email</h3>' +
    '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-bottom:16px;font-size:0.93rem;line-height:1.7;">' + prompt.scenario + '</div>' +
    '<div class="required-points"><h4>Required Points (include all three):</h4>' +
    '<ol style="padding-left:20px;margin-top:6px;">' + prompt.requiredPoints.map(p => '<li>' + p + '</li>').join('') + '</ol></div>' +
    '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Write your email below (aim for 130-140 words):</p>' +
    '<textarea class="writing-area" id="emailArea" placeholder="Dear ' + prompt.recipient + ',\n\n...">' + saved + '</textarea>' +
    '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 130-140 words</span></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" id="scoreEmailBtn" onclick="scoreEmail(' + currentIdx + ')">Analyze & Score</button>' +
    '<button class="sample-toggle" onclick="toggleSample('emailSample')">See Sample Answer</button>' +
    '</div><div id="emailFeedbackArea"></div>' +
    '<div class="sample-answer" id="emailSample">' + prompt.sampleResponse + '</div>' +
    '</div>';
  const ta = document.getElementById('emailArea');
  const wc = document.getElementById('wc');
  const update = () => {
    const w = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wc.textContent = w;
    wc.style.color = w >= 130 && w <= 180 ? 'var(--success)' : w > 100 ? 'var(--warning)' : 'var(--danger)';
    results[currentIdx] = { text: ta.value };
  };
  ta.addEventListener('input', update); update();
}

function scoreEmail(idx) {
  const text = document.getElementById('emailArea')?.value || '';
  if (text.trim().split(/\s+/).filter(Boolean).length < 20) {
    document.getElementById('emailFeedbackArea').innerHTML = '<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your email first.</div>';
    return;
  }
  const btn = document.getElementById('scoreEmailBtn');
  if (btn) { btn.textContent = 'Analyzing...'; btn.disabled = true; }
  setTimeout(() => {
    const result = SCORING.scoreEmail(text, items[idx]);
    const area = document.getElementById('emailFeedbackArea');
    if (area) area.innerHTML = SCORING.renderFeedback(result, 'email');
    if (btn) { btn.textContent = 'Re-analyze'; btn.disabled = false; }
  }, 1200);
}

// =============================================
// ACADEMIC DISCUSSION
// =============================================
function renderDiscussion(area, prompt) {
  const saved = results[currentIdx]?.text || '';
  area.innerHTML =
    '<div class="question-card">' +
    '<div class="question-number">' + (currentIdx + 1) + '</div>' +
    '<h3 style="margin-bottom:14px;">Write for an Academic Discussion</h3>' +
    '<div class="discussion-context"><strong style="color:var(--primary);">Professor ' + prompt.professor.name + ':</strong>' +
    '<p style="margin-top:8px;font-size:0.93rem;line-height:1.7;">' + prompt.professor.question + '</p></div>' +
    prompt.students.map(s => '<div class="student-response"><strong>' + s.name + ':</strong><p style="margin-top:6px;font-size:0.9rem;line-height:1.65;">' + s.response + '</p></div>').join('') +
    '<div style="margin-top:20px;">' +
    '<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">Write your response (aim for 120+ words):</p>' +
    '<textarea class="writing-area" id="discussArea" placeholder="Write your contribution here..." style="min-height:180px;">' + saved + '</textarea>' +
    '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 120+ words</span></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary btn-sm" id="scoreDiscBtn" onclick="scoreDiscussion(' + currentIdx + ')">Analyze & Score</button>' +
    '<button class="sample-toggle" onclick="toggleSample('discussSample')">See Sample Answer</button>' +
    '</div></div><div id="discussFeedbackArea"></div>' +
    '<div class="sample-answer" id="discussSample">' + prompt.sampleResponse + '</div>' +
    '</div>';
  const ta = document.getElementById('discussArea');
  const wc = document.getElementById('wc');
  const update = () => {
    const w = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wc.textContent = w;
    wc.style.color = w >= 120 ? 'var(--success)' : w > 80 ? 'var(--warning)' : 'var(--danger)';
    results[currentIdx] = { text: ta.value };
  };
  ta.addEventListener('input', update); update();
}

function scoreDiscussion(idx) {
  const text = document.getElementById('discussArea')?.value || '';
  if (text.trim().split(/\s+/).filter(Boolean).length < 20) {
    document.getElementById('discussFeedbackArea').innerHTML = '<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your response first.</div>';
    return;
  }
  const btn = document.getElementById('scoreDiscBtn');
  if (btn) { btn.textContent = 'Analyzing...'; btn.disabled = true; }
  setTimeout(() => {
    const result = SCORING.scoreDiscussion(text, items[idx]);
    const area = document.getElementById('discussFeedbackArea');
    if (area) area.innerHTML = SCORING.renderFeedback(result, 'discussion');
    if (btn) { btn.textContent = 'Re-analyze'; btn.disabled = false; }
  }, 1400);
}

// =============================================
// HELPERS
// =============================================
function toggleSample(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'block' ? 'none' : 'block';
}
function nextQ() { if (currentIdx < items.length - 1) { currentIdx++; renderItem(); window.scrollTo(0,0); } }
function prevQ() { if (currentIdx > 0) { currentIdx--; renderItem(); window.scrollTo(0,0); } }
function finishTask() {
  document.getElementById('questionArea').innerHTML = '';
  document.getElementById('navBtns').style.display = 'none';
  const bb = document.getElementById('backToTasksBtn'); if (bb) bb.style.display = 'none';
  let correct = currentTask === 'build-a-sentence' ? results.filter(r => r?.correct).length : 0;
  const sum = document.getElementById('scoreSummary');
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
// SCORING ENGINE (unchanged)
// =============================================
const SCORING = {
  analyzeSentences(text) {
    const sents = text.match(/[^.!?]+[.!?]+/g) || [];
    if (!sents.length) return { count:0, avgLen:0, hasComplex:false, hasSimple:false, hasCompound:false, variety:0 };
    const lens = sents.map(s => s.trim().split(/\s+/).length);
    const avg = lens.reduce((a,b)=>a+b,0)/lens.length;
    const hasComplex = sents.some(s=>/although|because|since|while|whereas|however|therefore|furthermore|moreover|nevertheless|consequently|despite|unless|until|whenever/.test(s.toLowerCase()));
    const hasCompound = sents.some(s=>/,\s*(and|but|or|so|yet|for|nor)\s/.test(s));
    const hasSimple = sents.some(s=>s.trim().split(/\s+/).length<10);
    return {count:sents.length,avgLen:Math.round(avg),hasComplex,hasSimple,hasCompound,variety:(hasComplex?1:0)+(hasCompound?1:0)+(hasSimple?1:0)};
  },
  analyzeVocabulary(text) {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];
    const unique = new Set(words);
    const ratio = words.length ? unique.size/words.length : 0;
    const academicWords=['furthermore','moreover','however','consequently','therefore','nevertheless','alternatively','significantly','demonstrate','indicate','suggest','evidence','argue','contend','perspective','consideration','substantial','fundamental','emphasize','acknowledge','conclude','examine','analyze','assess','evaluate','implement','establish','maintain','ensure','facilitate','contribute','represent','influence','determine','identify','propose','address','complex','significant','effective','essential','relevant','appropriate','specific','particular'];
    const formalWords=['would it be possible','i was wondering','i appreciate','i acknowledge','i recognize','it is worth noting','it should be noted','one could argue','this demonstrates','this suggests','in addition','in contrast','on the other hand','as a result','for instance','for example','in my view','in conclusion'];
    const weakWords=['good','bad','nice','thing','stuff','a lot','very very','really really'];
    return {ratio:Math.round(ratio*100),academicCount:academicWords.filter(w=>text.toLowerCase().includes(w)).length,formalCount:formalWords.filter(w=>text.toLowerCase().includes(w)).length,weakCount:weakWords.filter(w=>text.toLowerCase().includes(w)).length,uniqueWords:unique.size};
  },
  analyzeGrammar(text) {
    const issues=[];
    if(/\bi is\b/i.test(text))issues.push('subject-verb agreement');
    if(/\bhe have\b|\bshe have\b|\bit have\b/i.test(text))issues.push('subject-verb agreement');
    if(/\btheir is\b/i.test(text))issues.push('there/their confusion');
    const hasPassive=/\b(is|are|was|were|been|being)\s+\w+ed\b/.test(text);
    const hasConditional=/\b(if|unless|should|would|could|might)\b.*\b(then|would|could|might)\b/i.test(text);
    const hasPerfect=/\b(have|has|had)\s+\w+(ed|en)\b/.test(text);
    const hasParticiple=/\w+ing\s+\w+/.test(text);
    return{issues,sophisticationScore:(hasPassive?1:0)+(hasConditional?1:0)+(hasPerfect?1:0)+(hasParticiple?1:0),hasPassive,hasConditional,hasPerfect};
  },
  analyzeCoherence(text) {
    const devices={addition:['furthermore','moreover','in addition','additionally','also','besides'],contrast:['however','nevertheless','on the other hand','in contrast','although','despite','while','whereas','yet'],cause:['therefore','consequently','as a result','thus','hence','because','since'],example:['for example','for instance','such as','to illustrate','namely'],emphasis:['indeed','in fact','clearly','importantly'],concession:['admittedly','granted','of course','even though']};
    let total=0; const found={};
    for(const[type,words]of Object.entries(devices)){found[type]=words.filter(w=>text.toLowerCase().includes(w)).length;total+=found[type];}
    return{total,categories:Object.values(found).filter(v=>v>0).length,found};
  },
  scoreEmail(text,prompt) {
    const words=text.trim().split(/\s+/).filter(Boolean);const wc=words.length;
    const vocab=this.analyzeVocabulary(text);const grammar=this.analyzeGrammar(text);const coherence=this.analyzeCoherence(text);
    const feedback=[];const breakdown={};
    const pointsCovered=(prompt.requiredPoints||[]).filter(p=>{const kws=p.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(w=>w.length>4);return kws.filter(kw=>text.toLowerCase().includes(kw)).length>=Math.ceil(kws.length*0.4);}).length;
    breakdown.task=pointsCovered;
    if(pointsCovered===3)feedback.push({type:'good',text:'Task completion: All 3 required points addressed.'});
    else feedback.push({type:pointsCovered>=2?'ok':'bad',text:'Task completion: '+pointsCovered+' of 3 required points detected.'});
    let wcScore=wc>=130&&wc<=180?2:wc>=110?1:0;breakdown.length=wcScore;
    if(wc>=130&&wc<=180)feedback.push({type:'good',text:'Length: '+wc+' words - excellent.'});
    else feedback.push({type:wc>=110?'ok':'bad',text:'Length: '+wc+' words - aim for 130-140.'});
    const politeStarters=['dear','to whom it may concern'];const politeClosers=['sincerely','kind regards','yours faithfully','best regards','thank you'];
    const politeBody=['would it be possible','i was wondering','i would appreciate','i would be grateful','could you please','i regret','i apologize','please let me know','i look forward'];
    const hasOpening=politeStarters.some(w=>text.toLowerCase().trimStart().startsWith(w));
    const hasClosing=politeClosers.some(w=>text.toLowerCase().includes(w));
    const politeBodyCount=politeBody.filter(w=>text.toLowerCase().includes(w)).length;
    const politeScore=Math.min(2,(hasOpening?0.5:0)+(hasClosing?0.5:0)+Math.min(1,politeBodyCount*0.5));
    breakdown.politeness=Math.round(politeScore);
    if(politeScore>=1.5)feedback.push({type:'good',text:'Politeness: Strong formal register.'});
    else feedback.push({type:'ok',text:'Politeness: Add formal greeting/closing.'});
    const vocabScore=vocab.academicCount>=3?1:vocab.weakCount>=2?0:0.5;breakdown.vocabulary=Math.round(vocabScore);
    if(vocab.academicCount>=3)feedback.push({type:'good',text:'Vocabulary: Good use of formal language.'});
    else feedback.push({type:'ok',text:'Vocabulary: Try more formal expressions.'});
    const grammarScore=grammar.issues.length===0&&grammar.sophisticationScore>=2?1:grammar.issues.length===0?0.5:0;breakdown.grammar=Math.round(grammarScore);
    if(grammarScore>=1)feedback.push({type:'good',text:'Grammar: Complex structures detected.'});
    else feedback.push({type:'ok',text:'Grammar: Add more varied sentence structures.'});
    const cohScore=coherence.categories>=2?1:coherence.categories>=1?0.5:0;breakdown.coherence=Math.round(cohScore);
    if(cohScore>=1)feedback.push({type:'good',text:'Cohesion: Good use of linking words.'});
    else feedback.push({type:'ok',text:'Cohesion: Add connectors like "Furthermore", "As a result".'});
    const total=Math.min(10,Math.round(pointsCovered+wcScore+politeScore+vocabScore+grammarScore+cohScore));
    return{total,breakdown,feedback,wc,band:this.getBand(total)};
  },
  scoreDiscussion(text,prompt) {
    const words=text.trim().split(/\s+/).filter(Boolean);const wc=words.length;
    const vocab=this.analyzeVocabulary(text);const grammar=this.analyzeGrammar(text);const coherence=this.analyzeCoherence(text);
    const feedback=[];const breakdown={};
    let wcScore=wc>=150?2:wc>=120?1.5:wc>=90?1:0;breakdown.length=Math.round(wcScore);
    if(wc>=150)feedback.push({type:'good',text:'Length: '+wc+' words - excellent.'});
    else feedback.push({type:wc>=120?'ok':'bad',text:'Length: '+wc+' words - aim for 120+.'});
    const kws=prompt.keywords||[];const kwMatches=kws.filter(k=>text.toLowerCase().includes(k.toLowerCase())).length;
    const kwRatio=kws.length?kwMatches/kws.length:0;const topicScore=kwRatio>=0.5?2:kwRatio>=0.3?1.5:kwRatio>=0.1?1:0;
    breakdown.relevance=Math.round(topicScore);
    if(topicScore>=2)feedback.push({type:'good',text:'Relevance: Addresses the topic directly.'});
    else feedback.push({type:'ok',text:'Relevance: Stay on topic and use key terms.'});
    const hasOpinion=/\b(i think|i believe|i argue|in my view|in my opinion|i would argue)\b/i.test(text);
    const hasExample=/\b(for example|for instance|such as|to illustrate|in my experience)\b/i.test(text);
    const hasReasoning=/\b(because|therefore|as a result|consequently|this means|this suggests)\b/i.test(text);
    const argScore=(hasOpinion?0.7:0)+(hasExample?0.7:0)+(hasReasoning?0.6:0);breakdown.argument=Math.min(2,Math.round(argScore));
    if(hasOpinion&&hasExample&&hasReasoning)feedback.push({type:'good',text:'Argument: Clear opinion, example, and reasoning present.'});
    else feedback.push({type:'ok',text:'Argument: Add a clear position, example, and reasoning.'});
    const studentNames=(prompt.students||[]).map(s=>s.name.toLowerCase());
    const engages=studentNames.some(n=>text.toLowerCase().includes(n));
    breakdown.engagement=engages?1:0;
    if(engages)feedback.push({type:'good',text:'Engagement: Referenced classmates - excellent.'});
    else feedback.push({type:'ok',text:'Engagement: Try referencing your classmates by name.'});
    const vocabScore=Math.min(1,vocab.academicCount*0.2+(vocab.ratio>60?0.5:0.2)-vocab.weakCount*0.1);
    const grammarScore=Math.min(1,grammar.sophisticationScore*0.25+(grammar.issues.length===0?0.5:0));
    const langScore=Math.min(2,vocabScore+grammarScore);breakdown.language=Math.round(langScore);
    if(langScore>=1.5)feedback.push({type:'good',text:'Language: Strong vocabulary and complex structures.'});
    else feedback.push({type:'ok',text:'Language: Use more academic vocabulary.'});
    const cohScore=coherence.categories>=2?1:coherence.categories>=1?0.5:0;breakdown.coherence=Math.round(cohScore);
    if(cohScore>=1)feedback.push({type:'good',text:'Cohesion: Good use of discourse markers.'});
    else feedback.push({type:'ok',text:'Cohesion: Use "However", "Moreover", "Therefore".'});
    const total=Math.min(10,Math.round(wcScore+topicScore+Math.min(2,argScore)+breakdown.engagement+langScore+cohScore));
    return{total,breakdown,feedback,wc,band:this.getBand(total)};
  },
  getBand(score) {
    if(score>=9)return{label:'Advanced',color:'#059669'};
    if(score>=7)return{label:'Upper Intermediate',color:'#10b981'};
    if(score>=5)return{label:'Intermediate',color:'#f59e0b'};
    if(score>=3)return{label:'Lower Intermediate',color:'#f97316'};
    return{label:'Needs Development',color:'#ef4444'};
  },
  renderFeedback(result,type) {
    const{total,breakdown,feedback,wc,band}=result;
    const labels={task:'Task Completion',length:'Word Count',politeness:'Politeness',vocabulary:'Vocabulary',grammar:'Grammar',coherence:'Cohesion',relevance:'Relevance',argument:'Argument',engagement:'Engagement',language:'Language'};
    const maxScores=type==='email'?{task:3,length:2,politeness:2,vocabulary:1,grammar:1,coherence:1}:{length:2,relevance:2,argument:2,engagement:1,language:2,coherence:1};
    const breakdownHtml=Object.entries(breakdown).map(([k,v])=>{
      const max=maxScores[k]||1;const pct=Math.round((v/max)*100);
      const color=pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444';
      return '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.83rem;"><span>'+(labels[k]||k)+'</span><span style="font-weight:700;color:'+color+'">'+v+'/'+max+'</span></div><div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;"><div style="background:'+color+';height:100%;width:'+pct+'%;border-radius:99px;transition:width 0.4s;"></div></div></div>';
    }).join('');
    const feedbackHtml=feedback.map(f=>{
      const bg=f.type==='good'?'#d1fae5':f.type==='ok'?'#fef3c7':'#fee2e2';
      const border=f.type==='good'?'#10b981':f.type==='ok'?'#f59e0b':'#ef4444';
      return '<div style="background:'+bg+';border-left:3px solid '+border+';padding:8px 12px;border-radius:4px;margin-bottom:6px;font-size:0.87rem;">'+f.text+'</div>';
    }).join('');
    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px;">'+
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">'+
      '<div style="background:conic-gradient('+band.color+' '+(total*10)+'%, #e2e8f0 0%);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+
      '<div style="background:#fff;width:60px;height:60px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">'+
      '<span style="font-size:1.4rem;font-weight:900;color:'+band.color+';">'+total+'</span>'+
      '<span style="font-size:0.6rem;color:#64748b;text-transform:uppercase;">/ 10</span></div></div>'+
      '<div><div style="font-size:1.1rem;font-weight:700;">'+band.label+'</div>'+
      '<div style="font-size:0.85rem;color:#64748b;">'+wc+' words written</div></div></div>'+
      '<div style="margin-bottom:16px;">'+breakdownHtml+'</div>'+
      '<div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Detailed Feedback:</div>'+feedbackHtml+'</div>';
  }
};

// =============================================
// AD MANAGEMENT
// =============================================
function showVideoAd(cb) {
  const ov=document.getElementById('videoAd');if(!ov)return cb&&cb();
  ov.style.display='flex';ov._cb=cb;let s=30;
  document.getElementById('adCountdown').textContent=s;
  const skip=document.getElementById('skipBtn');skip.classList.remove('visible');
  const t=setInterval(()=>{s--;document.getElementById('adCountdown').textContent=s;if(s<=5)skip.classList.add('visible');if(s<=0){clearInterval(t);closeAd();}},1000);
  ov._t=t;
}
function closeAd() {
  const ov=document.getElementById('videoAd');clearInterval(ov._t);ov.style.display='none';
  if(typeof ov._cb==='function')ov._cb();
}
