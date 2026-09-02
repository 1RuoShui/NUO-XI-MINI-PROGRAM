Page({
  data: {
    current: 0,
    slogans: ['傩映幽光，福佑四方', '神傩逐晦，岁岁安康', '假面藏灵，纳吉祛殃'],
    sloganIndex: 0,
    keyword: '',
    activeCategory: '全部',
    shopCategories: ['全部', '实物文创', '数字交互', '线下服务'],
    articleDetail: false,
    selectedArticle: {},
    selectedArticleIndex: -1,
    commentDrafts: {},
    composeText: '',
    composeImages: [],
    homeArticles: [],
    homePosts: [],
    authMode: 'login',
    authAccount: '',
    authPassword: '',
    authConfirmPassword: '',
    authMessage: '',
    isLoggedIn: false,
    loggedAccount: '',
    avatarDisplay: '../../images/avatar.png',
    tabs: [
      { label: '首页', icon: '../../images/icons/home.png' },
      { label: '发现', icon: '../../images/icons/examples.png' },
      { label: '商铺', icon: '../../images/icons/goods.png' },
      { label: '社区', icon: '../../images/icons/business.png' },
      { label: '我的', icon: '../../images/icons/usercenter.png' }
    ],
    products: [
      { name: '傩纹神韵·祝融', price: 39, category: '实物文创', description: '从傩面火焰纹中提取线条，转化为耳夹、耳坠等饰品。', image: '../../images/products/zhu-rong.png' },
      { name: '傩影走马灯', price: 89, category: '实物文创', description: '以傩戏中福禄寿形象为设计基础，呈现光影叙事。', image: '../../images/products/walking-lantern.png' },
      { name: '五方猱神潮玩盲盒', price: 79, category: '实物文创', description: '将东、西、南、北、中五方守护神融入潮玩盲盒。', image: '../../images/products/five-directions-blind-box.png' },
      { name: '是傩是我手诀面具', price: 69, category: '实物文创', description: '识别开掌、剑诀等手诀，匹配面具与祝福文案。', image: '../../images/products/hand-seal-mask.png' },
      { name: '傩舞蓝牙 AI 交互跳舞机', price: 399, category: '数字交互', description: '将传统傩舞步法转化为现代舞蹈互动体验。', image: '../../images/products/dance-ai-machine.png' },
      { name: '寻傩主题研学服务', price: 9999, category: '线下服务', description: '围绕傩戏文化开展研学旅行，包含傩服体验与傩技表演。', image: '../../images/products/study-service.png' },
      { name: '傩面生傩面具手工制作', price: 6999, category: '线下服务', description: '在专业指导下亲手制作傩面具，完成一次非遗体验。', image: '../../images/products/handmade-mask.png' }
    ],
    homeProducts: [
      { name: '傩纹神韵·祝融', price: 39, image: '../../images/products/zhu-rong.png' },
      { name: '傩影走马灯', price: 89, image: '../../images/products/walking-lantern.png' }
    ],
    visibleProducts: [],
    articles: [
      { title: '傩戏文化的传承（专题展示）', date: '2025-01-01', excerpt: '从仪式、面具与口述传统，了解傩文化如何代代相传。', paragraphs: ['傩戏是中国古老的仪式戏剧之一，面具、舞步与锣鼓共同构成了独特的文化记忆。', '今天的傩艺传承，既依靠传承人的口传心授，也通过展览、校园课堂与数字媒介进入更多人的生活。', '让古老纹样被看见，让传统技艺继续生长，是我们记录与分享傩文化的意义。'], favorite: false },
      { title: '《傩祭流光》工作坊文化介绍', date: '2025-01-15', excerpt: '走进工作坊，看一块木料如何成为承载祝愿的傩面。', paragraphs: ['一块木料经过选材、画稿、凿刻、打磨与上色，最终成为一张有性格的傩面。', '工作坊以体验式教学让参与者理解工艺背后的礼俗，也在手上留下属于自己的非遗记忆。'], favorite: false },
      { title: '校园展陈：傩艺作品走进课堂', date: '2025-02-05', excerpt: '让孩子在近距离观察中认识家乡的非遗宝藏。', paragraphs: ['校园展陈将面具、服饰、乐器与影像资料带进课堂，学生可以从颜色和纹样中寻找守护、祈福与驱晦的寓意。', '当文物不再只是玻璃柜中的展品，非遗就成为可以提问、触摸和继续创造的文化。'], favorite: false },
      { title: '傩艺展陈作品集 · 图文精选', date: '2025-02-20', excerpt: '一组图文，记录傩面从古典纹样到当代设计的变化。', paragraphs: ['不同地域的傩面有不同的色彩与造型，但都寄托着人们对平安、丰收与团圆的愿望。', '本专题精选代表性作品，带你从细节看见傩艺的审美脉络。'], favorite: false },
      { title: '傩面技艺展示 · 手工作品精选', date: '2025-03-01', excerpt: '看雕刻、彩绘与装饰如何让一张面具拥有生命力。', paragraphs: ['傩面的制作讲究刀法和层次，粗犷的轮廓、浓烈的色彩与细密的纹理共同塑造出强烈的视觉张力。'], favorite: false },
      { title: '傩戏AR演绎场景展示 · 创新融合', date: '2025-03-10', excerpt: '借助数字技术，让传统傩仪在新的空间中被重新理解。', paragraphs: ['AR 技术可以将面具纹样、角色故事与舞步信息叠加在真实场景中，帮助观众以更直观的方式进入傩戏世界。'], favorite: false }
    ],
    posts: [
      { id: 1, author: '傩艺官方账号', title: '探秘傩戏千年神谕，解锁传统新生密码~', date: '2025-04-13', images: ['../../images/products/five-directions-blind-box.png'], commentList: [{ author: '小禾', text: '这组面具的纹样太有力量感了！' }] },
      { id: 2, author: '文化传播官', title: '【知识科普】傩戏面具为何形态夸张？源自驱邪祈福的民俗传统！', date: '2025-04-06', images: [], commentList: [{ author: '阿木', text: '原来每一种夸张造型都有寓意。' }] }
    ]
  },
  onLoad() {
    this.setData({ visibleProducts: this.data.products, homeArticles: this.data.articles.slice(0, 3), homePosts: this.data.posts.slice(0, 1) });
    const session = wx.getStorageSync('nuoyi_cloud_session');
    if (session && session.account) this.setData({ isLoggedIn: true, loggedAccount: session.account, avatarDisplay: session.avatarUrl || '../../images/avatar.png' });
    this.setNavigationTitle(0);
    this.sloganTimer = setInterval(() => this.setNavigationTitle((this.data.sloganIndex + 1) % this.data.slogans.length), 3000);
  },
  setNavigationTitle(index) { this.setData({ sloganIndex: index }); wx.setNavigationBarTitle({ title: this.data.slogans[index] }); },
  onUnload() { if (this.sloganTimer) clearInterval(this.sloganTimer); },
  switchTab(e) { const current = e.currentTarget.dataset.index; this.setData({ current, articleDetail: false }); },
  goToTab(e) { this.setData({ current: e.currentTarget.dataset.target, articleDetail: false }); },
  switchAuthMode(e) { this.setData({ authMode: e.currentTarget.dataset.mode, authPassword: '', authConfirmPassword: '', authMessage: '' }); },
  onAuthInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  callUserAuth(action, data) {
    if (!wx.cloud) return Promise.reject(new Error('请先启用云开发'));
    return wx.cloud.callFunction({ name: 'quickstartFunctions', data: Object.assign({ type: 'userAuth', action }, data || {}) }).then(res => res.result || {});
  },
  localAuth(mode, account, password) {
    const users = wx.getStorageSync('nuoyi_local_users') || {};
    if (mode === 'register') {
      if (users[account]) return { success: false, code: 'ACCOUNT_EXISTS', message: '账号已注册，请直接登录' };
      users[account] = { password, avatarUrl: '' };
      wx.setStorageSync('nuoyi_local_users', users);
    } else {
      if (!users[account]) return { success: false, code: 'NOT_REGISTERED', message: '该账号尚未注册' };
      if (users[account].password !== password) return { success: false, code: 'INVALID_PASSWORD', message: '账号或密码错误' };
    }
    return { success: true, local: true, user: { account, avatarUrl: users[account] ? users[account].avatarUrl : '' } };
  },
  enterUser(user) {
    const session = { account: user.account, avatarUrl: user.avatarUrl || '' };
    wx.setStorageSync('nuoyi_cloud_session', session);
    this.setData({ isLoggedIn: true, loggedAccount: user.account, avatarDisplay: user.avatarUrl || '../../images/avatar.png', authPassword: '', authConfirmPassword: '', authMessage: '' });
  },
  submitAuth() {
    const account = this.data.authAccount.trim();
    const password = this.data.authPassword;
    if (account.length < 3) { wx.showToast({ title: '账号至少 3 个字符', icon: 'none' }); return; }
    if (password.length < 6) { wx.showToast({ title: '密码至少 6 位', icon: 'none' }); return; }
    const mode = this.data.authMode;
    if (mode === 'register' && password !== this.data.authConfirmPassword) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
    wx.showLoading({ title: mode === 'register' ? '注册中' : '登录中' });
    this.callUserAuth(mode === 'register' ? 'register' : 'accountLogin', { account, password })
      .catch(() => this.localAuth(mode, account, password))
      .then(result => {
        if (!result || !result.success) {
          if (result && result.code === 'NOT_REGISTERED') this.setData({ authMode: 'register', authMessage: '该账号尚未注册，请先注册' });
          else if (result && result.code === 'ACCOUNT_EXISTS') this.setData({ authMode: 'login', authMessage: '账号已注册，请直接登录' });
          else wx.showToast({ title: (result && result.message) || '操作失败', icon: 'none' });
          return;
        }
        this.enterUser(result.user);
        wx.showToast({ title: result.local ? '本地演示登录成功' : (mode === 'register' ? '注册成功' : '登录成功'), icon: 'success' });
      })
      .finally(() => wx.hideLoading());
  },
  wechatLogin() {
    wx.showLoading({ title: '微信登录中' });
    wx.login({
      success: () => this.callUserAuth('wechatLogin').then(result => {
        if (!result.success) { if (result.code === 'NOT_REGISTERED') this.setData({ authMode: 'register', authMessage: '该微信尚未注册，请先注册账号' }); else wx.showToast({ title: result.message || '微信登录失败', icon: 'none' }); return; }
        this.enterUser(result.user); wx.showToast({ title: '微信登录成功', icon: 'success' });
      }).catch(() => wx.showToast({ title: '微信快捷登录需要云服务，请先使用账号注册或配置云环境', icon: 'none' })).finally(() => wx.hideLoading()),
      fail: () => { wx.hideLoading(); wx.showToast({ title: '微信登录已取消', icon: 'none' }); }
    });
  },
  saveLocalAvatar(avatarUrl) {
    const save = filePath => {
      const session = wx.getStorageSync('nuoyi_cloud_session') || {};
      session.avatarUrl = filePath;
      wx.setStorageSync('nuoyi_cloud_session', session);
      const users = wx.getStorageSync('nuoyi_local_users') || {};
      if (session.account && users[session.account]) { users[session.account].avatarUrl = filePath; wx.setStorageSync('nuoyi_local_users', users); }
      this.setData({ avatarDisplay: filePath });
      wx.showToast({ title: '头像已保存到本机', icon: 'none' });
    };
    wx.saveFile({ tempFilePath: avatarUrl, success: res => save(res.savedFilePath), fail: () => save(avatarUrl) });
  },
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ avatarDisplay: avatarUrl });
    if (!wx.cloud) { this.saveLocalAvatar(avatarUrl); return; }
    wx.cloud.uploadFile({ cloudPath: `avatars/${Date.now()}.jpg`, filePath: avatarUrl })
      .then(upload => this.callUserAuth('updateProfile', { avatarUrl: upload.fileID }))
      .then(result => { if (result && result.success) { const session = wx.getStorageSync('nuoyi_cloud_session') || {}; session.avatarUrl = result.user.avatarUrl; wx.setStorageSync('nuoyi_cloud_session', session); this.setData({ avatarDisplay: result.user.avatarUrl }); } })
      .catch(() => this.saveLocalAvatar(avatarUrl));
  },
  logout() { wx.removeStorageSync('nuoyi_cloud_session'); this.setData({ isLoggedIn: false, loggedAccount: '', avatarDisplay: '../../images/avatar.png', authPassword: '', authConfirmPassword: '' }); },
  onSearch(e) { this.setData({ keyword: e.detail.value }); },
  search() { wx.showToast({ title: this.data.keyword ? '正在搜索' : '请输入关键词', icon: 'none' }); },
  selectCategory(e) { const category = e.currentTarget.dataset.category; const visibleProducts = category === '全部' ? this.data.products : this.data.products.filter(item => item.category === category); this.setData({ activeCategory: category, visibleProducts }); },
  showProduct(e) { wx.showToast({ title: e.currentTarget.dataset.name, icon: 'none' }); },
  openArticle(e) { const selectedArticleIndex = e.currentTarget.dataset.index; this.setData({ selectedArticleIndex, selectedArticle: this.data.articles[selectedArticleIndex], articleDetail: true }); },
  closeArticle() { this.setData({ articleDetail: false }); },
  toggleFavorite() { const index = this.data.selectedArticleIndex; const articles = this.data.articles; articles[index].favorite = !articles[index].favorite; this.setData({ articles, selectedArticle: articles[index] }); wx.showToast({ title: articles[index].favorite ? '已收藏' : '已取消收藏', icon: 'none' }); },
  onCommentInput(e) { const drafts = this.data.commentDrafts; drafts[e.currentTarget.dataset.index] = e.detail.value; this.setData({ commentDrafts: drafts }); },
  addComment(e) { const index = e.currentTarget.dataset.index; const text = (e.detail.value || this.data.commentDrafts[index] || '').trim(); if (!text) { wx.showToast({ title: '请输入评论内容', icon: 'none' }); return; } const posts = this.data.posts; posts[index].commentList.push({ author: '体验员', text }); const commentDrafts = this.data.commentDrafts; commentDrafts[index] = ''; this.setData({ posts, commentDrafts }); },
  onComposeInput(e) { this.setData({ composeText: e.detail.value }); },
  choosePostImage() { wx.chooseImage({ count: 3 - this.data.composeImages.length, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: res => this.setData({ composeImages: this.data.composeImages.concat(res.tempFilePaths) }) }); },
  removeComposeImage(e) { const images = this.data.composeImages.slice(); images.splice(e.currentTarget.dataset.index, 1); this.setData({ composeImages: images }); },
  publishPost() { const title = this.data.composeText.trim(); if (!title && !this.data.composeImages.length) { wx.showToast({ title: '先写点内容或添加图片吧', icon: 'none' }); return; } const posts = [{ id: Date.now(), author: '体验员', title: title || '分享一组傩艺图片', date: '刚刚', images: this.data.composeImages.slice(), commentList: [] }].concat(this.data.posts); this.setData({ posts, composeText: '', composeImages: [] }); wx.showToast({ title: '发布成功', icon: 'success' }); }
});
