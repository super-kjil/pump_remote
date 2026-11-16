// Applied before first paint to avoid a light/dark flash. Kept out of index.html so the
// production Content-Security-Policy can use `script-src 'self'` without 'unsafe-inline'.
(function () {
  try {
    var storageKey = 'theme';
    var theme = localStorage.getItem(storageKey) || 'system';
    var isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {
    /* ignore */
  }
})();
