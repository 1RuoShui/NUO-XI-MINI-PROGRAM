// 云函数：nuoyiService
// 负责「社区互动」与「商城选购」的云端读写。
// openid 由微信私有协议提供，客户端伪造不了，所有删除类操作都在服务端校验归属。
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 集合名集中维护
const COLL = {
  posts: "nuoyi_posts",
  comments: "nuoyi_comments",
  likes: "nuoyi_likes",
  cart: "nuoyi_cart",
  intents: "nuoyi_intents",
};

// 业务限制：客户端也做一次提示，服务端再兜一次底，防止绕过前端直接调接口
const RULE = {
  postLength: 500,
  commentLength: 200,
  postImages: 3,
  cartItems: 30,
  listSize: 50,
  postIntervalMs: 10000,
};

const ensured = {};

// 集合不存在时自动创建，省去手动建表
async function ensureCollection(name) {
  if (ensured[name]) return;
  try {
    await db.createCollection(name);
  } catch (e) {
    // 集合已存在时会抛错，属于正常情况
  }
  ensured[name] = true;
}

async function withCollection(name, fn) {
  await ensureCollection(name);
  try {
    return await fn();
  } catch (e) {
    // 集合刚创建可能还没生效，重建后重试一次
    try {
      await db.createCollection(name);
    } catch (err) {
      // 忽略
    }
    return await fn();
  }
}

const ok = data => ({ success: true, code: "OK", message: "", data: data || null });
const fail = (code, message) => ({ success: false, code, message: message || "操作失败", data: null });

function currentOpenId() {
  const ctx = cloud.getWXContext() || {};
  return ctx.OPENID || "";
}

function toText(value, maxLength) {
  const text = String(value == null ? "" : value).trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function toImages(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === "string" && item).slice(0, RULE.postImages);
}

// 价格允许为空（待询价商品），空值统一存成 null
function toPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function toQuantity(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 99) return null;
  return num;
}

async function findDoc(collection, id) {
  try {
    const res = await withCollection(collection, () => db.collection(collection).doc(id).get());
    return res && res.data ? res.data : null;
  } catch (e) {
    return null;
  }
}

// 归属校验：只有记录创建者本人才能继续操作
function assertOwner(record, openid, label) {
  if (!openid) return fail("NOT_LOGIN", "请先登录");
  if (!record) return fail("NOT_FOUND", label + "不存在或已被删除");
  if (record.openid !== openid) return fail("NOT_OWNER", "只能操作自己发布的内容");
  return null;
}

/* ------------------------------ 社区：帖子 ------------------------------ */

async function createPost(event) {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后再发布");

  const title = toText(event.title, RULE.postLength + 1);
  const images = toImages(event.images);
  const topic = toText(event.topic, 20) || "纹样共创";

  if (!title && !images.length) return fail("EMPTY_CONTENT", "先写点内容或添加图片吧");
  if (title.length > RULE.postLength) return fail("TOO_LONG", "内容不能超过 " + RULE.postLength + " 字");

  // 频率限制：同一用户短时间内不能连续发帖
  const recent = await withCollection(COLL.posts, () =>
    db.collection(COLL.posts).where({ openid }).orderBy("createdTs", "desc").limit(1).get()
  );
  if (recent.data.length && recent.data[0].createdTs) {
    if (Date.now() - Number(recent.data[0].createdTs) < RULE.postIntervalMs) {
      return fail("TOO_FREQUENT", "发布太频繁，请稍后再试");
    }
  }

  const author = toText(event.author, 20) || "傩艺访客";
  const date = toText(event.date, 20);
  const res = await withCollection(COLL.posts, () =>
    db.collection(COLL.posts).add({
      data: {
        openid,
        author,
        title,
        topic,
        images,
        date,
        likeCount: 0,
        commentCount: 0,
        status: "normal",
        createdTs: Date.now(),
        createdAt: db.serverDate(),
      },
    })
  );
  return ok({ id: res._id, author, title, topic, images, date, likeCount: 0, commentCount: 0, isOwner: true });
}

// 帖子列表连同评论一次性返回，避免客户端为每条帖子单独请求
async function listPosts(event) {
  const openid = currentOpenId();
  const size = Math.min(Number(event.limit) || 20, RULE.listSize);

  const res = await withCollection(COLL.posts, () =>
    db.collection(COLL.posts).where({ status: "normal" }).orderBy("createdTs", "desc").limit(size).get()
  );
  const rows = res.data;
  if (!rows.length) return ok({ posts: [] });

  const ids = rows.map(item => item._id);

  const commentRes = await withCollection(COLL.comments, () =>
    db.collection(COLL.comments)
      .where({ postId: _.in(ids) })
      .orderBy("createdTs", "asc")
      .limit(RULE.listSize)
      .get()
  );
  const commentMap = {};
  commentRes.data.forEach(item => {
    if (!commentMap[item.postId]) commentMap[item.postId] = [];
    commentMap[item.postId].push({
      id: item._id,
      author: item.author || "傩艺访客",
      text: item.text,
      isOwner: item.openid === openid,
    });
  });

  // 一次性查出「我点过赞的帖子」
  let likedIds = [];
  if (openid) {
    const likeRes = await withCollection(COLL.likes, () =>
      db.collection(COLL.likes).where({ openid, postId: _.in(ids) }).limit(RULE.listSize).get()
    );
    likedIds = likeRes.data.map(item => item.postId);
  }

  const posts = rows.map(item => ({
    id: item._id,
    author: item.author || "傩艺访客",
    title: item.title || "",
    topic: item.topic || "纹样共创",
    images: item.images || [],
    date: item.date || "",
    seed: false,
    liked: likedIds.indexOf(item._id) >= 0,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    isOwner: item.openid === openid,
    commentList: commentMap[item._id] || [],
  }));
  return ok({ posts });
}

async function deletePost(event) {
  const openid = currentOpenId();
  const postId = toText(event.postId);
  if (!postId) return fail("INVALID_INPUT", "缺少帖子标识");

  const post = await findDoc(COLL.posts, postId);
  const denied = assertOwner(post, openid, "帖子");
  if (denied) return denied;

  await db.collection(COLL.posts).doc(postId).remove();
  // 连带清理评论与点赞，不留孤儿数据
  await withCollection(COLL.comments, () => db.collection(COLL.comments).where({ postId }).remove());
  await withCollection(COLL.likes, () => db.collection(COLL.likes).where({ postId }).remove());
  return ok({ postId });
}

/* ------------------------------ 社区：评论 ------------------------------ */

async function addComment(event) {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后再评论");

  const postId = toText(event.postId);
  const text = toText(event.text, RULE.commentLength + 1);
  if (!postId) return fail("INVALID_INPUT", "缺少帖子标识");
  if (!text) return fail("EMPTY_CONTENT", "评论内容不能为空");
  if (text.length > RULE.commentLength) return fail("TOO_LONG", "评论不能超过 " + RULE.commentLength + " 字");

  const post = await findDoc(COLL.posts, postId);
  if (!post || post.status !== "normal") return fail("NOT_FOUND", "帖子不存在或已被删除");

  const author = toText(event.author, 20) || "傩艺访客";
  const res = await withCollection(COLL.comments, () =>
    db.collection(COLL.comments).add({
      data: { postId, openid, author, text, createdTs: Date.now(), createdAt: db.serverDate() },
    })
  );
  await db.collection(COLL.posts).doc(postId).update({ data: { commentCount: _.inc(1) } });
  return ok({ id: res._id, postId, author, text, isOwner: true });
}

async function deleteComment(event) {
  const openid = currentOpenId();
  const commentId = toText(event.commentId);
  if (!commentId) return fail("INVALID_INPUT", "缺少评论标识");

  const comment = await findDoc(COLL.comments, commentId);
  const denied = assertOwner(comment, openid, "评论");
  if (denied) return denied;

  await db.collection(COLL.comments).doc(commentId).remove();
  await db.collection(COLL.posts).doc(comment.postId).update({ data: { commentCount: _.inc(-1) } });
  return ok({ commentId });
}

/* ------------------------------ 社区：点赞 ------------------------------ */

async function toggleLike(event) {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后再点赞");

  const postId = toText(event.postId);
  if (!postId) return fail("INVALID_INPUT", "缺少帖子标识");

  const post = await findDoc(COLL.posts, postId);
  if (!post || post.status !== "normal") return fail("NOT_FOUND", "帖子不存在或已被删除");

  // 同一用户对同一帖子的点赞记录唯一，重复点击即取消
  const existing = await withCollection(COLL.likes, () =>
    db.collection(COLL.likes).where({ postId, openid }).limit(1).get()
  );

  if (existing.data.length) {
    await db.collection(COLL.likes).doc(existing.data[0]._id).remove();
    await db.collection(COLL.posts).doc(postId).update({ data: { likeCount: _.inc(-1) } });
    return ok({ postId, liked: false, likeCount: Math.max(0, (post.likeCount || 1) - 1) });
  }

  await db.collection(COLL.likes).add({ data: { postId, openid, createdTs: Date.now() } });
  await db.collection(COLL.posts).doc(postId).update({ data: { likeCount: _.inc(1) } });
  return ok({ postId, liked: true, likeCount: (post.likeCount || 0) + 1 });
}

/* --------------------------- 商城：选购清单 --------------------------- */

function cartRowToView(row, openid) {
  return {
    _id: row._id,
    key: row.key,
    id: row.productId,
    productId: row.productId,
    spec: row.spec,
    name: row.name,
    price: row.price === undefined ? null : row.price,
    image: row.image || "",
    category: row.category || "",
    quantity: Number(row.quantity) || 1,
    isOwner: row.openid === openid,
  };
}

async function listCart() {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后查看选购清单");

  const res = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).where({ openid }).orderBy("updatedTs", "desc").limit(RULE.listSize).get()
  );
  const items = res.data.map(row => cartRowToView(row, openid));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + (item.price === null ? 0 : Math.round(item.price * 100) * item.quantity),
    0
  );
  return ok({
    items,
    count,
    total: (total / 100).toFixed(2),
    inquiryCount: items.filter(item => item.price === null).length,
  });
}

async function addCartItem(event) {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后加入选购清单");

  const productId = toText(event.productId);
  const spec = toText(event.spec, 30);
  if (!productId || !spec) return fail("INVALID_INPUT", "缺少商品标识或规格");

  const key = productId + ":" + spec;
  const quantity = event.quantity === undefined ? 1 : toQuantity(event.quantity);
  if (quantity === null) return fail("INVALID_INPUT", "数量需为 1 到 99 之间的整数");

  const existing = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).where({ openid, key }).limit(1).get()
  );

  if (existing.data.length) {
    // 同一商品同一规格只占一行，数量累加
    const row = existing.data[0];
    const next = Math.min(99, (Number(row.quantity) || 1) + quantity);
    await db.collection(COLL.cart).doc(row._id).update({
      data: { quantity: next, updatedTs: Date.now(), updatedAt: db.serverDate() },
    });
    return ok({ _id: row._id, key, quantity: next, merged: true });
  }

  const countRes = await withCollection(COLL.cart, () => db.collection(COLL.cart).where({ openid }).count());
  if (countRes.total >= RULE.cartItems) {
    return fail("CART_FULL", "选购清单最多 " + RULE.cartItems + " 种商品");
  }

  const res = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).add({
      data: {
        openid,
        key,
        productId,
        spec,
        name: toText(event.name, 60),
        price: toPrice(event.price),
        image: toText(event.image, 300),
        category: toText(event.category, 20),
        quantity,
        createdTs: Date.now(),
        updatedTs: Date.now(),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  );
  return ok({ _id: res._id, key, quantity, merged: false });
}

async function updateCartQuantity(event) {
  const openid = currentOpenId();
  const key = toText(event.key);
  const quantity = toQuantity(event.quantity);
  if (!key) return fail("INVALID_INPUT", "缺少清单项标识");
  if (quantity === null) return fail("INVALID_INPUT", "数量需为 1 到 99 之间的整数");

  const found = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).where({ openid, key }).limit(1).get()
  );
  const row = found.data[0];
  const denied = assertOwner(row, openid, "清单项");
  if (denied) return denied;

  await db.collection(COLL.cart).doc(row._id).update({
    data: { quantity, updatedTs: Date.now(), updatedAt: db.serverDate() },
  });
  return ok({ key, quantity });
}

async function removeCartItem(event) {
  const openid = currentOpenId();
  const key = toText(event.key);
  if (!key) return fail("INVALID_INPUT", "缺少清单项标识");

  const found = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).where({ openid, key }).limit(1).get()
  );
  const row = found.data[0];
  const denied = assertOwner(row, openid, "清单项");
  if (denied) return denied;

  await db.collection(COLL.cart).doc(row._id).remove();
  return ok({ key });
}

async function clearCart() {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录");

  const res = await withCollection(COLL.cart, () => db.collection(COLL.cart).where({ openid }).remove());
  return ok({ removed: res.stats ? res.stats.removed : 0 });
}

/* --------------------------- 商城：购买意向 --------------------------- */

async function submitIntent(event) {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录后保存选购意向");

  // 意向内容以服务端的清单为准，不采用客户端传来的数据
  const cart = await withCollection(COLL.cart, () =>
    db.collection(COLL.cart).where({ openid }).limit(RULE.listSize).get()
  );
  if (!cart.data.length) return fail("EMPTY_CART", "先把喜欢的好物加入清单");

  const items = cart.data.map(row => ({
    key: row.key,
    name: row.name,
    spec: row.spec,
    price: row.price === undefined ? null : row.price,
    quantity: Number(row.quantity) || 1,
  }));
  const total = items.reduce(
    (sum, item) => sum + (item.price === null ? 0 : Math.round(item.price * 100) * item.quantity),
    0
  );
  const inquiryCount = items.filter(item => item.price === null).length;
  const date = toText(event.date, 20);

  const res = await withCollection(COLL.intents, () =>
    db.collection(COLL.intents).add({
      data: {
        openid,
        items,
        total: (total / 100).toFixed(2),
        inquiryCount,
        date,
        status: "pending",
        createdTs: Date.now(),
        createdAt: db.serverDate(),
      },
    })
  );

  // 保存后清空云端清单，与页面「保存意向即清空」的行为保持一致
  await db.collection(COLL.cart).where({ openid }).remove();

  return ok({ id: res._id, items, total: (total / 100).toFixed(2), inquiryCount, date });
}

async function listIntents() {
  const openid = currentOpenId();
  if (!openid) return fail("NOT_LOGIN", "请先登录");

  const res = await withCollection(COLL.intents, () =>
    db.collection(COLL.intents).where({ openid }).orderBy("createdTs", "desc").limit(RULE.listSize).get()
  );
  const intentions = res.data.map(row => ({
    id: row._id,
    date: row.date || "",
    items: row.items || [],
    total: row.total || "0.00",
    inquiryCount: row.inquiryCount || 0,
    isOwner: true,
  }));
  return ok({ intentions });
}

async function deleteIntent(event) {
  const openid = currentOpenId();
  const intentId = toText(event.intentId);
  if (!intentId) return fail("INVALID_INPUT", "缺少意向单标识");

  const intent = await findDoc(COLL.intents, intentId);
  const denied = assertOwner(intent, openid, "购买意向");
  if (denied) return denied;

  await db.collection(COLL.intents).doc(intentId).remove();
  return ok({ intentId });
}

/* -------------------------------- 路由 -------------------------------- */

const ROUTES = {
  createPost,
  listPosts,
  deletePost,
  addComment,
  deleteComment,
  toggleLike,
  listCart,
  addCartItem,
  updateCartQuantity,
  removeCartItem,
  clearCart,
  submitIntent,
  listIntents,
  deleteIntent,
};

exports.main = async event => {
  const action = (event && event.action) || "";
  const handler = ROUTES[action];
  if (!handler) return fail("UNKNOWN_ACTION", "未知操作：" + action);
  try {
    return await handler(event || {});
  } catch (e) {
    console.error("[nuoyiService] " + action + " 执行失败", e);
    return fail("SERVER_ERROR", "服务暂时不可用，请稍后重试");
  }
};
