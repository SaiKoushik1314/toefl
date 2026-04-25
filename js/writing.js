/* TOEFL Prep Hub - Writing JS */
let currentTask=null,taskData=null,items=[],currentIdx=0,timerInterval=null,timeLeft=0,results=[];
const DATA_PATHS={'build-a-sentence':'data/writing/q1.json','write-email':'data/writing/q2.json','academic-discussion':'data/writing/q3.json'};

function showVideoAd(cb){const ov=document.getElementById('videoAd');ov.style.display='flex';ov._cb=cb;let s=30;document.getElementById('adCountdown').textContent=s;const sk=document.getElementById('skipBtn'),cx=document.getElementById('adCloseX');sk.classList.remove('visible');if(cx)cx.classList.remove('visible');const t=setInterval(()=>{s--;document.getElementById('adCountdown').textContent=s;if(s<=5){sk.classList.add('visible');if(cx)cx.classList.add('visible');}if(s<=0){clearInterval(t);closeAd();}},1000);ov._t=t;}
function closeAd(){const ov=document.getElementById('videoAd');clearInterval(ov._t);ov.style.display='none';if(typeof ov._cb==='function')ov._cb();}

async function loadTask(t){currentTask=t;try{const r=await fetch(DATA_PATHS[t]);taskData=await r.json();showIntroModal(taskData);}catch(e){alert('Could not load task data.');console.error(e);}}

function showIntroModal(data){
  document.getElementById('modalBadge').textContent=data.taskTitle;
  document.getElementById('modalTitle').textContent='About: '+data.taskTitle;
  document.getElementById('modalDesc').textContent=({'build-a-sentence':'Drag and drop words into the correct order. One word may be extra and should not be used.','write-email':'Write a polite professional email addressing all three required points. Aim for 130–140 words.','academic-discussion':"Read the professor's question and student responses, then write your own contribution. Aim for 120+ words."})[data.taskType]||'';
  const el=document.getElementById('modalExpect');el.innerHTML='';
  (data.whatToExpect||[]).forEach(t=>{const li=document.createElement('li');li.innerHTML='<span style="color:var(--success)">✓</span> '+t;li.style.cssText='display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';el.appendChild(li);});
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
  if(!document.getElementById('backToTasksBtn')){const b=document.createElement('button');b.id='backToTasksBtn';b.className='back-to-tasks-btn';b.innerHTML='← Back to Tasks';b.onclick=backToTasks;pa.insertBefore(b,pa.firstChild);}
  items=taskData.questions||taskData.prompts||[];currentIdx=0;results=new Array(items.length).fill(null);timeLeft=taskData.timeSeconds;
  document.getElementById('taskHeading').textContent=taskData.taskTitle;
  if(currentTask!=='build-a-sentence'){const card=document.getElementById('rubricsCard'),rubric=items[0]?.scoringRubric;if(rubric&&card){card.style.display='block';document.getElementById('rubricList').innerHTML=Object.entries(rubric).map(([k,v])=>'<li style="padding:5px 0;border-bottom:1px solid var(--border);"><strong style="text-transform:capitalize;">'+k+':</strong> '+v+'</li>').join('');}}
  startTimer();renderItem();
}

function backToTasks(){
  stopTimer();
  document.getElementById('practiceArea').style.display='none';
  document.getElementById('taskSelection').style.display='block';
  document.getElementById('scoreSummary').style.display='none';
  document.getElementById('questionArea').innerHTML='';
  document.getElementById('navBtns').style.display='flex';
  const rc=document.getElementById('rubricsCard');if(rc)rc.style.display='none';
  const b=document.getElementById('backToTasksBtn');if(b)b.remove();
}

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

function renderBuildSentence(area,q){
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><div class="sentence-context">'+q.context+'</div><p class="question-text">'+q.prompt+'</p>'+(q.fixedStart?'<p style="margin-bottom:8px;"><strong>'+q.fixedStart+'</strong></p>':'')+'<div class="drop-zone" id="dropZone" ondragover="allowDrop(event)" ondrop="dropWord(event)"></div>'+(q.fixedEnd?'<p style="margin-bottom:16px;"><strong>'+q.fixedEnd+'</strong></p>':'')+'<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">Word Bank – click or drag words into the box above:</p><div class="word-bank" id="wordBank"></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="checkSentence('+currentIdx+')">✓ Check</button><button class="btn btn-secondary btn-sm" onclick="clearSentence()">↩ Clear</button><button class="btn btn-sm" style="background:var(--surface2);color:var(--text-muted);" onclick="revealSentence('+currentIdx+')">👁 Reveal</button></div><div class="feedback-panel" id="basFeedback"></div></div>';
  const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');
  zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';
  const saved=results[currentIdx],placed=saved?.placed||[],remaining=shuffle([...q.words]).filter(w=>!placed.includes(w));
  placed.forEach(w=>zone.appendChild(createChip(w)));remaining.forEach(w=>bank.appendChild(createChip(w)));
  if(placed.length>0){const h=document.getElementById('dropHint');if(h)h.remove();}
  if(saved?.checked){const fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(saved.correct?'correct':'incorrect');fb.innerHTML=saved.correct?'<h4>✅ Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>❌ Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p>';}
}

function createChip(word){const span=document.createElement('span');span.className='word-chip';span.textContent=word;span.draggable=true;span.addEventListener('dragstart',e=>{e.dataTransfer.setData('text',word);e.dataTransfer.setData('source',e.target.parentElement.id);e.target.style.opacity='0.5';});span.addEventListener('dragend',e=>{e.target.style.opacity='1';});span.addEventListener('click',()=>moveChip(span));return span;}
function moveChip(chip){const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank'),hint=document.getElementById('dropHint');if(hint)hint.remove();if(chip.parentElement===bank){zone.appendChild(chip);}else{bank.appendChild(chip);if(zone.children.length===0)zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}}
function allowDrop(e){e.preventDefault();}
function dropWord(e){e.preventDefault();const zone=document.getElementById('dropZone'),hint=document.getElementById('dropHint');if(hint)hint.remove();const word=e.dataTransfer.getData('text'),source=e.dataTransfer.getData('source'),bank=document.getElementById('wordBank'),chips=[...bank.querySelectorAll('.word-chip'),...zone.querySelectorAll('.word-chip')],chip=chips.find(c=>c.textContent===word&&c.parentElement.id===source);if(chip)zone.appendChild(chip);}
function clearSentence(){const zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');[...zone.querySelectorAll('.word-chip')].forEach(c=>bank.appendChild(c));zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}
function checkSentence(idx){const q=items[idx],placed=[...document.getElementById('dropZone').querySelectorAll('.word-chip')].map(c=>c.textContent),correct=JSON.stringify(placed)===JSON.stringify(q.answer);results[idx]={placed,checked:true,correct};const fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(correct?'correct':'incorrect');fb.innerHTML=correct?'<h4>✅ Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>❌ Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p><p style="margin-top:6px;font-size:0.88rem;color:var(--text-muted);">Your answer: '+q.fixedStart+' '+placed.join(' ')+' '+q.fixedEnd+'</p>';}
function revealSentence(idx){const q=items[idx],zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');zone.innerHTML='';bank.innerHTML='';q.answer.forEach(w=>{const c=createChip(w);c.classList.add('placed');zone.appendChild(c);});if(q.extraWord){const c=createChip(q.extraWord);c.classList.add('extra');bank.appendChild(c);}results[idx]={placed:q.answer,checked:true,correct:true};}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

function renderWriteEmail(area,prompt){
  const saved=results[currentIdx]?.text||'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">📧 Write an Email</h3><div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-bottom:16px;font-size:0.93rem;line-height:1.7;">'+prompt.scenario+'</div><div class="required-points"><h4>✅ Required Points (include all three):</h4><ol style="padding-left:20px;margin-top:6px;">'+prompt.requiredPoints.map(p=>'<li>'+p+'</li>').join('')+'</ol></div><p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Write your email below (aim for 130–140 words):</p><textarea class="writing-area" id="emailArea" placeholder="Dear '+prompt.recipient+',&#10;&#10;...">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span style="color:var(--success);">Target: 130–140 words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="scoreEmail('+currentIdx+')">📊 Get Feedback</button><button class="sample-toggle" onclick="toggleSample('emailSample')">👁 See Sample Answer</button></div><div class="feedback-panel" id="emailFeedback"></div><div class="sample-answer" id="emailSample">'+prompt.sampleResponse+'</div></div>';
  const ta=document.getElementById('emailArea'),wc=document.getElementById('wc');
  const update=()=>{const w=ta.value.trim().split(/s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=130&&w<=160?'var(--success)':w>100?'var(--warning)':'var(--danger)';results[currentIdx]={text:ta.value};};
  ta.addEventListener('input',update);update();
}

function scoreEmail(idx){
  const text=document.getElementById('emailArea').value,words=text.trim().split(/s+/).filter(Boolean).length,prompt=items[idx];
  const polite=['would it be possible','i was wondering','please','thank you','sincerely','dear','kind regards','i apologize','i appreciate'];
  const completeness=prompt.requiredPoints.filter(p=>p.toLowerCase().split(' ').filter(w=>w.length>4).some(kw=>text.toLowerCase().includes(kw))).length;
  const politeness=polite.filter(w=>text.toLowerCase().includes(w)).length;
  const sentences=text.split(/[.!?]+/).filter(s=>s.trim().length>0);
  const avgLen=sentences.reduce((a,s)=>a+s.split(' ').length,0)/Math.max(sentences.length,1);
  const total=Math.min(10,Math.round((words>=130?3:words>=100?2:1)/3*3+(completeness/3)*4+(Math.min(politeness,3)/3)*2+(avgLen>10?3:avgLen>7?2:1)/3*1));
  const msgs=[];
  if(words<130)msgs.push('📏 Length: '+words+' words — aim for 130–140.');else msgs.push('📏 Length: '+words+' words ✓');
  if(completeness<3)msgs.push('✅ Points covered: '+completeness+'/3 — address all required points.');else msgs.push('✅ All 3 required points detected ✓');
  if(politeness<2)msgs.push('🤝 Try more polite phrases: "Would it be possible to…"');else msgs.push('🤝 Polite language detected ✓');
  const fb=document.getElementById('emailFeedback');fb.className='feedback-panel show '+(total>=8?'correct':total>=5?'partial':'incorrect');
  fb.innerHTML='<h4>'+(total>=8?'🎉 Excellent!':total>=5?'👍 Good attempt!':'📚 Needs improvement')+' — Score: '+total+'/10</h4><ul style="padding-left:18px;margin-top:8px;">'+msgs.map(m=>'<li style="margin-bottom:4px;">'+m+'</li>').join('')+'</ul><p style="margin-top:10px;font-size:0.85rem;color:var(--text-muted);">Click "See Sample Answer" to compare.</p>';
}

function renderDiscussion(area,prompt){
  const saved=results[currentIdx]?.text||'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">💬 Write for an Academic Discussion</h3><div class="discussion-context"><strong style="color:var(--primary);">Professor '+prompt.professor.name+':</strong><p style="margin-top:8px;font-size:0.93rem;line-height:1.7;">'+prompt.professor.question+'</p></div>'+prompt.students.map(s=>'<div class="student-response"><strong>'+s.name+':</strong><p style="margin-top:6px;font-size:0.9rem;line-height:1.65;">'+s.response+'</p></div>').join('')+'<div style="margin-top:20px;"><p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">Write your response (aim for 120+ words):</p><textarea class="writing-area" id="discussArea" placeholder="Write your contribution here..." style="min-height:180px;">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span style="color:var(--success);">Target: 120+ words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="scoreDiscussion('+currentIdx+')">📊 Get Feedback</button><button class="sample-toggle" onclick="toggleSample('discussSample')">👁 See Sample Answer</button></div></div><div class="feedback-panel" id="discussFeedback"></div><div class="sample-answer" id="discussSample">'+prompt.sampleResponse+'</div></div>';
  const ta=document.getElementById('discussArea'),wc=document.getElementById('wc');
  const update=()=>{const w=ta.value.trim().split(/s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=120?'var(--success)':w>80?'var(--warning)':'var(--danger)';results[currentIdx]={text:ta.value};};
  ta.addEventListener('input',update);update();
}

function scoreDiscussion(idx){
  const text=document.getElementById('discussArea').value,words=text.trim().split(/s+/).filter(Boolean).length,prompt=items[idx];
  const msgs=[];let score=0;
  if(words>=120){score+=3;msgs.push('📏 Length: '+words+' words ✓');}else{msgs.push('📏 Length: '+words+' words — aim for 120+.');score+=1;}
  const kws=(prompt.keywords||[]).filter(k=>text.toLowerCase().includes(k.toLowerCase()));
  if(kws.length>=4){score+=3;msgs.push('🎯 Topic relevance: Strong ✓');}else if(kws.length>=2){score+=2;msgs.push('🎯 Topic relevance: Decent — include more topic vocabulary.');}else{score+=1;msgs.push('🎯 Topic relevance: Weak — address the question directly.');}
  const examples=['for example','for instance','such as','in my experience','personally','i have','a study','research'];
  if(examples.some(e=>text.toLowerCase().includes(e))){score+=2;msgs.push('💡 Example included ✓');}else msgs.push('💡 Add a personal or hypothetical example.');
  const sentences=text.split(/[.!?]+/).filter(s=>s.trim().length>5);
  if(sentences.some(s=>s.includes(','))&&sentences.some(s=>s.split(' ').length<8)){score+=2;msgs.push('📝 Good sentence variety ✓');}else msgs.push('📝 Mix short and complex sentences.');
  const final=Math.min(10,score),fb=document.getElementById('discussFeedback');
  fb.className='feedback-panel show '+(final>=8?'correct':final>=5?'partial':'incorrect');
  fb.innerHTML='<h4>'+(final>=8?'🎉 Excellent!':final>=5?'👍 Good effort!':'📚 Needs more work')+' — Score: '+final+'/10</h4><ul style="padding-left:18px;margin-top:8px;">'+msgs.map(m=>'<li style="margin-bottom:4px;">'+m+'</li>').join('')+'</ul><p style="margin-top:10px;font-size:0.85rem;color:var(--text-muted);">Click "See Sample Answer" to compare.</p>';
}

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
  sum.innerHTML='<div class="score-summary"><h2>✅ Task Complete!</h2>'+(currentTask==='build-a-sentence'?'<div class="score-circle" style="background:conic-gradient(var(--primary) '+Math.round(correct/items.length*100)+'%,var(--surface2) 0%);"><div class="score-inner"><span class="score-num">'+correct+'/'+items.length+'</span><span class="score-label">Correct</span></div></div>':'<p style="font-size:1.05rem;margin-bottom:16px;">Review your feedback above or compare with the sample answers.</p>')+'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;"><button class="btn btn-secondary" onclick="backToTasks()">← Try Another Task</button><a href="mock-test.html" class="btn btn-primary">🎯 Full Mock Test</a></div></div>';
  showVideoAd(()=>{});
}

function startTimer(){updateTimer();timerInterval=setInterval(()=>{timeLeft--;updateTimer();if(timeLeft<=0){stopTimer();finishTask();}},1000);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function updateTimer(){const m=Math.floor(timeLeft/60),s=timeLeft%60,el=document.getElementById('timerDisplay');if(!el)return;el.textContent='⏱ '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.className='timer-display'+(timeLeft<60?' danger':timeLeft<120?' warning':'');}