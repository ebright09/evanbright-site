/* A casual visitor gate for the review copy, not server-side authentication.
   The underlying static files and repository remain public. */
(function () {
  'use strict';
  const EXPECTED_HASH = '5f14bd8f6186a2d981260eac64589a979580835114ed2278710288770e550a42';
  const STORAGE_KEY = 'bairs.preview.access.v1';
  const root = document.documentElement;
  const gate = document.getElementById('access-gate');
  const form = document.getElementById('access-form');
  const input = document.getElementById('access-password');
  const submit = document.getElementById('access-submit');
  const error = document.getElementById('access-error');
  if (!gate || !form || !input || !submit || !error) return;

  function unlock() {
    root.classList.remove('access-locked');
    gate.hidden = true;
    input.value = '';
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_) {}
    target = target || document.getElementById('main');
    if (target) {
      if (target.matches('details')) target.open = true;
      if (location.hash) target.scrollIntoView();
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }

  function lock() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    root.classList.add('access-locked');
    gate.hidden = false;
    input.value = '';
    error.hidden = true;
    input.removeAttribute('aria-invalid');
    input.focus();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    error.hidden = true;
    input.removeAttribute('aria-invalid');
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.value));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== EXPECTED_HASH) {
        error.textContent = 'That password is incorrect. Please try again.';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.select();
        input.focus();
        return;
      }
      try { sessionStorage.setItem(STORAGE_KEY, EXPECTED_HASH); } catch (_) {}
      unlock();
    } catch (_) {
      error.textContent = 'Access could not be checked. Please reload the page and try again.';
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelectorAll('[data-lock-preview]').forEach(button => button.addEventListener('click', lock));
  if (!window.crypto || !window.crypto.subtle) {
    error.textContent = 'Open this page using its secure https:// address to enter the preview.';
    error.hidden = false;
    return;
  }
  input.disabled = false;
  submit.disabled = false;
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === EXPECTED_HASH) { unlock(); return; }
  } catch (_) {}
  input.focus();
})();
