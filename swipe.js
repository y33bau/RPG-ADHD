/* Swipe left/right to move between sub-tabs; past the last one you land in the next section.
   The page follows the finger, then the usual slide-in animation finishes the move. */
(() => {
  const main = () => document.querySelector('main');
  const IGNORE = 'input,textarea,select,button[role="slider"],[contenteditable],.x-subtabs,.amb,dialog,.x-chips,.segmented,.x-windows,svg,canvas,[data-noswipe]';
  const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let x0, y0, t0, lock = null, active = false;

  const subs = () => [...document.querySelectorAll('.x-subtab')];
  const tabs = () => [...document.querySelectorAll('nav [data-tab]')].filter((b, i, all) => all.findIndex(o => o.dataset.tab === b.dataset.tab) === i);
  const currentTab = () => document.querySelector('nav [data-tab].active')?.dataset.tab;

  function go(dir) {
    const list = subs(), i = list.findIndex(b => b.classList.contains('on'));
    const target = list[i + dir];
    if (target) { target.click(); target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); return true; }
    const t = tabs(), ti = t.findIndex(b => b.dataset.tab === currentTab()), next = t[ti + dir];
    if (!next) return false;
    main()?.setAttribute('data-dir', dir > 0 ? 'r' : 'l');
    next.click();
    // Going backwards lands on the last sub-tab of the previous section, like flipping pages.
    setTimeout(() => {
      const fresh = subs();
      const want = dir > 0 ? fresh[0] : fresh.at(-1);
      if (want && !want.classList.contains('on')) want.click();
      main()?.setAttribute('data-dir', dir > 0 ? 'r' : 'l');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
    return true;
  }

  function reset(animate) {
    const m = main(); if (!m) return;
    m.style.transition = animate ? 'transform .35s cubic-bezier(.22,1,.36,1), opacity .35s' : '';
    m.style.transform = ''; m.style.opacity = '';
    if (animate) setTimeout(() => { m.style.transition = ''; }, 380);
  }

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || document.querySelector('dialog[open]') || e.target.closest(IGNORE) || !e.target.closest('main')) { active = false; return; }
    const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); lock = null; active = true;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!active) return;
    const p = e.touches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (!lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) lock = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    if (lock !== 'x' || calm()) return;
    const m = main(); if (!m) return;
    const damp = dx / (1 + Math.abs(dx) / 260);
    m.style.transform = 'translateX(' + damp.toFixed(1) + 'px)';
    m.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900));
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!active) return; active = false;
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0, dt = Date.now() - t0;
    const fast = Math.abs(dx) > 40 && dt < 280, far = Math.abs(dx) > Math.min(110, innerWidth * 0.25);
    if (lock === 'x' && (fast || far) && Math.abs(dx) > Math.abs(dy) * 1.3) {
      reset(false);
      if (!go(dx < 0 ? 1 : -1)) { const m = main(); m?.classList.remove('bump'); void m?.offsetWidth; m?.classList.add('bump'); }
      else if (navigator.vibrate && !calm()) navigator.vibrate(8);
      hint(true);
    } else reset(true);
  }, { passive: true });
  document.addEventListener('touchcancel', () => { active = false; reset(true); }, { passive: true });

  /* A gentle one-time hint on touch screens. */
  const KEY = 'synapse_swipe_hint';
  function hint(learned) {
    try {
      if (learned) { localStorage.setItem(KEY, '3'); document.querySelector('.swipe-hint')?.remove(); return; }
      const n = Number(localStorage.getItem(KEY) || 0);
      if (n >= 3 || !matchMedia('(pointer: coarse)').matches) return;
      localStorage.setItem(KEY, String(n + 1));
    } catch { return; }
    const el = document.createElement('div'); el.className = 'swipe-hint'; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="swipe-hand" aria-hidden="true">👆</span>Przesuń palcem w bok, żeby zmienić zakładkę';
    document.body.append(el);
    setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800);
  }
  setTimeout(() => hint(false), 1500);
})();
