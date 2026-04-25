/* =============================================
   TOEFL Prep Hub – Mock Test JS
   Orchestrates Reading → Writing → Results
   (Video ads removed — pending Ad Manager approval)
   ============================================= */

   const SECTIONS = [
    {
      name: 'Reading', icon: '📖', label: 'Section 1 – Reading',
      tasks: [
        { file: 'data/reading/q1.json', type: 'reading' },
        { file: 'data/reading/q2.json', type: 'reading' },
        { file: 'data/reading/q3.json', type: 'reading' }
      ]
    },
    {
      name: 'Writing', icon: '✍️', label: 'Section 2 – Writing',
      tasks: [
        { file: 'data/writing/q1.json', type: 'writing' },
        { file: 'data/writing/q2.json', type: 'writing' },
        { file: 'data/writing/q3.json', type: 'writing' }
      ]
    }
  ];
  
  let currentSection = 0;
  let allData = [];
  let flatQuestions = [];
  let currentQ = 0;
  let answers = {};
  let timerInterval = null;
  let timeLeft = 0;
  let sectionScores = [];
  
  // =============================================
  // START
  // =============================================
  async function startMock() {
    document.getElementById('mockIntro').style.display = 'none';
    document.getElementById('testArea').style.display = 'block';
    await loadSection(0);
  }
  
  async function loadSection(idx) {
    currentSection = idx;
    var sec = SECTIONS[idx];
    document.getElementById('sectionLabel').textContent = sec.label;
    answers = {};
    currentQ = 0;
  
    allData = await Promise.all(sec.tasks.map(function(t) {
      return fetch(t.file).then(function(r) { return r.json(); });
    }));
  
    flatQuestions = [];
    var totalTime = 0;
  
    allData.forEach(function(data, di) {
      totalTime += data.timeSeconds || 600;
      var type = data.taskType;
  
      if (type === 'complete-the-words') {
        data.passages.forEach(function(p, pi) {
          flatQuestions.push({ kind: 'cloze', data: data, passage: p, passageIdx: pi, taskIdx: di });
        });
      } else if (type === 'reading-daily-life' || type === 'academic-reading') {
        data.passages.forEach(function(p) {
          p.questions.forEach(function(q, qi) {
            flatQuestions.push({ kind: 'mcq', data: data, passage: p, question: q, qIdx: qi, taskIdx: di });
          });
        });
      } else if (type === 'build-a-sentence') {
        data.questions.forEach(function(q, qi) {
          flatQuestions.push({ kind: 'bas', data: data, question: q, qIdx: qi, taskIdx: di });
        });
      } else if (type === 'write-email') {
        var prompts = data.prompts || data.questions || [];
        prompts.forEach(function(p, pi) {
          flatQuestions.push({ kind: 'email', data: data, prompt: p, promptIdx: pi, taskIdx: di });
        });
      } else if (type === 'academic-discussion') {
        var prompts = data.prompts || data.questions || [];
        prompts.forEach(function(p, pi) {
          flatQuestions.push({ kind: 'discussion', data: data, prompt: p, promptIdx: pi, taskIdx: di });
        });
      }
    });
  
    timeLeft = totalTime;
    startTimer();
    renderQ();
  }
  
  // =============================================
  // RENDER DISPATCHER
  // =============================================
  function renderQ() {
    var area = document.getElementById('testQuestionArea');
    var total = flatQuestions.length;
    var q = flatQuestions[currentQ];
  
    document.getElementById('testHeading').textContent = q.data.taskTitle;
    document.getElementById('testProgress').textContent = 'Question ' + (currentQ + 1) + ' of ' + total;
    document.getElementById('testProgressFill').style.width = ((currentQ / total) * 100) + '%';
    document.getElementById('testPrevBtn').style.display   = currentQ > 0 ? 'inline-flex' : 'none';
    document.getElementById('testNextBtn').style.display   = currentQ < total - 1 ? 'inline-flex' : 'none';
    document.getElementById('testSubmitBtn').style.display = currentQ === total - 1 ? 'inline-flex' : 'none';
  
    area.innerHTML = '';
    if      (q.kind === 'cloze')      renderCloze(area, q);
    else if (q.kind === 'mcq')        renderMCQ(area, q);
    else if (q.kind === 'bas')        renderBAS(area, q);
    else if (q.kind === 'email')      renderEmail(area, q);
    else if (q.kind === 'discussion') renderDiscussion(area, q);
  }
  
  // =============================================
  // CLOZE
  // =============================================
  function renderCloze(area, item) {
    var p = item.passage;
    area.innerHTML =
      '<div class="question-card">' +
      '<div class="question-number">' + (item.passageIdx + 1) + '</div>' +
      '<p style="margin-bottom:16px;font-weight:600;">Fill in the missing letters to complete each word.</p>' +
      '<div class="cloze-text" id="clozeText"></div>' +
      '<button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="checkCloze_mock(\'' + item.passageIdx + '-' + item.taskIdx + '\')">Check</button>' +
      '<div class="feedback-panel" id="clozeFB"></div>' +
      '</div>';
  
    var ct = document.getElementById('clozeText');
    var html = '';
    p.segments.forEach(function(seg, i) {
      html += seg.before;
      if (seg.word) {
        html += '<strong>' + seg.hint + '</strong>' +
          '<input class="cloze-input" id="ci-' + i + '" data-answer="' + seg.word.slice(seg.hint.length) + '" style="width:' + Math.max(60, seg.word.length * 14) + 'px" autocomplete="off" autocorrect="off" spellcheck="false"/>';
      }
    });
    ct.innerHTML = html;
  }
  
  function checkCloze_mock(key) {
    var inputs = document.querySelectorAll('[id^="ci-"]');
    var correct = 0;
    inputs.forEach(function(inp) {
      inp.classList.remove('correct-ans', 'wrong-ans');
      if (inp.value.trim().toLowerCase() === inp.dataset.answer.toLowerCase()) {
        inp.classList.add('correct-ans'); correct++;
      } else {
        inp.classList.add('wrong-ans');
      }
    });
    var fb = document.getElementById('clozeFB');
    fb.className = 'feedback-panel show ' + (correct >= inputs.length * 0.7 ? 'correct' : 'partial');
    fb.innerHTML = '<h4>Score: ' + correct + '/' + inputs.length + '</h4>';
    answers[key] = { correct: correct, total: inputs.length };
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
      passHTML = '<div class="passage-box"><h4>📄 ' + lbl + '</h4><div style="white-space:pre-line;font-size:0.95rem;">' + p.text + '</div></div>';
    }
  
    area.innerHTML = passHTML +
      '<div class="question-card">' +
      '<div class="question-number">Q' + (item.qIdx + 1) + '</div>' +
      '<div class="question-text">' + q.text + '</div>' +
      '<ul class="options-list">' +
      q.options.map(function(o, i) {
        var cls = saved !== undefined ? (i === q.answer ? 'correct' : (i === saved ? 'incorrect' : '')) : (saved === i ? 'selected' : '');
        return '<li class="option-item ' + cls + '" onclick="pickMCQ(\'' + q.id + '\',' + i + ',' + q.answer + ')" id="mopt-' + q.id + '-' + i + '">' +
          '<span class="option-letter">' + String.fromCharCode(65 + i) + '</span><span>' + o + '</span></li>';
      }).join('') +
      '</ul>' +
      (saved !== undefined
        ? '<div class="feedback-panel show ' + (saved === q.answer ? 'correct' : 'incorrect') + '"><h4>' + (saved === q.answer ? '✅ Correct' : '❌ Incorrect') + '</h4><p>' + q.explanation + '</p></div>'
        : '<div class="feedback-panel" id="mcqFB"></div>') +
      '</div>';
  }
  
  function pickMCQ(id, sel, ans) {
    if (answers[id] !== undefined) return;
    answers[id] = sel;
    document.querySelectorAll('[id^="mopt-' + id + '-"]').forEach(function(el, i) {
      el.onclick = null;
      if (i === ans) el.classList.add('correct');
      else if (i === sel) el.classList.add('incorrect');
    });
    var fb = document.getElementById('mcqFB');
    if (fb) {
      var q = flatQuestions[currentQ].question;
      fb.className = 'feedback-panel show ' + (sel === ans ? 'correct' : 'incorrect');
      fb.innerHTML = '<h4>' + (sel === ans ? '✅ Correct' : '❌ Incorrect') + '</h4><p>' + q.explanation + '</p>';
    }
  }
  
  // =============================================
  // BUILD A SENTENCE — new exam format
  // (tap to fill blanks, one extra word)
  // =============================================
  function renderBAS(area, item) {
    var q = item.question;
    var saved = (answers['bas-placed-' + item.qIdx]) || [];
  
    // Build partial sentence with blank slots
    var parts = q.partialSentence.split('_____');
    var blankIdx = 0;
    var sentenceHtml = '<div class="bas-sentence" id="basSlots-mock">';
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] !== '') {
        sentenceHtml += '<span class="bas-fixed">' + parts[i].trim() + '</span>';
      }
      if (i < parts.length - 1) {
        var word = saved[blankIdx] || '';
        sentenceHtml += '<span class="bas-blank' + (word ? ' filled' : '') + '" data-slot="' + blankIdx + '" onclick="removeBASSlot_mock(this)">' +
          (word ? word : '<span class="bas-blank-hint">tap</span>') + '</span>';
        blankIdx++;
      }
    }
    sentenceHtml += '</div>';
  
    area.innerHTML =
      '<div class="question-card">' +
      '<div class="question-number">' + (item.qIdx + 1) + '</div>' +
      '<p class="bas-prompt">' + q.prompt + '</p>' +
      '<div class="bas-sentence-wrapper">' + sentenceHtml + '</div>' +
      '<p style="font-size:0.83rem;color:var(--text-muted);margin:10px 0 6px;">👆 Tap words to fill blanks. One word is extra.</p>' +
      '<div class="word-bank" id="wb-mock"></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">' +
      '<button class="btn btn-primary btn-sm" onclick="checkBAS_mock(' + item.qIdx + ')">Check</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="clearBAS_mock(' + item.qIdx + ')">Clear</button>' +
      '</div>' +
      '<div class="feedback-panel" id="basFB"></div>' +
      '</div>';
  
    var bank = document.getElementById('wb-mock');
    var usedWords = saved.filter(Boolean);
    shuffle(q.scrambled.slice()).filter(function(w) {
      return usedWords.indexOf(w) === -1;
    }).forEach(function(w) {
      bank.appendChild(createMockChip(w, item.qIdx));
    });
  
    if (answers['bas-' + item.qIdx] !== undefined) {
      showBASFeedback_mock(q, answers['bas-' + item.qIdx]);
    }
  }
  
  function createMockChip(word, qIdx) {
    var span = document.createElement('span');
    span.className = 'word-chip';
    span.textContent = word;
    span.addEventListener('click', function() { placeBASWord_mock(span); });
    return span;
  }
  
  function placeBASWord_mock(chip) {
    var slots = document.querySelectorAll('.bas-blank');
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].classList.contains('filled')) {
        slots[i].textContent = chip.textContent;
        slots[i].classList.add('filled');
        chip.remove();
        saveBASState_mock();
        return;
      }
    }
  }
  
  function removeBASSlot_mock(slotEl) {
    if (!slotEl.classList.contains('filled')) return;
    var word = slotEl.textContent;
    slotEl.innerHTML = '<span class="bas-blank-hint">tap</span>';
    slotEl.classList.remove('filled');
    var bank = document.getElementById('wb-mock');
    if (bank) {
      var chip = document.createElement('span');
      chip.className = 'word-chip';
      chip.textContent = word;
      chip.addEventListener('click', function() { placeBASWord_mock(chip); });
      bank.appendChild(chip);
    }
    saveBASState_mock();
  }
  
  function saveBASState_mock() {
    var slots = document.querySelectorAll('.bas-blank');
    var placed = Array.from(slots).map(function(s) {
      return s.classList.contains('filled') ? s.textContent.trim() : '';
    });
    answers['bas-placed-' + currentQ] = placed;
  }
  
  function clearBAS_mock(qi) {
    var slots = document.querySelectorAll('.bas-blank');
    var bank = document.getElementById('wb-mock');
    slots.forEach(function(slot) {
      if (slot.classList.contains('filled')) {
        var chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = slot.textContent;
        chip.addEventListener('click', function() { placeBASWord_mock(chip); });
        bank.appendChild(chip);
        slot.innerHTML = '<span class="bas-blank-hint">tap</span>';
        slot.classList.remove('filled');
      }
    });
    answers['bas-placed-' + qi] = [];
    var fb = document.getElementById('basFB');
    if (fb) { fb.className = 'feedback-panel'; fb.innerHTML = ''; }
  }
  
  function checkBAS_mock(qi) {
    var q = flatQuestions[currentQ].question;
    var slots = document.querySelectorAll('.bas-blank');
    var placed = Array.from(slots).map(function(s) {
      return s.classList.contains('filled') ? s.textContent.trim() : '';
    });
    var correct = JSON.stringify(placed.map(function(w) { return w.toLowerCase(); })) ===
                  JSON.stringify(q.answer.map(function(w) { return w.toLowerCase(); }));
    answers['bas-' + qi] = { correct: correct, placed: placed };
    showBASFeedback_mock(q, answers['bas-' + qi]);
  }
  
  function showBASFeedback_mock(q, result) {
    var fb = document.getElementById('basFB');
    if (!fb) return;
    fb.className = 'feedback-panel show ' + (result.correct ? 'correct' : 'incorrect');
    fb.innerHTML = result.correct
      ? '<h4>✅ Correct!</h4><p><strong>' + q.fullSentence + '</strong></p>'
      : '<h4>❌ Not quite.</h4><p>Correct: <strong>' + q.fullSentence + '</strong></p>' +
        '<p style="font-size:0.87rem;color:var(--text-muted);">Extra word: <strong>' + q.extraWord + '</strong></p>';
  }
  
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
  
  // =============================================
  // EMAIL
  // =============================================
  function renderEmail(area, item) {
    var p = item.prompt;
    var saved = answers['email-' + item.promptIdx] || '';
    area.innerHTML =
      '<div class="question-card">' +
      '<div class="question-number">' + (item.promptIdx + 1) + '</div>' +
      '<h3 style="margin-bottom:12px;">📧 Write an Email</h3>' +
      '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:18px;margin-bottom:14px;font-size:0.92rem;line-height:1.7;">' + p.scenario + '</div>' +
      '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;">' +
      '<strong style="color:var(--accent);">Include all three:</strong>' +
      '<ol style="padding-left:18px;margin-top:6px;">' +
      p.requiredPoints.map(function(r) { return '<li style="margin-bottom:4px;font-size:0.88rem;">' + r + '</li>'; }).join('') +
      '</ol></div>' +
      '<textarea class="writing-area" id="emailTA" placeholder="Dear ' + p.recipient + ',&#10;&#10;..." style="min-height:180px;">' + saved + '</textarea>' +
      '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="emailWC">0</span></span><span>Target: 130–140</span></div>' +
      '</div>';
  
    var ta = document.getElementById('emailTA');
    var wc = document.getElementById('emailWC');
    var update = function() {
      var w = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = w;
      wc.style.color = w >= 130 && w <= 180 ? 'var(--success)' : w > 100 ? 'var(--warning)' : 'var(--danger)';
      answers['email-' + item.promptIdx] = ta.value;
    };
    ta.addEventListener('input', update); update();
  }
  
  // =============================================
  // DISCUSSION
  // =============================================
  function renderDiscussion(area, item) {
    var p = item.prompt;
    var saved = answers['disc-' + item.promptIdx] || '';
    area.innerHTML =
      '<div class="question-card">' +
      '<div class="question-number">' + (item.promptIdx + 1) + '</div>' +
      '<h3 style="margin-bottom:12px;">💬 Academic Discussion</h3>' +
      '<div style="background:#f8faff;border:1px solid #ddd6fe;border-radius:var(--radius-sm);padding:18px;margin-bottom:12px;">' +
      '<strong style="color:var(--primary);">Professor ' + p.professor.name + ':</strong>' +
      '<p style="margin-top:8px;font-size:0.92rem;line-height:1.7;">' + p.professor.question + '</p></div>' +
      p.students.map(function(s) {
        return '<div style="background:var(--surface2);border-left:3px solid var(--primary-light);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;">' +
          '<strong style="color:var(--primary);">' + s.name + ':</strong>' +
          '<p style="margin-top:6px;font-size:0.88rem;line-height:1.65;">' + s.response + '</p></div>';
      }).join('') +
      '<textarea class="writing-area" id="discussTA" placeholder="Write your response..." style="min-height:160px;margin-top:12px;">' + saved + '</textarea>' +
      '<div class="word-count-bar"><span>Words: <span class="word-count-num" id="discWC">0</span></span><span>Target: 120+</span></div>' +
      '</div>';
  
    var ta = document.getElementById('discussTA');
    var wc = document.getElementById('discWC');
    var update = function() {
      var w = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = w;
      wc.style.color = w >= 120 ? 'var(--success)' : w > 80 ? 'var(--warning)' : 'var(--danger)';
      answers['disc-' + item.promptIdx] = ta.value;
    };
    ta.addEventListener('input', update); update();
  }
  
  // =============================================
  // NAVIGATION
  // =============================================
  function testNext() {
    if (currentQ < flatQuestions.length - 1) { currentQ++; renderQ(); window.scrollTo(0, 0); }
  }
  function testPrev() {
    if (currentQ > 0) { currentQ--; renderQ(); window.scrollTo(0, 0); }
  }
  
  // =============================================
  // SUBMIT SECTION
  // =============================================
  function submitSection() {
    stopTimer();
  
    var correct = 0, total = 0;
    flatQuestions.forEach(function(q, i) {
      if (q.kind === 'mcq') {
        total++;
        if (answers[q.question.id] === q.question.answer) correct++;
      } else if (q.kind === 'bas') {
        total++;
        if (answers['bas-' + q.qIdx] && answers['bas-' + q.qIdx].correct) correct++;
      } else if (q.kind === 'cloze') {
        var key = q.passageIdx + '-' + q.taskIdx;
        if (answers[key]) { total += answers[key].total; correct += answers[key].correct; }
      }
    });
  
    sectionScores.push({ section: SECTIONS[currentSection].name, correct: correct, total: total });
  
    document.getElementById('testArea').style.display = 'none';
    var trans = document.getElementById('transitionArea');
    trans.style.display = 'block';
    var hasNext = currentSection < SECTIONS.length - 1;
    document.getElementById('transIcon').textContent  = hasNext ? '✍️' : '🎉';
    document.getElementById('transTitle').textContent  = hasNext ? SECTIONS[currentSection].name + ' Section Done!' : 'Test Complete!';
    document.getElementById('transMsg').textContent    = hasNext
      ? 'Great work! Up next: the ' + SECTIONS[currentSection + 1].name + ' section.'
      : 'You have completed both sections. View your results below.';
    document.getElementById('transContinueBtn').textContent = hasNext ? 'Continue →' : 'See Full Results →';
  }
  
  function continueToNext() {
    document.getElementById('transitionArea').style.display = 'none';
    var hasNext = currentSection < SECTIONS.length - 1;
    if (hasNext) {
      document.getElementById('testArea').style.display = 'block';
      loadSection(currentSection + 1);
    } else {
      showFinalResults();
    }
  }
  
  // =============================================
  // FINAL RESULTS
  // =============================================
  function showFinalResults() {
    var el = document.getElementById('finalResults');
    el.style.display = 'block';
    var totalC = sectionScores.reduce(function(a, s) { return a + s.correct; }, 0);
    var totalT = sectionScores.reduce(function(a, s) { return a + s.total; }, 0);
    var overall = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  
    el.innerHTML =
      '<div class="score-summary" style="margin-bottom:24px;">' +
      '<h2>🎉 Mock Test Complete!</h2>' +
      '<div class="score-circle" style="background:conic-gradient(var(--primary) ' + overall + '%, var(--surface2) 0%);">' +
      '<div class="score-inner"><span class="score-num">' + overall + '%</span><span class="score-label">Overall</span></div></div>' +
      '<p style="color:var(--text-muted);margin-bottom:20px;">You answered <strong>' + totalC + '/' + totalT + '</strong> scored questions correctly.</p>' +
      '</div>' +
      sectionScores.map(function(s) {
        var pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        return '<div class="card" style="margin-bottom:16px;">' +
          '<h3 style="margin-bottom:12px;">' + (s.section === 'Reading' ? '📖' : '✍️') + ' ' + s.section + ' Section</h3>' +
          '<div class="progress-bar-wrap" style="margin-bottom:8px;"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<p style="color:var(--text-muted);font-size:0.9rem;">' + s.correct + ' / ' + s.total + ' correct (' + pct + '%)</p>' +
          '</div>';
      }).join('') +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px;">' +
      '<button class="btn btn-primary" onclick="location.reload()">Retake Mock Test</button>' +
      '<a href="reading.html" class="btn btn-secondary">📖 Practice Reading</a>' +
      '<a href="writing.html" class="btn btn-secondary">✍️ Practice Writing</a>' +
      '</div>' +
      '<p style="text-align:center;margin-top:20px;font-size:0.8rem;color:var(--text-muted);">⚠️ This score is for practice only and does not reflect your official TOEFL iBT score.</p>';
  }
  
  // =============================================
  // TIMER (kept for mock test only)
  // =============================================
  function startTimer() {
    updateTimer();
    timerInterval = setInterval(function() {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) { stopTimer(); submitSection(); }
    }, 1000);
  }
  
  function stopTimer() { clearInterval(timerInterval); }
  
  function updateTimer() {
    var m = Math.floor(timeLeft / 60);
    var s = timeLeft % 60;
    var el = document.getElementById('testTimer');
    if (!el) return;
    el.textContent = '⏱ ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    el.className = 'timer-display' + (timeLeft < 60 ? ' danger' : timeLeft < 180 ? ' warning' : '');
  }