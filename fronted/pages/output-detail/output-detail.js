// pages/output-detail/output-detail.js - 拌站出料详情页
const { formatDateTime, parseDate } = require('../../utils/util')
const { approvalStatusMeta, isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit')
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record')

Page({
  data: {
    id: '',
    loading: true,
    record: null
  },

  onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    if (!id) {
      this.setData({ loading: false });
      wx.showToast({ title: '缺少记录ID', icon: 'none' });
      return;
    }
    this.loadRecord(id);
  },

  onShow() {
    if (this.data.id && !this.data.loading) {
      this.loadRecord(this.data.id);
    }
  },

  loadRecord(id) {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    db.collection('output_record')
      .doc(id)
      .get()
      .then(res => {
        const data = res.data || {};
        if (isDeletedRecord(data) || !canViewRecord(data)) {
          this.setData({ record: null, loading: false });
          wx.showToast({ title: isDeletedRecord(data) ? '记录已删除' : '无权查看', icon: 'none' });
          return;
        }
        const record = this.normalizeRecord(data);
        this.loadProjectTotal(record);
      })
      .catch(err => {
        console.error('加载出料详情失败', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  loadProjectTotal(record) {
    const db = wx.cloud.database();
    db.collection('output_record')
      .where({ projectName: record.projectName })
      .limit(200)
      .get()
      .then(async res => {
        const recordDate = this.getRecordDateString(record.date);
        const totalProjectOutput = (res.data || [])
          .filter(item => !isDeletedRecord(item) && canViewRecord(item))
          .reduce((sum, item) => {
            const itemDate = this.getRecordDateString(item.date);
            if (recordDate && itemDate && itemDate > recordDate) return sum;
            return sum + this.getRecordWeight(item);
          }, 0);
        const nextRecord = await enrichApprovalTimelineRecords({
          ...record,
          totalProjectOutput,
          totalProjectOutputText: this.formatDecimal(totalProjectOutput)
        });
        this.setData({
          record: nextRecord,
          loading: false
        });
      })
      .catch(() => {
        this.setData({ record, loading: false });
      });
  },

  normalizeRecord(data) {
    const meta = approvalStatusMeta(data);
    const createTimeStr = this.formatTime(data.createTime || data.submitTime);
    const approvalTimeStr = this.formatTime(data.approvalTime);

    return normalizeApprovalTimelineRecord({
      ...data,
      date: this.getRecordDateString(data.date),
      category: data.category || '-',
      station: data.station || '-',
      projectName: data.projectName || '-',
      materialList: this.normalizeMaterialList(data),
      unit: data.unit || '吨',
      totalWeight: this.getRecordWeight(data),
      totalWeightText: this.formatDecimal(this.getRecordWeight(data)),
      water: this.formatConsumable(data.water),
      electricity: this.formatConsumable(data.electricity),
      coal: this.formatConsumable(data.coal),
      naturalGas: this.formatConsumable(data.naturalGas),
      otherConsumables: this.formatConsumable(data.otherConsumables),
      totalProjectOutput: 0,
      totalProjectOutputText: '0.00',
      remark: data.remark || '',
      approvalRemark: data.approvalRemark || '',
      approvalStatus: meta.status,
      canEdit: canEditRecord(data),
      approvalLabel: meta.label,
      approvalClass: meta.className,
      createTimeStr,
      approvalTimeStr
    }, createTimeStr);
  },

  formatConsumable(value) {
    return value === undefined || value === null || value === '' ? '0' : String(value);
  },

  normalizeMaterialList(record = {}) {
    const source = Array.isArray(record.materialList) ? record.materialList : Array.isArray(record.materials) ? record.materials : [];
    const list = source.map(item => ({
      name: item.name || item.materialName || '',
      weight: item.weight === 0 || item.weight ? item.weight : item.materialWeight || ''
    })).filter(item => item.name || item.weight === 0 || item.weight);
    if (list.length) return list.map(item => ({
      ...item,
      weightText: this.formatDecimal(item.weight)
    }));
    if (record.materialName || record.todayOutput === 0 || record.todayOutput) {
      return [{
        name: record.materialName || '',
        weight: record.todayOutput || '',
        weightText: this.formatDecimal(record.todayOutput)
      }];
    }
    return [];
  },

  getRecordWeight(record = {}) {
    const list = this.normalizeMaterialList(record);
    const listWeight = list.reduce((sum, item) => sum + (this.parseWeightNumber(item.weight) || 0), 0);
    if (listWeight > 0) return listWeight;
    if (record.todayOutput === 0 || record.todayOutput) return this.parseWeightNumber(record.todayOutput) || 0;
    if (record.totalWeight === 0 || record.totalWeight) return this.parseWeightNumber(record.totalWeight) || 0;
    return 0;
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

  getRecordDateString(date) {
    if (!date) return '';
    if (typeof date === 'string') return date.slice(0, 10);
    if (date instanceof Date) return this.getLocalDateString(date);
    if (typeof date === 'object' && date.$date) return this.getLocalDateString(date.$date);
    if (typeof date === 'object' && date.toDate) return this.getLocalDateString(date.toDate());
    return '';
  },

  getLocalDateString(date = new Date()) {
    const d = parseDate(date);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatTime(date) {
    return formatDateTime(date);
  },

  onEdit() {
    if (!this.data.id) return;
    wx.navigateTo({ url: `/pages/output-list/output-list?id=${this.data.id}&mode=edit` });
  }
});
