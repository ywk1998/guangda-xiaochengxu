// pages/log-detail/log-detail.js
const { delayedSafeBack } = require('../../utils/navigation');
const { formatDateTime } = require('../../utils/util');
const { isDeletedRecord, canViewRecord, canEditRecord } = require('../../utils/form-edit');
const { normalizeApprovalTimelineRecord, enrichApprovalTimelineRecords } = require('../../utils/approval-record');
Page({
  data: {
    log: null,
    loading: true,
    id: ''
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ id });
      this.loadDetail(id);
    }
  },

  onShow() {
    if (this.data.id && !this.data.loading) {
      this.loadDetail(this.data.id);
    }
  },

  loadDetail(id) {
    const db = wx.cloud.database();
    db.collection('construction_log').doc(id).get({
      success: async (res) => {
        let log = res.data;
        if (isDeletedRecord(log) || !canViewRecord(log)) {
          this.setData({ log: null, loading: false });
          wx.showToast({ title: isDeletedRecord(log) ? '记录已删除' : '无权查看', icon: 'none' });
          return;
        }
        const approvalStatus = log.approvalStatus || log.status || 'pending';
        log.approvalStatus = approvalStatus;
        log.canEdit = canEditRecord(log);
        // 格式化提交时间
        if (log.submitTime) {
          log.submitTimeStr = formatDateTime(log.submitTime);
        }
        log.shuiwenLayers = this.filterRows(log.shuiwenLayers, ['name', 'designQty', 'designThickness', 'constructArea', 'avgThickness', 'cumQty']);
        log.structureLayers = this.filterRows(log.structureLayers, ['type', 'designQty', 'designThickness', 'constructArea', 'avgThickness', 'cumQty']);
        log.funcLayers = this.filterRows(log.funcLayers, ['type', 'designQty', 'funcArea', 'cumQty']);
        log.machines = this.filterRows(log.machines, ['name', 'area', 'fuel', 'image']);
        log.materials = this.filterRows(log.materials, ['name', 'dayQty', 'totalQty']);
        log.workers = this.normalizeWorkers(log.workers);
        log.photos = Array.isArray(log.photos) ? log.photos.filter((url) => !!url) : [];
        log.attachments = Array.isArray(log.attachments) ? log.attachments.filter((item) => item && (item.name || item.path || item.url)) : [];
        log.safetyEduText = this.formatYesNo(log.safetyEdu);
        log = normalizeApprovalTimelineRecord(log, log.submitTimeStr);
        log = await enrichApprovalTimelineRecords(log);
        this.setData({ log, loading: false });
      },
      fail: (err) => {
        console.error('加载详情失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  filterRows(list, fields) {
    if (!Array.isArray(list)) return [];
    return list.filter(item => fields.some(field => item && item[field] !== undefined && item[field] !== ''));
  },

  formatYesNo(value) {
    if (value === 1 || value === '1' || value === true) return '是';
    if (value === 0 || value === '0' || value === false) return '否';
    return '-';
  },

  normalizeWorkers(list) {
    if (!Array.isArray(list)) return [];
    const rows = [];
    list.forEach(worker => {
      if (!worker) return;
      if (worker.name || worker.team) rows.push({ name: worker.name || '', team: worker.team || '' });
      if (worker.name1 || worker.team1) rows.push({ name: worker.name1 || '', team: worker.team1 || '' });
      if (worker.name2 || worker.team2) rows.push({ name: worker.name2 || '', team: worker.team2 || '' });
    });
    return rows;
  },

  // 预览施工照片
  previewPhoto(e) {
    const { url } = e.currentTarget.dataset;
    const urls = (this.data.log && this.data.log.photos) || [];
    if (url) wx.previewImage({ urls, current: url });
  },

  // 打开附件（Excel / Word / PDF）
  openAttachment(e) {
    const list = (this.data.log && this.data.log.attachments) || [];
    const item = list[Number(e.currentTarget.dataset.index)];
    if (!item) return;
    const fileType = item.type || this.mapOpenFileType(item.ext || item.name || item.url);
    const openLocal = (filePath) => {
      wx.openDocument({
        filePath,
        fileType,
        showMenu: true,
        fail: () => wx.showToast({ title: '无法打开该附件', icon: 'none' })
      });
    };
    const source = item.path || item.url || '';
    if (!source) {
      wx.showToast({ title: '附件地址缺失', icon: 'none' });
      return;
    }
    if (/^https?:\/\//.test(source)) {
      wx.showLoading({ title: '打开中...', mask: true });
      wx.downloadFile({
        url: source,
        success: (res) => {
          wx.hideLoading();
          if (res.tempFilePath) openLocal(res.tempFilePath);
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '附件下载失败', icon: 'none' });
        }
      });
      return;
    }
    openLocal(source);
  },

  mapOpenFileType(name) {
    const text = String(name || '');
    const ext = text.indexOf('.') > -1 ? text.split('.').pop().toLowerCase() : '';
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'].indexOf(ext) > -1 ? ext : 'pdf';
  },

  onEdit() {
    if (!canEditRecord(this.data.log)) {
      wx.showToast({ title: '当前状态不可修改', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/construction-log/construction-log?id=${this.data.id}&mode=edit` });
  },

  // 复制表单：把本条日志内容带到一个全新的填写页（不影响原记录）
  onCopyForm() {
    wx.navigateTo({ url: `/pages/construction-log/construction-log?id=${this.data.id}&mode=copy` });
  },

  // 删除日志
  onDelete() {
    wx.showModal({
      title: '确认删除',
      editable: true,
      placeholderText: '请输入删除原因',
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (!res.confirm) return;
        const reason = (res.content || '').trim();
        if (!reason) {
          wx.showToast({ title: '请输入删除原因', icon: 'none' });
          return;
        }
        const db = wx.cloud.database();
        db.collection('construction_log').doc(this.data.id).remove({
          data: { reason },
          success: () => {
            wx.showToast({ title: '已删除', icon: 'success' });
            delayedSafeBack('/pages/index/index');
          },
          fail: (err) => {
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        });
      }
    });
  }
});
