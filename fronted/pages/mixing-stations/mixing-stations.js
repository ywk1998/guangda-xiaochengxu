// 沥青搅拌站 - 列表页逻辑（直接使用云数据库）
const { safeNavigateBack } = require('../../utils/navigation');

Page({
  data: {
    keyword: '',
    searched: false,
    stations: [],
    filteredStations: [],
    loading: true
  },

  onLoad() {
    this.loadStations();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadStations();
  },

  // 加载搅拌站列表（直接使用云数据库API）
  loadStations() {
    this.setData({ loading: true });

    const db = wx.cloud.database();

    db.collection('mixing_station')
      .where({ status: 1 })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const stations = res.data || [];
        
        // 本地默认搅拌站图片
        const defaultImages = [
          '/images/stations/xiaojinkou.jpg',
          '/images/stations/longmen.jpg',
          '/images/stations/maan.jpg'
        ];
        
        // 格式化数据
        const formattedStations = stations.map((s, index) => ({
          _id: s._id,
          id: s._id,
          name: s.name || '',
          address: s.address || '',
          type: s.type || '沥青混合料',
          capacity: s.capacity || '',
          tankSize: s.tankSize || '',
          phone: s.phone || '',
          distance: s.distance || '',
          status: s.status === 1 ? '生产中' : '已停用',
          statusClass: s.status === 1 ? 'running' : 'stopped',
          // 优先使用云存储图片，如果没有则使用本地默认图片
          image: s.image || defaultImages[index % defaultImages.length],
          rawImage: s.image || '', // 保存原始 cloud:// 路径
          tags: s.tags || [],
          detail: s.detail || {}
        }));
        
        // 处理云存储图片，获取临时链接
        this.processCloudImages(formattedStations);
      })
      .catch(err => {
        console.error('加载搅拌站失败', err);
        // 如果云数据库失败，使用本地数据
        this.setData({
          stations: [],
          filteredStations: [],
          loading: false
        });
        wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
      });
  },

  // 处理云存储图片，获取临时链接
  processCloudImages(stations) {
    const cloudImages = stations
      .filter(s => s.rawImage && s.rawImage.startsWith('cloud://'))
      .map(s => s.rawImage);
    
    if (cloudImages.length === 0) {
      // 没有云存储图片，直接使用本地图片
      this.setData({
        stations: stations,
        filteredStations: stations,
        loading: false
      });
      return;
    }
    
    // 批量获取云存储的临时链接
    wx.cloud.getTempFileURL({
      fileList: cloudImages,
      success: res => {
        const urlMap = {};
        res.fileList.forEach(item => {
          urlMap[item.fileID] = item.tempFileURL || '';
        });
        
        // 更新 stations 中的图片链接
        stations.forEach(s => {
          if (s.rawImage && s.rawImage.startsWith('cloud://')) {
            s.image = urlMap[s.rawImage] || s.image;
          }
        });
        
        this.setData({
          stations: stations,
          filteredStations: stations,
          loading: false
        });
      },
      fail: err => {
        console.error('获取云图片临时链接失败', err);
        // 获取失败，使用本地默认图片
        this.setData({
          stations: stations,
          filteredStations: stations,
          loading: false
        });
      }
    });
  },

  // 搜索
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.doFilter();
  },

  doSearch() {
    this.setData({ searched: true });
    this.doFilter();
  },

  clearSearch() {
    this.setData({ keyword: '', searched: false, filteredStations: this.data.stations });
  },

  doFilter() {
    const kw = this.data.keyword.toLowerCase().trim();
    if (!kw) {
      this.setData({ filteredStations: this.data.stations, searched: false });
      return;
    }
    const filtered = this.data.stations.filter(s =>
      s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw)
    );
    this.setData({ filteredStations: filtered, searched: true });
  },

  // 图片加载失败处理
  onImgError(e) {
    // 如果本地图片不存在，使用渐变色背景即可（已有默认背景）
  },

  // 电话咨询
  onCall(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    }
  },

  // 导航前往
  onNavigate(e) {
    const item = e.currentTarget.dataset.item;
    if (item && item.latitude && item.longitude) {
      wx.openLocation({
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name,
        address: item.address,
        scale: 15
      });
    } else {
      wx.showToast({ title: '暂无位置信息', icon: 'none' });
    }
  },

  // 查看详情 / 点击卡片
  onStationTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/station-detail/station-detail?id=${id}`
      });
    }
  },

  goBack() {
    safeNavigateBack('/pages/products/products');
  }
});
