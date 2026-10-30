// pages/construction-log-record/construction-log-record.js
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { canViewRecord } = require('../../utils/participants')
const { approvalStatusMeta } = require('../../utils/form-edit')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    projectOptions: [],
    filterProjectName: '',
    filterProject: '',
    filterDate: '',
    recordList: [],
    totalCount: 0,
    loading: false,
    noMore: false,
    pageIndex: 0,
    pageSize: 10,
    hasShown: false
  },

  onLoad() {
    this.loadProjectOptions()
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
    this.setData({
      recordList: [],
      totalCount: 0,
      pageIndex: 0,
      noMore: false,
      loading: false
    }, () => {
      this.loadProjectOptions()
      this.loadRecords()
    })
  },

  // 加载项目筛选选项
  loadProjectOptions() {
    db.collection('construction_log')
      .field({ projectName: true })
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()
      .then(res => {
        const map = {}
        const list = [{ name: '全部项目' }]
        ;(res.data || []).filter(item => (item.approvalStatus || item.status) !== 'deleted' && canViewRecord(item)).forEach(item => {
          if (item.projectName && !map[item.projectName]) {
            map[item.projectName] = true
            list.push({ name: item.projectName })
          }
        })
        this.setData({ projectOptions: list })
      })
  },

  // 加载记录
  loadRecords() {
    const { loading, noMore, pageIndex, pageSize, filterProject, filterDate } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    let where = {}
    if (filterProject) {
      where.projectName = filterProject
    }
    if (filterDate) {
      where.date = filterDate
    }

    loadFilteredPage({
      db,
      collection: 'construction_log',
      where,
      pageIndex,
      pageSize,
      filter: item => (item.approvalStatus || item.status) !== 'deleted' && canViewRecord(item),
      map: item => {
          const meta = approvalStatusMeta(item)
          const approvalStatus = meta.status
          return {
            ...item,
            status: approvalStatus,
            approvalStatus,
            approvalRemark: item.approvalRemark || '',
            statusClass: meta.className,
            statusLabel: meta.label,
            submitTimeStr: this.formatTime(item.submitTime)
          }
        }
    })
      .then(({ list, nextPageIndex, noMore }) => {

        this.setData({
          recordList: this.data.pageIndex === 0 ? list : this.data.recordList.concat(list),
          totalCount: this.data.pageIndex === 0 ? list.length : this.data.totalCount + list.length,
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

  // 项目筛选
  onProjectFilterChange(e) {
    const idx = e.detail.value
    const project = this.data.projectOptions[idx]
    this.setData({
      filterProject: idx === 0 ? '' : project.name,
      filterProjectName: project.name,
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
      filterProject: '',
      filterProjectName: '',
      filterDate: '',
      pageIndex: 0,
      noMore: false,
      recordList: []
    }, () => this.loadRecords())
  },

  // 跳转详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/log-detail/log-detail?id=${id}` })
  },

  // 格式化时间
  formatTime(date) {
    return formatDateTime(date)
  },

  // 加载更多
  loadMore() {
    this.loadRecords()
  }
})
