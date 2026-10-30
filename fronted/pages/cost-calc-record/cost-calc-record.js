// pages/cost-calc-record/cost-calc-record.js
const db = wx.cloud.database()
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

  normalizeRecord(item) {
    const meta = approvalStatusMeta(item)
    const oldP = parseFloat(item.OldPrice) || 0
    const newP = parseFloat(item.NewPrice) || 0
    const diff = newP - oldP
    let priceChangeClass = 'flat'
    let priceChangeLabel = '持平'
    if (diff > 0) {
      priceChangeClass = 'up'
      priceChangeLabel = `上涨 +${diff.toFixed(2)}`
    } else if (diff < 0) {
      priceChangeClass = 'down'
      priceChangeLabel = `下降 ${diff.toFixed(2)}`
    }
    return normalizeApprovalTimelineRecord({
      ...item,
      approvalStatus: meta.status,
      canEdit: canEditRecord(item),
      approvalRemark: item.approvalRemark || '',
      statusLabel: meta.label,
      statusClass: meta.className,
      priceChangeClass,
      priceChangeLabel,
      submitTimeStr: item.submitTimeStr || ''
    })
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('TJform').doc(id).get()
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

  // 加载站点筛选选项
  loadStationOptions() {
    db.collection('TJform').field({ stationName: true }).get().then(res => {
      const map = {}
      const list = [{ name: '全部站点' }]
      ;(res.data || []).filter(item => !isDeletedRecord(item) && canViewRecord(item)).forEach(item => {
        if (item.stationName && !map[item.stationName]) {
          map[item.stationName] = true
          list.push({ name: item.stationName })
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
      where.stationName = filterStation
    }
    if (filterDate) {
      where.TJtime = filterDate
    }

    loadFilteredPage({
      db,
      collection: 'TJform',
      where,
      orderBy: 'TJtime',
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

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/cost-calc/cost-calc?id=${id}&mode=edit` })
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

  // 加载更多
  loadMore() {
    this.loadRecords()
  }
})
