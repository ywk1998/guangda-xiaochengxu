// pages/index/index.js - 首页（直接使用云数据库）
const { formatDate } = require('../../utils/util');

Page({
  data: {
    banners: [],
    stats: [],
    news: [],
    companyInfo: {},
    loading: true,
    // 快捷入口
    quickLinks: [
      { id: 1, icon: '🏭', label: '产品服务', url: '/pages/products/products' },
      { id: 2, icon: '📞', label: '联系我们', url: '/pages/contact/contact' },
      { id: 3, icon: '📝', label: '施工日志', url: '/pages/construction-log/construction-log' },
      { id: 4, icon: '🚚', label: '拌站出料表', url: '/pages/output-list/output-list' },
      { id: 5, icon: '⛽', label: '拌站油料入库表', url: '/pages/diesel-entry/diesel-entry' },
      { id: 6, icon: '🛢', label: '站点油料领用表', url: '/pages/diesel-out/diesel-out' },
      { id: 7, icon: '🚛', label: '加油送油记录表', url: '/pages/diesel-delivery/diesel-delivery' },
      { id: 8, icon: '📊', label: '今日挂牌价', url: '/pages/price-board/price-board' },
      { id: 9, icon: '💰', label: '产品调价表', url: '/pages/cost-calc/cost-calc' },
      { id: 10, icon: '📋', label: '施工日志汇总', url: '/pages/construction-log-summary/construction-log-summary' },
      { id: 11, icon: '🔧', label: '机械设备保养', url: '/pages/equipment-maintenance/equipment-maintenance' },
      { id: 12, icon: '🏗', label: '拌合楼保养', url: '/pages/mixing-tower-maintenance/mixing-tower-maintenance' }
    ]
  },

  onLoad() {
    const app = getApp();
    this.setData({ companyInfo: app.globalData.companyInfo });
    this.loadAllData();
  },

  onShow() {
    // 设置 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadAllData().then(() => wx.stopPullDownRefresh());
  },

  async loadAllData() {
    this.setData({ loading: true });

    const db = wx.cloud.database();

    try {
      // 并行获取横幅数据和统计数据
      const [bannerRes, statsRes] = await Promise.all([
        db.collection('banners').where({ status: 1 }).orderBy('sort', 'asc').get(),
        db.collection('stats').where({ status: 1 }).get()
      ]);

      // 处理横幅图
      const banners = (bannerRes.data || []).map(b => ({
        id: b._id,
        imageUrl: this.resolveImageUrl(b.imageUrl),
        title: b.title,
        link: b.link || ''
      }));

      // 如果云数据库没有横幅图数据，使用本地图片兜底
      if (banners.length === 0) {
        banners.push(
          { id: 1, imageUrl: '/images/banner/4.jpg', title: '科技创新引领未来', link: '' },
          { id: 2, imageUrl: '/images/banner/5.jpg', title: '创新驱动发展', link: '' },
          { id: 3, imageUrl: '/images/banner/6.jpg', title: '智慧赋能企业', link: '' }
        );
      }

      // 处理统计数据
      const stats = statsRes.data || [];

      this.setData({
        banners,
        stats,
        loading: false
      });
    } catch (e) {
      console.error('加载数据失败', e);
      // 加载失败时使用本地数据
      this.setData({
        banners: [
          { id: 1, imageUrl: '/images/banner/4.jpg', title: '科技创新引领未来' },
          { id: 2, imageUrl: '/images/banner/5.jpg', title: '创新驱动发展' },
          { id: 3, imageUrl: '/images/banner/6.jpg', title: '智慧赋能企业' }
        ],
        stats: [
          { label: '成立年限', value: '10+', unit: '年' },
          { label: '服务项目', value: '100+', unit: '个' },
          { label: '专利技术', value: '100+', unit: '项' },
          { label: '团队规模', value: '200+', unit: '人' }
        ],
        loading: false
      });
    }
  },

  resolveImageUrl(url) {
    if (!url) return '';
    if (/^(https?:|cloud:|data:)/.test(url)) return url;
    if (url.startsWith('/uploads/')) {
      const app = getApp();
      const baseUrl = (app.globalData.baseUrl || '').replace(/\/api$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  },

  // 横幅图点击
  onBannerTap(e) {
    const { link } = e.currentTarget.dataset;
    if (link) wx.navigateTo({ url: link });
  },

  // 快捷入口点击
  onQuickLinkTap(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    const tabPages = [
      '/pages/index/index',
      '/pages/products/products',
      '/pages/contact/contact',
      '/pages/profile/profile'
    ];
    if (tabPages.includes(url)) {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  },

  // 查看全部产品
  goProducts() {
    wx.switchTab({ url: '/pages/products/products' });
  },

  // 新闻点击
  onNewsTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.showToast({ title: '详情功能开发中', icon: 'none' });
  },

  // 联系我们
  goContact() {
    wx.switchTab({ url: '/pages/contact/contact' });
  },

  // 拨打电话
  onCallTap() {
    const { phone } = this.data.companyInfo;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: this.data.companyInfo.name,
      desc: this.data.companyInfo.slogan,
      path: '/pages/index/index'
    };
  }
});
