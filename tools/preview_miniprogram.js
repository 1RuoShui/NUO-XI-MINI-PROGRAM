// Visual QA only: render the official WXML compiler tree with browser CSS.
// Native WeChat controls are approximated; this does not replace device testing.
const fs = require('node:fs');
const path = require('node:path');
const { createPage, compiler, root, event } = require('./test_miniprogram');
const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(path.join(runtime, 'playwright'));
const escape = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const compiled = compiler();

function html(node) {
  if (node == null) return '';
  if (typeof node !== 'object') return escape(node);
  const children = (node.children || []).map(html).join('');
  if (node.tag === 'virtual' || node.tag === 'wx-block') return children;
  const attrs = node.attr || {};
  let tag = node.tag || 'div';
  let extra = '';
  if (tag === 'wx-image') {
    let src = attrs.src;
    if (!src || !src.startsWith('/images/')) return '';
    const file = path.join(root, 'miniprogram', src);
    src = 'data:image/' + (src.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(file).toString('base64');
    return '<img class="' + escape(attrs.class || '') + '" src="' + src + '" style="object-fit:' + (attrs.mode === 'aspectFit' ? 'contain' : 'cover') + '">';
  }
  if (tag === 'wx-input') return '<input class="' + escape(attrs.class || '') + '" placeholder="' + escape(attrs.placeholder || '') + '" value="' + escape(attrs.value || '') + '">';
  if (tag === 'wx-textarea') tag = 'textarea';
  if (tag === 'wx-button') tag = 'button';
  if (attrs.style) extra += ' style="' + escape(attrs.style) + '"';
  return '<' + tag + ' class="' + escape(attrs.class || '') + '"' + extra + '>' + children + '</' + tag + '>';
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1243/chrome-win64/chrome.exe') });
  const checks = [];
  const { page: mini } = createPage();
  const states = [];
  for (let i = 0; i < 5; i++) { mini.navigate(i); states.push({ name: ['home', 'discover', 'shop', 'community', 'profile'][i], data: JSON.parse(JSON.stringify(mini.data)) }); }
  mini.navigate(0); mini.openArticle(event({ id: 'first-meeting' })); states.push({ name: 'article', data: JSON.parse(JSON.stringify(mini.data)) });
  mini.showProduct(event({ id: 'zhu-rong' })); states.push({ name: 'product', data: JSON.parse(JSON.stringify(mini.data)) });
  mini.addToCart(); mini.openCart(); states.push({ name: 'cart', data: JSON.parse(JSON.stringify(mini.data)) });
  mini.navigate(4); mini.enterUser({ _id: 'test', nickName: '傩友小禾', avatarUrl: '' }); mini.editProfile(); states.push({ name: 'profile-edit', data: JSON.parse(JSON.stringify(mini.data)) });
  let css = fs.readFileSync(path.join(__dirname, 'qa/compiled-app-wxss.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'qa/compiled-wxss.js'), 'utf8');
  css = css.replace(/%%HERESUFFIX%%/g, '').replace(/wx-image/g, 'img').replace(/wx-input/g, 'input').replace(/wx-textarea/g, 'textarea').replace(/wx-button/g, 'button').replace(/%%\?([\d.]+)rpx\?%%/g, '$1rpx');
  for (const width of [375, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 1 });
    const sized = css.replace(/([\d.]+)rpx/g, (_, n) => (Number(n) * width / 750) + 'px');
    for (const state of states) {
      const body = html(compiled.render(state.data));
      await page.setContent('<!DOCTYPE html><meta charset="utf-8"><style>body{margin:0}wx-view,wx-page,wx-swiper,wx-swiper-item,wx-scroll-view,wx-form{display:block}wx-text{display:inline}wx-swiper{display:block;position:relative}wx-swiper-item{height:100%}wx-swiper-item:not(:first-child){display:none}wx-scroll-view{overflow:auto}button,input,textarea{font:inherit;border:0}button{cursor:pointer}input{outline:none;background:transparent}textarea{resize:none}img{object-fit:cover}' + sized + '</style>' + body);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      checks.push({ state: state.name, width, overflow });
      await page.screenshot({ path: path.join(__dirname, 'qa', state.name + '-' + width + '.png'), fullPage: true });
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'qa/visual-checks.json'), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks));
  if (checks.some(c => c.overflow)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
