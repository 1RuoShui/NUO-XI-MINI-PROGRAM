# 傩艺小程序

现有微信小程序已依据《傩戏小程序待修改方面.docx》完善页面与交互，使用“小程序图片”内素材，并结合《傩启新纪》路演中的产品及品牌方向补充内容。原始 Word、PPT 和图片素材没有修改。

## 页面与功能

| 页面 | 当前实现 |
| --- | --- |
| 首页 | 三张专题轮播、跨内容搜索、快捷入口、精选商品、阅读推荐、实时更新的社区摘要 |
| 发现 | 六篇完整图文专题、四类知识内容、详情阅读、收藏和分享入口 |
| 商铺 | 十一种商品/服务展示、分类与关键词联动、价格排序、规格与数量选择、选购清单、保存选购意向 |
| 社区 | 三类创作话题、文字及最多三张图片分享、云端喜欢与评论、删除自己的帖子和评论 |
| 我的 | 微信云端身份登录、头像昵称编辑、本机收藏、云端选购意向、品牌说明 |

首页、发现和社区中的编辑部话题是创作引导，不是虚构用户发布的活动实况。商铺保留已有代码中可对应产品的展示价格；新增产品和缺少明确服务规格的项目显示“待询价”。未接入支付、订单履约、真实活动预约、AR 或蓝牙硬件。

## 配色与图片

统一以宣纸米白 `#F6F2EB` 为底、朱砂红 `#992C28` 为操作重点、墨黑 `#29251F` 为正文、旧金 `#9A7543` 为辅助色。首页强调专题封面，发现采用阅读卡片，商铺采用双列图录，社区用墨色话题区和浅色动态卡片；“我的”用印章与吉祥物呼应品牌。避免整屏背景图干扰文字阅读。

`miniprogram/images/artwork/` 是原图的压缩副本；`tools/prepare_nuoyi_assets.py` 可重新生成，原始素材保留。图片1–4用于演绎与面具主题，图片5–12、14用于产品与交流配图，图片6兼作傩小姿形象。图片13、15、16的装饰版本已整理，供后续排版扩展。竖版图片1另生成顶部取景的横版封面，保留人物面部。

## 在微信开发者工具运行

1. 导入本目录，项目已设置 `miniprogram/` 为小程序目录、`cloudfunctions/` 为云函数目录。
2. 使用当前账号可管理的 AppID `wxdcd2e82bf93ebf27` 和云环境 `cloud1-d0godfo32fe9db7aa`，基础库为 `3.17.2`。
3. 点击“编译”运行真实云端模式。云端模式使用微信身份、云数据库、云存储和云函数，不使用本机缓存替代云端数据。

## 云端环境与部署

项目已切换到当前开发者工具账号可管理的“傩艺”小程序 AppID `wxdcd2e82bf93ebf27`，并绑定其现有云环境 `cloud1-d0godfo32fe9db7aa`。该环境当前没有已部署的云函数。原云端版使用的 AppID `wxfe4ea9920e223491` 属于另一小程序，本项目不再依赖它的成员权限。

在微信开发者工具中分别右键 `cloudfunctions/nuoyiService` 和 `cloudfunctions/quickstartFunctions`，选择“上传并部署：云端安装依赖”。前者提供社区、清单和意向接口，后者只提供微信用户资料认证。两者都依赖各自 `package.json` 中的 `wx-server-sdk`。部署后 `miniprogram/app.js` 会初始化当前环境，社区、购物车、意向和用户资料均调用真实云函数。

云函数会创建 `nuoyi_posts`、`nuoyi_comments`、`nuoyi_likes`、`nuoyi_cart`、`nuoyi_intents` 和 `nuoyi_users` 集合。把这些集合的权限设为“仅管理端可读写”，让所有数据读写经过云函数的身份校验。

社区图片和头像通过云存储展示给其他用户；云存储需允许所有用户读取、仅创建者写入。头像路径使用 `avatars/<用户记录ID>/`，帖子图片使用 `nuoyi/posts/`。资料云函数会拒绝将他人的头像路径绑定到当前账号。

首次部署后，建议在开发者工具模拟器验证页面编译与云函数调用，再用真机依次测试：微信登录、修改资料、发帖/评论/点赞、修改清单、保存及删除意向。清单和意向是咨询记录，不会提交订单或扣款；收藏仍保存在本机。

云函数仅使用 `cloud.getWXContext().OPENID` 查找当前用户，不信任客户端传来的账号、用户ID或 OpenID。首次登录自动建立记录，重复/并发登录不会创建重复记录；已有绑定相同 OpenID 的旧用户记录可继续读取。旧账号密码表单和明文密码本地演示逻辑已从页面移除。客户端缓存仅用于决定是否重新读取资料，不能作为云端身份凭证。

用户通过 `chooseAvatar` 和 `input type="nickname"` 主动填写资料，不会静默获得微信头像昵称。实现参考：[微信官方头像昵称组件说明](https://github.com/wechat-miniprogram/mp-user-avatar/blob/master/README.md)、[腾讯云 CloudBase 云函数身份说明](https://docs.cloudbase.net/recipes/add-cloud-function-wechat-miniprogram)。没有额外引入头像昵称组件依赖。

云环境 ID 和 AppID 取自提供的云端版项目配置。当前工作区无法验证云端账号权限或远程函数部署状态，因此上传云函数及真机联调仍需在有权限的开发者工具账号中完成。选购意向不会自动发送给商家。

## 修改位置与检查

- `miniprogram/pages/index/index.*`：五个标签页、详情、样式及交互状态。
- `miniprogram/data/catalog.js`：专题正文、产品参数、编辑部话题与素材映射。
- `miniprogram/utils/nuoyi-cloud.js`：社区、清单与意向云函数调用封装。
- `cloudfunctions/nuoyiService/index.js`：社区互动、清单与意向的云端读写及归属校验。
- `cloudfunctions/quickstartFunctions/user-profile.js`：微信身份认证及资料创建、读取、更新。
- `tools/test_miniprogram.js`、`tools/test_cloudfunctions.js`：页面行为、资料身份隔离与云端接口行为测试。

运行检查：

```powershell
powershell -ExecutionPolicy Bypass -File tools/check_miniprogram.ps1
```

如果微信开发者工具安装在别处，追加 `-CompilerDirectory '<工具目录>/resources/app.asar.unpacked/node_modules/wcc-exec'`。脚本执行真实 WXML/WXSS 编译、JavaScript 语法检查和行为测试，同时检查当前小程序目录大小。

`tools/preview_miniprogram.js` 使用已编译的 WXML 树作 320/375 像素宽度的浏览器近似渲染，检查横向溢出并生成 `tools/qa/` 图片。该脚本依赖本机的 Codex Playwright 运行库与 Chromium，仅作为视觉检查辅助，不能替代微信真机的原生控件与云服务测试。主要页面修改前的源文件保存在 `tools/qa/original/`。
