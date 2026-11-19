/* Background soundscapes, generated live with the Web Audio API: no files, works offline.
   The choice is remembered on this device only. */
const KEY = 'synapse_ambience';
export const SOUNDS = [['rain', 'Deszcz'], ['forest', 'Las'], ['waves', 'Fale'], ['fire', 'Kominek'], ['calm', 'Spokój']];

let ac, master, stops = [], timers = [], current = null, noiseCache = {};
const rnd = (a, b) => a + Math.random() * (b - a);

function load() { try { return { kind: null, vol: 0.5, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { kind: null, vol: 0.5 }; } }
function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ } }
const level = v => Math.pow(v, 1.6) * 0.7;

function context() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  }
  return ac;
}

function noiseBuffer(kind) {
  if (noiseCache[kind]) return noiseCache[kind];
  const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; d[i] = (b0 + b1 + b2 + w * 0.5362) * 0.11; }
    else d[i] = w;
  }
  return (noiseCache[kind] = buf);
}

function loopNoise(kind) {
  const src = ac.createBufferSource(); src.buffer = noiseBuffer(kind); src.loop = true; src.start(); stops.push(() => src.stop()); return src;
}
function osc(type, freq) { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); stops.push(() => o.stop()); return o; }
function every(fn, min, max) { let t; const go = () => { fn(); t = setTimeout(go, rnd(min, max)); timers.push(t); }; t = setTimeout(go, rnd(min, max)); timers.push(t); }
function env(node, peak, attack, release, at = ac.currentTime) {
  node.gain.setValueAtTime(0.0001, at); node.gain.exponentialRampToValueAtTime(peak, at + attack); node.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
}

const BUILD = {
  rain() {
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const g = ac.createGain(); g.gain.value = 0.55;
    loopNoise('pink').connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
    every(() => { const o = ac.createOscillator(), e = ac.createGain(); o.frequency.value = rnd(1400, 3400); env(e, rnd(0.01, 0.04), 0.004, 0.07); o.connect(e); e.connect(master); o.start(); o.stop(ac.currentTime + 0.12); }, 90, 420);
  },
  forest() {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6;
    const lfo = osc('sine', 0.07), lg = ac.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(bp.frequency);
    const g = ac.createGain(); g.gain.value = 0.55;
    loopNoise('brown').connect(bp); bp.connect(g); g.connect(master);
    every(() => {
      const n = 2 + Math.floor(Math.random() * 3), base = rnd(2600, 3800), t0 = ac.currentTime;
      for (let i = 0; i < n; i++) {
        const o = ac.createOscillator(), e = ac.createGain(), t = t0 + i * 0.16;
        o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.09); o.frequency.exponentialRampToValueAtTime(base * 1.1, t + 0.14);
        env(e, 0.025, 0.02, 0.1, t); o.connect(e); e.connect(master); o.start(t); o.stop(t + 0.18);
      }
    }, 3500, 9000);
  },
  waves() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const swell = ac.createGain(); swell.gain.value = 0.4;
    const lfo = osc('sine', 0.085), lg = ac.createGain(); lg.gain.value = 0.32; lfo.connect(lg); lg.connect(swell.gain);
    const lfo2 = osc('sine', 0.085), lg2 = ac.createGain(); lg2.gain.value = 500; lfo2.connect(lg2); lg2.connect(lp.frequency);
    loopNoise('brown').connect(lp); lp.connect(swell); swell.connect(master);
    const foam = ac.createBiquadFilter(); foam.type = 'highpass'; foam.frequency.value = 2500;
    const fg = ac.createGain(); fg.gain.value = 0.05; loopNoise('pink').connect(foam); foam.connect(fg); fg.connect(master);
  },
  fire() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ac.createGain(); g.gain.value = 0.35; loopNoise('brown').connect(lp); lp.connect(g); g.connect(master);
    every(() => {
      const s = ac.createBufferSource(); s.buffer = noiseBuffer('white');
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(1200, 4500); bp.Q.value = 1.2;
      const e = ac.createGain(); env(e, rnd(0.03, 0.22), 0.003, rnd(0.02, 0.07));
      s.connect(bp); bp.connect(e); e.connect(master); s.start(ac.currentTime, rnd(0, 3)); s.stop(ac.currentTime + 0.12);
    }, 60, 480);
  },
  calm() {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const trem = ac.createGain(); trem.gain.value = 0.5;
    const lfo = osc('sine', 0.11), lg = ac.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(trem.gain);
    for (const [f, v] of [[110, 0.09], [164.81, 0.07], [220, 0.06], [277.18, 0.035], [329.63, 0.03]]) {
      const o = osc('sine', f), d = osc('sine', 0.05 + Math.random() * 0.06), dg = ac.createGain(), g = ac.createGain();
      dg.gain.value = 1.2; d.connect(dg); dg.connect(o.detune); g.gain.value = v; o.connect(g); g.connect(lp);
    }
    lp.connect(trem); trem.connect(master);
  },
};

function teardown() {
  timers.forEach(clearTimeout); timers = [];
  stops.forEach(fn => { try { fn(); } catch { /* already stopped */ } }); stops = [];
}

export function play(kind, vol) {
  const c = context(); if (!c || !BUILD[kind]) return false;
  if (c.state === 'suspended') c.resume();
  if (current !== kind) { master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(master.gain.value, c.currentTime); teardown(); BUILD[kind](); current = kind; }
  master.gain.setTargetAtTime(level(vol), c.currentTime, current === kind ? 0.5 : 0.1);
  return true;
}
export function stop() {
  if (!ac || !current) { current = null; return; }
  master.gain.setTargetAtTime(0, ac.currentTime, 0.35);
  const old = stops, oldTimers = timers; stops = []; timers = []; current = null;
  oldTimers.forEach(clearTimeout);
  setTimeout(() => old.forEach(fn => { try { fn(); } catch { /* ok */ } }), 1600);
}
export const setVolume = v => { if (ac && current) master.gain.setTargetAtTime(level(v), ac.currentTime, 0.15); };

/* ───── Small floating control ───── */
function mount() {
  if (document.querySelector('.amb')) return;
  const prefs = load();
  const root = document.createElement('div'); root.className = 'amb';
  root.innerHTML = '<button class="amb-btn" type="button" aria-label="Dźwięki tła" aria-expanded="false"><span class="amb-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>' +
    '<div class="amb-pop" role="dialog" aria-label="Dźwięki tła" hidden><div class="amb-title">Dźwięki tła</div><div class="amb-chips">' +
    SOUNDS.map(([k, l]) => '<button type="button" class="amb-chip" data-kind="' + k + '" aria-pressed="false">' + l + '</button>').join('') +
    '<button type="button" class="amb-chip" data-kind="" aria-pressed="false">Cisza</button></div>' +
    '<label class="amb-vol">Głośność<input type="range" min="0.05" max="1" step="0.05" value="' + prefs.vol + '" aria-label="Głośność dźwięków tła"></label>' +
    '<p class="amb-note">Dźwięk powstaje w telefonie i działa bez internetu.</p></div>';
  document.body.append(root);
  const btn = root.querySelector('.amb-btn'), pop = root.querySelector('.amb-pop'), range = root.querySelector('input');
  const paint = () => {
    root.classList.toggle('on', !!current);
    root.querySelectorAll('.amb-chip').forEach(c => c.setAttribute('aria-pressed', String((c.dataset.kind || '') === (current || ''))));
  };
  const choose = kind => {
    if (kind && play(kind, prefs.vol)) { prefs.kind = kind; prefs.on = true; } else { stop(); prefs.on = false; }
    save(prefs); paint();
  };
  btn.addEventListener('click', e => { e.stopPropagation(); const open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
  pop.addEventListener('click', e => { const c = e.target.closest('.amb-chip'); if (c) choose(c.dataset.kind); e.stopPropagation(); });
  range.addEventListener('input', () => { prefs.vol = Number(range.value); setVolume(prefs.vol); save(prefs); });
  document.addEventListener('click', () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { pop.hidden = true; btn.focus(); } });
  // Browsers only allow sound after a tap, so a remembered choice resumes on the first interaction.
  if (prefs.on && prefs.kind) {
    const resume = () => { if (!current) choose(prefs.kind); document.removeEventListener('pointerdown', resume, true); document.removeEventListener('keydown', resume, true); };
    document.addEventListener('pointerdown', resume, true); document.addEventListener('keydown', resume, true);
  }
  paint();
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
