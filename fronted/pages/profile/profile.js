// pages/profile/profile.js - 个人中心
const { maskPhone } = require('../../utils/util');
const { canViewRecord, currentOpenid } = require('../../utils/participants');

const APPROVAL_COLLECTIONS = [
  'construction_log',
  'output_record',
  'diesel_entry',
  'diesel_out',
  'diesel_delivery',
  'price_board',
  'TJform',
  'construction_log_summary',
  'equipment_maintenance',
  'mixing_tower_maintenance'
];

Page({
  data: {
    userInfo: null,
    isLogin: false,
    roleMeta: {
      label: '普通用户',
      className: 'normal'
    },
    showAuthPanel: false,
    authMode: 'login',
    authTitle: '账号登录',
    authSubtitle: '请输入姓名和密码登录',
    loginForm: {
      name: '',
      password: '',
      confirmPassword: ''
    },
    // 功能菜单
    menuList: [
      {
        group: '我的服务',
        items: [
          { id: 'consult', icon: '📝', label: '我提交的表单', badge: 0 },
          { id: 'approval', icon: '📋', label: '我的审批', badge: 0 },
          { id: 'favorite', icon: '📝', label: '我的草稿箱', badge: 0 },
          { id: 'notifications', icon: '🔔', label: '审批通知', badge: 0, dot: false }
        ]
      }
    ]
  },

  onLoad() {
    this.syncLoginState();
  },

  onShow() {
    this.syncLoginState();
    this.refreshUserRole();
    this.loadUnreadNotificationCount();
    this.loadPendingApprovalCount();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  refreshUserRole() {
    const app = getApp();
    if (!app.globalData.isLogin || !app.refreshUserRole) return;
    app.refreshUserRole()
      .then(() => this.syncLoginState())
      .catch(err => {
        console.warn('刷新用户角色失败', err);
      });
  },

  syncLoginState() {
    const app = getApp();
    const { userInfo, isLogin } = app.globalData;
    const role = userInfo?.role === 'admin' ? 'admin' : 'submitter';
    this.setData({
      userInfo: userInfo ? {
        ...userInfo,
        maskPhone: maskPhone(userInfo.phone || '')
      } : null,
      roleMeta: {
        label: role === 'admin' ? '管理员' : '普通用户',
        className: role === 'admin' ? 'admin' : 'normal'
      },
      isLogin,
      showAuthPanel: false,
      loginForm: {
        name: userInfo?.name || userInfo?.nickName || '',
        password: '',
        confirmPassword: ''
      }
    });
  },

  loadUnreadNotificationCount() {
    const app = getApp();
    const openid = currentOpenid();
    if (!app.globalData.isLogin || !openid) {
      this.updateNotificationDot(false);
      return;
    }
    wx.cloud.database().collection('notifications')
      .where({ toOpenid: openid, isRead: 0 })
      .limit(1)
      .get()
      .then(res => this.updateNotificationDot((res.data || []).length > 0))
      .catch(err => {
        console.warn('加载审批通知失败', err);
        this.updateNotificationDot(false);
      });
  },

  loadPendingApprovalCount() {
    const app = getApp();
    const role = app.globalData.userInfo?.role || this.data.userInfo?.role;
    if (!app.globalData.isLogin || role !== 'admin') {
      this.updateApprovalBadge(0);
      return;
    }
    const db = wx.cloud.database();
    const openid = currentOpenid();
    Promise.all(APPROVAL_COLLECTIONS.map(collection => (
        db.collection(collection)
          .where({ approvalStatus: 'pending' })
          .limit(100)
          .get()
          .then(res => {
            const list = res.data || [];
            return list.filter(item => this.canCountApproval(item, openid)).length;
          })
          .catch(err => {
            console.warn(`加载${collection}待审批数量失败`, err);
            return 0;
          })
      ))).then(counts => {
      const total = counts.reduce((sum, count) => sum + Number(count || 0), 0);
      this.updateApprovalBadge(total);
    }).catch(() => this.updateApprovalBadge(0));
  },

  canCountApproval(item, currentOpenid) {
    if (!canViewRecord(item)) return false;
    const approvers = Array.isArray(item.currentApprovers) ? item.currentApprovers : [];
    if (!approvers.length || !currentOpenid) return true;
    return approvers.some(user => (user.openid || user.userId || user._id || user.id) === currentOpenid);
  },

  updateApprovalBadge(count) {
    const badge = count > 99 ? '99+' : count;
    const menuList = this.data.menuList.map(group => ({
      ...group,
      items: group.items.map(item => (
        item.id === 'approval' ? { ...item, badge } : item
      ))
    }));
    this.setData({ menuList });
  },

  updateNotificationDot(hasUnread) {
    const menuList = this.data.menuList.map(group => ({
      ...group,
      items: group.items.map(item => (
        item.id === 'notifications' ? { ...item, dot: hasUnread } : item
      ))
    }));
    this.setData({ menuList });
  },

  setAuthMode(mode) {
    const titleMap = {
      login: '账号登录',
      register: '注册账号',
      reset: '找回密码'
    };
    const subtitleMap = {
      login: '请输入姓名和密码登录',
      register: '注册后即可使用完整服务',
      reset: '请输入姓名并设置新密码'
    };
    this.setData({
      authMode: mode,
      authTitle: titleMap[mode],
      authSubtitle: subtitleMap[mode],
      'loginForm.password': '',
      'loginForm.confirmPassword': ''
    });
  },

  onLogin() {
    this.setData({
      showAuthPanel: true,
      authMode: 'login',
      authTitle: '账号登录',
      authSubtitle: '请输入姓名和密码登录',
      loginForm: {
        name: this.data.loginForm.name || '',
        password: '',
        confirmPassword: ''
      }
    });
  },

  onShowLogin() {
    this.setAuthMode('login');
  },

  onShowRegister() {
    this.setAuthMode('register');
  },

  onShowReset() {
    this.setAuthMode('reset');
  },

  onAuthInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`loginForm.${field}`]: e.detail.value });
  },

  onCancelAuth() {
    this.setData({ showAuthPanel: false });
  },

  noop() {},

  async onConfirmLogin() {
    const app = getApp();
    const form = {
      name: this.data.loginForm.name.trim(),
      password: this.data.loginForm.password,
      confirmPassword: this.data.loginForm.confirmPassword
    };
    if (!form.name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!form.password || form.password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' });
      return;
    }
    if ((this.data.authMode === 'register' || this.data.authMode === 'reset') && form.password !== form.confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    const loadingTitle = this.data.authMode === 'register'
      ? '注册中...'
      : (this.data.authMode === 'reset' ? '重置中...' : '登录中...');
    wx.showLoading({ title: loadingTitle, mask: true });
    try {
      if (this.data.authMode === 'register') {
        await app.passwordRegister({
          name: form.name,
          password: form.password
        });
        this.setData({ showAuthPanel: false });
        this.syncLoginState();
        wx.showToast({ title: '注册成功', icon: 'success' });
      } else if (this.data.authMode === 'reset') {
        await app.resetPassword({
          name: form.name,
          newPassword: form.password
        });
        wx.showToast({ title: '密码已重置', icon: 'success' });
        this.setAuthMode('login');
        this.setData({ 'loginForm.password': form.password });
      } else {
        await app.passwordLogin({
          name: form.name,
          password: form.password
        });
        this.setData({ showAuthPanel: false });
        this.syncLoginState();
        wx.showToast({ title: '登录成功', icon: 'success' });
      }
    } catch (err) {
      console.error('账号操作失败', err);
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出确认',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this.syncLoginState();
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  // 菜单点击
  async onMenuTap(e) {
    const { id } = e.currentTarget.dataset;
    // 全局登录拦截
    const app = getApp();
    const ok = await app.checkLogin();
    if (ok) {
      this._handleMenu(id);
      this.syncLoginState();
    }
  },

  // 菜单路由
  _handleMenu(id) {
    switch (id) {
      case 'consult':
        wx.navigateTo({ url: '/pages/my-forms/my-forms' })
        break
      case 'approval':
        if (this.data.userInfo?.role !== 'admin') {
          wx.showToast({ title: '权限不足', icon: 'none' })
          return
        }
        wx.navigateTo({ url: '/pages/approval-list/approval-list' })
        break
      case 'favorite':
        wx.navigateTo({ url: '/pages/my-drafts/my-drafts' })
        break
      case 'notifications':
        wx.navigateTo({ url: '/pages/approval-notifications/approval-notifications' })
        break
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: '推荐给你一个优质企业小程序',
      path: '/pages/index/index'
    };
  }
});
