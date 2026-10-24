const crypto = require('crypto');
const COLLECTION = 'nuoyi_users';
const safeUser = user => ({
  _id: user._id,
  account: user.account || '',
  nickName: user.nickName || user.account || '傩友',
  avatarUrl: user.avatarUrl || ''
});

// Only the server-provided WeChat identity is trusted. Never accept a client user id.
module.exports = async function userProfile(cloud, event) {
  const {
    OPENID
  } = cloud.getWXContext();
  if (!OPENID) return {
    success: false,
    code: 'NO_IDENTITY',
    message: '无法识别微信身份，请在小程序中重试'
  };
  if (!['wechatLogin', 'getProfile', 'updateProfile'].includes(event.action)) return {
    success: false,
    code: 'UNKNOWN_ACTION',
    message: '请使用微信登录'
  };
  const db = cloud.database();
  const users = db.collection(COLLECTION);
  try {
    // Creation can fail because the collection already exists. A subsequent query
    // still fails normally if the environment is unavailable or access is denied.
    try {
      await db.createCollection(COLLECTION);
    } catch (error) { /* queried below */ }
    const found = await users.where({
      openid: OPENID
    }).limit(1).get();
    let user = found.data[0];
    if (!user && event.action !== 'wechatLogin') return {
      success: false,
      code: 'NOT_REGISTERED',
      message: '请先微信登录'
    };
    if (!user) {
      const id = 'wx_' + crypto.createHash('sha256').update(OPENID).digest('hex').slice(0, 32);
      user = {
        _id: id,
        _openid: OPENID,
        openid: OPENID,
        nickName: '傩友',
        avatarUrl: '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };
      try {
        await users.add({
          data: user
        });
      } catch (error) {
        // Deterministic IDs make concurrent first logins idempotent.
        const concurrent = await users.where({
          openid: OPENID
        }).limit(1).get();
        if (!concurrent.data.length) throw error;
        user = concurrent.data[0];
      }
    }
    if (event.action === 'updateProfile') {
      const nickName = typeof event.nickName === 'string' ? event.nickName.trim() : '';
      const avatarUrl = typeof event.avatarUrl === 'string' ? event.avatarUrl : user.avatarUrl || '';
      if (!nickName || nickName.length > 20 || /[\u0000-\u001f\u007f]/.test(nickName)) return {
        success: false,
        code: 'INVALID_NICKNAME',
        message: '昵称需要1至20个有效字符'
      };
      // Accept the existing avatar or an upload in this user's own directory.
      const filePath = avatarUrl.replace(/^cloud:\/\/[^/]+\//, '');
      if (avatarUrl !== (user.avatarUrl || '') && (!/^cloud:\/\/[^/]+\//.test(avatarUrl) || !filePath.startsWith('avatars/' + user._id + '/') || filePath.includes('..') || !/\.(png|jpe?g|webp)$/i.test(filePath))) return {
        success: false,
        code: 'INVALID_AVATAR',
        message: '请选择并上传有效头像'
      };
      await users.doc(user._id).update({
        data: {
          nickName,
          avatarUrl,
          updatedAt: db.serverDate()
        }
      });
      user = Object.assign({}, user, {
        nickName,
        avatarUrl
      });
    }
    return {
      success: true,
      user: safeUser(user)
    };
  } catch (error) {
    console.error('userProfile failed', error.errCode || error.code || 'DATABASE_ERROR');
    return {
      success: false,
      code: 'CLOUD_UNAVAILABLE',
      message: '云端资料暂不可用，请确认环境及云函数已部署后重试'
    };
  }
};
