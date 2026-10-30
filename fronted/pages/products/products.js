// pages/products/products.js - 产品列表页（直接使用云数据库）

Page({
  data: {
    categories: [],
    products: [],
    mixingStations: [],
    filteredProducts: [],
    activeCatId: 'mixing',
    currentCatName: '沥青搅拌站',
    currentCatDesc: '大型拌合站生产设备',
    searchText: '',
    loading: true
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onPullDownRefresh() {
    this.loadProducts().then(() => wx.stopPullDownRefresh());
  },

  // 默认产品数据（用于云数据库为空时显示）
  getDefaultProducts() {
    return [
      { id: 'default-1', name: '沥青路面摊铺施工', category: 'paving', icon: '', coverColor: '#e67e22', desc: '专业沥青路面摊铺施工团队', tags: ['专业团队', '大型摊铺'] },
      { id: 'default-2', name: '路面铣刨与维修', category: 'paving', icon: '', coverColor: '#f39c12', desc: '路面铣刨、坑槽修补', tags: ['铣刨', '修补'] },
      { id: 'default-3', name: '压路机租赁', category: 'equipment', icon: '', coverColor: '#2ecc71', desc: '全系列压路机租赁', tags: ['双钢轮', '轮胎式'] },
      { id: 'default-4', name: '沥青混合料供应', category: 'material', icon: '', coverColor: '#8e44ad', desc: '各规格沥青混合料供应', tags: ['AC级配', 'SMA'] },
      { id: 'default-5', name: '路面工程总包', category: 'service', icon: '', coverColor: '#c0392b', desc: '沥青路面工程总承包服务', tags: ['总包', '全流程'] },
      { id: 'default-6', name: '摊铺机租赁', category: 'equipment', icon: '', coverColor: '#3498db', desc: '各种型号摊铺机租赁服务', tags: ['摊铺机', '沥青摊铺'] },
      { id: 'default-7', name: '路面清扫服务', category: 'service', icon: '', coverColor: '#95a5a6', desc: '施工前路面清扫整理服务', tags: ['清扫', '整理'] }
    ];
  },

  // 沥青搅拌站默认数据
  getDefaultMixingStations() {
    return [
      {
        id: 'mixing-1',
        name: '惠州拌站中心',
        address: '广东省惠州市惠城区远大工业园',
        phone: '0752-1234567',
        status: '生产中',
        statusClass: 'running',
        distance: '1.5km',
        capacity: '4000',
        model: 'HRS-4000',
        tankSize: '4000kg',
        type: '沥青混合料',
        tags: ['24小时生产', '品质认证', '环保达标'],
        image: ''
      },
      {
        id: 'mixing-2',
        name: '大亚湾拌站基地',
        address: '广东省惠州市大亚湾石化区',
        phone: '0752-7654321',
        status: '维护中',
        statusClass: 'maintenance',
        distance: '8.2km',
        capacity: '3000',
        model: 'LB-3000',
        tankSize: '3000kg',
        type: '改性沥青',
        tags: ['大型基地', '改性沥青', '仓储充足'],
        image: ''
      },
      {
        id: 'mixing-3',
        name: '仲恺移动拌站',
        address: '广东省惠州市仲恺高新区',
        phone: '0752-9876543',
        status: '已停机',
        statusClass: 'stopped',
        distance: '12km',
        capacity: '2000',
        model: 'YD-2000',
        tankSize: '2000kg',
        type: '普通沥青',
        tags: ['移动式', '灵活部署'],
        image: ''
      }
    ];
  },

  // 加载产品数据（直接使用云数据库）
  async loadProducts() {
    this.setData({ loading: true });

    // 先设置分类
    const categories = [
      { id: 'mixing', name: '沥青搅拌站', icon: '🏭', desc: '大型拌合站生产设备', isStation: true },
      { id: 'paving', name: '道路摊铺', icon: '🛤️', desc: '专业施工团队服务' },
      { id: 'equipment', name: '设备租赁', icon: '🚛', desc: '全型号设备出租' },
      { id: 'material', name: '材料供应', icon: '🪨', desc: '优质建筑材料' },
      { id: 'service', name: '工程服务', icon: '👷', desc: '一体化施工方案' }
    ];

    const db = wx.cloud.database();

    try {
      // 并行加载产品和搅拌站数据
      const [productRes, stationRes] = await Promise.all([
        db.collection('products').orderBy('sort', 'asc').get().catch(() => ({ data: [] })),
        db.collection('mixing_station').where({ status: 1 }).orderBy('createTime', 'desc').get().catch(() => ({ data: [] }))
      ]);

      // 处理产品数据
      const cloudProducts = productRes.data || [];
      let products = [];
      if (cloudProducts.length > 0) {
        // 收集所有需要转 HTTPS 链接的云存储 icon 路径
        const iconCloudPaths = [];
        cloudProducts.forEach(p => {
          if (p.icon && p.icon.startsWith('cloud://')) {
            iconCloudPaths.push(p.icon);
          }
        });
        // 批量获取 24 小时有效期的 HTTPS 临时链接
        const iconUrlMap = {};
        if (iconCloudPaths.length > 0) {
          try {
            const urlRes = await wx.cloud.getTempFileURL({
              fileList: iconCloudPaths.map(p => ({ fileID: p, maxAge: 7200 }))
            });
            (urlRes.fileList || []).forEach(item => {
              if (item.tempFileURL) {
                iconUrlMap[item.fileID] = item.tempFileURL;
              }
            });
          } catch (e) {
            console.warn('[products] icon获取HTTPS链接失败:', e);
          }
        }
        // 构建产品列表，替换 cloud:// 为 HTTPS 链接
        products = cloudProducts.map(p => ({
          id: p._id,
          name: p.name || '',
          category: p.category || '',
          icon: p.icon ? (p.icon.startsWith('cloud://') ? (iconUrlMap[p.icon] || '') : p.icon) : '',
          coverColor: p.coverColor || '#1a6fc4',
          desc: p.desc || '',
          tags: p.tags || []
        }));
      } else {
        products = this.getDefaultProducts();
      }

      // 处理搅拌站数据
      const defaultImages = [
        '/images/stations/xiaojinkou.jpg',
        '/images/stations/longmen.jpg',
        '/images/stations/maan.jpg'
      ];
      const cloudStations = stationRes.data || [];
      
      // 处理搅拌站图片（云存储路径转临时链接）
      let mixingStations = [];
      if (cloudStations.length > 0) {
        // 收集需要转换的云存储路径
        const cloudImages = [];
        
        cloudStations.forEach((s, index) => {
          if (s.image && s.image.startsWith('cloud://')) {
            cloudImages.push(s.image);
          }
        });
        
        // 逐个下载云存储图片到本地临时路径（比getTempFileURL更稳定）
        let tempUrls = {};
        if (cloudImages.length > 0) {
          for (const cloudPath of cloudImages) {
            try {
              const res = await wx.cloud.downloadFile({
                fileID: cloudPath
              });
              if (res.tempFilePath) {
                tempUrls[cloudPath] = res.tempFilePath;
              }
            } catch (e) {
              console.error('[products] 下载失败:', cloudPath, e);
            }
          }
        }
        
        // 构建搅拌站数据
        mixingStations = cloudStations.map((s, index) => {
          const finalImage = tempUrls[s.image] || s.image || defaultImages[index % defaultImages.length];
          // 如果最终图片仍然是cloud://路径，强制使用默认图
          const safeImage = finalImage.startsWith('cloud://') ? defaultImages[index % defaultImages.length] : finalImage;
          return {
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
          image: safeImage,
          tags: s.tags || []
        };
        });
      } else {
        mixingStations = this.getDefaultMixingStations();
      }

      // 默认显示搅拌站
      this.setData({
        categories,
        products,
        mixingStations,
        filteredProducts: mixingStations,
        loading: false
      });
    } catch (err) {
      console.error('加载数据失败，使用默认数据', err);
      this.setData({
        categories,
        products: this.getDefaultProducts(),
        mixingStations: this.getDefaultMixingStations(),
        filteredProducts: this.getDefaultMixingStations(),
        loading: false
      });
    }
  },

  // 点击左侧分类
  onCatTap(e) {
    const { id } = e.currentTarget.dataset;
    const cat = this.data.categories.find(c => c.id === id);
    if (!cat) return;

    // 沥青搅拌站 → 显示搅拌站卡片
    if (cat.isStation) {
      this.setData({
        activeCatId: id,
        currentCatName: cat.name,
        currentCatDesc: cat.desc,
        filteredProducts: this.data.mixingStations || this.getDefaultMixingStations()
      });
      return;
    }

    let filtered = this.data.products;
    if (id !== 'all') {
      filtered = filtered.filter(p => p.category === id);
    }

    // 再叠加搜索
    if (this.data.searchText) {
      const kw = this.data.searchText;
      filtered = filtered.filter(p =>
        p.name.includes(kw) || p.desc.includes(kw) || (p.tags && p.tags.some(t => t.includes(kw)))
      );
    }

    this.setData({
      activeCatId: id,
      currentCatName: cat.name,
      currentCatDesc: cat.desc,
      filteredProducts: filtered
    });
  },

  // 搜索
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    this.filterBySearch(searchText);
  },

  filterBySearch(keyword) {
    const activeId = this.data.activeCatId;
    let list = this.data.products;

    if (activeId !== 'all') {
      list = list.filter(p => p.category === activeId);
    }

    if (keyword) {
      list = list.filter(p =>
        p.name.includes(keyword) || p.desc.includes(keyword) || (p.tags && p.tags.some(t => t.includes(keyword)))
      );
    }

    this.setData({ filteredProducts: list });
  },

  // 进入详情
  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` });
  },

  onShareAppMessage() {
    return { title: '查看我们的产品服务', path: '/pages/products/products' };
  },

  // 预览宣传大图
  onPreviewPromo() {
    wx.previewImage({ current: '/images/company.jpg', urls: ['/images/company.jpg'] });
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
    } else if (item && item.address) {
      // 没有经纬度时显示地址信息
      wx.showModal({
        title: '地址信息',
        content: item.address,
        showCancel: false
      });
    } else {
      wx.showToast({ title: '暂无位置信息', icon: 'none' });
    }
  },

  // 查看搅拌站详情
  onStationTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/station-detail/station-detail?id=${id}`
      });
    }
  },

  // 图片加载失败时自动替换为默认图
  onImgError(e) {
    const { index } = e.currentTarget.dataset;
    if (index !== undefined) {
      const defaultImages = [
        '/images/stations/xiaojinkou.jpg',
        '/images/stations/longmen.jpg',
        '/images/stations/maan.jpg'
      ];
      const list = this.data.filteredProducts;
      if (list[index]) {
        list[index].image = defaultImages[index % defaultImages.length];
        this.setData({ filteredProducts: list });
      }
    }
  }
});
