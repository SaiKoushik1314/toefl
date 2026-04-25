/* TOEFL Prep Hub - Reading JS */
'use strict';
var currentTask=null,taskData=null,questions=[],currentQ=0,answers={},timerInterval=null,timeLeft=0,totalCorrect=0;
var DATA_PATHS={'complete-the-words':'data/reading/q1.json','reading-daily-life':'data/reading/q2.json','academic-reading':'data/reading/q3.json'};

function showVideoAd(onClose){var o=document.getElementById('videoAd');o.style.display='flex';o._onClose=onClose;var s=30;document.getElementById('adCountdown').textContent=s;var sk=document.getElementById('skipBtn'),cx=document.getElementById('adCloseX');sk.classList.remove('visible');if(cx)cx.classList.remove('visible');var t=setInterval(function(){s--;document.getElementById('adCountdown').textContent=s;if(s<=5){sk.classList.add('visible');if(cx)cx.classList.add('visible');}if(s<=0){clearInterval(t);closeAd();}},1000);o._timer=t;}
function closeAd(){var o=document.getElementById('videoAd');clearInterval(o._timer);o.style.display='none';if(typeof o._onClose==='function')o._onClose();}

function loadTask(t){currentTask=t;fetch(DATA_PATHS[t]).then(function(r){return r.json();}).then(function(data){taskData=data;showIntroModal(data);}).catch(function(e){alert('Could not load questions. Make sure data files are in the /data/ directory.');console.error(e);});}

function showIntroModal(data){
  document.getElementById('modalBadge').textContent=data.taskTitle;
  document.getElementById('modalTitle').textContent='About: '+data.taskTitle;
  var descs={'complete-the-words':'Read academic paragraphs with some words partially hidden. Type the missing letters to complete each word.','reading-daily-life':'Read everyday texts like emails, notices, and messages, then answer comprehension questions.','academic-reading':'Read 200-word academic passages and answer five questions covering factual information, vocabulary, rhetorical purpose, and paragraph relationships.'};
  document.getElementById('modalDesc').textContent=descs[data.taskType]||'';
  var expectList=document.getElementById('modalExpect');expectList.innerHTML='';
  (data.whatToExpect||[]).forEach(function(t){var li=document.createElement('li');li.innerHTML='<span style="color:var(--success)">&#10003;</span> '+t;li.style.cssText='display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';expectList.appendChild(li);});
  var tipsList=document.getElementById('modalTips');tipsList.innerHTML='';
  (data.tips||[]).forEach(function(t){var li=document.createElement('li');li.textContent=t;tipsList.appendChild(li);});
  var overlay=document.getElementById('introOverlay');overlay.style.display='flex';
  overlay.onclick=function(e){if(e.target===overlay)closeIntroModal();};
  document.addEventListener('keydown',handleEscKey);
}
function closeIntroModal(){document.getElementById('introOverlay').style.display='none';document.removeEventListener('keydown',handleEscKey);}
function handleEscKey(e){if(e.key==='Escape')closeIntroModal();}

function startTask(){
  closeIntroModal();
  document.getElementById('taskSelection').style.display='none';
  var pa=document.getElementById('practiceArea');pa.style.display='block';
  if(!document.getElementById('backToTasksBtn')){var b=document.createElement('button');b.id='backToTasksBtn';b.className='back-to-tasks-btn';b.innerHTML='&larr; Back to Tasks';b.onclick=backToTasks;pa.insertBefore(b,pa.firstChild);}
  buildQuestions();currentQ=0;answers={};totalCorrect=0;
  document.getElementById('taskHeading').textContent=taskData.taskTitle;
  timeLeft=taskData.timeSeconds;startTimer();renderQuestion();
}

function backToTasks(){
  stopTimer();
  document.getElementById('practiceArea').style.display='none';
  document.getElementById('taskSelection').style.display='block';
  document.getElementById('scoreSummary').style.display='none';
  document.getElementById('questionArea').innerHTML='';
  document.getElementById('questionArea').style.display='block';
  document.getElementById('prevBtn').style.display='none';
  document.getElementById('nextBtn').style.display='inline-flex';
  document.getElementById('submitBtn').style.display='none';
  var btn=document.getElementById('backToTasksBtn');if(btn)btn.remove();
  updateSidebarScore();
}

function buildQuestions(){
  questions=[];var t=taskData.taskType;
  if(t==='complete-the-words'){taskData.passages.forEach(function(p,pi){questions.push({type:'cloze',passageIdx:pi,passage:p});});}
  else{taskData.passages.forEach(function(p){p.questions.forEach(function(q,qi){questions.push({type:'mcq',passage:p,question:q,qIdx:qi});});});}
}

function renderQuestion(){
  var area=document.getElementById('questionArea'),q=questions[currentQ],total=questions.length;
  document.getElementById('qProgress').textContent='Question '+(currentQ+1)+' of '+total;
  document.getElementById('progressFill').style.width=(currentQ/total*100)+'%';
  document.getElementById('prevBtn').style.display=currentQ>0?'inline-flex':'none';
  document.getElementById('nextBtn').style.display=currentQ<total-1?'inline-flex':'none';
  document.getElementById('submitBtn').style.display=currentQ===total-1?'inline-flex':'none';
  area.innerHTML='';
  if(q.type==='cloze')renderCloze(area,q);else renderMCQ(area,q);
}

function renderCloze(area,q){
  var p=q.passage;
  area.innerHTML='<div class="question-card"><div class="question-number">'+(q.passageIdx+1)+'</div><p style="margin-bottom:16px;font-weight:600;">Fill in the missing letters to complete each word.</p><div class="cloze-text" id="clozeText"></div><div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="checkCloze('+q.passageIdx+')">Check Answers</button><button class="btn btn-secondary btn-sm" onclick="revealCloze('+q.passageIdx+')">Reveal Answers</button></div><div class="feedback-panel" id="clozeFeedback"></div></div>';
  var ct=document.getElementById('clozeText');var html='';
  p.segments.forEach(function(seg,i){html+=seg.before;if(seg.word){var m=seg.word.slice(seg.hint.length);html+='<strong>'+seg.hint+'</strong><input class="cloze-input" id="cloze-'+q.passageIdx+'-'+i+'" data-answer="'+m+'" style="width:'+Math.max(60,m.length*16)+'px" placeholder="'+new Array(m.length+1).join('_')+'" autocomplete="off" autocorrect="off" spellcheck="false"/>';}});
  ct.innerHTML=html;
}

function checkCloze(pi){
  var inputs=document.querySelectorAll('[id^="cloze-'+pi+'-"]');var correct=0;
  inputs.forEach(function(inp){inp.classList.remove('correct-ans','wrong-ans');if(inp.value.trim().toLowerCase()===inp.dataset.answer.toLowerCase()){inp.classList.add('correct-ans');correct++;}else inp.classList.add('wrong-ans');});
  var pct=Math.round(correct/inputs.length*100),fb=document.getElementById('clozeFeedback');
  fb.className='feedback-panel show '+(pct>=70?'correct':pct>=40?'partial':'incorrect');
  fb.innerHTML='<h4>'+(pct>=70?'Great job!':pct>=40?'Decent effort!':'Keep practicing!')+'</h4><p>You got <strong>'+correct+'/'+inputs.length+'</strong> words correct ('+pct+'%).</p>';
  answers['cloze-'+pi]={correct:correct,total:inputs.length};updateSidebarScore();
}
function revealCloze(pi){document.querySelectorAll('[id^="cloze-'+pi+'-"]').forEach(function(inp){inp.value=inp.dataset.answer;inp.classList.add('correct-ans');});}

function renderMCQ(area,item){
  var q=item.question,p=item.passage,saved=answers[q.id];
  var passHTML='';
  if(item.qIdx===0){var lbl=p.label||p.title||'Passage';passHTML='<div class="passage-box"><h4>'+lbl+'</h4><div style="white-space:pre-line;font-size:0.97rem;">'+p.text+'</div></div>';}
  var optHTML=(q.options||[]).map(function(opt,i){var cls='';if(saved!==undefined){if(i===q.answer)cls='correct';else if(i===saved)cls='incorrect';}return '<li class="option-item '+cls+'" onclick="selectAnswer(''+q.id+'','+i+','+q.answer+')" id="opt-'+q.id+'-'+i+'"><span class="option-letter">'+String.fromCharCode(65+i)+'</span><span>'+opt+'</span></li>';}).join('');
  var fbHTML=saved!==undefined?'<div class="feedback-panel show '+(saved===q.answer?'correct':'incorrect')+'"><h4>'+(saved===q.answer?'Correct!':'Incorrect')+'</h4><p>'+(q.explanation||'')+'</p></div>':'<div class="feedback-panel" id="fb-'+q.id+'"></div>';
  area.innerHTML=passHTML+'<div class="question-card"><div class="question-number">Q'+(item.qIdx+1)+'</div><div class="question-text">'+q.text+'</div><ul class="options-list">'+optHTML+'</ul>'+fbHTML+'</div>';
}

function selectAnswer(qId,selected,correct){
  if(answers[qId]!==undefined)return;answers[qId]=selected;
  document.querySelectorAll('[id^="opt-'+qId+'-"]').forEach(function(el,i){el.onclick=null;if(i===correct)el.classList.add('correct');else if(i===selected)el.classList.add('incorrect');});
  var fb=document.getElementById('fb-'+qId);
  if(fb){var q=questions[currentQ].question;fb.className='feedback-panel show '+(selected===correct?'correct':'incorrect');fb.innerHTML='<h4>'+(selected===correct?'Correct!':'Incorrect')+'</h4><p>'+(q.explanation||'')+'</p>';}
  if(selected===correct)totalCorrect++;updateSidebarScore();
}

function nextQuestion(){if(currentQ<questions.length-1){currentQ++;renderQuestion();window.scrollTo(0,0);}}
function prevQuestion(){if(currentQ>0){currentQ--;renderQuestion();window.scrollTo(0,0);}}

function submitTask(){
  stopTimer();var clozeCorrect=0,clozeTotal=0;
  Object.keys(answers).forEach(function(k){var v=answers[k];if(v&&v.correct!==undefined){clozeCorrect+=v.correct;clozeTotal+=v.total;}});
  var mcqTotal=0;questions.forEach(function(q){if(q.type==='mcq')mcqTotal++;});
  var finalCorrect=totalCorrect+clozeCorrect,finalTotal=mcqTotal+clozeTotal||questions.length,pct=Math.round(finalCorrect/finalTotal*100);
  document.getElementById('questionArea').style.display='none';
  document.getElementById('prevBtn').style.display='none';
  document.getElementById('nextBtn').style.display='none';
  document.getElementById('submitBtn').style.display='none';
  var bb=document.getElementById('backToTasksBtn');if(bb)bb.style.display='none';
  var summary=document.getElementById('scoreSummary');summary.style.display='block';
  summary.innerHTML='<div class="score-summary"><h2>'+(pct>=80?'Excellent!':pct>=60?'Good Work!':'Keep Practicing!')+'</h2><div class="score-circle" style="background:conic-gradient(var(--primary) '+pct+'%,var(--surface2) 0%);"><div class="score-inner"><span class="score-num">'+pct+'%</span><span class="score-label">Score</span></div></div><p style="margin-bottom:24px;color:var(--text-muted);">You answered <strong>'+finalCorrect+' out of '+finalTotal+'</strong> correctly.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-secondary" onclick="backToTasks()">&larr; Try Another Task</button><a href="mock-test.html" class="btn btn-primary">Full Mock Test</a></div></div>';
  showVideoAd(function(){});
}

function startTimer(){updateTimerDisplay();timerInterval=setInterval(function(){timeLeft--;updateTimerDisplay();if(timeLeft<=0){stopTimer();submitTask();}},1000);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function updateTimerDisplay(){var m=Math.floor(timeLeft/60),s=timeLeft%60,el=document.getElementById('timerDisplay');if(!el)return;el.textContent='Timer: '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.className='timer-display'+(timeLeft<60?' danger':timeLeft<180?' warning':'');}
function updateSidebarScore(){var el=document.getElementById('sideScoreNum');if(el)el.textContent=totalCorrect||0;}
