// utils/request.js - 统一请求封装

/**
 * 封装 wx.request，支持 token 注入、错误统一处理、mock 模式
 * @param {object} options - { url, method, data, header, mock }
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    useMock = false
  } = options;

  return new Promise((resolve, reject) => {
    // ===== Mock 模式（无后端时使用）=====
    if (useMock) {
      const mockData = getMockData(url, data);
      setTimeout(() => resolve(mockData), 300); // 模拟网络延迟
      return;
    }

    // ===== 真实请求 =====
    const app = typeof getApp === 'function' ? getApp() : null;
    const baseUrl = app?.globalData?.baseUrl || 'https://www.gdyd.top/api';
    const token = wx.getStorageSync('token') || '';

    wx.request({
      url: baseUrl + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...header
      },
      success: (res) => {
        const body = res.data || {};
        const { code, data: resData, message } = body;
        if (res.statusCode >= 200 && res.statusCode < 300 && (code === 0 || code === 200)) {
          resolve(resData);
          return;
        }

        const errorMessage = message || `网络错误 ${res.statusCode}`;
        if (res.statusCode === 401 || code === 401) {
          const isAuthRequest = url.startsWith('/auth/');
          if (!isAuthRequest) {
            if (app?.logout) app.logout();
            if (app?.openLoginPanel) app.openLoginPanel();
          }
          reject(new Error(errorMessage || '登录已过期'));
          return;
        }

        wx.showToast({ title: errorMessage || '请求失败', icon: 'none' });
        reject(new Error(errorMessage));
      },
      fail: (err) => {
        wx.showToast({ title: '网络连接失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

// ===== Mock 数据中心 =====
function getMockData(url, data) {
  const mockMap = {
    '/banner/list': [
      { id: 1, imageUrl: '/images/banner/4.jpg', title: '科技引领未来', link: '' },
      { id: 2, imageUrl: '/images/banner/5.jpg', title: '创新驱动发展', link: '' },
      { id: 3, imageUrl: '/images/banner/6.jpg', title: '智慧赋能企业', link: '' }
    ],
    '/company/stats': [
      { label: '成立年限', value: '10+', unit: '年' },
      { label: '服务项目', value: '100+', unit: '家' },
      { label: '专利技术', value: '100+', unit: '项' },
      { label: '团队规模', value: '200+', unit: '人' }
    ],
    '/product/list': [
      {
        id: 1,
        name: '沥青混凝土搅拌站',
        category: '搅拌站生产',
        desc: '大型固定式/移动式沥青搅拌站，年产可达30万吨，供应各类规格沥青混凝土',
        icon: '🏭',
        tags: ['产能30万吨', '环保达标', '规格齐全'],
        coverColor: '#1a6fc4'
      },
      {
        id: 2,
        name: '道路沥青摊铺施工',
        category: '工程施工',
        desc: '专业摊铺施工团队，配备先进摊铺机、压路机，承接各等级公路沥青摊铺工程',
        icon: '🛤️',
        tags: ['施工团队', '设备齐全', '品质保障'],
        coverColor: '#e67e22'
      },
      {
        id: 3,
        name: '沥青搅拌设备租赁',
        category: '设备租赁',
        desc: '长期/短期租赁沥青搅拌站、摊铺机、压路机等全套路面施工设备，型号齐全',
        icon: '🚌',
        tags: ['设备出租', '型号齐全', '灵活租期'],
        coverColor: '#27ae60'
      },
      {
        id: 4,
        name: '路面养护与维修',
        category: '养护服务',
        desc: '沥青路面日常养护、局部修补、铣刨重铺，延长道路使用寿命',
        icon: '🛠️',
        tags: ['快速响应', '预防养护', '成本优化'],
        coverColor: '#8e44ad'
      },
      {
        id: 5,
        name: '沥青混凝土技术咨询',
        category: '技术支持',
        desc: '配合比设计优化、材料检测、技术培训，助力项目降本增效',
        icon: '📋',
        tags: ['配比优化', '材料检测', '技术培训'],
        coverColor: '#e74c3c'
      },
      {
        id: 6,
        name: '工程项目承包',
        category: '工程承包',
        desc: '承接市政道路、园区道路、高速公路等沥青路面工程，提供设计施工一体化服务',
        icon: '🏗️',
        tags: ['EPC总包', '资质齐全', '全程监管'],
        coverColor: '#f39c12'
      }
    ],
    '/product/detail': {
      id: data.id || 1,
      name: '沥青混凝土搅拌站',
      category: '搅拌站生产',
      icon: '🏭',
      coverColor: '#1a6fc4',
      tags: ['产能30万吨', '环保达标', '规格齐全'],
      desc: '大型固定式/移动式沥青搅拌站，年产可达30万吨，供应各类规格沥青混凝土',
      detail: '我司沥青混凝土搅拌站采用国内外先进设备，可生产AC、SMA、OGFC等各类型沥青混凝土，年产能达30万吨以上。\n\n搅拌站配备完善的环保设施，粉尘、噪音排放均达国家一级标准。生产的沥青混凝土广泛应用于高速公路、市政道路、机场跑道、桥面铺装等各类工程项目。\n\n核心优势：\n- 全封闭环保型搅拌楼，粉尘排放<20mg/m³\n- 电脑全自动控制，计量精度达国标一级\n- 冷骨料级配精准控制，油石比误差<0.1%\n- 可生产改性沥青、SBS沥青、橡胶沥青等特种沥青',
      features: [
        { icon: '🏭', title: '大型产能', desc: '年产30万吨，充足供应' },
        { icon: '🌿', title: '环保达标', desc: '全封闭设计，排放达标' },
        { icon: '📐', title: '规格齐全', desc: 'AC/SMA/OGFC全覆盖' },
        { icon: '🔬', title: '品质把控', desc: '每批次检测，数据可追溯' }
      ],
      cases: ['某省高速公里项目', '市区政道路改造工程', '工业园区道路建设'],
      price: '按工程量计价',
      contactTip: '如需报价或了解详情，请联系我们的销售顾问'
    },
    '/news/list': [
      { id: 1, title: '广东远大集团荣获2025年度最佳科技创新奖', date: '2025-12-15', tag: '公司动态' },
      { id: 2, title: '远大智能数据分析平台 v3.0 正式发布', date: '2025-11-28', tag: '产品更新' },
      { id: 3, title: '惠霞项目开工！', date: '2025-10-10', tag: '施工动态' }
    ]
  };

  return mockMap[url] || {};
}

module.exports = { request };
