/* =============================================
   TOEFL Prep Hub – Writing Section JS
   Advanced Rule-Based Scoring Engine
   ============================================= */

let currentTask=null,taskData=null,items=[],currentIdx=0,timerInterval=null,timeLeft=0,results=[];
const DATA_PATHS={'build-a-sentence':'data/writing/q1.json','write-email':'data/writing/q2.json','academic-discussion':'data/writing/q3.json'};

// =============================================
// SCORING ENGINE
// =============================================

const SCORING = {

  // --- Sentence variety analysis ---
  analyzeSentences(text) {
    const sents = text.match(/[^.!?]+[.!?]+/g) || [];
    if (!sents.length) return { count: 0, avgLen: 0, hasComplex: false, hasSimple: false, hasCompound: false, variety: 0 };
    const lens = sents.map(s => s.trim().split(/\s+/).length);
    const avg = lens.reduce((a,b)=>a+b,0)/lens.length;
    const hasComplex = sents.some(s => /although|because|since|while|whereas|however|therefore|furthermore|moreover|nevertheless|consequently|despite|unless|until|whenever|wherever/.test(s.toLowerCase()));
    const hasCompound = sents.some(s => /,\s*(and|but|or|so|yet|for|nor)\s/.test(s));
    const hasSimple = sents.some(s => s.trim().split(/\s+/).length < 10);
    const variety = (hasComplex?1:0)+(hasCompound?1:0)+(hasSimple?1:0);
    return { count: sents.length, avgLen: Math.round(avg), hasComplex, hasSimple, hasCompound, variety };
  },

  // --- Vocabulary richness ---
  analyzeVocabulary(text) {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const unique = new Set(words);
    const ratio = words.length ? unique.size / words.length : 0;
    // Academic/formal word indicators
    const academicWords = ['furthermore','moreover','however','consequently','therefore','nevertheless','alternatively','significantly','demonstrate','indicate','suggest','evidence','argue','contend','perspective','consideration','substantial','fundamental','emphasize','acknowledge','conclude','examine','analyze','assess','evaluate','implement','establish','maintain','ensure','facilitate','contribute','represent','influence','determine','identify','propose','address','complex','significant','effective','essential','relevant','appropriate','specific','particular'];
    const formalWords = ['would it be possible','i was wondering','i appreciate','i acknowledge','i recognize','it is worth noting','it should be noted','one could argue','this demonstrates','this suggests','this indicates','in addition','in contrast','on the other hand','as a result','for instance','for example','in my view','in conclusion'];
    const academicCount = academicWords.filter(w => text.toLowerCase().includes(w)).length;
    const formalCount = formalWords.filter(w => text.toLowerCase().includes(w)).length;
    // Weak/basic word penalty
    const weakWords = ['good','bad','nice','thing','stuff','a lot','very very','really really','so so'];
    const weakCount = weakWords.filter(w => text.toLowerCase().includes(w)).length;
    return { ratio: Math.round(ratio*100), academicCount, formalCount, weakCount, uniqueWords: unique.size };
  },

  // --- Grammar signals ---
  analyzeGrammar(text) {
    const issues = [];
    // Check for common errors
    if (/\bi is\b/i.test(text)) issues.push('subject-verb agreement');
    if (/\bhe have\b|\bshe have\b|\bit have\b/i.test(text)) issues.push('subject-verb agreement');
    if (/[a-z]\. {0,1}[a-z]/g.test(text)) issues.push('capitalization after period');
    if (/\btheir is\b|\bthere are a\b.*\bperson\b/i.test(text)) issues.push('there/their confusion');
    // Check for good grammar signals
    const hasPassive = /\b(is|are|was|were|been|being)\s+\w+ed\b/.test(text);
    const hasConditional = /\b(if|unless|should|would|could|might)\b.*\b(then|would|could|might)\b/i.test(text);
    const hasPerfect = /\b(have|has|had)\s+\w+(ed|en)\b/.test(text);
    const hasParticiple = /\w+ing\s+\w+/.test(text);
    const sophisticationScore = (hasPassive?1:0)+(hasConditional?1:0)+(hasPerfect?1:0)+(hasParticiple?1:0);
    return { issues, sophisticationScore, hasPassive, hasConditional, hasPerfect };
  },

  // --- Coherence signals ---
  analyzeCoherence(text) {
    const cohesiveDevices = {
      addition: ['furthermore','moreover','in addition','additionally','also','besides','what is more'],
      contrast: ['however','nevertheless','on the other hand','in contrast','although','despite','while','whereas','yet','but'],
      cause: ['therefore','consequently','as a result','thus','hence','for this reason','because','since'],
      example: ['for example','for instance','such as','to illustrate','namely','specifically'],
      emphasis: ['indeed','in fact','clearly','obviously','it is worth noting','importantly'],
      concession: ['admittedly','granted','of course','while it is true','even though']
    };
    const found = {};
    let total = 0;
    for (const [type, words] of Object.entries(cohesiveDevices)) {
      const matches = words.filter(w => text.toLowerCase().includes(w));
      found[type] = matches.length;
      total += matches.length;
    }
    const categories = Object.values(found).filter(v=>v>0).length;
    return { total, categories, found };
  },

  // --- Email-specific scoring ---
  scoreEmail(text, prompt) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wc = words.length;
    const sent = this.analyzeSentences(text);
    const vocab = this.analyzeVocabulary(text);
    const grammar = this.analyzeGrammar(text);
    const coherence = this.analyzeCoherence(text);

    const feedback = [];
    const breakdown = {};

    // 1. TASK COMPLETION (0-3 pts)
    const pointsCovered = prompt.requiredPoints.filter(p => {
      const kws = p.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(w=>w.length>4);
      return kws.filter(kw => text.toLowerCase().includes(kw)).length >= Math.ceil(kws.length * 0.4);
    }).length;
    const taskScore = pointsCovered === 3 ? 3 : pointsCovered === 2 ? 2 : pointsCovered === 1 ? 1 : 0;
    breakdown.task = taskScore;
    if (taskScore === 3) feedback.push({ type: 'good', text: '&#10003; Task completion: All 3 required points addressed.' });
    else if (taskScore === 2) feedback.push({ type: 'ok', text: '! Task completion: 2 of 3 required points detected. Review the prompt carefully.' });
    else feedback.push({ type: 'bad', text: '&#10007; Task completion: Only ' + pointsCovered + ' required point(s) detected. You must address all 3.' });

    // 2. WORD COUNT (0-2 pts)
    let wcScore = 0;
    if (wc >= 130 && wc <= 180) { wcScore = 2; feedback.push({ type: 'good', text: '&#10003; Length: ' + wc + ' words — excellent range.' }); }
    else if (wc >= 110) { wcScore = 1; feedback.push({ type: 'ok', text: '! Length: ' + wc + ' words — slightly ' + (wc < 130 ? 'short, aim for 130+.' : 'long, aim for 130–180.') }); }
    else { wcScore = 0; feedback.push({ type: 'bad', text: '&#10007; Length: ' + wc + ' words — too short. Aim for at least 130 words.' }); }
    breakdown.length = wcScore;

    // 3. POLITENESS & REGISTER (0-2 pts)
    const politeStarters = ['dear','to whom it may concern'];
    const politeClosers = ['sincerely','kind regards','yours faithfully','best regards','thank you'];
    const politeBody = ['would it be possible','i was wondering','i would appreciate','i would be grateful','could you please','i regret','i apologize','please let me know','i look forward'];
    const hasOpening = politeStarters.some(w => text.toLowerCase().trimStart().startsWith(w));
    const hasClosing = politeClosers.some(w => text.toLowerCase().includes(w));
    const politeBodyCount = politeBody.filter(w => text.toLowerCase().includes(w)).length;
    const politeScore = Math.min(2, (hasOpening?0.5:0) + (hasClosing?0.5:0) + Math.min(1, politeBodyCount * 0.5));
    breakdown.politeness = Math.round(politeScore);
    if (politeScore >= 1.5) feedback.push({ type: 'good', text: '&#10003; Politeness: Strong formal register with appropriate opening/closing.' });
    else if (politeScore >= 0.5) feedback.push({ type: 'ok', text: '! Politeness: Decent — add formal phrases like "I would be grateful if…" or "Could you please…"' });
    else feedback.push({ type: 'bad', text: '&#10007; Politeness: Missing formal greeting (e.g. "Dear…") or closing (e.g. "Kind regards").' });

    // 4. VOCABULARY (0-1 pt)
    const vocabScore = vocab.academicCount >= 3 ? 1 : vocab.weakCount >= 2 ? 0 : 0.5;
    breakdown.vocabulary = Math.round(vocabScore);
    if (vocab.academicCount >= 3) feedback.push({ type: 'good', text: '&#10003; Vocabulary: Good use of formal/academic language.' });
    else feedback.push({ type: 'ok', text: '! Vocabulary: Try using more formal expressions (e.g. "I would like to bring to your attention", "I appreciate your prompt response").' });

    // 5. GRAMMAR & COMPLEXITY (0-1 pt)
    const grammarScore = grammar.issues.length === 0 && grammar.sophisticationScore >= 2 ? 1 : grammar.issues.length === 0 ? 0.5 : 0;
    breakdown.grammar = Math.round(grammarScore);
    if (grammar.issues.length === 0 && grammar.sophisticationScore >= 2) feedback.push({ type: 'good', text: '&#10003; Grammar: Complex sentence structures detected — strong command of English.' });
    else if (grammar.issues.length === 0) feedback.push({ type: 'ok', text: '! Grammar: No major errors, but try adding more complex structures (conditionals, passive voice, perfect tenses).' });
    else feedback.push({ type: 'bad', text: '&#10007; Grammar: Possible issues detected: ' + grammar.issues.join(', ') + '.' });

    // 6. COHERENCE (0-1 pt)
    const cohScore = coherence.categories >= 2 ? 1 : coherence.categories >= 1 ? 0.5 : 0;
    breakdown.coherence = Math.round(cohScore);
    if (coherence.categories >= 2) feedback.push({ type: 'good', text: '&#10003; Cohesion: Good use of linking words across multiple categories.' });
    else feedback.push({ type: 'ok', text: '! Cohesion: Add more linking phrases (e.g. "Furthermore…", "As a result…", "In addition…").' });

    const total = Math.min(10, Math.round(taskScore + wcScore + politeScore + vocabScore + grammarScore + cohScore));
    return { total, breakdown, feedback, wc, band: this.getBand(total) };
  },

  // --- Discussion-specific scoring ---
  scoreDiscussion(text, prompt) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wc = words.length;
    const sent = this.analyzeSentences(text);
    const vocab = this.analyzeVocabulary(text);
    const grammar = this.analyzeGrammar(text);
    const coherence = this.analyzeCoherence(text);

    const feedback = [];
    const breakdown = {};

    // 1. WORD COUNT (0-2 pts)
    let wcScore = 0;
    if (wc >= 150) { wcScore = 2; feedback.push({ type: 'good', text: '&#10003; Length: ' + wc + ' words — excellent, well above the minimum.' }); }
    else if (wc >= 120) { wcScore = 1.5; feedback.push({ type: 'good', text: '&#10003; Length: ' + wc + ' words — meets the 120-word requirement.' }); }
    else if (wc >= 90) { wcScore = 1; feedback.push({ type: 'ok', text: '! Length: ' + wc + ' words — aim for at least 120.' }); }
    else { wcScore = 0; feedback.push({ type: 'bad', text: '&#10007; Length: ' + wc + ' words — significantly too short. Aim for 120+ words.' }); }
    breakdown.length = Math.round(wcScore);

    // 2. TOPIC RELEVANCE (0-2 pts)
    const kws = (prompt.keywords || []);
    const kwMatches = kws.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
    const kwRatio = kws.length ? kwMatches / kws.length : 0;
    const topicScore = kwRatio >= 0.5 ? 2 : kwRatio >= 0.3 ? 1.5 : kwRatio >= 0.1 ? 1 : 0;
    breakdown.relevance = Math.round(topicScore);
    if (topicScore >= 2) feedback.push({ type: 'good', text: '&#10003; Relevance: Strong — your response addresses the topic directly with appropriate vocabulary.' });
    else if (topicScore >= 1) feedback.push({ type: 'ok', text: '! Relevance: Somewhat on-topic. Make sure you directly address the professor's question.' });
    else feedback.push({ type: 'bad', text: '&#10007; Relevance: Your response does not seem to address the discussion topic. Re-read the question carefully.' });

    // 3. ARGUMENT DEVELOPMENT (0-2 pts)
    const hasOpinion = /\b(i think|i believe|i argue|i contend|i feel|in my view|in my opinion|from my perspective|my position is|i would argue|it seems to me)\b/i.test(text);
    const hasExample = /\b(for example|for instance|such as|to illustrate|a study|research shows|evidence suggests|personally|in my experience|consider the case|take the case)\b/i.test(text);
    const hasReasoning = /\b(because|since|therefore|as a result|consequently|this means|this suggests|this demonstrates|which shows|which indicates)\b/i.test(text);
    const argScore = (hasOpinion?0.7:0) + (hasExample?0.7:0) + (hasReasoning?0.6:0);
    breakdown.argument = Math.min(2, Math.round(argScore));
    if (hasOpinion && hasExample && hasReasoning) feedback.push({ type: 'good', text: '&#10003; Argument: Strong — clear opinion, supporting example, and reasoning all present.' });
    else {
      const missing = [];
      if (!hasOpinion) missing.push('a clear position ("I believe…", "In my view…")');
      if (!hasExample) missing.push('a specific example ("For instance…", "Research shows…")');
      if (!hasReasoning) missing.push('reasoning ("Therefore…", "This demonstrates…")');
      if (missing.length) feedback.push({ type: missing.length >= 2 ? 'bad' : 'ok', text: (missing.length >= 2?'&#10007;':'!') + ' Argument: Missing ' + missing.join(' and ') + '.' });
    }

    // 4. ENGAGEMENT WITH CLASSMATES (0-1 pt)
    const studentNames = (prompt.students || []).map(s => s.name.toLowerCase());
    const engages = studentNames.some(n => text.toLowerCase().includes(n));
    const engageWords = ['agree with','disagree with','builds on','unlike','as mentioned','point raised','argument made','while x argues','echoing'];
    const engagesPhrases = engageWords.some(w => text.toLowerCase().includes(w));
    const engageScore = (engages || engagesPhrases) ? 1 : 0;
    breakdown.engagement = engageScore;
    if (engageScore) feedback.push({ type: 'good', text: '&#10003; Engagement: You referenced your classmates' contributions — excellent.' });
    else feedback.push({ type: 'ok', text: '! Engagement: Try referencing your classmates by name (e.g. "While ' + (prompt.students?.[0]?.name||'your classmate') + ' argues…, I believe…").' });

    // 5. VOCABULARY & GRAMMAR (0-2 pts combined)
    const vocabScore = Math.min(1, vocab.academicCount * 0.2 + (vocab.ratio > 60 ? 0.5 : 0.2) - vocab.weakCount * 0.1);
    const grammarScore = Math.min(1, grammar.sophisticationScore * 0.25 + (grammar.issues.length === 0 ? 0.5 : 0));
    const langScore = Math.min(2, vocabScore + grammarScore);
    breakdown.language = Math.round(langScore);
    if (langScore >= 1.5) feedback.push({ type: 'good', text: '&#10003; Language: Strong vocabulary range and complex sentence structures.' });
    else if (langScore >= 1) feedback.push({ type: 'ok', text: '! Language: Adequate — try incorporating more academic vocabulary and varied sentence types.' });
    else feedback.push({ type: 'bad', text: '&#10007; Language: Limited vocabulary and sentence variety. Study academic linking phrases and complex structures.' });

    // 6. COHERENCE (0-1 pt)
    const cohScore = coherence.categories >= 3 ? 1 : coherence.categories >= 2 ? 0.75 : coherence.categories >= 1 ? 0.5 : 0;
    breakdown.coherence = Math.round(cohScore);
    if (coherence.categories >= 2) feedback.push({ type: 'good', text: '&#10003; Cohesion: Good use of discourse markers across ' + coherence.categories + ' categories.' });
    else feedback.push({ type: 'ok', text: '! Cohesion: Use more varied linking expressions (contrast: "However…"; addition: "Moreover…"; cause: "Therefore…").' });

    const total = Math.min(10, Math.round(wcScore + topicScore + Math.min(2, argScore) + engageScore + langScore + cohScore));
    return { total, breakdown, feedback, wc, band: this.getBand(total) };
  },

  getBand(score) {
    if (score >= 9) return { label: 'Advanced', color: '#059669', emoji: '' };
    if (score >= 7) return { label: 'Upper Intermediate', color: '#10b981', emoji: '' };
    if (score >= 5) return { label: 'Intermediate', color: '#f59e0b', emoji: '' };
    if (score >= 3) return { label: 'Lower Intermediate', color: '#f97316', emoji: '' };
    return { label: 'Needs Development', color: '#ef4444', emoji: '' };
  },

  renderFeedback(result, type) {
    const { total, breakdown, feedback, wc, band } = result;
    const breakdownLabels = { task:'Task Completion', length:'Word Count', politeness:'Politeness', vocabulary:'Vocabulary', grammar:'Grammar', coherence:'Cohesion', relevance:'Relevance', argument:'Argument', engagement:'Engagement', language:'Language' };
    const maxScores = type === 'email'
      ? { task:3, length:2, politeness:2, vocabulary:1, grammar:1, coherence:1 }
      : { length:2, relevance:2, argument:2, engagement:1, language:2, coherence:1 };

    const breakdownHtml = Object.entries(breakdown).map(([k,v]) => {
      const max = maxScores[k] || 1;
      const pct = Math.round((v/max)*100);
      const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
      return '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.83rem;"><span>' + (breakdownLabels[k]||k) + '</span><span style="font-weight:700;color:'+color+'">' + v + '/' + max + '</span></div><div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;"><div style="background:'+color+';height:100%;width:'+pct+'%;border-radius:99px;transition:width 0.4s;"></div></div></div>';
    }).join('');

    const feedbackHtml = feedback.map(f => {
      const bg = f.type === 'good' ? '#d1fae5' : f.type === 'ok' ? '#fef3c7' : '#fee2e2';
      const border = f.type === 'good' ? '#10b981' : f.type === 'ok' ? '#f59e0b' : '#ef4444';
      return '<div style="background:'+bg+';border-left:3px solid '+border+';padding:8px 12px;border-radius:4px;margin-bottom:6px;font-size:0.87rem;">' + f.text + '</div>';
    }).join('');

    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px;">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">' +
        '<div style="background:conic-gradient(' + band.color + ' ' + (total*10) + '%, #e2e8f0 0%);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<div style="background:#fff;width:60px;height:60px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
            '<span style="font-size:1.4rem;font-weight:900;color:' + band.color + ';">' + total + '</span>' +
            '<span style="font-size:0.6rem;color:#64748b;text-transform:uppercase;">/ 10</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:1.1rem;font-weight:700;">' + band.emoji + ' ' + band.label + '</div>' +
          '<div style="font-size:0.85rem;color:#64748b;">' + wc + ' words written</div>' +
          '<div style="font-size:0.82rem;color:' + band.color + ';font-weight:600;margin-top:2px;">Score: ' + total + '/10</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px;">' + breakdownHtml + '</div>' +
      '<div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:#1e293b;">Detailed Feedback:</div>' +
      feedbackHtml +
    '</div>';
  }
};

// =============================================
// AD MANAGEMENT
// =============================================
function showVideoAd(cb){const ov=document.getElementById('videoAd');ov.style.display='flex';ov._cb=cb;let s=30;document.getElementById('adCountdown').textContent=s;const sk=document.getElementById('skipBtn'),cx=document.getElementById('adCloseX');sk.classList.remove('visible');if(cx)cx.classList.remove('visible');const t=setInterval(()=>{s--;document.getElementById('adCountdown').textContent=s;if(s<=5){sk.classList.add('visible');if(cx)cx.classList.add('visible');}if(s<=0){clearInterval(t);closeAd();}},1000);ov._t=t;}
function closeAd(){const ov=document.getElementById('videoAd');clearInterval(ov._t);ov.style.display='none';if(typeof ov._cb==='function')ov._cb();}

// =============================================
// TASK LOADING
// =============================================
async function loadTask(t){currentTask=t;try{const r=await fetch(DATA_PATHS[t]);taskData=await r.json();showIntroModal(taskData);}catch(e){alert('Could not load task data.');console.error(e);}}

function showIntroModal(data){
  document.getElementById('modalBadge').textContent=data.taskTitle;
  document.getElementById('modalTitle').textContent='About: '+data.taskTitle;
  document.getElementById('modalDesc').textContent=({'build-a-sentence':'Drag and drop words into the correct order. One word may be extra.','write-email':'Write a polite, professional email addressing all 3 required points. Aim for 130–140 words.','academic-discussion':"Read the professor's question and student responses, then add your own contribution. Aim for 120+ words."})[data.taskType]||'';
  const el=document.getElementById('modalExpect');el.innerHTML='';
  (data.whatToExpect||[]).forEach(t=>{const li=document.createElement('li');li.innerHTML='<span style="color:var(--success)">&#10003;</span> '+t;li.style.cssText='display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';el.appendChild(li);});
  const tl=document.getElementById('modalTips');tl.innerHTML='';
  (data.tips||[]).forEach(t=>{const li=document.createElement('li');li.textContent=t;tl.appendChild(li);});
  const ov=document.getElementById('introOverlay');ov.style.display='flex';
  ov.onclick=(e)=>{if(e.target===ov)closeIntroModal();};
  document.addEventListener('keydown',handleEscKey);
}
function closeIntroModal(){document.getElementById('introOverlay').style.display='none';document.removeEventListener('keydown',handleEscKey);}
function handleEscKey(e){if(e.key==='Escape')closeIntroModal();}

function startTask(){
  closeIntroModal();
  document.getElementById('taskSelection').style.display='none';
  const pa=document.getElementById('practiceArea');pa.style.display='block';
  if(!document.getElementById('backToTasksBtn')){const b=document.createElement('button');b.id='backToTasksBtn';b.className='back-to-tasks-btn';b.innerHTML='&larr; Back to Tasks';b.onclick=backToTasks;pa.insertBefore(b,pa.firstChild);}
  items=taskData.questions||taskData.prompts||[];currentIdx=0;results=new Array(items.length).fill(null);timeLeft=taskData.timeSeconds;
  document.getElementById('taskHeading').textContent=taskData.taskTitle;
  if(currentTask!=='build-a-sentence'){const card=document.getElementById('rubricsCard'),rubric=items[0]?.scoringRubric;if(rubric&&card){card.style.display='block';document.getElementById('rubricList').innerHTML=Object.entries(rubric).map(([k,v])=>'<li style="padding:5px 0;border-bottom:1px solid var(--border);"><strong style="text-transform:capitalize;">'+k+':</strong> '+v+'</li>').join('');}}
  startTimer();renderItem();
}

function backToTasks(){stopTimer();document.getElementById('practiceArea').style.display='none';document.getElementById('taskSelection').style.display='block';document.getElementById('scoreSummary').style.display='none';document.getElementById('questionArea').innerHTML='';document.getElementById('navBtns').style.display='flex';const rc=document.getElementById('rubricsCard');if(rc)rc.style.display='none';const b=document.getElementById('backToTasksBtn');if(b)b.remove();}

// =============================================
// RENDER
// =============================================
function renderItem(){
  const area=document.getElementById('questionArea'),total=items.length;
  document.getElementById('qProgress').textContent='Question '+(currentIdx+1)+' of '+total;
  document.getElementById('progressFill').style.width=(currentIdx/total*100)+'%';
  document.getElementById('prevBtn').style.display=currentIdx>0?'inline-flex':'none';
  document.getElementById('nextBtn').style.display=currentIdx<total-1?'inline-flex':'none';
  document.getElementById('submitBtn').style.display=currentIdx===total-1?'inline-flex':'none';
  area.innerHTML='';
  if(currentTask==='build-a-sentence')renderBuildSentence(area,items[currentIdx]);
  else if(currentTask==='write-email')renderWriteEmail(area,items[currentIdx]);
  else if(currentTask==='academic-discussion')renderDiscussion(area,items[currentIdx]);
}

// =============================================
// BUILD A SENTENCE
// =============================================
function renderBuildSentence(area,q){
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><div class="sentence-context">'+q.context+'</div><p class="question-text">'+q.prompt+'</p>'+(q.fixedStart?'<p style="margin-bottom:8px;"><strong>'+q.fixedStart+'</strong></p>':'')+'<div class="drop-zone" id="dropZone" ondragover="allowDrop(event)" ondrop="dropWord(event)"></div>'+(q.fixedEnd?'<p style="margin-bottom:16px;"><strong>'+q.fixedEnd+'</strong></p>':'')+'<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">Word Bank – click or drag words into the box above:</p><div class="word-bank" id="wordBank"></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="checkSentence('+currentIdx+')">&#10003; Check</button><button class="btn btn-secondary btn-sm" onclick="clearSentence()">&larr; Clear</button><button class="btn btn-sm" style="background:var(--surface2);color:var(--text-muted);" onclick="revealSentence('+currentIdx+')"> Reveal</button></div><div class="feedback-panel" id="basFeedback"></div></div>';
  const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');
  zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';
  const saved=results[currentIdx],placed=saved?.placed||[],remaining=shuffle([...q.words]).filter(w=>!placed.includes(w));
  placed.forEach(w=>zone.appendChild(createChip(w)));remaining.forEach(w=>bank.appendChild(createChip(w)));
  if(placed.length>0){const h=document.getElementById('dropHint');if(h)h.remove();}
  if(saved?.checked){const fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(saved.correct?'correct':'incorrect');fb.innerHTML=saved.correct?'<h4>&#10003; Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>&#10007; Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p>';}
}
function createChip(word){const span=document.createElement('span');span.className='word-chip';span.textContent=word;span.draggable=true;span.addEventListener('dragstart',e=>{e.dataTransfer.setData('text',word);e.dataTransfer.setData('source',e.target.parentElement.id);e.target.style.opacity='0.5';});span.addEventListener('dragend',e=>{e.target.style.opacity='1';});span.addEventListener('click',()=>moveChip(span));return span;}
function moveChip(chip){const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank'),hint=document.getElementById('dropHint');if(hint)hint.remove();if(chip.parentElement===bank){zone.appendChild(chip);}else{bank.appendChild(chip);if(zone.children.length===0)zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}}
function allowDrop(e){e.preventDefault();}
function dropWord(e){e.preventDefault();const zone=document.getElementById('dropZone'),hint=document.getElementById('dropHint');if(hint)hint.remove();const word=e.dataTransfer.getData('text'),source=e.dataTransfer.getData('source'),bank=document.getElementById('wordBank'),chips=[...bank.querySelectorAll('.word-chip'),...zone.querySelectorAll('.word-chip')],chip=chips.find(c=>c.textContent===word&&c.parentElement.id===source);if(chip)zone.appendChild(chip);}
function clearSentence(){const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');[...zone.querySelectorAll('.word-chip')].forEach(c=>bank.appendChild(c));zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}
function checkSentence(idx){const q=items[idx],placed=[...document.getElementById('dropZone').querySelectorAll('.word-chip')].map(c=>c.textContent),correct=JSON.stringify(placed)===JSON.stringify(q.answer);results[idx]={placed,checked:true,correct};const fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(correct?'correct':'incorrect');fb.innerHTML=correct?'<h4>&#10003; Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>&#10007; Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p><p style="margin-top:6px;font-size:0.88rem;color:var(--text-muted);">Your answer: '+q.fixedStart+' '+placed.join(' ')+' '+q.fixedEnd+'</p>';}
function revealSentence(idx){const q=items[idx],zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');zone.innerHTML='';bank.innerHTML='';q.answer.forEach(w=>{const c=createChip(w);c.classList.add('placed');zone.appendChild(c);});if(q.extraWord){const c=createChip(q.extraWord);c.classList.add('extra');bank.appendChild(c);}results[idx]={placed:q.answer,checked:true,correct:true};}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

// =============================================
// WRITE AN EMAIL
// =============================================
function renderWriteEmail(area,prompt){
  const saved=results[currentIdx]?.text||'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">[E] Write an Email</h3><div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-bottom:16px;font-size:0.93rem;line-height:1.7;">'+prompt.scenario+'</div><div class="required-points"><h4>&#10003; Required Points (include all three):</h4><ol style="padding-left:20px;margin-top:6px;">'+prompt.requiredPoints.map(p=>'<li>'+p+'</li>').join('')+'</ol></div><p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Write your email below (aim for 130–140 words):</p><textarea class="writing-area" id="emailArea" placeholder="Dear '+prompt.recipient+',&#10;&#10;...">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 130–140 words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="scoreEmailBtn" onclick="scoreEmail('+currentIdx+')"> Analyze & Score</button><button class="sample-toggle" onclick="toggleSample('emailSample')"> See Sample Answer</button></div><div id="emailFeedbackArea"></div><div class="sample-answer" id="emailSample">'+prompt.sampleResponse+'</div></div>';
  const ta=document.getElementById('emailArea'),wc=document.getElementById('wc'),tgt=document.getElementById('wcTarget');
  const update=()=>{const w=ta.value.trim().split(/\s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=130&&w<=180?'var(--success)':w>100?'var(--warning)':'var(--danger)';tgt.style.color=w>=130?'var(--success)':'var(--text-muted)';results[currentIdx]={text:ta.value};};
  ta.addEventListener('input',update);update();
}

function scoreEmail(idx){
  const text=document.getElementById('emailArea')?.value||'';
  if(text.trim().split(/\s+/).filter(Boolean).length < 20){
    document.getElementById('emailFeedbackArea').innerHTML='<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;font-size:0.9rem;">Please write your email first before requesting feedback.</div>';return;
  }
  const btn=document.getElementById('scoreEmailBtn');
  if(btn){btn.textContent=' Analyzing...';btn.disabled=true;}
  // Simulate brief AI-like delay
  setTimeout(()=>{
    const result=SCORING.scoreEmail(text,items[idx]);
    const html=SCORING.renderFeedback(result,'email');
    const area=document.getElementById('emailFeedbackArea');
    if(area)area.innerHTML=html;
    if(btn){btn.textContent=' Re-analyze';btn.disabled=false;}
  },1200);
}

// =============================================
// ACADEMIC DISCUSSION
// =============================================
function renderDiscussion(area,prompt){
  const saved=results[currentIdx]?.text||'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">[D] Write for an Academic Discussion</h3><div class="discussion-context"><strong style="color:var(--primary);">Professor '+prompt.professor.name+':</strong><p style="margin-top:8px;font-size:0.93rem;line-height:1.7;">'+prompt.professor.question+'</p></div>'+prompt.students.map(s=>'<div class="student-response"><strong>'+s.name+':</strong><p style="margin-top:6px;font-size:0.9rem;line-height:1.65;">'+s.response+'</p></div>').join('')+'<div style="margin-top:20px;"><p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">Write your response (aim for 120+ words):</p><textarea class="writing-area" id="discussArea" placeholder="Write your contribution here..." style="min-height:180px;">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 120+ words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="scoreDiscBtn" onclick="scoreDiscussion('+currentIdx+')"> Analyze & Score</button><button class="sample-toggle" onclick="toggleSample('discussSample')"> See Sample Answer</button></div></div><div id="discussFeedbackArea"></div><div class="sample-answer" id="discussSample">'+prompt.sampleResponse+'</div></div>';
  const ta=document.getElementById('discussArea'),wc=document.getElementById('wc'),tgt=document.getElementById('wcTarget');
  const update=()=>{const w=ta.value.trim().split(/\s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=120?'var(--success)':w>80?'var(--warning)':'var(--danger)';tgt.style.color=w>=120?'var(--success)':'var(--text-muted)';results[currentIdx]={text:ta.value};};
  ta.addEventListener('input',update);update();
}

function scoreDiscussion(idx){
  const text=document.getElementById('discussArea')?.value||'';
  if(text.trim().split(/\s+/).filter(Boolean).length < 20){
    document.getElementById('discussFeedbackArea').innerHTML='<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;font-size:0.9rem;">Please write your response first before requesting feedback.</div>';return;
  }
  const btn=document.getElementById('scoreDiscBtn');
  if(btn){btn.textContent=' Analyzing...';btn.disabled=true;}
  setTimeout(()=>{
    const result=SCORING.scoreDiscussion(text,items[idx]);
    const html=SCORING.renderFeedback(result,'discussion');
    const area=document.getElementById('discussFeedbackArea');
    if(area)area.innerHTML=html;
    if(btn){btn.textContent=' Re-analyze';btn.disabled=false;}
  },1400);
}

// =============================================
// HELPERS
// =============================================
function toggleSample(id){const el=document.getElementById(id);el.style.display=el.style.display==='block'?'none':'block';}
function nextQ(){if(currentIdx<items.length-1){currentIdx++;renderItem();window.scrollTo(0,0);}}
function prevQ(){if(currentIdx>0){currentIdx--;renderItem();window.scrollTo(0,0);}}

function finishTask(){
  stopTimer();
  document.getElementById('questionArea').innerHTML='';
  document.getElementById('navBtns').style.display='none';
  const bb=document.getElementById('backToTasksBtn');if(bb)bb.style.display='none';
  let correct=0;if(currentTask==='build-a-sentence')correct=results.filter(r=>r?.correct).length;
  const sum=document.getElementById('scoreSummary');sum.style.display='block';
  sum.innerHTML='<div class="score-summary"><h2>&#10003; Task Complete!</h2>'+(currentTask==='build-a-sentence'?'<div class="score-circle" style="background:conic-gradient(var(--primary) '+Math.round(correct/items.length*100)+'%,var(--surface2) 0%);"><div class="score-inner"><span class="score-num">'+correct+'/'+items.length+'</span><span class="score-label">Correct</span></div></div>':'<p style="font-size:1.05rem;margin-bottom:16px;">Your responses have been scored. Review your feedback above or compare with the sample answers.</p>')+'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;"><button class="btn btn-secondary" onclick="backToTasks()">&larr; Try Another Task</button><a href="mock-test.html" class="btn btn-primary"> Full Mock Test</a></div></div>';
  showVideoAd(()=>{});
}

function startTimer(){updateTimer();timerInterval=setInterval(()=>{timeLeft--;updateTimer();if(timeLeft<=0){stopTimer();finishTask();}},1000);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function updateTimer(){const m=Math.floor(timeLeft/60),s=timeLeft%60,el=document.getElementById('timerDisplay');if(!el)return;el.textContent=' '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.className='timer-display'+(timeLeft<60?' danger':timeLeft<120?' warning':'');}