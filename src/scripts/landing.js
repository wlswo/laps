// Everything that moves on the landing page. Motion follows the app: shapes stay still and change smoothly only
// when the state changes, nothing bounces, and numbers roll inside their own slots.
import { preview, isHeavy, suggestion, pace, DEFAULT_SPEED_RATIO } from '../lib/plan.js';

const data = JSON.parse(document.getElementById('laps-data').textContent);
const s = data.s;
const locale = data.lang === 'ko' ? 'ko-KR' : 'en-US';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
})();
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const monthDay = (date) =>
  new Intl.DateTimeFormat(locale, { month: data.lang === 'ko' ? 'long' : 'short', day: 'numeric' }).format(date);

/**
 * Rolling digits. `slots` keeps that many digit places (blank when unused) so the text beside never moves; without
 * it the number takes only the digits it has, like the big number on the app's home screen.
 */
function roll(el, { slots = 0 } = {}) {
  el.textContent = '';
  el.setAttribute('role', 'img');
  const column = () => {
    const d = document.createElement('span');
    d.className = 'd';
    d.setAttribute('aria-hidden', 'true');
    const strip = document.createElement('span');
    strip.className = 'strip';
    for (const label of [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      const n = document.createElement('span');
      n.textContent = label;
      strip.appendChild(n);
    }
    d.appendChild(strip);
    return d;
  };
  const set = (value) => {
    const text = String(Math.max(0, Math.round(value)));
    const width = Math.max(text.length, slots);
    while (el.children.length < width) el.insertBefore(column(), el.firstChild);
    while (el.children.length > width) el.removeChild(el.firstChild);
    const padded = text.padStart(width, ' ');
    [...el.children].forEach((d, i) => {
      const ch = padded[i];
      const index = ch === ' ' ? 0 : Number(ch) + 1;
      d.firstChild.style.transform = `translateY(${-index}em)`;
    });
    el.setAttribute('aria-label', text);
  };
  set(Number(el.dataset.value ?? 0));
  return { set };
}

/** White separators over the filled part of a reads bar, ink over the rest. */
function paintSeparators(bar, fraction) {
  for (const sep of $$('.sep', bar)) sep.classList.toggle('on', Number(sep.dataset.at) <= fraction + 1e-9);
}

/* ---------- Hero: the app's home screen ---------- */
(function home() {
  const root = $('[data-home]');
  if (!root) return;
  const books = s.home.books.map((b) => ({ ...b }));
  const total = books.reduce((sum, b) => sum + b.pages, 0);
  const count = roll($('[data-roll]', root));
  const rows = $$('[data-row]', root);
  const fills = $$('[data-prog]', root);

  const render = () => {
    const read = books.filter((b) => b.done).reduce((sum, b) => sum + b.pages, 0);
    count.set(total - read);
    $('[data-readof]', root).textContent = fill(s.home.readOf, { read, total });
    root.classList.toggle('all', read === total);
    $('[data-done]', root).setAttribute('aria-hidden', read === total ? 'false' : 'true');
    books.forEach((book, i) => {
      rows[i].classList.toggle('done', book.done);
      rows[i].setAttribute('aria-pressed', book.done ? 'true' : 'false');
      const fraction = book.position / (book.pagesPerPass * book.reads);
      fills[i].style.width = `${fraction * 100}%`;
      paintSeparators(fills[i].parentElement, fraction);
    });
  };

  rows.forEach((row, i) =>
    row.addEventListener('click', () => {
      const book = books[i];
      book.done = !book.done;
      book.position += book.done ? book.pages : -book.pages;
      render();
    })
  );
  render();
})();

/* ---------- 01 Calculator and 02 Pace ---------- */
(function calculator() {
  const root = $('[data-calc]');
  if (!root) return;
  const state = { pages: 600, reads: 5, days: 90, speed: 1.7, rest: new Set() };
  const limits = { pages: [50, 1500], reads: [1, 10], speed: [1.1, 2.0] };
  const first = roll($('[data-roll="first"]', root), { slots: 3 });
  const out = (name) => $(`[data-out="${name}"]`, root);
  const readsBox = $('[data-reads]', root);
  const track = $('[data-track]', root);
  const ticks = $('[data-ticks]', root);
  const pagesInput = $('[data-input="pages"]', root);
  const daysInput = $('[data-input="days"]', root);

  // The app keeps the default as exactly 0.6 (shown as 1.7×); other steps are 1 / speed-up.
  const ratio = () => (Math.abs(state.speed - 1.7) < 1e-9 ? DEFAULT_SPEED_RATIO : 1 / state.speed);
  const plan = () => ({
    pages: state.pages,
    reads: state.reads,
    ratio: ratio(),
    days: state.days,
    rest: [...state.rest],
    start: today,
  });

  const setRange = (input, value) => {
    input.value = String(value);
    const [min, max] = [Number(input.min), Number(input.max)];
    input.style.setProperty('--p', `${((value - min) / (max - min)) * 100}%`);
  };

  const renderReads = (result) => {
    const longest = Math.max(1, ...result.reads.map((r) => r.days));
    while (readsBox.children.length > result.reads.length) readsBox.lastChild.remove();
    result.reads.forEach((r, i) => {
      let row = readsBox.children[i];
      if (!row) {
        row = document.createElement('div');
        row.className = 'read-row';
        row.innerHTML = '<span class="rl"></span><span class="bar"><i style="width:0"></i></span><span class="rr"><span></span><small></small></span>';
        readsBox.appendChild(row);
      }
      $('.rl', row).textContent = fill(s.calc.readLabel, { n: r.read });
      requestAnimationFrame(() => ($('.bar i', row).style.width = `${(r.days / longest) * 100}%`));
      $('.rr span', row).innerHTML = `<em>${fill(s.calc.daysN, { n: r.days })}</em>${fill(s.calc.perDay, { n: r.pagesPerDay })}`;
      const before = result.reads[i - 1];
      const faster = before ? before.days - r.days : 0;
      $('.rr small', row).textContent = faster > 0 ? fill(s.calc.faster, { n: faster }) : '';
    });
  };

  const renderTimeline = (result) => {
    const days = state.days;
    while (track.children.length > result.reads.length) track.lastChild.remove();
    result.reads.forEach((r, i) => {
      let seg = track.children[i];
      if (!seg) {
        seg = document.createElement('div');
        seg.innerHTML = '<b></b>';
        track.appendChild(seg);
      }
      seg.className = `seg k${i % 5}${i === 2 ? ' dither' : ''}`;
      seg.style.left = `${(r.startDay / days) * 100}%`;
      seg.style.width = `${((r.finishDay - r.startDay + 1) / days) * 100}%`;
      $('b', seg).textContent = `${r.read}R/${r.pagesPerDay}p`;
    });
    ticks.textContent = '';
    const marks = [{ at: 0, label: s.calc.today }];
    for (let d = 1; d < days; d++) {
      const date = addDays(today, d);
      if (date.getDate() === 1) marks.push({ at: d, label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date) });
    }
    const minGap = days > 200 ? 0.11 : 0.08;
    let last = -1;
    for (const mark of marks) {
      const x = mark.at / days;
      if (last >= 0 && x - last < minGap) continue;
      if (x > 0.93) continue;
      const span = document.createElement('span');
      span.style.left = `${x * 100}%`;
      span.textContent = mark.label;
      ticks.appendChild(span);
      last = x;
    }
  };

  const render = () => {
    const p = plan();
    const result = preview(p);
    const finish = addDays(today, state.days - 1);
    out('pages').textContent = state.pages;
    out('reads').textContent = state.reads;
    out('days').textContent = fill(s.calc.daysValue, { n: state.days });
    out('finish').textContent = fill(s.calc.finishOn, { date: monthDay(finish) });
    out('speed').textContent = fill(s.calc.speedValue, { x: state.speed.toFixed(1) });
    out('speedNote').textContent = fill(s.calc.speedNote, { x: state.speed.toFixed(1) });
    out('peak').textContent = `${result.peak}${data.lang === 'ko' ? '쪽' : 'p'}`;
    out('finishDate').textContent = monthDay(finish);
    $('[data-timeline-end]', root).textContent = monthDay(finish);
    $('[data-footnote]', root).textContent = fill(s.calc.footnote, { x: state.speed.toFixed(1) });
    first.set(result.firstDay);
    setRange(pagesInput, state.pages);
    setRange(daysInput, state.days);
    $$('[data-read-dots] i', root).forEach((dot, i) => dot.classList.toggle('on', i < state.reads));
    for (const [name, [min, max]] of Object.entries(limits)) {
      const value = state[name];
      $$(`[data-step="${name}"]`, root).forEach((b) => {
        const by = Number(b.dataset.by);
        b.disabled = by < 0 ? value <= min + 1e-9 : value >= max - 1e-9;
      });
    }
    const heavy = isHeavy(result);
    const warning = $('[data-heavy]', root);
    warning.hidden = !heavy;
    if (heavy) {
      const fix = suggestion(p);
      const peak = Math.max(result.peak, result.heaviest);
      $('[data-heavy-note]', root).textContent = fix
        ? fill(s.calc.heavyNote, { peak, reads: fix.reads, max: fix.peak })
        : fill(s.calc.heavyNoFix, { peak });
    }
    renderReads(result);
    renderTimeline(result);
    paceDemo.render(p);
  };

  const step = (name, by) => {
    const [min, max] = limits[name];
    const next = Math.round((state[name] + by) * 10) / 10;
    state[name] = Math.min(max, Math.max(min, next));
    render();
  };

  // Steppers repeat while held, like the app's.
  $$('[data-step]', root).forEach((button) => {
    let timer = null;
    const stop = () => {
      clearTimeout(timer);
      clearInterval(timer);
      timer = null;
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      step(button.dataset.step, Number(button.dataset.by));
      timer = setTimeout(() => (timer = setInterval(() => step(button.dataset.step, Number(button.dataset.by)), 70)), 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => button.addEventListener(type, stop));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        step(button.dataset.step, Number(button.dataset.by));
      }
    });
  });
  pagesInput.addEventListener('input', () => {
    state.pages = Number(pagesInput.value);
    render();
  });
  daysInput.addEventListener('input', () => {
    state.days = Number(daysInput.value);
    render();
  });
  $$('[data-rest]', root).forEach((button) =>
    button.addEventListener('click', () => {
      const day = Number(button.dataset.rest);
      if (state.rest.has(day)) state.rest.delete(day);
      else if (state.rest.size < 6) state.rest.add(day); // At least one study day a week.
      button.setAttribute('aria-pressed', state.rest.has(day) ? 'true' : 'false');
      render();
    })
  );

  const paceDemo = (function () {
    const card = $('[data-pace]');
    const input = $('[data-pace-input]');
    const number = $('[data-pace-number]');
    const daysBox = $('[data-pace-days]');
    let current = null;
    const days = Array.from({ length: 21 }, () => daysBox.appendChild(document.createElement('i')));

    const render = (p) => {
      if (p) current = p;
      if (!current || !card) return;
      const shift = Number(input.value);
      const simulated = preview(current).planned;
      // Three weeks in: the study days among the first 21 calendar days.
      let at = simulated.filter((d) => d.i < 21).length;
      if (simulated.length < at + 8) at = Math.max(1, Math.floor(simulated.length / 3));
      const clamped = Math.max(-Math.min(7, simulated.length - at - 1), Math.min(shift, at));
      const result = pace(current, at, clamped);
      if (!result) return;
      const n = result.pagesPerDay;
      number.textContent = n > 0 ? fill(s.pace.plus, { n }) : n < 0 ? fill(s.pace.minus, { n: -n }) : s.pace.zero;
      number.classList.toggle('up', n > 0);
      number.classList.toggle('down', n < 0);
      $('[data-pace-shift]').textContent =
        clamped > 0 ? fill(s.pace.behind, { n: clamped }) : clamped < 0 ? fill(s.pace.ahead, { n: -clamped }) : s.pace.onPlan;
      $('[data-pace-note]').textContent =
        clamped > 0
          ? n > 0 ? fill(s.pace.noteBehind, { n: clamped }) : fill(s.pace.noteBehindSmall, { n: clamped })
          : clamped < 0
            ? n < 0 ? s.pace.noteAhead : s.pace.noteAheadSmall
            : s.pace.noteOnPlan;
      // The last `at` squares are the study days so far; the missed ones are the latest.
      const missedFrom = at - Math.max(0, clamped);
      days.forEach((d, i) => {
        const k = i - (days.length - at);
        d.classList.toggle('gone', k < 0);
        d.classList.toggle('missed', k >= missedFrom);
      });
      // Pages a day the plan asked, and what it asks now: the same numbers the "+2" comes from, so they always agree.
      const planned = Math.round(result.planPages);
      const now = planned + n;
      const scale = Math.max(result.planPages, result.nowPages) * 1.25 || 1;
      $('[data-pb="plan"]').style.width = `${(result.planPages / scale) * 100}%`;
      $('[data-pb="replan"]').style.width = `${(result.nowPages / scale) * 100}%`;
      $('[data-pb-n="plan"]').textContent = fill(s.calc.perDay, { n: planned });
      $('[data-pb-n="replan"]').textContent = fill(s.calc.perDay, { n: now });
    };
    input?.addEventListener('input', () => render());
    return { render };
  })();

  render();
})();

/* ---------- 03 Tour ---------- */
(function tour() {
  const root = $('[data-tour]');
  if (!root) return;
  const tabs = $$('[data-tab]', root);
  const shots = $$('[data-shot]', root);
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
      tab.tabIndex = i === index ? 0 : -1;
    });
    shots.forEach((shot, i) => shot.classList.toggle('on', i === index));
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (event) => {
      const by = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
      if (!by) return;
      event.preventDefault();
      select((i + by + tabs.length) % tabs.length, true);
    });
  });
  select(0);
})();

/* ---------- 04 Details: play once when seen, replay on demand ---------- */
(function details() {
  const root = $('[data-details]');
  if (!root) return;
  const numberEl = $('[data-roll="demo"]', root);
  const number = roll(numberEl, { slots: 2 });
  const row = $('.demo-row', root);
  const blocks = $('[data-demo-fill]', root);
  const timers = { number: [], check: [], blocks: [] };
  const later = (name, ms, fn) => timers[name].push(setTimeout(fn, reduceMotion ? 0 : ms));
  const clear = (name) => {
    timers[name].forEach(clearTimeout);
    timers[name] = [];
  };
  const play = {
    number() {
      clear('number');
      number.set(58);
      [41, 27, 9, 0].forEach((v, i) => later('number', 700 + i * 850, () => number.set(v)));
    },
    check() {
      clear('check');
      row.classList.remove('done');
      later('check', 650, () => row.classList.add('done'));
    },
    blocks() {
      clear('blocks');
      blocks.style.transition = 'none';
      blocks.style.width = '0%';
      paintSeparators(blocks.parentElement, 0);
      void blocks.offsetWidth;
      blocks.style.transition = '';
      [0.2, 0.4, 0.64].forEach((f, i) =>
        later('blocks', 500 + i * 700, () => {
          blocks.style.width = `${f * 100}%`;
          paintSeparators(blocks.parentElement, f);
        })
      );
    },
  };
  $$('[data-replay]', root).forEach((button) => button.addEventListener('click', () => play[button.dataset.replay]()));
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        play[entry.target.dataset.demo]?.();
        seen.unobserve(entry.target);
      }
    },
    { threshold: 0.6 }
  );
  $$('[data-demo]', root).forEach((demo) => seen.observe(demo));
})();

/* ---------- 06 FAQ: smooth open and close ---------- */
(function faq() {
  for (const item of $$('.qa')) {
    const summary = $('summary', item);
    const answer = $('.answer', item);
    let animation = null;
    summary.addEventListener('click', (event) => {
      if (reduceMotion) return;
      event.preventDefault();
      animation?.cancel();
      if (item.open) {
        animation = answer.animate([{ height: `${answer.offsetHeight}px` }, { height: '0px' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        animation.onfinish = () => (item.open = false);
      } else {
        item.open = true;
        const height = answer.offsetHeight;
        animation = answer.animate([{ height: '0px' }, { height: `${height}px` }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  }
})();

/* ---------- Reveal on scroll ---------- */
(function reveal() {
  const items = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => {
    // Siblings that arrive together come in one after another.
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 3) * 90}ms`;
    // What is on screen at load comes in right away, without waiting for a scroll.
    if (el.getBoundingClientRect().top < window.innerHeight) requestAnimationFrame(() => el.classList.add('in'));
    else io.observe(el);
  });
})();
