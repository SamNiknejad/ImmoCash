import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const cwd=new URL('../',import.meta.url).pathname;
function config(base){
 const script='import("./next.config.mjs").then(x=>console.log(JSON.stringify(x.default)))';
 const proc=spawnSync(process.execPath,['-e',script],{cwd,env:{...process.env,NEXT_PUBLIC_BASE_PATH:base},encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);return JSON.parse(proc.stdout);
}
test('Export mode with GitHub Pages project basePath',()=>{
 const actual=config('/mein-repo/');
 assert.equal(actual.output,'export');assert.equal(actual.basePath,'/mein-repo');
 assert.equal(actual.trailingSlash,true);assert.equal(actual.images.unoptimized,true);
});
test('GitHub Pages user domain uses empty basePath',()=>{
 assert.equal(config('').basePath,'');
});
test('Pages workflow uploads out/ and deploys on main',()=>{
 const yml=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert.match(yml,/branches: \[main\]/);assert.match(yml,/run: npm run build/);
 assert.match(yml,/path: out/);assert.match(yml,/upload-pages-artifact@v3/);
 assert.match(yml,/deploy-pages@v4/);assert.match(yml,/touch out\/\.nojekyll/);
});
