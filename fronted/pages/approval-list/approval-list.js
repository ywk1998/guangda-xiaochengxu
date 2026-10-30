// pages/approval-list/approval-list.js
const { formatDateTime } = require('../../utils/util')
const { request } = require('../../utils/request')
const { canViewRecord, currentOpenid } = require('../../utils/participants')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')
const { loadFilteredPage } = require('../../utils/paged-records')
const { requestSubscribe } = require('../../utils/subscribe')

const STATUS_META = {
  pending: ['待审批', 'pending'],
  approved: ['已通过', 'approved'],
  rejected: ['已拒绝', 'rejected'],
  deleted: ['已删除', 'deleted']
}

const EMPTY_TEXT = '-'

const FIELD_LABELS = {
  projectName: '项目名称',
  roadSection: '施工路段',
  date: '日期',
  weather: '天气',
  recorder: '记录人',
  workers: '人员',
  machines: '机械',
  machineNote: '机械使用说明',
  materials: '材料',
  materialNote: '材料使用说明',
  shuiwenLayers: '水稳层',
  structureLayers: '结构层',
  funcLayers: '功能层',
  totalArea: '至今累计施工总面积',
  contractTotal: '合同量',
  safetyEdu: '安全教育',
  safetyEduContent: '安全教育内容',
  personalProtection: '个人防护',
  trafficGuide: '交通疏导',
  envProtect: '环境保护',
  hazardFound: '发现隐患',
  hazardFixed: '已整改隐患',
  hazardUnfixed: '未整改说明',
  tomorrowPlan: '明日计划',
  name: '名称',
  team: '施工队伍',
  spec: '规格型号',
  dayQty: '当日数量',
  totalQty: '累计数量',
  name1: '人员1',
  name2: '人员2',
  count: '数量',
  model: '型号',
  avgThickness: '平均厚度',
  constructArea: '施工面积',
  designThickness: '设计厚度',
  designQty: '设计数量',
  cumQty: '累计完成数量',
  layer: '结构/功能层',
  material: '材料',
  designThick: '设计厚度',
  targetThick: '目标厚度',
  avgThick: '平均厚度',
  density: '密度',
  designSpread: '设计撒布量(kg/m²)',
  targetSpread: '目标撒布量(kg/m²)',
  contractArea: '合同量(m²)',
  targetTon: '目标用量(T)',
  cumArea: '累计施工面积(m²)',
  actualSpread: '实际撒布量(kg/m²)',
  cumTon: '累计用量(T)',
  areaTon: '实际面积目标用量(T)',
  profit: '盈亏',
  profitClass: '盈亏状态',
  funcArea: '功能层面积',
  contractQty: '合同数量',
  category: '类别',
  materialName: '材料名称',
  materialList: '物料明细',
  totalWeight: '合计重量',
  weight: '物料重量',
  unit: '单位',
  todayOutput: '今日产量',
  water: '水',
  electricity: '电',
  coal: '煤',
  naturalGas: '天然气',
  otherConsumables: '其他耗材',
  factoryPrice: '出厂价',
  transportPrice: '运输价',
  totalPrice: '合计单价',
  totalAmount: '总金额',
  paidAmount: '已付金额',
  unpaidAmount: '未付金额',
  station: '站点',
  stationName: '站点',
  plateNumber: '车牌号',
  tankNumber: '油罐编号',
  volume: '数量',
  price: '单价',
  handler: '经办人',
  type: '类型',
  projectLocation: '项目地点',
  receiver: '接收人',
  driver: '司机',
  totalVolume: '总加油量',
  equipmentList: '设备列表',
  equipment: '设备信息',
  equipmentName: '设备名称',
  equipmentCode: '设备编号',
  currentHours: '设备当前工时数',
  equipmentType: '设备类型',
  fuelVolume: '加油量',
  fuel: '用油量',
  area: '施工量',
  image: '图片',
  Image: '图片',
  Equipment: '设备信息',
  Volume: '数量',
  productName: '产品名称',
  OldPrice: '原价格',
  NewPrice: '新价格',
  TJReason: '调价原因',
  TJtime: '调价时间',
  subList: '施工明细',
  totalContract: '合同量合计',
  totalTargetTon: '目标用量合计',
  totalArea: '累计施工面积合计',
  totalCumTon: '累计用量合计',
  totalProfit: '盈亏合计',
  maintenanceDate: '保养日期',
  maintenanceType: '保养类型',
  manager: '负责人',
  maintenanceItems: '保养项目',
  partsList: '配件列表',
  part: '保养部位',
  content: '保养内容',
  maintenanceContent: '保养内容',
  partName: '配件名称',
  quantity: '数量',
  towerModel: '拌合楼型号',
  photos: '照片',
  photoUrls: '照片',
  attachments: '附件',
  sizeText: '文件大小',
  ext: '文件格式',
  remark: '备注',
  submitterName: '提交人',
  submitTime: '提交时间',
  createTime: '创建时间',
  approvalRemark: '审批备注',
  approverName: '审批人',
  approvalTime: '审批时间'
}

// 按父字段区分的子字段标签（同一 key 在不同表格含义不同，避免被通用标签串味）
const SUB_FIELD_LABELS = {
  workers: { name: '姓名', team: '施工队伍' },
  machines: { name: '机械名称', area: '施工量(m²)', fuel: '用油量', image: '油量及里程图' },
  materials: { name: '材料名称', dayQty: '当天数量(T)', totalQty: '项目累计(T)' },
  shuiwenLayers: { name: '层位', designQty: '设计数量', designThickness: '设计厚度(cm)', constructArea: '施工面积(m²)', avgThickness: '平均厚度(cm)', cumQty: '累计完成数量' },
  structureLayers: { type: '结构层类型', designQty: '设计数量', designThickness: '设计厚度(cm)', constructArea: '施工面积(m²)', avgThickness: '平均厚度(cm)', cumQty: '累计完成数量' },
  funcLayers: { type: '功能层类型', designQty: '设计数量', funcArea: '施工面积(m²)', cumQty: '累计完成数量' },
  attachments: { name: '文件名', ext: '文件格式', sizeText: '文件大小' },
  materialList: { name: '物料名称', weight: '物料重量' }
}

// 施工日志顶层字段的专属标签（覆盖通用 FIELD_LABELS）
const CONSTRUCTION_LOG_LABELS = {
  photos: '施工照片',
  attachments: '附件',
  shuiwenLayers: '水稳层',
  structureLayers: '结构层',
  funcLayers: '功能层',
  workers: '施工人员情况',
  machines: '机械使用情况',
  materials: '材料使用情况',
  createTime: '提交时间'
}

const CONSTRUCTION_LOG_SUMMARY_SUB_FIELDS = [
  'layer',
  'designThick',
  'targetThick',
  'avgThick',
  'density',
  'designSpread',
  'targetSpread',
  'contractArea',
  'targetTon',
  'cumArea',
  'actualSpread',
  'material',
  'cumTon',
  'areaTon',
  'profit',
  'remark'
]

const DETAIL_FIELDS = {
  construction_log: ['projectName', 'roadSection', 'date', 'weather', 'recorder', 'shuiwenLayers', 'structureLayers', 'funcLayers', 'photos', 'attachments', 'machines', 'machineNote', 'materials', 'materialNote', 'safetyEdu', 'safetyEduContent', 'personalProtection', 'trafficGuide', 'envProtect', 'hazardFound', 'hazardFixed', 'hazardUnfixed', 'workers', 'tomorrowPlan', 'submitterName', 'createTime'],
  output_record: ['date', 'category', 'station', 'projectName', 'materialList', 'totalWeight', 'unit', 'water', 'electricity', 'coal', 'naturalGas', 'otherConsumables', 'remark', 'submitterName', 'createTime'],
  diesel_entry: ['date', 'station', 'plateNumber', 'volume', 'price', 'totalAmount', 'tankNumber', 'handler', 'image', 'remark', 'submitterName', 'createTime'],
  diesel_out: ['date', 'station', 'tankNumber', 'type', 'equipment', 'volume', 'driver', 'image', 'remark', 'submitterName', 'createTime'],
  diesel_delivery: ['date', 'projectLocation', 'driver', 'plateNumber', 'totalVolume', 'equipmentList', 'remark', 'submitterName', 'createTime'],
  price_board: ['stationName', 'productName', 'OldPrice', 'NewPrice', 'unit', 'remark', 'createTime'],
  TJform: ['stationName', 'productName', 'OldPrice', 'NewPrice', 'TJReason', 'TJtime', 'submitterName', 'createTime'],
  construction_log_summary: ['projectName', 'date', 'subList', 'totalContract', 'totalTargetTon', 'totalArea', 'totalCumTon', 'totalProfit', 'remark', 'submitterName', 'createTime'],
  equipment_maintenance: ['equipmentName', 'equipmentCode', 'spec', 'currentHours', 'maintenanceDate', 'maintenanceType', 'manager', 'maintenanceItems', 'partsList', 'photos', 'remark', 'submitterName', 'createTime'],
  mixing_tower_maintenance: ['stationName', 'towerModel', 'maintenanceDate', 'maintenanceType', 'manager', 'maintenanceItems', 'partsList', 'photos', 'remark', 'submitterName', 'createTime']
}

const APPROVAL_COLLECTIONS = [
  'construction_log',
  'output_record',
  'diesel_entry',
  'diesel_out',
  'diesel_delivery',
  'price_board',
  'TJform',
  'construction_log_summary',
  'equipment_maintenance',
  'mixing_tower_maintenance'
]

Page({
  data: {
    activeTab: 'all',
    activeTabLabel: '全部',
    activeStatus: 'all',
    activeStatusLabel: '全部',
    statusOptions: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待审批' },
      { key: 'approved', label: '已通过' },
      { key: 'rejected', label: '已拒绝' },
      { key: 'deleted', label: '已删除' }
    ],
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'construction_log', label: '施工日志' },
      { key: 'output_record', label: '拌站出料表' },
      { key: 'diesel_entry', label: '拌站油料入库表' },
      { key: 'diesel_out', label: '站点油料领用表' },
      { key: 'diesel_delivery', label: '加油送油记录表' },
      { key: 'price_board', label: '今日挂牌价' },
      { key: 'TJform', label: '产品调价表' },
      { key: 'construction_log_summary', label: '施工日志汇总' },
      { key: 'equipment_maintenance', label: '机械设备保养' },
      { key: 'mixing_tower_maintenance', label: '拌合楼保养' }
    ],
    recordList: [],
    currentOpenid: '',
    nextApprovalSelector: {
      visible: false,
      title: '选择二级审批人',
      multiple: true,
      keyword: '',
      id: '',
      collection: '',
      approvers: [],
      filteredApprovers: [],
      selected: {},
      selectedCount: 0
    },
    totalCount: 0,
    loading: false,
    noMore: false,
    pageIndex: 0,
    pageSize: 10
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    if (userInfo.role !== 'admin') {
      wx.showToast({ title: '权限不足', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    this.setData({ currentOpenid: currentOpenid() })
    this.loadRecords()
  },

  // 微信要求 wx.requestSubscribeMessage 必须由用户点击触发，放在 onLoad 里会被拒绝，
  // 所以改成点「开启审批提醒」按钮时才申请「新待办通知」授权
  onEnableNotify() {
    requestSubscribe('pending').then(granted => {
      wx.showToast({
        title: granted ? '已开启，有待办时将收到微信通知' : '未授权或模板未配置',
        icon: 'none'
      })
    })
  },

  normalizeApprovers(list = []) {
    if (!Array.isArray(list)) return []
    return list.map(item => {
      if (!item) return null
      if (typeof item === 'string') return { openid: item, name: item }
      const openid = item.openid || item.userId || item._id || item.id || ''
      const name = item.name || item.nickName || item.username || openid
      return openid ? { openid, name } : null
    }).filter(Boolean)
  },

  normalizeApprovalLevels(levels = []) {
    if (!Array.isArray(levels)) return []
    return levels.map(level => ({
      type: level.type === '联合审批' || level.type === 'joint' ? '联合审批' : '单人审批',
      approvers: this.normalizeApprovers(level.approvers || level.users || level.approvalUsers || [])
    })).filter(level => level.approvers.length)
  },

  canViewApprovalRecord(item, collectionName) {
    if (!canViewRecord(item)) return false
    if ((item.approvalStatus || item.status) !== 'pending') return true
    const currentOpenid = this.data.currentOpenid
    const approvers = this.normalizeApprovers(item.currentApprovers)
    if (!approvers.length || !currentOpenid) return true
    return approvers.some(user => user.openid === currentOpenid) || this.hasApprovedApprovalRecord(item, currentOpenid)
  },

  canApproveRecord(item, collectionName) {
    if ((item.approvalStatus || item.status) !== 'pending') return false
    const currentOpenid = this.data.currentOpenid
    const approvers = this.normalizeApprovers(item.currentApprovers)
    if (!approvers.length || !currentOpenid) return true
    return approvers.some(user => user.openid === currentOpenid)
  },

  hasApprovedApprovalRecord(item, currentOpenid) {
    const history = Array.isArray(item.approvalHistory) ? item.approvalHistory : []
    return history.some(row => row.approverOpenid === currentOpenid)
  },

  onTabChange(e) {
    const tab = this.data.tabs[e.detail.value]
    if (!tab || tab.key === this.data.activeTab) return
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

  onStatusChange(e) {
    const status = this.data.statusOptions[e.detail.value]
    if (!status || status.key === this.data.activeStatus) return
    this.setData({
      activeStatus: status.key,
      activeStatusLabel: status.label,
      recordList: [],
      totalCount: 0,
      pageIndex: 0,
      noMore: false,
      loading: false
    }, () => this.loadRecords())
  },

  loadRecords() {
    const { loading, noMore, pageIndex, pageSize, activeTab, activeStatus } = this.data
    if (loading || noMore) return

    this.setData({ loading: true })

    if (activeTab === 'all') {
      this.loadAllRecords(activeStatus)
      return
    }

    const db = wx.cloud.database()
    loadFilteredPage({
      db,
      collection: activeTab,
      where: activeStatus === 'all' ? {} : { approvalStatus: activeStatus },
      pageIndex,
      pageSize,
      filter: item => this.canViewApprovalRecord(item, activeTab),
      map: item => this.normalizeRecord(item, activeTab),
      enrich: enrichApprovalTimelineRecords
    })
      .then(({ list: enrichedList, nextPageIndex, noMore }) => {
        const nextList = pageIndex === 0 ? enrichedList : this.data.recordList.concat(enrichedList)
        this.setData({
          recordList: nextList,
          totalCount: nextList.length,
          loading: false,
          noMore,
          pageIndex: nextPageIndex
        })
      })
      .catch(err => {
        console.error('加载审批列表失败', err)
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  loadAllRecords(activeStatus) {
    const db = wx.cloud.database()
    const where = activeStatus === 'all' ? {} : { approvalStatus: activeStatus }
    Promise.all(APPROVAL_COLLECTIONS.map(collection => (
      loadFilteredPage({
        db,
        collection,
        where,
        pageIndex: 0,
        pageSize: 100,
        filter: item => this.canViewApprovalRecord(item, collection),
        map: item => this.normalizeRecord(item, collection),
        maxScanPages: 5
      })
        .then(res => res.list)
        .catch(err => {
          console.warn(`加载${collection}审批列表失败`, err)
          return []
        })
    ))).then(async groups => {
      const list = groups
        .reduce((all, group) => all.concat(group), [])
        .sort((a, b) => this.getTimeValue(b.createTime || b.submitTime) - this.getTimeValue(a.createTime || a.submitTime))
      const enrichedList = await enrichApprovalTimelineRecords(list)

      this.setData({
        recordList: enrichedList,
        totalCount: enrichedList.length,
        loading: false,
        noMore: true,
        pageIndex: 1
      })
    }).catch(err => {
      console.error('加载全部审批列表失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    })
  },

  normalizeRecord(item, collectionName = this.data.activeTab) {
    const approvalStatus = item.approvalStatus || item.status || 'pending'
    const [statusLabel, statusClass] = STATUS_META[approvalStatus] || STATUS_META.pending
    const normalizedItem = collectionName === 'construction_log_summary'
      ? this.normalizeConstructionSummary(item)
      : item
    return normalizeApprovalTimelineRecord({
      ...normalizedItem,
      collectionName,
      recordKey: `${collectionName}-${normalizedItem._id || normalizedItem.id || ''}`,
      title: this.getTitle(normalizedItem, collectionName),
      approvalStatus,
      statusLabel: approvalStatus === 'pending' && normalizedItem.approvalStatusText ? normalizedItem.approvalStatusText : statusLabel,
      statusClass,
      canApprove: this.canApproveRecord(normalizedItem, collectionName),
      submitTimeStr: formatDateTime(normalizedItem.createTime || normalizedItem.submitTime),
      expanded: false,
      detailGroups: this.buildDetailGroups(normalizedItem, collectionName)
    }, formatDateTime(normalizedItem.createTime || normalizedItem.submitTime))
  },

  normalizeConstructionSummary(item) {
    const subList = Array.isArray(item.subList) ? item.subList : []
    const totals = subList.reduce((sum, row) => ({
      totalContract: sum.totalContract + (parseFloat(row.contractArea) || 0),
      totalTargetTon: sum.totalTargetTon + (parseFloat(row.targetTon) || 0),
      totalArea: sum.totalArea + (parseFloat(row.cumArea) || 0),
      totalCumTon: sum.totalCumTon + (parseFloat(row.cumTon) || 0),
      totalProfit: sum.totalProfit + (parseFloat(row.profit) || 0)
    }), {
      totalContract: 0,
      totalTargetTon: 0,
      totalArea: 0,
      totalCumTon: 0,
      totalProfit: 0
    })
    return {
      ...item,
      subList,
      totalContract: this.hasDisplayValue(item.totalContract) ? item.totalContract : this.formatTotal(totals.totalContract),
      totalTargetTon: this.hasDisplayValue(item.totalTargetTon) ? item.totalTargetTon : this.formatTotal(totals.totalTargetTon),
      totalArea: this.hasDisplayValue(item.totalArea) ? item.totalArea : this.formatTotal(totals.totalArea),
      totalCumTon: this.hasDisplayValue(item.totalCumTon) ? item.totalCumTon : this.formatTotal(totals.totalCumTon),
      totalProfit: this.hasDisplayValue(item.totalProfit) ? item.totalProfit : this.formatTotal(totals.totalProfit)
    }
  },

  formatTotal(value) {
    return Number(value || 0).toFixed(3).replace(/\.?0+$/, '')
  },

  buildDetailGroups(item, collectionName = this.data.activeTab) {
    const fields = DETAIL_FIELDS[collectionName] || Object.keys(item)
    return fields
      .filter(key => this.shouldDisplayField(key, item[key], collectionName))
      .map(key => ({
        key,
        label: this.topLabel(key, collectionName),
        value: this.formatValue(key, item[key]),
        isImage: this.isImageField(key, item[key]),
        isImageList: this.isImageListField(key, item[key]),
        images: this.normalizeImageList(item[key], key),
        isList: Array.isArray(item[key]),
        list: this.formatList(item[key], key, collectionName)
      }))
  },

  // 顶层字段标签：施工日志用专属标签，其余用通用标签
  topLabel(key, collectionName = this.data.activeTab) {
    if (collectionName === 'construction_log' && CONSTRUCTION_LOG_LABELS[key]) return CONSTRUCTION_LOG_LABELS[key]
    return FIELD_LABELS[key] || key
  },

  // 子字段标签：优先按所属表格取，避免"机械名称"被通用标签串成别的名字
  subLabel(parentKey, key) {
    const scope = SUB_FIELD_LABELS[parentKey]
    if (scope && scope[key]) return scope[key]
    return FIELD_LABELS[key] || this.camelToLabel(key)
  },

  // 列表项标题：机械 1 / 材料 1 / 施工人员情况 1
  listTitle(parentKey, index) {
    const base = (this.data.activeTab === 'construction_log' && CONSTRUCTION_LOG_LABELS[parentKey])
      || FIELD_LABELS[parentKey]
      || parentKey
    return `${base} ${index + 1}`
  },

  shouldDisplayField(key, value, collectionName = this.data.activeTab) {
    if (collectionName === 'construction_log_summary') return true
    return this.hasDisplayValue(value)
  },

  hasDisplayValue(value) {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    return true
  },

  formatValue(key, value) {
    if (key === 'createTime' || key === 'submitTime' || key === 'approvalTime') return formatDateTime(value)
    if (key === 'safetyEdu') {
      if (value === 1 || value === '1' || value === true) return '是'
      if (value === 0 || value === '0' || value === false) return '否'
    }
    if (value === undefined || value === null || value === '') return EMPTY_TEXT
    if (Array.isArray(value)) return ''
    if (typeof value === 'object') {
      return this.formatObject(value)
    }
    return String(value)
  },

  isImageField(key, value) {
    if (!value || typeof value !== 'string') return false
    return ['image', 'photo', 'photoUrl'].includes(key) || /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(value) || /\/uploads\//.test(value)
  },

  isImageListField(key, value) {
    return this.normalizeImageList(value).length > 0
  },

  normalizeImageList(value, key = '') {
    if (!Array.isArray(value)) return []
    return value.filter(item => key === 'photos' || this.isImageField('', item))
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls || [url]
    if (url) wx.previewImage({ urls, current: url })
  },

  formatList(list, key = '', collectionName = this.data.activeTab) {
    if (!Array.isArray(list)) return []
    if (key === 'subList' && collectionName === 'construction_log_summary' && list.length === 0) {
      return [{
        index: 0,
        title: '明细 1',
        text: '',
        isImage: false,
        rows: CONSTRUCTION_LOG_SUMMARY_SUB_FIELDS.map(field => ({
          key: field,
          label: FIELD_LABELS[field] || this.camelToLabel(field),
          value: EMPTY_TEXT,
          isImage: false
        }))
      }]
    }
    return list.map((item, index) => ({
      index,
      title: this.listTitle(key, index),
      text: typeof item === 'object' ? '' : String(item),
      isImage: typeof item !== 'object' && (key === 'photos' || this.isImageField('', item)),
      isImageList: Array.isArray(item) && this.isImageListField('', item),
      images: Array.isArray(item) ? this.normalizeImageList(item, key) : [],
      rows: typeof item === 'object' ? this.formatObjectRows(item, key, collectionName) : []
    }))
  },

  formatObject(value) {
    return this.formatObjectRows(value)
      .map(row => `${row.label}：${row.value}`)
      .join('\n')
  },

  formatObjectRows(value, parentKey = '', collectionName = this.data.activeTab) {
    if (!value || typeof value !== 'object') return []
    let keys = parentKey === 'subList' && collectionName === 'construction_log_summary'
      ? CONSTRUCTION_LOG_SUMMARY_SUB_FIELDS
      : Object.keys(value).filter(key => this.hasDisplayValue(value[key]))
    if (parentKey === 'attachments') {
      keys = keys.filter(key => key !== 'path' && key !== 'type' && key !== 'size')
    }
    return keys
      .map(key => ({
        key,
        label: this.subLabel(parentKey, key),
        value: this.formatNestedValue(value[key]),
        isImage: this.isImageField(key, value[key]),
        isImageList: this.isImageListField(key, value[key]),
        images: this.normalizeImageList(value[key], key)
      }))
  },

  formatNestedValue(value) {
    if (this.isImageListField('', value)) return ''
    if (Array.isArray(value)) {
      return value.map(item => (
        item && typeof item === 'object' ? this.formatObject(item).replace(/\n/g, '；') : String(item)
      )).join('，')
    }
    if (value && typeof value === 'object') return this.formatObject(value).replace(/\n/g, '；')
    if (value === undefined || value === null || value === '') return EMPTY_TEXT
    return String(value)
  },

  camelToLabel(key) {
    return FIELD_LABELS[key] || key
  },

  getTitle(item, collectionName = this.data.activeTab) {
    const type = collectionName
    if (type === 'construction_log') return '施工日志'
    if (type === 'output_record') return '拌站出料表'
    if (type === 'diesel_entry') return '拌站油料入库表'
    if (type === 'diesel_out') return '站点油料领用表'
    if (type === 'diesel_delivery') return '加油送油记录表'
    if (type === 'price_board') return '今日挂牌价'
    if (type === 'TJform') return '产品调价表'
    if (type === 'construction_log_summary') return '施工日志汇总'
    if (type === 'equipment_maintenance') return '机械设备保养'
    if (type === 'mixing_tower_maintenance') return '拌合楼保养'
    return '审批记录'
  },

  loadMore() {
    this.loadRecords()
  },

  toggleDetail(e) {
    const id = e.currentTarget.dataset.id
    const recordList = this.data.recordList.map(item => (
      item._id === id ? { ...item, expanded: !item.expanded } : item
    ))
    this.setData({ recordList })
  },

  onApprove(e) {
    const id = e.currentTarget.dataset.id
    const collection = e.currentTarget.dataset.collection
    const record = this.data.recordList.find(item => item._id === id && item.collectionName === collection)
    const nextLevel = this.getNextApprovalLevel(record)
    if (!nextLevel) {
      this.submitApproval(id, 'approve', '', collection)
      return
    }
    if (nextLevel.type === '单人审批') {
      this.chooseSingleNextApprover(nextLevel).then(approver => {
        if (approver) this.submitApproval(id, 'approve', '', collection, [approver])
      })
      return
    }
    this.openNextApprovalSelector(id, collection, nextLevel)
  },

  getNextApprovalLevel(record) {
    if (!record) return null
    const flow = this.normalizeApprovalLevels(record.approvalFlowSnapshot || record.approvalLevels)
    const currentStep = Math.max(Number(record.currentApprovalStep || 0), 0)
    return flow[currentStep + 1] || null
  },

  excludeCurrentApprover(approvers = []) {
    const openid = this.data.currentOpenid || currentOpenid() || ''
    if (!openid) return approvers
    return approvers.filter(item => item.openid !== openid)
  },

  chooseSingleNextApprover(level) {
    const approvers = this.excludeCurrentApprover(this.normalizeApprovers(level.approvers))
    if (!approvers.length) {
      wx.showToast({ title: '没有其他审批人', icon: 'none' })
      return Promise.resolve(null)
    }
    return new Promise(resolve => {
      this.nextApprovalSelectorResolve = resolve
      this.setData({
        nextApprovalSelector: {
          visible: true,
          title: '选择二级审批人',
          multiple: false,
          keyword: '',
          id: '',
          collection: '',
          approvers: approvers.map(item => ({ ...item, checked: false })),
          filteredApprovers: approvers.map(item => ({ ...item, checked: false })),
          selected: {},
          selectedCount: 0
        }
      })
    })
  },

  openNextApprovalSelector(id, collection, level) {
    const approvers = this.excludeCurrentApprover(this.normalizeApprovers(level.approvers))
    if (!approvers.length) {
      wx.showToast({ title: '没有其他审批人', icon: 'none' })
      return
    }
    this.setData({
      nextApprovalSelector: {
        visible: true,
        title: '选择二级审批人',
        multiple: true,
        keyword: '',
        id,
        collection,
        approvers: approvers.map(item => ({ ...item, checked: false })),
        filteredApprovers: approvers.map(item => ({ ...item, checked: false })),
        selected: {},
        selectedCount: 0
      }
    })
  },

  updateNextApprovalSelectorFilter() {
    const selector = this.data.nextApprovalSelector
    const keyword = String(selector.keyword || '').trim().toLowerCase()
    const filteredApprovers = selector.approvers.filter(item => {
      const text = `${item.name || ''}${item.openid || ''}`.toLowerCase()
      return !keyword || text.includes(keyword)
    })
    this.setData({ 'nextApprovalSelector.filteredApprovers': filteredApprovers })
  },

  onNextApprovalSelectorSearch(e) {
    this.setData({ 'nextApprovalSelector.keyword': e.detail.value || '' }, () => this.updateNextApprovalSelectorFilter())
  },

  toggleNextApprover(e) {
    const openid = e.currentTarget.dataset.openid
    const selector = this.data.nextApprovalSelector
    let selected = { ...selector.selected }
    if (selector.multiple) {
      if (selected[openid]) delete selected[openid]
      else selected[openid] = true
    } else {
      selected = selected[openid] ? {} : { [openid]: true }
    }
    const approvers = this.data.nextApprovalSelector.approvers.map(item => (
      item.openid === openid ? { ...item, checked: !item.checked } : item
    ))
    const filteredApprovers = this.data.nextApprovalSelector.filteredApprovers.map(item => (
      item.openid === openid ? { ...item, checked: !item.checked } : item
    ))
    this.setData({
      'nextApprovalSelector.selected': selected,
      'nextApprovalSelector.selectedCount': Object.keys(selected).length,
      'nextApprovalSelector.approvers': approvers,
      'nextApprovalSelector.filteredApprovers': filteredApprovers
    })
  },

  closeNextApprovalSelector() {
    if (this.nextApprovalSelectorResolve) {
      this.nextApprovalSelectorResolve(null)
      this.nextApprovalSelectorResolve = null
    }
    this.setData({
      nextApprovalSelector: {
        visible: false,
        title: '选择二级审批人',
        multiple: true,
        keyword: '',
        id: '',
        collection: '',
        approvers: [],
        filteredApprovers: [],
        selected: {},
        selectedCount: 0
      }
    })
  },

  confirmNextApprovalSelector() {
    const selector = this.data.nextApprovalSelector
    const nextApprovers = selector.approvers.filter(item => item.checked)
    if (!nextApprovers.length) {
      wx.showToast({ title: '请选择审批人', icon: 'none' })
      return
    }
    if (this.nextApprovalSelectorResolve) {
      this.nextApprovalSelectorResolve(selector.multiple ? nextApprovers : nextApprovers[0])
      this.nextApprovalSelectorResolve = null
      this.closeNextApprovalSelector()
      return
    }
    this.closeNextApprovalSelector()
    this.submitApproval(selector.id, 'approve', '', selector.collection, nextApprovers)
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id
    const collection = e.currentTarget.dataset.collection
    wx.showModal({
      title: '拒绝审批',
      editable: true,
      placeholderText: '请输入拒绝原因',
      confirmText: '拒绝',
      confirmColor: '#e74c3c',
      success: res => {
        if (res.confirm) this.submitApproval(id, 'reject', res.content || '', collection)
      }
    })
  },

  submitApproval(id, action, remark = '', collection = this.data.activeTab, nextApprovers = []) {
    if (!id) return
    if (!collection || collection === 'all') return
    const verb = action === 'reject' ? '拒绝' : '通过'
    wx.showModal({
      title: `确认${verb}`,
      content: `确定${verb}这条记录？`,
      confirmColor: action === 'reject' ? '#e74c3c' : '#1a6fc4',
      success: res => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...', mask: true })
        request({
          url: `/admin/collections/${collection}/${id}/approval`,
          method: 'POST',
          data: { action, remark, nextApprovers }
        }).then(() => {
          wx.hideLoading()
          wx.showToast({ title: '处理成功', icon: 'success' })
          this.setData({
            recordList: [],
            totalCount: 0,
            pageIndex: 0,
            noMore: false,
            loading: false
          }, () => this.loadRecords())
        }).catch(err => {
          wx.hideLoading()
          wx.showToast({ title: err.message || '处理失败', icon: 'none' })
        })
      }
    })
  },

  getTimeValue(value) {
    if (!value) return 0
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'object' && value.$date) return new Date(value.$date).getTime() || 0
    if (typeof value === 'object' && value.toDate) return value.toDate().getTime() || 0
    return new Date(String(value).replace(/-/g, '/')).getTime() || 0
  }
})
