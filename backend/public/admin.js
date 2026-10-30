const collectionGroups = [
  {
    title: '展示内容',
    items: [
      ['banners', '轮播图', '首页轮播图片与跳转']
    ]
  },
  {
    title: '业务表单',
    items: [
      ['construction_log', '施工日志', '施工日志表单'],
      ['output_record', '拌站出料表', '拌站出料业务'],
      ['diesel_entry', '拌站油料入库表', '油料入库记录'],
      ['diesel_out', '站点油料领用表', '站点领用记录'],
      ['diesel_delivery', '加油送油记录表', '加油车送油记录'],
      ['price_board', '今日挂牌价', '今日材料价格'],
      ['TJform', '产品调价表', '产品调价记录'],
      ['construction_log_summary', '施工日志汇总', '施工日志汇总表'],
      ['equipment_maintenance', '机械设备保养', '机械设备保养记录'],
      ['mixing_tower_maintenance', '拌合楼保养', '拌合楼维护记录']
    ]
  },
  {
    title: '管理设置',
    items: [
      ['form_registry', '审批设置', '控制各业务表是否需要审批'],
      ['users', '用户管理', '维护小程序用户与角色'],
      ['stations', '站点管理', '维护油料表可选站点']
    ]
  }
];

const collections = collectionGroups.flatMap(group => group.items);
const collectionNameMap = Object.fromEntries(collections.map(([key, label]) => [key, label]));
const reverseCollectionNameMap = Object.fromEntries(collections.map(([key, label]) => [label, key]));
const businessCollectionKeys = [
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
];
const businessCollectionSet = new Set(businessCollectionKeys);
const approvalTypeOptions = ['单人审批', '联合审批'];
const fieldNameMap = {
  _id: '编号',
  id: '编号',
  name: '名称',
  title: '标题',
  imageUrl: '图片',
  link: '链接',
  label: '标签',
  value: '数值',
  unit: '单位',
  sort: '排序',
  status: '状态',
  approvalStatus: '审批状态',
  weather: '天气',
  recorder: '记录人',
  roadSection: '施工路段',
  approverOpenid: '处理人标识',
  approverName: '处理人',
  submitterOpenid: '提交人标识',
  submitterName: '提交人',
  submitTime: '提交时间',
  category: '分类',
  equipment: '设备/车辆',
  icon: '图标',
  coverColor: '封面颜色',
  desc: '简介',
  detail: '详情',
  tags: '标签',
  features: '特点',
  cases: '案例',
  price: '价格',
  contactTip: '联系提示',
  stationName: '站点名称',
  station: '站点',
  productName: '产品名称',
  projectName: '项目名称',
  materialName: '材料名称',
  materialList: '物料明细',
  totalWeight: '合计重量',
  date: '日期',
  createTime: '创建时间',
  updateTime: '更新时间',
  address: '地址',
  phone: '电话',
  capacity: '产能',
  latitude: '纬度',
  longitude: '经度',
  model: '型号',
  tankSize: '拌缸容量',
  type: '类型',
  OldPrice: '原价格',
  NewPrice: '新价格',
  TJReason: '调价原因',
  TJtime: '调价时间',
  volume: '数量',
  price: '单价',
  totalAmount: '总金额',
  remark: '备注',
  submitter: '提交人',
  approver: '审批人',
  approvalTime: '审批时间',
  approvalRemark: '审批备注',
  approvalRequired: '需要审批',
  approvalStatusText: '审批状态说明',
  approvalLevels: '审批流程',
  visibleUsers: '额外可见人',
  approvalFlowSnapshot: '审批流程快照',
  approvalHistory: '审批记录',
  currentApprovalStep: '当前审批级别',
  currentApprovalType: '当前审批类型',
  currentApprovers: '当前审批人',
  currentApproverOpenids: '当前审批人标识',
  currentApproverNames: '当前审批人',
  participants: '参与人',
  participantOpenids: '参与人标识',
  shuiwenLayers: '水稳层',
  structureLayers: '结构层',
  funcLayers: '功能层',
  subList: '施工明细',
  layer: '结构/功能层',
  machines: '机械使用',
  materials: '材料使用',
  workers: '施工人员',
  team: '施工队伍',
  designThickness: '设计厚度',
  designThick: '设计厚度(cm)',
  targetThick: '目标厚度(cm)',
  avgThick: '平均厚度(cm)',
  density: '密度(t/m³)',
  designSpread: '设计撒布量(kg/m²)',
  targetSpread: '目标撒布量(kg/m²)',
  contractArea: '合同量(m²)',
  targetTon: '目标用量(T)',
  cumArea: '累计施工面积(m²)',
  actualSpread: '实际撒布量(kg/m²)',
  material: '材料名称',
  cumTon: '累计用量(T)',
  areaTon: '实际面积目标用量(T)',
  profit: '盈亏',
  constructArea: '施工面积',
  avgThickness: '平均厚度',
  funcArea: '施工面积',
  contractQty: '合同量',
  totalArea: '累计施工总面积',
  contractTotal: '合同量',
  area: '施工量',
  fuel: '用油量',
  image: '图片',
  dayQty: '当天数量',
  totalQty: '项目累计',
  safetyEdu: '安全教育',
  safetyEduContent: '安全教育内容',
  personalProtection: '个人防护',
  trafficGuide: '交通疏导',
  envProtect: '环境保护',
  hazardFound: '发现隐患',
  hazardFixed: '已整改',
  hazardUnfixed: '未整改说明',
  tomorrowPlan: '明日工作计划',
  plateNumber: '车牌号',
  tankNumber: '油罐编号',
  handler: '经办人',
  projectLocation: '项目位置',
  receiver: '领用人',
  driver: '司机',
  deliveryVolume: '送油数量',
  todayOutput: '今日出料',
  water: '水',
  electricity: '电',
  coal: '煤',
  naturalGas: '天然气',
  otherConsumables: '其他耗材',
  factoryPrice: '出厂单价',
  transportPrice: '运输单价',
  totalPrice: '综合单价',
  paidAmount: '已付金额',
  unpaidAmount: '未付金额',
  totalOutputNative: '原生料累计',
  totalOutputRecycle: '再生料累计',
  deletedBy: '删除人',
  deletedTime: '删除时间',
  lastLoginTime: '最后登录时间',
  deleteReason: '删除原因',
  openid: '用户标识',
  role: '角色',
  manager: '负责人',
  equipmentCode: '设备编号',
  spec: '规格型号',
  maintenanceType: '保养类型',
  maintenanceItems: '保养项目',
  partsList: '配件清单',
  part: '保养部位',
  quantity: '数量',
  photos: '照片',
  photoUrls: '照片地址',
  towerModel: '拌合楼型号',
  equipmentList: '设备清单',
  totalVolume: '合计升数',
  workHours: '工作时间',
  wechat: '微信',
  email: '邮箱',
  avatarUrl: '头像',
  nickName: '昵称',
  password: '密码',
  collectionName: '数据表',
  content: '内容',
  action: '操作',
  stepIndex: '审批级别',
  checked: '已选择',
  approvers: '审批人',
  readTime: '阅读时间',
  recordId: '记录编号',
  time: '时间',
  logId: '日志编号',
  logDate: '日志日期',
  toOpenid: '接收人标识',
  isRead: '是否已读',
  totalOutput: '总出料',
  totalProjectOutput: '项目累计出料',
  oldPrice: '原价格',
  newPrice: '新价格',
  reason: '原因',
  handlerName: '经办人',
  maintenanceDate: '保养日期',
  equipmentName: '设备名称',
  equipmentNo: '设备编号',
  maintenanceContent: '保养内容',
  maintenancePerson: '保养人',
  currentHours: '设备当前工时数',
  towerName: '拌合楼名称',
  inspectionContent: '检查内容',
  issueFound: '发现问题',
  fixResult: '处理结果'
};
const reverseFieldNameMap = Object.fromEntries(
  Object.entries(fieldNameMap).filter(([, label]) => label).map(([key, label]) => [label, key])
);
const nestedFieldNameMap = {
  maintenanceItems: {
    part: '保养部位',
    content: '保养内容',
    maintenanceContent: '保养内容'
  },
  partsList: {
    name: '配件名称',
    partName: '配件名称',
    quantity: '数量'
  },
  equipmentList: {
    equipment: '设备名称/编号',
    volume: '加油升数',
    image: '加油图片'
  },
  machines: {
    name: '机械名称',
    area: '施工量',
    fuel: '用油量',
    image: '机械照片',
    remark: '备注'
  },
  materials: {
    name: '材料名称',
    dayQty: '当日数量',
    totalQty: '累计数量',
    remark: '备注'
  },
  workers: {
    name: '姓名',
    team: '施工队伍'
  },
  shuiwenLayers: {
    name: '水稳层',
    designThickness: '设计厚度',
    constructArea: '施工面积',
    avgThickness: '平均厚度'
  },
  structureLayers: {
    type: '结构层类型',
    designThickness: '设计厚度',
    constructArea: '施工面积',
    avgThickness: '平均厚度'
  },
  funcLayers: {
    type: '功能层类型',
    funcArea: '施工面积'
  },
  subList: {
    layer: '结构/功能层',
    designThick: '设计厚度(cm)',
    targetThick: '目标厚度(cm)',
    avgThick: '平均厚度(cm)',
    density: '密度(t/m³)',
    designSpread: '设计撒布量(kg/m²)',
    targetSpread: '目标撒布量(kg/m²)',
    contractArea: '合同量(m²)',
    targetTon: '目标用量(T)',
    cumArea: '累计施工面积(m²)',
    actualSpread: '实际撒布量(kg/m²)',
    material: '材料名称',
    cumTon: '累计用量(T)',
    areaTon: '实际面积目标用量(T)',
    profit: '盈亏',
    remark: '备注'
  }
};
const complexItemTitleMap = {
  maintenanceItems: '保养项目',
  partsList: '配件',
  equipmentList: '设备',
  machines: '机械',
  materials: '材料',
  workers: '人员',
  shuiwenLayers: '水稳层',
  structureLayers: '结构层',
  funcLayers: '功能层',
  subList: '施工明细'
};
const statusNameMap = {
  0: '停用',
  1: '启用',
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  deleted: '已删除',
  active: '启用',
  inactive: '停用'
};
const reverseStatusNameMap = {
  停用: 0,
  启用: 1,
  待审批: 'pending',
  已通过: 'approved',
  已拒绝: 'rejected',
  已删除: 'deleted'
};

const defaultFieldsByCollection = {
  banners: { title: '', imageUrl: '', link: '', sort: 1, status: 1 },
  stats: { label: '', value: '', unit: '', sort: 1, status: 1 },
  products: { name: '', category: '', desc: '', tags: [], sort: 1, status: 1 },
  mixing_station: { name: '', address: '', phone: '', capacity: '', status: 1, sort: 1 },
  construction_log: { projectName: '', roadSection: '', date: '', weather: '', recorder: '', status: 'pending', workers: [], machines: [], materials: [], tomorrowPlan: '' },
  output_record: { date: '', category: '沥青混合料', station: '', projectName: '', materialList: [], totalWeight: '', unit: '吨', water: '', electricity: '', coal: '', naturalGas: '', otherConsumables: '', approvalStatus: 'pending', remark: '' },
  diesel_entry: { date: '', station: '', plateNumber: '', volume: '', price: '', totalAmount: '', handler: '', approvalStatus: 'pending', remark: '' },
  diesel_out: { date: '', station: '', type: '', projectLocation: '', receiver: '', volume: '', handler: '', approvalStatus: 'pending', remark: '' },
  diesel_delivery: { date: '', projectLocation: '', driver: '', plateNumber: '', totalVolume: '', equipmentList: [], approvalStatus: 'pending', remark: '' },
  price_board: { stationName: '', productName: '', OldPrice: '', NewPrice: '', unit: '元/吨', status: 1, approvalStatus: 'approved' },
  TJform: { stationName: '', productName: '', OldPrice: '', NewPrice: '', TJReason: '', TJtime: '', approvalStatus: 'pending' },
  construction_log_summary: { projectName: '', date: '', subList: [], approvalStatus: 'pending', remark: '' },
  equipment_maintenance: { equipmentName: '', equipmentCode: '', spec: '', currentHours: '', maintenanceDate: '', maintenanceType: '', manager: '', maintenanceItems: [], partsList: [], approvalStatus: 'pending', remark: '' },
  mixing_tower_maintenance: { stationName: '', towerModel: '', maintenanceDate: '', maintenanceType: '', manager: '', maintenanceItems: [], partsList: [], approvalStatus: 'pending', remark: '' },
  form_registry: { collectionName: '', approvalRequired: true, visibleUsers: [], sort: 1, status: 1 },
  users: { openid: '', name: '', role: 'submitter', status: 1 },
  stations: { name: '', address: '', phone: '', capacity: '', sort: 1, status: 1 }
};

const fieldOrderByCollection = {
  form_registry: ['collectionName', 'approvalRequired', 'visibleUsers', 'sort', 'status', 'createTime', 'updateTime'],
  users: ['openid', 'name', 'role', 'status', 'lastLoginTime', 'createTime'],
  stations: ['name', 'address', 'phone', 'capacity', 'sort', 'status', 'createTime', 'updateTime'],
  construction_log: ['projectName', 'roadSection', 'date', 'weather', 'recorder', 'status', 'approvalStatus', 'workers', 'machines', 'materials', 'shuiwenLayers', 'structureLayers', 'funcLayers', 'tomorrowPlan', 'approvalTime', 'approvalRemark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  output_record: ['date', 'category', 'station', 'projectName', 'materialList', 'totalWeight', 'unit', 'water', 'electricity', 'coal', 'naturalGas', 'otherConsumables', 'approvalStatus', 'approvalTime', 'approvalRemark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  diesel_entry: ['date', 'station', 'plateNumber', 'volume', 'price', 'totalAmount', 'handler', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  diesel_out: ['date', 'station', 'type', 'projectLocation', 'receiver', 'volume', 'handler', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  diesel_delivery: ['date', 'projectLocation', 'driver', 'plateNumber', 'totalVolume', 'equipmentList', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  price_board: ['stationName', 'productName', 'OldPrice', 'NewPrice', 'unit', 'status', 'approvalStatus', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  TJform: ['stationName', 'productName', 'OldPrice', 'NewPrice', 'TJReason', 'TJtime', 'approvalStatus', 'approvalTime', 'approvalRemark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  construction_log_summary: ['projectName', 'date', 'subList', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  equipment_maintenance: ['equipmentName', 'equipmentCode', 'spec', 'currentHours', 'maintenanceDate', 'maintenanceType', 'manager', 'maintenanceItems', 'partsList', 'photos', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime'],
  mixing_tower_maintenance: ['stationName', 'towerModel', 'maintenanceDate', 'maintenanceType', 'manager', 'maintenanceItems', 'partsList', 'photos', 'approvalStatus', 'remark', 'deletedBy', 'deletedTime', 'deleteReason', 'createTime']
};

const businessHiddenFields = [
  'approvalFlowSnapshot',
  'approvalHistory',
  'currentApprovalStep',
  'currentApprovalType',
  'currentApprovers',
  'currentApproverOpenids',
  'currentApproverNames',
  'visibleUsers',
  'extraVisibleUsers',
  'participants',
  'participantOpenids'
];

const legacyBusinessStatusFields = ['status'];

const hiddenFieldsByCollection = {
  form_registry: new Set(['name', 'approvalMode', 'approvalFlow', 'visibleRoles', 'approvalLevels', 'approvalSteps', 'currentApprovalStep', 'approvedRoles', ...businessHiddenFields]),
  users: new Set(['nickName', 'phone', 'avatarUrl', 'passwordHash', 'password_hash']),
  construction_log: new Set(['approvalStatus', ...businessHiddenFields]),
  output_record: new Set(['totalOutputNative', 'totalOutputRecycle', 'materialName', 'todayOutput', 'factoryPrice', 'transportPrice', 'totalPrice', 'totalAmount', 'paidAmount', 'unpaidAmount', ...legacyBusinessStatusFields, ...businessHiddenFields]),
  diesel_entry: new Set([...legacyBusinessStatusFields, ...businessHiddenFields]),
  diesel_out: new Set([...legacyBusinessStatusFields, ...businessHiddenFields]),
  diesel_delivery: new Set([...legacyBusinessStatusFields, ...businessHiddenFields]),
  price_board: new Set([...businessHiddenFields]),
  TJform: new Set([...legacyBusinessStatusFields, ...businessHiddenFields]),
  construction_log_summary: new Set([...legacyBusinessStatusFields, ...businessHiddenFields]),
  equipment_maintenance: new Set(['photoUrls', ...legacyBusinessStatusFields, ...businessHiddenFields]),
  mixing_tower_maintenance: new Set(['photoUrls', ...legacyBusinessStatusFields, ...businessHiddenFields])
};

const nestedFieldOrderByKey = {
  maintenanceItems: ['part', 'content', 'maintenanceContent'],
  partsList: ['name', 'partName', 'quantity'],
  equipmentList: ['equipment', 'volume', 'image'],
  machines: ['name', 'area', 'fuel', 'image', 'remark'],
  materials: ['name', 'dayQty', 'totalQty', 'remark'],
  workers: ['name', 'team'],
  shuiwenLayers: ['name', 'designThickness', 'constructArea', 'avgThickness'],
  structureLayers: ['type', 'designThickness', 'constructArea', 'avgThickness'],
  funcLayers: ['type', 'funcArea'],
  subList: [
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
};

const tableFieldsByCollection = {
  banners: ['_id', 'title', 'imageUrl', 'sort', 'status', 'createTime'],
  users: ['_id', 'openid', 'name', 'role', 'status', 'lastLoginTime', 'createTime'],
  stations: ['_id', 'name', 'address', 'phone', 'capacity', 'sort', 'status', 'createTime'],
  construction_log: ['_id', 'projectName', 'roadSection', 'date', 'weather', 'recorder', 'status'],
  output_record: ['_id', 'date', 'station', 'projectName', 'materialList', 'totalWeight', 'water', 'electricity', 'coal', 'naturalGas', 'otherConsumables', 'approvalStatus'],
  diesel_entry: ['_id', 'date', 'station', 'plateNumber', 'volume', 'price', 'totalAmount', 'handler', 'approvalStatus'],
  diesel_out: ['_id', 'date', 'station', 'type', 'volume', 'approvalStatus', 'remark', 'createTime'],
  diesel_delivery: ['_id', 'date', 'projectLocation', 'driver', 'plateNumber', 'totalVolume', 'approvalStatus', 'remark', 'createTime'],
  equipment_maintenance: ['_id', 'equipmentName', 'equipmentCode', 'currentHours', 'maintenanceDate', 'maintenanceType', 'manager', 'approvalStatus', 'createTime'],
  mixing_tower_maintenance: ['_id', 'stationName', 'towerModel', 'maintenanceDate', 'maintenanceType', 'manager', 'approvalStatus', 'createTime']
};

const alwaysVisibleTableFieldsByCollection = {
  output_record: new Set(['water', 'electricity', 'coal', 'naturalGas', 'otherConsumables'])
};

let token = localStorage.getItem('adminToken') || '';
let active = collections[0]?.[0] || 'banners';
let rows = [];
let loading = false;
let editingId = '';
let editingFields = [];
let pendingApproval = null;
let pendingDeleteId = '';
let approvalUserOptions = [];
let visibleUserOptions = [];

const $ = id => document.getElementById(id);

function activeMeta() {
  return collections.find(([key]) => key === active) || collections[0];
}

function ensureActiveCollection() {
  if (!collections.some(([key]) => key === active)) {
    active = collections[0]?.[0] || 'banners';
  }
}

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {})
    }
  }).then(async res => {
    const data = await res.json();
    if (!res.ok || data.code !== 0) throw new Error(data.message || '请求失败');
    return data.data;
  });
}

function showApp() {
  $('loginPanel').classList.toggle('hidden', Boolean(token));
  $('appPanel').classList.toggle('hidden', !token);
}

function renderTabs() {
  ensureActiveCollection();
  $('tabs').innerHTML = collectionGroups.map(group => `
    <section class="nav-group">
      <div class="nav-group-title">${group.title}</div>
      ${group.items.map(([key, label]) => `
        <button class="nav-item ${key === active ? 'active' : ''}" data-key="${key}">
          <span>${label}</span>
        </button>
      `).join('')}
    </section>
  `).join('');

  const [, label, desc] = activeMeta();
  $('pageTitle').textContent = label;
  $('pageDesc').textContent = desc;
  $('tableTitle').textContent = `${label}列表`;
}

function shortValue(value) {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (!item || typeof item !== 'object') return item;
      const summary = Object.entries(toChineseKeys(item))
        .filter(([key, val]) => key !== '图片' && key !== '照片' && key !== '照片地址' && val !== '' && val !== null && val !== undefined)
        .slice(0, 3)
        .map(([key, val]) => `${key} ${val}`)
        .join('，');
      return summary ? `第${index + 1}项：${summary}` : `第${index + 1}项`;
    }).join('；').slice(0, 120);
  }
  if (value && typeof value === 'object') {
    return Object.entries(toChineseKeys(value))
      .filter(([key, val]) => key !== '图片' && key !== '照片' && key !== '照片地址' && val !== '' && val !== null && val !== undefined)
      .slice(0, 4)
      .map(([key, val]) => `${key} ${val}`)
      .join('，')
      .slice(0, 120);
  }
  return String(value ?? '').slice(0, 90);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function columnsFor(data) {
  const tableFields = tableFieldsByCollection[active];
  if (tableFields) {
    const alwaysVisible = alwaysVisibleTableFieldsByCollection[active] || new Set();
    return tableFields.filter(key => key === '_id' || alwaysVisible.has(key) || data.some(row => row[key] !== undefined)).concat(['操作']);
  }

  const preferred = fieldOrderByCollection[active] || ['_id', 'name', 'title', 'projectName', 'stationName', 'station', 'productName', 'date', 'status', 'approvalStatus', 'createTime'];
  const hidden = hiddenFieldsByCollection[active] || new Set();
  const keys = new Set();
  keys.add('_id');
  preferred.forEach(key => {
    if (hidden.has(key)) return;
    if (key === '_id' || data.some(row => row[key] !== undefined)) keys.add(key);
  });
  data.slice(0, 20).forEach(row => Object.keys(row).forEach(key => {
    if (!['id', 'collection', 'updateTime'].includes(key) && !hidden.has(key)) keys.add(key);
  }));
  return Array.from(keys).slice(0, 9).concat(['操作']);
}

function humanizeFieldName(field) {
  return String(field || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim() || '字段';
}

function displayFieldName(field, parentKey = '') {
  return nestedFieldNameMap[parentKey]?.[field] || fieldNameMap[field] || humanizeFieldName(field);
}

function complexItemTitle(parentKey, index) {
  return `${complexItemTitleMap[parentKey] || '明细'} ${index + 1}`;
}

function toChineseKeys(value) {
  if (Array.isArray(value)) return value.map(toChineseKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [displayFieldName(key), toChineseKeys(val)]));
}

function toOriginalKeys(value) {
  if (Array.isArray(value)) return value.map(toOriginalKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [reverseFieldNameMap[key] || key, toOriginalKeys(val)]));
}

function displayStatus(value) {
  return statusNameMap[value] || statusNameMap[String(value).toLowerCase()] || value || '-';
}

function displayBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === '是' ? '是' : '否';
}

function displayRole(value) {
  const map = { approver: '提交人', submitter: '提交人', admin: '管理员' };
  return map[value] || value || '-';
}

function displayCollectionValue(value) {
  return collectionNameMap[value] || value || '-';
}

function isTimeField(key) {
  return ['createTime', 'updateTime', 'approvalTime', 'submitTime', 'deletedTime', 'lastLoginTime'].includes(key);
}

function formatDateTime(value) {
  if (!value) return '';
  if (typeof value === 'object' && value.$date) return formatDateTime(value.$date);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function valueToEditorText(key, value) {
  if (key === 'approvalRequired') return displayBool(value);
  if (key === 'role') return displayRole(value);
  if (key === 'collectionName') return displayCollectionValue(value);
  if (isTimeField(key)) return formatDateTime(value);
  if (key === 'status' || key === 'approvalStatus') return String(displayStatus(value));
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(toChineseKeys(value), null, 2);
  return String(value);
}

function editorTextToValue(field, text) {
  if (field.key === 'approvalRequired') {
    return text === '是' || text === '启用' || text === 'true' || text === '1';
  }
  if (field.key === 'role') {
    const map = { 提交人: 'submitter', 管理员: 'admin' };
    return map[text] || text;
  }
  if (field.key === 'collectionName') {
    return reverseCollectionNameMap[text] || text;
  }
  if (field.key === 'status' || field.key === 'approvalStatus') {
    return reverseStatusNameMap[text] ?? text;
  }
  if (Array.isArray(field.value) || (field.value && typeof field.value === 'object')) {
    return text.trim() ? toOriginalKeys(JSON.parse(text)) : (Array.isArray(field.value) ? [] : {});
  }
  if (typeof field.value === 'number') {
    const number = Number(text);
    return Number.isNaN(number) ? text : number;
  }
  return text;
}

function isComplexValue(value) {
  return Array.isArray(value) || (value && typeof value === 'object');
}

function isImageField(key, value) {
  const text = String(value || '');
  if (!text) return ['image', 'imageUrl', 'avatarUrl', 'photoUrl', 'photos', 'photoUrls'].includes(key);
  return ['image', 'imageUrl', 'avatarUrl', 'photoUrl', 'photos', 'photoUrls'].includes(key)
    || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(text)
    || /\/uploads\//.test(text);
}

function isImageUrl(value) {
  const text = String(value || '');
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(text) || /\/uploads\//.test(text);
}

function isImageArrayField(key, value) {
  return Array.isArray(value)
    && (['photos', 'photoUrls'].includes(key) || value.every(item => typeof item === 'string' && isImageUrl(item)));
}

function isEditableImageArrayField(key, value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && !item.includes('\n'));
}

function simpleInputHtml(path, value) {
  const text = value === undefined || value === null ? '' : String(value);
  return `<input data-path="${escapeHtml(path)}" value="${escapeHtml(text)}">`;
}

function imageInputHtml(path, value, attrName = 'data-path') {
  const text = value === undefined || value === null ? '' : String(value);
  return `
    <div class="image-field">
      <div class="image-preview-wrap">${editorImagePreviewHtml(text)}</div>
      <label class="upload-btn">
        <span>上传图片</span>
        <input type="file" accept="image/*" data-upload-image>
      </label>
      ${active === 'banners' ? '<small class="upload-hint">轮播图将自动裁剪为 750×400</small>' : ''}
      <input type="hidden" ${attrName}="${escapeHtml(path)}" value="${escapeHtml(text)}">
    </div>
  `;
}

function resolveAssetUrl(value) {
  const text = String(value || '');
  if (!text) return '';
  if (/^(https?:|data:|blob:)/.test(text)) return text;
  if (text.startsWith('/')) return `${window.location.origin}${text}`;
  return text;
}

function editorImagePreviewHtml(value) {
  const text = String(value || '');
  const src = resolveAssetUrl(text);
  const isTemporary = /^https?:\/\/tmp\//.test(text);
  if (!text) return '<div class="image-empty">暂无图片</div>';
  if (isTemporary) return '<div class="image-empty temporary-image">临时头像已失效，请小程序重新登录上传</div>';
  return `<a class="image-preview" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">
    <img src="${escapeHtml(src)}" alt="图片预览">
    <span>打开原图</span>
  </a>`;
}

function imagePreviewHtml(value) {
  const text = String(value || '');
  const src = resolveAssetUrl(text);
  if (!text) return '<span class="image-table-empty">未上传</span>';
  return `<a class="image-table-preview" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">
    <img src="${escapeHtml(src)}" alt="图片">
  </a>`;
}

async function uploadImageFile(file) {
  const formData = new FormData();
  const uploadFile = active === 'banners' ? await cropImageFile(file, 750, 400) : file;
  formData.append('file', uploadFile);
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    },
    body: formData
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(data.message || '上传失败');
  return data.data.url;
}

function cropImageFile(file, targetWidth, targetHeight) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const targetRatio = targetWidth / targetHeight;
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      let sx = 0;
      let sy = 0;
      let sw = image.naturalWidth;
      let sh = image.naturalHeight;

      if (sourceRatio > targetRatio) {
        sw = image.naturalHeight * targetRatio;
        sx = (image.naturalWidth - sw) / 2;
      } else if (sourceRatio < targetRatio) {
        sh = image.naturalWidth / targetRatio;
        sy = (image.naturalHeight - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('图片裁剪失败'));
          return;
        }
        const name = file.name.replace(/\.[^.]+$/, '') || 'banner';
        resolve(new File([blob], `${name}-banner.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败'));
    };
    image.src = objectUrl;
  });
}

function imageArrayEditorHtml(field, index) {
  const rows = field.value.length ? field.value : [''];
  return `
    <section class="field-editor full complex-field image-array-field" data-complex-index="${index}">
      <div class="complex-title">${escapeHtml(displayFieldName(field.key))}</div>
      <div class="image-grid">
        ${rows.map((url, itemIndex) => `
          <label class="image-array-item">
            <span>第${itemIndex + 1}张</span>
            ${imageInputHtml(`${index}.${itemIndex}`, url)}
          </label>
        `).join('')}
      </div>
    </section>
  `;
}

function imageArrayNestedEditorHtml(fieldKey, value, path, title) {
  const rows = Array.isArray(value) && value.length ? value : [''];
  return `
    <label class="image-cell image-array-cell"><span>${escapeHtml(title)}</span>
      <div class="image-grid compact">
        ${rows.map((url, itemIndex) => `
          <div class="image-array-item compact">
            <span>第${itemIndex + 1}张</span>
            ${imageInputHtml(`${path}.${itemIndex}`, url)}
          </div>
        `).join('')}
      </div>
    </label>
  `;
}

function complexEditorHtml(field, index) {
  const value = field.value;
  const title = displayFieldName(field.key);
  if (Array.isArray(value)) {
    if (isImageArrayField(field.key, value)) return imageArrayEditorHtml(field, index);
    const rows = value.length ? value : [{}];
    return `
      <section class="field-editor full complex-field" data-complex-index="${index}">
        <div class="complex-title">${escapeHtml(title)}</div>
        <div class="complex-list">
          ${rows.map((item, itemIndex) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return `
                <div class="complex-card">
                  <div class="complex-card-title">${escapeHtml(complexItemTitle(field.key, itemIndex))}</div>
                  <label><span>内容</span>${simpleInputHtml(`${index}.${itemIndex}`, item)}</label>
                </div>
              `;
            }
            return `
              <div class="complex-card">
                <div class="complex-card-title">${escapeHtml(complexItemTitle(field.key, itemIndex))}</div>
                <div class="nested-grid">
                  ${sortNestedEntries(field.key, item).map(([key, val]) => `
                    ${isImageArrayField(key, val)
                      ? imageArrayNestedEditorHtml(key, val, `${index}.${itemIndex}.${key}`, displayFieldName(key, field.key))
                      : `<label class="${isImageField(key, val) ? 'image-cell' : ''}"><span>${escapeHtml(displayFieldName(key, field.key))}</span>${isImageField(key, val) ? imageInputHtml(`${index}.${itemIndex}.${key}`, val) : simpleInputHtml(`${index}.${itemIndex}.${key}`, val)}</label>`}
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  return `
    <section class="field-editor full complex-field" data-complex-index="${index}">
      <div class="complex-title">${escapeHtml(title)}</div>
        <div class="nested-grid">
          ${sortNestedEntries(field.key, value || {}).map(([key, val]) => `
          ${isImageArrayField(key, val)
            ? imageArrayNestedEditorHtml(key, val, `${index}.${key}`, displayFieldName(key, field.key))
            : `<label class="${isImageField(key, val) ? 'image-cell' : ''}"><span>${escapeHtml(displayFieldName(key, field.key))}</span>${isImageField(key, val) ? imageInputHtml(`${index}.${key}`, val) : simpleInputHtml(`${index}.${key}`, val)}</label>`}
        `).join('')}
      </div>
    </section>
  `;
}

function readValueLike(original, text) {
  if (typeof original === 'number') {
    const number = Number(text);
    return Number.isNaN(number) ? text : number;
  }
  if (typeof original === 'boolean') {
    return text === 'true' || text === '是';
  }
  return text;
}

function setDeepValue(target, parts, value) {
  if (!parts.length) return value;
  const [head, ...rest] = parts;
  if (rest.length === 0) {
    if (Array.isArray(target)) {
      target[Number(head)] = value;
      return target;
    }
    target[head] = value;
    return target;
  }
  const nextIsIndex = /^\d+$/.test(rest[0]);
  if (Array.isArray(target)) {
    const index = Number(head);
    if (target[index] === undefined || target[index] === null || typeof target[index] !== 'object') {
      target[index] = nextIsIndex ? [] : {};
    }
    setDeepValue(target[index], rest, value);
    return target;
  }
  if (target[head] === undefined || target[head] === null || typeof target[head] !== 'object') {
    target[head] = nextIsIndex ? [] : {};
  }
  setDeepValue(target[head], rest, value);
  return target;
}

function readComplexField(field, index) {
  const inputs = Array.from($('fieldEditor').querySelectorAll(`[data-path^="${index}."]`));
  if (Array.isArray(field.value)) {
    const result = field.value.length ? field.value.map(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) return { ...item };
      return item;
    }) : [{}];
    inputs.forEach(input => {
      const parts = input.dataset.path.split('.');
      const itemIndex = Number(parts[1]);
      if (parts.length === 2) {
        result[itemIndex] = readValueLike(field.value[itemIndex], input.value);
      } else {
        const original = field.value[itemIndex];
        if (!result[itemIndex] || typeof result[itemIndex] !== 'object') result[itemIndex] = {};
        setDeepValue(result[itemIndex], parts.slice(2), readValueLike(original, input.value));
      }
    });
    return result;
  }

  const result = { ...(field.value || {}) };
  inputs.forEach(input => {
    const key = input.dataset.path.split('.').slice(1).join('.');
    result[key] = readValueLike(field.value ? field.value[key] : '', input.value);
  });
  return result;
}

function renderValue(col, value) {
  if (col === '_id') return `<span class="field-id">#${escapeHtml(value)}</span>`;
  if (isImageField(col, value)) return imagePreviewHtml(value);
  if (isTimeField(col)) return escapeHtml(formatDateTime(value) || '-');
  if (col === 'approvalRequired') {
    const yes = value === true || value === 1 || value === '1' || value === 'true';
    return `<span class="status ${yes ? 'pending' : 'approved'}">${yes ? '需要审批' : '无需审批'}</span>`;
  }
  if (col === 'role') return escapeHtml(displayRole(value));
  if (col === 'collectionName') return escapeHtml(displayCollectionValue(value));
  if (col === 'status' || col === 'approvalStatus') {
    const cls = String(value || '').toLowerCase();
    return `<span class="status ${escapeHtml(cls)}">${escapeHtml(displayStatus(value))}</span>`;
  }
  return escapeHtml(shortValue(value));
}

function getVisibleRows() {
  const keyword = $('searchInput').value.trim();
  if (!keyword) return rows;
  return rows.filter(row => JSON.stringify(row).includes(keyword));
}

function renderSummary(visible) {
  const approved = visible.filter(row => row.status === 'approved' || row.approvalStatus === 'approved').length;
  const pending = visible.filter(row => row.status === 'pending' || row.approvalStatus === 'pending').length;
  const approvalRequired = visible.filter(row => row.approvalRequired === true || row.approvalRequired === 1 || row.approvalRequired === 'true').length;
  const enabledUsers = visible.filter(row => row.status === 1 || row.status === '1').length;
  const latest = visible[0]?.createTime ? formatDateTime(visible[0].createTime) : '-';
  const cards = active === 'form_registry'
    ? [['当前模块', activeMeta()[1]], ['业务表数', visible.length], ['需要审批', approvalRequired], ['无需审批', visible.length - approvalRequired]]
    : active === 'users'
      ? [['当前模块', activeMeta()[1]], ['用户数量', visible.length], ['启用用户', enabledUsers], ['管理员', visible.filter(row => row.role === 'admin').length]]
      : [['当前模块', activeMeta()[1]], ['记录数量', visible.length], ['待审批', pending], ['最新记录', latest || approved]];
  $('summaryGrid').innerHTML = cards
    .map(([label, value]) => `<article class="summary-card ${label === '最新记录' ? 'summary-card-wide' : ''}"><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
}

function renderTable() {
  const visible = getVisibleRows();
  renderSummary(visible);
  $('emptyState').classList.toggle('hidden', loading || visible.length > 0);

  if (loading) {
    $('thead').innerHTML = '<th>加载中</th>';
    $('tbody').innerHTML = '<tr><td>正在读取数据库...</td></tr>';
    return;
  }

  const cols = columnsFor(visible);
  $('thead').innerHTML = cols.map(col => `<th>${escapeHtml(displayFieldName(col))}</th>`).join('');
  $('tbody').innerHTML = visible.map(row => `<tr>${
    cols.map(col => {
      if (col === '操作') {
        const currentStatus = row.approvalStatus || row.status;
        const approvalButtons = businessCollectionSet.has(active) && currentStatus === 'pending'
          ? `<button class="success" data-approve="${row._id}">通过</button><button class="warning" data-reject="${row._id}">拒绝</button>`
          : '';
        return `<td class="actions">${approvalButtons}<button data-edit="${row._id}">编辑</button><button class="danger" data-del="${row._id}">删除</button></td>`;
      }
      if ((col === 'approvalStatus' || col === 'status') && row.approvalStatusText && row[col] === 'pending') {
        return `<td><span class="status pending">${escapeHtml(row.approvalStatusText)}</span></td>`;
      }
      return `<td>${renderValue(col, row[col])}</td>`;
    }).join('')
  }</tr>`).join('');
}

function sortFields(fields) {
  const order = fieldOrderByCollection[active] || [];
  return fields.sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function sortNestedEntries(parentKey, item) {
  const entries = Object.entries(item || {});
  const order = nestedFieldOrderByKey[parentKey] || [];
  if (!order.length) return entries;
  return entries.sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function selectHtml(index, value, options) {
  return `<select data-index="${index}">
    ${options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
  </select>`;
}

function userOptionValue(user) {
  return user.openid || user._id || user.name || '';
}

function displayApprovalUser(user) {
  const name = user.name || user.nickName || user.openid || user._id || '未命名用户';
  return name;
}

function isApprovalUser(user) {
  return user.role === 'admin';
}

function normalizeApprovalUserList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object') return item.userId || item.openid || item._id || item.name || '';
      return item;
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return trimmed.split(/[,，\s]+/).map(item => item.trim()).filter(Boolean);
  }
  return fallback;
}

async function loadApprovalUserOptions() {
  if (approvalUserOptions.length) return approvalUserOptions;
  try {
    const result = await api('/api/collections/users?limit=200&orderBy=createTime&order=desc');
    approvalUserOptions = (result.data || [])
      .filter(user => user.status !== 0 && user.status !== '0' && user.status !== 'inactive')
      .filter(isApprovalUser)
      .map(user => ({
        value: userOptionValue(user),
        label: displayApprovalUser(user)
      }))
      .filter(user => user.value);
  } catch (err) {
    console.warn('加载审批用户失败', err);
    approvalUserOptions = [];
  }
  return approvalUserOptions;
}

async function loadVisibleUserOptions() {
  if (visibleUserOptions.length) return visibleUserOptions;
  try {
    const result = await api('/api/collections/users?limit=500&orderBy=createTime&order=desc');
    visibleUserOptions = (result.data || [])
      .filter(user => user.status !== 0 && user.status !== '0' && user.status !== 'inactive' && user.status !== 'deleted')
      .map(user => ({
        value: userOptionValue(user),
        label: displayApprovalUser(user)
      }))
      .filter(user => user.value);
  } catch (err) {
    console.warn('加载可见用户失败', err);
    visibleUserOptions = [];
  }
  return visibleUserOptions;
}

function getApprovalFlowDraft(row) {
  const rawLevels = Array.isArray(row.approvalLevels)
    ? row.approvalLevels
    : Array.isArray(row.approvalSteps)
      ? row.approvalSteps
      : [];
  const levels = rawLevels.length ? rawLevels : [{ type: '单人审批', approvers: [] }];
  return {
    levels: levels.map(level => ({
      type: approvalTypeOptions.includes(level.type) ? level.type : (level.type === 'joint' ? '联合审批' : '单人审批'),
      users: normalizeApprovalUserList(level.users || level.approvalUsers || level.approvers || level.roles || level.approvalRoles, [])
    }))
  };
}

function approvalLevelHtml(level, index) {
  const users = normalizeApprovalUserList(level.users || level.approvers || level.approvalUsers, []);
  const selected = new Set(users);
  const selectedLabels = approvalUserOptions
    .filter(user => selected.has(user.value))
    .map(user => user.label);
  const summary = selectedLabels.length ? selectedLabels.join('、') : '请选择审批人';
  return `
    <section class="approval-flow-card" data-approval-level="${index}">
      <div class="approval-level-title">
        <div>
          <strong>第${index + 1}级</strong>
          <span>审批节点</span>
        </div>
        <button class="btn subtle approval-level-remove" type="button" data-remove-approval-level="${index}">删除</button>
      </div>
      <div class="approval-level-grid">
        <label>
          <span>审批类型</span>
          <select data-approval-level-type="${index}">
            ${approvalTypeOptions.map(type => `<option value="${escapeHtml(type)}" ${type === level.type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>审批人</span>
          <details class="approval-user-select" data-approval-user-select="${index}">
            <summary>${escapeHtml(summary)}</summary>
            <div class="approval-user-menu">
              ${approvalUserOptions.length ? approvalUserOptions.map(user => `
                <label class="approval-user-option">
                  <input type="checkbox" value="${escapeHtml(user.value)}" ${selected.has(user.value) ? 'checked' : ''}>
                  <span>${escapeHtml(user.label)}</span>
                </label>
              `).join('') : '<div class="approval-user-empty">暂无审批人</div>'}
            </div>
          </details>
        </label>
      </div>
    </section>
  `;
}

function approvalFlowEditorHtml(row) {
  const draft = getApprovalFlowDraft(row);
  return `
    <section class="approval-flow-editor full" data-approval-flow-editor>
      <div class="approval-flow-head">
        <h3>可编辑审批流程</h3>
        <button class="approval-add-level" type="button" data-add-approval-level>+ 添加审批级别</button>
      </div>
      <div class="approval-flow-list">
        ${draft.levels.map((level, index) => approvalLevelHtml(level, index)).join('')}
      </div>
    </section>
  `;
}

function visibleUsersEditorHtml(row) {
  const selected = new Set(normalizeApprovalUserList(row.visibleUsers || row.extraVisibleUsers || []));
  const selectedLabels = visibleUserOptions
    .filter(user => selected.has(user.value))
    .map(user => user.label);
  const summary = selectedLabels.length ? selectedLabels.join('、') : '请选择可见人';
  return `
    <section class="approval-flow-editor visible-users-editor full" data-visible-users-editor>
      <div class="approval-flow-head">
        <div>
          <h3>额外可见人</h3>
          <p>默认提交人和审批流参与人可见；这里选择的用户只获得查看权限，不参与审批。</p>
        </div>
      </div>
      <details class="approval-user-select visible-user-select" data-visible-user-select>
        <summary>${escapeHtml(summary)}</summary>
        <div class="approval-user-menu">
          ${visibleUserOptions.length ? visibleUserOptions.map(user => `
            <label class="approval-user-option">
              <input type="checkbox" value="${escapeHtml(user.value)}" ${selected.has(user.value) ? 'checked' : ''}>
              <span>${escapeHtml(user.label)}</span>
            </label>
          `).join('') : '<div class="approval-user-empty">暂无可选用户</div>'}
        </div>
      </details>
    </section>
  `;
}

function readApprovalFlowEditorState() {
  const editor = $('fieldEditor').querySelector('[data-approval-flow-editor]');
  if (!editor) return null;
  const userMap = new Map(approvalUserOptions.map(user => [user.value, user]));
  const levels = Array.from(editor.querySelectorAll('[data-approval-level]')).map(card => ({
    type: card.querySelector('[data-approval-level-type]')?.value || '单人审批',
    approvers: Array.from(card.querySelectorAll('.approval-user-option input:checked')).map(input => ({
      openid: input.value,
      name: userMap.get(input.value)?.label || input.value
    }))
  }));
  return {
    levels: levels.length ? levels : [{ type: '单人审批', approvers: [] }]
  };
}

function readVisibleUsersEditorState() {
  const editor = $('fieldEditor').querySelector('[data-visible-users-editor]');
  if (!editor) return null;
  const userMap = new Map(visibleUserOptions.map(user => [user.value, user]));
  return Array.from(editor.querySelectorAll('.approval-user-option input:checked')).map(input => ({
    openid: input.value,
    name: userMap.get(input.value)?.label || input.value
  }));
}

function refreshApprovalFlowEditor(state) {
  const editor = $('fieldEditor').querySelector('[data-approval-flow-editor]');
  if (!editor) return;
  editor.querySelector('.approval-flow-list').innerHTML = state.levels
    .map((level, index) => approvalLevelHtml(level, index))
    .join('');
}

function updateApprovalUserSelectSummary(select) {
  const checkedValues = new Set(Array.from(select.querySelectorAll('input:checked')).map(input => input.value));
  const source = select.matches('[data-visible-user-select]') ? visibleUserOptions : approvalUserOptions;
  const emptyText = select.matches('[data-visible-user-select]') ? '请选择可见人' : '请选择审批人';
  const labels = source
    .filter(user => checkedValues.has(user.value))
    .map(user => user.label);
  select.querySelector('summary').textContent = labels.length ? labels.join('、') : emptyText;
}

function openApprovalDialog(action, id) {
  const isReject = action === 'reject';
  pendingApproval = { action, id };
  $('approvalTitle').textContent = isReject ? '拒绝记录' : '通过记录';
  $('approvalDesc').textContent = isReject ? '请输入拒绝原因，可留空。' : '确认通过这条记录？';
  $('approvalRemarkField').classList.toggle('hidden', !isReject);
  $('approvalRemark').value = '';
  $('approvalMsg').textContent = '';
  $('approvalDialog').showModal();
  if (isReject) $('approvalRemark').focus();
}

function openDeleteDialog(id) {
  pendingDeleteId = id;
  $('deleteReason').value = '';
  $('deleteMsg').textContent = '';
  $('deleteDialog').showModal();
  $('deleteReason').focus();
}

async function loadRows() {
  ensureActiveCollection();
  loading = true;
  $('statusText').textContent = '读取中';
  renderTabs();
  renderTable();
  try {
    const result = await api(`/api/collections/${active}?limit=200&orderBy=createTime&order=desc`);
    rows = result.data || [];
    $('statusText').textContent = '接口正常';
  } catch (err) {
    rows = [];
    $('statusText').textContent = err.message;
  } finally {
    loading = false;
    renderTabs();
    renderTable();
  }
}

async function openEditor(row = {}) {
  editingId = row._id || '';
  if (active === 'form_registry') {
    await loadApprovalUserOptions();
    await loadVisibleUserOptions();
  }
  const defaults = defaultFieldsByCollection[active] || { name: '', status: 1, sort: 1, remark: '' };
  const copy = editingId ? { ...defaults, ...row } : { ...defaults, ...row };
  const hidden = hiddenFieldsByCollection[active] || new Set();
  delete copy.id;
  delete copy._id;
  delete copy.collection;
  hidden.forEach(key => delete copy[key]);
  editingFields = sortFields(Object.entries(copy).map(([key, value]) => ({ key, value })));
  $('editorTitle').textContent = editingId ? '编辑记录' : '新增记录';
  const baseFieldsHtml = editingFields.map((field, index) => {
    if (isComplexValue(field.value)) return complexEditorHtml(field, index);
    const value = valueToEditorText(field.key, field.value);
    const isLong = value.length > 80 || value.includes('\n');
    let control = isLong
      ? `<textarea data-index="${index}" spellcheck="false">${escapeHtml(value)}</textarea>`
      : `<input data-index="${index}" value="${escapeHtml(value)}">`;
    if (isImageField(field.key, field.value)) {
      control = imageInputHtml(index, value, 'data-index');
    }
    if (field.key === 'approvalRequired') control = selectHtml(index, value, ['是', '否']);
    if (field.key === 'role') control = selectHtml(index, value, ['提交人', '管理员']);
    if (field.key === 'collectionName' && active === 'form_registry') {
      control = selectHtml(index, value, businessCollectionKeys.map(key => collectionNameMap[key]));
    }
    if (field.key === 'status' || field.key === 'approvalStatus') control = selectHtml(index, value, ['待审批', '已通过', '已拒绝', '已删除', '启用', '停用']);
    return `<label class="field-editor ${isLong ? 'full' : ''}"><span>${escapeHtml(displayFieldName(field.key))}</span>${control}</label>`;
  }).join('');
  $('fieldEditor').innerHTML = active === 'form_registry'
    ? `${baseFieldsHtml}${approvalFlowEditorHtml(row)}${visibleUsersEditorHtml(row)}`
    : baseFieldsHtml;
  $('editorMsg').textContent = '';
  $('editor').showModal();
}

$('loginBtn').onclick = async () => {
  $('loginMsg').textContent = '';
  try {
    const data = await api('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('username').value, password: $('password').value })
    });
    token = data.token;
    localStorage.setItem('adminToken', token);
    showApp();
    await loadRows();
  } catch (err) {
    $('loginMsg').textContent = err.message;
  }
};

$('logoutBtn').onclick = () => {
  token = '';
  localStorage.removeItem('adminToken');
  showApp();
};

$('tabs').onclick = event => {
  const key = event.target.closest('button')?.dataset.key;
  if (!key || key === active) return;
  active = key;
  $('searchInput').value = '';
  loadRows();
};

$('refreshBtn').onclick = loadRows;
$('newBtn').onclick = () => openEditor({});
$('searchInput').oninput = renderTable;

$('fieldEditor').onchange = async event => {
  const approvalUserInput = event.target.closest('.approval-user-option input');
  if (approvalUserInput) {
    const select = approvalUserInput.closest('.approval-user-select');
    if (select) updateApprovalUserSelectSummary(select);
    return;
  }

  const input = event.target.closest('[data-upload-image]');
  if (!input || !input.files?.[0]) return;
  const field = input.closest('.image-field');
  const hidden = field?.querySelector('input[type="hidden"]');
  const wrap = field?.querySelector('.image-preview-wrap');
  if (!field || !hidden || !wrap) return;

  field.classList.add('uploading');
  wrap.innerHTML = '<div class="image-empty">上传中...</div>';
  try {
    const url = await uploadImageFile(input.files[0]);
    hidden.value = url;
    wrap.innerHTML = editorImagePreviewHtml(url);
  } catch (err) {
    wrap.innerHTML = '<div class="image-empty temporary-image">上传失败，请重试</div>';
    $('editorMsg').textContent = err.message;
  } finally {
    field.classList.remove('uploading');
    input.value = '';
  }
};

$('fieldEditor').onclick = event => {
  const addButton = event.target.closest('[data-add-approval-level]');
  if (addButton) {
    const state = readApprovalFlowEditorState();
    if (!state) return;
    state.levels.push({ type: '单人审批', approvers: [] });
    refreshApprovalFlowEditor(state);
    return;
  }

  const removeButton = event.target.closest('[data-remove-approval-level]');
  if (removeButton) {
    const state = readApprovalFlowEditorState();
    if (!state) return;
    const index = Number(removeButton.dataset.removeApprovalLevel);
    state.levels.splice(index, 1);
    if (!state.levels.length) state.levels.push({ type: '单人审批', approvers: [] });
    refreshApprovalFlowEditor(state);
  }
};

document.addEventListener('click', event => {
  $('fieldEditor').querySelectorAll('.approval-user-select[open]').forEach(select => {
    if (!select.contains(event.target)) select.removeAttribute('open');
  });
});

$('tbody').onclick = async event => {
  const editId = event.target.dataset.edit;
  const delId = event.target.dataset.del;
  const approveId = event.target.dataset.approve;
  const rejectId = event.target.dataset.reject;
  if (editId) openEditor(rows.find(row => row._id === editId));
  if (approveId) openApprovalDialog('approve', approveId);
  if (rejectId) openApprovalDialog('reject', rejectId);
  if (delId) openDeleteDialog(delId);
};

$('deleteSubmitBtn').onclick = async event => {
  event.preventDefault();
  if (!pendingDeleteId) return;
  const reason = $('deleteReason').value.trim();
  if (!reason) {
    $('deleteMsg').textContent = '请输入删除原因';
    return;
  }
  $('deleteMsg').textContent = '';
  try {
    await api(`/api/collections/${active}/${pendingDeleteId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
    pendingDeleteId = '';
    $('deleteDialog').close();
    await loadRows();
  } catch (err) {
    $('deleteMsg').textContent = err.message;
  }
};

$('approvalSubmitBtn').onclick = async event => {
  event.preventDefault();
  if (!pendingApproval) return;
  $('approvalMsg').textContent = '';
  try {
    await api(`/api/admin/collections/${active}/${pendingApproval.id}/approval`, {
      method: 'POST',
      body: JSON.stringify({
        action: pendingApproval.action,
        remark: pendingApproval.action === 'reject' ? $('approvalRemark').value.trim() : ''
      })
    });
    pendingApproval = null;
    $('approvalDialog').close();
    await loadRows();
  } catch (err) {
    $('approvalMsg').textContent = err.message;
  }
};

$('saveBtn').onclick = async event => {
  event.preventDefault();
  try {
    const payload = {};
    $('fieldEditor').querySelectorAll('[data-index]').forEach(input => {
      const field = editingFields[Number(input.dataset.index)];
      payload[field.key] = editorTextToValue(field, input.value);
    });
    editingFields.forEach((field, index) => {
      if (isComplexValue(field.value)) payload[field.key] = readComplexField(field, index);
    });
    if (active === 'form_registry') {
      const approvalFlow = readApprovalFlowEditorState();
      if (approvalFlow) payload.approvalLevels = approvalFlow.levels;
      const visibleUsers = readVisibleUsersEditorState();
      if (visibleUsers) payload.visibleUsers = visibleUsers;
    }
    if (editingId) {
      await api(`/api/collections/${active}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api(`/api/collections/${active}`, { method: 'POST', body: JSON.stringify(payload) });
    }
    $('editor').close();
    await loadRows();
  } catch (err) {
    $('editorMsg').textContent = err.message;
  }
};

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && $('editor').open) {
    $('saveBtn').click();
  }
});

showApp();
renderTabs();
renderSummary([]);
if (token) loadRows().catch(() => {
  token = '';
  localStorage.removeItem('adminToken');
  showApp();
});
