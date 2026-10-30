// pages/price-board/price-board.js - 今日挂牌价
const db = wx.cloud.database();

Page({
  data: {
    todayDate: '',
    currentStation: 0,
    stations: [],
    priceList: []
  },

  onLoad() {
    this.initDate();
    this.loadStations();
  },

  initDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ todayDate: `${y}-${m}-${d}` });
  },

  // 从 price_board 集合加载站点数据
  async loadStations() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await db.collection('price_board')
        .field({ stationName: true })
        .get();

      // 去重
      const stationMap = {};
      (res.data || []).forEach(item => {
        if (item.stationName) {
          stationMap[item.stationName] = true;
        }
      });
      const stations = Object.keys(stationMap).map(name => ({ name }));

      this.setData({ stations });
      wx.hideLoading();

      if (stations.length > 0) {
        this.loadPriceData();
      }
    } catch (e) {
      wx.hideLoading();
      console.error('加载站点失败', e);
      wx.showToast({ title: '加载站点失败', icon: 'none' });
    }
  },

  // 从 price_board 集合加载价格数据，并计算价差
  async loadPriceData() {
    if (this.data.stations.length === 0) return;

    const stationName = this.data.stations[this.data.currentStation]?.name;
    if (!stationName) return;

    try {
      const res = await db.collection('price_board')
        .where({ stationName: stationName })
        .get();

      const priceList = (res.data || []).map(item => {
        const oldPrice = parseFloat(item.OldPrice) || 0;
        const newPrice = parseFloat(item.NewPrice) || 0;
        const diff = newPrice - oldPrice;
        return {
          ...item,
          priceDiff: diff,
          diffClass: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        };
      });

      this.setData({ priceList });
    } catch (e) {
      console.error('加载价格数据失败', e);
      this.setData({ priceList: [] });
    }
  },

  // 切换站点
  switchStation(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentStation: index });
    this.loadPriceData();
  }
});
