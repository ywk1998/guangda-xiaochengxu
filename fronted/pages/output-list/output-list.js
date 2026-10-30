// pages/output-list/output-list.js - 拌站出料表列表页
const { getTimeValue, parseDate } = require('../../utils/util')
const { approvalStatusMeta, canEditRecord, isDeletedRecord, pendingPatch, stripSystemFields, canViewRecord } = require('../../utils/form-edit')
const { currentOpenid } = require('../../utils/participants')
const { formatErrorMessage } = require('../../utils/error-message')
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
const { loadFilteredPage } = require('../../utils/paged-records')

Page({
  data: {
    collectionName: 'output_record',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    records: [],
    filteredRecords: [],
    loading: true,
    searchText: '',
    selectedDate: '',
    selectedProject: '',
    projects: [],
    stationOptions: [],
    showAddModal: false,
    editingId: '',
    editMode: false,
    hasShown: false,
    // 删除确认弹窗
    showDeleteModal: false,
    deleteRecordId: '',
    deleteReason: '',
    // 新增记录表单
    newRecord: {
      category: '沥青混合料',
      station: '',
      projectName: '',
      materialList: [{ name: '', weight: '' }],
      unit: '吨',
      water: '',
      electricity: '',
      coal: '',
      naturalGas: '',
      otherConsumables: '',
      remark: ''
    },
    // 统计数据
    stats: {
      totalOutput: 0
    }
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('output_record');
    this.loadStations();
    this.loadRecords();
    this.loadProjects();
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' });
      this.loadRecordForEdit(options.id);
    }
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    const db = wx.cloud.database();
    db.collection('output_record').doc(id).get()
      .then(res => {
        wx.hideLoading();
        const record = res.data || {};
        if (!canEditRecord(record)) {
          wx.showToast({ title: '当前状态不可修改', icon: 'none' });
          return;
        }
        const newRecord = {
          ...this.data.newRecord,
          ...stripSystemFields(record),
          materialList: this.normalizeMaterialList(record)
        };
        this.setData({ showAddModal: true, newRecord });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载出料记录失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    if (!this.data.hasShown) {
      this.setData({ hasShown: true });
      return;
    }
    if (!this.data.showAddModal) {
      this.loadRecords();
      this.loadProjects();
      this.loadStations();
    }
  },

  onPullDownRefresh() {
    this.loadRecords().then(() => wx.stopPullDownRefresh());
  },

  // 加载出料记录
  loadRecords() {
    this.setData({ loading: true });
    const db = wx.cloud.database();

    return loadFilteredPage({
      db,
      collection: 'output_record',
      orderBy: 'date',
      pageIndex: 0,
      pageSize: 100,
      maxScanPages: 20,
      filter: r => !isDeletedRecord(r) && canViewRecord(r),
      map: r => {
            const meta = approvalStatusMeta(r);
            return {
              _id: r._id,
              id: r._id,
              date: r.date,
              createTime: r.createTime || null,
              category: r.category || '',
              station: r.station || '',
              projectName: r.projectName || '',
              materialList: this.normalizeMaterialList(r),
              materialSummary: this.formatMaterialSummary(this.normalizeMaterialList(r)),
              unit: r.unit || '吨',
              totalWeight: this.getRecordWeight(r),
              totalWeightText: this.formatDecimal(this.getRecordWeight(r)),
              water: this.formatConsumable(r.water),
              electricity: this.formatConsumable(r.electricity),
              coal: this.formatConsumable(r.coal),
              naturalGas: this.formatConsumable(r.naturalGas),
              otherConsumables: this.formatConsumable(r.otherConsumables),
              totalProjectOutput: 0,
              totalProjectOutputText: '0.00',
              remark: r.remark || '',
              approvalStatus: meta.status,
              approvalLabel: meta.label,
              approvalClass: meta.className
            };
          }
    })
      .then(res => {
        const records = res.list.sort((a, b) => this.compareRecordsByTimeDesc(a, b));
        this.fillProjectTotals(records);

        this.calculateStats(records);
        this.setData({
          records,
          filteredRecords: records,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载出料记录失败', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  // 计算统计数据
  calculateStats(records) {
    const today = this.getLocalDateString();
    const stats = {
      totalOutput: 0
    };
    records.forEach(r => {
      if (this.getRecordDateString(r.date) !== today) return;
      stats.totalOutput += r.totalWeight || 0;
    });
    this.setData({
      stats: {
        ...stats,
        totalOutputText: this.formatDecimal(stats.totalOutput)
      }
    });
  },

  formatDecimal(value, digits = 2) {
    const num = this.parseWeightNumber(value);
    if (!Number.isFinite(num)) return (0).toFixed(digits);
    return num.toFixed(digits);
  },

  parseWeightNumber(value) {
    if (value === undefined || value === null || value === '') return NaN;
    if (typeof value === 'number') return value;
    const text = String(value).trim().replace(/,/g, '');
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  },

  getLocalDateString(date = new Date()) {
    const d = parseDate(date);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getRecordDateString(date) {
    if (!date) return '';
    if (typeof date === 'string') return date.slice(0, 10);
    if (date instanceof Date) return this.getLocalDateString(date);
    if (typeof date === 'object' && date.$date) return this.getLocalDateString(date.$date);
    if (typeof date === 'object' && date.toDate) return this.getLocalDateString(date.toDate());
    return '';
  },

  getTimeValue(date) {
    return getTimeValue(date);
  },

  compareRecordsByTimeDesc(a, b) {
    const dateCompare = this.getRecordDateString(b.date).localeCompare(this.getRecordDateString(a.date));
    if (dateCompare !== 0) return dateCompare;

    const createTimeCompare = this.getTimeValue(b.createTime) - this.getTimeValue(a.createTime);
    if (createTimeCompare !== 0) return createTimeCompare;

    return String(b.id || '').localeCompare(String(a.id || ''));
  },

  fillProjectTotals(records) {
    records.forEach(record => {
      const recordDate = this.getRecordDateString(record.date);
      record.totalProjectOutput = records.reduce((sum, item) => {
        if (!record.projectName || item.projectName !== record.projectName) return sum;
        const itemDate = this.getRecordDateString(item.date);
        if (recordDate && itemDate && itemDate > recordDate) return sum;
        return sum + this.getRecordWeight(item);
      }, 0);
      record.totalProjectOutputText = this.formatDecimal(record.totalProjectOutput);
    });
  },

  // 加载项目列表
  loadProjects() {
    const db = wx.cloud.database();
    loadFilteredPage({
      db,
      collection: 'output_record',
      pageIndex: 0,
      pageSize: 100,
      maxScanPages: 20,
      filter: r => !isDeletedRecord(r) && canViewRecord(r)
    })
      .then(res => {
        const projectSet = new Set();
        ;(res.list || []).forEach(r => {
          if (r.projectName) projectSet.add(r.projectName);
        });
        this.setData({ projects: Array.from(projectSet) });
      });
  },

  loadStations() {
    const db = wx.cloud.database();
    db.collection('stations')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        const stationOptions = (res.data || []).filter(item => item.name);
        this.setData({ stationOptions });
      })
      .catch(err => {
        console.error('加载站点失败', err);
      });
  },

  // 搜索
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    this.filterRecords();
  },

  filterRecords() {
    const { records, searchText } = this.data;
    if (!searchText) {
      this.setData({ filteredRecords: records });
      return;
    }
    const filtered = records.filter(r =>
      r.station.includes(searchText) ||
      r.projectName.includes(searchText) ||
      r.materialSummary.includes(searchText) ||
      r.category.includes(searchText)
    );
    this.setData({ filteredRecords: filtered });
  },

  // 日期筛选
  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value });
    this.filterByDate();
  },

  filterByDate() {
    const { records, selectedDate } = this.data;
    if (!selectedDate) {
      this.setData({ filteredRecords: records });
      return;
    }
    const filtered = records.filter(r => r.date && r.date.startsWith(selectedDate));
    this.setData({ filteredRecords: filtered });
  },

  // 项目筛选
  onProjectChange(e) {
    const index = e.detail.value;
    const project = this.data.projects[index] || '';
    this.setData({ selectedProject: project });
    this.filterByProject();
  },

  onStationChange(e) {
    const station = this.data.stationOptions[Number(e.detail.value)];
    this.setData({ 'newRecord.station': station?.name || '' });
  },

  filterByProject() {
    const { records, selectedProject } = this.data;
    if (!selectedProject) {
      this.setData({ filteredRecords: records });
      return;
    }
    const filtered = records.filter(r => r.projectName === selectedProject);
    this.setData({ filteredRecords: filtered });
  },

  loadMore() {
    // 当前页面一次性加载全部出料记录，保留滚动到底部事件避免小程序报未定义方法。
  },

  // 显示新增弹窗
  showAddModal() {
    this.setData({
      showAddModal: true,
      editingId: '',
      editMode: false,
      newRecord: {
        category: '沥青混合料',
        station: '',
        projectName: '',
        materialList: [{ name: '', weight: '' }],
        unit: '吨',
        water: '',
        electricity: '',
        coal: '',
        naturalGas: '',
        otherConsumables: '',
        remark: ''
      }
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showAddModal: false, editingId: '', editMode: false });
  },

  // 阻止事件冒泡
  stopBubble() {
    // 什么都不做，只是阻止事件冒泡
  },

  formatConsumable(value) {
    return value === undefined || value === null || value === '' ? '0' : String(value);
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    let value = e.detail.value;
    this.setData({ [`newRecord.${field}`]: value });
  },

  onMaterialInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const materialList = this.data.newRecord.materialList.slice();
    if (!materialList[index]) return;
    materialList[index] = { ...materialList[index], [field]: e.detail.value };
    this.setData({ 'newRecord.materialList': materialList });
  },

  addMaterial() {
    const materialList = this.data.newRecord.materialList.slice();
    materialList.push({ name: '', weight: '' });
    this.setData({ 'newRecord.materialList': materialList });
  },

  removeMaterial(e) {
    const index = Number(e.currentTarget.dataset.index);
    const materialList = this.data.newRecord.materialList.slice();
    if (materialList.length <= 1) {
      materialList[0] = { name: '', weight: '' };
    } else {
      materialList.splice(index, 1);
    }
    this.setData({ 'newRecord.materialList': materialList });
  },

  normalizeMaterialList(record = {}) {
    const source = Array.isArray(record.materialList) ? record.materialList : Array.isArray(record.materials) ? record.materials : [];
    const list = source.map(item => ({
      name: item.name || item.materialName || '',
      weight: item.weight === 0 || item.weight ? item.weight : item.materialWeight || ''
    })).filter(item => item.name || item.weight === 0 || item.weight);
    if (list.length) return list;
    if (record.materialName || record.todayOutput === 0 || record.todayOutput) {
      return [{ name: record.materialName || '', weight: record.todayOutput || '' }];
    }
    return [{ name: '', weight: '' }];
  },

  getRecordWeight(record = {}) {
    const list = this.normalizeMaterialList(record);
    const listWeight = list.reduce((sum, item) => sum + (this.parseWeightNumber(item.weight) || 0), 0);
    if (listWeight > 0) return listWeight;
    if (record.todayOutput === 0 || record.todayOutput) return this.parseWeightNumber(record.todayOutput) || 0;
    if (record.totalWeight === 0 || record.totalWeight) return this.parseWeightNumber(record.totalWeight) || 0;
    return 0;
  },

  formatMaterialSummary(list = []) {
    const valid = list.filter(item => item.name || item.weight === 0 || item.weight);
    if (!valid.length) return '-';
    return valid.map(item => {
      const name = item.name || '未命名物料';
      const weight = this.formatDecimal(item.weight);
      return `${name} ${weight}`;
    }).join('、');
  },

  // 提交新增（需要审批）
  async submitRecord() {
    const { newRecord } = this.data;
    const materialList = this.normalizeMaterialList(newRecord)
      .filter(item => item.name || item.weight === 0 || item.weight);
    if (!newRecord.station) {
      wx.showToast({ title: '请选择所属站点', icon: 'none' });
      return;
    }
    if (!newRecord.projectName) {
      wx.showToast({ title: '请填写项目/收货名称', icon: 'none' });
      return;
    }
    if (!materialList.length) {
      wx.showToast({ title: '请填写物料重量', icon: 'none' });
      return;
    }
    const invalidWeightIndex = materialList.findIndex(item => !(this.parseWeightNumber(item.weight) > 0));
    if (invalidWeightIndex > -1) {
      wx.showToast({ title: `请填写物料${invalidWeightIndex + 1}重量`, icon: 'none' });
      return;
    }
    const normalizedMaterialList = materialList.map((item, index) => ({
      name: item.name || `物料${index + 1}`,
      weight: item.weight
    }));

    const db = wx.cloud.database();
    const today = this.data.editMode ? (newRecord.date || this.getLocalDateString()) : this.getLocalDateString();
    const app = getApp();
    const openid = currentOpenid();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const submitterName = userInfo.name || userInfo.nickName || '微信用户';
    const submitTime = db.serverDate();
    const shouldRestoreModal = this.data.showAddModal;
    if (shouldRestoreModal) this.setData({ showAddModal: false });
    const approvalFields = await this.prepareApprovalFields('output_record');
    if (!approvalFields) {
      if (shouldRestoreModal) this.setData({ showAddModal: true });
      return;
    }

    const submitData = {
      date: today,
      category: newRecord.category,
      station: newRecord.station,
      projectName: newRecord.projectName,
      materialList: normalizedMaterialList,
      totalWeight: normalizedMaterialList.reduce((sum, item) => sum + (this.parseWeightNumber(item.weight) || 0), 0),
      unit: newRecord.unit,
      water: newRecord.water || '',
      electricity: newRecord.electricity || '',
      coal: newRecord.coal || '',
      naturalGas: newRecord.naturalGas || '',
      otherConsumables: newRecord.otherConsumables || '',
      remark: newRecord.remark,
      submitterOpenid: openid,
      submitterName,
      submitter: submitterName,
      submitTime,
      approver: '',
      ...approvalFields,
      ...pendingPatch(db)
    };
    if (!this.data.editMode) submitData.createTime = submitTime;
    const task = this.data.editMode && this.data.editingId
      ? db.collection('output_record').doc(this.data.editingId).update({ data: submitData })
      : db.collection('output_record').add({ data: submitData });

    task.then(() => {
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' });
      this.closeModal();
      this.loadRecords();
    }).catch(err => {
      console.error('添加失败', err);
      if (shouldRestoreModal) this.setData({ showAddModal: true });
      wx.showToast({ title: formatErrorMessage(err, '添加失败'), icon: 'none' });
    });
  },

  // 查看详情
  onRecordTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/output-detail/output-detail?id=${id}` });
  },

  // 删除记录（第一级确认）
  onDeleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条出料记录吗？',
      success: res => {
        if (res.confirm) {
          // 显示删除原因输入弹窗
          this.setData({
            showDeleteModal: true,
            deleteRecordId: id,
            deleteReason: ''
          });
        }
      }
    });
  },

  // 关闭删除弹窗
  closeDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deleteRecordId: '',
      deleteReason: ''
    });
  },

  // 输入删除原因
  onDeleteReasonInput(e) {
    this.setData({ deleteReason: e.detail.value });
  },

  // 确认删除（第二级 - 输入原因后删除）
  confirmDelete() {
    const { deleteRecordId, deleteReason } = this.data;
    
    if (!deleteReason.trim()) {
      wx.showToast({ title: '请输入删除原因', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    const now = new Date();
    const deleteTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    db.collection('output_record').doc(deleteRecordId).update({
      data: {
        status: 0,
        approvalStatus: 'deleted',
        deletedBy: '管理员',
        deletedTime: deleteTime,
        deleteReason: deleteReason.trim()
      }
    }).then(() => {
      wx.showToast({ title: '已删除', icon: 'success' });
      this.closeDeleteModal();
      this.loadRecords();
    }).catch(err => {
      console.error('删除失败', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  },

  // 跳转到审批页面
  goToApproval() {
    wx.navigateTo({ url: '/pages/approval-list/approval-list' });
  }
});
