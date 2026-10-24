# nuoyiService 云函数

此函数提供社区动态、评论、点赞、选购清单和购买意向接口。所有记录按微信云函数上下文中的 `OPENID` 隔离；删除和修改操作会在服务端检查记录归属。

## 部署

1. 确认 `project.config.json`、`miniprogram/app.js` 使用同一小程序账号和云环境。
2. 在微信开发者工具中右键 `cloudfunctions/nuoyiService`，选择“上传并部署：云端安装依赖”。
3. 在云开发控制台确认云函数已部署，并为其数据库集合设置仅管理端可读写。

## 数据集合

首次调用时会自动创建以下集合；若环境未授予自动建集合能力，可在控制台手动创建：

| 集合 | 内容 |
| --- | --- |
| `nuoyi_posts` | 社区动态、作者、图片及计数 |
| `nuoyi_comments` | 动态评论与评论作者 |
| `nuoyi_likes` | 用户对动态的喜欢记录 |
| `nuoyi_cart` | 当前微信用户的选购清单 |
| `nuoyi_intents` | 用户保存的选购意向快照 |

## 调用接口

客户端统一调用 `wx.cloud.callFunction({ name: "nuoyiService", data: { action, ...参数 } })`。结果格式为 `{ success, code, message, data }`。

| action | 参数 | 作用 |
| --- | --- | --- |
| `listPosts` | `limit` | 查询动态、评论、喜欢数和当前用户状态 |
| `createPost` | `title`, `topic`, `images[]`, `author`, `date` | 发布文字或图片动态 |
| `deletePost` | `postId` | 删除本人动态及其评论、喜欢记录 |
| `addComment` | `postId`, `text`, `author` | 发表评论 |
| `deleteComment` | `commentId` | 删除本人评论 |
| `toggleLike` | `postId` | 添加或取消喜欢 |
| `listCart` | 无 | 查询本人清单及数量、金额摘要 |
| `addCartItem` | `productId`, `spec`, `name`, `price`, `image`, `category`, `quantity` | 加入或合并清单项 |
| `updateCartQuantity` | `key`, `quantity` | 修改清单项数量 |
| `removeCartItem` | `key` | 删除清单项 |
| `clearCart` | 无 | 清空本人清单 |
| `submitIntent` | `date` | 依据云端清单创建意向快照并清空清单 |
| `listIntents` | 无 | 查询本人意向记录 |
| `deleteIntent` | `intentId` | 删除本人意向记录 |

云存储需允许所有用户读取、仅创建者写入，供社区图片和头像跨用户展示；资料函数会限制头像只能绑定到当前用户目录。当前项目未接入支付或订单履约，清单价格仅用于展示与咨询意向。
