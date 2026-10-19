(function () {
  'use strict';

  var promo = document.querySelector('[data-season-countdown]');
  if (!promo) return;
  promo.hidden = true;

  var configured = promo.getAttribute('data-season-opens');
  var opens = Date.parse(configured);
  var fields = ['days', 'hours', 'minutes', 'seconds'].map(function (unit) {
    return promo.querySelector('[data-countdown-' + unit + ']');
  });
  var summary = promo.querySelector('[data-countdown-summary]');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(configured || '') ||
      !Number.isFinite(opens) || fields.some(function (field) { return !field; }) || !summary) return;

  var timer = null;
  var finished = false;
  var summaryKey = '';
  summary.setAttribute('aria-live', 'off');

  function stopTimer() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function update() {
    if (finished) return false;
    var remaining = opens - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      finished = true;
      promo.hidden = true;
      stopTimer();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('pagehide', stopTimer);
      return false;
    }

    var total = Math.ceil(remaining / 1000);
    var days = Math.floor(total / 86400);
    var hours = Math.floor(total % 86400 / 3600);
    var minutes = Math.floor(total % 3600 / 60);
    var seconds = total % 60;
    [days, hours, minutes, seconds].forEach(function (value, index) {
      fields[index].textContent = index === 0 ? String(value) : String(value).padStart(2, '0');
    });

    var nextSummaryKey = [days, hours, minutes].join(':');
    if (summaryKey !== nextSummaryKey) {
      summaryKey = nextSummaryKey;
      summary.textContent = days === 0 && hours === 0 && minutes === 0
        ? 'The season opens in less than a minute.'
        : 'The season opens in ' + days + ' day' + (days === 1 ? '' : 's') + ', ' +
          hours + ' hour' + (hours === 1 ? '' : 's') + ' and ' +
          minutes + ' minute' + (minutes === 1 ? '' : 's') + '.';
    }
    promo.hidden = false;
    return true;
  }

  function sync() {
    stopTimer();
    if (update() && !document.hidden) timer = window.setInterval(update, 1000);
  }

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', stopTimer);
  sync();
})();
