// 社区与商城的云端接口封装。
// 云函数统一返回 { success, code, message, data }，这里只负责调用与错误归一化，
// 页面拿到结果后按 success 分支处理，不需要再关心网络异常的细节。

const FN = 'nuoyiService';

// 云函数调用失败时的兜底提示
const FALLBACK = {
  CLOUD_UNAVAILABLE: '云服务暂时不可用，请稍后重试',
  FUNCTION_NOT_FOUND: '云函数尚未部署，请先在开发者工具里上传 nuoyiService'
};

function call(action, payload) {
  return new Promise(resolve => {
    if (!wx.cloud) {
      resolve({ success: false, code: 'CLOUD_UNAVAILABLE', message: FALLBACK.CLOUD_UNAVAILABLE });
      return;
    }
    wx.cloud.callFunction({
      name: FN,
      data: Object.assign({ action }, payload || {})
    }).then(res => {
      const result = res && res.result;
      if (!result || typeof result.success !== 'boolean') {
        resolve({ success: false, code: 'EMPTY_RESULT', message: '服务返回异常，请稍后重试' });
        return;
      }
      resolve(result);
    }).catch(error => {
      const errMsg = String((error && error.errMsg) || '');
      console.error('[nuoyiService] ' + action + ' 调用失败', error);
      const notDeployed = /FUNCTION_NOT_FOUND|function not found|-501000/i.test(errMsg);
      resolve({
        success: false,
        code: notDeployed ? 'FUNCTION_NOT_FOUND' : 'CLOUD_UNAVAILABLE',
        message: notDeployed ? FALLBACK.FUNCTION_NOT_FOUND : FALLBACK.CLOUD_UNAVAILABLE
      });
    });
  });
}

// 把本地图片上传到云存储，返回 fileID 数组；只上传用户主动选择的临时文件
function uploadImages(filePaths, folder) {
  if (!filePaths || !filePaths.length) return Promise.resolve([]);
  if (!wx.cloud) return Promise.reject(new Error('CLOUD_UNAVAILABLE'));
  const dir = folder || 'nuoyi/posts';
  return Promise.all(filePaths.map((filePath, index) => new Promise((resolve, reject) => {
    const matched = String(filePath).match(/\.([A-Za-z0-9]+)$/);
    const ext = matched ? matched[1] : 'png';
    wx.cloud.uploadFile({
      cloudPath: dir + '/' + Date.now() + '-' + index + '.' + ext,
      filePath,
      success: res => resolve(res.fileID),
      fail: reject
    });
  })));
}

module.exports = {
  call,
  uploadImages,
  // 社区
  listPosts: limit => call('listPosts', { limit }),
  createPost: payload => call('createPost', payload),
  deletePost: postId => call('deletePost', { postId }),
  addComment: payload => call('addComment', payload),
  deleteComment: commentId => call('deleteComment', { commentId }),
  toggleLike: postId => call('toggleLike', { postId }),
  // 商城
  listCart: () => call('listCart'),
  addCartItem: payload => call('addCartItem', payload),
  updateCartQuantity: (key, quantity) => call('updateCartQuantity', { key, quantity }),
  removeCartItem: key => call('removeCartItem', { key }),
  clearCart: () => call('clearCart'),
  submitIntent: date => call('submitIntent', { date }),
  listIntents: () => call('listIntents'),
  deleteIntent: intentId => call('deleteIntent', { intentId })
};
