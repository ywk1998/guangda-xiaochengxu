// pages/diesel-delivery/diesel-delivery.js - 加油车送油记录表
const { delayedSafeBack } = require('../../utils/navigation');
const { uploadImages } = require('../../utils/upload-image');
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit');
const { formatErrorMessage } = require('../../utils/error-message');
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
Page({
  data: {
    collectionName: 'diesel_delivery',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    form: {
      date: '',
      plateNumber: '',
      projectLocation: '',
      driver: '',
      remark: '',
      equipmentList: [] // 设备加油记录列表
    }
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('diesel_delivery');
    // 默认填入今日日期
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ 'form.date': `${y}-${m}-${d}` });
    if (!options.id) this.addEquipment();
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' });
      this.loadRecordForEdit(options.id);
      return;
    }
    // 恢复草稿
    this.loadDraft();
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    const db = wx.cloud.database();
    db.collection('diesel_delivery').doc(id).get()
      .then(res => {
        wx.hideLoading();
        const record = res.data || {};
        if (!canEditRecord(record)) {
          wx.showToast({ title: '当前状态不可修改', icon: 'none' });
          delayedSafeBack('/pages/index/index');
          return;
        }
        const form = { ...this.data.form, ...stripSystemFields(record) };
        if (!Array.isArray(form.equipmentList) || !form.equipmentList.length) {
          form.equipmentList = [{ equipment: '', volume: '', image: [] }];
        }
        form.equipmentList = this.normalizeEquipmentList(form.equipmentList);
        this.setData({ form });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载送油记录失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        delayedSafeBack('/pages/index/index');
      });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  // 基础字段输入
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 添加设备
  addEquipment() {
    const list = this.data.form.equipmentList;
    list.push({
      equipment: '',
      volume: '',
      image: []
    });
    this.setData({ 'form.equipmentList': list });
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  },

  normalizeEquipmentList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      image: this.normalizeImages(item && item.image)
    }));
  },

  // 删除设备
  deleteEquipment(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.form.equipmentList;
    if (list.length <= 1) {
      wx.showToast({ title: '至少保留一条设备记录', icon: 'none' });
      return;
    }
    list.splice(index, 1);
    this.setData({ 'form.equipmentList': list });
  },

  // 设备字段输入
  onEquipmentInput(e) {
    const index = e.currentTarget.dataset.index;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const list = this.data.form.equipmentList;
    list[index][field] = value;
    this.setData({ 'form.equipmentList': list });
  },

  // 上传设备加油图片
  onUploadImage(e) {
    const index = e.currentTarget.dataset.index;
    const current = this.normalizeImages(this.data.form.equipmentList[index]?.image);
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
        uploadImages(res.tempFilePaths, 'diesel-delivery', `equipment-${index}`)
          .then((imageUrls) => {
            this.setData({ [`form.equipmentList[${index}].image`]: current.concat(imageUrls) });
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
    const index = e.currentTarget.dataset.index;
    const urls = this.normalizeImages(this.data.form.equipmentList[index]?.image);
    const current = e.currentTarget.dataset.url || urls[0];
    if (current) wx.previewImage({ urls, current });
  },

  deleteEquipmentImage(e) {
    const { index, imageIndex } = e.currentTarget.dataset;
    const list = this.normalizeImages(this.data.form.equipmentList[index]?.image);
    list.splice(imageIndex, 1);
    this.setData({ [`form.equipmentList[${index}].image`]: list });
  },

  // 提交表单
  async submitForm() {
    const form = this.data.form;

    if (!form.date) {
      wx.showToast({ title: '请选择送油日期', icon: 'none' }); return;
    }
    if (!form.plateNumber) {
      wx.showToast({ title: '请填写加油车车牌号', icon: 'none' }); return;
    }
    if (!form.projectLocation) {
      wx.showToast({ title: '请填写项目地点', icon: 'none' }); return;
    }

    // 检查设备列表
    if (!form.equipmentList || form.equipmentList.length === 0) {
      wx.showToast({ title: '请添加设备记录', icon: 'none' }); return;
    }

    // 检查每个设备必填项
    for (let i = 0; i < form.equipmentList.length; i++) {
      const item = form.equipmentList[i];
      if (!item.equipment) {
        wx.showToast({ title: `请填写第${i + 1}台设备名称/编号`, icon: 'none' }); return;
      }
      if (!item.volume) {
        wx.showToast({ title: `请填写第${i + 1}台设备加油升数`, icon: 'none' }); return;
      }
    }

    const approvalFields = await this.prepareApprovalFields('diesel_delivery');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...', mask: true });

    const db = wx.cloud.database();
    const equipmentList = this.normalizeEquipmentList(form.equipmentList);
    const submitData = {
      date: form.date,
      plateNumber: form.plateNumber,
      projectLocation: form.projectLocation,
      driver: form.driver,
      remark: form.remark,
      equipmentList,
      totalVolume: equipmentList.reduce((sum, item) => sum + parseFloat(item.volume || 0), 0),
      ...approvalFields,
      ...pendingPatch(db)
    };
    if (!this.data.editMode) submitData.createTime = db.serverDate();

    const task = this.data.editMode && this.data.editingId
      ? db.collection('diesel_delivery').doc(this.data.editingId).update({ data: submitData })
      : db.collection('diesel_delivery').add({ data: submitData });

    task.then(() => {
      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' });
      wx.removeStorageSync('diesel_delivery_draft');
      delayedSafeBack('/pages/index/index');
    }).catch(err => {
      wx.hideLoading();
      console.error('提交失败', err);
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' });
    });
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('diesel_delivery_draft');
    if (draft) {
      const form = {
        ...this.data.form,
        ...draft,
        equipmentList: this.normalizeEquipmentList(draft.equipmentList)
      };
      this.setData({ form });
    }
  },

  // 保存草稿
  saveDraft() {
    wx.setStorageSync('diesel_delivery_draft', { ...this.data.form, saveTime: new Date().toISOString() });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  // 查看记录
  goToRecord() {
    wx.navigateTo({ url: '/pages/diesel-delivery-record/diesel-delivery-record' });
  }
});
