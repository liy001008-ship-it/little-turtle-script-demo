'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { GraduationCap, Mail, Shell, Volume2, VolumeX, X } from 'lucide-react';
import {
  DISCLAIMER, SAVE_KEY, SCRIPT_VERSION, advanceState, availableChoices,
  initialState, itemNames, portraits, restoreState, sceneImages, scenes, type GameState,
} from './story';

type Panel = 'menu' | 'settings' | 'log' | 'restart' | null;
type SoundContext = AudioContext;
declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

export default function Home() {
  const [state, setState] = useState<GameState>(initialState);
  const [screen, setScreen] = useState<'home' | 'game' | 'exit'>('home');
  const [panel, setPanel] = useState<Panel>(null);
  const [loaded, setLoaded] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [muted, setMuted] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState('');
  const audio = useRef<SoundContext | null>(null);
  const seenSound = useRef('');
  const dialog = useRef<HTMLDialogElement>(null);
  const scene = scenes[state.node];
  const choices = availableChoices(state);
  const portrait = scene.portrait ? portraits[scene.portrait] : null;

  useEffect(() => {
    try {
      const recovered = restoreState(localStorage.getItem(SAVE_KEY));
      if (recovered) setState(recovered);
      const preferences = JSON.parse(localStorage.getItem(SAVE_KEY + '-settings') || '{}');
      setMuted(preferences.muted === true);
      setLargeText(preferences.largeText === true);
      setReducedEffects(preferences.reducedEffects === true);
    } catch { setStorageError(true); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      localStorage.setItem(SAVE_KEY + '-settings', JSON.stringify({muted, largeText, reducedEffects}));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [state, loaded, muted, largeText, reducedEffects]);

  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);

  const prepareSound = useCallback(() => {
    try {
      if (!audio.current) audio.current = new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch { /* Audio support is optional; the story remains playable. */ }
  }, []);

  useEffect(() => {
    if (screen !== 'game' || !scene.audio || muted || seenSound.current === scene.id) return;
    seenSound.current = scene.id;
    const context = audio.current;
    if (!context || context.state !== 'running') return;
    const notes = scene.audio === 'mail' ? [660, 880] : [880, 660, 880, 660, 880, 660];
    const oscillators: OscillatorNode[] = [];
    notes.forEach((frequency,index) => {
      const oscillator=context.createOscillator(), gain=context.createGain();
      const start=context.currentTime + index * 0.16;
      oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(0.045,start+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001,start+0.13);
      oscillator.connect(gain);gain.connect(context.destination);
      oscillator.start(start);oscillator.stop(start+0.15);oscillators.push(oscillator);
    });
    return () => { for (const oscillator of oscillators) { try { oscillator.stop(); } catch {} } };
  }, [screen,scene.id,scene.audio,muted]);

  const choose = useCallback((id:string) => {
    setState(current => advanceState(current,id));
  }, []);
  const start = () => { prepareSound(); setPanel(null); setScreen('game'); };
  const restart = () => {
    seenSound.current=''; setState(initialState); prepareSound();
    setPanel(null); setScreen('game');
  };

  useEffect(() => {
    if (screen !== 'game' || panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (['BUTTON','INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      const option = availableChoices(state)[Number(event.key)-1];
      if (option) { event.preventDefault(); choose(option.id); }
    };
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  }, [screen,panel,state,choose]);

  useEffect(() => {
    const context=document.modelContext;
    if (!context?.registerTool || screen!=='game') return;
    const lifecycle=new AbortController();
    const register=(tool:Record<string,unknown>) => {
      try { void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch {}
    };
    register({
      name:'get_story_state',title:'读取当前剧情',description:'读取当前原文、公开贝币与可选行动。',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true},
      execute:()=>({speaker:scene.speaker,text:scene.text,money:state.stats.money,choices:choices.map((c,i)=>({number:i+1,label:c.label})),complete:!!scene.end}),
    });
    register({
      name:'choose_story_option',title:'选择剧情行动',description:'按当前选项编号推进剧情。',
      inputSchema:{type:'object',properties:{choiceNumber:{type:'integer',minimum:1}},required:['choiceNumber'],additionalProperties:false},
      annotations:{readOnlyHint:false},
      execute:(input:unknown)=>{
        if (panel) throw new Error('请先关闭菜单。');
        const n=(input as {choiceNumber?:number})?.choiceNumber;
        const option=Number.isInteger(n)?choices[Number(n)-1]:undefined;
        if(!option)throw new Error('无效选项。');
        choose(option.id);return {advanced:true};
      },
    });
    return ()=>lifecycle.abort();
  },[screen,scene,state,choices,choose,panel]);

  const rootClass = [largeText?'large-text':'',reducedEffects?'effects-off':''].join(' ');
  return (
    <main className={rootClass} data-script-version={SCRIPT_VERSION}>
      {screen==='home' && <section className="start-screen">
        <h1 className="start-title">小乌龟</h1>
        <img src="/assets/turtle.webp" alt="小乌龟" className="start-turtle" />
        <nav className="start-menu" aria-label="主菜单">
          <button disabled={!loaded} onClick={start}>开始</button>
          <button onClick={()=>setPanel('menu')}>菜单</button>
          <button onClick={()=>setPanel('settings')}>设置</button>
          <button onClick={()=>setScreen('exit')}>退出</button>
        </nav>
      </section>}
      {screen==='exit' && <section className="exit-screen">
        <h1>已退出试玩</h1>
        <p>{storageError?'当前浏览器无法保存进度。':'进度已保存在此设备，可以关闭页面。'}</p>
        <button className="glass-button" onClick={()=>setScreen('home')}>返回主菜单</button>
      </section>}
      {screen==='game' && <section className="game-shell" style={{'--scene-bg': 'url('+sceneImages[scene.background]+')'} as CSSProperties} data-scene={scene.id}>
        <header className="topbar">
          <span className="chapter-label">第一章</span>
          <div className="header-actions">
            <div className="wallet" aria-label={'贝币 '+state.stats.money}><Shell size={19} aria-hidden="true" /><span>贝币 {state.stats.money}</span></div>
            <button onClick={()=>setPanel('log')}>记录</button>
            <button onClick={()=>setPanel('menu')}>菜单</button>
          </div>
        </header>

        {scene.mode==='mail' ? <div className="mail-surface" aria-label="录取邮件">
          <Mail size={68} strokeWidth={1.2} aria-hidden="true" />
          <h2>海底学院招生办</h2>
          <button className="glass-button" onClick={()=>choose(choices[0].id)}>{choices[0].label}</button>
        </div> : scene.mode==='offer' ? <article className="offer-letter">
          <div className="academy-emblem" aria-label="海底学院校徽"><GraduationCap size={30} aria-hidden="true" /><span>海底学院</span></div>
          <h2>录取通知书</h2>
          <div className="offer-copy">{scene.text.split('\n\n').map((line,i)=><p key={i}>{line}</p>)}</div>
          <button className="shell-confirm" onClick={()=>choose(choices[0].id)}><Shell aria-hidden="true" />一键确认入学</button>
        </article> : <div className="story-stage">
          {choices.length>0 && <nav className="choice-stage" aria-label="剧情选项">
            {choices.map(choice=><button key={choice.id} className="glass-button" onClick={()=>choose(choice.id)}>{choice.label}</button>)}
          </nav>}
          <section className={'dialogue-panel'+(portrait?' with-portrait':'')} aria-live="polite">
            <div className="speaker-name">{scene.speaker}</div>
            {portrait && <div className="portrait-frame"><img src={portrait.src} alt={portrait.alt} /></div>}
            <div className="dialogue-body" key={scene.id}>
              {scene.text && <p className="dialogue">{scene.text}</p>}
              {scene.mode==='materials' && <ul className="material-list" aria-label="报到材料">
                {(['pass','offer','photos'] as const).map(item=><li key={item}>{state.inventory.includes(item)?'✓':'○'} {itemNames[item]}</li>)}
              </ul>}
              {scene.end && <div className="demo-boundary">
                <p>本次试玩到此结束</p>
                <button onClick={()=>setPanel('log')}>查看记录</button>
                <button onClick={()=>setScreen('home')}>返回主菜单</button>
              </div>}
            </div>
          </section>
        </div>}
        <footer className="game-foot" role="status">{storageError?'无法保存，关闭页面后进度可能丢失。':'进度自动保存'}</footer>
      </section>}

      <dialog ref={dialog} className="game-dialog" onCancel={()=>setPanel(null)} onClick={event=>{if(event.target===event.currentTarget)setPanel(null);}}>
        <div className="dialog-inner">
          <button className="close-button" aria-label="关闭" onClick={()=>setPanel(null)}><X aria-hidden="true" /></button>
          {panel==='menu' && <>
            <h2>菜单</h2>
            <p className="author-note">{DISCLAIMER}</p>
            <div className="menu-actions">
              <button onClick={start}>{state.history.length?'继续游戏':'开始游戏'}</button>
              <button onClick={()=>setPanel('log')}>旅途记录</button>
              <button onClick={()=>setPanel('settings')}>设置</button>
              <button onClick={()=>setPanel('restart')}>重新开始</button>
              <button onClick={()=>{setScreen('home');setPanel(null);}}>返回主菜单</button>
            </div>
          </>}
          {panel==='restart' && <>
            <h2>重新开始</h2><p>从录取邮件重新开始，替换本设备当前进度。</p>
            <div className="menu-actions"><button onClick={restart}>重新开始</button><button onClick={()=>setPanel('menu')}>取消</button></div>
          </>}
          {panel==='settings' && <>
            <h2>设置</h2>
            <label className="setting-row"><span>提示音</span><button aria-pressed={!muted} onClick={()=>{prepareSound();setMuted(v=>!v);}}>{muted?<VolumeX aria-hidden="true" />:<Volume2 aria-hidden="true" />}{muted?'关闭':'开启'}</button></label>
            <label className="setting-row"><span>大字模式</span><button aria-pressed={largeText} onClick={()=>setLargeText(v=>!v)}>{largeText?'开启':'关闭'}</button></label>
            <label className="setting-row"><span>减少动态</span><button aria-pressed={reducedEffects} onClick={()=>setReducedEffects(v=>!v)}>{reducedEffects?'开启':'关闭'}</button></label>
            <div className="menu-actions">
              <button onClick={()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));setNotice('已保存');}catch{setNotice('当前浏览器无法保存');}}}>存档</button>
              <button onClick={()=>{try{const saved=restoreState(localStorage.getItem(SAVE_KEY));if(saved){setState(saved);setNotice('已读取当前存档');}else setNotice('暂无此版本存档');}catch{setNotice('当前浏览器无法读取存档');}}}>读档</button>
            </div>
            <p role="status">{notice}</p>
          </>}
          {panel==='log' && <>
            <h2>旅途记录</h2>
            <p>第一章 · 贝币 {state.stats.money}</p>
            <h3>随身材料</h3><p>{state.inventory.map(i=>itemNames[i]).join('、')||'暂无'}</p>
            <h3>已经做出的行动</h3>
            <ol>{state.history.map((entry,i)=><li key={i}>{entry.choice==='继续'?scenes[entry.node].speaker+'：'+scenes[entry.node].text:entry.choice}</li>)}</ol>
            {!state.history.length&&<p>暂无记录</p>}
          </>}
        </div>
      </dialog>
    </main>
  );
}
