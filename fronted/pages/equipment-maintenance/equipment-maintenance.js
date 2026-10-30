// pages/equipment-maintenance/equipment-maintenance.js - 机械设备保养表
const { delayedSafeBack } = require('../../utils/navigation')
const { uploadImages } = require('../../utils/upload-image')
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit')
const { currentOpenid } = require('../../utils/participants')
const { formatErrorMessage } = require('../../utils/error-message')
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
Page({
  data: {
    collectionName: 'equipment_maintenance',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    equipmentOptions: [],
    maintenanceTypeOptions: ['日常保养', '周保养', '月保养', '季度保养', '年度保养', '故障维修'],
    form: {
      equipmentName: '',
      equipmentCode: '',
      spec: '',
      currentHours: '',
      maintenanceDate: '',
      maintenanceTypeIndex: -1,
      manager: '',
      maintenanceItems: [],
      partsList: [],
      photos: [],
      remark: ''
    }
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('equipment_maintenance');
    this.loadEquipmentOptions()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    this.setData({ 'form.maintenanceDate': `${y}-${m}-${d}` })
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' })
      this.loadRecordForEdit(options.id)
      return
    }
    this.loadDraft()
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true })
    const db = wx.cloud.database()
    db.collection('equipment_maintenance').doc(id).get().then(res => {
      wx.hideLoading()
      const record = res.data || {}
      if (!canEditRecord(record)) {
        wx.showToast({ title: '当前状态不可修改', icon: 'none' })
        delayedSafeBack('/pages/index/index')
        return
      }
      const form = { ...this.data.form, ...stripSystemFields(record) }
      form.maintenanceTypeIndex = this.data.maintenanceTypeOptions.indexOf(record.maintenanceType)
      form.maintenanceItems = Array.isArray(form.maintenanceItems) && form.maintenanceItems.length ? form.maintenanceItems : [{ part: '', content: '' }]
      form.partsList = Array.isArray(form.partsList) && form.partsList.length ? form.partsList : [{ name: '', quantity: '' }]
      form.photos = Array.isArray(form.photos) ? form.photos : []
      this.setData({ form })
    }).catch(err => {
      wx.hideLoading()
      console.error('加载保养记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      delayedSafeBack('/pages/index/index')
    })
  },

  async loadEquipmentOptions() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('equipment_maintenance')
        .orderBy('createTime', 'desc')
        .limit(500)
        .get()
      const map = {}
      ;(res.data || []).forEach(item => {
        const status = item.approvalStatus || item.status || ''
        if (status === 'deleted') return
        const name = String(item.equipmentName || '').trim()
        if (!name || map[name]) return
        map[name] = {
          equipmentName: name,
          equipmentCode: item.equipmentCode || '',
          spec: item.spec || '',
          currentHours: item.currentHours || ''
        }
      })
      this.setData({ equipmentOptions: Object.values(map) })
    } catch (err) {
      console.error('加载设备名称失败', err)
      wx.showToast({ title: '加载设备失败', icon: 'none' })
    }
  },

  // 基础字段输入
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  // 设备名称选择
  onEquipmentChange(e) {
    const equipment = this.data.equipmentOptions[Number(e.detail.value)]
    if (!equipment) return
    this.setData({
      'form.equipmentName': equipment.equipmentName,
      'form.equipmentCode': equipment.equipmentCode,
      'form.spec': equipment.spec,
      'form.currentHours': equipment.currentHours || ''
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ 'form.maintenanceDate': e.detail.value })
  },

  // 保养类型选择
  onTypeChange(e) {
    this.setData({ 'form.maintenanceTypeIndex': e.detail.value })
  },

  // ===== 保养项目明细 =====
  addMaintenanceItem() {
    const list = this.data.form.maintenanceItems
    list.push({ part: '', content: '' })
    this.setData({ 'form.maintenanceItems': list })
  },

  deleteMaintenanceItem(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.form.maintenanceItems
    if (list.length <= 1) {
      wx.showToast({ title: '至少保留一条', icon: 'none' }); return
    }
    list.splice(index, 1)
    this.setData({ 'form.maintenanceItems': list })
  },

  onItemInput(e) {
    const index = e.currentTarget.dataset.index
    const field = e.currentTarget.dataset.field
    const list = this.data.form.maintenanceItems
    list[index][field] = e.detail.value
    this.setData({ 'form.maintenanceItems': list })
  },

  // ===== 更换配件明细 =====
  addPart() {
    const list = this.data.form.partsList
    list.push({ name: '', quantity: '' })
    this.setData({ 'form.partsList': list })
  },

  deletePart(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.form.partsList
    if (list.length <= 1) {
      wx.showToast({ title: '至少保留一条', icon: 'none' }); return
    }
    list.splice(index, 1)
    this.setData({ 'form.partsList': list })
  },

  onPartInput(e) {
    const index = e.currentTarget.dataset.index
    const field = e.currentTarget.dataset.field
    const list = this.data.form.partsList
    list[index][field] = e.detail.value
    this.setData({ 'form.partsList': list })
  },

  // ===== 照片上传 =====
  addPhoto() {
    wx.chooseImage({
      count: 9 - this.data.form.photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...', mask: true })
        uploadImages(res.tempFilePaths, 'equipment-maintenance', 'photo')
          .then(photoUrls => {
            this.setData({ 'form.photos': this.data.form.photos.concat(photoUrls) })
            wx.showToast({ title: '上传成功', icon: 'success' })
          })
          .catch(err => {
            console.error('上传照片失败', err)
            wx.showToast({ title: '上传失败', icon: 'none' })
          })
          .finally(() => wx.hideLoading())
      }
    })
  },

  deletePhoto(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.form.photos
    list.splice(index, 1)
    this.setData({ 'form.photos': list })
  },

  previewPhoto(e) {
    const url = e.currentTarget.dataset.src
    if (url) wx.previewImage({ urls: [url], current: url })
  },

  // ===== 提交 =====
  async submitForm() {
    const form = this.data.form
    if (!form.equipmentName) {
      wx.showToast({ title: '请选择设备名称', icon: 'none' }); return
    }
    if (!form.maintenanceDate) {
      wx.showToast({ title: '请选择保养日期', icon: 'none' }); return
    }
    if (form.maintenanceTypeIndex < 0) {
      wx.showToast({ title: '请选择保养类型', icon: 'none' }); return
    }

    const approvalFields = await this.prepareApprovalFields('equipment_maintenance');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...', mask: true });

    const db = wx.cloud.database()
    const openid = currentOpenid()
    const userInfo = wx.getStorageSync('userInfo') || {}
    const submitterName = userInfo.name || userInfo.nickName || '微信用户'
    const submitData = {
      equipmentName: form.equipmentName,
      equipmentCode: form.equipmentCode,
      spec: form.spec,
      currentHours: form.currentHours,
      maintenanceDate: form.maintenanceDate,
      maintenanceType: this.data.maintenanceTypeOptions[form.maintenanceTypeIndex],
      manager: form.manager,
      maintenanceItems: form.maintenanceItems,
      partsList: form.partsList,
      photos: form.photos,
      remark: form.remark,
      submitterOpenid: openid,
      submitterName,
      submitter: submitterName,
      ...approvalFields,
      ...pendingPatch(db)
    }
    if (!this.data.editMode) submitData.createTime = db.serverDate()

    const task = this.data.editMode && this.data.editingId
      ? db.collection('equipment_maintenance').doc(this.data.editingId).update({ data: submitData })
      : db.collection('equipment_maintenance').add({ data: submitData })
    task.then(res => {
      wx.hideLoading()
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' })
      wx.removeStorageSync('equipment_maintenance_draft')
      delayedSafeBack('/pages/index/index')
    }).catch(err => {
      console.error(err)
      wx.hideLoading()
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' })
    })
  },

  // ===== 草稿 =====
  loadDraft() {
    const draft = wx.getStorageSync('equipment_maintenance_draft')
    if (draft) this.setData({ form: draft })
  },

  saveDraft() {
    wx.setStorageSync('equipment_maintenance_draft', { ...this.data.form, saveTime: new Date().toISOString() })
    wx.showToast({ title: '草稿已保存', icon: 'success' })
  },

  // ===== 查看记录 =====
  goToRecord() {
    wx.navigateTo({ url: '/pages/equipment-maintenance-record/equipment-maintenance-record' })
  }
})
