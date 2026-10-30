// pages/diesel-entry-record/diesel-entry-record.js - 拌站柴油入库记录
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    stationOptions: [],
    filterStationName: '',
    filterStation: '',
    filterDate: '',
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
    this.loadStationOptions()
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
      else {
        this.loadStationOptions()
        this.loadRecords()
      }
    })
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean)
    return value ? [value] : []
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('diesel_entry').doc(id).get()
      .then(async res => {
        const item = res.data || {}
        if (isDeletedRecord(item) || !canViewRecord(item)) {
          this.setData({ recordList: [], totalCount: 0, loading: false, noMore: true })
          wx.showToast({ title: isDeletedRecord(item) ? '记录已删除' : '无权查看', icon: 'none' })
          return
        }
        const meta = approvalStatusMeta(item)
        const record = normalizeApprovalTimelineRecord({
            ...item,
            approvalStatus: meta.status,
            canEdit: canEditRecord(item),
            approvalRemark: item.approvalRemark || '',
            approvalLabel: meta.label,
            approvalClass: meta.className,
            image: this.normalizeImages(item.image),
            totalAmount: item.totalAmount || (parseFloat(item.volume || 0) * parseFloat(item.price || 0)).toFixed(2),
            submitTimeStr: this.formatTime(item.createTime)
          })
        const nextRecord = await enrichApprovalTimelineRecords(record)
        this.setData({
          recordList: [nextRecord],
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

  // 加载站点筛选选项
  loadStationOptions() {
    db.collection('diesel_entry')
      .field({ station: true })
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()
      .then(res => {
        const map = {}
        const list = [{ name: '全部站点' }]
        ;(res.data || []).filter(item => !isDeletedRecord(item) && canViewRecord(item)).forEach(item => {
          if (item.station && !map[item.station]) {
            map[item.station] = true
            list.push({ name: item.station })
          }
        })
        this.setData({ stationOptions: list })
      })
  },

  // 加载记录
  loadRecords() {
    const { loading, noMore, pageIndex, pageSize, filterStation, filterDate } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterStation) {
      where.station = filterStation
    }
    if (filterDate) {
      where.date = filterDate
    }

    loadFilteredPage({
      db,
      collection: 'diesel_entry',
      where,
      pageIndex,
      pageSize,
      filter: item => !isDeletedRecord(item) && canViewRecord(item),
      map: item => {
          const meta = approvalStatusMeta(item)
          return normalizeApprovalTimelineRecord({
            ...item,
            approvalStatus: meta.status,
            canEdit: canEditRecord(item),
            approvalRemark: item.approvalRemark || '',
            approvalLabel: meta.label,
            approvalClass: meta.className,
            image: this.normalizeImages(item.image),
            totalAmount: item.totalAmount || (parseFloat(item.volume || 0) * parseFloat(item.price || 0)).toFixed(2),
            submitTimeStr: this.formatTime(item.createTime)
          })
        },
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

  // 站点筛选
  onStationFilterChange(e) {
    const idx = e.detail.value
    const station = this.data.stationOptions[idx]
    this.setData({
      filterStation: idx === 0 ? '' : station.name,
      filterStationName: station.name,
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
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

  // 重置筛选
  onResetFilter() {
    this.setData({
      filterStation: '',
      filterStationName: '',
      filterDate: '',
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  getApprovalStatusMeta(status) {
    const statusMap = {
      pending: ['待审批', 'pending'],
      approved: ['已通过', 'approved'],
      rejected: ['已拒绝', 'rejected']
    }
    return statusMap[status] || statusMap.pending
  },

  // 格式化时间
  formatTime(date) {
    return formatDateTime(date)
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls || []
    if (url) wx.previewImage({ urls, current: url })
  },

  // 加载更多
  loadMore() {
    this.loadRecords()
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/diesel-entry/diesel-entry?id=${id}&mode=edit` })
  }
})
