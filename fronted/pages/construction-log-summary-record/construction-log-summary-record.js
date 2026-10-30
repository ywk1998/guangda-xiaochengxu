// pages/construction-log-summary-record/construction-log-summary-record.js
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    filterName: '',
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
      approvalStatus: meta.status,
      canEdit: canEditRecord(item),
      statusLabel: meta.label,
      statusClass: meta.className,
      approvalRemark: item.approvalRemark || '',
      submitTimeStr: this.formatTime(item.createTime),
      expanded,
      subList: this.normalizeSubList(item.subList)
    })
  },

  loadSingleRecord(id) {
    this.setData({ loading: true })
    db.collection('construction_log_summary').doc(id).get()
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
    const { loading, noMore, pageIndex, pageSize, filterName, filterDate } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterName) {
      where.projectName = db.RegExp({ regexp: filterName, options: 'i' })
    }
    if (filterDate) {
      where.date = filterDate
    }

    loadFilteredPage({
      db,
      collection: 'construction_log_summary',
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

  // 名称搜索（输入即搜）
  onNameInput(e) {
    this.setData({
      filterName: e.detail.value,
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
      filterName: '',
      filterDate: '',
      pageIndex: 0,
      noMore: false,
      recordList: []
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

  normalizeSubList(list) {
    if (!Array.isArray(list)) return []
    return list.map(item => ({
      ...item,
      layer: item.layer || '-',
      designThick: this.displayValue(item.designThick),
      targetThick: this.displayValue(item.targetThick),
      avgThick: this.displayValue(item.avgThick),
      density: this.displayValue(item.density),
      designSpread: this.displayValue(item.designSpread),
      targetSpread: this.displayValue(item.targetSpread),
      contractArea: this.displayValue(item.contractArea),
      targetTon: this.displayValue(item.targetTon),
      cumArea: this.displayValue(item.cumArea),
      actualSpread: this.displayValue(item.actualSpread),
      material: item.material || '-',
      cumTon: this.displayValue(item.cumTon),
      areaTon: this.displayValue(item.areaTon),
      profit: this.displayValue(item.profit),
      profitClass: Number(item.profit) < 0 ? 'loss' : Number(item.profit) > 0 ? 'profit' : '',
      remark: item.remark || '-'
    }))
  },

  displayValue(value) {
    return value === 0 || value ? value : '-'
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
    wx.navigateTo({ url: `/pages/construction-log-summary/construction-log-summary?id=${id}&mode=edit` })
  }
})
