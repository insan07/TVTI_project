const assert = require('node:assert/strict');
const { before, test } = require('node:test');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const esbuild = require('esbuild');
let Card, Overview, Picker, StudentScreen, InstructorScreen, AdminScreen;

before(async () => {
  const result = await esbuild.build({
    stdin: { contents: `export { default as Card } from './src/components/schedule/ScheduleSlotCard';
      export { default as Overview } from './src/components/schedule/ScheduleOverview';
      export { default as Picker } from './src/components/schedule/ScheduleCoursePicker';
      export { default as StudentScreen } from './src/screens/Student/StudentScheduleScreen';
      export { default as InstructorScreen } from './src/screens/Instructor/PracticeSessionsScreen';
      export { default as AdminScreen } from './src/screens/Admin/AdminSlotManagementScreen';`, resolveDir: path.join(__dirname, '..'), loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', write: false, packages: 'external',
    alias: { 'react-native': 'react-native-web' },
    plugins: [{ name: 'schedule-test-platform', setup(build) {
      build.onResolve({ filter: /ThemeContext$/ }, () => ({ path: 'theme', namespace: 'test-platform' }));
      build.onResolve({ filter: /^@expo\/vector-icons$/ }, () => ({ path: 'icons', namespace: 'test-platform' }));
      build.onResolve({ filter: /WhatsAppOptionsMenu$/ }, () => ({ path: 'menu', namespace: 'test-platform' }));
      build.onResolve({ filter: /(?:^|\/)api$/ }, () => ({ path: 'api', namespace: 'test-platform' }));
      build.onResolve({ filter: /^@react-navigation\/native$/ }, () => ({ path: 'navigation', namespace: 'test-platform' }));
      build.onResolve({ filter: /^react-native-safe-area-context$/ }, () => ({ path: 'safe-area', namespace: 'test-platform' }));
      build.onResolve({ filter: /ScreenBackground$/ }, () => ({ path: 'background', namespace: 'test-platform' }));
      build.onResolve({ filter: /ScreenHeader$/ }, () => ({ path: 'header', namespace: 'test-platform' }));
      build.onLoad({ filter: /.*/, namespace: 'test-platform' }, ({ path: name }) => ({ loader: 'jsx', resolveDir: path.join(__dirname, '..'), contents:
        name === 'theme' ? 'export const useTheme = () => ({isDark: !!globalThis.scheduleTestDark});'
          : name === 'api' ? 'export default {get:async()=>({data:[]}),post:async()=>({data:{}}),delete:async()=>({data:{}}),patch:async()=>({data:{}})};'
          : name === 'navigation' ? 'export const useFocusEffect = () => {}; export const useNavigation = () => ({navigate(){},goBack(){},canGoBack:()=>true});'
          : name === 'safe-area' ? 'export const useSafeAreaInsets = () => ({top:0,bottom:0,left:0,right:0});'
          : name === 'background' ? 'export default function Background(){return null;}'
          : name === 'header' ? `import React from 'react'; export default function Header({title,rightElement}){return <header>{title}{rightElement}</header>}`
          : name === 'icons' ? `import React from 'react'; export const Ionicons = ({name}) => <span data-icon={name} />;`
          : `import React from 'react'; export default function Menu({options}) {return <button aria-label="Manage slot">{options.map(option => option.label).join(', ')}</button>}`,
      }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  ({ Card, Overview, Picker, StudentScreen, InstructorScreen, AdminScreen } = module.exports);
});

const batches = [
  { _id: 'electrical', name: 'E-01', course_id: { title: 'Electrical Installation' }, schedule_json: { days: ['Mon'], time: '09:00' } },
  { _id: 'cooling', name: 'R-02', course_id: { title: 'Refrigeration' }, schedule_json: { days: ['Tue'], time: '10:00' } },
];
const slot = { _id: 'slot', batch_id: batches[0], instructor_id: { name: 'Instructor One' }, week_start_date: '2030-11-04T00:00:00Z',
  day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', max_students: 10, booked_count: 3, seats_taken: 3, seats_available: 7, is_open: true };
const render = (Component, props, children) => renderToStaticMarkup(React.createElement(Component, props, children));

test('expired overrides booked/open status in the same shared card for every role and theme', () => {
  for (const dark of [false, true]) for (const student of [false, true]) {
    globalThis.scheduleTestDark = dark;
    const html = render(Card, { slot: { ...slot, already_booked: true }, student, now: Date.parse('2031-01-01') });
    assert.match(html, /EXPIRED/); assert.doesNotMatch(html, />BOOKED<|>OPEN<|>LOCKED</);
    assert.match(html, /Electrical Installation/); assert.match(html, /Batch: E-01/);
    assert.doesNotMatch(html, /PRACTICAL SLOT|THEORY CLASS/);
  }
  globalThis.scheduleTestDark = false;
});

test('students see available seats and staff management controls stay hidden', () => {
  const html = render(Card, { slot, student: true, now: 0, menuOptions: [{ id: 'edit', label: 'Edit slot', onPress() {} }] });
  assert.match(html, /7 \/ 10 left/); assert.doesNotMatch(html, /Manage slot|Edit slot/);
});

test('staff cards show occupancy and keep their existing management menu and students action', () => {
  const html = render(Card, { slot, now: 0, menuOptions: [{ id: 'edit', label: 'Edit slot', onPress() {} }] }, React.createElement('button', {}, 'View students'));
  assert.match(html, /3 \/ 10 booked/); assert.match(html, /Manage slot/); assert.match(html, /View students/); assert.match(html, />OPEN</);
});

test('course picker preserves All courses and selected course labels across roles', () => {
  assert.match(render(Picker, { batches, selectedBatchId: null, onSelect() {} }), /Select course: All courses/);
  assert.match(render(Picker, { batches, selectedBatchId: 'cooling', onSelect() {} }), /Select course: Refrigeration/);
});

test('shared overview filters regular classes by the chosen course and keeps role-specific actions', () => {
  const base = { batches, selectedBatchId: 'cooling', onBatchSelect() {}, slots: [], renderSlot() {} };
  const student = render(Overview, base);
  assert.match(student, /Regular Classes/); assert.match(student, /Practice Sessions &amp; Lab Slots/);
  assert.match(student, /Batch: R-02/); assert.doesNotMatch(student, /Batch: E-01|Create slot|>Views</);
  const staff = render(Overview, { ...base, onCreate() {}, onViewChange() {}, onFilter() {} });
  assert.match(staff, /Create slot/); assert.match(staff, />Views</); assert.match(staff, />Filters</);
});

test('loading failures show retry text instead of a misleading empty schedule', () => {
  const html = render(Overview, { batches, selectedBatchId: null, onBatchSelect() {}, slots: [], renderSlot() {}, error: 'Connection failed', onRetry() {} });
  assert.match(html, /Connection failed/); assert.match(html, /Try again/); assert.doesNotMatch(html, /No practice sessions available/);
});

test('every role keeps the same Views control available in List, Month, Week, and Day', () => {
  const useState = React.useState;
  try {
    for (const mode of ['List', 'Month', 'Week', 'Day']) {
      React.useState = initial => {
        const [value, setter] = useState(initial);
        return [initial === 'List' ? mode : value, setter];
      };
      for (const Screen of [StudentScreen, InstructorScreen, AdminScreen]) {
        const html = render(Screen, {});
        assert.match(html, new RegExp(`Change schedule view, current ${mode}`));
        if (Screen !== StudentScreen) assert.match(html, /Create slot/);
        else assert.doesNotMatch(html, /Create slot/);
        if (mode !== 'List') {
          assert.match(html, new RegExp(`Previous ${mode.toLowerCase()}`));
          assert.match(html, new RegExp(`Next ${mode.toLowerCase()}`));
        }
      }
    }
  } finally { React.useState = useState; }
});

test('every date view renders period-filtered sessions with the common course and card layout', () => {
  const selected = new Date(2030, 10, 4);
  const slots = [slot, { ...slot, _id: 'other-day', day_of_week: 'Tuesday' }];
  for (const mode of ['Month', 'Week', 'Day']) {
    const html = render(Overview, { batches, selectedBatchId: null, onBatchSelect() {}, slots, viewMode: mode,
      selectedDate: selected, onDateChange() {}, onViewChange() {}, renderSlot: item => React.createElement(Card, { key: item._id, slot: item, now: 0 }) });
    assert.match(html, /Select course: All courses/);
    assert.match(html, /Regular Classes/); assert.match(html, /Practice Sessions &amp; Lab Slots/);
    assert.match(html, mode === 'Day' ? /1 session</ : /2 sessions</);
  }
});
