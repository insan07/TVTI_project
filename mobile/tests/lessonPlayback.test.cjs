const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(name, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/utils/', name + '.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function('exports', 'require', js)(exports, name => mocks[name]);
  return exports;
}
const playback = load('lessonPlayback');

test('YouTube speed options use provider-supported values, sorted without duplicates', () => {
  assert.deepEqual(playback.availablePlaybackSpeeds([2, 0.5, 1, 1.5, 2, NaN, -1, '2']), [0.5, 1, 1.5, 2]);
  assert.deepEqual(playback.availablePlaybackSpeeds(undefined), [1]);
});

test('recognizes actual YouTube links and rejects lookalike hosts and invalid IDs', () => {
  for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']) {
    assert.equal(playback.youtubeVideoId(url), 'dQw4w9WgXcQ');
  }
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtu.be/bad', '']) assert.equal(playback.youtubeVideoId(url), null);
});

test('native embedded player allows bootstrap/embed documents but blocks outbound actions', () => {
  for (const url of ['about:blank', 'https://lonelycpp.github.io/react-native-youtube-iframe/iframe.html?data=abc', 'https://www.youtube.com/embed/dQw4w9WgXcQ']) assert.equal(playback.allowLessonPlayerNavigation(url), true);
  for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube://watch?v=dQw4w9WgXcQ', 'intent://video', 'https://evil.test/embed/123', 'https://www.youtube.com/channel/test', 'https://lonelycpp.github.io/another.html']) assert.equal(playback.allowLessonPlayerNavigation(url), false);
});

test('native protection is shared, serialized and released after the last screen leaves', async () => {
  const calls = [];
  const protection = load('screenCaptureProtection', {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-screen-capture': {
      preventScreenCaptureAsync: async () => calls.push('prevent'),
      allowScreenCaptureAsync: async () => calls.push('allow'),
      enableAppSwitcherProtectionAsync: async () => calls.push('switcher-on'),
      disableAppSwitcherProtectionAsync: async () => calls.push('switcher-off'),
    },
  });
  assert.deepEqual(await Promise.all([protection.enableNativeScreenCaptureProtection(), protection.enableNativeScreenCaptureProtection()]), [true, true]);
  await protection.disableNativeScreenCaptureProtection();
  assert.deepEqual(calls, ['prevent', 'switcher-on']);
  await protection.disableNativeScreenCaptureProtection();
  assert.deepEqual(calls, ['prevent', 'switcher-on', 'allow', 'switcher-off']);
});

test('capture protection reports native failures and can retry without leaking acquisitions', async () => {
  let attempts = 0;
  const protection = load('screenCaptureProtection', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-screen-capture': {
      preventScreenCaptureAsync: async () => { if (++attempts === 1) throw Error('unavailable'); },
      allowScreenCaptureAsync: async () => {},
    },
  });
  assert.equal(await protection.enableNativeScreenCaptureProtection(), false);
  await protection.disableNativeScreenCaptureProtection();
  assert.equal(await protection.enableNativeScreenCaptureProtection(), true);
  await protection.disableNativeScreenCaptureProtection();
});

test('HTML video restrictions prevent context actions and clean up all event listeners', () => {
  const protection = load('screenCaptureProtection', { 'react-native': { Platform: { OS: 'web' } }, 'expo-screen-capture': {} });
  const handlers = new Map();
  const video = { setAttribute(name, value) { this[name] = value; }, addEventListener: (name, handler) => handlers.set(name, handler), removeEventListener: name => handlers.delete(name) };
  const cleanup = protection.hardenHtmlVideoElement(video);
  assert.match(video.controlsList, /nodownload/);
  assert.equal(video.disablePictureInPicture, true);
  assert.equal(video.disableRemotePlayback, true);
  let prevented = false;
  handlers.get('contextmenu')({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  cleanup();
  assert.equal(handlers.size, 0);
});

test('lifecycle listener pauses on background and is removed on leaving the screen', () => {
  let listener, removed = false;
  const messages = [];
  const protection = load('screenCaptureProtection', {
    'react-native': { Platform: { OS: 'android' }, AppState: { addEventListener: (_, handler) => { listener = handler; return { remove() { removed = true; } }; } } },
    'expo-screen-capture': {},
  });
  const cleanup = protection.subscribeToScreenCaptureEvents(reason => messages.push(reason));
  listener('background');
  assert.equal(messages.length, 1);
  assert.match(messages[0], /background/);
  cleanup();
  assert.equal(removed, true);
});
