// pages/diesel-out-record/diesel-out-record.js - 站点柴油领用记录
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    stationOptions: [{ name: '全部站点' }],
    typeOptions: ['加油车加油', '项目设备到站现场加油', '搅拌站站内设备加油', '其他领用'],
    filterStationName: '',
    filterStation: '',
    filterTypeName: '',
    filterType: '',
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

  loadStationOptions() {
    db.collection('stations')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        const list = [{ name: '全部站点' }].concat((res.data || []).filter(item => item.name))
        this.setData({ stationOptions: list })
      })
      .catch(err => {
        console.error('加载站点失败', err)
      })
  },

  normalizeRecord(item) {
    const meta = approvalStatusMeta(item)
    return normalizeApprovalTimelineRecord({
      ...item,
      image: this.normalizeImages(item.image),
      status: meta.status,
      approvalStatus: meta.status,
      canEdit: canEditRecord(item),
      approvalRemark: item.approvalRemark || '',
      statusLabel: meta.label,
      statusClass: meta.className,
      submitTimeStr: this.formatTime(item.createTime)
    })
  },

  normalizeImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean)
    return value ? [value] : []
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('diesel_out').doc(id).get()
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
    const { loading, noMore, pageIndex, pageSize, filterStation, filterType, filterDate } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterStation) {
      where.station = filterStation
    }
    if (filterType) {
      where.type = filterType
    }
    if (filterDate) {
      where.date = filterDate
    }

    loadFilteredPage({
      db,
      collection: 'diesel_out',
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

  // 类型筛选
  onTypeFilterChange(e) {
    const idx = e.detail.value
    const type = this.data.typeOptions[idx]
    this.setData({
      filterType: type || '',
      filterTypeName: type || '',
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
      filterType: '',
      filterTypeName: '',
      filterDate: '',
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
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
    wx.navigateTo({ url: `/pages/diesel-out/diesel-out?id=${id}&mode=edit` })
  }
})
