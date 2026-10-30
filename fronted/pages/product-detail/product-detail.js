// pages/product-detail/product-detail.js - 产品详情页（直接使用云数据库）
const { safeNavigateBack } = require('../../utils/navigation');

Page({
  data: {
    product: null,
    heroImages: [],      // 轮播图临时链接列表（云端）
    localImages: [],    // 本地轮播图列表
    swiperCurrent: 0,    // 当前轮播下标（用于自定义指示器）
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    this.productId = id;
    this.loadDetail(id);
  },

  async loadDetail(id) {
    this.setData({ loading: true });

    const db = wx.cloud.database();

    // category 英文 → 中文映射
    const categoryMap = {
      'paving': '道路摊铺',
      'equipment': '设备租赁',
      'material': '材料供应',
      'service': '工程服务'
    };

    try {
      const res = await db.collection('products').doc(id).get();
      const product = res.data;
      if (!product) {
        wx.showToast({ title: '未找到该产品', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      // 将 category 英文转中文
      const displayCategory = categoryMap[product.category] || product.category || '产品服务';
      product._displayCategory = displayCategory;

      // 处理 icon：如果是云存储路径，转为临时链接
      if (product.icon && product.icon.startsWith('cloud://')) {
        try {
          const iconRes = await wx.cloud.downloadFile({ fileID: product.icon });
          product.icon = iconRes.tempFilePath || '';
        } catch (e) {
          product.icon = '';
        }
      }

      wx.setNavigationBarTitle({ title: product.name || '产品详情' });
      // 隐藏系统导航栏（使用自定义悬浮返回按钮）
      wx.hideHomeButton && wx.hideHomeButton();

      // ===== 处理轮播图片 =====
      // product.images 格式：["/images/xxx.jpg", "cloud://xxx.jpg"]  混合本地路径和云端路径
      const rawImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
      const localImages = [];   // 本地路径（/images/...）
      const heroImages = [];    // 云端路径（cloud://...），需下载

      for (const img of rawImages) {
        if (!img) continue;
        if (img.startsWith('/')) {
          // 本地图片路径，直接使用
          localImages.push(img);
        } else if (img.startsWith('cloud://')) {
          // 云存储图片，需先下载成临时路径
          try {
            const r = await wx.cloud.downloadFile({ fileID: img });
            if (r.tempFilePath) heroImages.push(r.tempFilePath);
          } catch (e) {
            console.warn('[product-detail] 轮播图下载失败:', img, e);
          }
        }
      }

      // 兼容处理 cases 数据：旧格式字符串数组 → 对象数组
      const rawCases = Array.isArray(product.cases) ? product.cases : [];
      let cases = [];
      if (rawCases.length > 0 && typeof rawCases[0] === 'object') {
        // 新格式：[{name, image, desc}]，处理 cloud:// 图片
        const caseCloudPaths = rawCases.filter(c => c.image && c.image.startsWith('cloud://'));
        const caseTempMap = {};
        for (const c of caseCloudPaths) {
          try {
            const r = await wx.cloud.downloadFile({ fileID: c.image });
            if (r.tempFilePath) caseTempMap[c.image] = r.tempFilePath;
          } catch (e) {
            console.warn('[product-detail] 案例图片下载失败:', c.image, e);
          }
        }
        cases = rawCases.map(c => ({
          name: c.name || '',
          image: c.image ? (c.image.startsWith('cloud://') ? (caseTempMap[c.image] || '') : c.image) : '',
          desc: c.desc || ''
        }));
      } else {
        // 旧格式：['项目名1', '项目名2']
        cases = rawCases.map(name => ({ name: name || '', image: '', desc: '' }));
      }
      product.cases = cases;

      this.setData({ product, heroImages, localImages, loading: false });
    } catch (err) {
      console.error('加载产品详情失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 轮播图切换
  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current });
  },

  // 预览轮播大图（优先预览本地图片，云端图片兜底）
  onPreviewImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    const urls = this.data.localImages.length > 0
      ? this.data.localImages
      : this.data.heroImages;
    wx.previewImage({ current: src, urls });
  },

  // 返回上一页
  onBack() {
    safeNavigateBack('/pages/products/products');
  },

  // 点击案例图片预览大图
  onPreviewCase(e) {
    const img = e.currentTarget.dataset.img;
    if (!img) return;
    wx.previewImage({ current: img, urls: [img] });
  },

  // 联系咨询
  onConsult() {
    wx.showActionSheet({
      itemList: ['拨打电话咨询', '在线留言'],
      success: (res) => {
        if (res.tapIndex === 0) {
          const app = getApp();
          wx.makePhoneCall({ phoneNumber: app.globalData.companyInfo.phone });
        } else {
          wx.switchTab({ url: '/pages/contact/contact' });
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { product } = this.data;
    return {
      title: product ? product.name : '产品详情',
      path: `/pages/product-detail/product-detail?id=${this.productId}`
    };
  }
});
