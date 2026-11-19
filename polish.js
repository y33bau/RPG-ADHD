/* Visual polish only: entrance animation, ripples, pointer spotlight, soft tilt and number count-up. */
(() => {
  const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const main = () => document.querySelector('main');
  let timer;

  const countUp = () => {
    if (calm()) return;
    document.querySelectorAll('.stat strong,.water-main strong').forEach(el => {
      const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
      if (!node) return;
      const m = node.textContent.match(/^(\D*)(\d+)(.*)$/s);
      if (!m) return;
      const end = Number(m[2]), t0 = performance.now(), dur = 700;
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.textContent = m[1] + Math.round(end * e) + m[3];
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const play = () => {
    const m = main(); if (!m) return;
    m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
    clearTimeout(timer); timer = setTimeout(() => m.classList.remove('enter'), 900);
    countUp();
  };

  document.addEventListener('click', e => {
    const sub = e.target.closest?.('[data-sub]');
    if (sub) {
      const tabs = [...document.querySelectorAll('.x-subtab')];
      const from = tabs.findIndex(t => t.classList.contains('on')), to = tabs.indexOf(sub);
      main()?.setAttribute('data-dir', from < 0 || to === from ? 't' : to > from ? 'r' : 'l');
    } else if (e.target.closest?.('[data-tab],[data-go]')) main()?.setAttribute('data-dir', 't');
    if (e.target.closest?.('[data-tab],[data-sub],[data-go]')) setTimeout(play, 0);
  }, true);

  document.addEventListener('pointerdown', e => {
    const b = e.target.closest?.('.check,.btn,.x-q,.x-chip,.x-subtab,.nav-item');
    if (!b || b.disabled) return;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    if (calm() || !b.classList.contains('btn')) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height), s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
    b.append(s); setTimeout(() => s.remove(), 700);
  });

  if (matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', e => {
      const p = e.target.closest?.('.panel'); if (!p || calm()) return;
      const r = p.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      p.style.setProperty('--mx', x + 'px'); p.style.setProperty('--my', y + 'px');
      if (p.classList.contains('x-now') || p.classList.contains('hero')) {
        p.style.transform = 'perspective(900px) rotateX(' + ((.5 - y / r.height) * 3.2).toFixed(2) + 'deg) rotateY(' + ((x / r.width - .5) * 4).toFixed(2) + 'deg)';
      }
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const p = e.target.closest?.('.x-now,.hero'); if (p && !p.contains(e.relatedTarget)) p.style.transform = '';
    });
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const box = document.createElement('div'); box.className = 'fireflies'; box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) {
      const f = document.createElement('i'), r = (a, b) => (a + Math.random() * (b - a)).toFixed(1);
      f.style.cssText = 'left:' + r(3, 97) + '%;top:' + r(8, 95) + '%;--d:' + r(14, 28) + 's;--w:-' + r(0, 20) + 's;--x:' + r(-70, 70) + 'px;--y:' + r(-110, -30) + 'px';
      box.append(f);
    }
    document.body.prepend(box);
  }
  /* Glowing pill that glides behind the active menu item. */
  const nav = document.querySelector('#navigation'), glider = nav?.querySelector('.nav-glider');
  const place = () => {
    const a = nav?.querySelector('.nav-item.active'); if (!a || !glider) return;
    glider.style.width = a.offsetWidth + 'px'; glider.style.height = a.offsetHeight + 'px';
    glider.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)';
    if (!glider.classList.contains('ready')) glider.classList.add('ready');
  };
  if (nav) {
    new MutationObserver(ms => { if (ms.some(m => m.target !== glider)) place(); }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
    addEventListener('resize', place); requestAnimationFrame(place); setTimeout(place, 300);
  }
  play();
})();
