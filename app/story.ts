import source from './script-source.json';

// Numbered paragraphs are the sole narrative source for this edition.
export const SCRIPT_VERSION = 'docx-136bac3f-strict-v1';
export const SAVE_KEY = 'little-turtle-' + SCRIPT_VERSION;
export const SOURCE_SHA256 = source.sha256;
export const DISCLAIMER = source.paragraphs[0];
export type PortraitKey = 'turtle' | 'seahorse' | 'fish';
export type BackgroundKey = 'home' | 'street' | 'hall';
export type Stats = { energy: number; spirit: number; life: number; money: number };
export type Item = 'pass' | 'offer' | 'photos' | 'student_card';
export type GameState = {
  version: typeof SCRIPT_VERSION; node: string; stats: Stats; inventory: Item[];
  history: { node: string; choice: string }[];
};
export type Choice = { id: string; label: string; next: string; delta?: Partial<Stats>; item?: Item };
export type Scene = {
  id: string; speaker: string; text: string; source: number[];
  background: BackgroundKey; portrait?: PortraitKey;
  mode?: 'mail' | 'offer' | 'materials' | 'receipt' | 'notification';
  audio?: 'mail' | 'alarm'; choices: Choice[]; end?: boolean;
};
export const sceneImages: Record<BackgroundKey,string> = {
  home:'/assets/classroom.webp', street:'/assets/bus-stop.webp', hall:'/assets/academy-hall.webp',
};
export const portraits: Record<PortraitKey,{src:string;alt:string}> = {
  turtle:{src:'/assets/turtle.webp',alt:'小乌龟'},
  seahorse:{src:'/assets/seahorse.webp',alt:'海马教授'},
  fish:{src:'/assets/fish-roommate.webp',alt:'小丑鱼'},
};
export const itemNames: Record<Item,string> = {
  pass:'专属通行证', offer:'复印录取通知书', photos:'一寸标准照3张', student_card:'学生卡',
};
export const initialState: GameState = {
  version:SCRIPT_VERSION, node:'mail',
  // Existing public wallet is retained; the document specifies no currency changes.
  stats:{energy:100,spirit:0,life:100,money:12}, inventory:[], history:[],
};
const p = (index:number) => source.paragraphs[index].trim();
const speech = (index:number) => p(index).replace(/^【[^】]+】\s*[:：；]?\s*/, '').replace(/^[“"]|[”"]$/g, '');
const passage = (indices:number[]) => indices.map(p).join('\n');
const next = (to:string,label='继续'):Choice[] => [{id:to,label,next:to}];
const scene = (id:string,indices:number[],text:string,to:string,opts:Partial<Scene>={}):Scene => ({
  id,speaker:'我',text,source:indices,background:'home',portrait:'turtle',choices:next(to),...opts,
});
const scenesList: Scene[] = [
  scene('mail',[4,5,6],'','offer',{speaker:'海底学院招生办',portrait:undefined,mode:'mail',audio:'mail',choices:next('offer','查收显示offer')}),
  scene('offer',[8,9,10,11,12,13,14,15,16,17,18],[...Array.from({length:8},(_,i)=>p(i+8)),'海底学院招生办',p(17)].join('\n\n'),'confirmed',{speaker:'海底学院招生办',portrait:undefined,mode:'offer',choices:next('confirmed','一键确认入学')}),
  scene('confirmed',[18],'已确认！海底学院欢迎你。','glasses',{speaker:'海底学院',portrait:undefined,mode:'notification'}),
  scene('glasses',[19,20],'我淡定地推了推眼睛。','vow'),
  scene('vow',[21],speech(21),'laugh',{speaker:'小乌龟'}),
  scene('laugh',[22],'我在房间里发出了反派般的笑容。','materials'),
  scene('materials',[23,24,25],'','packing',{mode:'materials',choices:[
    {id:'prepare-pass',label:'办理你的专属通行证',next:'pass_received',item:'pass'},
    {id:'prepare-offer',label:'复印录取通知书',next:'offer_received',item:'offer'},
    {id:'prepare-photos',label:'拍一寸标准照3张',next:'photos_received',item:'photos'},
  ]}),
  scene('pass_received',[23],'得到一张专属通行证','materials',{mode:'receipt'}),
  scene('offer_received',[24],'得到一张复印录取通知书','materials',{mode:'receipt'}),
  scene('photos_received',[25],'得到一寸标准照3张','materials',{mode:'receipt'}),
  scene('packing',[26],'我忙碌地收拾着行李。我把几本最爱的海藻书塞进藤编箱，又犹豫着拿起一个和拳头差不多大的小海螺。','keepsakes'),
  scene('keepsakes',[27],speech(27),'door',{speaker:'小乌龟'}),
  scene('door',[28],'我拖着小行李箱，慢慢游出家门，乌龟妈妈温柔地注视着我。','mother'),
  scene('mother',[29],speech(29),'promise',{speaker:'乌龟妈妈',portrait:undefined}),
  scene('promise',[30],speech(30),'departure',{speaker:'小乌龟'}),
  scene('departure',[31],'我挥挥前肢，转身跟着打着灯笼的鮟鱇鱼指引的队伍，慢慢游向远方。','street',{background:'street'}),
  scene('street',[32,33],speech(33),'room',{speaker:'小乌龟',background:'street'}),
  scene('room',[34],'我用钥匙打开门，房间里简单却温馨，一张铺着柔软海绵的沙发，一扇圆形窗户正对着外面的海景，偶尔有小丑鱼探头探脑地游过。','room_speech'),
  scene('room_speech',[35],speech(35),'room_choice',{speaker:'小乌龟'}),
  scene('room_choice',[36,37,38,39],'稍作安顿后，我决定走出房间。','next_day',{choices:[
    {id:'go-out',label:'决定出去玩',next:'next_day',delta:{spirit:10}},
    {id:'check-route',label:'决定了解一下报到处的路线',next:'next_day',delta:{energy:10}},
  ]}),
  scene('next_day',[40,41,42],'第二天\n\n我走出房间，向着宏伟的海底学院珊瑚礁主楼游去。','office',{background:'hall'}),
  scene('office',[43],'我游进主楼内部，学院秘书处一脸严肃的海马教授正坐在办公处。','greeting',{background:'hall'}),
  scene('greeting',[44],speech(44),'slow',{speaker:'小乌龟',background:'hall'}),
  scene('slow',[45],'海马教授用0.016公里每小时的速度，慢慢地接过我的文件。','silence_one',{background:'hall'}),
  scene('silence_one',[46],speech(46),'waiting',{speaker:'小乌龟',background:'hall'}),
  scene('waiting',[47],p(47),'professor',{background:'hall'}),
  scene('professor',[48],speech(48),'silence_two',{speaker:'海马教授',portrait:'seahorse',background:'hall',choices:[{id:'student-card',label:'继续',next:'silence_two',item:'student_card'}]}),
  scene('silence_two',[49],speech(49),'thanks',{speaker:'小乌龟',background:'hall'}),
  scene('thanks',[50],speech(50),'computer',{speaker:'小乌龟',background:'hall'}),
  scene('computer',[51],'回到自己的出租房内，我打开电脑。','notice'),
  scene('notice',[52,53],p(53),'courses',{speaker:'海底学院 · 教务系统通知',portrait:undefined,mode:'notification'}),
  scene('courses',[54,55,56,57,58,59,60,61,62],passage([54,55,56,57,58,59,60,61,62]),'energy_rules',{speaker:'教务系统',portrait:undefined,mode:'notification'}),
  scene('energy_rules',[63,64],p(64),'spirit_rules',{speaker:'教务系统',portrait:undefined}),
  scene('spirit_rules',[65],p(65),'erosion_rules',{speaker:'教务系统',portrait:undefined}),
  scene('erosion_rules',[66],p(66),'life_rules',{speaker:'教务系统',portrait:undefined}),
  scene('life_rules',[67],p(67),'activated',{speaker:'教务系统',portrait:undefined}),
  scene('activated',[68],'海底学院 · 状态系统已激活','system_silence',{speaker:'教务系统',portrait:undefined,mode:'notification'}),
  scene('system_silence',[69],speech(69),'night_choice',{speaker:'小乌龟'}),
  scene('night_choice',[70,71,72],speech(70),'alarm',{speaker:'小乌龟',choices:[
    {id:'vent',label:'阴暗爬行，无意义吼叫',next:'alarm',delta:{spirit:10}},
    {id:'sleep',label:'睡觉准备好状态开始明天的课程',next:'alarm',delta:{energy:100}},
  ]}),
  scene('alarm',[73,74,75],'《多项式代数与方程论》\n\n'+p(74)+'\n'+p(75),'morning',{audio:'alarm'}),
  scene('morning',[76,77],'早安，小乌龟同学\n\n'+p(77),'wake',{speaker:'教务系统',portrait:undefined,mode:'notification'}),
  scene('wake',[78],p(78),'encourage'),
  scene('encourage',[79],speech(79),'walk',{speaker:'小乌龟'}),
  scene('walk',[80],p(80),'website',{background:'street'}),
  scene('website',[81,82],p(82),'class',{background:'hall'}),
  scene('class',[83],speech(83),'fish_arrives',{speaker:'小乌龟',background:'hall'}),
  scene('fish_arrives',[84],p(84),'fish',{background:'hall'}),
  scene('fish',[85],speech(85),'',{speaker:'小丑鱼',portrait:'fish',background:'hall',choices:[],end:true}),
];
export const scenes = Object.fromEntries(scenesList.map(s=>[s.id,s])) as Record<string,Scene>;
export const sceneOrder = scenesList.map(s=>s.id);
export function availableChoices(state:GameState):Choice[] {
  return (scenes[state.node]?.choices??[]).filter(c=>!c.item||!state.inventory.includes(c.item));
}
export function advanceState(current:GameState,choiceId:string):GameState {
  const choice = availableChoices(current).find(c=>c.id===choiceId);
  if (!choice) return current;
  const stats = {...current.stats};
  for (const [key,value] of Object.entries(choice.delta??{})) stats[key as keyof Stats] += value;
  // The document does not specify an upper energy cap; +10 and +100 remain effective.
  stats.energy=Math.max(0,stats.energy);
  stats.spirit=Math.max(-100,stats.spirit);
  const newLoss=Math.max(0,-stats.spirit-50)-Math.max(0,-current.stats.spirit-50);
  stats.life=stats.spirit<=-100?0:Math.max(0,Math.min(100,stats.life-Math.max(0,newLoss)*2));
  const inventory=choice.item?[...current.inventory,choice.item]:[...current.inventory];
  const allMaterials=['pass','offer','photos'].every(item=>inventory.includes(item as Item));
  const node=choice.next==='materials'&&allMaterials?'packing':choice.next;
  if (!scenes[node]) return current;
  return {...current,node,stats,inventory,history:[...current.history,{node:current.node,choice:choice.label}]};
}
// Reconstruct from choices so old saves or altered numeric values cannot contaminate this edition.
export function restoreState(raw:string|null):GameState|null {
  if (!raw) return null;
  try {
    const saved=JSON.parse(raw);
    if (saved.version!==SCRIPT_VERSION||!Array.isArray(saved.history)||saved.history.length>100) return null;
    let state=initialState;
    for (const entry of saved.history) {
      if (entry.node!==state.node) return null;
      const choice=availableChoices(state).find(c=>c.label===entry.choice);
      if (!choice) return null;
      state=advanceState(state,choice.id);
    }
    return state.node===saved.node?state:null;
  } catch {return null;}
}
