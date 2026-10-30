// pages/cost-calc/cost-calc.js
const { delayedSafeBack } = require('../../utils/navigation')
const { canEditRecord, pendingPatch } = require('../../utils/form-edit')
const { currentOpenid } = require('../../utils/participants')
const { formatErrorMessage } = require('../../utils/error-message')
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
const db = wx.cloud.database()

Page({
  data: {
    collectionName: 'TJform',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    stationList: [],
    productList: [],
    stationIndex: -1,
    productIndex: -1,
    oldPrice: '',
    newPrice: '',
    TJReason: '',
    TJtime: ''
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('TJform');
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' })
    }
    this.loadStations()
  },

  // 暂存草稿
  onSaveDraft() {
    const { stationIndex, productIndex, stationList, productList, newPrice, TJReason, TJtime } = this.data
    if (stationIndex < 0 && !newPrice && !TJReason && !TJtime) {
      wx.showToast({ title: '无内容可保存', icon: 'none' })
      return
    }
    const draft = {
      stationName: stationIndex >= 0 ? stationList[stationIndex].stationName : '',
      productName: productIndex >= 0 ? productList[productIndex].productName : '',
      newPrice,
      TJReason,
      TJtime,
      saveTime: new Date().toISOString()
    }
    wx.setStorageSync('cost_calc_draft', draft)
    wx.showToast({ title: '草稿已保存', icon: 'success' })
  },

  // 加载站点列表（去重）
  loadStations() {
    db.collection('price_board').get().then(res => {
      const map = {}
      const list = []
      res.data.forEach(item => {
        if (item.stationName && !map[item.stationName]) {
          map[item.stationName] = true
          list.push({ stationName: item.stationName })
        }
      })
      this.setData({ stationList: list })
      if (this.data.editingId) this.loadRecordForEdit(this.data.editingId)
      else this.loadDraft()
    })
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true })
    db.collection('TJform').doc(id).get().then(res => {
      const record = res.data || {}
      if (!canEditRecord(record)) {
        wx.hideLoading()
        wx.showToast({ title: '当前状态不可修改', icon: 'none' })
        delayedSafeBack('/pages/index/index')
        return
      }
      const stationIdx = this.data.stationList.findIndex(s => s.stationName === record.stationName)
      this.setData({
        stationIndex: stationIdx,
        oldPrice: record.OldPrice || '',
        newPrice: record.NewPrice || '',
        TJReason: record.TJReason || '',
        TJtime: record.TJtime || ''
      })
      if (stationIdx < 0) {
        wx.hideLoading()
        return
      }
      db.collection('price_board').where({ stationName: record.stationName }).get().then(productRes => {
        const map = {}
        const list = []
        productRes.data.forEach(item => {
          if (item.productName && !map[item.productName]) {
            map[item.productName] = true
            list.push({ productName: item.productName })
          }
        })
        this.setData({
          productList: list,
          productIndex: list.findIndex(p => p.productName === record.productName)
        })
      }).finally(() => wx.hideLoading())
    }).catch(err => {
      wx.hideLoading()
      console.error('加载调价记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      delayedSafeBack('/pages/index/index')
    })
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('cost_calc_draft')
    if (!draft) return
    const stationIdx = this.data.stationList.findIndex(s => s.stationName === draft.stationName)
    if (stationIdx < 0) return
    this.setData({
      stationIndex: stationIdx,
      newPrice: draft.newPrice || '',
      TJReason: draft.TJReason || '',
      TJtime: draft.TJtime || ''
    })
    // 加载该站点的产品列表后再匹配
    db.collection('price_board').where({ stationName: draft.stationName }).get().then(res => {
      const map = {}
      const list = []
      res.data.forEach(item => {
        if (item.productName && !map[item.productName]) {
          map[item.productName] = true
          list.push({ productName: item.productName })
        }
      })
      const productIdx = list.findIndex(p => p.productName === draft.productName)
      this.setData({
        productList: list,
        productIndex: productIdx >= 0 ? productIdx : -1
      })
    })
  },

  // 选择站点
  onStationChange(e) {
    const idx = e.detail.value
    const stationName = this.data.stationList[idx].stationName
    this.setData({
      stationIndex: idx,
      productIndex: -1,
      productList: [],
      oldPrice: '',
      newPrice: '',
      TJReason: ''
    })
    // 加载该站点的产品列表
    db.collection('price_board').where({ stationName }).get().then(res => {
      const map = {}
      const list = []
      res.data.forEach(item => {
        if (item.productName && !map[item.productName]) {
          map[item.productName] = true
          list.push({ productName: item.productName })
        }
      })
      this.setData({ productList: list })
    })
  },

  // 选择产品后自动带出上次价格
  onProductChange(e) {
    const idx = e.detail.value
    const stationName = this.data.stationList[this.data.stationIndex].stationName
    const productName = this.data.productList[idx].productName
    this.setData({ productIndex: idx })
    // 从 price_board 查出上次价格
    db.collection('price_board').where({ stationName, productName }).limit(1).get().then(res => {
      if (res.data.length > 0) {
        this.setData({ oldPrice: res.data[0].OldPrice })
      }
    })
  },

  // 调价时间
  onTimeChange(e) {
    this.setData({ TJtime: e.detail.value })
  },

  // 本次价格输入
  onNewPriceInput(e) {
    this.setData({ newPrice: e.detail.value })
  },

  // 调价情况输入
  onReasonInput(e) {
    this.setData({ TJReason: e.detail.value })
  },

  // 查看调价记录
  goToRecord() {
    wx.navigateTo({ url: '/pages/cost-calc-record/cost-calc-record' })
  },

  // 提交
  async onSubmit() {
    const { stationIndex, productIndex, stationList, productList, oldPrice, newPrice, TJReason, TJtime } = this.data
    if (stationIndex < 0) return wx.showToast({ title: '请选择站点', icon: 'none' })
    if (productIndex < 0) return wx.showToast({ title: '请选择产品', icon: 'none' })
    if (!newPrice) return wx.showToast({ title: '请输入本次价格', icon: 'none' })
    if (!TJReason) return wx.showToast({ title: '请输入调价情况', icon: 'none' })
    if (!TJtime) return wx.showToast({ title: '请选择调价时间', icon: 'none' })

    const stationName = stationList[stationIndex].stationName
    const productName = productList[productIndex].productName

    const approvalFields = await this.prepareApprovalFields('TJform');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...' })

    const openid = currentOpenid()
    const userInfo = wx.getStorageSync('userInfo') || {}
    const submitterName = userInfo.name || userInfo.nickName || '微信用户'
    const submitData = {
      stationName,
      productName,
      OldPrice: oldPrice,
      NewPrice: newPrice,
      TJReason,
      TJtime,
      submitterOpenid: openid,
      submitterName,
      submitter: submitterName,
      ...approvalFields,
      ...pendingPatch(db)
    }
    if (!this.data.editMode) submitData.createTime = db.serverDate()
    const task = this.data.editMode && this.data.editingId
      ? db.collection('TJform').doc(this.data.editingId).update({ data: submitData })
      : db.collection('TJform').add({ data: submitData })
    task.then(() => {
      wx.hideLoading()
      wx.removeStorageSync('cost_calc_draft')
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' })
      delayedSafeBack('/pages/index/index')
    }).catch(err => {
      wx.hideLoading()
      console.error('提交失败', err)
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' })
    })
  }
})
