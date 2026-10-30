// pages/diesel-entry/diesel-entry.js - 拌站柴油入库表
const { delayedSafeBack } = require('../../utils/navigation');
const { uploadImages } = require('../../utils/upload-image');
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit');
const { formatErrorMessage } = require('../../utils/error-message');
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
const db = wx.cloud.database();

Page({
  data: {
    collectionName: 'diesel_entry',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    stationOptions: [],    // 从数据库读取
    totalAmount: 0,
    form: {
      date: '',
      station: '',
      plateNumber: '',
      volume: '',
      price: '',
      tankNumber: '',
      handler: '',
      image: [],
      remark: ''
    }
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('diesel_entry');
    this.loadStations();
    // 默认填入今日日期
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ 'form.date': `${y}-${m}-${d}` });
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' });
      this.loadRecordForEdit(options.id);
      return;
    }
    this.loadDraft();
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    db.collection('diesel_entry').doc(id).get()
      .then(res => {
        wx.hideLoading();
        const record = res.data || {};
        if (!canEditRecord(record)) {
          wx.showToast({ title: '当前状态不可修改', icon: 'none' });
          delayedSafeBack('/pages/index/index');
          return;
        }
        const form = { ...this.data.form, ...stripSystemFields(record) };
        form.image = this.normalizeImages(form.image);
        this.setData({
          form,
          totalAmount: record.totalAmount || 0
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载入库记录失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        delayedSafeBack('/pages/index/index');
      });
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('diesel_entry_draft');
    if (!draft) return;
    const stationIdx = this.data.stationOptions.findIndex(s => s.name === draft.station);
    this.setData({
      'form.plateNumber': draft.plateNumber || '',
      'form.volume': draft.volume || '',
      'form.price': draft.price || '',
      'form.tankNumber': draft.tankNumber || '',
      'form.handler': draft.handler || '',
      'form.image': this.normalizeImages(draft.image),
      'form.remark': draft.remark || '',
      totalAmount: draft.totalAmount || 0,
      stationIndex: stationIdx >= 0 ? stationIdx : -1,
      'form.station': draft.station || ''
    });
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  },

  // 暂存草稿
  saveDraft() {
    const { form, totalAmount } = this.data;
    const draft = {
      date: form.date,
      station: form.station,
      plateNumber: form.plateNumber,
      volume: form.volume,
      price: form.price,
      tankNumber: form.tankNumber,
      handler: form.handler,
      image: form.image,
      remark: form.remark,
      totalAmount,
      saveTime: new Date().toISOString()
    };
    wx.setStorageSync('diesel_entry_draft', draft);
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  // 从数据库加载站点列表
  async loadStations() {
    try {
      const res = await db.collection('stations')
        .where({ status: 1 })
        .orderBy('sort', 'asc')
        .get();
      this.setData({ stationOptions: res.data || [] });
    } catch (e) {
      console.error('加载站点失败', e);
    }
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  // 拌站点选择
  onStationChange(e) {
    const station = this.data.stationOptions[e.detail.value].name;
    this.setData({ 'form.station': station });
  },

  // 输入通用处理
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 到站升数变化 — 自动计算总金额
  onVolumeChange(e) {
    const volume = parseFloat(e.detail.value) || 0;
    const price = parseFloat(this.data.form.price) || 0;
    this.setData({
      'form.volume': e.detail.value,
      totalAmount: (volume * price).toFixed(2)
    });
  },

  // 单价变化 — 自动计算总金额
  onPriceChange(e) {
    const price = parseFloat(e.detail.value) || 0;
    const volume = parseFloat(this.data.form.volume) || 0;
    this.setData({
      'form.price': e.detail.value,
      totalAmount: (volume * price).toFixed(2)
    });
  },

  // 上传入库图片
  onUploadImage() {
    const current = this.normalizeImages(this.data.form.image);
    const remain = 9 - current.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...', mask: true });
        uploadImages(res.tempFilePaths, 'diesel-entry', 'image')
          .then((imageUrls) => {
            this.setData({ 'form.image': current.concat(imageUrls) });
            wx.showToast({ title: '上传成功', icon: 'success' });
          })
          .catch((err) => {
            console.error('上传图片失败', err);
            wx.showToast({ title: '上传失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const urls = this.normalizeImages(this.data.form.image);
    const current = e.currentTarget.dataset.url || urls[0];
    if (current) wx.previewImage({ urls, current });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.normalizeImages(this.data.form.image);
    list.splice(index, 1);
    this.setData({ 'form.image': list });
  },

  // 提交表单
  async submitForm() {
    const form = this.data.form;

    if (!form.date) {
      wx.showToast({ title: '请选择入库日期', icon: 'none' }); return;
    }
    if (!form.station) {
      wx.showToast({ title: '请选择入库拌站点', icon: 'none' }); return;
    }
    if (!form.plateNumber) {
      wx.showToast({ title: '请填写送货车牌号', icon: 'none' }); return;
    }
    if (!form.volume) {
      wx.showToast({ title: '请填写到站实收升数', icon: 'none' }); return;
    }
    if (!form.price) {
      wx.showToast({ title: '请填写单价', icon: 'none' }); return;
    }

    const approvalFields = await this.prepareApprovalFields('diesel_entry');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...', mask: true });

    const submitData = {
      ...form,
      totalAmount: this.data.totalAmount,
      ...approvalFields,
      ...pendingPatch(db)
    };
    if (!this.data.editMode) submitData.createTime = db.serverDate();

    const task = this.data.editMode && this.data.editingId
      ? db.collection('diesel_entry').doc(this.data.editingId).update({ data: submitData })
      : db.collection('diesel_entry').add({ data: submitData });

    task.then(() => {
      wx.hideLoading();
      wx.removeStorageSync('diesel_entry_draft');
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' });
      delayedSafeBack('/pages/index/index');
    }).catch(err => {
      wx.hideLoading();
      console.error('提交失败', err);
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' });
    });
  },

  // 查看记录
  goToRecord() {
    wx.navigateTo({ url: '/pages/diesel-entry-record/diesel-entry-record' });
  }
});
