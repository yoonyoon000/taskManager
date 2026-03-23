import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const distDir = resolve(rootDir, 'dist');
const distAssetsDir = resolve(distDir, 'assets');
const rootAssetsDir = resolve(rootDir, 'assets');
const dist404 = resolve(distDir, '404.html');
const root404 = resolve(rootDir, '404.html');
const rootNoJekyll = resolve(rootDir, '.nojekyll');

if (!existsSync(distAssetsDir)) {
  throw new Error('dist/assets 폴더를 찾지 못했습니다. 먼저 빌드를 완료해주세요.');
}

rmSync(rootAssetsDir, { recursive: true, force: true });
mkdirSync(rootAssetsDir, { recursive: true });
cpSync(distAssetsDir, rootAssetsDir, { recursive: true });

if (existsSync(dist404)) {
  cpSync(dist404, root404);
}

writeFileSync(rootNoJekyll, '');
