/**
 * 100ペルソナ・ベンチマークを実行する（クロスプラットフォームな env 設定ラッパ）。
 * RUN_BENCHMARK=1 を立てて vitest を起動する。npm からは `npm run benchmark`。
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync(
  'npx',
  ['vitest', 'run', 'lib/domain/quality/benchmark/benchmark.test.ts'],
  { stdio: 'inherit', shell: true, env: { ...process.env, RUN_BENCHMARK: '1' } }
);
process.exit(r.status ?? 0);
