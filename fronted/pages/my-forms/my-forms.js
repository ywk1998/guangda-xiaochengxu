// pages/my-forms/my-forms.js - 我的表单
const db = wx.cloud.database()
const { formatDateTime } = require('../../utils/util')
const { approvalStatusMeta } = require('../../utils/form-edit')
const { currentOpenid } = require('../../utils/participants')
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    activeTab: 'construction_log',
    activeTabLabel: '施工日志',
    tabs: [
      { key: 'construction_log', label: '施工日志' },
      { key: 'output_record', label: '拌站出料表' },
      { key: 'diesel_entry', label: '拌站油料入库表' },
      { key: 'diesel_out', label: '站点油料领用表' },
      { key: 'diesel_delivery', label: '加油送油记录表' },
      { key: 'TJform', label: '产品调价表' },
      { key: 'construction_log_summary', label: '施工日志汇总' },
      { key: 'equipment_maintenance', label: '机械设备保养' },
      { key: 'mixing_tower_maintenance', label: '拌合楼保养' }
    ],
    recordList: [],
    totalCount: 0,
    loading: false,
    noMore: false,
    pageIndex: 0,
    pageSize: 10,
    hasShown: false
  },

  onLoad() {
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
    }, () => this.loadRecords())
  },

  // 下拉选择切换
  onTabChange(e) {
    const idx = e.detail.value
    const tab = this.data.tabs[idx]
    if (tab.key === this.data.activeTab) return
    this.setData({
      activeTab: tab.key,
      activeTabLabel: tab.label,
      recordList: [],
      totalCount: 0,
      pageIndex: 0,
      noMore: false,
      loading: false
    }, () => this.loadRecords())
  },

  // 加载记录
  loadRecords() {
    const { loading, noMore, pageIndex, pageSize, activeTab } = this.data
    if (loading || noMore) return

    const openid = currentOpenid()
    if (!openid) {
      this.setData({ recordList: [], totalCount: 0, loading: false, noMore: true })
      return
    }

    this.setData({ loading: true })

    loadFilteredPage({
      db,
      collection: activeTab,
      where: {},
      pageIndex,
      pageSize,
      filter: item => {
          if ((item.approvalStatus || item.status) === 'deleted') return false
          return item.submitterOpenid === openid
        },
      map: item => {
          const meta = approvalStatusMeta(item)
          const approvalStatus = meta.status
          const statusClass = meta.className
          const statusLabel = meta.label
          // 统一标题
          let title = ''
          if (activeTab === 'construction_log') title = item.projectName || '施工日志'
          else if (activeTab === 'output_record') title = item.projectName || '拌站出料表'
          else if (activeTab === 'diesel_entry') title = item.station || '拌站油料入库表'
          else if (activeTab === 'diesel_out') title = item.projectLocation || '站点油料领用表'
          else if (activeTab === 'diesel_delivery') title = item.projectLocation || '加油送油记录表'
          else if (activeTab === 'TJform') title = `${item.stationName || ''} ${item.productName || ''}`.trim() || '产品调价表'
          else if (activeTab === 'construction_log_summary') title = item.projectName || '施工日志汇总'
          else if (activeTab === 'equipment_maintenance') title = item.equipmentName || '机械设备保养'
          else if (activeTab === 'mixing_tower_maintenance') title = item.stationName || '拌合楼保养'
          return {
            ...item,
            status: approvalStatus,
            approvalStatus,
            approvalRemark: item.approvalRemark || '',
            title,
            statusClass,
            statusLabel,
            submitTimeStr: this.formatTime(item.createTime || item.submitTime)
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

  // 跳转详情
  goToDetail(e) {
    const { id, type } = e.currentTarget.dataset
    let url = ''
    if (type === 'construction_log') url = `/pages/log-detail/log-detail?id=${id}`
    else if (type === 'output_record') url = `/pages/output-detail/output-detail?id=${id}`
    else if (type === 'diesel_entry') url = `/pages/diesel-entry-record/diesel-entry-record?id=${id}`
    else if (type === 'diesel_out') url = `/pages/diesel-out-record/diesel-out-record?id=${id}`
    else if (type === 'diesel_delivery') url = `/pages/diesel-delivery-record/diesel-delivery-record?id=${id}`
    else if (type === 'TJform') url = `/pages/cost-calc-record/cost-calc-record?id=${id}`
    else if (type === 'construction_log_summary') url = `/pages/construction-log-summary-record/construction-log-summary-record?id=${id}`
    else if (type === 'equipment_maintenance') url = `/pages/equipment-maintenance-record/equipment-maintenance-record?id=${id}`
    else if (type === 'mixing_tower_maintenance') url = `/pages/mixing-tower-maintenance-record/mixing-tower-maintenance-record?id=${id}`
    if (url) wx.navigateTo({ url })
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
