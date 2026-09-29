import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = JSON.parse(readFileSync(new URL('../app/script-source.json',import.meta.url),'utf8'));
const input = readFileSync(new URL('../app/story.ts',import.meta.url),'utf8').replace("import source from './script-source.json';",'const source = '+JSON.stringify(source)+';');
const output = ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {scenes,initialState,advanceState,availableChoices,restoreState,SCRIPT_VERSION} = await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const normalize = value=>value.replace(/\s+/g,'').replace(/[“”"]/g,'');
const dialogueParagraphs = [21,27,29,30,33,35,44,46,48,49,50,69,70,79,83,85];
for(const index of dialogueParagraphs){
  const expected = source.paragraphs[index].replace(/^【[^】]+】\s*[:：；]?\s*/,'');
  assert(Object.values(scenes).some(s=>s.source.includes(index)&&normalize(s.text)===normalize(expected)), 'Missing or rewritten dialogue paragraph '+index);
}
for(const index of [8,9,10,11,12,13,14,15,17]) assert(scenes.offer.text.includes(source.paragraphs[index].trim()));
for(const s of Object.values(scenes)){
  assert(s.source.length>0,'Unattributed narrative: '+s.id);
  for(const c of s.choices) assert(scenes[c.next],'Broken link: '+s.id+' -> '+c.next);
  for(const c of s.choices) assert(!/[（(].*(精神|精力|风险|加\d|减\d)/.test(c.label),'Visible numerical hint');
}
const visited = new Set(), endings=[];
function walk(state,depth=0){
  assert(depth<75,'Route failed to end'); visited.add(state.node);
  const options=availableChoices(state);
  if(!options.length){assert.equal(state.node,'fish');assert(scenes[state.node].end);endings.push(state);return;}
  for(const option of options){
    const next=advanceState(state,option.id);
    assert.notEqual(next,state);
    assert.equal(new Set(next.inventory).size,next.inventory.length,'Duplicate material');
    if(next.node==='packing') assert(['pass','offer','photos'].every(x=>next.inventory.includes(x)));
    walk(next,depth+1);
  }
}
walk(initialState);
assert.equal(visited.size,Object.keys(scenes).length,'Unreachable scene');
assert.equal(endings.length,24,'Expected 6 material orders times 2 room choices times 2 night choices');
assert.deepEqual([...new Set(endings.map(s=>s.stats.energy+','+s.stats.spirit))].sort(),['100,20','110,10','200,10','210,0']);
for(const state of endings){
  assert.equal(state.stats.life,100);
  assert.equal(state.stats.money,12);
  assert.deepEqual(restoreState(JSON.stringify(state)),state);
  const tampered={...state,stats:{energy:-900,spirit:-100,life:0,money:9999}};
  assert.deepEqual(restoreState(JSON.stringify(tampered)),state);
}
assert.equal(restoreState('{broken'),null);
assert.equal(restoreState(JSON.stringify({...initialState,version:'old-six-chapter'})),null);
assert.equal(restoreState(JSON.stringify({...initialState,node:'old_prologue'})),null);
const visible=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
assert(!/state\.stats\.(energy|spirit|life)/.test(visible),'Live hidden values rendered');
assert(!/沉湾|答辩|兔子|海龟之路|章鱼教授转过身|death_|global_/.test(Object.values(scenes).map(s=>s.text).join('\n')));
console.log(JSON.stringify({version:SCRIPT_VERSION,sourceSha256:source.sha256,scenes:visited.size,completeRoutes:endings.length,exactDialogueParagraphs:dialogueParagraphs.length,ending:'fish',result:'PASS'},null,2));
