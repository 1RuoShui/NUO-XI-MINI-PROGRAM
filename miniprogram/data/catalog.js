const art = name => '/images/artwork/' + name;

const products = [{
    id: 'zhu-rong',
    name: '傩纹神韵 · 祝融',
    category: '实物文创',
    price: 39,
    image: art('jewelry.jpg'),
    tag: '纹样入饰',
    description: '将火焰般的傩面线条，化作日常佩戴的一抹锋芒。',
    details: ['以项目中的火焰纹样首饰设计为灵感，保留向上舒展的轮廓与金属质感。', '图片为设计参考，材质、尺寸及实际售价以正式上架信息为准。'],
    specs: ['火焰纹款', '礼赠意向']
  },
  {
    id: 'walking-lantern',
    name: '傩影走马灯',
    category: '实物文创',
    price: 89,
    image: art('lantern.jpg'),
    tag: '光影叙事',
    description: '点亮一盏灯，让傩影在生活的角落慢慢流转。',
    details: ['从传统走马灯的光影变化出发，把傩戏人物轮廓融入家居陈设。', '可加入选购清单，后续确认灯体尺寸、供电方式及发货安排。'],
    specs: ['暖光款', '礼盒意向']
  },
  {
    id: 'five-directions',
    name: '五方猖神潮玩盲盒',
    category: '实物文创',
    price: 79,
    image: art('figure.jpg'),
    tag: '国潮新生',
    description: '以角色造型与傩面元素，探索传统文化的潮玩表达。',
    details: ['来自项目潮玩产品方向的造型参考，运用夸张比例、面具装饰与角色服饰。', '当前展示概念款，具体款式及盲盒规则尚待公布。'],
    specs: ['单盒意向', '系列收藏意向']
  },
  {
    id: 'fan-lamp',
    name: '傩面扇形灯',
    category: '实物文创',
    price: null,
    image: art('fan-lamp.jpg'),
    tag: '居家雅趣',
    description: '将折扇的层次与暖光结合，留住一室柔和的傩韵。',
    details: ['扇形灯是路演材料中的家居文创方向，呈现展开的扇面与通透的光影。', '可保存咨询意向；具体规格与报价待确认。'],
    specs: ['家居陈设', '礼赠咨询']
  },
  {
    id: 'stamp-kit',
    name: '有求必应 · DIY滚印礼盒',
    category: '实物文创',
    price: null,
    image: art('stamp-kit.jpg'),
    tag: '动手共创',
    description: '用纹样、纸张与滚印，完成一份自己的文化小礼物。',
    details: ['以滚印创作为入口，把传统纹样转化成可以参与的手作体验。', '图片为礼盒方向参考，配件和图案以正式产品说明为准。'],
    specs: ['个人手作', '团体活动']
  },
  {
    id: 'costume',
    name: '物生群像 · 创意傩服',
    category: '实物文创',
    price: null,
    image: art('costume.jpg'),
    tag: '国风穿搭',
    description: '从傩服色彩与层次中，寻找现代服饰设计的灵感。',
    details: ['保留红黑对比与层叠轮廓，探索日常穿搭、展演与主题拍摄场景。', '尺码、面料及定制范围需另行确认。'],
    specs: ['服饰咨询', '妆造搭配']
  },
  {
    id: 'pendant',
    name: '傩面神韵 · 纹样挂饰',
    category: '实物文创',
    price: null,
    image: art('pendant.jpg'),
    tag: '随身傩意',
    description: '把面具的对称线条与浮雕感，凝成一枚随身挂饰。',
    details: ['由提供的挂饰素材延展的产品展示，重点观察眼部、鼻梁和卷曲线条。', '图片为设计参考，实际工艺与材质待确认。'],
    specs: ['挂饰意向', '定制咨询']
  },
  {
    id: 'hand-seal',
    name: '是傩是我 · 手诀面具',
    category: '数字交互',
    price: 69,
    image: art('portrait.jpg'),
    tag: '交互构想',
    description: '以手势与傩面形象相连，探索属于自己的互动祝福。',
    details: ['路演中提出以手诀为入口的数字互动方向，让观众主动参与角色表达。', '当前小程序展示设计方案，尚未接入摄像头识别或AR功能。'],
    specs: ['个人体验意向', '活动合作']
  },
  {
    id: 'dance-ai',
    name: '傩舞 · 蓝牙AI跳舞机',
    category: '数字交互',
    price: 399,
    image: art('dance.jpg'),
    tag: '舞动灵感',
    description: '让舞步成为连接传统表演与数字体验的入口。',
    details: ['以傩舞节奏和动作设计为灵感的互动产品方向，图为舞蹈主题概念配图。', '当前可了解方案并记录意向，硬件连接与动作评分尚未上线。'],
    specs: ['体验意向', '展陈合作']
  },
  {
    id: 'study',
    name: '寻傩 · 主题研学',
    category: '线下服务',
    price: null,
    image: art('ritual.jpg'),
    tag: '走近非遗',
    description: '从看面具、听故事到参与手作，探索傩文化的多重面貌。',
    details: ['研学方向包含文化导赏、面具观察、主题讨论与创作体验。', '城市、日期、人数和实际行程需要与服务方确认；保存意向不等于预约成功。'],
    specs: ['个人咨询', '学校团体', '机构合作']
  },
  {
    id: 'handmade',
    name: '傩面生 · 面具手作',
    category: '线下服务',
    price: null,
    image: art('masks.jpg'),
    tag: '手作时光',
    description: '从线稿与配色开始，做一张有自己表达的面具。',
    details: ['以面具纹样观察和创意彩绘为体验方向，具体课程由实际承办方安排。', '材料、适龄范围、场次和费用待确认，当前仅保存体验意向。'],
    specs: ['个人体验', '亲子体验', '团体工作坊']
  }
].map(item => Object.assign(item, {
  priceLabel: item.price === null ? '待询价' : '¥' + item.price
}));

// Editorial copy is based on the supplied project direction, not event reports.
const articles = [{
    id: 'first-meeting',
    title: '初见傩戏：面具背后的文化表达',
    category: '傩戏入门',
    readTime: '3分钟',
    image: art('ritual-cover.jpg'),
    excerpt: '从面具、服饰与舞步出发，找到认识傩戏的入口。',
    sections: [{
        title: '先看一张面具',
        text: '不妨从眼睛、眉线与嘴部开始观察：有的线条向外张扬，有的表情沉静。面具让人物的性格更醒目，也让观众在远处读到角色的情绪。不同地域和表演传统中的具体含义，需要结合当地讲述理解。'
      },
      {
        title: '再看一身行头',
        text: '面具并不是孤立的装饰。服饰、头饰、身体姿态与舞台环境共同构成完整形象。把这些细节放在一起看，比单独记住一个造型更容易理解表演。'
      },
      {
        title: '把好奇带到现场',
        text: '观看时可以记录三个问题：这个角色是谁？动作为什么这样重复？当地人如何介绍它？尊重现场的观看和拍摄安排，让了解从倾听开始。'
      }
    ]
  },
  {
    id: 'mask-pattern',
    title: '一面一世界：读懂傩面的线条',
    category: '面具美学',
    readTime: '4分钟',
    image: art('masks.jpg'),
    excerpt: '沿着眉眼、獠牙与纹饰，练习一次细致的观察。',
    sections: [{
        title: '从轮廓到细节',
        text: '先观察外轮廓是方、圆还是向外伸展，再看五官比例。眉眼、鼻梁和嘴角的处理，会改变一张面具给人的第一印象。'
      },
      {
        title: '色彩没有唯一答案',
        text: '尝试记录主色、辅色与点缀色的关系。鲜明的对比能强化角色形象，但不要把某一种颜色直接等同于所有地区通用的角色含义。'
      },
      {
        title: '做一张观察卡',
        text: '选一张喜欢的面具，画下最有辨识度的三条线，再写一句自己的感受。把观察卡带到社区，与其他人的视角作比较。'
      }
    ]
  },
  {
    id: 'craft',
    title: '从观察到创作：一张傩面的手作笔记',
    category: '匠心手作',
    readTime: '3分钟',
    image: art('pendant.jpg'),
    excerpt: '用观察、线稿和配色，展开自己的创意练习。',
    sections: [{
        title: '先理解，再动手',
        text: '创作前选一个清楚的主题，比如祝愿、守护或团圆。整理参考图时标记来源，区分传统作品和自己的再设计。'
      },
      {
        title: '让线条建立秩序',
        text: '先画中轴与主要轮廓，再逐步添加眉眼和纹饰。对称可以带来稳定感，局部变化则能形成角色的表情。'
      },
      {
        title: '为作品留一段说明',
        text: '记录采用的颜色、最喜欢的细节和修改过程。这里的创意练习不替代专业传承技艺；涉及雕刻等工具操作，应在有条件的工作坊接受指导。'
      }
    ]
  },
  {
    id: 'daily-design',
    title: '当傩纹走进日常：文创设计的几个方向',
    category: '当代新生',
    readTime: '4分钟',
    image: art('jewelry.jpg'),
    excerpt: '首饰、灯具与滚印，让文化观察延伸到生活。',
    sections: [{
        title: '从一个细节出发',
        text: '项目中的祝融首饰提取火焰般的线条，走马灯关注人物轮廓与光影，滚印礼盒则邀请使用者参与图案组合。不同产品回应不同的使用场景。'
      },
      {
        title: '保留可辨识的表达',
        text: '转化为日用品时，可以简化复杂纹饰，但需要保留设计的来处。给产品补上一段来源说明，能帮助使用者从好看进一步走向理解。'
      },
      {
        title: '看见设计与实物的距离',
        text: '本项目展示的图片包含设计与氛围参考。选购时还需要了解材质、尺寸、制作工艺和服务安排，设计概念本身不代表量产承诺。'
      }
    ]
  },
  {
    id: 'digital',
    title: '让观众参与：傩文化的数字互动构想',
    category: '当代新生',
    readTime: '3分钟',
    image: art('fire.jpg'),
    excerpt: '从手诀到舞步，探索文化体验的更多入口。',
    sections: [{
        title: '从观看到尝试',
        text: '路演材料提出手诀面具、蓝牙跳舞机与AR剧本体验等方向。共同的思路是把观看转化为主动探索，让参与者通过动作或选择进入故事。'
      },
      {
        title: '技术服务于内容',
        text: '好的互动需要清楚的角色设定、动作说明和反馈。技术展示之外，体验还应帮助参与者理解相关文化背景，而不是只留下一个滤镜。'
      },
      {
        title: '一起完善构想',
        text: '当前小程序提供图文展示与创意交流，尚未内置AR识别和硬件连接。你可以在社区记录想尝试的互动方式，为后续设计提供灵感。'
      }
    ]
  },
  {
    id: 'mascot',
    title: '认识傩小姿：一位新的文化向导',
    category: '当代新生',
    readTime: '2分钟',
    image: art('mascot.png'),
    excerpt: '把傩面、傩袍与机器人元素放进一个新角色。',
    sections: [{
        title: '传统元素的新组合',
        text: '傩小姿是项目材料中的吉祥物形象，融合面具、服饰与机器人元素。圆润的比例与鲜明的配色，让角色更适合出现在导览与互动场景中。'
      },
      {
        title: '给角色一个任务',
        text: '作为文化向导，它可以带你观察一张面具、认识一种纹样，或者完成一次创作练习。角色的意义来自持续讲述的内容。'
      },
      {
        title: '你的下一站',
        text: '从发现页选择一篇感兴趣的专题，再到社区分享自己的观察。一次小小的记录，也可以成为了解傩文化的起点。'
      }
    ]
  }
];

const posts = [{
    id: 'seed-mask',
    author: '傩艺编辑部',
    title: '今日创作题：用三条线，画下你眼中的傩面。先看看这组眉眼与轮廓，你最想保留哪个细节？',
    topic: '纹样共创',
    images: [art('masks.jpg'), art('pendant.jpg')],
    date: '创作话题',
    seed: true,
    liked: false,
    commentList: []
  },
  {
    id: 'seed-light',
    author: '傩艺编辑部',
    title: '把傩韵带进房间：走马灯与扇形灯，你更喜欢哪一种光影？分享一个你想摆放它的角落。',
    topic: '好物灵感',
    images: [art('lantern.jpg'), art('fan-lamp.jpg')],
    date: '灵感征集',
    seed: true,
    liked: false,
    commentList: []
  },
  {
    id: 'seed-outfit',
    author: '傩艺编辑部',
    title: '红与黑的穿搭练习。看完这张服饰参考，你会怎样搭配头饰、配饰与背景？欢迎写下你的方案。',
    topic: '体验手记',
    images: [art('costume.jpg')],
    date: '体验话题',
    seed: true,
    liked: false,
    commentList: []
  }
];

module.exports = {
  products,
  articles,
  posts,
  art
};
