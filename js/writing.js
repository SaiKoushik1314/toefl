/* TOEFL Prep Hub - Writing JS + Advanced Scoring Engine */
'use strict';
var currentTask=null,taskData=null,items=[],currentIdx=0,timerInterval=null,timeLeft=0,results=[];
var DATA_PATHS={'build-a-sentence':'data/writing/q1.json','write-email':'data/writing/q2.json','academic-discussion':'data/writing/q3.json'};

/* ===================== SCORING ENGINE ===================== */
var SCORING = {
  analyzeSentences: function(text) {
    var sents=text.match(/[^.!?]+[.!?]+/g)||[];
    if(!sents.length)return{count:0,avgLen:0,hasComplex:false,hasSimple:false,hasCompound:false,variety:0};
    var lens=sents.map(function(s){return s.trim().split(/s+/).length;});
    var avg=lens.reduce(function(a,b){return a+b;},0)/lens.length;
    var hasComplex=/although|because|since|while|whereas|however|therefore|furthermore|moreover|nevertheless|consequently|despite|unless|until/.test(text.toLowerCase());
    var hasCompound=/,s*(and|but|or|so|yet|for|nor)s/.test(text);
    var hasSimple=sents.some(function(s){return s.trim().split(/s+/).length<10;});
    return{count:sents.length,avgLen:Math.round(avg),hasComplex:hasComplex,hasSimple:hasSimple,hasCompound:hasCompound,variety:(hasComplex?1:0)+(hasCompound?1:0)+(hasSimple?1:0)};
  },
  analyzeVocabulary: function(text) {
    var words=text.toLowerCase().match(/[a-z]{3,}/g)||[];
    var unique=new Set(words);
    var ratio=words.length?unique.size/words.length:0;
    var academic=['furthermore','moreover','however','consequently','therefore','nevertheless','alternatively','significantly','demonstrate','indicate','suggest','evidence','argue','contend','perspective','consideration','substantial','fundamental','emphasize','acknowledge','conclude','examine','analyze','assess','evaluate','implement','establish','maintain','facilitate','contribute','influence','determine','identify','propose','address','complex','effective','essential','relevant','appropriate'];
    var formal=['would it be possible','i was wondering','i appreciate','i acknowledge','it is worth noting','one could argue','this demonstrates','this suggests','in addition','in contrast','on the other hand','as a result','for instance','for example','in my view','in conclusion'];
    var weak=['good','bad','nice','thing','stuff','a lot','very very','really really'];
    return{ratio:Math.round(ratio*100),academicCount:academic.filter(function(w){return text.toLowerCase().includes(w);}).length,formalCount:formal.filter(function(w){return text.toLowerCase().includes(w);}).length,weakCount:weak.filter(function(w){return text.toLowerCase().includes(w);}).length,uniqueWords:unique.size};
  },
  analyzeGrammar: function(text) {
    var hasPassive=/(is|are|was|were|been|being)s+w+ed/.test(text);
    var hasConditional=/(if|unless|should|would|could|might).*(then|would|could|might)/i.test(text);
    var hasPerfect=/(have|has|had)s+w+(ed|en)/.test(text);
    var sophisticationScore=(hasPassive?1:0)+(hasConditional?1:0)+(hasPerfect?1:0);
    return{sophisticationScore:sophisticationScore,hasPassive:hasPassive,hasConditional:hasConditional,hasPerfect:hasPerfect,issues:[]};
  },
  analyzeCoherence: function(text) {
    var t=text.toLowerCase();
    var cats={addition:['furthermore','moreover','in addition','additionally','also','besides'].filter(function(w){return t.includes(w);}).length,contrast:['however','nevertheless','on the other hand','in contrast','although','despite','whereas','yet'].filter(function(w){return t.includes(w);}).length,cause:['therefore','consequently','as a result','thus','hence','because','since'].filter(function(w){return t.includes(w);}).length,example:['for example','for instance','such as','to illustrate','specifically'].filter(function(w){return t.includes(w);}).length,concession:['admittedly','granted','of course','while it is true','even though'].filter(function(w){return t.includes(w);}).length};
    var total=Object.values(cats).reduce(function(a,b){return a+b;},0);
    var categories=Object.values(cats).filter(function(v){return v>0;}).length;
    return{total:total,categories:categories};
  },
  getBand: function(score) {
    if(score>=9)return{label:'Advanced',color:'#059669',emoji:'Top Score'};
    if(score>=7)return{label:'Upper Intermediate',color:'#10b981',emoji:'Well Done'};
    if(score>=5)return{label:'Intermediate',color:'#f59e0b',emoji:'Good Effort'};
    if(score>=3)return{label:'Lower Intermediate',color:'#f97316',emoji:'Keep Practicing'};
    return{label:'Needs Development',color:'#ef4444',emoji:'Just Starting'};
  },
  scoreEmail: function(text, prompt) {
    var words=text.trim().split(/s+/).filter(Boolean);
    var wc=words.length;
    var vocab=this.analyzeVocabulary(text);
    var grammar=this.analyzeGrammar(text);
    var coherence=this.analyzeCoherence(text);
    var feedback=[];var breakdown={};

    // Task completion
    var pointsCovered=(prompt.requiredPoints||[]).filter(function(p){
      var kws=p.toLowerCase().replace(/[^a-z ]/g,'').split(' ').filter(function(w){return w.length>4;});
      return kws.filter(function(kw){return text.toLowerCase().includes(kw);}).length>=Math.ceil(kws.length*0.4);
    }).length;
    var taskScore=pointsCovered===3?3:pointsCovered===2?2:pointsCovered===1?1:0;
    breakdown.task=taskScore;
    if(taskScore===3)feedback.push({type:'good',text:'Task Completion: All 3 required points addressed.'});
    else if(taskScore===2)feedback.push({type:'ok',text:'Task Completion: 2 of 3 required points detected. Review the prompt carefully.'});
    else feedback.push({type:'bad',text:'Task Completion: Only '+pointsCovered+' required point(s) detected. You must address all 3.'});

    // Word count
    var wcScore=wc>=130&&wc<=180?2:wc>=110?1:0;
    breakdown.length=wcScore;
    if(wc>=130&&wc<=180)feedback.push({type:'good',text:'Length: '+wc+' words - excellent range.'});
    else if(wc>=110)feedback.push({type:'ok',text:'Length: '+wc+' words - slightly '+(wc<130?'short, aim for 130+.':'long.')});
    else feedback.push({type:'bad',text:'Length: '+wc+' words - too short. Aim for at least 130 words.'});

    // Politeness
    var politeStarters=['dear','to whom it may concern'];
    var politeClosers=['sincerely','kind regards','yours faithfully','best regards','thank you'];
    var politeBody=['would it be possible','i was wondering','i would appreciate','i would be grateful','could you please','i regret','i apologize','please let me know'];
    var hasOpening=politeStarters.some(function(w){return text.toLowerCase().trimStart().startsWith(w);});
    var hasClosing=politeClosers.some(function(w){return text.toLowerCase().includes(w);});
    var politeBodyCount=politeBody.filter(function(w){return text.toLowerCase().includes(w);}).length;
    var politeScore=Math.min(2,(hasOpening?0.5:0)+(hasClosing?0.5:0)+Math.min(1,politeBodyCount*0.5));
    breakdown.politeness=Math.round(politeScore);
    if(politeScore>=1.5)feedback.push({type:'good',text:'Politeness: Strong formal register with appropriate opening and closing.'});
    else if(politeScore>=0.5)feedback.push({type:'ok',text:'Politeness: Add formal phrases like "I would be grateful if..." or "Could you please..."'});
    else feedback.push({type:'bad',text:'Politeness: Missing formal greeting (e.g. "Dear...") or closing (e.g. "Kind regards").'});

    // Vocabulary
    var vocabScore=vocab.academicCount>=3?1:vocab.weakCount>=2?0:0.5;
    breakdown.vocabulary=Math.round(vocabScore);
    if(vocab.academicCount>=3)feedback.push({type:'good',text:'Vocabulary: Good use of formal and academic language.'});
    else feedback.push({type:'ok',text:'Vocabulary: Try using more formal expressions such as "I would like to bring to your attention".'});

    // Grammar
    var grammarScore=grammar.sophisticationScore>=2?1:grammar.sophisticationScore>=1?0.5:0;
    breakdown.grammar=Math.round(grammarScore);
    if(grammar.sophisticationScore>=2)feedback.push({type:'good',text:'Grammar: Complex sentence structures detected - strong command of English.'});
    else feedback.push({type:'ok',text:'Grammar: Try adding more complex structures such as conditionals and passive voice.'});

    // Coherence
    var cohScore=coherence.categories>=2?1:coherence.categories>=1?0.5:0;
    breakdown.coherence=Math.round(cohScore);
    if(coherence.categories>=2)feedback.push({type:'good',text:'Cohesion: Good use of linking words across multiple categories.'});
    else feedback.push({type:'ok',text:'Cohesion: Add more linking phrases such as "Furthermore...", "As a result...", "In addition..."'});

    var total=Math.min(10,Math.round(taskScore+wcScore+politeScore+vocabScore+grammarScore+cohScore));
    return{total:total,breakdown:breakdown,feedback:feedback,wc:wc,band:this.getBand(total)};
  },
  scoreDiscussion: function(text, prompt) {
    var words=text.trim().split(/s+/).filter(Boolean);
    var wc=words.length;
    var vocab=this.analyzeVocabulary(text);
    var grammar=this.analyzeGrammar(text);
    var coherence=this.analyzeCoherence(text);
    var feedback=[];var breakdown={};

    // Word count
    var wcScore=wc>=150?2:wc>=120?1.5:wc>=90?1:0;
    breakdown.length=Math.round(wcScore);
    if(wc>=150)feedback.push({type:'good',text:'Length: '+wc+' words - excellent, well above the minimum.'});
    else if(wc>=120)feedback.push({type:'good',text:'Length: '+wc+' words - meets the 120-word requirement.'});
    else feedback.push({type:'bad',text:'Length: '+wc+' words - too short. Aim for at least 120 words.'});

    // Topic relevance
    var kws=prompt.keywords||[];
    var kwMatches=kws.filter(function(k){return text.toLowerCase().includes(k.toLowerCase());}).length;
    var kwRatio=kws.length?kwMatches/kws.length:0;
    var topicScore=kwRatio>=0.5?2:kwRatio>=0.3?1.5:kwRatio>=0.1?1:0;
    breakdown.relevance=Math.round(topicScore);
    if(topicScore>=2)feedback.push({type:'good',text:'Relevance: Strong - your response addresses the topic with appropriate vocabulary.'});
    else if(topicScore>=1)feedback.push({type:'ok',text:'Relevance: Somewhat on-topic. Make sure you directly address the discussion question.'});
    else feedback.push({type:'bad',text:'Relevance: Your response does not address the discussion topic. Re-read the question.'});

    // Argument development
    var hasOpinion=/(i think|i believe|i argue|in my view|in my opinion|my position|i would argue)/i.test(text);
    var hasExample=/(for example|for instance|such as|to illustrate|a study|research shows|personally|in my experience)/i.test(text);
    var hasReasoning=/(because|since|therefore|as a result|consequently|this means|this suggests|this demonstrates)/i.test(text);
    var argScore=(hasOpinion?0.7:0)+(hasExample?0.7:0)+(hasReasoning?0.6:0);
    breakdown.argument=Math.min(2,Math.round(argScore));
    if(hasOpinion&&hasExample&&hasReasoning)feedback.push({type:'good',text:'Argument: Strong - clear opinion, supporting example, and reasoning all present.'});
    else{var missing=[];if(!hasOpinion)missing.push('a clear position (e.g. "I believe...", "In my view...")');if(!hasExample)missing.push('a specific example (e.g. "For instance...", "Research shows...")');if(!hasReasoning)missing.push('reasoning (e.g. "Therefore...", "This demonstrates...")');if(missing.length)feedback.push({type:missing.length>=2?'bad':'ok',text:'Argument: Missing '+missing.join(' and ')+'.'});}

    // Engagement
    var studentNames=(prompt.students||[]).map(function(s){return s.name.toLowerCase();});
    var engages=studentNames.some(function(n){return text.toLowerCase().includes(n);});
    var engageScore=engages?1:0;
    breakdown.engagement=engageScore;
    if(engageScore)feedback.push({type:'good',text:'Engagement: You referenced your classmates contributions - excellent.'});
    else{var firstName=(prompt.students&&prompt.students[0])?prompt.students[0].name:'your classmate';feedback.push({type:'ok',text:'Engagement: Try referencing classmates by name (e.g. "While '+firstName+' argues..., I believe...")'});}

    // Language
    var vocabScore2=Math.min(1,vocab.academicCount*0.2+(vocab.ratio>60?0.5:0.2)-vocab.weakCount*0.1);
    var grammarScore2=Math.min(1,grammar.sophisticationScore*0.25+(grammar.issues.length===0?0.5:0));
    var langScore=Math.min(2,vocabScore2+grammarScore2);
    breakdown.language=Math.round(langScore);
    if(langScore>=1.5)feedback.push({type:'good',text:'Language: Strong vocabulary range and complex sentence structures.'});
    else if(langScore>=1)feedback.push({type:'ok',text:'Language: Adequate - try incorporating more academic vocabulary and varied sentence types.'});
    else feedback.push({type:'bad',text:'Language: Limited vocabulary. Study academic linking phrases and complex structures.'});

    // Coherence
    var cohScore2=coherence.categories>=3?1:coherence.categories>=2?0.75:coherence.categories>=1?0.5:0;
    breakdown.coherence=Math.round(cohScore2);
    if(coherence.categories>=2)feedback.push({type:'good',text:'Cohesion: Good use of discourse markers across '+coherence.categories+' categories.'});
    else feedback.push({type:'ok',text:'Cohesion: Use more linking expressions (e.g. "However...", "Moreover...", "Therefore...")'});

    var total=Math.min(10,Math.round(wcScore+topicScore+Math.min(2,argScore)+engageScore+langScore+cohScore2));
    return{total:total,breakdown:breakdown,feedback:feedback,wc:wc,band:this.getBand(total)};
  },
  renderFeedback: function(result, type) {
    var total=result.total,breakdown=result.breakdown,feedback=result.feedback,wc=result.wc,band=result.band;
    var breakdownLabels={task:'Task Completion',length:'Word Count',politeness:'Politeness',vocabulary:'Vocabulary',grammar:'Grammar',coherence:'Cohesion',relevance:'Relevance',argument:'Argument',engagement:'Engagement',language:'Language'};
    var maxScores=type==='email'?{task:3,length:2,politeness:2,vocabulary:1,grammar:1,coherence:1}:{length:2,relevance:2,argument:2,engagement:1,language:2,coherence:1};
    var breakdownHtml=Object.keys(breakdown).map(function(k){var v=breakdown[k],max=maxScores[k]||1,pct=Math.round(v/max*100),color=pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444';return '<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.83rem;"><span>'+(breakdownLabels[k]||k)+'</span><span style="font-weight:700;color:'+color+'">'+v+'/'+max+'</span></div><div style="background:#e2e8f0;border-radius:99px;height:6px;overflow:hidden;"><div style="background:'+color+';height:100%;width:'+pct+'%;border-radius:99px;"></div></div></div>';}).join('');
    var feedbackHtml=feedback.map(function(f){var bg=f.type==='good'?'#d1fae5':f.type==='ok'?'#fef3c7':'#fee2e2',border=f.type==='good'?'#10b981':f.type==='ok'?'#f59e0b':'#ef4444';return '<div style="background:'+bg+';border-left:3px solid '+border+';padding:8px 12px;border-radius:4px;margin-bottom:6px;font-size:0.87rem;">'+f.text+'</div>';}).join('');
    return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px;"><div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;"><div style="background:conic-gradient('+band.color+' '+(total*10)+'%,#e2e8f0 0%);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="background:#fff;width:60px;height:60px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-size:1.4rem;font-weight:900;color:'+band.color+';">'+total+'</span><span style="font-size:0.6rem;color:#64748b;text-transform:uppercase;">/ 10</span></div></div><div><div style="font-size:1.1rem;font-weight:700;">'+band.emoji+' - '+band.label+'</div><div style="font-size:0.85rem;color:#64748b;">'+wc+' words written</div><div style="font-size:0.82rem;color:'+band.color+';font-weight:600;margin-top:2px;">Score: '+total+'/10</div></div></div><div style="margin-bottom:16px;">'+breakdownHtml+'</div><div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:#1e293b;">Detailed Feedback:</div>'+feedbackHtml+'</div>';
  }
};

/* ===================== AD ===================== */
function showVideoAd(cb){var ov=document.getElementById('videoAd');ov.style.display='flex';ov._cb=cb;var s=30;document.getElementById('adCountdown').textContent=s;var sk=document.getElementById('skipBtn'),cx=document.getElementById('adCloseX');sk.classList.remove('visible');if(cx)cx.classList.remove('visible');var t=setInterval(function(){s--;document.getElementById('adCountdown').textContent=s;if(s<=5){sk.classList.add('visible');if(cx)cx.classList.add('visible');}if(s<=0){clearInterval(t);closeAd();}},1000);ov._t=t;}
function closeAd(){var ov=document.getElementById('videoAd');clearInterval(ov._t);ov.style.display='none';if(typeof ov._cb==='function')ov._cb();}

/* ===================== TASK LOADING ===================== */
function loadTask(t){currentTask=t;fetch(DATA_PATHS[t]).then(function(r){return r.json();}).then(function(data){taskData=data;showIntroModal(data);}).catch(function(e){alert('Could not load task data.');console.error(e);});}

function showIntroModal(data){
  document.getElementById('modalBadge').textContent=data.taskTitle;
  document.getElementById('modalTitle').textContent='About: '+data.taskTitle;
  var descs={'build-a-sentence':'Drag and drop words into the correct order to form grammatically correct sentences. One word may be extra.','write-email':'Write a polite professional email addressing all three required points. Aim for 130 to 140 words.','academic-discussion':'Read the professor question and student responses, then add your own contribution. Aim for 120 or more words.'};
  document.getElementById('modalDesc').textContent=descs[data.taskType]||'';
  var el=document.getElementById('modalExpect');el.innerHTML='';
  (data.whatToExpect||[]).forEach(function(t){var li=document.createElement('li');li.innerHTML='<span style="color:var(--success)">&#10003;</span> '+t;li.style.cssText='display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.88rem;';el.appendChild(li);});
  var tl=document.getElementById('modalTips');tl.innerHTML='';
  (data.tips||[]).forEach(function(t){var li=document.createElement('li');li.textContent=t;tl.appendChild(li);});
  var ov=document.getElementById('introOverlay');ov.style.display='flex';
  ov.onclick=function(e){if(e.target===ov)closeIntroModal();};
  document.addEventListener('keydown',handleEscKey);
}
function closeIntroModal(){document.getElementById('introOverlay').style.display='none';document.removeEventListener('keydown',handleEscKey);}
function handleEscKey(e){if(e.key==='Escape')closeIntroModal();}

function startTask(){
  closeIntroModal();
  document.getElementById('taskSelection').style.display='none';
  var pa=document.getElementById('practiceArea');pa.style.display='block';
  if(!document.getElementById('backToTasksBtn')){var b=document.createElement('button');b.id='backToTasksBtn';b.className='back-to-tasks-btn';b.innerHTML='&larr; Back to Tasks';b.onclick=backToTasks;pa.insertBefore(b,pa.firstChild);}
  items=taskData.questions||taskData.prompts||[];currentIdx=0;results=new Array(items.length).fill(null);timeLeft=taskData.timeSeconds;
  document.getElementById('taskHeading').textContent=taskData.taskTitle;
  if(currentTask!=='build-a-sentence'){var card=document.getElementById('rubricsCard'),rubric=items[0]&&items[0].scoringRubric;if(rubric&&card){card.style.display='block';document.getElementById('rubricList').innerHTML=Object.keys(rubric).map(function(k){return '<li style="padding:5px 0;border-bottom:1px solid var(--border);"><strong style="text-transform:capitalize;">'+k+':</strong> '+rubric[k]+'</li>';}).join('');}}
  startTimer();renderItem();
}
function backToTasks(){stopTimer();document.getElementById('practiceArea').style.display='none';document.getElementById('taskSelection').style.display='block';document.getElementById('scoreSummary').style.display='none';document.getElementById('questionArea').innerHTML='';document.getElementById('navBtns').style.display='flex';var rc=document.getElementById('rubricsCard');if(rc)rc.style.display='none';var b=document.getElementById('backToTasksBtn');if(b)b.remove();}

/* ===================== RENDER ===================== */
function renderItem(){
  var area=document.getElementById('questionArea'),total=items.length;
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

/* ===================== BUILD A SENTENCE ===================== */
function renderBuildSentence(area,q){
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><div class="sentence-context">'+q.context+'</div><p class="question-text">'+q.prompt+'</p>'+(q.fixedStart?'<p style="margin-bottom:8px;"><strong>'+q.fixedStart+'</strong></p>':'')+'<div class="drop-zone" id="dropZone" ondragover="allowDrop(event)" ondrop="dropWord(event)"></div>'+(q.fixedEnd?'<p style="margin-bottom:16px;"><strong>'+q.fixedEnd+'</strong></p>':'')+'<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">Word Bank - click or drag words into the box above:</p><div class="word-bank" id="wordBank"></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="checkSentence('+currentIdx+')">Check</button><button class="btn btn-secondary btn-sm" onclick="clearSentence()">Clear</button><button class="btn btn-sm" style="background:var(--surface2);color:var(--text-muted);" onclick="revealSentence('+currentIdx+')">Reveal</button></div><div class="feedback-panel" id="basFeedback"></div></div>';
  var zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');
  zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';
  var saved=results[currentIdx],placed=saved&&saved.placed?saved.placed:[],remaining=shuffle(q.words.slice()).filter(function(w){return placed.indexOf(w)===-1;});
  placed.forEach(function(w){zone.appendChild(createChip(w));});remaining.forEach(function(w){bank.appendChild(createChip(w));});
  if(placed.length>0){var h=document.getElementById('dropHint');if(h)h.remove();}
  if(saved&&saved.checked){var fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(saved.correct?'correct':'incorrect');fb.innerHTML=saved.correct?'<h4>Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p>';}
}
function createChip(word){var span=document.createElement('span');span.className='word-chip';span.textContent=word;span.draggable=true;span.addEventListener('dragstart',function(e){e.dataTransfer.setData('text',word);e.dataTransfer.setData('source',e.target.parentElement.id);e.target.style.opacity='0.5';});span.addEventListener('dragend',function(e){e.target.style.opacity='1';});span.addEventListener('click',function(){moveChip(span);});return span;}
function moveChip(chip){var zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank'),hint=document.getElementById('dropHint');if(hint)hint.remove();if(chip.parentElement===bank){zone.appendChild(chip);}else{bank.appendChild(chip);if(zone.children.length===0)zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}}
function allowDrop(e){e.preventDefault();}
function dropWord(e){e.preventDefault();var zone=document.getElementById('dropZone'),hint=document.getElementById('dropHint');if(hint)hint.remove();var word=e.dataTransfer.getData('text'),source=e.dataTransfer.getData('source'),bank=document.getElementById('wordBank');var chips=Array.from(bank.querySelectorAll('.word-chip')).concat(Array.from(zone.querySelectorAll('.word-chip')));var chip=chips.find(function(c){return c.textContent===word&&c.parentElement.id===source;});if(chip)zone.appendChild(chip);}
function clearSentence(){var zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');Array.from(zone.querySelectorAll('.word-chip')).forEach(function(c){bank.appendChild(c);});zone.innerHTML='<span id="dropHint" style="color:var(--text-light);font-size:0.88rem;">Click words or drag them here...</span>';}
function checkSentence(idx){var q=items[idx],placed=Array.from(document.getElementById('dropZone').querySelectorAll('.word-chip')).map(function(c){return c.textContent;}),correct=JSON.stringify(placed)===JSON.stringify(q.answer);results[idx]={placed:placed,checked:true,correct:correct};var fb=document.getElementById('basFeedback');fb.className='feedback-panel show '+(correct?'correct':'incorrect');fb.innerHTML=correct?'<h4>Perfect!</h4><p>'+q.fullSentence+'</p>':'<h4>Not quite.</h4><p>Correct: <strong>'+q.fullSentence+'</strong></p><p style="margin-top:6px;font-size:0.88rem;color:var(--text-muted);">Your answer: '+q.fixedStart+' '+placed.join(' ')+' '+q.fixedEnd+'</p>';}
function revealSentence(idx){var q=items[idx],zone=document.getElementById('dropZone'),bank=document.getElementById('wordBank');zone.innerHTML='';bank.innerHTML='';q.answer.forEach(function(w){var c=createChip(w);c.classList.add('placed');zone.appendChild(c);});if(q.extraWord){var c=createChip(q.extraWord);c.classList.add('extra');bank.appendChild(c);}results[idx]={placed:q.answer,checked:true,correct:true};}
function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}return arr;}

/* ===================== WRITE AN EMAIL ===================== */
function renderWriteEmail(area,prompt){
  var saved=results[currentIdx]&&results[currentIdx].text?results[currentIdx].text:'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">Write an Email</h3><div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-bottom:16px;font-size:0.93rem;line-height:1.7;">'+prompt.scenario+'</div><div class="required-points"><h4>Required Points (include all three):</h4><ol style="padding-left:20px;margin-top:6px;">'+prompt.requiredPoints.map(function(p){return '<li>'+p+'</li>';}).join('')+'</ol></div><p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Write your email below (aim for 130-140 words):</p><textarea class="writing-area" id="emailArea" placeholder="Dear '+prompt.recipient+',

...">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 130-140 words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="scoreEmailBtn" onclick="scoreEmailTask('+currentIdx+')">Analyze and Score</button><button class="sample-toggle" onclick="toggleSample('emailSample')">See Sample Answer</button></div><div id="emailFeedbackArea"></div><div class="sample-answer" id="emailSample">'+prompt.sampleResponse+'</div></div>';
  var ta=document.getElementById('emailArea'),wc=document.getElementById('wc');
  function update(){var w=ta.value.trim().split(/s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=130&&w<=180?'var(--success)':w>100?'var(--warning)':'var(--danger)';results[currentIdx]={text:ta.value};}
  ta.addEventListener('input',update);update();
}
function scoreEmailTask(idx){
  var text=document.getElementById('emailArea')&&document.getElementById('emailArea').value||'';
  if(text.trim().split(/s+/).filter(Boolean).length<20){document.getElementById('emailFeedbackArea').innerHTML='<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your email first before requesting feedback.</div>';return;}
  var btn=document.getElementById('scoreEmailBtn');if(btn){btn.textContent='Analyzing...';btn.disabled=true;}
  setTimeout(function(){
    var result=SCORING.scoreEmail(text,items[idx]);
    var html=SCORING.renderFeedback(result,'email');
    var area=document.getElementById('emailFeedbackArea');if(area)area.innerHTML=html;
    if(btn){btn.textContent='Re-analyze';btn.disabled=false;}
  },1200);
}

/* ===================== ACADEMIC DISCUSSION ===================== */
function renderDiscussion(area,prompt){
  var saved=results[currentIdx]&&results[currentIdx].text?results[currentIdx].text:'';
  area.innerHTML='<div class="question-card"><div class="question-number">'+(currentIdx+1)+'</div><h3 style="margin-bottom:14px;">Write for an Academic Discussion</h3><div class="discussion-context"><strong style="color:var(--primary);">Professor '+prompt.professor.name+':</strong><p style="margin-top:8px;font-size:0.93rem;line-height:1.7;">'+prompt.professor.question+'</p></div>'+prompt.students.map(function(s){return '<div class="student-response"><strong>'+s.name+':</strong><p style="margin-top:6px;font-size:0.9rem;line-height:1.65;">'+s.response+'</p></div>';}).join('')+'<div style="margin-top:20px;"><p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">Write your response (aim for 120 or more words):</p><textarea class="writing-area" id="discussArea" placeholder="Write your contribution here..." style="min-height:180px;">'+saved+'</textarea><div class="word-count-bar"><span>Words: <span class="word-count-num" id="wc">0</span></span><span id="wcTarget" style="font-size:0.83rem;">Target: 120+ words</span></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="scoreDiscBtn" onclick="scoreDiscussionTask('+currentIdx+')">Analyze and Score</button><button class="sample-toggle" onclick="toggleSample('discussSample')">See Sample Answer</button></div></div><div id="discussFeedbackArea"></div><div class="sample-answer" id="discussSample">'+prompt.sampleResponse+'</div></div>';
  var ta=document.getElementById('discussArea'),wc=document.getElementById('wc');
  function update(){var w=ta.value.trim().split(/s+/).filter(Boolean).length;wc.textContent=w;wc.style.color=w>=120?'var(--success)':w>80?'var(--warning)':'var(--danger)';results[currentIdx]={text:ta.value};}
  ta.addEventListener('input',update);update();
}
function scoreDiscussionTask(idx){
  var text=document.getElementById('discussArea')&&document.getElementById('discussArea').value||'';
  if(text.trim().split(/s+/).filter(Boolean).length<20){document.getElementById('discussFeedbackArea').innerHTML='<div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin-top:12px;">Please write your response first before requesting feedback.</div>';return;}
  var btn=document.getElementById('scoreDiscBtn');if(btn){btn.textContent='Analyzing...';btn.disabled=true;}
  setTimeout(function(){
    var result=SCORING.scoreDiscussion(text,items[idx]);
    var html=SCORING.renderFeedback(result,'discussion');
    var area=document.getElementById('discussFeedbackArea');if(area)area.innerHTML=html;
    if(btn){btn.textContent='Re-analyze';btn.disabled=false;}
  },1400);
}

/* ===================== HELPERS ===================== */
function toggleSample(id){var el=document.getElementById(id);el.style.display=el.style.display==='block'?'none':'block';}
function nextQ(){if(currentIdx<items.length-1){currentIdx++;renderItem();window.scrollTo(0,0);}}
function prevQ(){if(currentIdx>0){currentIdx--;renderItem();window.scrollTo(0,0);}}

function finishTask(){
  stopTimer();document.getElementById('questionArea').innerHTML='';document.getElementById('navBtns').style.display='none';
  var bb=document.getElementById('backToTasksBtn');if(bb)bb.style.display='none';
  var correct=0;if(currentTask==='build-a-sentence')correct=results.filter(function(r){return r&&r.correct;}).length;
  var sum=document.getElementById('scoreSummary');sum.style.display='block';
  sum.innerHTML='<div class="score-summary"><h2>Task Complete!</h2>'+(currentTask==='build-a-sentence'?'<div class="score-circle" style="background:conic-gradient(var(--primary) '+Math.round(correct/items.length*100)+'%,var(--surface2) 0%);"><div class="score-inner"><span class="score-num">'+correct+'/'+items.length+'</span><span class="score-label">Correct</span></div></div>':'<p style="font-size:1.05rem;margin-bottom:16px;">Your responses have been scored. Review your feedback above or compare with the sample answers.</p>')+'<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px;"><button class="btn btn-secondary" onclick="backToTasks()">&larr; Try Another Task</button><a href="mock-test.html" class="btn btn-primary">Full Mock Test</a></div></div>';
  showVideoAd(function(){});
}

/* ===================== TIMER ===================== */
function startTimer(){updateTimer();timerInterval=setInterval(function(){timeLeft--;updateTimer();if(timeLeft<=0){stopTimer();finishTask();}},1000);}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function updateTimer(){var m=Math.floor(timeLeft/60),s=timeLeft%60,el=document.getElementById('timerDisplay');if(!el)return;el.textContent='Timer: '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');el.className='timer-display'+(timeLeft<60?' danger':timeLeft<120?' warning':'');}
