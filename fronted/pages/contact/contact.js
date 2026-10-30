// pages/contact/contact.js - 联系我们页
const { makeCall, copyText } = require('../../utils/util');

Page({
  data: {
    companyInfo: {},
    formData: {
      name: '',
      phone: '',
      company: '',
      message: ''
    },
    submitting: false,
    submitted: false
  },

  onLoad() {
    const app = getApp();
    this.setData({ companyInfo: app.globalData.companyInfo });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  // 拨打电话
  onCallTap() {
    const { phone } = this.data.companyInfo;
    makeCall(phone);
  },

  // 复制电话
  onCopyPhone() {
    copyText(this.data.companyInfo.phone);
  },

  // 复制邮箱
  onCopyEmail() {
    copyText(this.data.companyInfo.email);
  },

  // 查看地图
  onMapTap() {
    const { latitude, longitude, name, address } = this.data.companyInfo;
    wx.openLocation({
      latitude,
      longitude,
      name,
      address,
      scale: 16
    });
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  // 提交留言
  async onSubmit() {
    const { name, phone, message } = this.data.formData;
    if (!name.trim()) {
      wx.showToast({ title: '请输入您的姓名', icon: 'none' });
      return;
    }
    if (!phone.trim() || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!message.trim()) {
      wx.showToast({ title: '请输入留言内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      // 模拟提交 - 真实项目替换为 request({ url: '/message/submit', method: 'POST', data: this.data.formData })
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.setData({
        submitting: false,
        submitted: true,
        formData: { name: '', phone: '', company: '', message: '' }
      });
      wx.showToast({ title: '留言提交成功！', icon: 'success' });
      setTimeout(() => this.setData({ submitted: false }), 3000);
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return { title: '联系我们', path: '/pages/contact/contact' };
  }
});
