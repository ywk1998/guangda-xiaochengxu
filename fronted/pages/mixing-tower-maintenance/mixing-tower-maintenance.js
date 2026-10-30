// pages/mixing-tower-maintenance/mixing-tower-maintenance.js - 拌合楼保养表
const { delayedSafeBack } = require('../../utils/navigation')
const { uploadImages } = require('../../utils/upload-image')
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit')
const { currentOpenid } = require('../../utils/participants')
const { formatErrorMessage } = require('../../utils/error-message')
const db = wx.cloud.database()

Page({
  data: {
    editingId: '',
    editMode: false,
    stationOptions: [],
    stationIndex: -1,
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: {
      visible: false,
      title: '选择审批人',
      multiple: false,
      keyword: '',
      approvers: [],
      filteredApprovers: [],
      selected: {},
      selectedCount: 0
    },
    maintenanceTypeOptions: ['日常保养', '周保养', '月保养', '季度保养', '年度大修', '故障抢修'],
    form: {
      stationName: '',
      towerModel: '',
      maintenanceDate: '',
      maintenanceTypeIndex: -1,
      manager: '',
      maintenanceItems: [{ part: '', content: '' }],
      partsList: [{ name: '', quantity: '' }],
      photos: [],
      remark: ''
    }
  },

  onLoad(options = {}) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    this.setData({ 'form.maintenanceDate': `${y}-${m}-${d}` })
    this.loadStations()
    this.loadApprovalFlow()
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' })
      this.loadRecordForEdit(options.id)
      return
    }
    this.loadDraft()
  },

  normalizeApprovers(list = []) {
    if (!Array.isArray(list)) return []
    return list.map(item => {
      if (!item) return null
      if (typeof item === 'string') return { openid: item, name: item }
      const openid = item.openid || item.userId || item._id || item.id || ''
      const name = item.name || item.nickName || item.username || openid
      return openid ? { openid, name } : null
    }).filter(Boolean)
  },

  normalizeApprovalLevels(levels = []) {
    if (!Array.isArray(levels)) return []
    return levels.map(level => ({
      type: level.type === '联合审批' || level.type === 'joint' ? '联合审批' : '单人审批',
      approvers: this.normalizeApprovers(level.approvers || level.users || level.approvalUsers || [])
    })).filter(level => level.approvers.length)
  },

  loadApprovalFlow() {
    return db.collection('form_registry')
      .where({ collectionName: 'mixing_tower_maintenance' })
      .limit(1)
      .get()
      .then(res => {
        const setting = (res.data || [])[0] || {}
        this.setData({
          approvalFlow: this.normalizeApprovalLevels(setting.approvalLevels || []),
          approvalFlowLoaded: true
        })
      })
      .catch(err => {
        console.warn('加载拌合楼保养审批流程失败', err)
        this.setData({ approvalFlow: [], approvalFlowLoaded: true })
      })
  },

  chooseApproverFromLevel(level) {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const currentOpenidValue = currentOpenid()
    const approvers = this.normalizeApprovers(level?.approvers || [])
      .filter(user => !currentOpenidValue || user.openid !== currentOpenidValue)
    if (!approvers.length) {
      wx.showToast({ title: '没有其他审批人', icon: 'none' })
      return Promise.resolve(null)
    }
    const multiple = (level?.type || '单人审批') === '联合审批'
    return new Promise(resolve => {
      this.approvalSelectorResolve = resolve
      this.setData({
        approvalSelector: {
          visible: true,
          title: '选择审批人',
          multiple,
          keyword: '',
          approvers: approvers.map(item => ({ ...item, checked: false })),
          filteredApprovers: approvers.map(item => ({ ...item, checked: false })),
          selected: {},
          selectedCount: 0
        }
      })
    })
  },

  updateApprovalSelectorFilter() {
    const selector = this.data.approvalSelector
    const keyword = String(selector.keyword || '').trim().toLowerCase()
    const filteredApprovers = selector.approvers.filter(item => {
      const text = `${item.name || ''}${item.openid || ''}`.toLowerCase()
      return !keyword || text.includes(keyword)
    })
    this.setData({ 'approvalSelector.filteredApprovers': filteredApprovers })
  },

  onApprovalSelectorSearch(e) {
    this.setData({ 'approvalSelector.keyword': e.detail.value || '' }, () => this.updateApprovalSelectorFilter())
  },

  toggleApprovalSelectorUser(e) {
    const openid = e.currentTarget.dataset.openid
    const selector = this.data.approvalSelector
    let selected = { ...selector.selected }
    if (selector.multiple) {
      if (selected[openid]) delete selected[openid]
      else selected[openid] = true
    } else {
      selected = selected[openid] ? {} : { [openid]: true }
    }
    const approvers = selector.approvers.map(item => ({ ...item, checked: Boolean(selected[item.openid]) }))
    const filteredApprovers = selector.filteredApprovers.map(item => ({ ...item, checked: Boolean(selected[item.openid]) }))
    this.setData({
      'approvalSelector.selected': selected,
      'approvalSelector.selectedCount': Object.keys(selected).length,
      'approvalSelector.approvers': approvers,
      'approvalSelector.filteredApprovers': filteredApprovers
    })
  },

  closeApprovalSelector() {
    if (this.approvalSelectorResolve) {
      this.approvalSelectorResolve(null)
      this.approvalSelectorResolve = null
    }
    this.setData({
      approvalSelector: {
        visible: false,
        title: '选择审批人',
        multiple: false,
        keyword: '',
        approvers: [],
        filteredApprovers: [],
        selected: {},
        selectedCount: 0
      }
    })
  },

  confirmApprovalSelector() {
    const selector = this.data.approvalSelector
    const selectedApprovers = selector.approvers.filter(item => selector.selected[item.openid])
    if (!selectedApprovers.length) {
      wx.showToast({ title: '请选择审批人', icon: 'none' })
      return
    }
    if (this.approvalSelectorResolve) {
      this.approvalSelectorResolve(selector.multiple ? selectedApprovers : selectedApprovers[0])
      this.approvalSelectorResolve = null
    }
    this.setData({
      'approvalSelector.visible': false,
      'approvalSelector.approvers': [],
      'approvalSelector.filteredApprovers': [],
      'approvalSelector.selected': {},
      'approvalSelector.selectedCount': 0
    })
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true })
    db.collection('mixing_tower_maintenance').doc(id).get().then(res => {
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
      const stationIndex = this.data.stationOptions.findIndex(item => item.name === form.stationName)
      this.setData({ form, stationIndex: stationIndex >= 0 ? stationIndex : -1 })
    }).catch(err => {
      wx.hideLoading()
      console.error('加载拌合楼保养记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      delayedSafeBack('/pages/index/index')
    })
  },

  loadStations() {
    db.collection('stations')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        const stationOptions = (res.data || []).filter(item => item.name)
        this.setData({ stationOptions }, () => {
          const stationIndex = stationOptions.findIndex(item => item.name === this.data.form.stationName)
          if (stationIndex >= 0) this.setData({ stationIndex })
        })
      })
      .catch(err => {
        console.error('加载站点失败', err)
        wx.showToast({ title: '站点加载失败', icon: 'none' })
      })
  },

  // 基础字段输入
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ 'form.maintenanceDate': e.detail.value })
  },

  // 保养类型选择
  onTypeChange(e) {
    this.setData({ 'form.maintenanceTypeIndex': e.detail.value })
  },

  onStationChange(e) {
    const stationIndex = Number(e.detail.value)
    const station = this.data.stationOptions[stationIndex]
    this.setData({
      stationIndex,
      'form.stationName': station?.name || ''
    })
  },

  // ===== 保养部位明细 =====
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
        uploadImages(res.tempFilePaths, 'mixing-tower-maintenance', 'photo')
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
    if (!form.stationName) {
      wx.showToast({ title: '请填写所属站点', icon: 'none' }); return
    }
    if (!form.towerModel) {
      wx.showToast({ title: '请填写拌合楼型号', icon: 'none' }); return
    }
    if (!form.maintenanceDate) {
      wx.showToast({ title: '请选择保养日期', icon: 'none' }); return
    }
    if (form.maintenanceTypeIndex < 0) {
      wx.showToast({ title: '请选择保养类型', icon: 'none' }); return
    }

    if (!this.data.approvalFlowLoaded) {
      wx.showLoading({ title: '读取审批流程...', mask: true })
      await this.loadApprovalFlow()
      wx.hideLoading()
    }
    const approvalFlow = this.data.approvalFlow || []
    let currentApprovers = []
    if (approvalFlow.length) {
      const firstLevel = approvalFlow[0]
      const approvers = await this.chooseApproverFromLevel(firstLevel)
      currentApprovers = Array.isArray(approvers) ? approvers : (approvers ? [approvers] : [])
      if (!currentApprovers.length) {
        wx.showToast({ title: '请选择审批人', icon: 'none' })
        return
      }
    }

    wx.showLoading({ title: '提交中...', mask: true })

    const openid = currentOpenid()
    const userInfo = wx.getStorageSync('userInfo') || {}
    const submitterName = userInfo.name || userInfo.nickName || '微信用户'
    const submitData = {
      stationName: form.stationName,
      towerModel: form.towerModel,
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
      approvalFlowSnapshot: approvalFlow,
      currentApprovalStep: 0,
      currentApprovalType: approvalFlow[0]?.type || '单人审批',
      currentApprovers,
      currentApproverOpenids: currentApprovers.map(item => item.openid),
      currentApproverNames: currentApprovers.map(item => item.name),
      approvalStatusText: currentApprovers.length ? `待${currentApprovers.map(item => item.name).join('、')}审批` : '待审批',
      ...pendingPatch(db)
    }
    if (!this.data.editMode) submitData.createTime = db.serverDate()

    const task = this.data.editMode && this.data.editingId
      ? db.collection('mixing_tower_maintenance').doc(this.data.editingId).update({ data: submitData })
      : db.collection('mixing_tower_maintenance').add({ data: submitData })
    task.then(res => {
      wx.hideLoading()
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' })
      wx.removeStorageSync('mixing_tower_maintenance_draft')
      delayedSafeBack('/pages/index/index')
    }).catch(err => {
      console.error(err)
      wx.hideLoading()
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' })
    })
  },

  // ===== 草稿 =====
  loadDraft() {
    const draft = wx.getStorageSync('mixing_tower_maintenance_draft')
    if (!draft) return
    const stationIndex = this.data.stationOptions.findIndex(item => item.name === draft.stationName)
    this.setData({
      form: draft,
      stationIndex: stationIndex >= 0 ? stationIndex : -1
    })
  },

  saveDraft() {
    wx.setStorageSync('mixing_tower_maintenance_draft', { ...this.data.form, saveTime: new Date().toISOString() })
    wx.showToast({ title: '草稿已保存', icon: 'success' })
  },

  // ===== 查看记录 =====
  goToRecord() {
    wx.navigateTo({ url: '/pages/mixing-tower-maintenance-record/mixing-tower-maintenance-record' })
  }
})
