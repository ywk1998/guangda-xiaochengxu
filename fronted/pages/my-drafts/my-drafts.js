// pages/my-drafts/my-drafts.js - 我的草稿箱
const { formatDateTime } = require('../../utils/util')

Page({
  data: {
    activeTab: 'construction_log',
    activeTabLabel: '施工日志',
    tabs: [
      { key: 'construction_log', label: '施工日志', storageKey: 'construction_log_draft', page: '/pages/construction-log/construction-log' },
      { key: 'diesel_entry', label: '拌站油料入库表', storageKey: 'diesel_entry_draft', page: '/pages/diesel-entry/diesel-entry' },
      { key: 'diesel_out', label: '站点油料领用表', storageKey: 'diesel_out_draft', page: '/pages/diesel-out/diesel-out' },
      { key: 'diesel_delivery', label: '加油送油记录表', storageKey: 'diesel_delivery_draft', page: '/pages/diesel-delivery/diesel-delivery' },
      { key: 'TJform', label: '产品调价表', storageKey: 'cost_calc_draft', page: '/pages/cost-calc/cost-calc' },
      { key: 'construction_log_summary', label: '施工日志汇总', storageKey: 'construction_log_summary_draft', page: '/pages/construction-log-summary/construction-log-summary' },
      { key: 'equipment_maintenance', label: '机械设备保养', storageKey: 'equipment_maintenance_draft', page: '/pages/equipment-maintenance/equipment-maintenance' },
      { key: 'mixing_tower_maintenance', label: '拌合楼保养', storageKey: 'mixing_tower_maintenance_draft', page: '/pages/mixing-tower-maintenance/mixing-tower-maintenance' }
    ],
    draft: null,
    draftTitle: '',
    pagePath: ''
  },

  onLoad() {
    this.loadDraft()
  },

  onShow() {
    this.loadDraft()
  },

  // 下拉选择切换
  onTabChange(e) {
    const idx = e.detail.value
    const tab = this.data.tabs[idx]
    if (tab.key === this.data.activeTab) return
    this.setData({
      activeTab: tab.key,
      activeTabLabel: tab.label,
      pagePath: tab.page
    }, () => this.loadDraft())
  },

  // 加载草稿
  loadDraft() {
    const tab = this.data.tabs.find(t => t.key === this.data.activeTab)
    if (!tab || !tab.storageKey) {
      this.setData({ draft: null, draftTitle: '' })
      return
    }

    const draft = wx.getStorageSync(tab.storageKey)
    if (!draft) {
      this.setData({ draft: null, draftTitle: '' })
      return
    }

    // 生成标题
    let title = ''
    const { activeTab } = this.data
    if (activeTab === 'construction_log') title = draft.projectName || '施工日志'
    else if (activeTab === 'diesel_entry') title = draft.station || '拌站油料入库表'
    else if (activeTab === 'diesel_out') title = draft.projectLocation || '站点油料领用表'
    else if (activeTab === 'diesel_delivery') title = draft.projectLocation || '加油送油记录表'
    else if (activeTab === 'TJform') title = `${draft.stationName || ''} ${draft.productName || ''}`.trim() || '产品调价表'
    else if (activeTab === 'construction_log_summary') title = draft.projectName || '施工日志汇总'
    else if (activeTab === 'equipment_maintenance') title = draft.equipmentName || '机械设备保养'
    else if (activeTab === 'mixing_tower_maintenance') title = draft.stationName || '拌合楼保养'

    // 保存时间
    let saveTimeStr = ''
    if (draft.saveTime) {
      saveTimeStr = this.formatTime(draft.saveTime)
    } else if (draft._saveTime) {
      saveTimeStr = this.formatTime(draft._saveTime)
    }

    this.setData({
      draft: { ...draft, saveTimeStr },
      draftTitle: title,
      pagePath: tab.page
    })
  },

  // 继续编辑
  onContinueEdit() {
    const { pagePath } = this.data
    if (pagePath) {
      wx.navigateTo({ url: pagePath })
    }
  },

  // 删除草稿
  onDeleteDraft() {
    const tab = this.data.tabs.find(t => t.key === this.data.activeTab)
    if (!tab || !tab.storageKey) return

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条草稿吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(tab.storageKey)
          this.loadDraft()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 格式化时间
  formatTime(date) {
    return date ? formatDateTime(date) : ''
  }
})
