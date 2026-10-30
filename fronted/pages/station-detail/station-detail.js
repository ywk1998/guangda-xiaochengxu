// pages/station-detail/station-detail.js - 站点详情页（直接使用云数据库）
const { safeNavigateBack } = require('../../utils/navigation');

Page({
  data: {
    station: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadDetail(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      safeNavigateBack('/pages/products/products');
    }
  },

  loadDetail(id) {
    this.setData({ loading: true });

    const db = wx.cloud.database();

    db.collection('mixing_station')
      .doc(id)
      .get()
      .then(res => {
        const station = res.data;
        if (station) {
          // 兼容处理：images 数组优先，否则用旧的单个 image 字段
          if (!station.images && station.image) {
            station.images = [station.image];
          }
          this.setData({
            station: station,
            loading: false
          });
        } else {
          wx.showToast({ title: '未找到该搅拌站', icon: 'none' });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('加载详情失败', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  // 电话咨询
  onCall() {
    const phone = this.data.station?.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    }
  },

  // 导航
  onNavigate() {
    const station = this.data.station;
    if (station && station.latitude && station.longitude) {
      wx.openLocation({
        latitude: station.latitude,
        longitude: station.longitude,
        name: station.name,
        address: station.address,
        scale: 15
      });
    } else {
      wx.showToast({ title: '暂无位置信息', icon: 'none' });
    }
  },

  goBack() {
    safeNavigateBack('/pages/products/products');
  },

  onShareAppMessage() {
    const station = this.data.station;
    return {
      title: station ? station.name : '搅拌站详情',
      path: `/pages/station-detail/station-detail?id=${station._id}`
    };
  }
});
