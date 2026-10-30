/**
 * 羊启发 v1 纯逻辑单测（无 Phaser）。
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHEEP = path.join(ROOT, 'src', 'rules', 'SheepV1.ts');
const sheepUrl = JSON.stringify(pathToFileURL(SHEEP).href);

const runner = [
  "import {",
  "  CRAVING_MAX, CRAVING_LOCK_SEC, CRAVING_ATTACK_RISE, CRAVING_PERFECT_FALL,",
  "  CRAVING_AFTER_LOCK, CRAVING_BOAST_RISE, CRAVING_FEED_FALL, CRAVING_EXORCISE_FALL,",
  "  cravingSlots, addCraving, tickCravingLock, cravingAfterRevive,",
  "  dialogCravingDelta, nearMissLine, shareFailText,",
  "} from " + sheepUrl + ";",
  "const out = [];",
  "const ok = (c, m) => out.push([!!c, m]);",
  "ok(CRAVING_MAX === 100 && CRAVING_LOCK_SEC === 8, 'constants max/lock');",
  "ok(cravingSlots(0) === 0, 'slots 0');",
  "ok(cravingSlots(14) === 0, 'slots 14 → 0');",
  "ok(cravingSlots(15) === 1, 'slots 15 → 1');",
  "ok(cravingSlots(99) === 6, 'slots 99 → 6');",
  "ok(cravingSlots(100) === 7, 'slots 100 → 7');",
  "let s = { craving: 0, lockLeft: 0 };",
  "let r = addCraving(s, CRAVING_ATTACK_RISE);",
  "ok(r.state.craving === 3 && !r.justLocked, 'attack +3');",
  "s = r.state;",
  "for (let i = 0; i < 32; i++) { r = addCraving(s, CRAVING_ATTACK_RISE); s = r.state; }",
  "ok(s.craving === 99, '33 attacks → 99');",
  "r = addCraving(s, CRAVING_ATTACK_RISE);",
  "ok(r.state.craving === 100 && r.justLocked && r.state.lockLeft === CRAVING_LOCK_SEC, '34th attack locks');",
  "s = r.state;",
  "r = addCraving(s, 5);",
  "ok(!r.justLocked && r.state.lockLeft === CRAVING_LOCK_SEC, 'no re-lock while locked');",
  "s = r.state;",
  "s = tickCravingLock(s, 3);",
  "ok(s.lockLeft === 5 && s.craving === 100, 'tick 3s still full');",
  "s = tickCravingLock(s, 5.1);",
  "ok(s.lockLeft === 0 && s.craving === CRAVING_AFTER_LOCK, 'lock end drops to 70');",
  "s = { craving: 40, lockLeft: 0 };",
  "r = addCraving(s, -CRAVING_PERFECT_FALL);",
  "ok(r.state.craving === 25, 'perfect −15');",
  "ok(dialogCravingDelta('boast', false) === CRAVING_BOAST_RISE, 'boast +25');",
  "ok(dialogCravingDelta('feed', false) === -CRAVING_FEED_FALL, 'feed −20');",
  "ok(dialogCravingDelta('exorcise', true) === -CRAVING_EXORCISE_FALL, 'exorcise ok −25');",
  "ok(dialogCravingDelta('exorcise', false) === 0, 'exorcise fail 0');",
  "const rev = cravingAfterRevive({ craving: 100, lockLeft: 4 });",
  "ok(rev.lockLeft === 0 && rev.craving === CRAVING_AFTER_LOCK, 'revive clears lock + drop');",
  "const tpl = { cravingLock: '锁{n}', bossHp: 'Boss{n}', winClose: '险{n}', rakeCd: '耙{n}', cravingAlmost: '差{n}', score: '分{n}' };",
  "ok(nearMissLine({ phase: 'lost', craving: 10, lockLeft: 2.2, rakeCd: 0, score: 100, bossHpRatio: null, playerHpRatio: null, templates: tpl }) === '锁3', 'nearMiss lock priority');",
  "ok(nearMissLine({ phase: 'boss', craving: 10, lockLeft: 0, rakeCd: 0, score: 100, bossHpRatio: 0.12, playerHpRatio: 0.5, templates: tpl }) === 'Boss12', 'nearMiss boss hp');",
  "ok(shareFailText(42, '差一点', '默认') === '默认｜差一点', 'shareFail with nearMiss');",
  "ok(shareFailText(42, '', '默认') === '默认｜才 42 分', 'shareFail score fallback');",
  "let failed = 0;",
  "for (const [pass, msg] of out) {",
  "  if (pass) console.log('PASS', msg);",
  "  else { console.error('FAIL', msg); failed++; }",
  "}",
  "console.log(failed === 0 ? ('OK ' + out.length + ' passed') : ('FAILED ' + failed + '/' + out.length));",
  "if (failed) process.exit(1);",
].join('\n');

const r = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', runner], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status ?? 1);
