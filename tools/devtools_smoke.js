// Run against an already authorized, logged-in WeChat DevTools session.
// Real element interactions; the app's local records are restored in finally.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'qa/devtools');
const installation = process.env.WECHAT_DEVTOOLS_HOME || 'D:/傩戏/微信web开发者工具';
const executable = path.join(installation, '微信开发者工具.exe');
const entry = path.join(installation, 'resources/app.asar.unpacked/js/common/cli/skill-index.js');
const bootstrap = 'const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,"--electron"].concat(a);require(e)';
const results = [];
fs.mkdirSync(output, { recursive: true });

function call(tool, flags = {}, withProject = true) {
  const args = ['-c', 'Codex', tool];
  if (withProject) args.push('--project', root);
  for (const [key, value] of Object.entries(flags)) {
    if (['args', 'detail', 'result'].includes(key)) {
      const file = path.join(output, 'tool-' + key + '.json');
      fs.writeFileSync(file, JSON.stringify(value));
      args.push('--' + key + '-file', file);
    } else args.push('--' + key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  let raw;
  try { raw = execFileSync(executable, ['-e', bootstrap, entry, ...args], {
    cwd: installation, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 45000,
    windowsHide: true, maxBuffer: 4 * 1024 * 1024
  }); } catch (error) { throw Error(tool + ': ' + (error.stdout || error.message)); }
  const jsonStart = raw.indexOf('{');
  const response = JSON.parse(raw.slice(jsonStart));
  if (!response.ok || response.result?.success === false || response.result?.status === 'pending') throw Error(tool + ': ' + JSON.stringify(response));
  return response.result;
}
const data = field => call('automation_page_action', { action: 'getData', 'data-path': field }).data;
const tap = selector => call('automation_element_action', { action: 'tap', selector, 'wait-for-selector': selector });
const input = (selector, value) => call('automation_element_action', { action: 'input', selector, value, 'wait-for-selector': selector });
const shot = (name, selector) => call('simulator_screenshot', { path: path.join(output, name + '.jpg'), 'wait-for-selector': selector });
const pass = name => { results.push({ name, status: 'pass' }); console.log('PASS', name); };
let backup;
let backedUp = false;
try {
  backup = data('favoriteIds'); // Confirm runtime before backing up persisted records.
  const snapshot = call('automation_wx_api', { action: 'call', method: 'getStorageSync', args: ['nuoyi_experience_v2'] });
  fs.writeFileSync(path.join(output, 'storage-backup.json'), JSON.stringify(snapshot, null, 2));
  backup = snapshot.result;
  if (backup === undefined) throw Error('Unrecognized wx storage result: ' + JSON.stringify(snapshot));
  backedUp = true;
  tap('.tab[data-index="0"]'); assert.equal(data('current'), 0); shot('simulator-home', '.hero-swiper');
  input('.search-bar input', '灯'); tap('.search-bar button'); assert.equal(data('searchProducts').length, 2);
  tap('.clear');
  tap('.quick-card[data-target="1"]'); assert.equal(data('current'), 1); shot('simulator-discover', '.article-card');
  tap('.article-card[data-id="first-meeting"]'); assert.equal(data('detail'), 'article');
  const originalCount = data('favoriteCount'); const wasFavorite = data('selectedArticle').favorite;
  tap('.favorite'); assert.equal(data('favoriteCount'), originalCount + (wasFavorite ? -1 : 1));
  shot('simulator-article', '.detail-section'); tap('.detail-top text');
  assert.equal(data('detail'), ''); pass('首页搜索、发现跳转、文章阅读与收藏');

  tap('.tab[data-index="2"]'); assert.equal(data('current'), 2);
  input('.shop-search input', '灯'); assert.equal(data('visibleProducts').length, 2); tap('.clear');
  tap('.shop-chips .chip[data-value="数字交互"]'); assert.equal(data('visibleProducts').length, 2);
  tap('.shop-chips .chip[data-value="全部"]'); shot('simulator-shop', '.product-card');
  tap('.product-card[data-id="zhu-rong"]'); assert.equal(data('detail'), 'product');
  const oldCount = data('cartCount'); tap('.quantity-button[data-delta="1"]');
  assert.equal(data('quantity'), 2); tap('.product-detail > .primary-button');
  assert.equal(data('cartCount'), oldCount + 2); shot('simulator-product', '.product-detail');
  tap('.cart-link'); assert.equal(data('detail'), 'cart'); shot('simulator-cart', '.cart-page');
  pass('商铺关键词与分类联动、规格数量、添加选购清单');

  tap('.tab[data-index="3"]'); assert.equal(data('current'), 3); shot('simulator-community', '.post-card');
  tap('.topic-bar > button'); input('.compose textarea', '自动化验收：傩面纹样观察，测试后恢复。');
  tap('.compose-actions .primary-button');
  const newPost = data('posts')[0]; assert.match(newPost.title, /自动化验收/);
  input('.comment-input input[data-id="' + newPost.id + '"]', '自动化评论测试');
  tap('.comment-input button[data-id="' + newPost.id + '"]');
  assert.equal(data('posts')[0].commentList.at(-1).text, '自动化评论测试');
  tap('.post-actions text[data-id="' + newPost.id + '"]'); assert.equal(data('posts')[0].liked, true);
  pass('社区文字发布、评论、喜欢及首页同步');

  tap('.tab[data-index="4"]'); assert.equal(data('current'), 4); shot('simulator-profile', '.profile-menu');
  tap('.profile-menu-row[data-panel="favorites"]'); assert.equal(data('profilePanel'), 'favorites');
  if (!data('cloudReady') && !data('isLoggedIn')) {
    tap('.wechat-button');
    assert.match(data('authMessage'), /尚未配置/);
    pass('未配置云环境时显示提示，不伪造登录成功');
  }
  call('simulator_refresh');
  call('simulator_screenshot', { path: path.join(output, 'simulator-recompiled.jpg'), 'wait-for-selector': '.hero-swiper', wait: 3 });
  const reloadedPosts = data('posts');
  assert.equal(reloadedPosts[0].id, newPost.id);
  assert.equal(reloadedPosts[0].commentList.at(-1).text, '自动化评论测试');
  pass('真实模拟器重新编译后社区数据恢复');
  const consoleOutput = call('get_simulator_console', { command: 'grep -n .' });
  fs.writeFileSync(path.join(output, 'console.txt'), typeof consoleOutput === 'string' ? consoleOutput : JSON.stringify(consoleOutput, null, 2));
  if (/TypeError|ReferenceError|SyntaxError|\[error\]/i.test(JSON.stringify(consoleOutput))) throw Error('Runtime console contains errors; inspect tools/qa/devtools/console.txt');
  pass('模拟器控制台未出现运行异常');
} catch (error) {
  results.push({ name: '流程执行', status: 'failed', error: error.message });
  console.error(error.message); process.exitCode = 1;
} finally {
  if (backedUp) {
    call('automation_wx_api', { action: 'call', method: backup === '' ? 'removeStorageSync' : 'setStorageSync', args: backup === '' ? ['nuoyi_experience_v2'] : ['nuoyi_experience_v2', backup] });
    call('simulator_refresh');
    shot('simulator-final', '.hero-swiper');
    pass('测试数据已恢复，模拟器停留首页');
  }
  fs.writeFileSync(path.join(output, 'smoke-report.json'), JSON.stringify({ checkedAt: '2026-10-05', results }, null, 2));
}
