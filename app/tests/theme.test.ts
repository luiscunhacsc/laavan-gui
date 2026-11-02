import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readThemePreference, resolveTheme, storeThemePreference, THEME_STORAGE_KEY} from '../src/theme';
import {sceneBody, renderSvg} from '../src/svg';
import {defaultDisplay, normalizeModel} from '../src/model';
import {layoutModel} from '../src/layout';

const bootstrap = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');

for (const prefersDark of [false, true]) {
  for (const preference of [undefined, 'light', 'dark', 'invalid']) {
    test(`first paint respects preference ${preference} with system dark=${prefersDark}`, () => {
      const root = {dataset: {} as Record<string, string>};
      let browserColor = '';
      runInNewContext(bootstrap, {
        localStorage: {getItem: () => preference},
        window: {matchMedia: () => ({matches: prefersDark})},
        document: {documentElement: root, querySelector: () => ({setAttribute: (_key: string, value: string) => { browserColor = value; }})},
      });
      const expected = preference === 'light' || preference === 'dark' ? preference : prefersDark ? 'dark' : 'light';
      assert.equal(root.dataset.theme, expected);
      assert.equal(resolveTheme(preference, prefersDark), expected);
      assert.equal(browserColor, expected === 'dark' ? '#0f172a' : '#ffffff');
    });
  }
}

test('theme switching tolerates storage denial and persists valid choices', () => {
  const denied = {getItem: () => { throw new Error('Storage denied'); }, setItem: () => { throw new Error('Storage denied'); }};
  assert.equal(readThemePreference(denied), undefined);
  assert.doesNotThrow(() => storeThemePreference(denied, 'dark'));
  const root = {dataset: {} as Record<string, string>};
  runInNewContext(bootstrap, {
    localStorage: denied,
    window: {matchMedia: () => ({matches: true})},
    document: {documentElement: root, querySelector: () => ({setAttribute() {}})},
  });
  assert.equal(root.dataset.theme, 'dark');
  const saved = new Map<string, string>();
  const storage = {getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); }};
  storeThemePreference(storage, 'dark');
  assert.equal(saved.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(readThemePreference(storage), 'dark');
  storeThemePreference(storage, 'light');
  assert.equal(readThemePreference(storage), 'light');
  saved.set(THEME_STORAGE_KEY, 'unsupported');
  assert.equal(readThemePreference(storage), undefined);
});

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
for (const [index, block] of [...css.matchAll(/:root(?:\[data-theme='dark'\])?\s*\{([^}]+)\}/g)].entries()) {
  test(`${index ? 'dark' : 'light'} palette maintains readable text and status contrast`, () => {
    const colors = Object.fromEntries([...block[1].matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map(match => [match[1], match[2]]));
    const check = (ink: string, background: string, minimum = 4.5) => {
      const a = luminance(colors[ink]), b = luminance(colors[background]);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      assert.ok(ratio >= minimum, `${ink} on ${background}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
    };
    for (const ink of ['text', 'text-strong', 'text-secondary', 'text-muted']) {
      for (const surface of ['surface', 'surface-subtle', 'surface-muted', 'surface-hover']) check(ink, surface);
    }
    for (const state of ['accent', 'success', 'warning', 'danger']) check(state === 'accent' ? 'accent-text' : state, `${state}-soft`);
    check('on-accent', 'accent');
    // Small secondary labels and the theme/control outlines must stay distinct.
    check('text-muted', 'surface', 7);
    for (const surface of ['surface', 'surface-subtle', 'surface-muted', 'surface-hover']) {
      check('border-strong', surface, 3);
      check('focus', surface, 3);
    }
    check('accent-border', 'accent-soft', 3);
    check('diagram-muted', 'diagram-fill');
    for (const syntax of ['comment', 'operator', 'number', 'keyword', 'string']) check(`syntax-${syntax}`, 'surface');
  });
}

test('the live diagram adapts to interface colors while exports stay self-contained', async () => {
  const evidence = JSON.parse(readFileSync(new URL('./fixtures/analysis.json', import.meta.url), 'utf8'));
  const scene = await layoutModel(normalizeModel(evidence.core['03-mediation'].model));
  const live = sceneBody(scene, defaultDisplay, [], true);
  assert.match(live, /var\(--diagram-ink\)/);
  assert.match(live, /var\(--diagram-fill\)/);
  for (const theme of ['journal', 'presentation'] as const) {
    const exported = renderSvg(scene, {...defaultDisplay, theme});
    assert.doesNotMatch(exported, /var\(--/);
    assert.match(exported, /fill="white"/);
    assert.match(exported, theme === 'journal' ? /#222a30/ : /#17635d/);
  }
});
