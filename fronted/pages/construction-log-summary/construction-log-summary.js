// pages/construction-log-summary/construction-log-summary.js
const { delayedSafeBack } = require('../../utils/navigation');
const { canEditRecord, pendingPatch, stripSystemFields } = require('../../utils/form-edit');
const { currentOpenid } = require('../../utils/participants');
const { formatErrorMessage } = require('../../utils/error-message');
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
Page({
  data: {
    collectionName: 'construction_log_summary',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    projectName: '',
    date: '',
    subList: []
  },

  ...approvalSelectorMethods,

  onLoad(options = {}) {
    this.loadApprovalFlow('construction_log_summary');
    // 默认当天日期
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ date: `${y}-${m}-${d}` });
    if (options.id) {
      this.setData({ editingId: options.id, editMode: options.mode === 'edit' });
      this.loadRecordForEdit(options.id);
      return;
    }
    // 恢复草稿
    this.loadDraft();
  },

  loadRecordForEdit(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    const db = wx.cloud.database();
    db.collection('construction_log_summary').doc(id).get()
      .then(res => {
        wx.hideLoading();
        const record = res.data || {};
        if (!canEditRecord(record)) {
          wx.showToast({ title: '当前状态不可修改', icon: 'none' });
          delayedSafeBack('/pages/index/index');
          return;
        }
        const data = stripSystemFields(record);
        this.setData({
          projectName: data.projectName || '',
          date: data.date || '',
          subList: Array.isArray(data.subList) ? data.subList : []
        }, () => this.calcSummary());
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载施工日志汇总失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        delayedSafeBack('/pages/index/index');
      });
  },

  // 主表输入
  onMainInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  // 子表输入
  onSubInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const list = [...this.data.subList];
    list[index][field] = value;

    // 盈亏字段手动输入时设置颜色
    if (field === 'profit') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        list[index].profitClass = num >= 0 ? 'profit' : 'loss';
      } else {
        list[index].profitClass = '';
      }
    }

    this.setData({ subList: list }, () => this.calcSummary());
  },

  // 添加一行
  addRow() {
    const list = [...this.data.subList];
    list.push({
      layer: '',
      designThick: '',
      targetThick: '',
      avgThick: '',
      density: '',
      designSpread: '',
      targetSpread: '',
      contractArea: '',
      targetTon: '',
      cumArea: '',
      actualSpread: '',
      material: '',
      cumTon: '',
      areaTon: '',
      profit: '',
      profitClass: '',
      remark: ''
    });
    this.setData({ subList: list });
  },

  // 删除一行
  deleteRow(e) {
    const { index } = e.currentTarget.dataset;
    const list = [...this.data.subList];
    list.splice(index, 1);
    this.setData({ subList: list }, () => this.calcSummary());
  },

  // 计算底部合计
  calcSummary() {
    const list = this.data.subList;
    let totalContract = 0;
    let totalTargetTon = 0;
    let totalArea = 0;
    let totalCumTon = 0;
    let totalProfit = 0;

    list.forEach(item => {
      totalContract += parseFloat(item.contractArea) || 0;
      totalTargetTon += parseFloat(item.targetTon) || 0;
      totalArea += parseFloat(item.cumArea) || 0;
      totalCumTon += parseFloat(item.cumTon) || 0;
      totalProfit += parseFloat(item.profit) || 0;
    });

    this.setData({
      totalContract: parseFloat(totalContract.toFixed(3)),
      totalTargetTon: parseFloat(totalTargetTon.toFixed(3)),
      totalArea: parseFloat(totalArea.toFixed(3)),
      totalCumTon: parseFloat(totalCumTon.toFixed(3)),
      totalProfit: parseFloat(totalProfit.toFixed(3))
    });
  },

  // 提交表单
  async submitForm() {
    const { projectName, date, subList, totalContract, totalTargetTon, totalArea, totalCumTon, totalProfit } = this.data;

    if (!projectName) {
      wx.showToast({ title: '请填写项目名称', icon: 'none' }); return;
    }
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' }); return;
    }
    if (!subList || subList.length === 0) {
      wx.showToast({ title: '请添加施工明细', icon: 'none' }); return;
    }

    const approvalFields = await this.prepareApprovalFields('construction_log_summary');
    if (!approvalFields) return;

    wx.showLoading({ title: '提交中...', mask: true });

    const db = wx.cloud.database();
    const openid = currentOpenid();
    const userInfo = wx.getStorageSync('userInfo') || {};
    const submitterName = userInfo.name || userInfo.nickName || '微信用户';
    const submitData = {
      projectName,
      date,
      subList,
      totalContract,
      totalTargetTon,
      totalArea,
      totalCumTon,
      totalProfit,
      submitterOpenid: openid,
      submitterName,
      submitter: submitterName,
      ...approvalFields,
      ...pendingPatch(db)
    };
    if (!this.data.editMode) submitData.createTime = db.serverDate();
    const task = this.data.editMode && this.data.editingId
      ? db.collection('construction_log_summary').doc(this.data.editingId).update({ data: submitData })
      : db.collection('construction_log_summary').add({ data: submitData });

    task.then(() => {
      wx.hideLoading();
      wx.showToast({ title: this.data.editMode ? '修改已提交' : '提交成功', icon: 'success' });
      wx.removeStorageSync('construction_log_summary_draft');
      delayedSafeBack('/pages/index/index');
    }).catch(err => {
      wx.hideLoading();
      console.error('提交失败', err);
      wx.showToast({ title: formatErrorMessage(err), icon: 'none' });
    });
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('construction_log_summary_draft');
    if (draft) {
      this.setData({
        projectName: draft.projectName || '',
        date: draft.date || '',
        subList: draft.subList || []
      }, () => this.calcSummary());
    }
  },

  // 保存草稿
  saveDraft() {
    const { projectName, date, subList } = this.data;
    wx.setStorageSync('construction_log_summary_draft', { projectName, date, subList, saveTime: new Date().toISOString() });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  // 查看记录
  goToRecord() {
    wx.navigateTo({ url: '/pages/construction-log-summary-record/construction-log-summary-record' });
  }
});
