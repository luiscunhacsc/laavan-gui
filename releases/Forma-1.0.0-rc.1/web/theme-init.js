// Apply the saved appearance before styles load, including on a cold/offline visit.
(function () {
  var preference;
  try { preference = localStorage.getItem('forma-ui-theme'); } catch (_) {}
  var theme = preference === 'light' || preference === 'dark'
    ? preference : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
})();
