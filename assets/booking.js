
  /* ============================================================
     Self-service booking flow (interactive showcase).
     In production this state machine is replaced by the embedded
     booking-engine widget; it mirrors that real flow so the client
     can click the exact experience end to end.
  ============================================================ */
  (function () {
    const W = document.getElementById('booking-widget');
    if (!W) return;

    const MAX = 4; // input steps; step 5 is confirmation
    const MN  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAY = 86400000;

    const state = { step: 1, start: null, end: null, boat: null, cap: 12, window: null,
                    hours: 0, delivery: null,
                    party: '', name: '', phone: '', email: '',
                    q1: null, q2: null, q3: null };

    const steps     = Array.from(W.querySelectorAll('.bk-step'));
    const stepNum   = document.getElementById('bk-stepnum');
    const progress  = document.getElementById('bk-progress');
    const nav        = document.getElementById('bk-nav');
    const back       = document.getElementById('bk-back');
    const next       = document.getElementById('bk-next');
    const nextLabel  = document.getElementById('bk-next-label');
    const hint       = document.getElementById('bk-hint');
    const winSingle  = document.getElementById('bk-window-single');
    const winMulti   = document.getElementById('bk-window-multi');
    const winTitle   = document.getElementById('bk-window-title');
    const winSub     = document.getElementById('bk-window-sub');
    const hoursBox     = document.getElementById('bk-hours');
    const returnDateEl = document.getElementById('bk-return-date');
    const deliveryBtn  = document.getElementById('bk-delivery-btn');
    const deliveryNote = document.getElementById('bk-delivery-note');
    const partyInput   = document.getElementById('bk-party');
    let   lastWinMode = null;

    const HINTS = { 1: 'Pick your dates + boat', 2: 'Choose how long', 3: 'A few quick questions', 4: 'Review and confirm' };

    // progress dots
    for (let i = 1; i <= MAX; i++) {
      const d = document.createElement('span');
      d.className = 'bk-dot'; d.dataset.i = i; progress.appendChild(d);
    }
    const dots = Array.from(progress.children);

    const $ = id => document.getElementById(id);
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

    const dayCount = () => { if (!state.start) return 0; const e = state.end || state.start; return Math.round((e - state.start) / DAY) + 1; };
    function price() {
      const n = dayCount();
      let p = 0;
      if (n <= 1) {
        if (state.window === 'full') p = 250;
        else if (state.window === 'hourly') p = 40 * (+state.hours || 0);
      } else if (n === 2) p = 490;
      else if (n === 3) p = 730;
      else if (n > 3) p = 730 + 225 * (n - 3);
      if (state.delivery === 'delivery') p += 80;
      return p;
    }

    function dateLabel() {
      if (!state.start) return '—';
      const s = state.start, e = state.end || state.start;
      if (s.getTime() === e.getTime()) return MS[s.getMonth()] + ' ' + s.getDate() + ', ' + s.getFullYear();
      if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
        return MS[s.getMonth()] + ' ' + s.getDate() + ' – ' + e.getDate() + ', ' + s.getFullYear();
      if (s.getFullYear() === e.getFullYear())
        return MS[s.getMonth()] + ' ' + s.getDate() + ' – ' + MS[e.getMonth()] + ' ' + e.getDate() + ', ' + s.getFullYear();
      return MS[s.getMonth()] + ' ' + s.getDate() + ', ' + s.getFullYear() + ' – ' + MS[e.getMonth()] + ' ' + e.getDate() + ', ' + e.getFullYear();
    }
    function daysLabel() { const n = dayCount(); return n > 1 ? (n + ' days') : (n === 1 ? '1 day' : '—'); }

    // Single day = full day or hourly. Multi-day = pickup vs delivery.
    function scheduleLabel() { return dayCount() > 1 ? 'Pickup' : 'Window'; }
    function windowLabel() {
      if (dayCount() > 1) {
        const ret = state.end ? ('back by 5 PM ' + MS[state.end.getMonth()] + ' ' + state.end.getDate()) : '';
        if (state.delivery === 'delivery') return 'We deliver (+$80) · ' + ret;
        if (state.delivery === 'pickup')   return 'Pick up at our place · ' + ret;
        return '—';
      }
      if (state.window === 'full')   return 'Full day · 9 AM – 5 PM';
      if (state.window === 'hourly') return (+state.hours ? (state.hours + ' hr' + (+state.hours > 1 ? 's' : '') + ' · $40/hr') : 'By the hour');
      return '—';
    }

    function syncSummary() {
      setText('sum-boat',   state.boat   || '—');
      setText('sum-date',   dateLabel());
      setText('sum-days',   daysLabel());
      setText('sum-window-label', scheduleLabel());
      setText('sum-window', windowLabel());
      const p = price();
      setText('sum-deposit', p ? ('$' + p) : '—');
    }

    // Step 2: single day -> full day or hourly. Multi-day -> pickup vs delivery
    // (delivery needs a 3+ day rental); the boat returns by 5 PM on the last day.
    function setupWindows() {
      const n = dayCount();
      const multi = n > 1;
      const mode = multi ? 'multi' : 'single';
      winSingle.classList.toggle('hidden', multi);
      winMulti.classList.toggle('hidden', !multi);
      winTitle.textContent = multi ? ('Your ' + n + ' days on the water') : 'How long on the water?';
      if (multi) {
        winSub.textContent = "You keep the boat the whole stay. Tell us how you're getting it.";
        if (returnDateEl && state.end) returnDateEl.textContent = MS[state.end.getMonth()] + ' ' + state.end.getDate();
        const canDeliver = n >= 3;
        if (deliveryBtn) {
          deliveryBtn.classList.toggle('opacity-40', !canDeliver);
          deliveryBtn.classList.toggle('pointer-events-none', !canDeliver);
        }
        if (deliveryNote) deliveryNote.classList.toggle('hidden', canDeliver);
        if (!canDeliver && state.delivery === 'delivery') {
          state.delivery = null;
          W.querySelectorAll('.seg[data-group="delivery"]').forEach(x => x.classList.remove('sel'));
        }
        if (mode !== lastWinMode) {              // arriving from single
          state.window = null; state.hours = 0;
          W.querySelectorAll('.seg[data-group="window"], .seg[data-group="hours"]').forEach(x => x.classList.remove('sel'));
          if (hoursBox) hoursBox.classList.add('hidden');
        }
        syncSummary();
      } else {
        winSub.textContent = 'Pick the window that fits your day.';
        if (mode !== lastWinMode) {              // arriving from multi
          state.delivery = null;
          W.querySelectorAll('.seg[data-group="delivery"]').forEach(x => x.classList.remove('sel'));
          syncSummary();
        }
      }
      lastWinMode = mode;
    }

    function renderConfirm() {
      setText('cf-boat',   state.boat   || '—');
      setText('cf-date',   dateLabel());
      setText('cf-days',   daysLabel());
      setText('cf-window-label', scheduleLabel());
      setText('cf-window', windowLabel());
      setText('cf-party',  state.party  || '—');
      const p = price();
      setText('cf-deposit', p ? ('$' + p + ' + tax') : '—');
      setText('cf-email',  state.email  || 'your email');
    }

    const stepMeta = stepNum.closest('.text-right');

    function show(n) {
      state.step = n;
      steps.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
      if (n <= MAX) {
        nav.style.display = '';
        if (stepMeta) stepMeta.style.visibility = '';
        stepNum.textContent = n;
        back.disabled = n === 1;
        nextLabel.textContent = n === MAX ? 'Pay & confirm' : 'Continue';
        dots.forEach(d => {
          const i = +d.dataset.i;
          d.classList.toggle('done', i < n);
          d.classList.toggle('current', i === n);
        });
        hint.style.color = '';
        hint.textContent = HINTS[n] || '';
        if (n === 2) setupWindows();
        if (n === 4) syncSummary();
      } else {
        nav.style.display = 'none';
        if (stepMeta) stepMeta.style.visibility = 'hidden';
        dots.forEach(d => { d.classList.add('done'); d.classList.remove('current'); });
        renderConfirm();
      }
      W.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const val = id => (($(id) && $(id).value) || '').trim();

    function valid(n) {
      if (n === 1) return !!(state.start && state.boat);
      if (n === 2) {
        if (dayCount() > 1) return !!state.delivery;
        if (state.window === 'full') return true;
        if (state.window === 'hourly') return +state.hours > 0;
        return false;
      }
      if (n === 3) return !!(state.q1 && state.q2 && state.q3);
      if (n === 4) {
        state.name  = val('bk-name');
        state.phone = val('bk-phone');
        state.email = val('bk-email');
        state.party = val('bk-party');
        return !!(state.name && state.phone && state.email);
      }
      return true;
    }

    function flashHint(msg) {
      hint.textContent = msg || 'Add the missing bit first';
      hint.style.color = '#B85A36';
      hint.classList.remove('hidden');
    }

    next.addEventListener('click', () => {
      if (!valid(state.step)) { flashHint(); return; }
      if (state.step === MAX) { show(5); return; }
      show(state.step + 1);
    });
    back.addEventListener('click', () => { if (state.step > 1) show(state.step - 1); });

    // segmented choices (boat, window, hours, delivery, screening)
    W.querySelectorAll('.seg').forEach(btn => {
      btn.addEventListener('click', () => {
        const grp = btn.dataset.group;
        W.querySelectorAll('.seg[data-group="' + grp + '"]').forEach(x => x.classList.remove('sel'));
        btn.classList.add('sel');
        state[btn.dataset.field] = btn.dataset.value;
        if (btn.dataset.field === 'boat') {
          state.cap = +btn.dataset.cap || 12;
          if (partyInput) { partyInput.max = state.cap; partyInput.placeholder = 'up to ' + state.cap; }
        }
        if (btn.dataset.field === 'window' && hoursBox) {
          hoursBox.classList.toggle('hidden', btn.dataset.value !== 'hourly');
          if (btn.dataset.value !== 'hourly') {
            state.hours = 0;
            W.querySelectorAll('.seg[data-group="hours"]').forEach(x => x.classList.remove('sel'));
          }
        }
        syncSummary();
      });
    });

    // ── calendar (date range) ──
    const cal      = $('cal-grid');
    const calLabel = $('cal-label');
    const calPrev  = $('cal-prev');
    const calNext  = $('cal-next');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let viewY = today.getFullYear(), viewM = today.getMonth();
    const minIdx = viewY * 12 + viewM;        // can't browse before this month
    const maxIdx = minIdx + 3;                // out to ~3 months

    // deterministic "already booked" sprinkle so the calendar feels alive
    const isBooked = (y, m, d) => { const seed = y * 12 + m; return ((d * 3 + seed * 7) % 11) < 3; };
    const mkDate   = (y, m, d) => { const x = new Date(y, m, d); x.setHours(0, 0, 0, 0); return x; };
    const blocked  = dt => dt < today || isBooked(dt.getFullYear(), dt.getMonth(), dt.getDate());

    // is every day from a..b (inclusive) bookable?
    function spanClear(a, b) {
      for (let t = a.getTime(); t <= b.getTime(); t += DAY) {
        const d = new Date(t); d.setHours(0, 0, 0, 0);
        if (blocked(d)) return false;
      }
      return true;
    }

    function pick(dt) {
      // no start yet, or a full range already set -> begin a fresh selection
      if (!state.start || (state.start && state.end)) {
        state.start = dt; state.end = null;
      } else if (dt.getTime() === state.start.getTime()) {
        state.end = dt;                                   // single-day stay
      } else if (dt < state.start) {
        state.start = dt; state.end = null;               // earlier click restarts
      } else if (spanClear(state.start, dt)) {
        state.end = dt;                                   // valid forward range
      } else {
        state.start = dt; state.end = null;               // range hit a booked day -> restart here
        flashHint('That stretch has a booked day — starting fresh');
      }
      renderCal();
      setText('cal-selected', dateLabel());
      syncSummary();
    }

    function renderCal() {
      cal.replaceChildren();
      calLabel.textContent = MN[viewM] + ' ' + viewY;
      const firstDow = new Date(viewY, viewM, 1).getDay();
      const days = new Date(viewY, viewM + 1, 0).getDate();
      for (let i = 0; i < firstDow; i++) {
        const e = document.createElement('div'); e.className = 'cal-day empty'; cal.appendChild(e);
      }
      const s = state.start, e = state.end;
      for (let d = 1; d <= days; d++) {
        const cell = document.createElement('div');
        cell.textContent = d;
        const dt = mkDate(viewY, viewM, d);
        let kind = 'open';
        if (dt < today) kind = 'past';
        else if (isBooked(viewY, viewM, d)) kind = 'booked';
        cell.className = 'cal-day ' + kind;
        if (s) {
          const end = e || s;
          if (dt.getTime() === s.getTime())   cell.classList.add('range-start');
          if (dt.getTime() === end.getTime()) cell.classList.add('range-end');
          if (e && dt > s && dt < e)          cell.classList.add('in-range');
        }
        if (kind === 'open') cell.addEventListener('click', () => pick(dt));
        cal.appendChild(cell);
      }
      const cur = viewY * 12 + viewM;
      calPrev.disabled = cur <= minIdx;
      calNext.disabled = cur >= maxIdx;
    }
    calPrev.addEventListener('click', () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderCal(); });
    calNext.addEventListener('click', () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderCal(); });
    renderCal();

    $('bk-reset').addEventListener('click', () => { window.location.reload(); });

    show(1);
  })();
