// pages/diesel-out/diesel-out.js - 站点柴油领用表
const { delayedSafeBack } = require('../../utils/navigation');
const { uploadImages } = require('../../utils/upload-image');
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit');
const { formatErrorMessage } = require('../../utils/error-message');
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
const db = wx.cloud.database();

Page({
  data: {
    collectionName: 'diesel_out',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    stationOptions: [],
    typeOptions: ['加油车加油', '项目设备到站现场加油', '搅拌站站内设备加油', '其他领用'],
    form: {
      date: '',
      station: '',
      tankNumber: '',
      type: '',
      equipment: '',
      volume: '',
      driver: '',
      image: [],
      remark: ''
    }
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('diesel_out');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ 'form.date': `${y}-${m}-${d}` });
    this.loadStations();
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' });
      this.loadRecordForEdit(options.id);
      return;
    }
    this.loadDraft();
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    const db = wx.cloud.database();
    db.collection('diesel_out').doc(id).get()
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
          stationIndex: this.data.stationOptions.findIndex(s => s.name === form.station),
          typeIndex: this.data.typeOptions.findIndex(t => t === form.type)
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载领用记录失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        delayedSafeBack('/pages/index/index');
      });
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('diesel_out_draft');
    if (!draft) return;
    const stationIdx = this.data.stationOptions.findIndex(s => s.name === draft.station);
    const typeIdx = this.data.typeOptions.findIndex(t => t === draft.type);
    this.setData({
      'form.station': draft.station || '',
      'form.tankNumber': draft.tankNumber || '',
      'form.type': draft.type || '',
      'form.equipment': draft.equipment || '',
      'form.volume': draft.volume || '',
      'form.driver': draft.driver || '',
      'form.image': this.normalizeImages(draft.image),
      'form.remark': draft.remark || '',
      stationIndex: stationIdx >= 0 ? stationIdx : -1,
      typeIndex: typeIdx >= 0 ? typeIdx : -1
    });
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  },

  // 从后台站点管理加载站点
  loadStations() {
    db.collection('stations')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        const stationOptions = (res.data || []).filter(item => item.name);
        this.setData({ stationOptions }, () => {
          const station = this.data.form.station;
          if (!station) return;
          const stationIndex = stationOptions.findIndex(item => item.name === station);
          this.setData({ stationIndex: stationIndex >= 0 ? stationIndex : -1 });
        });
      })
      .catch(err => {
        console.error('加载站点失败', err);
        wx.showToast({ title: '站点加载失败', icon: 'none' });
      });
  },

  // 暂存草稿
  saveDraft() {
    wx.setStorageSync('diesel_out_draft', { ...this.data.form, saveTime: new Date().toISOString() });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onStationChange(e) {
    const station = this.data.stationOptions[e.detail.value];
    this.setData({
      'form.station': station?.name || '',
      stationIndex: Number(e.detail.value)
    });
  },

  onTypeChange(e) {
    const type = this.data.typeOptions[e.detail.value];
    this.setData({ 'form.type': type });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 上传图片
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
        uploadImages(res.tempFilePaths, 'diesel-out', 'image')
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

  async submitForm() {
    const form = this.data.form;

    if (!form.date) {
      wx.showToast({ title: '请选择领用日期', icon: 'none' }); return;
    }
    if (!form.station) {
      wx.showToast({ title: '请选择领用拌站点', icon: 'none' }); return;
    }
    if (!form.type) {
      wx.showToast({ title: '请选择领用类型', icon: 'none' }); return;
    }
    if (!form.volume) {
      wx.showToast({ title: '请填写领用升数', icon: 'none' }); return;
    }

    const approvalFields = await this.prepareApprovalFields('diesel_out');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...', mask: true });

    const submitData = {
      ...form,
      ...approvalFields,
      ...pendingPatch(db)
    };
    if (!this.data.editMode) submitData.createTime = db.serverDate();
    const task = this.data.editMode && this.data.editingId
      ? db.collection('diesel_out').doc(this.data.editingId).update({ data: submitData })
      : db.collection('diesel_out').add({ data: submitData });

    task.then(() => {
      wx.hideLoading();
      wx.removeStorageSync('diesel_out_draft');
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
    wx.navigateTo({ url: '/pages/diesel-out-record/diesel-out-record' });
  }
});
