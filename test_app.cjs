const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');const payload=html.match(/<script id="word-data" type="application\/json">(.*?)<\/script>/s)[1];
const source=html.match(/<script>(.*?)<\/script>/s)[1];
function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial)),writes=[];
  return {values,writes,getItem(key){return values.get(key)??null},setItem(key,value){writes.push(key);values.set(key,value)}};
}
function boot({storage=memoryStorage(),data=payload}={}){
  const elements=new Map();
  function el(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},attributes:{},textContent:'',innerHTML:'',value:'',hidden:id==='overlay',setAttribute(k,v){this.attributes[k]=String(v)},focus(){context.document.activeElement=this;},querySelectorAll(){return[]}});return elements.get(id)}
  el('word-data').textContent=data;
  const filters=filterKeys.map(k=>{let e=el('filter-'+k);e.dataset.filter=k;return e});
  const handlers={};
  const context=vm.createContext({document:{getElementById:el,querySelector:()=>el('progressbar'),querySelectorAll:()=>filters,addEventListener(type,fn){handlers[type]=fn}},window:{localStorage:storage,addEventListener(type,fn){handlers[type]=fn}},setTimeout:()=>0,clearTimeout(){},console,Math});
  vm.runInContext(source,context);
  return {context,el,handlers,filters,storage,run:s=>vm.runInContext(s,context)};
}
const filterKeys=[...html.matchAll(/data-filter="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(filterKeys,['all','compound','pair']);
const {context,el,handlers,filters,run}=boot();
assert.equal(run('deck.length'),117);assert.equal(el('prev').disabled,true);assert.match(el('cards').innerHTML,/snow/);
assert.equal(el('meta').textContent,'1 / 117');
assert.doesNotMatch(html,/慢读|data-slow|点图片或单词，听一听|读一读，然后合起来/);
assert.match(html,/<details class="help"><summary>玩法说明<\/summary>/);
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
for(let i=0;i<40;i++){
  const old=run('position');el('random').onclick();
  assert.notEqual(run('position'),old);assert.equal(run('revealed'),false);
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
assert.deepEqual(Object.keys(record).sort(),['autoRead','completed','currentId','drawn','filter','review','reviewOnly','sortOrder','version'].sort());
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
assert.doesNotThrow(()=>reviewReload.run('primaryAction();move(1);move(-1);randomCard()'));
reviewReload.run("setFilter('compound')");assert.equal(reviewReload.run('deck[0].id'),resumeId);
reviewReload.el('review-card').onclick();assert.equal(reviewReload.run('review.size'),0);
reviewReload.run('openLibrary()');assert.match(reviewReload.el('library').innerHTML,/snowman/);
reviewReload.el('library').onclick({target:{closest:()=>({dataset:{id:String(pairId)}})}});
assert.equal(reviewReload.run('reviewOnly'),false);assert.equal(reviewReload.run('deck.length'),117);
assert.equal(reviewReload.run('deck[position].id'),pairId);
reviewReload.el('review-only').onclick();assert.equal(reviewReload.run('deck.length'),0);
reviewReload.el('review-only').onclick();assert.equal(reviewReload.run('deck.length'),117);

// Draw every card once before repeating, and preserve the cycle after reload.
const shuffleStore=memoryStorage();let shuffle=boot({storage:shuffleStore});
const seen=new Set([shuffle.run('deck[position].id')]);
for(let i=0;i<116;i++){
  if(i===41)shuffle=boot({storage:shuffleStore});
  shuffle.el('random').onclick();const id=shuffle.run('deck[position].id');
  assert.equal(seen.has(id),false);seen.add(id);
}
assert.equal(seen.size,117);assert.equal(shuffle.run('completed.size'),0);
let previous=shuffle.run('deck[position].id');shuffle.el('random').onclick();
assert.notEqual(shuffle.run('deck[position].id'),previous);
shuffle=boot();shuffle.run("setFilter('pair')");
const pairCycle=new Set([shuffle.run('deck[position].id')]);
for(let i=0;i<37;i++){shuffle.el('random').onclick();const id=shuffle.run('deck[position].id');assert.equal(pairCycle.has(id),false);pairCycle.add(id);}
assert.equal(pairCycle.size,38);assert.equal(shuffle.run("deck.every(c=>c.kind==='pair')"),true);

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
  assert.doesNotThrow(()=>unavailable.run('move(1);primaryAction();toggleReview();toggleAutoRead();randomCard()'));
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
console.log('Persistence passed: reload, stable IDs, unique revealed counts, review/empty states, nonrepeating cycles, malformed data, storage failures and cross-tab events.');

// Sort controls, exact alphabetic/length ordering and filter/review composition.
assert.match(html,/<button data-filter="compound" aria-pressed="false">连着写 <span id="compound-count"><\/span><\/button>/);
assert.match(html,/<button data-filter="pair" aria-pressed="false">分开写 <span id="pair-count"><\/span><\/button>/);
assert.doesNotMatch(html,/合成一个词|保留两个词/);
assert.deepEqual([...html.matchAll(/<option value="([^"]+)">/g)].map(m=>m[1]),['recommended','az','za','short']);
const sortedStore=memoryStorage(),sorting=boot({storage:sortedStore});
const baseCards=JSON.parse(payload).cards;
const spellingOf=c=>c.word.replace(/\s/g,'');
const expectedAz=baseCards.slice().sort((a,b)=>spellingOf(a).localeCompare(spellingOf(b),'en')||a.id-b.id);
const expectedShort=baseCards.slice().sort((a,b)=>spellingOf(a).length-spellingOf(b).length||spellingOf(a).localeCompare(spellingOf(b),'en')||a.id-b.id);
const ids=app=>JSON.parse(app.run('JSON.stringify(deck.map(c=>c.id))'));
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
assert.doesNotThrow(()=>sortingReload.run("setSort('short');primaryAction();randomCard()"));
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

// Material guidance stays local to rubber duck and never changes game progress.
const material=boot(),materialWrites=material.storage.writes.length;
assert.match(html,/<details id="word-help" class="word-help" hidden>/);
assert.match(html,/rubber 在这里指橡胶，是一种材料/);
assert.equal(material.el('word-help').hidden,true);
material.run("position=deck.findIndex(c=>c.word==='rubber duck');render()");
assert.equal(material.el('word-help').hidden,false);assert.equal(material.el('word-help').open,false);
material.el('word-help').open=true;
material.handlers.keydown({key:' ',code:'Space',target:{tagName:'SUMMARY',matches:s=>s.split(',').includes('summary')},preventDefault(){throw Error('Native help expansion intercepted')}});
assert.equal(material.run('revealed'),false);assert.equal(material.storage.writes.length,materialWrites);
material.el('reveal').onclick();assert.equal(material.el('word-help').open,true);assert.equal(material.run('revealed'),true);
material.el('reveal').onclick();assert.equal(material.el('word-help').hidden,true);assert.equal(material.el('word-help').open,false);
material.run("position=deck.findIndex(c=>c.word==='rubber duck');render()");assert.equal(material.el('word-help').open,false);
material.run('toggleReviewOnly()');assert.equal(material.run('deck.length'),0);assert.equal(material.el('word-help').hidden,true);
console.log('Material hint passed: rubber-only visibility, collapsed default, keyboard expansion, no storage side effects and empty review.');
