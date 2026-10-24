const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalog = require('../miniprogram/data/catalog');
const copy = value => JSON.parse(JSON.stringify(value));
const event = (dataset, value) => ({ currentTarget: { dataset }, detail: value === undefined ? {} : { value } });

function createPage(storage = {}, cloud = null, cloudReady = !!cloud) {
  let definition;
  const effects = { toasts: [], removed: [], previews: [] };
  const wx = {
    getStorageSync: key => storage[key] ? copy(storage[key]) : '',
    setStorageSync: (key, value) => { storage[key] = copy(value); },
    removeStorageSync: key => { delete storage[key]; },
    showToast: options => effects.toasts.push(options.title),
    showModal: options => options.success({ confirm: true }),
    pageScrollTo() {}, setNavigationBarTitle() {},
    saveFile: options => options.success({ savedFilePath: 'saved/' + options.tempFilePath }),
    removeSavedFile: options => effects.removed.push(options.filePath),
    previewImage: options => effects.previews.push(options),
    cloud
  };
  const cloudApi = {
    listPosts: async () => ({ success: true, data: { posts: [] } }),
    listCart: async () => ({ success: true, data: { items: [] } }),
    listIntents: async () => ({ success: true, data: { intentions: [] } })
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.js'), 'utf8'), {
    require: request => request === '../../data/catalog' ? catalog : cloudApi,
    Page: p => { definition = p; }, wx,
    getApp: () => ({ globalData: { cloudReady } }), console
  });
  const page = Object.assign({}, definition, {
    data: copy(definition.data),
    setData(patch) {
      for (const [key, value] of Object.entries(patch)) {
        const parts = key.split('.'); let target = this.data;
        while (parts.length > 1) target = target[parts.shift()];
        target[parts[0]] = value;
      }
    }
  });
  page.onLoad({});
  return { page, storage, effects, wx };
}

function compiler() {
  const errors = [];
  const context = { window: { __webview_engine_version__: 0.02 }, console: { log: e => errors.push(String(e)), warn: e => errors.push(String(e)) } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'qa/compiled-wxml.js'), 'utf8'), context);
  const render = context.$gwx('pages/index/index.wxml');
  assert.equal(typeof render, 'function');
  return { render, errors };
}

function testBackendMode() {
  const config = require('../miniprogram/config');
  assert.equal(config.backendMode, 'cloud');
  assert.equal(config.cloudEnv, 'cloud1-d0godfo32fe9db7aa');

  function launch(mode) {
    let definition;
    const calls = [];
    const wx = { cloud: { init: options => calls.push(options) } };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/app.js'), 'utf8'), {
      require: () => ({ backendMode: mode, cloudEnv: 'test-env' }),
      App: value => { definition = value; },
      wx,
      console
    });
    const app = { globalData: {} };
    definition.onLaunch.call(app);
    return { app, calls };
  }

  const local = launch('local');
  assert.equal(local.app.globalData.cloudReady, false);
  assert.equal(local.app.globalData.backendMode, 'local');
  assert.equal(local.calls.length, 0);
  const cloud = launch('cloud');
  assert.equal(cloud.app.globalData.cloudReady, true);
  assert.equal(cloud.app.globalData.env, 'test-env');
  assert.equal(cloud.calls.length, 1);
  console.log('PASS explicit local/cloud backend selection');
}

async function testCloud() {
  const handle = require('../cloudfunctions/quickstartFunctions/user-profile');
  const rows = []; let identity = 'wechat-A';
  const users = {
    where(query) { return { limit: () => ({ get: async () => ({ data: rows.filter(row => row.openid === query.openid).map(copy) }) }) }; },
    async add({ data }) { if (rows.some(row => row._id === data._id)) throw Error('duplicate'); rows.push(copy(data)); },
    doc(id) { return { update: async ({ data }) => { Object.assign(rows.find(row => row._id === id), data); } }; }
  };
  const cloud = { getWXContext: () => ({ OPENID: identity }), database: () => ({ collection: () => users, createCollection: async () => {}, serverDate: () => 'server-time' }) };
  const [first, second] = await Promise.all([handle(cloud, { action: 'wechatLogin' }), handle(cloud, { action: 'wechatLogin' })]);
  assert.ok(first.success && second.success); assert.equal(rows.length, 1); assert.equal(first.user._id, second.user._id);
  const originalId = first.user._id;
  assert.equal(first.user.openid, undefined); assert.equal(first.user.passwordHash, undefined);
  let result = await handle(cloud, { action: 'updateProfile', nickName: '  傩艺小禾  ', avatarUrl: 'cloud://env.bucket/avatars/' + originalId + '/avatar.png' });
  assert.equal(result.user.nickName, '傩艺小禾');
  assert.equal((await handle(cloud, { action: 'updateProfile', nickName: '' })).code, 'INVALID_NICKNAME');
  assert.equal((await handle(cloud, { action: 'updateProfile', nickName: '甲', avatarUrl: 'https://example.org/a.png' })).code, 'INVALID_AVATAR');
  assert.equal((await handle(cloud, { action: 'updateProfile', nickName: '甲', avatarUrl: 'cloud://env.bucket/avatars/other/avatar.png' })).code, 'INVALID_AVATAR');
  identity = 'wechat-B';
  assert.equal((await handle(cloud, { action: 'updateProfile', _id: originalId, nickName: '攻击者' })).code, 'NOT_REGISTERED');
  await handle(cloud, { action: 'wechatLogin' });
  await handle(cloud, { action: 'updateProfile', _id: originalId, openid: 'wechat-A', nickName: '第二位傩友', avatarUrl: '' });
  assert.equal(rows[0].nickName, '傩艺小禾'); assert.equal(rows[1].nickName, '第二位傩友');
  identity = '';
  assert.equal((await handle(cloud, { action: 'wechatLogin' })).code, 'NO_IDENTITY');
  console.log('PASS cloud identity isolation, first-login concurrency, profile validation');
}

async function main() {
  testBackendMode();
  const { page, storage, effects } = createPage();
  assert.equal(page.data.visibleProducts.length, 11);
  page.openArticle(event({ id: 'first-meeting' })); assert.equal(page.data.current, 1); assert.equal(page.data.detail, 'article');
  page.toggleFavorite(); page.closeDetail(); assert.equal(page.data.current, 0);
  assert.equal(createPage(storage).page.data.favoriteCount, 1);
  page.onSearchInput(event({}, '灯')); page.search(); assert.equal(page.data.searchProducts.length, 2);
  page.clearSearch(); page.showProduct(event({ id: 'zhu-rong' })); assert.equal(page.data.current, 2);
  page.changeQuantity(event({ delta: -1 })); assert.equal(page.data.quantity, 1);
  page.changeQuantity(event({ delta: 1 })); page.addToCart(); assert.equal(page.data.cartTotal, '78.00');
  page.selectSpec(event({ value: '礼赠意向' })); page.addToCart(); assert.equal(page.data.cart.length, 2);
  page.showProduct(event({ id: 'study' })); page.addToCart(); assert.equal(page.data.inquiryCount, 1);
  assert.equal(createPage(storage).page.data.cartCount, 5);
  page.saveIntention(); assert.equal(page.data.cartCount, 0); assert.equal(page.data.intentions.length, 1);
  page.navigate(2); page.selectCategory(event({ value: '数字交互' })); assert.equal(page.data.visibleProducts.length, 2);
  page.onSearchInput(event({}, '不匹配')); assert.equal(page.data.visibleProducts.length, 0);
  page.navigate(3); page.setData({ composeText: '我的第一张面具', composeImages: ['photo.jpg'] }); page.publishPost();
  assert.equal(page.data.myPostCount, 1); assert.equal(page.data.homePosts[0].title, '我的第一张面具');
  const postId = page.data.posts[0].id;
  page.onCommentInput(event({ id: postId }, '很喜欢这个纹样')); page.addComment(event({ id: postId }));
  page.toggleLike(event({ id: postId })); page.previewImage(event({ post: postId, src: 'saved/photo.jpg' }));
  assert.equal(effects.previews[0].urls[0], 'saved/photo.jpg');
  let restored = createPage(storage).page;
  assert.equal(restored.data.posts[0].commentList.length, 1); assert.equal(restored.data.posts[0].liked, true);
  page.deletePost(event({ id: postId })); assert.equal(page.data.myPostCount, 0); assert.equal(effects.removed[0], 'saved/photo.jpg');
  await page.callUserAuth('wechatLogin').then(() => assert.fail('unconfigured cloud must reject'), error => assert.match(error.message, /尚未配置/));
  console.log('PASS navigation, search, filters, favorites, cart, intentions, post persistence, image preview');

  const localProfile = createPage();
  await localProfile.page.wechatLogin();
  assert.equal(localProfile.page.data.isLoggedIn, true);
  assert.equal(localProfile.page.data.user.account, '本机体验资料');
  localProfile.page.onChooseAvatar({ detail: { avatarUrl: '/tmp/local-avatar.png' } });
  await localProfile.page.saveProfile({ detail: { value: { nickname: '本机傩友' } } });
  assert.equal(localProfile.page.data.user.nickName, '本机傩友');
  assert.equal(localProfile.page.data.user.avatarUrl, 'saved//tmp/local-avatar.png');
  const restoredProfile = createPage(localProfile.storage).page;
  assert.equal(restoredProfile.data.user.nickName, '本机傩友');
  assert.equal(restoredProfile.data.avatarDisplay, 'saved//tmp/local-avatar.png');
  restoredProfile.logout();
  assert.equal(localProfile.storage.nuoyi_profile_local_v1, undefined);
  assert.equal(restoredProfile.data.isLoggedIn, false);
  console.log('PASS local profile creation, avatar persistence, restoration, and logout');

  const failing = createPage();
  failing.page.showProduct(event({ id: 'zhu-rong' })); failing.page.addToCart();
  failing.wx.setStorageSync = () => { throw Error('quota'); };
  failing.page.saveIntention(); assert.equal(failing.page.data.cartCount, 1); assert.equal(failing.page.data.intentions.length, 0);
  failing.page.setData({ composeText: '保存失败后保留草稿', composeImages: ['draft.jpg'] }); failing.page.publishPost();
  assert.equal(failing.page.data.myPostCount, 0); assert.equal(failing.page.data.composeText, '保存失败后保留草稿'); assert.equal(failing.effects.removed[0], 'saved/draft.jpg');
  const calls = []; let rejectSave = false;
  const cloudApi = {
    callFunction: async ({ data }) => { calls.push(data); return { result: rejectSave && data.action === 'updateProfile' ? { success: false, message: '保存失败' } : { success: true, user: { _id: 'wx_a', nickName: data.nickName || '傩友', avatarUrl: data.avatarUrl || '' } } }; },
    uploadFile: async ({ cloudPath }) => ({ fileID: 'cloud://env.bucket/' + cloudPath }),
    deleteFile: async ({ fileList }) => { calls.push({ deleted: fileList }); }
  };
  const online = createPage({}, cloudApi, true);
  await online.page.wechatLogin(); assert.equal(online.page.data.isLoggedIn, true);
  online.page.onChooseAvatar({ detail: { avatarUrl: '/tmp/avatar.png' } });
  await online.page.saveProfile({ detail: { value: { nickname: '新傩友' } } });
  assert.equal(online.page.data.user.nickName, '新傩友'); assert.match(online.page.data.user.avatarUrl, /avatars\/wx_a\//);
  await online.page.saveProfile({ detail: { value: { nickname: '' } } });
  assert.equal(online.effects.toasts.at(-1), '昵称需要1至20个字符');
  rejectSave = true; online.page.onChooseAvatar({ detail: { avatarUrl: '/tmp/next.png' } });
  await online.page.saveProfile({ detail: { value: { nickname: '失败昵称' } } });
  assert.equal(online.page.data.user.nickName, '新傩友'); assert.ok(calls.some(call => call.deleted));
  online.page.logout(); assert.equal(online.page.data.isLoggedIn, false);
  console.log('PASS storage failure rollback, avatar upload/save/retry, empty nickname validation, logout');

  for (const list of [catalog.products, catalog.articles]) for (const item of list) assert.ok(fs.existsSync(path.join(root, 'miniprogram', item.image)), item.image);
  const wxml = fs.readFileSync(path.join(root, 'miniprogram/pages/index/index.wxml'), 'utf8');
  for (const match of wxml.matchAll(/(?:bind|catch)[a-z:]+="([a-zA-Z]\w*)"/g)) assert.equal(typeof page[match[1]], 'function', match[1]);
  const { render, errors } = compiler();
  for (let current = 0; current < 5; current++) { page.navigate(current); const tree = render(page.data); assert.ok(tree && tree.children.length); }
  page.openArticle(event({ id: 'first-meeting' })); assert.ok(JSON.stringify(render(page.data)).includes('先看一张面具'));
  page.showProduct(event({ id: 'study' })); assert.ok(JSON.stringify(render(page.data)).includes('加入选购清单'));
  page.openCart(); assert.ok(render(page.data));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS compiled WXML rendering for all tabs and details, event bindings, asset references');
  await testCloud();
}

module.exports = { createPage, compiler, root, event };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
