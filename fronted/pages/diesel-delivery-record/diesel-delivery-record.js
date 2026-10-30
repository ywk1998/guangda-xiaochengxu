// pages/diesel-delivery-record/diesel-delivery-record.js - 加油车送油记录
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    filterDate: '',
    filterPlateNumber: '',
    filterDriver: '',
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

  normalizeRecord(item) {
    const meta = approvalStatusMeta(item)
    const equipmentList = Array.isArray(item.equipmentList)
      ? item.equipmentList.map(equipment => ({
        ...equipment,
        image: this.normalizeImages(equipment && equipment.image)
      }))
      : []
    return normalizeApprovalTimelineRecord({
      ...item,
      equipmentList,
      status: meta.status,
      approvalStatus: meta.status,
      canEdit: canEditRecord(item),
      approvalRemark: item.approvalRemark || '',
      statusLabel: meta.label,
      statusClass: meta.className,
      submitTimeStr: this.formatTime(item.createTime),
      expanded: false
    })
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean)
    return value ? [value] : []
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('diesel_delivery').doc(id).get()
      .then(async res => {
        const item = res.data || {}
        if (isDeletedRecord(item) || !canViewRecord(item)) {
          this.setData({ recordList: [], totalCount: 0, loading: false, noMore: true })
          wx.showToast({ title: isDeletedRecord(item) ? '记录已删除' : '无权查看', icon: 'none' })
          return
        }
        const record = await enrichApprovalTimelineRecords(this.normalizeRecord(item))
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
    const { loading, noMore, pageIndex, pageSize, filterDate, filterPlateNumber, filterDriver } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterDate) {
      where.date = filterDate
    }
    if (filterPlateNumber) {
      where.plateNumber = db.RegExp({ regexp: filterPlateNumber, options: 'i' })
    }
    if (filterDriver) {
      where.driver = db.RegExp({ regexp: filterDriver, options: 'i' })
    }

    loadFilteredPage({
      db,
      collection: 'diesel_delivery',
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
    const date = e.detail.value
    this.setData({
      filterDate: date,
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  // 车牌号筛选
  onPlateNumberInput(e) {
    this.setData({
      filterPlateNumber: e.detail.value,
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  // 司机筛选
  onDriverInput(e) {
    this.setData({
      filterDriver: e.detail.value,
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  // 重置筛选
  onResetFilter() {
    this.setData({
      filterDate: '',
      filterPlateNumber: '',
      filterDriver: '',
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  // 格式化时间
  formatTime(date) {
    return formatDateTime(date)
  },

  toggleDetail(e) {
    const id = e.currentTarget.dataset.id
    const recordList = this.data.recordList.map(item => (
      item._id === id ? { ...item, expanded: !item.expanded } : item
    ))
    this.setData({ recordList })
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls || []
    if (!url) return
    wx.previewImage({ urls, current: url })
  },

  // 加载更多
  loadMore() {
    this.loadRecords()
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/diesel-delivery/diesel-delivery?id=${id}&mode=edit` })
  }
})
