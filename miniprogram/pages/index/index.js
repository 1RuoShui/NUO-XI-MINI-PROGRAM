const catalog = require('../../data/catalog');
const cloudApi = require('../../utils/nuoyi-cloud');
const STORE = 'nuoyi_experience_v2';
const LOCAL_PROFILE = 'nuoyi_profile_local_v1';
const DEFAULT_AVATAR = '/images/artwork/mascot.png';
const clone = value => JSON.parse(JSON.stringify(value));
const toast = title => wx.showToast({
  title,
  icon: 'none'
});
const dataset = e => e.currentTarget.dataset;

Page({
  data: {
    current: 0,
    detail: '',
    returnTab: 0,
    keyword: '',
    searched: false,
    articleCategory: '全部',
    activeCategory: '全部',
    topic: '全部',
    sort: '推荐',
    articleCategories: ['全部', '傩戏入门', '面具美学', '匠心手作', '当代新生'],
    shopCategories: ['全部', '实物文创', '数字交互', '线下服务'],
    topics: ['全部', '纹样共创', '好物灵感', '体验手记'],
    tabs: [{
        label: '首页',
        icon: '/images/icons/home.png'
      }, {
        label: '发现',
        icon: '/images/icons/examples.png'
      },
      {
        label: '商铺',
        icon: '/images/icons/goods.png'
      }, {
        label: '社区',
        icon: '/images/icons/business.png'
      }, {
        label: '我的',
        icon: '/images/icons/usercenter.png'
      }
    ],
    heroes: [{
        id: 'first-meeting',
        image: catalog.art('ritual-cover.jpg'),
        label: '初见 · 傩文化',
        title: '一面千年\n傩韵新生',
        subtitle: '跟随面具、舞步与故事，走近傩的世界'
      },
      {
        id: 'mask-pattern',
        image: catalog.art('masks.jpg'),
        label: '细看 · 面具美学',
        title: '一面一世界\n一纹一故事',
        subtitle: '读一张傩面，也读一份文化记忆'
      },
      {
        id: 'daily-design',
        image: catalog.art('jewelry.jpg'),
        label: '新生 · 生活美学',
        title: '把传统的灵感\n带进日常',
        subtitle: '从一抹纹样开始，发现文创之美'
      }
    ],
    products: clone(catalog.products),
    articles: clone(catalog.articles),
    posts: clone(catalog.posts),
    visibleProducts: [],
    visibleArticles: [],
    visiblePosts: [],
    homeProducts: [],
    homeArticles: [],
    homePosts: [],
    favoriteIds: [],
    favorites: [],
    favoriteCount: 0,
    cart: [],
    cartCount: 0,
    cartTotal: '0.00',
    inquiryCount: 0,
    selectedArticle: {},
    selectedProduct: {},
    selectedSpec: '',
    quantity: 1,
    searchArticles: [],
    searchProducts: [],
    searchPosts: [],
    resultCount: 0,
    composeText: '',
    composeImages: [],
    composeTopic: '纹样共创',
    composeOpen: false,
    publishing: false,
    commentDrafts: {},
    myPostCount: 0,
    intentions: [],
    isLoggedIn: false,
    user: {},
    nicknameDraft: '',
    avatarDraft: '',
    avatarDisplay: DEFAULT_AVATAR,
    authBusy: false,
    profileBusy: false,
    cloudReady: false,
    authMessage: '',
    profileEditing: false,
    profilePanel: ''
  },
  onLoad(options) {
    const app = getApp();
    this.setData({
      cloudReady: !!(app.globalData && app.globalData.cloudReady)
    });
    this.restore();
    if (!this.data.cloudReady) {
      const localUser = wx.getStorageSync(LOCAL_PROFILE);
      if (localUser && localUser.localOnly) this.enterLocalUser(localUser);
    }
    this.refresh();
    this.syncCloud();
    if (options && options.article) this.openArticleById(options.article);
    if (wx.getStorageSync('nuoyi_profile_v2') && this.data.cloudReady) this.wechatLogin(true);
  },
  restore() {
    const saved = wx.getStorageSync(STORE);
    if (!saved || typeof saved !== 'object') return;
    const knownIds = catalog.articles.map(a => a.id);
    const favoriteIds = Array.isArray(saved.favoriteIds) ? saved.favoriteIds.filter(id => knownIds.includes(id)) : [];
    const savedPosts = Array.isArray(saved.posts) ? saved.posts.filter(p => p && p.id && typeof p.title === 'string' && Array.isArray(p.images) && Array.isArray(p.commentList)) : [];
    const posts = savedPosts.length ? savedPosts : clone(catalog.posts);
    const cart = Array.isArray(saved.cart) ? saved.cart.map(row => {
      const product = catalog.products.find(p => p.id === row.id);
      if (!product || !product.specs.includes(row.spec)) return null;
      return Object.assign({}, product, {
        key: product.id + ':' + row.spec,
        spec: row.spec,
        quantity: Math.min(99, Math.max(1, Number(row.quantity) || 1))
      });
    }).filter(Boolean) : [];
    this.setData({
      favoriteIds,
      posts,
      cart,
      intentions: Array.isArray(saved.intentions) ? saved.intentions : []
    });
  },
  persist() {
    try {
      wx.setStorageSync(STORE, {
        favoriteIds: this.data.favoriteIds,
        posts: this.data.posts,
        cart: this.data.cart.map(p => ({
          id: p.id,
          spec: p.spec,
          quantity: p.quantity
        })),
        intentions: this.data.intentions
      });
      return true;
    } catch (error) {
      toast('本机存储空间不足，请清理后重试');
      return false;
    }
  },
  // 统一的云端调用入口
  cloudCall(action, payload) {
    return cloudApi.call(action, payload);
  },
  // 把云函数返回的提示语直接呈现给用户
  cloudToast(result) {
    toast((result && result.message) || '操作失败，请重试');
  },
  // 更新帖子时把可见列表一起算好再提交，
  // 避免先改 posts 再调 refresh 带来的时序问题（列表会被旧数据刷回去）
  setPosts(posts) {
    const topic = this.data.topic;
    this.setData({
      posts,
      visiblePosts: posts.filter(p => topic === '全部' || p.topic === topic)
    });
    this.refresh();
    this.persist();
  },
  // 启动时把帖子、选购清单、购买意向从云端同步下来
  syncCloud() {
    if (!this.data.cloudReady || !wx.cloud) return Promise.resolve();
    return Promise.all([this.syncCloudPosts(), this.syncCloudCart(), this.syncCloudIntents()]);
  },
  syncCloudPosts() {
    return cloudApi.listPosts(20).then(result => {
      if (!result.success) return result;
      const posts = (result.data && result.data.posts) || [];
      // 云端还没有动态时保留编辑部话题作为阅读引导
      this.setPosts(posts.length ? posts : this.data.posts.filter(p => p.seed));
      return result;
    });
  },
  syncCloudCart() {
    return cloudApi.listCart().then(result => {
      if (!result.success) return result;
      const rows = (result.data && result.data.items) || [];
      // 云端只存价格数值，展示用的标签和图片从本地商品表补回来
      this.setData({
        cart: rows.map(row => {
          const product = catalog.products.find(p => p.id === row.productId);
          return Object.assign({}, row, {
            image: row.image || (product ? product.image : ''),
            priceLabel: product ? product.priceLabel : row.price === null ? '待询价' : '¥' + row.price
          });
        })
      });
      this.refresh();
      this.persist();
      return result;
    });
  },
  syncCloudIntents() {
    return cloudApi.listIntents().then(result => {
      if (!result.success) return result;
      this.setData({
        intentions: (result.data && result.data.intentions) || []
      });
      this.persist();
      return result;
    });
  },
  refresh() {
    const {
      articleCategory,
      activeCategory,
      topic,
      keyword,
      sort,
      favoriteIds,
      cart
    } = this.data;
    const query = keyword.trim().toLowerCase();
    const contains = (item, fields) => fields.some(key => String(item[key] || '').toLowerCase().includes(query));
    const articles = this.data.articles.map(a => Object.assign({}, a, {
      favorite: favoriteIds.includes(a.id)
    }));
    let visibleProducts = this.data.products.filter(p => (activeCategory === '全部' || p.category === activeCategory) && (!query || contains(p, ['name', 'description', 'category'])));
    if (sort !== '推荐') visibleProducts = visibleProducts.slice().sort((a, b) => a.price === null ? (b.price === null ? 0 : 1) : b.price === null ? -1 : sort === '价格升序' ? a.price - b.price : b.price - a.price);
    const searchArticles = query ? articles.filter(a => contains(a, ['title', 'excerpt', 'category'])) : [],
      searchProducts = query ? this.data.products.filter(p => contains(p, ['name', 'description', 'category'])) : [],
      searchPosts = query ? this.data.posts.filter(p => contains(p, ['title', 'topic'])) : [];
    this.setData({
      articles,
      visibleProducts,
      visibleArticles: articles.filter(a => articleCategory === '全部' || a.category === articleCategory),
      visiblePosts: this.data.posts.filter(p => topic === '全部' || p.topic === topic),
      homeProducts: this.data.products.slice(0, 2),
      homeArticles: articles.slice(0, 3),
      homePosts: this.data.posts.slice(0, 1),
      favorites: articles.filter(a => a.favorite),
      favoriteCount: favoriteIds.length,
      cartCount: cart.reduce((sum, p) => sum + p.quantity, 0),
      cartTotal: (cart.reduce((sum, p) => sum + (p.price === null ? 0 : Math.round(p.price * 100) * p.quantity), 0) / 100).toFixed(2),
      inquiryCount: cart.filter(p => p.price === null).length,
      searchArticles,
      searchProducts,
      searchPosts,
      resultCount: searchArticles.length + searchProducts.length + searchPosts.length,
      myPostCount: this.data.posts.filter(p => !p.seed).length
    });
  },
  navigate(current) {
    this.setData({
      current: Number(current),
      detail: '',
      searched: false,
      keyword: '',
      profilePanel: '',
      composeOpen: false
    });
    this.refresh();
    wx.setNavigationBarTitle({
      title: ['傩艺 · 傩韵新生', '发现 · 读懂傩文化', '傩韵集 · 文创生活', '社区 · 遇见傩友', '我的 · 傩艺记忆'][Number(current)]
    });
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
  },
  switchTab(e) {
    this.navigate(dataset(e).index);
  },
  goToTab(e) {
    this.navigate(dataset(e).target);
  },
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    });
    if (this.data.current === 2 || this.data.searched) this.refresh();
  },
  search() {
    if (!this.data.keyword.trim()) return toast('输入一个感兴趣的关键词吧');
    this.setData({
      searched: this.data.current !== 2
    });
    this.refresh();
  },
  clearSearch() {
    this.setData({
      keyword: '',
      searched: false
    });
    this.refresh();
  },
  selectArticleCategory(e) {
    this.setData({
      articleCategory: dataset(e).value
    });
    this.refresh();
  },
  selectCategory(e) {
    this.setData({
      activeCategory: dataset(e).value
    });
    this.refresh();
  },
  selectTopic(e) {
    this.setData({
      topic: dataset(e).value
    });
    this.refresh();
  },
  changeSort() {
    const sorts = ['推荐', '价格升序', '价格降序'];
    this.setData({
      sort: sorts[(sorts.indexOf(this.data.sort) + 1) % sorts.length]
    });
    this.refresh();
  },
  openArticle(e) {
    this.openArticleById(dataset(e).id);
  },
  openArticleById(id) {
    const article = this.data.articles.find(a => a.id === id);
    if (!article) return;
    this.setData({
      selectedArticle: article,
      detail: 'article',
      returnTab: this.data.current,
      current: 1
    });
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
  },
  closeDetail() {
    this.setData({
      detail: '',
      current: this.data.returnTab
    });
  },
  toggleFavorite() {
    const id = this.data.selectedArticle.id;
    if (!id) return;
    const favoriteIds = this.data.favoriteIds.includes(id) ? this.data.favoriteIds.filter(i => i !== id) : this.data.favoriteIds.concat(id);
    this.setData({
      favoriteIds
    });
    this.refresh();
    this.setData({
      selectedArticle: this.data.articles.find(a => a.id === id)
    });
    this.persist();
  },
  showProduct(e) {
    const product = this.data.products.find(p => p.id === dataset(e).id);
    if (!product) return;
    this.setData({
      selectedProduct: product,
      selectedSpec: product.specs[0],
      quantity: 1,
      detail: 'product',
      returnTab: this.data.current,
      current: 2
    });
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
  },
  selectSpec(e) {
    this.setData({
      selectedSpec: dataset(e).value
    });
  },
  changeQuantity(e) {
    this.setData({
      quantity: Math.min(99, Math.max(1, this.data.quantity + Number(dataset(e).delta)))
    });
  },
  addToCart() {
    const p = this.data.selectedProduct;
    const spec = this.data.selectedSpec;
    if (!p.id || !p.specs.includes(spec)) return toast('请先选择规格');
    if (!this.data.cloudReady || !wx.cloud) {
      const key = p.id + ':' + spec;
      const cart = this.data.cart.slice();
      const existing = cart.find(row => row.key === key);
      if (existing) existing.quantity = Math.min(99, existing.quantity + this.data.quantity);
      else cart.push(Object.assign({}, p, { key, spec, quantity: this.data.quantity }));
      this.setData({ cart });
      this.refresh();
      if (this.persist()) toast('已加入本机选购清单');
      return;
    }
    cloudApi.addCartItem({
      productId: p.id,
      spec,
      name: p.name,
      price: p.price,
      image: p.image,
      category: p.category,
      quantity: this.data.quantity
    }).then(result => {
      if (!result.success) return this.cloudToast(result);
      toast(result.data && result.data.merged ? '已在清单中，数量已增加' : '已加入选购清单');
      this.syncCloudCart();
    });
  },
  openCart() {
    this.setData({
      detail: 'cart',
      returnTab: this.data.current
    });
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
  },
  changeCartQuantity(e) {
    const {
      key,
      delta
    } = dataset(e);
    const row = this.data.cart.find(p => p.key === key);
    if (!row) return;
    const quantity = Math.max(1, Math.min(99, row.quantity + Number(delta)));
    if (quantity === row.quantity) return;
    if (!this.data.cloudReady || !wx.cloud) {
      this.setData({ cart: this.data.cart.map(p => p.key === key ? Object.assign({}, p, { quantity }) : p) });
      this.refresh();
      this.persist();
      return;
    }
    cloudApi.updateCartQuantity(key, quantity).then(result => {
      if (!result.success) return this.cloudToast(result);
      this.setData({
        cart: this.data.cart.map(p => p.key === key ? Object.assign({}, p, {
          quantity
        }) : p)
      });
      this.refresh();
      this.persist();
    });
  },
  removeCartItem(e) {
    const key = dataset(e).key;
    if (!this.data.cloudReady || !wx.cloud) {
      this.setData({ cart: this.data.cart.filter(p => p.key !== key) });
      this.refresh();
      this.persist();
      return;
    }
    cloudApi.removeCartItem(key).then(result => {
      if (!result.success) return this.cloudToast(result);
      this.setData({
        cart: this.data.cart.filter(p => p.key !== key)
      });
      this.refresh();
      this.persist();
      toast('已从选购清单移除');
    });
  },
  saveIntention() {
    if (!this.data.cart.length) return toast('先把喜欢的好物加入清单');
    const cloudReady = this.data.cloudReady && !!wx.cloud;
    wx.showModal({
      title: '保存选购意向',
      content: (cloudReady ? '意向会保存到云端账号下' : '意向会保存在本机') + '，不会提交订单或扣款。商品规格、价格及服务安排需要后续确认。',
      confirmText: '保存意向',
      success: res => {
        if (!res.confirm) return;
        if (!cloudReady) {
          const previous = this.data.intentions;
          const previousCart = this.data.cart;
          const intention = {
            id: Date.now(),
            date: this.formatDate(new Date()),
            items: clone(previousCart),
            total: this.data.cartTotal,
            inquiryCount: this.data.inquiryCount
          };
          this.setData({ intentions: [intention].concat(previous).slice(0, 30), cart: [] });
          if (!this.persist()) this.setData({ intentions: previous, cart: previousCart });
          else {
            this.refresh();
            toast('意向已保存在本机，可在「我的」查看');
          }
          return;
        }
        cloudApi.submitIntent(this.formatDate(new Date())).then(result => {
          if (!result.success) return this.cloudToast(result);
          this.setData({
            cart: []
          });
          this.refresh();
          this.persist();
          this.syncCloudIntents();
          toast('意向已保存到云端，可在「我的」查看');
        });
      }
    });
  },
  // 删除一份购买意向：云端删除成功后同步界面
  deleteIntention(e) {
    const id = dataset(e).id;
    if (!id) return;
    wx.showModal({
      title: '删除这份意向？',
      content: '删除后记录会被清除，无法恢复。',
      success: res => {
        if (!res.confirm) return;
        if (!this.data.cloudReady || !wx.cloud) {
          this.setData({ intentions: this.data.intentions.filter(item => item.id !== id) });
          this.persist();
          toast('已删除');
          return;
        }
        cloudApi.deleteIntent(id).then(result => {
          if (!result.success) return this.cloudToast(result);
          this.setData({
            intentions: this.data.intentions.filter(item => item.id !== id)
          });
          this.persist();
          toast('已删除');
        });
      }
    });
  },
  // 删除自己发的评论：服务端会校验归属，删完重新拉一次帖子
  deleteComment(e) {
    const id = dataset(e).id;
    if (!id) return;
    wx.showModal({
      title: '删除这条评论？',
      content: '删除后无法恢复。',
      success: res => {
        if (!res.confirm) return;
        if (!this.data.cloudReady || !wx.cloud) {
          const post = this.data.posts.find(item => item.commentList.some(comment => comment.id === id));
          if (!post) return;
          this.setPosts(this.data.posts.map(item => item.id === post.id ? Object.assign({}, item, {
            commentList: item.commentList.filter(comment => comment.id !== id),
            commentCount: Math.max(0, (item.commentCount || item.commentList.length) - 1)
          }) : item));
          toast('已删除');
          return;
        }
        cloudApi.deleteComment(id).then(result => {
          if (!result.success) return this.cloudToast(result);
          toast('已删除');
          this.syncCloudPosts();
        });
      }
    });
  },
  // 清空选购清单：云端整条清除，再同步界面
  clearCart() {
    if (!this.data.cart.length) return toast('选购清单已经是空的');
    wx.showModal({
      title: '清空选购清单？',
      content: '清单里的商品会全部移除，无法恢复。',
      success: res => {
        if (!res.confirm) return;
        if (!this.data.cloudReady || !wx.cloud) {
          this.setData({ cart: [] });
          this.refresh();
          this.persist();
          toast('已清空选购清单');
          return;
        }
        cloudApi.clearCart().then(result => {
          if (!result.success) return this.cloudToast(result);
          this.setData({
            cart: []
          });
          this.refresh();
          this.persist();
          toast('已清空选购清单');
        });
      }
    });
  },
  previewImage(e) {
    const {
      src,
      post
    } = dataset(e), entry = this.data.posts.find(p => p.id === post);
    wx.previewImage({
      current: src,
      urls: entry ? entry.images : [src]
    });
  },
  toggleLike(e) {
    const id = dataset(e).id,
      post = this.data.posts.find(p => p.id === id);
    if (!post) return;
    if (!this.data.cloudReady || !wx.cloud) {
      this.setPosts(this.data.posts.map(p => p.id === id ? Object.assign({}, p, { liked: !p.liked }) : p));
      return;
    }
    if (post.seed) return toast('编辑部话题仅供阅读，发布你自己的动态就能收到喜欢');
    cloudApi.toggleLike(id).then(result => {
      if (!result.success) return this.cloudToast(result);
      const data = result.data || {};
      this.setPosts(this.data.posts.map(p => p.id === id ? Object.assign({}, p, {
        liked: !!data.liked,
        likeCount: data.likeCount
      }) : p));
    });
  },
  onCommentInput(e) {
    this.setData({
      ['commentDrafts.' + dataset(e).id]: e.detail.value
    });
  },
  addComment(e) {
    const id = dataset(e).id,
      post = this.data.posts.find(p => p.id === id);
    if (!post) return;
    if (post.seed) return toast('编辑部话题仅供阅读，试试发布你自己的动态');
    const text = String((e.detail && e.detail.value) || this.data.commentDrafts[id] || '').trim();
    if (!text) return toast('写下你的想法吧');
    if (text.length > 200) return toast('评论不能超过 200 字');
    if (!this.data.cloudReady || !wx.cloud) {
      this.setData({ ['commentDrafts.' + id]: '' });
      this.setPosts(this.data.posts.map(p => p.id === id ? Object.assign({}, p, {
        commentList: p.commentList.concat({
          id: Date.now(),
          author: this.data.user.nickName || '访客',
          text,
          isOwner: true
        }).slice(-50),
        commentCount: (p.commentCount || p.commentList.length) + 1
      }) : p));
      return;
    }
    cloudApi.addComment({
      postId: id,
      text,
      author: this.data.user.nickName || '傩艺访客'
    }).then(result => {
      if (!result.success) return this.cloudToast(result);
      const data = result.data || {};
      this.setData({
        ['commentDrafts.' + id]: ''
      });
      this.setPosts(this.data.posts.map(p => p.id === id ? Object.assign({}, p, {
        commentList: p.commentList.concat({
          id: data.id,
          author: data.author,
          text: data.text,
          isOwner: true
        }),
        commentCount: (p.commentCount || 0) + 1
      }) : p));
    });
  },
  openCompose() {
    this.setData({
      composeOpen: !this.data.composeOpen
    });
    if (this.data.composeOpen) wx.pageScrollTo({
      scrollTop: 0,
      duration: 200
    });
  },
  onComposeInput(e) {
    this.setData({
      composeText: e.detail.value
    });
  },
  selectComposeTopic(e) {
    this.setData({
      composeTopic: dataset(e).value
    });
  },
  choosePostImage() {
    const count = 3 - this.data.composeImages.length;
    if (count <= 0) return toast('最多添加3张图片');
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => this.setData({
        composeImages: this.data.composeImages.concat(res.tempFilePaths).slice(0, 3)
      }),
      fail: error => {
        if (!/cancel/.test(error.errMsg || '')) toast('图片选择失败，请重试');
      }
    });
  },
  removeComposeImage(e) {
    this.setData({
      composeImages: this.data.composeImages.filter((_, i) => i !== Number(dataset(e).index))
    });
  },
  publishPost() {
    if (this.data.publishing) return;
    const title = this.data.composeText.trim();
    if (!title && !this.data.composeImages.length) return toast('先写点内容或添加图片吧');
    if (title.length > 500) return toast('内容不能超过 500 字');
    this.setData({
      publishing: true
    });
    if (!this.data.cloudReady || !wx.cloud) {
      const savedImages = [];
      const files = this.data.composeImages.slice();
      const saveNext = index => {
        if (index >= files.length) {
          const post = {
            id: 'local-' + Date.now(),
            author: this.data.user.nickName || '访客',
            title: title || '分享一组傩艺图片',
            topic: this.data.composeTopic,
            images: savedImages,
            date: this.formatDate(new Date()),
            seed: false,
            liked: false,
            likeCount: 0,
            commentCount: 0,
            commentList: []
          };
          const previous = this.data.posts;
          this.setData({ posts: [post].concat(previous) });
          if (!this.persist()) {
            savedImages.forEach(filePath => wx.removeSavedFile({ filePath }));
            this.setData({ posts: previous, publishing: false });
            return;
          }
          this.setData({ composeText: '', composeImages: [], composeOpen: false, topic: '全部', publishing: false });
          this.refresh();
          toast('已保存到本机社区');
          return;
        }
        wx.saveFile({
          tempFilePath: files[index],
          success: result => {
            savedImages.push(result.savedFilePath);
            saveNext(index + 1);
          },
          fail: () => {
            savedImages.forEach(filePath => wx.removeSavedFile({ filePath }));
            this.setData({ publishing: false });
            toast('图片保存失败，内容仍在草稿中');
          }
        });
      };
      saveNext(0);
      return;
    }
    cloudApi.uploadImages(this.data.composeImages.slice(), 'nuoyi/posts').then(fileIDs => cloudApi.createPost({
      title: title || '分享一组傩艺图片',
      topic: this.data.composeTopic,
      images: fileIDs,
      author: this.data.user.nickName || '傩艺访客',
      date: this.formatDate(new Date())
    })).then(result => {
      if (!result.success) {
        this.setData({
          publishing: false
        });
        return this.cloudToast(result);
      }
      this.setData({
        composeText: '',
        composeImages: [],
        composeOpen: false,
        topic: '全部',
        publishing: false
      });
      toast('已发布到云端社区');
      this.syncCloudPosts();
    }).catch(() => {
      // 图片上传失败时保留草稿，避免用户白写一段
      this.setData({
        publishing: false
      });
      toast('发布失败，图片未上传成功，内容仍在草稿中');
    });
  },
  deletePost(e) {
    const post = this.data.posts.find(p => p.id === dataset(e).id);
    if (!post || post.seed) return;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后评论与点赞会一并清除，无法恢复。',
      success: res => {
        if (!res.confirm) return;
        if (!this.data.cloudReady || !wx.cloud) {
          const previous = this.data.posts;
          this.setData({ posts: previous.filter(p => p.id !== post.id) });
          if (!this.persist()) {
            this.setData({ posts: previous });
            return;
          }
          post.images.forEach(filePath => wx.removeSavedFile({ filePath }));
          this.refresh();
          toast('已删除');
          return;
        }
        cloudApi.deletePost(post.id).then(result => {
          if (!result.success) return this.cloudToast(result);
          this.setPosts(this.data.posts.filter(p => p.id !== post.id));
          toast('已删除');
        });
      }
    });
  },
  formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  },
  showProfilePanel(e) {
    const panel = dataset(e).panel;
    this.setData({
      profilePanel: this.data.profilePanel === panel ? '' : panel
    });
  },
  callUserAuth(action, extra) {
    if (!this.data.cloudReady || !wx.cloud) return Promise.reject(new Error('云服务尚未配置，请完成环境配置后重试'));
    return wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: Object.assign({
        type: 'userAuth',
        action
      }, extra || {})
    }).then(res => {
      if (!res.result || !res.result.success) throw new Error((res.result && res.result.message) || '云服务暂不可用，请稍后重试');
      return res.result.user;
    });
  },
  wechatLogin(silent) {
    if (this.data.authBusy) return;
    this.setData({
      authBusy: true,
      authMessage: ''
    });
    if (!this.data.cloudReady || !wx.cloud) {
      const saved = wx.getStorageSync(LOCAL_PROFILE);
      const user = saved && saved.localOnly ? saved : {
        _id: 'local-' + Date.now(),
        nickName: '傩艺访客',
        avatarUrl: '',
        account: '本机体验资料',
        localOnly: true
      };
      const stored = this.enterLocalUser(user);
      this.setData({
        authBusy: false,
        authMessage: stored ? '' : '本机存储不可用，请检查设备空间'
      });
      if (stored && silent !== true) toast('本机体验已开启');
      return Promise.resolve(stored);
    }
    return this.callUserAuth('wechatLogin').then(user => {
      this.enterUser(user);
      if (silent !== true) toast('登录成功');
    }).catch(error => this.setData({
      authMessage: error.message || '登录失败，请检查网络后重试'
    })).finally(() => this.setData({
      authBusy: false
    }));
  },
  enterUser(user) {
    this.setData({
      isLoggedIn: true,
      user,
      nicknameDraft: user.nickName || '',
      avatarDraft: '',
      avatarDisplay: user.avatarUrl || DEFAULT_AVATAR
    });
    try { wx.setStorageSync('nuoyi_profile_v2', { id: user._id }); } catch (error) { /* Cloud identity remains valid for this session. */ }
  },
  enterLocalUser(user) {
    const profile = Object.assign({
      _id: 'local-' + Date.now(),
      nickName: '傩艺访客',
      avatarUrl: '',
      account: '本机体验资料',
      localOnly: true
    }, user || {});
    try {
      wx.setStorageSync(LOCAL_PROFILE, profile);
    } catch (error) {
      return false;
    }
    this.setData({
      isLoggedIn: true,
      user: profile,
      nicknameDraft: profile.nickName || '',
      avatarDraft: '',
      avatarDisplay: profile.avatarUrl || DEFAULT_AVATAR
    });
    return true;
  },
  editProfile() {
    this.setData({
      profileEditing: !this.data.profileEditing,
      nicknameDraft: this.data.user.nickName || '',
      avatarDraft: '',
      avatarDisplay: this.data.user.avatarUrl || DEFAULT_AVATAR
    });
  },
  onNicknameInput(e) {
    this.setData({
      nicknameDraft: e.detail.value
    });
  },
  onNicknameReview(e) {
    if (e.detail.pass === false) {
      this.setData({
        nicknameDraft: ''
      });
      toast('请换一个昵称后重试');
    }
  },
  onChooseAvatar(e) {
    if (e.detail.avatarUrl) this.setData({
      avatarDraft: e.detail.avatarUrl,
      avatarDisplay: e.detail.avatarUrl
    });
  },
  saveProfile(e) {
    if (this.data.profileBusy || !this.data.isLoggedIn) return;
    const form = e && e.detail && e.detail.value;
    const nickName = String(form && typeof form.nickname === 'string' ? form.nickname : this.data.nicknameDraft).trim();
    if (!nickName || nickName.length > 20) return toast('昵称需要1至20个字符');
    this.setData({
      profileBusy: true
    });
    if (!this.data.cloudReady || !wx.cloud) {
      const saveLocal = avatarUrl => {
        const profile = Object.assign({}, this.data.user, {
          nickName,
          avatarUrl: avatarUrl || '',
          account: '本机体验资料',
          localOnly: true
        });
        const stored = this.enterLocalUser(profile);
        this.setData({
          profileEditing: !stored,
          profileBusy: false,
          authMessage: stored ? '' : '本机存储不可用，请检查设备空间'
        });
        toast(stored ? '资料已保存到本机' : '资料保存失败，请检查设备空间');
      };
      if (!this.data.avatarDraft) {
        saveLocal(this.data.user.avatarUrl || '');
        return;
      }
      return wx.saveFile({
        tempFilePath: this.data.avatarDraft,
        success: result => saveLocal(result.savedFilePath),
        fail: () => {
          this.setData({ profileBusy: false });
          toast('头像保存失败，请重试');
        }
      });
    }
    const save = (avatarUrl, uploaded) => this.callUserAuth('updateProfile', {
      nickName,
      avatarUrl
    }).then(user => {
      this.enterUser(user);
      this.setData({
        profileEditing: false,
        profileBusy: false
      });
      toast('资料已保存到云端');
    }).catch(error => {
      if (uploaded) wx.cloud.deleteFile({ fileList: [avatarUrl] }).catch(() => {});
      this.setData({
        profileBusy: false
      });
      toast(error.message || '保存失败，请重试');
    });
    if (!this.data.avatarDraft) return save(this.data.user.avatarUrl || '');
    const extension = ((this.data.avatarDraft.match(/\.(png|jpe?g|webp)(?:\?|$)/i) || [null, 'jpg'])[1]).toLowerCase();
    return wx.cloud.uploadFile({
      cloudPath: 'avatars/' + this.data.user._id + '/' + Date.now() + '.' + extension,
      filePath: this.data.avatarDraft
    }).then(upload => save(upload.fileID, true)).catch(error => {
      this.setData({
        profileBusy: false
      });
      toast(error.message || '头像上传失败');
    });
  },
  logout() {
    wx.removeStorageSync('nuoyi_profile_v2');
    wx.removeStorageSync(LOCAL_PROFILE);
    this.setData({
      isLoggedIn: false,
      user: {},
      avatarDisplay: DEFAULT_AVATAR,
      nicknameDraft: '',
      avatarDraft: '',
      profileEditing: false,
      authMessage: ''
    });
  },
  onShareAppMessage() {
    const article = this.data.detail === 'article' && this.data.selectedArticle;
    return {
      title: article ? article.title : '傩艺 · 一面千年，傩韵新生',
      path: '/pages/index/index' + (article ? '?article=' + article.id : ''),
      imageUrl: article ? article.image : catalog.art('masks.jpg')
    };
  }
});
