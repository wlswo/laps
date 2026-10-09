// The little that moves on the landing page: tiles come in once as they reach the screen, the answers open
// smoothly, and the Lifetime Pass beam runs only while it is on screen.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (selector) => [...document.querySelectorAll(selector)];

/* ---------- Tiles come in, one after another ---------- */
(function reveal() {
  const items = $$('[data-in]');
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  items.forEach((el) => el.classList.add('waiting'));
  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, k) => {
          entry.target.style.transitionDelay = `${k * 70}ms`;
          entry.target.classList.remove('waiting');
          io.unobserve(entry.target);
        });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => io.observe(el));
})();

/* ---------- The Lifetime Pass beam ---------- */
(function beam() {
  const pass = document.querySelector('.plan.pass');
  if (!pass || reduceMotion) return;
  new IntersectionObserver(([entry]) => pass.classList.toggle('live', entry.isIntersecting)).observe(pass);
})();

/* ---------- FAQ: smooth open and close ---------- */
(function faq() {
  for (const item of $$('.qa')) {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.answer');
    let animation = null;
    summary.addEventListener('click', (event) => {
      if (reduceMotion) return;
      event.preventDefault();
      animation?.cancel();
      if (item.open) {
        animation = answer.animate([{ height: `${answer.offsetHeight}px` }, { height: '0px' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
        animation.onfinish = () => (item.open = false);
      } else {
        item.open = true;
        const height = answer.offsetHeight;
        animation = answer.animate([{ height: '0px' }, { height: `${height}px` }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  }
})();
