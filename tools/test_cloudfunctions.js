'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');

function createCloud() {
  const collections = new Map();
  let nextId = 0;
  let openid = 'wechat-A';
  const table = name => {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name);
  };
  const matches = (row, filter) => Object.entries(filter || {}).every(([key, value]) => {
    if (value && value.operator === 'in') return value.values.includes(row[key]);
    return row[key] === value;
  });
  const apply = (row, values) => {
    Object.entries(values).forEach(([key, value]) => {
      row[key] = value && value.operator === 'inc' ? (Number(row[key]) || 0) + value.amount : value;
    });
  };
  function query(rows, filter) {
    let limit = Infinity;
    let sort;
    const api = {
      orderBy(key, direction) { sort = [key, direction === 'desc' ? -1 : 1]; return api; },
      limit(value) { limit = Number(value); return api; },
      where(value) { return query(rows, value); },
      async get() {
        let found = rows.filter(row => matches(row, filter));
        if (sort) found = found.slice().sort((a, b) => ((a[sort[0]] || 0) - (b[sort[0]] || 0)) * sort[1]);
        return { data: found.slice(0, limit).map(row => Object.assign({}, row)) };
      },
      async count() { return { total: rows.filter(row => matches(row, filter)).length }; },
      async remove() {
        const before = rows.length;
        for (let index = rows.length - 1; index >= 0; index--) if (matches(rows[index], filter)) rows.splice(index, 1);
        return { stats: { removed: before - rows.length } };
      },
      async update({ data }) {
        const found = rows.filter(row => matches(row, filter));
        found.forEach(row => apply(row, data));
        return { stats: { updated: found.length } };
      }
    };
    return api;
  }
  const db = {
    command: {
      in: values => ({ operator: 'in', values }),
      inc: amount => ({ operator: 'inc', amount })
    },
    serverDate: () => 'server-time',
    async createCollection(name) {
      if (collections.has(name)) throw new Error('collection exists');
      collections.set(name, []);
    },
    collection(name) {
      const rows = table(name);
      return {
        where: filter => query(rows, filter),
        async add({ data }) {
          const id = 'row-' + (++nextId);
          rows.push(Object.assign({ _id: id }, data));
          return { _id: id };
        },
        doc(id) {
          return {
            async get() {
              const row = rows.find(item => item._id === id);
              if (!row) throw new Error('document not found');
              return { data: Object.assign({}, row) };
            },
            async update({ data }) {
              const row = rows.find(item => item._id === id);
              if (!row) throw new Error('document not found');
              apply(row, data);
              return { stats: { updated: 1 } };
            },
            async remove() {
              const index = rows.findIndex(item => item._id === id);
              if (index < 0) throw new Error('document not found');
              rows.splice(index, 1);
              return { stats: { removed: 1 } };
            }
          };
        }
      };
    }
  };
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'mock-env',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: openid })
  };
  return { cloud, db, setOpenid: value => { openid = value; } };
}

function loadService(cloud) {
  const servicePath = require.resolve('../cloudfunctions/nuoyiService/index');
  const previous = require.cache[servicePath];
  delete require.cache[servicePath];
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloud;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(servicePath);
  } finally {
    Module._load = originalLoad;
    if (previous) require.cache[servicePath] = previous;
    else delete require.cache[servicePath];
  }
}

function loadAccountFunction(cloud) {
  const functionPath = require.resolve('../cloudfunctions/quickstartFunctions/index');
  const previous = require.cache[functionPath];
  delete require.cache[functionPath];
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloud;
    if (request === './user-profile') return async (activeCloud, event) => ({
      success: true,
      action: event.action,
      sameCloud: activeCloud === cloud
    });
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const account = require(functionPath);
    return {
      async main(event) {
        const activeLoad = Module._load;
        Module._load = function (request, parent, isMain) {
          if (request === './user-profile') return async (activeCloud, profileEvent) => ({
            success: true,
            action: profileEvent.action,
            sameCloud: activeCloud === cloud
          });
          return activeLoad.call(this, request, parent, isMain);
        };
        try {
          return await account.main(event);
        } finally {
          Module._load = activeLoad;
        }
      }
    };
  } finally {
    Module._load = originalLoad;
    if (previous) require.cache[functionPath] = previous;
    else delete require.cache[functionPath];
  }
}

async function testService() {
  const state = createCloud();
  const service = loadService(state.cloud);
  const call = (action, payload) => service.main(Object.assign({ action }, payload || {}));

  state.setOpenid('');
  assert.equal((await call('createPost', { title: 'no identity' })).code, 'NOT_LOGIN');
  state.setOpenid('wechat-A');
  assert.equal((await call('createPost', { title: '' })).code, 'EMPTY_CONTENT');

  const created = await call('createPost', { title: '我的傩面记录', topic: '体验手记', author: '傩友甲' });
  assert.equal(created.success, true);
  const postId = created.data.id;
  assert.equal((await call('createPost', { title: '短时间重复' })).code, 'TOO_FREQUENT');
  let posts = await call('listPosts');
  assert.equal(posts.data.posts[0].id, postId);
  assert.equal(posts.data.posts[0].isOwner, true);

  const comment = await call('addComment', { postId, text: '很有意思' });
  assert.equal(comment.success, true);
  assert.equal((await call('listPosts')).data.posts[0].commentCount, 1);
  state.setOpenid('wechat-B');
  assert.equal((await call('deleteComment', { commentId: comment.data.id })).code, 'NOT_OWNER');
  assert.equal((await call('deletePost', { postId })).code, 'NOT_OWNER');
  assert.deepEqual((await call('listCart')).data.items, []);

  state.setOpenid('wechat-A');
  assert.equal((await call('deleteComment', { commentId: comment.data.id })).success, true);
  const liked = await call('toggleLike', { postId });
  assert.equal(liked.data.liked, true);
  assert.equal(liked.data.likeCount, 1);
  const unliked = await call('toggleLike', { postId });
  assert.equal(unliked.data.liked, false);
  assert.equal(unliked.data.likeCount, 0);

  assert.equal((await call('addCartItem', { productId: 'zhu-rong', spec: '火焰纹款', quantity: 0 })).code, 'INVALID_INPUT');
  const first = await call('addCartItem', { productId: 'zhu-rong', spec: '火焰纹款', name: '傩纹神韵 · 祝融', price: 39, quantity: 2 });
  const merged = await call('addCartItem', { productId: 'zhu-rong', spec: '火焰纹款', name: '傩纹神韵 · 祝融', price: 39, quantity: 3 });
  assert.equal(first.success, true);
  assert.equal(merged.data.merged, true);
  assert.equal(merged.data.quantity, 5);
  assert.equal((await call('updateCartQuantity', { key: first.data.key, quantity: 0 })).code, 'INVALID_INPUT');
  assert.equal((await call('updateCartQuantity', { key: first.data.key, quantity: 4 })).success, true);
  assert.equal((await call('updateCartQuantity', { key: first.data.key, quantity: 5 })).success, true);
  const cart = await call('listCart');
  assert.equal(cart.data.count, 5);
  assert.equal(cart.data.total, '195.00');

  assert.equal((await call('removeCartItem', { key: first.data.key })).success, true);
  assert.deepEqual((await call('listCart')).data.items, []);
  await call('addCartItem', { productId: 'study', spec: '个人咨询', name: '寻傩 · 主题研学', price: null });
  assert.equal((await call('clearCart')).success, true);
  assert.deepEqual((await call('listCart')).data.items, []);
  await call('addCartItem', { productId: 'zhu-rong', spec: '火焰纹款', name: '傩纹神韵 · 祝融', price: 39, quantity: 5 });

  const intent = await call('submitIntent', { date: '2026-10-23' });
  assert.equal(intent.success, true);
  assert.equal(intent.data.items[0].quantity, 5);
  assert.deepEqual((await call('listCart')).data.items, []);
  assert.equal((await call('listIntents')).data.intentions.length, 1);
  state.setOpenid('wechat-B');
  assert.equal((await call('deleteIntent', { intentId: intent.data.id })).code, 'NOT_OWNER');
  state.setOpenid('wechat-A');
  assert.equal((await call('deleteIntent', { intentId: intent.data.id })).success, true);
  assert.equal((await call('deletePost', { postId })).success, true);
  assert.equal((await call('listPosts')).data.posts.length, 0);
  assert.equal((await call('unknownAction')).code, 'UNKNOWN_ACTION');
  console.log('PASS nuoyiService ownership isolation, community actions, cart validation, intent snapshot/clear');
}

async function testAccountFunction() {
  const cloud = { DYNAMIC_CURRENT_ENV: 'mock-env', init() {} };
  const account = loadAccountFunction(cloud);
  assert.equal((await account.main({ type: 'deleteRecord', data: { _id: 'anything' } })).code, 'UNKNOWN_ACTION');
  const result = await account.main({ type: 'userAuth', action: 'getProfile' });
  assert.equal(result.success, true);
  assert.equal(result.sameCloud, true);
  console.log('PASS account function exposes only the user-profile route');
}

async function testCloudClient() {
  const calls = [];
  let rejected = false;
  const wx = {
    cloud: {
      callFunction(options) {
        calls.push(options);
        return rejected ? Promise.reject({ errMsg: 'FUNCTION_NOT_FOUND' }) : Promise.resolve({ result: { success: true, data: { posts: [] } } });
      },
      uploadFile(options) { options.success({ fileID: 'cloud://mock/' + options.cloudPath }); }
    }
  };
  const module = { exports: {} };
  const quietConsole = { error() {}, warn() {}, log() {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/utils/nuoyi-cloud.js'), 'utf8'), {
    module,
    exports: module.exports,
    wx,
    console: quietConsole,
    Promise,
    Date
  });
  const api = module.exports;
  assert.equal((await api.listPosts(12)).success, true);
  assert.equal(calls[0].name, 'nuoyiService');
  assert.equal(calls[0].data.action, 'listPosts');
  const uploaded = await api.uploadImages(['photo.png'], 'nuoyi/posts');
  assert.equal(uploaded.length, 1);
  assert.match(uploaded[0], /^cloud:\/\/mock\/nuoyi\/posts\/\d+-0\.png$/);
  rejected = true;
  assert.equal((await api.listPosts()).code, 'FUNCTION_NOT_FOUND');

  const noCloudModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/utils/nuoyi-cloud.js'), 'utf8'), {
    module: noCloudModule,
    exports: noCloudModule.exports,
    wx: {},
    console: quietConsole,
    Promise,
    Date
  });
  assert.equal((await noCloudModule.exports.listPosts()).code, 'CLOUD_UNAVAILABLE');
  console.log('PASS cloud client routing, image upload helper, missing-function and no-cloud handling');
}

function testProjectConfiguration() {
  const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
  const envList = require('../miniprogram/envList');
  const config = require('../miniprogram/config');
  const app = fs.readFileSync(path.join(root, 'miniprogram/app.js'), 'utf8');
  assert.equal(project.appid, 'wxdcd2e82bf93ebf27');
  assert.ok(envList.envList.length > 0);
  assert.equal(config.cloudEnv, envList.envList[0].envId);
  assert.equal(config.backendMode, 'cloud');
  assert.ok(app.includes("require('./config')"));
  assert.ok(app.includes("backendMode !== 'cloud'"));
}

async function main() {
  testProjectConfiguration();
  await testService();
  await testAccountFunction();
  await testCloudClient();
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
