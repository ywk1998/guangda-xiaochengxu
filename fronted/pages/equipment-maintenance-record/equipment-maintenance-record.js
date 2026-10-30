// pages/equipment-maintenance-record/equipment-maintenance-record.js
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    filterDate: '',
    filterName: '',
    recordList: [],
    totalCount: 0,
    loading: false,
    noMore: false,
    pageIndex: 0,
    pageSize: 10,
    singleId: '',
    hasShown: false
  },

  onLoad(options = {}) {
    if (options.id) {
      this.setData({ singleId: options.id })
      this.loadSingleRecord(options.id)
      return
    }
    this.loadRecords()
  },

  onShow() {
    if (!this.data.hasShown) {
      this.setData({ hasShown: true })
      return
    }
    this.resetAndLoad()
  },

  resetAndLoad() {
    this.setData({ recordList: [], totalCount: 0, pageIndex: 0, noMore: false, loading: false }, () => {
      if (this.data.singleId) this.loadSingleRecord(this.data.singleId)
      else this.loadRecords()
    })
  },

  normalizeRecord(item, expanded = false) {
    const meta = approvalStatusMeta(item)
    return normalizeApprovalTimelineRecord({
      ...item,
      expanded,
      status: meta.status,
      approvalStatus: meta.status,
      canEdit: canEditRecord(item),
      approvalRemark: item.approvalRemark || '',
      statusClass: meta.className,
      statusLabel: meta.label,
      maintenanceItems: this.normalizeMaintenanceItems(item.maintenanceItems),
      partsList: this.normalizePartsList(item.partsList),
      photos: Array.isArray(item.photos) ? item.photos : Array.isArray(item.photoUrls) ? item.photoUrls : [],
      remark: item.remark || '',
      submitTimeStr: this.formatTime(item.createTime)
    })
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('equipment_maintenance').doc(id).get()
      .then(async res => {
        const item = res.data || {}
        if (isDeletedRecord(item) || !canViewRecord(item)) {
          this.setData({ recordList: [], totalCount: 0, loading: false, noMore: true })
          wx.showToast({ title: isDeletedRecord(item) ? '记录已删除' : '无权查看', icon: 'none' })
          return
        }
        const record = await enrichApprovalTimelineRecords(this.normalizeRecord(item, true))
        this.setData({
          recordList: [record],
          totalCount: 1,
          loading: false,
          noMore: true
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false, noMore: true })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 加载记录
  loadRecords() {
    const { loading, noMore, pageIndex, pageSize, filterDate, filterName } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterDate) {
      where.maintenanceDate = filterDate
    }
    if (filterName) {
      where.equipmentName = db.RegExp({ regexp: filterName, options: 'i' })
    }

    loadFilteredPage({
      db,
      collection: 'equipment_maintenance',
      where,
      pageIndex,
      pageSize,
      filter: item => !isDeletedRecord(item) && canViewRecord(item),
      map: item => this.normalizeRecord(item),
      enrich: enrichApprovalTimelineRecords
    })
      .then(({ list: nextList, nextPageIndex, noMore }) => {
        this.setData({
          recordList: this.data.pageIndex === 0 ? nextList : this.data.recordList.concat(nextList),
          totalCount: this.data.pageIndex === 0 ? nextList.length : this.data.totalCount + nextList.length,
          loading: false,
          noMore,
          pageIndex: nextPageIndex
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({ loading: false })
      })
  },

  // 日期筛选
  onDateFilterChange(e) {
    this.setData({
      filterDate: e.detail.value,
      pageIndex: 0, noMore: false, recordList: []
    }, () => this.loadRecords())
  },

  // 名称筛选
  onNameInput(e) {
    this.setData({
      filterName: e.detail.value,
      pageIndex: 0, noMore: false, recordList: []
    }, () => this.loadRecords())
  },

  // 重置筛选
  onResetFilter() {
    this.setData({
      filterDate: '', filterName: '',
      pageIndex: 0, noMore: false, recordList: []
    }, () => this.loadRecords())
  },

  // 展开/收起明细
  toggleDetail(e) {
    const { id } = e.currentTarget.dataset
    const recordList = this.data.recordList.map(item => (
      item._id === id ? { ...item, expanded: !item.expanded } : item
    ))
    this.setData({ recordList })
  },

  normalizeMaintenanceItems(list) {
    if (!Array.isArray(list)) return []
    return list.map(item => ({
      part: item.part || item.name || '-',
      content: item.content || item.maintenanceContent || '-'
    }))
  },

  normalizePartsList(list) {
    if (!Array.isArray(list)) return []
    return list.map(item => ({
      name: item.name || item.partName || '-',
      quantity: item.quantity === 0 || item.quantity ? item.quantity : '-'
    }))
  },

  previewPhoto(e) {
    const { current, urls } = e.currentTarget.dataset
    wx.previewImage({ current, urls })
  },

  // 格式化时间
  formatTime(date) {
    return formatDateTime(date)
  },

  // 加载更多
  loadMore() {
    this.loadRecords()
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/equipment-maintenance/equipment-maintenance?id=${id}&mode=edit` })
  }
})
