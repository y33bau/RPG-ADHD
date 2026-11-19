/* Visual polish only: replays a short entrance animation when the view changes. */
(() => {
  const main = () => document.querySelector('main');
  let timer;
  const play = () => {
    const m = main(); if (!m) return;
    m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
    clearTimeout(timer); timer = setTimeout(() => m.classList.remove('enter'), 900);
  };
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-tab],[data-sub],[data-go]')) setTimeout(play, 0);
  });
  const burst = e => {
    const b = e.target.closest?.('.check,.btn.primary,.x-q,.x-chip,.x-subtab,.nav-item');
    if (!b || b.disabled) return;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  };
  document.addEventListener('pointerdown', burst);
  play();
})();
