const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');const payload=html.match(/<script id="word-data" type="application\/json">(.*?)<\/script>/s)[1];
const source=html.match(/<script>(.*?)<\/script>/s)[1];
function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial)),writes=[];
  return {values,writes,getItem(key){return values.get(key)??null},setItem(key,value){writes.push(key);values.set(key,value)}};
}
function boot({storage=memoryStorage(),data=payload,url='https://example.test/?lang=zh',languages=['zh-CN']}={}){
  const elements=new Map();
  function el(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},attributes:{},textContent:'',innerHTML:'',value:'',hidden:id==='overlay',setAttribute(k,v){this.attributes[k]=String(v)},getAttribute(k){return this.attributes[k]??null},focus(){context.document.activeElement=this;},querySelectorAll(){return[]}});return elements.get(id)}
  el('word-data').textContent=data;
  el('updated-at').setAttribute('datetime',html.match(/<time id="updated-at" datetime="([^"]+)"/)[1]);
  const filters=filterKeys.map(k=>{let e=el('filter-'+k);e.dataset.filter=k;return e});
  const handlers={};
  const location=new URL(url),historyWrites=[];
  const history={replaceState(_state,_title,next){historyWrites.push(next);location.href=next;}};
  const context=vm.createContext({document:{documentElement:el('document-root'),title:'',getElementById:el,querySelector:()=>el('progressbar'),querySelectorAll:()=>filters,addEventListener(type,fn){handlers[type]=fn}},window:{localStorage:storage,location,history,navigator:{languages,language:languages[0]},addEventListener(type,fn){handlers[type]=fn}},setTimeout:()=>0,clearTimeout(){},console,Math:Object.create(Math),URL,URLSearchParams});
  vm.runInContext(source,context);
  return {context,el,handlers,filters,storage,location,historyWrites,run:s=>vm.runInContext(s,context)};
}
const ids=app=>JSON.parse(app.run('JSON.stringify(deck.map(c=>c.id))'));
const filterKeys=[...html.matchAll(/data-filter="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(filterKeys,['all','compound','pair']);
const {context,el,handlers,filters,run}=boot();
assert.equal(run('deck.length'),117);assert.equal(el('prev').disabled,true);assert.match(el('cards').innerHTML,/snow/);
assert.equal(el('meta').textContent,'1 / 117');
assert.doesNotMatch(html,/慢读|data-slow|点图片或单词，听一听|读一读，然后合起来/);
assert.match(html,/<details class="help"><summary id="help-summary">玩法说明<\/summary>/);
const compoundIds=run("chooseDeck('compound').map(c=>c.id)");
const pairIds=run("chooseDeck('pair').map(c=>c.id)");
assert.equal(compoundIds.length+pairIds.length,117);
assert.equal(compoundIds.some(id=>pairIds.includes(id)),false);
assert.equal(run("ALL.filter(c=>c.id>=75&&c.id<105).every(c=>chooseDeck('pair').some(p=>p.id===c.id))"),true);
assert.equal(el('compound-count').textContent,79);assert.equal(el('pair-count').textContent,38);
assert.equal(run('ALL[0].word'),'snowman');
assert.equal(run("ALL.findIndex(c=>c.word==='raincoat')<ALL.findIndex(c=>c.word==='butterfly')"),true);
assert.equal(run("ALL.at(-1).word"),'hot dog');
// Read the visible colored text, not aria-labels, and check actual spelling.
for(let i=0;i<117;i++){
  run(`position=${i};revealed=false;render()`);
  const card=run('deck[position]');
  const visibleWords=()=>[...el('cards').innerHTML.matchAll(/<span class="word [^"]*" lang="en">(.*?)<\/span><\/button>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
  assert.deepEqual(visibleWords(),[card.a,card.b]);
  assert.equal((el('cards').innerHTML.match(/class="listen"/g)||[]).length,2);
  assert.ok(el('cards').innerHTML.includes(`<span class="word-part part-a">${card.a}</span>`));
  assert.ok(el('cards').innerHTML.includes(`<span class="word-part part-b">${card.b}</span>`));
  run('revealed=true;render()');
  assert.deepEqual(visibleWords(),[card.word]);
  assert.ok(el('cards').innerHTML.includes(`data-say="${card.word}"`));
  assert.equal((el('cards').innerHTML.match(/class="listen"/g)||[]).length,1);
  assert.equal(el('meta').textContent,`${i+1} / 117`);
}
run("setFilter('all')");
run('renderLibrary()');assert.doesNotMatch(el('library').innerHTML,/新增/);
el('reveal').onclick();assert.equal(run('revealed'),true);assert.match(el('cards').innerHTML,/snowman/);
assert.equal(el('toast').textContent,''); // Unsupported auto-read stays quiet.
run("setFilter('pair')");assert.equal(run('deck.length'),38);assert.equal(run('revealed'),false);assert.equal(run('deck[0].word'),'toy car');el('reveal').onclick();assert.match(el('cards').innerHTML,/toy car/);
run("setFilter('pair')");assert.equal(run('deck.length'),38);run('move(999)');assert.equal(el('next').disabled,true);run('move(-999)');assert.equal(el('prev').disabled,true);
el('search').value='bottle';run('renderLibrary()');assert.match(el('library').innerHTML,/water bottle/);
el('search').value='zzzz';run('renderLibrary()');assert.match(el('library').innerHTML,/没有找到/);
run("setFilter('compound')");assert.equal(run('deck.length'),79);assert.equal(run("deck.some(c=>c.word.includes(' '))"),false);
console.log('Interactive state checks passed: reveal, reset, 3 filters, bounds, search and no matches.');
run("setFilter('all');position=deck.findIndex(c=>c.word==='flower pot');revealed=false;render()");
assert.ok(el('cards').innerHTML.includes(run("DATA.art['pot@flower']")));
assert.ok(!el('cards').innerHTML.includes('pot@flower'));
run("position=deck.findIndex(c=>c.word==='teapot');render()");
assert.ok(el('cards').innerHTML.includes(run("DATA.art.pot")));
console.log('Context-specific pot artwork verified for flower pot and teapot.');
run("setFilter('all');position=deck.findIndex(c=>c.word==='bathroom');revealed=false;render()");
assert.doesNotMatch(el('cards').innerHTML,/data-picture="bathroom"/);
el('reveal').onclick();
assert.match(el('cards').innerHTML,/class="art" data-picture="bathroom"/);
assert.ok(el('cards').innerHTML.includes(run('DATA.art.bathroom')));
el('split').onclick();
assert.doesNotMatch(el('cards').innerHTML,/data-picture="bathroom"/);
// Follow the visible buttons, so labels and their actual actions cannot diverge.
run("setFilter('all')");
assert.equal(el('reveal').textContent,'拍手，揭晓');
assert.equal(el('split').hidden,true);
el('reveal').onclick();
assert.equal(el('reveal').textContent,'下一组 →');
assert.equal(el('split').hidden,false);
el('split').onclick();
assert.equal(run('position'),0);
assert.equal(run('revealed'),false);
assert.match(el('cards').innerHTML,/snow/);
assert.match(el('cards').innerHTML,/man/);
assert.doesNotMatch(el('cards').innerHTML,/snowman/);
for(let i=0;i<117;i++){
  assert.equal(run('position'),i);
  el('reveal').onclick();
  assert.equal(run('revealed'),true);
  assert.equal(el('reveal').textContent,i===116?'再玩一遍':'下一组 →');
  el('reveal').onclick();
  assert.equal(run('position'),(i+1)%117);
  assert.equal(run('revealed'),false);
  assert.equal(el('split').hidden,true);
}
run("setFilter('pair');move(999)");
el('reveal').onclick();
assert.equal(el('reveal').textContent,'再玩一遍');
el('reveal').onclick();
assert.equal(run('deck[position].word'),'toy car');
const space={key:' ',code:'Space',target:{tagName:'BODY',matches:()=>false},preventDefault(){}};
handlers.keydown(space);assert.equal(run('revealed'),true);
handlers.keydown({...space,repeat:true});assert.equal(run('revealed'),true);
handlers.keydown(space);assert.equal(run('position'),1);assert.equal(run('revealed'),false);
handlers.keydown({...space,target:{...space.target,tagName:'BUTTON'}});
assert.equal(run('revealed'),false); // Native button activation must not double-fire.
console.log('Primary forward flow, secondary review, full-deck loop, filtered restart and keyboard checks passed.');
// Selecting from another category must select the requested card and focus Play.
run("setFilter('compound');openLibrary()");
el('search').value=' CHOCOLATE ';el('search').oninput();
assert.match(el('library').innerHTML,/chocolate cake/);
const chosen=run("ALL.find(c=>c.word==='chocolate cake').id");
el('library').onclick({target:{closest:()=>({dataset:{id:String(chosen)}})}});
assert.equal(run('filter'),'all');assert.equal(run('deck[position].id'),chosen);
assert.equal(el('overlay').hidden,true);assert.equal(context.document.activeElement,el('reveal'));
el('reveal').onclick();assert.equal(run('revealed'),true);
run('openLibrary()');const before=run('position');handlers.keydown(space);
assert.equal(run('position'),before);assert.equal(run('revealed'),true);
handlers.keydown({...space,key:'Escape',code:'Escape'});
assert.equal(el('overlay').hidden,true);assert.equal(context.document.activeElement,el('catalog'));
let prevented=false;
handlers.keydown({...space,repeat:true,preventDefault(){prevented=true}});
assert.equal(prevented,true); // Holding Space must not start scrolling the page.
const reshuffling=boot();
for(let i=0;i<40;i++){
  const old=ids(reshuffling);reshuffling.el('random').onclick();
  assert.notDeepEqual(ids(reshuffling),old);
  assert.deepEqual(ids(reshuffling).slice().sort((a,b)=>a-b),Array.from({length:117},(_,n)=>n));
  assert.equal(reshuffling.run('position'),0);assert.equal(reshuffling.run('revealed'),false);
  assert.equal(reshuffling.el('sort-order').value,'shuffle');
}
// Normal cancellation, late callbacks and real failures need different handling.
let utterance;const spoken=[];
context.window.SpeechSynthesisUtterance=function(word){this.text=word};
context.window.speechSynthesis={
  cancel(){if(utterance)utterance.onerror({error:'interrupted'})},
  getVoices(){return[{lang:'en-US',localService:false},{lang:'en-GB',localService:true}]},
  speak(u){utterance=u;spoken.push(u)}
};
run("say('blue')");assert.equal(utterance.lang,'en-GB');assert.equal(utterance.rate,.9);
run("say('berry')");assert.equal(el('toast').textContent,'');
spoken[0].onerror({error:'audio-busy'});assert.equal(el('toast').textContent,'');
utterance.onerror({error:'canceled'});assert.equal(el('toast').textContent,'');
utterance.onerror({error:'voice-unavailable'});assert.match(el('toast').textContent,/暂时无法朗读/);
el('toast').textContent='';run('move(1)');assert.equal(el('toast').textContent,'');
// The same handler serves clicks on an image, a word or its listening controls.
el('cards').onclick({target:{closest:()=>({dataset:{say:'sunflower'}})}});
assert.equal(utterance.text,'sunflower');assert.equal(utterance.rate,.9);
const beforeBlankClick=spoken.length;el('cards').onclick({target:{closest:()=>null}});
assert.equal(spoken.length,beforeBlankClick);
run("setFilter('all')");const beforeAuto=spoken.length;
el('reveal').onclick();assert.equal(spoken.length,beforeAuto+1);assert.equal(utterance.text,'snowman');
el('reveal').onclick();assert.equal(spoken.length,beforeAuto+1); // Next group stays quiet.
el('auto-read').onclick();assert.equal(run('autoRead'),false);
assert.equal(el('auto-read').attributes['aria-pressed'],'false');
el('reveal').onclick();assert.equal(spoken.length,beforeAuto+1);
el('cards').onclick({target:{closest:()=>({dataset:{say:'snowball'}})}});
assert.equal(spoken.length,beforeAuto+2); // Manual listening still works.
el('auto-read').onclick();assert.equal(run('autoRead'),true);
assert.equal(spoken.length,beforeAuto+2); // Enabling does not unexpectedly speak.
run('showParts()');el('reveal').onclick();assert.equal(spoken.length,beforeAuto+3);
assert.equal(utterance.text,'snowball');
run("setFilter('pair');openLibrary();closeLibrary()");assert.equal(spoken.length,beforeAuto+3);
context.window.speechSynthesis.getVoices=()=>[];
run("say('toy car')");assert.equal(utterance.lang,'en-US');assert.equal(utterance.voice,null);
context.window.speechSynthesis.cancel=()=>{throw new Error('Service stopped')};
assert.doesNotThrow(()=>run('move(1)'));
context.window.speechSynthesis.speak=()=>{throw new Error('Audio unavailable')};
assert.doesNotThrow(()=>run("say('test')"));assert.match(el('toast').textContent,/暂时无法朗读/);
delete context.window.speechSynthesis;delete context.window.SpeechSynthesisUtterance;
run("say('blue')");assert.match(el('toast').textContent,/不支持朗读/);
console.log('Search selection, focus, modal shortcuts, repeated Space, random and speech error checks passed.');
console.log('All 117 colored word joins, one listening control per card, concise progress and reveal-only auto-read passed.');

// The collapsed help remains keyboard-accessible when search has no results.
run('openLibrary()');el('search').value='zzzz';el('search').oninput();
const summary=el('help-summary');
el('overlay').querySelectorAll=selector=>{assert.equal(selector,'button,input,summary');return [el('close'),el('search'),summary];};
let tabPrevented=false;
const tabKey={...space,key:'Tab',code:'Tab',preventDefault(){tabPrevented=true}};
el('search').focus();handlers.keydown(tabKey);assert.equal(tabPrevented,false);
summary.focus();handlers.keydown(tabKey);assert.equal(context.document.activeElement,el('close'));
handlers.keydown({...tabKey,shiftKey:true});assert.equal(context.document.activeElement,summary);
run('closeLibrary()');

// Persisted learning state is separate from rendering and never contains artwork
// or child/account data. A fresh VM simulates a reload or a new site version.
const storageKey='word-together:learning:v1';
for(const id of ['review-card','review-only','learning-status','save-note'])assert.ok(html.includes(`id="${id}"`));
const savedStore=memoryStorage({'another-app':'keep me'});
const first=boot({storage:savedStore});
assert.equal(savedStore.writes.length,0); // Opening/reading never writes storage.
first.run('openLibrary();closeLibrary();render()');
assert.equal(savedStore.writes.length,0);
first.run('move(3)');const resumeId=first.run('deck[position].id');
assert.equal(first.run('completed.size'),0); // Navigation is not completion.
first.el('reveal').onclick();first.el('split').onclick();first.el('reveal').onclick();
assert.equal(first.run('completed.size'),1);
first.el('review-card').onclick();first.el('auto-read').onclick();
let record=JSON.parse(savedStore.getItem(storageKey));
assert.equal(record.currentId,resumeId);assert.equal(record.autoRead,false);
assert.deepEqual(record.completed,[resumeId]);assert.deepEqual(record.review,[resumeId]);
assert.deepEqual(Object.keys(record).sort(),['autoRead','completed','currentId','shuffleIds','filter','review','reviewOnly','sortOrder','version'].sort());
assert.equal(savedStore.getItem('another-app'),'keep me');
assert.ok(savedStore.writes.every(k=>k===storageKey));
const writesBeforeReload=savedStore.writes.length;
const reloaded=boot({storage:savedStore});
assert.equal(savedStore.writes.length,writesBeforeReload);
assert.equal(reloaded.run('deck[position].id'),resumeId);assert.equal(reloaded.run('revealed'),false);
assert.equal(reloaded.run('autoRead'),false);assert.equal(reloaded.run('completed.size'),1);
assert.equal(reloaded.el('review-card').attributes['aria-pressed'],'true');
assert.equal(reloaded.el('learning-status').textContent,'已揭晓 1 / 117');
const reorderedData=JSON.parse(payload);reorderedData.cards.reverse();
const reordered=boot({storage:savedStore,data:JSON.stringify(reorderedData)});
assert.equal(reordered.run('deck[position].id'),resumeId); // IDs survive editorial sorting.
assert.notEqual(reordered.run('position'),reloaded.run('position'));

// Review is a practice mode, independent of the three spelling categories.
reloaded.run("setFilter('pair')");const pairId=reloaded.run('deck[position].id');
reloaded.el('review-card').onclick();reloaded.el('review-only').onclick();
assert.equal(reloaded.run('reviewOnly'),true);assert.equal(reloaded.run('deck.length'),2);
assert.equal(reloaded.el('compound-count').textContent,79);assert.equal(reloaded.el('pair-count').textContent,38);
reloaded.run("setFilter('pair')");
assert.equal(reloaded.run('deck.length'),1);assert.equal(reloaded.run('deck[0].id'),pairId);
assert.equal(reloaded.el('random').disabled,true);
reloaded.el('random').onclick();assert.equal(reloaded.run('deck[0].id'),pairId);
const reviewReload=boot({storage:savedStore});
assert.equal(reviewReload.run('reviewOnly'),true);assert.equal(reviewReload.run('filter'),'pair');
assert.equal(reviewReload.run('deck[0].id'),pairId);
reviewReload.el('review-card').onclick(); // Remove the last card of this category.
assert.equal(reviewReload.run('deck.length'),0);assert.match(reviewReload.el('cards').innerHTML,/还没有/);
assert.equal(reviewReload.el('reveal').disabled,true);assert.equal(reviewReload.el('review-card').hidden,true);
assert.equal(reviewReload.el('prev').disabled,true);assert.equal(reviewReload.el('next').disabled,true);
assert.equal(reviewReload.el('progressbar').attributes['aria-valuenow'],'0');
assert.doesNotThrow(()=>reviewReload.run('primaryAction();move(1);move(-1);shuffleDeck()'));
reviewReload.run("setFilter('compound')");assert.equal(reviewReload.run('deck[0].id'),resumeId);
reviewReload.el('review-card').onclick();assert.equal(reviewReload.run('review.size'),0);
reviewReload.run('openLibrary()');assert.match(reviewReload.el('library').innerHTML,/snowman/);
reviewReload.el('library').onclick({target:{closest:()=>({dataset:{id:String(pairId)}})}});
assert.equal(reviewReload.run('reviewOnly'),false);assert.equal(reviewReload.run('deck.length'),117);
assert.equal(reviewReload.run('deck[position].id'),pairId);
reviewReload.el('review-only').onclick();assert.equal(reviewReload.run('deck.length'),0);
reviewReload.el('review-only').onclick();assert.equal(reviewReload.run('deck.length'),117);

// One shuffle changes the complete order; Next group then visits every card
// exactly once, including across reloads, without reshuffling on render.
const shuffleStore=memoryStorage();let shuffle=boot({storage:shuffleStore});
shuffle.el('random').onclick();const shuffledSequence=ids(shuffle);
const visited=[];
for(let i=0;i<117;i++){
  if(i===41)shuffle=boot({storage:shuffleStore});
  assert.deepEqual(ids(shuffle),shuffledSequence);
  visited.push(shuffle.run('deck[position].id'));
  shuffle.el('reveal').onclick(); // Reveal, then follow the primary next button.
  assert.equal(shuffle.run('revealed'),true);
  shuffle.el('reveal').onclick();
}
assert.deepEqual(visited,shuffledSequence);assert.equal(new Set(visited).size,117);
assert.equal(shuffle.run('completed.size'),117);assert.equal(shuffle.run('position'),0);
const stableWrites=shuffleStore.writes.length;
shuffle.run('render();renderLibrary()');assert.deepEqual(ids(shuffle),shuffledSequence);
assert.equal(shuffleStore.writes.length,stableWrites);
shuffle.run("setLanguage('en')");assert.deepEqual(ids(shuffle),shuffledSequence);
shuffle.el('random').onclick();assert.notDeepEqual(ids(shuffle),shuffledSequence);
assert.equal(shuffle.run('completed.size'),117);assert.equal(shuffle.run('revealed'),false);
// Category and search views keep the relative order of the same permutation.
const allShuffled=ids(shuffle);
shuffle.run("setFilter('pair')");const pairSequence=ids(shuffle);
assert.deepEqual(pairSequence,allShuffled.filter(id=>shuffle.run(`ALL.find(c=>c.id===${id}).kind==='pair'`)));
assert.equal(pairSequence.length,38);
shuffle.el('random').onclick();assert.notDeepEqual(ids(shuffle),pairSequence);
assert.equal(new Set(ids(shuffle)).size,38);assert.equal(shuffle.run("deck.every(c=>c.kind==='pair')"),true);
shuffle.run("setFilter('all');openLibrary()");
assert.deepEqual([...shuffle.el('library').innerHTML.matchAll(/data-id="(\d+)"/g)].map(m=>Number(m[1])),ids(shuffle));
shuffle.el('search').value='snow';shuffle.el('search').oninput();
const snowIds=[...shuffle.el('library').innerHTML.matchAll(/data-id="(\d+)"/g)].map(m=>Number(m[1]));
assert.deepEqual(snowIds,ids(shuffle).filter(id=>shuffle.run(`ALL.find(c=>c.id===${id}).word.includes('snow')`)));
shuffle.run('closeLibrary();move(5)');const shuffleCurrent=shuffle.run('deck[position].id'),sequenceBeforeSync=ids(shuffle);
const syncWrites=shuffleStore.writes.length;
shuffle.handlers.storage({key:storageKey,newValue:JSON.stringify({version:1,sortOrder:'shuffle',shuffleIds:allShuffled,completed:[shuffleCurrent],review:[]})});
assert.deepEqual(ids(shuffle),sequenceBeforeSync);assert.equal(shuffle.run('deck[position].id'),shuffleCurrent);
assert.equal(shuffleStore.writes.length,syncWrites);
// A repeated RNG result still produces a different order, including just two
// review cards. Neither shuffling nor selecting another sort clears progress.
const twoCards=boot();twoCards.run('toggleReview();move(1);primaryAction();toggleReview();toggleReviewOnly();Math.random=()=>.999999');
for(let i=0;i<4;i++){
  const old=ids(twoCards);twoCards.el('random').onclick();assert.deepEqual(ids(twoCards),old.slice().reverse());
  assert.equal(twoCards.run('completed.size'),1);assert.equal(twoCards.run('review.size'),2);
}
assert.equal(twoCards.el('toast').textContent,'已重新打乱 2 组');
twoCards.run("setSort('recommended');Math.random=()=>.999999");
const unchangedCandidate=ids(twoCards);twoCards.el('sort-order').onchange({target:{value:'shuffle'}});
assert.notDeepEqual(ids(twoCards),unchangedCandidate);assert.equal(twoCards.el('sort-order').value,'shuffle');
// Single-card and empty views cannot change order and don't write new state.
twoCards.run('toggleReview()');assert.equal(twoCards.run('deck.length'),1);
assert.equal(twoCards.el('random').disabled,true);assert.equal(twoCards.el('sort-shuffle').disabled,true);
let smallWrites=twoCards.storage.writes.length;twoCards.run('shuffleDeck()');assert.equal(twoCards.storage.writes.length,smallWrites);
twoCards.run("setSort('az')");smallWrites=twoCards.storage.writes.length;
twoCards.el('sort-order').value='shuffle';twoCards.run("setSort('shuffle')");
assert.equal(twoCards.el('sort-order').value,'az');assert.equal(twoCards.storage.writes.length,smallWrites);
twoCards.run('toggleReview()');smallWrites=twoCards.storage.writes.length;twoCards.run('shuffleDeck()');
assert.equal(twoCards.run('deck.length'),0);assert.equal(twoCards.storage.writes.length,smallWrites);
// Missing, duplicate, unknown, string or incomplete order IDs safely fall back.
for(const badOrder of [null,[],[0,1],Array(117).fill(0),Array.from({length:117},(_,i)=>String(i)),Array.from({length:117},(_,i)=>i+1)]){
  const corruptShuffle=memoryStorage({[storageKey]:JSON.stringify({version:1,sortOrder:'shuffle',shuffleIds:badOrder,currentId:resumeId,completed:[resumeId],review:[resumeId]})});
  const safe=boot({storage:corruptShuffle});assert.equal(safe.run('sortOrder'),'recommended');
  assert.equal(safe.run('deck[position].id'),resumeId);assert.equal(safe.run('completed.size'),1);assert.equal(safe.run('review.size'),1);
  assert.equal(corruptShuffle.writes.length,0);
}
console.log('Shuffle order passed: 117 unique groups, changed permutations, next/restart, reload, filters/search/review, two-card fallback, single/empty lists, corrupt records and cross-tab stability.');

// Malformed, old or unavailable storage must not break playing or overwrite
// an unsupported future schema. Only known numeric IDs can be restored.
const dirty=memoryStorage({[storageKey]:JSON.stringify({version:1,currentId:99999,filter:'bogus',completed:[resumeId,resumeId,'4',-1,99999],review:[pairId,'4'],drawn:'wrong',autoRead:'wrong'})});
const cleaned=boot({storage:dirty});
assert.equal(cleaned.run('position'),0);assert.equal(cleaned.run('filter'),'all');
assert.equal(cleaned.run('completed.size'),1);assert.equal(cleaned.run('review.size'),1);
assert.equal(cleaned.run('autoRead'),true);assert.equal(dirty.writes.length,0);
const brokenStore=memoryStorage({[storageKey]:'{bad json'});const broken=boot({storage:brokenStore});
assert.equal(broken.run('storageState'),'recovered');broken.el('reveal').onclick();
assert.equal(JSON.parse(brokenStore.getItem(storageKey)).completed.length,1);
const futureStore=memoryStorage({[storageKey]:JSON.stringify({version:2,keep:'future data'})});
const future=boot({storage:futureStore});future.run('move(1);primaryAction()');
assert.equal(futureStore.writes.length,0);assert.match(future.el('learning-status').textContent,/仅本次有效/);
for(const storage of [null,{getItem(){throw new Error('Blocked')}},{getItem(){return null},setItem(){throw new Error('Quota')}}]){
  const unavailable=boot({storage});
  assert.doesNotThrow(()=>unavailable.run('move(1);primaryAction();toggleReview();toggleAutoRead();shuffleDeck()'));
  assert.equal(unavailable.run('completed.size'),1);assert.equal(unavailable.run('review.size'),1);
  assert.match(unavailable.el('learning-status').textContent,/仅本次有效/);
}
// A second tab receives browser storage events without jumping cards or
// creating a write loop. Removing a review card elsewhere also handles empty decks.
const shared=memoryStorage(),left=boot({storage:shared}),right=boot({storage:shared});
left.run('move(2);primaryAction();toggleReview()');
const beforeSync=shared.writes.length;
right.handlers.storage({key:storageKey,newValue:shared.getItem(storageKey)});
assert.equal(shared.writes.length,beforeSync);assert.equal(right.run('position'),0);
assert.equal(right.run('completed.size'),1);assert.equal(right.run('review.size'),1);
right.run('primaryAction();toggleReviewOnly()');
assert.equal(JSON.parse(shared.getItem(storageKey)).completed.length,2);
left.handlers.storage({key:storageKey,newValue:shared.getItem(storageKey)});
left.el('review-card').onclick();
right.handlers.storage({key:storageKey,newValue:shared.getItem(storageKey)});
assert.equal(right.run('deck.length'),0);assert.equal(right.el('reveal').disabled,true);
right.handlers.storage({key:'another-app',newValue:'garbage'});assert.equal(right.run('storageState'),'ready');
right.handlers.storage({key:storageKey,newValue:null});assert.equal(right.run('completed.size'),0);
console.log('Persistence passed: reload, stable IDs, unique revealed counts, review/empty states, saved shuffle order, malformed data, storage failures and cross-tab events.');

// Sort controls, exact alphabetic/length ordering and filter/review composition.
assert.match(html,/<button data-filter="compound" aria-pressed="false"><span id="category-compound">连着写<\/span> <span id="compound-count"><\/span><\/button>/);
assert.match(html,/<button data-filter="pair" aria-pressed="false"><span id="category-pair">分开写<\/span> <span id="pair-count"><\/span><\/button>/);
assert.doesNotMatch(html,/合成一个词|保留两个词/);
assert.deepEqual([...html.matchAll(/<option id="[^"]+" value="([^"]+)">/g)].map(m=>m[1]),['recommended','az','za','short','shuffle']);
const sortedStore=memoryStorage(),sorting=boot({storage:sortedStore});
const baseCards=JSON.parse(payload).cards;
const spellingOf=c=>c.word.replace(/\s/g,'');
const expectedAz=baseCards.slice().sort((a,b)=>spellingOf(a).localeCompare(spellingOf(b),'en')||a.id-b.id);
const expectedShort=baseCards.slice().sort((a,b)=>spellingOf(a).length-spellingOf(b).length||spellingOf(a).localeCompare(spellingOf(b),'en')||a.id-b.id);
sorting.el('reveal').onclick();const completionBefore=sorting.run('completed.size');
sorting.el('sort-order').onchange({target:{value:'az'}});
assert.deepEqual(ids(sorting),expectedAz.map(c=>c.id));assert.equal(sorting.run('position'),0);assert.equal(sorting.run('revealed'),false);
assert.equal(sorting.run('deck[0].word'),'airplane');assert.equal(sorting.run('completed.size'),completionBefore);
sorting.run('move(1)');assert.equal(sorting.run('deck[position].word'),'airport');
sorting.run("setSort('za')");assert.deepEqual(ids(sorting),expectedAz.map(c=>c.id).reverse());
sorting.run("setSort('short')");assert.deepEqual(ids(sorting),expectedShort.map(c=>c.id));
sorting.run("setFilter('pair')");assert.deepEqual(ids(sorting),expectedShort.filter(c=>c.kind==='pair').map(c=>c.id));
sorting.run("setSort('az');move(2)");const sortedCurrent=sorting.run('deck[position].id');
const sortedWrites=sortedStore.writes.length,sortingReload=boot({storage:sortedStore});
assert.equal(sortedStore.writes.length,sortedWrites);assert.equal(sortingReload.run('sortOrder'),'az');
assert.equal(sortingReload.el('sort-order').value,'az');assert.equal(sortingReload.run('deck[position].id'),sortedCurrent);
assert.equal(sortingReload.run('filter'),'pair');
sortingReload.run('openLibrary()');sortingReload.el('search').value='apple';sortingReload.el('search').oninput();
const libraryIds=[...sortingReload.el('library').innerHTML.matchAll(/data-id="(\d+)"/g)].map(m=>Number(m[1]));
assert.deepEqual(libraryIds,expectedAz.filter(c=>[c.a,c.b,c.word].some(w=>w.includes('apple'))).map(c=>c.id));
sortingReload.run('closeLibrary();toggleReview();move(1);toggleReview();toggleReviewOnly()');
assert.equal(sortingReload.run('deck.length'),2);
sortingReload.run("setSort('za')");assert.deepEqual(ids(sortingReload),expectedAz.filter(c=>sortingReload.run(`review.has(${c.id})`)).map(c=>c.id).reverse());
sortingReload.run('toggleReview();toggleReview()');assert.equal(sortingReload.run('deck.length'),0);
assert.doesNotThrow(()=>sortingReload.run("setSort('short');primaryAction();shuffleDeck()"));
assert.equal(sortingReload.el('reveal').disabled,true);
const invalidSort=boot({storage:memoryStorage({[storageKey]:JSON.stringify({version:1,sortOrder:'bad'})})});
assert.equal(invalidSort.run('sortOrder'),'recommended');assert.equal(first.run('sortOrder'),'recommended');
const beforeBadSort=ids(sorting);sorting.run("setSort('bad')");assert.deepEqual(ids(sorting),beforeBadSort);
sorting.run("setFilter('all');setSort('recommended')");assert.deepEqual(ids(sorting),baseCards.map(c=>c.id));
// Arrow keys on a native select must not also move a card.
const selectBefore=sorting.run('position');sorting.handlers.keydown({key:'ArrowDown',target:{matches:()=>true},preventDefault(){throw Error('Native select key intercepted')}});
assert.equal(sorting.run('position'),selectBefore);
// A different tab's sort preference must not reorder the current tab.
const localSort=boot();localSort.run("setSort('az');move(4)");const localSortId=localSort.run('deck[position].id');
localSort.handlers.storage({key:storageKey,newValue:JSON.stringify({version:1,sortOrder:'za',completed:[],review:[],drawn:[]})});
assert.equal(localSort.run('sortOrder'),'az');assert.equal(localSort.run('deck[position].id'),localSortId);
console.log('Sorting passed: A–Z, Z–A, length, reset, search, filters, review, persistence, old records and cross-tab stability.');

// Word notes use the chosen interface language; learning words stay English.
const chinese=boot(),hintWrites=chinese.storage.writes.length;
assert.match(html,/<summary id="word-help-summary">词语提示<\/summary>/);
assert.equal(chinese.el('word-help').hidden,true);
assert.doesNotMatch(chinese.el('cards').innerHTML,/雪人|组合后/);
chinese.run("position=deck.findIndex(c=>c.word==='rubber duck');render()");
assert.equal(chinese.el('word-help').hidden,false);assert.equal(chinese.el('word-help').open,false);
assert.match(chinese.el('word-help-content').innerHTML,/rubber 在这里指橡胶/);
chinese.el('word-help').open=true;
chinese.handlers.keydown({key:' ',code:'Space',target:{tagName:'SUMMARY',matches:s=>s.split(',').includes('summary')},preventDefault(){throw Error('Native help expansion intercepted')}});
assert.equal(chinese.run('revealed'),false);assert.equal(chinese.storage.writes.length,hintWrites);
chinese.el('reveal').onclick();assert.equal(chinese.el('word-help').open,true);
chinese.el('split').onclick();assert.equal(chinese.el('word-help').open,true);
chinese.run('move(1)');assert.equal(chinese.el('word-help').open,false);
assert.doesNotMatch(chinese.el('word-help-content').innerHTML,/橡胶/);
for(const card of JSON.parse(payload).cards){
  chinese.run(`position=deck.findIndex(c=>c.id===${card.id});render()`);
  const content=chinese.el('word-help-content').innerHTML;
  assert.equal(chinese.el('word-help').hidden,!card.zh.note);
  if(card.zh.note)assert.ok(content.includes(card.zh.note));else assert.equal(content,'');
  assert.equal(chinese.el('word-help').open,false);
}
chinese.run('toggleReviewOnly()');
assert.equal(chinese.run('deck.length'),0);assert.equal(chinese.el('word-help').hidden,true);
assert.equal(chinese.el('word-help-content').innerHTML,'');
const searching=boot();searching.run('openLibrary()');
for(const [query,word] of [['雪人','snowman'],['热狗','hot dog'],['橡胶','rubber duck'],['盆','flower pot'],[' SNOWMAN ','snowman']]){
  searching.el('search').value=query;searching.el('search').oninput();
  const matches=[...searching.el('library').innerHTML.matchAll(/data-id="(\d+)"/g)].map(m=>Number(m[1]));
  assert.ok(matches.includes(baseCards.find(c=>c.word===word).id));
  assert.doesNotMatch(searching.el('library').innerHTML,/entry-meaning/);
}
const searchWrites=searching.storage.writes.length;
searching.el('search').value='找不到的词';searching.el('search').oninput();
assert.match(searching.el('library').innerHTML,/没有找到/);
assert.equal(searching.storage.writes.length,searchWrites);
const injected=JSON.parse(payload);injected.cards[0].zh.note='<img src=x onerror=alert(1)>';injected.cards[0].note_en='<script>alert(1)</script>';
const safeHints=boot({data:JSON.stringify(injected)});
assert.doesNotMatch(safeHints.el('word-help-content').innerHTML,/<img/);
safeHints.run("setLanguage('en')");assert.doesNotMatch(safeHints.el('word-help-content').innerHTML,/<script>/);
console.log('Word notes passed: bilingual explanations, English learning words, collapsed defaults, card changes, keyboard, empty review, bilingual search and escaped text.');

// Language selection: explicit URL > saved choice > supported browser language > English.
const languageKey='word-together:language:v1';
for(const [url,saved,languages,expected] of [
  ['?lang=en','zh',['zh-CN'],'en'],['?lang=zh','en',['en-US'],'zh'],
  ['', 'en',['zh-CN'],'en'],['',null,['zh-TW','en-US'],'zh'],
  ['',null,['fr-FR','en-US'],'en'],['?lang=xx','bad',['fr'],'en'],
  ['?lang=zh-CN',null,['en-US'],'en']
]){
  const storage=memoryStorage(saved?{[languageKey]:saved}:{});
  const app=boot({url:'https://example.test/'+url,storage,languages});
  assert.equal(app.run('locale'),expected);
  assert.equal(app.context.document.documentElement.lang,expected==='zh'?'zh-CN':'en');
  assert.equal(storage.writes.length,0);assert.equal(app.historyWrites.length,0);
}
const languageStore=memoryStorage(),langApp=boot({storage:languageStore,url:'https://example.test/'});
langApp.run("setSort('az');position=deck.findIndex(c=>c.word==='rubber duck');render();primaryAction();toggleReview()");
langApp.el('word-help').open=true;
const stateBefore=langApp.run('JSON.stringify({position,sortOrder,filter,revealed,autoRead,review:[...review],completed:[...completed],shuffleIds})');
const progressBefore=languageStore.getItem(storageKey),writesBeforeLanguage=languageStore.writes.length;
langApp.el('language-en').onclick({preventDefault(){}});
assert.equal(langApp.run('locale'),'en');assert.equal(languageStore.getItem(languageKey),'en');
assert.equal(languageStore.getItem(storageKey),progressBefore);
assert.deepEqual(languageStore.writes.slice(writesBeforeLanguage),[languageKey]);
assert.equal(langApp.run('JSON.stringify({position,sortOrder,filter,revealed,autoRead,review:[...review],completed:[...completed],shuffleIds})'),stateBefore);
assert.equal(langApp.el('word-help').open,true);assert.match(langApp.el('word-help-content').innerHTML,/Rubber is a material/);
assert.doesNotMatch(langApp.el('word-help-content').innerHTML,/[\u4e00-\u9fff]/);
assert.equal(langApp.el('random').textContent,'Shuffle');assert.equal(langApp.el('catalog').textContent,'Choose words');
assert.equal(langApp.el('category-compound').textContent,'One word');assert.equal(langApp.el('category-pair').textContent,'Two words');
assert.equal(langApp.el('language-en').attributes['aria-current'],'page');
assert.equal(langApp.el('search').attributes['aria-label'],'Search word groups in English or Chinese');
assert.equal(langApp.location.search,'?lang=en');
const langReload=boot({storage:languageStore,url:'https://example.test/',languages:['zh-CN']});
assert.equal(langReload.run('locale'),'en');assert.equal(langReload.run('deck[position].id'),langApp.run('deck[position].id'));
// Open chooser preserves query and English result words while switching.
langApp.run('openLibrary()');langApp.el('search').value='rubber';langApp.el('search').oninput();
langApp.run("setLanguage('zh')");assert.equal(langApp.el('overlay').hidden,false);assert.equal(langApp.el('search').value,'rubber');
assert.match(langApp.el('library').innerHTML,/rubber duck/);assert.doesNotMatch(langApp.el('library').innerHTML,/橡胶小鸭/);
langApp.run("setLanguage('en')");
assert.doesNotMatch(langApp.el('library').innerHTML,/[\u4e00-\u9fff]/);
langApp.run('closeLibrary()');
// Every card, note, action, status and library result in English is free of Chinese UI copy.
const english=boot({url:'https://example.test/?lang=en'});
for(let i=0;i<117;i++){
  english.run(`position=${i};revealed=false;render()`);
  assert.doesNotMatch(english.el('cards').innerHTML,/[\u4e00-\u9fff]/);
  assert.doesNotMatch(english.el('word-help-content').innerHTML,/[\u4e00-\u9fff]/);
  english.run('primaryAction()');
  assert.equal(english.run('revealed'),true);
  assert.doesNotMatch(english.el('cards').innerHTML,/[\u4e00-\u9fff]/);
}
english.run('openLibrary()');assert.doesNotMatch(english.el('library').innerHTML,/[\u4e00-\u9fff]/);
english.el('search').value='zzzz';english.el('search').oninput();assert.match(english.el('library').innerHTML,/No matches/);
english.run("closeLibrary();say('snow')");assert.match(english.el('toast').textContent,/Speech is unavailable/);
english.run('toggleReviewOnly()');assert.match(english.el('cards').innerHTML,/No groups to practice/);
for(const id of ['help-listen','help-examples','help-notes','help-sort','help-progress','help-shortcuts','help-file','save-note','learning-status','reveal','review-only','auto-read','updated-label'])assert.doesNotMatch(english.el(id).textContent,/[\u4e00-\u9fff]/,id);
// Speech language does not follow interface language; preserve the English voice.
const voiceApp=boot({url:'https://example.test/?lang=en'});
voiceApp.run("window.SpeechSynthesisUtterance=function(word){this.text=word};window.spoken=[];window.speechSynthesis={cancel(){},getVoices(){return[]},speak(u){window.spoken.push(u)}};say('snow');setLanguage('zh');say('snow')");
assert.deepEqual(JSON.parse(voiceApp.run('JSON.stringify(window.spoken.map(u=>[u.text,u.lang]))')),[['snow','en-US'],['snow','en-US']]);
for(const storage of [null,{getItem(){throw Error('Blocked')},setItem(){throw Error('Blocked')}}]){
  const blocked=boot({storage,url:'https://example.test/',languages:['zh-CN']});
  assert.doesNotThrow(()=>blocked.run("setLanguage('en');primaryAction()"));assert.equal(blocked.run('locale'),'en');
}
const beforeInvalid=langApp.run('locale');langApp.run("setLanguage('bad')");assert.equal(langApp.run('locale'),beforeInvalid);
console.log('Bilingual UI passed: locale precedence, manual selection, URL sharing, reload, unchanged progress/card/reveal/search, all English text, English speech, and blocked storage.');

const confirmCurrent=boot({url:'https://example.test/',languages:['en-US']});
confirmCurrent.run("setLanguage('en')");
assert.equal(confirmCurrent.storage.getItem(languageKey),'en');
assert.equal(confirmCurrent.storage.getItem(storageKey),null);
assert.equal(confirmCurrent.location.search,'?lang=en');

// Feedback creates a public draft on the intended repository. It never sends
// learning records, the current page URL, private search input or an email.
const feedbackApp=boot({url:'https://example.test/private-location?lang=zh&private=do-not-share'});
const feedbackURL=()=>new URL(feedbackApp.el('feedback-link').getAttribute('href'));
let feedback=feedbackURL();
assert.equal(feedback.origin,'https://github.com');
assert.equal(feedback.pathname,'/alpskyhere/word-together/issues/new');
assert.deepEqual([...feedback.searchParams.keys()],['title','body']);
assert.equal(feedback.searchParams.get('title'),'反馈：snowman');
assert.match(feedback.searchParams.get('body'),/当前词组: snow \+ man → snowman/);
assert.ok(feedback.searchParams.get('body').includes(feedbackApp.el('updated-at').getAttribute('datetime')));
assert.equal(feedbackApp.storage.writes.length,0);
assert.equal(feedbackApp.el('feedback-notice').textContent,'GitHub · 需登录 · 留言公开');
feedbackApp.run("move(1);setLanguage('en')");feedback=feedbackURL();
assert.equal(feedback.searchParams.get('title'),'Feedback: snowball');
assert.match(feedback.searchParams.get('body'),/Word group: snow \+ ball → snowball/);
assert.match(feedback.searchParams.get('body'),/This post is public/);
assert.doesNotMatch(feedback.searchParams.get('body'),/[\u4e00-\u9fff]/);
assert.equal(feedbackApp.el('feedback-link').textContent,'Feedback ↗');
assert.equal(feedbackApp.el('feedback-browse').textContent,'View feedback ↗');
assert.equal(feedbackApp.el('feedback-notice').textContent,'GitHub · Sign-in required · Public posts');
feedbackApp.run('openLibrary()');feedbackApp.el('search').value='private-search-content';
const feedbackWrites=feedbackApp.storage.writes.length;
feedbackApp.run('render()');
assert.equal(feedbackApp.storage.writes.length,feedbackWrites);
assert.doesNotMatch(decodeURIComponent(feedbackURL().href),/example\.test|private-location|do-not-share|private-search-content|completed|reviewOnly|currentId/);
feedbackApp.run('closeLibrary();toggleReviewOnly()');feedback=feedbackURL();
assert.equal(feedback.searchParams.get('title'),'Website feedback');
assert.doesNotMatch(feedback.searchParams.get('body'),/Word group:|undefined|null/);
feedbackApp.run("setLanguage('zh')");
assert.equal(feedbackURL().searchParams.get('title'),'网站反馈');
// Native links keep their keyboard behavior instead of revealing a card.
let feedbackKeyPrevented=false;
feedbackApp.handlers.keydown({key:' ',code:'Space',target:{matches:()=>true,tagName:'A'},preventDefault(){feedbackKeyPrevented=true}});
assert.equal(feedbackKeyPrevented,false);
console.log('Public feedback passed: repository, bilingual drafts, current word/version, empty deck, privacy, no render writes and native link keyboard behavior.');
