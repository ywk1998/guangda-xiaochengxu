// app.js - 小程序全局入口
const { request } = require('./utils/request');
const { installLocalDatabase } = require('./utils/local-db');

App({
  globalData: {
    userInfo: null,
    isLogin: false,
    // 全局配置（替换为真实信息）
    appName: '广东远大集团',
    useServerBackend: true,
    useLocalBackend: true,
    baseUrl: 'https://www.gdyd.top/api',
    companyInfo: {
      name: '广东远大集团',
      slogan: '科技引领未来，创新驱动发展',
      phone: '400-888-8888',
      email: 'YD@.com',
      address: '广东省惠州市惠城区小金口街道',
      latitude: 23.206944,
      longitude: 114.377222,
      wechat: 'YD',
      workHours: '周一至周五 8:30-18:00'
    }
  },

  onLaunch() {
    if (this.globalData.useLocalBackend) {
      installLocalDatabase();
    } else if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-4gims27g5d4f24a5',  // 替换为你的云开发环境ID
        traceUser: true
      });
    }

    // 检查登录态，未登录则自动弹出登录授权
    this.checkLoginStatus();
    // 获取系统信息
    const res = wx.getSystemInfoSync();
    this.globalData.systemInfo = res;
  },

  // 检查登录状态（启动时自动调用，未登录则弹窗要求登录）
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo && token) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLogin = true;
      if (userInfo.openid) wx.setStorageSync('openid', userInfo.openid);
      // 已有登录态，获取 openid 存入本地
      this._saveOpenid();
    }
  },

  // 新版微信头像昵称必须由用户主动填写，这里只保留兼容入口。
  autoLogin() {
    this.openLoginPanel();
  },

  openLoginPanel() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage?.route === 'pages/profile/profile' && currentPage.onLogin) {
      currentPage.onLogin();
      return;
    }
    wx.switchTab({
      url: '/pages/profile/profile',
      success() {
        setTimeout(() => {
          const nextPages = getCurrentPages();
          const profilePage = nextPages[nextPages.length - 1];
          if (profilePage?.route === 'pages/profile/profile' && profilePage.onLogin) {
            profilePage.onLogin();
          }
        }, 80);
      }
    });
  },

  ensureLocalOpenid() {
    let openid = wx.getStorageSync('openid');
    if (!openid) {
      openid = `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      wx.setStorageSync('openid', openid);
    }
    return openid;
  },

  saveLocalLogin(userInfo) {
    const openid = this.ensureLocalOpenid();
    const nextUserInfo = { ...userInfo, openid, role: userInfo.role || 'submitter' };
    this.globalData.userInfo = nextUserInfo;
    this.globalData.isLogin = true;
    wx.setStorageSync('userInfo', nextUserInfo);
    wx.setStorageSync('token', `local-token-${openid}`);
    return nextUserInfo;
  },

  // 通过云函数获取并保存 openid
  _saveOpenid() {
    const app = this;
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        if (res.result && res.result.openid) {
          wx.setStorageSync('openid', res.result.openid);
        }
      },
      fail: () => {
        // 云函数不存在时不阻塞，审批页等会兜底处理
      }
    });
  },

  saveAuthSession(res) {
    if (res.token) wx.setStorageSync('token', res.token);
    if (res.openid) wx.setStorageSync('openid', res.openid);
    if (res.userInfo) {
      wx.setStorageSync('userInfo', res.userInfo);
      this.globalData.userInfo = res.userInfo;
      this.globalData.isLogin = true;
    }
    return res;
  },

  // 获取 wx.login 的 code（用于后端换取真实 openid），失败时返回空串不影响登录
  getWxLoginCode() {
    return new Promise((resolve) => {
      if (typeof wx.login !== 'function') {
        resolve('');
        return;
      }
      wx.login({
        success: (res) => resolve(res.code || ''),
        fail: () => resolve('')
      });
    });
  },

  passwordLogin(form) {
    return this.getWxLoginCode().then(code => request({
      url: '/auth/login',
      method: 'POST',
      data: { ...form, code }
    }).then(res => this.saveAuthSession(res)));
  },

  passwordRegister(form) {
    return request({
      url: '/auth/register',
      method: 'POST',
      data: form
    }).then(res => this.saveAuthSession(res));
  },

  resetPassword(form) {
    return request({
      url: '/auth/reset-password',
      method: 'POST',
      data: form
    });
  },

  // 保留旧入口，避免其它页面引用时报错。
  wxLogin(profile = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          const localOpenid = this.ensureLocalOpenid();
          request({
            url: '/auth/wxlogin',
            method: 'POST',
            data: {
              code: loginRes.code || '',
              openid: this.globalData.useLocalBackend ? localOpenid : '',
              userInfo: profile
            }
          }).then(res => resolve(this.saveAuthSession(res))).catch(reject);
        },
        fail: reject
      });
    });
  },

  refreshUserRole() {
    const current = wx.getStorageSync('userInfo') || this.globalData.userInfo;
    const openid = current?.openid || wx.getStorageSync('openid');
    if (!openid) return Promise.resolve(current || null);

    return request({
      url: '/auth/wxlogin',
      method: 'POST',
      data: {
        openid,
        userInfo: {
          nickName: current?.nickName || current?.name || '微信用户',
          avatarUrl: current?.avatarUrl || '',
          phone: current?.phone || ''
        }
      }
    }).then(res => {
      if (res.token) wx.setStorageSync('token', res.token);
      if (res.openid) wx.setStorageSync('openid', res.openid);
      if (res.userInfo) {
        wx.setStorageSync('userInfo', res.userInfo);
        this.globalData.userInfo = res.userInfo;
        this.globalData.isLogin = true;
      }
      return res.userInfo || current || null;
    });
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
  },

  /**
   * 全局登录拦截
   * 在任何需要登录的操作前调用，未登录则弹出账号登录
   * @returns {Promise<boolean>} true=已登录或登录成功，false=用户取消登录
   *
   * 用法：
   *   onSomeAction() {
   *     app.checkLogin().then(ok => { if (ok) { // 执行业务逻辑 } });
   *   }
   */
  checkLogin() {
    const app = this;
    return new Promise((resolve) => {
      if (app.globalData.isLogin) {
        resolve(true);
        return;
      }
      wx.showModal({
        title: '需要登录',
        content: '请先登录后继续操作',
        confirmText: '去登录',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            app.openLoginPanel();
            resolve(false);
          } else {
            resolve(false);
          }
        }
      });
    });
  }
});
