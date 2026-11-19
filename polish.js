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
    if (e.target.closest?.('[data-tab],[data-sub],[data-go]')) setTimeout(play, 0);
  });

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
  play();
})();
