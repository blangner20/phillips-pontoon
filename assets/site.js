(function () {
  'use strict';

  var toggle = document.getElementById('mobtoggle');
  var navigation = document.getElementById('mobnav');
  if (toggle && navigation) {
    function setMenu(open, restoreFocus) {
      navigation.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (restoreFocus) toggle.focus();
    }
    function menuIsOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
    toggle.addEventListener('click', function () { setMenu(!menuIsOpen(), false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuIsOpen()) {
        setMenu(false, true);
        event.preventDefault();
      }
    });
    document.addEventListener('click', function (event) {
      if (menuIsOpen() && !navigation.contains(event.target) && !toggle.contains(event.target)) {
        setMenu(false, false);
      }
    });
    navigation.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false, false);
    });
    var desktop = window.matchMedia('(min-width: 1024px)');
    desktop.addEventListener('change', function (event) {
      if (event.matches) setMenu(false, false);
    });
    setMenu(false, false);
  }

  document.querySelectorAll('form.ft-ml, #wl-form').forEach(function (form) {
    var email = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var label = form.querySelector('#wl-submit-label') || button;
    var status = form.querySelector('.ft-ml-msg, #wl-error');
    var success = form.id === 'wl-form' ? document.getElementById('wl-success') : null;
    var endpoint = form.getAttribute('action') || form.getAttribute('data-ml');
    if (!email || !button || !status || !endpoint) return;
    var initialLabel = label.textContent;
    var busy = false;
    var complete = false;
    var fallback = 'Something went wrong. Please try again, or text 715-564-4355.';

    function showStatus(message) {
      status.textContent = message;
      status.classList.remove('hidden');
    }
    function setBusy(loading) {
      busy = loading;
      form.setAttribute('aria-busy', String(loading));
      button.disabled = loading || complete;
      label.textContent = loading ? 'Adding you...' : complete ? 'Added' : initialLabel;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy || complete) return;
      var value = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        email.setAttribute('aria-invalid', 'true');
        showStatus('Please enter a valid email address.');
        email.focus();
        return;
      }
      email.value = value;
      email.removeAttribute('aria-invalid');
      status.textContent = '';
      status.classList.add('hidden');
      setBusy(true);
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 15000);
      try {
        var response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          credentials: 'omit',
          signal: controller.signal
        });
        var result = await response.json();
        if (response.ok && result && result.success === true) {
          complete = true;
          if (success) {
            form.classList.add('hidden');
            success.classList.remove('hidden');
            success.focus();
          } else {
            email.readOnly = true;
            showStatus("You're on Lake Mail. Watch your inbox.");
            status.focus();
          }
        } else {
          var error = result && result.errors && result.errors.fields && result.errors.fields.email;
          var message = Array.isArray(error) ? error[0] : typeof error === 'string' ? error : fallback;
          showStatus(message || fallback);
          if (error) {
            email.setAttribute('aria-invalid', 'true');
            email.focus();
          }
        }
      } catch (error) {
        showStatus(fallback);
      } finally {
        window.clearTimeout(timeout);
        setBusy(false);
      }
    });
  });
})();
