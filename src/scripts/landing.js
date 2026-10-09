// Everything that moves on the landing page. Motion follows the app: shapes stay still and change smoothly only
// when the state changes, nothing bounces, and numbers roll inside their own slots. The math, the pace and the
// UI moments play by themselves while they are on screen, and wait while they are scrolled away.
import { preview, isHeavy, suggestion, pace, DEFAULT_SPEED_RATIO } from '../lib/plan.js';

const data = JSON.parse(document.getElementById('laps-data').textContent);
const s = data.s;
const locale = data.lang === 'ko' ? 'ko-KR' : 'en-US';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const today = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
})();
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const monthDay = (date) =>
  new Intl.DateTimeFormat(locale, { month: data.lang === 'ko' ? 'long' : 'short', day: 'numeric' }).format(date);

/**
 * Rolling digits. `slots` keeps that many digit places (blank, or 0 with `zero`) so the text beside never moves;
 * without it the number takes only the digits it has, like the big number on the app's home screen.
 */
function roll(el, { slots = 0, zero = false } = {}) {
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
    const padded = text.padStart(width, zero ? '0' : ' ');
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

/** Text that fades out, changes, and fades back in. */
function swapText(el, text) {
  if (el.textContent === text && !el.classList.contains('out')) return;
  clearTimeout(el._swap);
  if (reduceMotion) {
    el.textContent = text;
    return;
  }
  el.classList.add('out');
  el._swap = setTimeout(() => {
    el.textContent = text;
    el.classList.remove('out');
  }, 180);
}

/** White separators over the filled part of a reads bar, ink over the rest. */
function paintSeparators(bar, fraction) {
  for (const sep of $$('.sep', bar)) sep.classList.toggle('on', Number(sep.dataset.at) <= fraction + 1e-9);
}

/** `gate()` resolves once `el` is on screen; `sleep(ms)` waits, then also waits for the screen. */
function onScreen(el, threshold = 0.2) {
  let visible = false;
  let waiting = [];
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) return;
      waiting.forEach((resolve) => resolve());
      waiting = [];
    },
    { threshold }
  ).observe(el);
  const gate = () => (visible ? Promise.resolve() : new Promise((resolve) => waiting.push(resolve)));
  return {
    gate,
    sleep: async (ms) => {
      await wait(ms);
      await gate();
    },
  };
}

/** A thin bar that fills over `ms`, the sign that something is playing by itself. */
function runBar(bar, ms) {
  bar.style.transition = 'none';
  bar.style.width = '0%';
  void bar.offsetWidth;
  bar.style.transition = `width ${ms}ms linear`;
  bar.style.width = '100%';
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

/* ---------- The math: the numbers type themselves in, the plan works itself out ---------- */
(function calculator() {
  const root = $('[data-calc]');
  if (!root) return;
  // Sundays off, then ten days sooner (too heavy), then the read count Laps suggests. Holds on any weekday.
  const steps = [
    { pages: 600, reads: 5, days: 90, rest: [], speed: 1.7 },
    { pages: 600, reads: 5, days: 90, rest: [0], speed: 1.7 },
    { pages: 600, reads: 5, days: 80, rest: [0], speed: 1.7 },
    { pages: 600, reads: 4, days: 80, rest: [0], speed: 1.7 },
  ];
  const STEP_MS = 4600;
  const maxReads = Math.max(...steps.map((step) => step.reads));
  const first = roll($('[data-roll="first"]', root), { slots: 2 });
  const peak = roll($('[data-roll="peak"]', root), { slots: 2 });
  const readsBox = $('[data-reads]', root);
  const track = $('[data-track]', root);
  const ticks = $('[data-ticks]', root);
  const heavy = $('[data-heavy]', root);
  const scan = $('.scan', root);
  const caption = $('[data-caption]', root);
  const bars = $$('.calc-progress i', root);
  const [daysPre, daysPost] = s.calc.daysN.split('{n}');
  const [perPre, perPost] = s.calc.perDay.split('{n}');

  // The app keeps the default as exactly 0.6 (shown as 1.7×); other steps are 1 / speed-up.
  const plan = (state) => ({
    pages: state.pages,
    reads: state.reads,
    ratio: Math.abs(state.speed - 1.7) < 1e-9 ? DEFAULT_SPEED_RATIO : 1 / state.speed,
    days: state.days,
    rest: state.rest,
    start: today,
  });

  const rows = Array.from({ length: maxReads }, (_, i) => {
    const row = document.createElement('div');
    row.className = 'read-row off';
    row.innerHTML =
      '<span class="rl"></span><span class="bar"><i></i></span>' +
      '<span class="rr"><span class="rr-main"><span class="rr-days"></span><span class="rr-per"></span></span><small class="swap"></small></span>';
    $('.rl', row).textContent = fill(s.calc.readLabel, { n: i + 1 });
    const slot = (box, pre, post) => {
      const number = document.createElement('span');
      number.className = 'roll';
      box.append(pre, number, post);
      return roll(number, { slots: 2 });
    };
    readsBox.appendChild(row);
    return {
      row,
      bar: $('.bar i', row),
      days: slot($('.rr-days', row), daysPre, daysPost),
      per: slot($('.rr-per', row), perPre, perPost),
      faster: $('small', row),
    };
  });
  const segments = Array.from({ length: maxReads }, (_, i) => {
    const seg = document.createElement('div');
    seg.className = `seg k${i}${i === 2 ? ' dither' : ''} off`;
    seg.innerHTML = '<b></b>';
    track.appendChild(seg);
    return seg;
  });

  let tickKey = '';
  const renderTicks = (days) => {
    const marks = [{ at: 0, label: s.calc.today }];
    for (let d = 1; d < days; d++) {
      const date = addDays(today, d);
      if (date.getDate() === 1) marks.push({ at: d, label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date) });
    }
    const kept = [];
    let last = -1;
    for (const mark of marks) {
      const x = mark.at / days;
      if ((last >= 0 && x - last < 0.08) || x > 0.93) continue;
      kept.push({ x, label: mark.label });
      last = x;
    }
    const key = JSON.stringify(kept);
    if (key === tickKey) return;
    tickKey = key;
    ticks.textContent = '';
    for (const mark of kept) {
      const span = document.createElement('span');
      span.style.left = `${mark.x * 100}%`;
      span.textContent = mark.label;
      ticks.appendChild(span);
    }
  };

  /** The results for one state: every number rolls, every bar slides, and a scan line passes over once. */
  const show = (state) => {
    const p = plan(state);
    const result = preview(p);
    const finish = monthDay(addDays(today, state.days - 1));
    const most = Math.max(result.peak, result.heaviest);
    first.set(result.firstDay);
    peak.set(most);
    swapText($('[data-out="finishDate"]', root), finish);
    swapText($('[data-timeline-end]', root), finish);
    $('[data-footnote]', root).textContent = fill(s.calc.footnote, { x: state.speed.toFixed(1) });
    if (isHeavy(result)) {
      const fix = suggestion(p);
      $('[data-heavy-note]', root).textContent = fix
        ? fill(s.calc.heavyNote, { peak: most, reads: fix.reads, max: fix.peak })
        : fill(s.calc.heavyNoFix, { peak: most });
    }
    heavy.classList.toggle('on', isHeavy(result));
    const longest = Math.max(1, ...result.reads.map((r) => r.days));
    rows.forEach((row, i) => {
      const read = result.reads[i];
      row.row.classList.toggle('off', !read);
      if (!read) return;
      row.bar.style.width = `${(read.days / longest) * 100}%`;
      row.days.set(read.days);
      row.per.set(read.pagesPerDay);
      const before = result.reads[i - 1];
      const faster = before ? before.days - read.days : 0;
      swapText(row.faster, faster > 0 ? fill(s.calc.faster, { n: faster }) : '');
    });
    segments.forEach((seg, i) => {
      const read = result.reads[i];
      seg.classList.toggle('off', !read);
      if (!read) {
        seg.style.width = '0%';
        return;
      }
      seg.style.left = `${(read.startDay / state.days) * 100}%`;
      seg.style.width = `${((read.finishDay - read.startDay + 1) / state.days) * 100}%`;
      $('b', seg).textContent = `${read.read}R/${read.pagesPerDay}p`;
    });
    renderTicks(state.days);
    if (!reduceMotion) {
      scan.classList.remove('run');
      void scan.offsetWidth;
      scan.classList.add('run');
    }
  };

  const field = (name) => $(`[data-field="${name}"]`, root);
  const showInputs = (state) => {
    $$('[data-read-dots] i', root).forEach((dot, i) => dot.classList.toggle('on', i < state.reads));
    swapText($('[data-finish]', root), fill(s.calc.finishOn, { date: monthDay(addDays(today, state.days - 1)) }));
  };

  /** Clears a field and types the new value, the way a person would. */
  const typeInto = async (name, text) => {
    const el = $(`[data-type="${name}"]`, root);
    field(name).classList.add('active');
    await wait(380);
    while (el.textContent.length) {
      el.textContent = el.textContent.slice(0, -1);
      await wait(70);
    }
    await wait(140);
    for (const ch of text) {
      el.textContent += ch;
      await wait(150);
    }
  };
  const tapRest = async (day, on) => {
    field('rest').classList.add('active');
    await wait(420);
    $(`[data-rest="${day}"]`, root).classList.toggle('on', on);
    await wait(200);
  };

  const apply = async (from, to) => {
    const changes = [];
    if (from.pages !== to.pages) changes.push(typeInto('pages', String(to.pages)));
    if (from.reads !== to.reads) changes.push(typeInto('reads', String(to.reads)));
    if (from.days !== to.days) changes.push(typeInto('days', String(to.days)));
    if (from.speed !== to.speed) changes.push(typeInto('speed', to.speed.toFixed(1)));
    for (let day = 0; day < 7; day++) {
      const was = from.rest.includes(day);
      if (was !== to.rest.includes(day)) changes.push(tapRest(day, !was));
    }
    await Promise.all(changes);
    showInputs(to);
    await wait(260);
    show(to);
    await wait(1300);
    $$('.field.active', root).forEach((f) => f.classList.remove('active'));
  };

  showInputs(steps[0]);
  show(steps[0]);
  if (reduceMotion) return;

  const { gate, sleep } = onScreen(root);
  (async () => {
    await gate();
    let current = steps[0];
    for (let i = 0; ; i = (i + 1) % steps.length) {
      const started = performance.now();
      bars.forEach((bar, k) => {
        bar.style.transition = 'none';
        bar.style.width = k < i ? '100%' : '0%';
      });
      runBar(bars[i], STEP_MS);
      swapText(caption, s.calc.steps[i]);
      if (steps[i] !== current) await apply(current, steps[i]);
      current = steps[i];
      await sleep(Math.max(0, STEP_MS - (performance.now() - started)));
    }
  })();
})();

/* ---------- Pace: days slip and catch up by themselves, the plan spreads out again ---------- */
(function paceDemo() {
  const card = $('[data-pace]');
  if (!card) return;
  const plan = { pages: 600, reads: 5, ratio: DEFAULT_SPEED_RATIO, days: 90, rest: [], start: today };
  // Three weeks in: the study days among the first 21 calendar days.
  const at = preview(plan).planned.filter((d) => d.i < 21).length;
  const shifts = [0, 3, 7, 14, 7, 0, -4, -7];
  const number = roll($('[data-pace-roll]', card), { slots: 1 });
  const value = $('[data-pace-value]', card);
  const sign = $('[data-pace-sign]', card);
  const thumb = $('[data-pace-thumb]', card);
  const fillBar = $('[data-pace-fill]', card);
  const daysBox = $('[data-pace-days]', card);
  const squares = Array.from({ length: 21 }, (_, i) => {
    const square = daysBox.appendChild(document.createElement('i'));
    square.style.transitionDelay = `${(20 - i) * 22}ms`;
    return square;
  });
  const mid = 7 / 21;

  const render = (shift) => {
    const result = pace(plan, at, shift);
    if (!result) return;
    const n = result.pagesPerDay;
    sign.textContent = n > 0 ? '+' : n < 0 ? '−' : '±';
    number.set(Math.abs(n));
    value.classList.toggle('up', n > 0);
    value.classList.toggle('down', n < 0);
    value.setAttribute('aria-label', n > 0 ? fill(s.pace.plus, { n }) : n < 0 ? fill(s.pace.minus, { n: -n }) : s.pace.zero);
    swapText($('[data-pace-shift]', card), shift > 0 ? fill(s.pace.behind, { n: shift }) : shift < 0 ? fill(s.pace.ahead, { n: -shift }) : s.pace.onPlan);
    swapText(
      $('[data-pace-note]', card),
      shift > 0
        ? n > 0 ? fill(s.pace.noteBehind, { n: shift }) : fill(s.pace.noteBehindSmall, { n: shift })
        : shift < 0
          ? n < 0 ? s.pace.noteAhead : s.pace.noteAheadSmall
          : s.pace.noteOnPlan
    );
    const x = (shift + 7) / 21;
    thumb.style.left = `${x * 100}%`;
    fillBar.style.left = `${Math.min(x, mid) * 100}%`;
    fillBar.style.width = `${Math.abs(x - mid) * 100}%`;
    fillBar.classList.toggle('ahead', shift < 0);
    // The latest `shift` study days are the missed ones.
    const missedFrom = squares.length - Math.max(0, shift);
    squares.forEach((square, i) => square.classList.toggle('missed', i >= missedFrom));
    // Pages a day the plan asked, and what it asks now: the same numbers the "+2" comes from, so they always agree.
    const planned = Math.round(result.planPages);
    const scale = Math.max(result.planPages, result.nowPages) * 1.25 || 1;
    $('[data-pb="plan"]', card).style.width = `${(result.planPages / scale) * 100}%`;
    $('[data-pb="replan"]', card).style.width = `${(result.nowPages / scale) * 100}%`;
    $('[data-pb-n="plan"]', card).textContent = fill(s.calc.perDay, { n: planned });
    $('[data-pb-n="replan"]', card).textContent = fill(s.calc.perDay, { n: planned + n });
  };

  render(reduceMotion ? 7 : 0);
  if (reduceMotion) return;
  const { gate, sleep } = onScreen(card, 0.35);
  (async () => {
    await gate();
    for (let i = 1; ; i = (i + 1) % shifts.length) {
      await sleep(2500);
      render(shifts[i]);
    }
  })();
})();

/* ---------- The screens: a stack that fans out into a row ---------- */
(function fan() {
  const root = $('[data-fan]');
  if (!root || reduceMotion || !('IntersectionObserver' in window)) return;
  const items = $$('.fan-item', root);
  // Layout positions (offsetLeft/Top ignore transforms), so this can run again while stacked.
  const stack = () => {
    const devices = items.map((item) => $('.device', item));
    const centerX = root.clientWidth / 2;
    const centerY = items[0].offsetTop + devices[0].offsetTop + devices[0].offsetHeight / 2;
    items.forEach((item, i) => {
      const device = devices[i];
      const k = i - (items.length - 1) / 2;
      const x = item.offsetLeft + device.offsetLeft + device.offsetWidth / 2;
      const y = item.offsetTop + device.offsetTop + device.offsetHeight / 2;
      item.style.setProperty('--dx', `${centerX - x + k * 18}px`);
      item.style.setProperty('--dy', `${centerY - y + Math.abs(k) * 8}px`);
      item.style.setProperty('--r', `${k * 5}deg`);
    });
  };
  stack();
  root.classList.add('stacked');
  window.addEventListener('resize', stack);
  document.fonts?.ready.then(stack);
  // Opens once most of the first phone is in view, so the stack is seen before it fans out.
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      window.removeEventListener('resize', stack);
      root.classList.add('open');
      io.disconnect();
    },
    { threshold: 0.6 }
  );
  io.observe($('.device', items[0]));
})();

/* ---------- UI and UX: six small scenes, played one after another ---------- */
(function ux() {
  const root = $('[data-ux]');
  if (!root) return;
  const tiles = $$('[data-tile]', root);

  /** A tap on `target`: a soft circle that fades in and out where the finger would be. */
  const tapOn = (scene, target) => {
    const tap = $('.tap', scene);
    const a = scene.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    tap.style.left = `${b.left - a.left + b.width / 2}px`;
    tap.style.top = `${b.top - a.top + b.height / 2}px`;
    tap.classList.remove('on');
    void tap.offsetWidth;
    tap.classList.add('on');
  };

  const builders = {
    clock(el) {
      const h = roll($('[data-clock-h]', el), { slots: 2, zero: true });
      const m = roll($('[data-clock-m]', el), { slots: 2, zero: true });
      const left = roll($('[data-clock-left]', el), { slots: 2 });
      const date = $('[data-clock-date]', el);
      return {
        reset() {
          h.set(23);
          m.set(58);
          left.set(41);
          clearTimeout(date._swap);
          date.classList.remove('out');
          date.textContent = s.ux.clockDate[0];
        },
        play(later) {
          // Past midnight it is still the same day: the pages read count for it.
          later(700, () => (h.set(0), m.set(40), left.set(27)));
          later(1900, () => (h.set(1), m.set(30), left.set(14)));
          later(3100, () => (h.set(3), m.set(59)));
          // At 4:00 a new day starts.
          later(4100, () => (h.set(4), m.set(0), left.set(57), swapText(date, s.ux.clockDate[1])));
          return 5600;
        },
      };
    },
    undo(el) {
      const row = $('[data-undo-row]', el);
      const check = $('[data-undo-check]', el);
      return {
        reset: () => row.classList.remove('done'),
        play(later) {
          later(500, () => tapOn(el, check));
          later(650, () => row.classList.add('done'));
          later(2100, () => tapOn(el, check));
          later(2250, () => row.classList.remove('done'));
          return 3600;
        },
      };
    },
    quiet(el) {
      const row = $('[data-quiet-row]', el);
      const check = $('[data-quiet-check]', el);
      return {
        reset() {
          row.classList.remove('done');
          el.classList.remove('silenced');
        },
        play(later) {
          later(800, () => tapOn(el, check));
          later(950, () => row.classList.add('done'));
          later(1700, () => el.classList.add('silenced'));
          return 3800;
        },
      };
    },
    chapter(el) {
      const to = roll($('[data-ch-to]', el), { slots: 2 });
      return {
        reset() {
          el.classList.remove('grow', 'gap', 'end');
          to.set(37);
        },
        play(later) {
          later(300, () => el.classList.add('grow'));
          later(1400, () => el.classList.add('gap'));
          later(2500, () => (el.classList.add('end'), to.set(40)));
          return 4400;
        },
      };
    },
    save(el) {
      const reads = roll($('[data-save-roll]', el), { slots: 1 });
      const blocks = $('[data-save-blocks]', el);
      const seps = $$('.sep', blocks);
      const fillBar = $('i', blocks);
      const divide = (n) => {
        seps.forEach((sep, k) => {
          const at = (k + 1) / n;
          sep.style.left = `${Math.min(at, 1) * 100}%`;
          sep.style.opacity = at < 1 - 1e-9 ? '1' : '0';
        });
        fillBar.style.width = `${(0.4 / n) * 100}%`;
      };
      return {
        reset() {
          el.classList.remove('popped');
          reads.set(3);
          divide(3);
        },
        play(later) {
          later(600, () => tapOn(el, $('[data-save-plus]', el)));
          later(750, () => reads.set(4));
          later(1800, () => tapOn(el, $('[data-save-back]', el)));
          later(1950, () => el.classList.add('popped'));
          // Back on home, the plan is already the new one.
          later(2500, () => divide(4));
          return 4400;
        },
      };
    },
    pass(el) {
      const add = $('[data-pass-add]', el);
      return {
        reset: () => el.classList.remove('one', 'asked'),
        play(later) {
          later(600, () => tapOn(el, add));
          later(750, () => el.classList.add('one'));
          later(2100, () => tapOn(el, add));
          later(2250, () => el.classList.add('asked'));
          return 4600;
        },
      };
    },
  };

  const scenes = tiles.map((tile) => {
    const el = $('[data-scene]', tile);
    const scene = builders[el.dataset.scene](el);
    let timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    return {
      el,
      reset() {
        timers.forEach(clearTimeout);
        timers = [];
        el.classList.add('instant');
        scene.reset();
        void el.offsetWidth;
        el.classList.remove('instant');
      },
      play: () => scene.play(later),
    };
  });
  scenes.forEach((scene) => scene.reset());
  if (reduceMotion) return;

  const { gate } = onScreen(root, 0.25);
  let token = 0;
  const run = async (i) => {
    const mine = ++token;
    tiles.forEach((tile, k) => tile.classList.toggle('playing', k === i));
    scenes.forEach((scene) => scene.el.classList.remove('fading'));
    const scene = scenes[i];
    // A scene left in its last state fades out, starts over, and fades back in.
    scene.el.classList.add('fading');
    await wait(260);
    if (mine !== token) return;
    scene.reset();
    scene.el.classList.remove('fading');
    await wait(240);
    if (mine !== token) return;
    const ms = scene.play();
    runBar($('.tile-progress i', tiles[i]), ms);
    await wait(ms + 400);
    if (mine !== token) return;
    await gate();
    if (mine === token) run((i + 1) % tiles.length);
  };
  // Tapping a tile plays it now.
  tiles.forEach((tile, i) => tile.addEventListener('click', () => run(i)));
  gate().then(() => run(0));
})();

/* ---------- Price: the Lifetime Pass beam runs only while it is on screen ---------- */
(function beam() {
  const pass = $('[data-pass]');
  if (!pass || reduceMotion) return;
  new IntersectionObserver(([entry]) => pass.classList.toggle('live', entry.isIntersecting)).observe(pass);
})();

/* ---------- FAQ: smooth open and close ---------- */
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
