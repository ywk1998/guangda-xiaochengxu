// pages/construction-log/construction-log.js
const { delayedSafeBack } = require('../../utils/navigation');
const { uploadImage, uploadImages, compressLocalImage } = require('../../utils/upload-image');
const { currentOpenid } = require('../../utils/participants');
const { formatErrorMessage } = require('../../utils/error-message');
const { selectorState, approvalSelectorMethods } = require('../../utils/approval-flow');
const { requestSubscribe } = require('../../utils/subscribe');
Page({
  data: {
    collectionName: 'construction_log',
    approvalFlow: [],
    approvalFlowLoaded: false,
    approvalSelector: selectorState(),
    editingId: '',
    editMode: false,
    // 施工内容三张表格的横向滚动状态（拖动条）
    tables: {
      shuiwen: { scrollLeft: 0, thumbLeft: 0, thumbWidth: 0, scrollable: false, contentWidth: 0, viewWidth: 0, startX: 0, startLeft: 0 },
      structure: { scrollLeft: 0, thumbLeft: 0, thumbWidth: 0, scrollable: false, contentWidth: 0, viewWidth: 0, startX: 0, startLeft: 0 },
      func: { scrollLeft: 0, thumbLeft: 0, thumbWidth: 0, scrollable: false, contentWidth: 0, viewWidth: 0, startX: 0, startLeft: 0 }
    },
    weatherOptions: ['晴', '阴', '多云', '小雨', '中雨', '大雨', '雨夹雪', '雪'],
    structureTypes: ['水稳层', '沥青面层', '沥青底层', '沥青中层', '基层', '其他'],
    protectionOptions: ['良好', '部分未佩戴（已纠正）', '未佩戴'],
    form: {
      projectName: '',
      roadSection: '',
      date: '',
      weather: '',
      recorder: '',
      // 施工内容 - 结构层表格
      structureLayers: [
        { type: '', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' },
      ],
      // 水稳层表格
      shuiwenLayers: [
        { name: '水稳层', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' },
      ],
      // 功能层表格
      funcLayers: [
        { type: '', designQty: '', funcArea: '', cumQty: '' },
      ],
      // 机械使用说明 / 材料使用说明
      machineNote: '',
      materialNote: '',
      // 施工照片
      photos: [],
      // 附件（Excel / Word / PDF）
      attachments: [],
      // 机械
      machines: [
        { name: '', area: '', fuel: '', image: '', remark: '' },
      ],
      // 材料
      materials: [
        { name: '', dayQty: '', totalQty: '', remark: '' },
      ],
      // 安全
      safetyEdu: -1,
      safetyEduContent: '',
      personalProtection: '',
      trafficGuide: '',
      envProtect: '',
      hazardFound: '',
      hazardFixed: '',
      hazardUnfixed: '',
      // 人员
      workers: [
        { name: '', team: '' },
      ],
      // 明日计划
      tomorrowPlan: '',
    }
  },

  ...approvalSelectorMethods,

  onReady() {
    this.measureTables();
  },

  // ===== 施工内容表格：横向滚动 + 拖动条 =====
  measureTables() {
    const selectors = { shuiwen: '.shuiwen-table', structure: '.structure-table', func: '.func-table' };
    Object.keys(selectors).forEach((key) => {
      const root = selectors[key];
      const query = wx.createSelectorQuery().in(this);
      query.select(`${root} .table-scroll`).boundingClientRect();
      query.select(`${root} .table-inner`).boundingClientRect();
      query.exec((res) => {
        const viewWidth = (res && res[0] && res[0].width) || 0;
        const contentWidth = (res && res[1] && res[1].width) || 0;
        const table = this.data.tables[key];
        if (!viewWidth || !contentWidth || !table) return;
        const scrollable = contentWidth > viewWidth + 1;
        const thumbWidth = scrollable ? Math.max(24, Math.round((viewWidth * viewWidth) / contentWidth)) : 0;
        const maxScroll = Math.max(1, contentWidth - viewWidth);
        const maxThumb = Math.max(1, viewWidth - thumbWidth);
        this.setData({
          [`tables.${key}.contentWidth`]: contentWidth,
          [`tables.${key}.viewWidth`]: viewWidth,
          [`tables.${key}.thumbWidth`]: thumbWidth,
          [`tables.${key}.scrollable`]: scrollable,
          [`tables.${key}.thumbLeft`]: scrollable ? Math.min(maxThumb, ((table.scrollLeft || 0) / maxScroll) * maxThumb) : 0
        });
      });
    });
  },

  onTableScroll(e) {
    const key = e.currentTarget.dataset.key;
    const table = this.data.tables[key];
    if (!table || !table.scrollable) return;
    const scrollLeft = e.detail.scrollLeft || 0;
    const maxScroll = Math.max(1, table.contentWidth - table.viewWidth);
    const maxThumb = Math.max(1, table.viewWidth - table.thumbWidth);
    const thumbLeft = Math.min(maxThumb, Math.max(0, (scrollLeft / maxScroll) * maxThumb));
    this.setData({
      [`tables.${key}.thumbLeft`]: thumbLeft,
      [`tables.${key}.scrollLeft`]: scrollLeft
    });
  },

  onThumbTouchStart(e) {
    const key = e.currentTarget.dataset.key;
    const touch = (e.touches && e.touches[0]) || {};
    this.setData({
      [`tables.${key}.startX`]: touch.clientX || 0,
      [`tables.${key}.startLeft`]: this.data.tables[key].thumbLeft || 0
    });
  },

  onThumbTouchMove(e) {
    const key = e.currentTarget.dataset.key;
    const table = this.data.tables[key];
    if (!table || !table.scrollable) return;
    const touch = (e.touches && e.touches[0]) || {};
    const dx = (touch.clientX || 0) - (table.startX || 0);
    const maxThumb = Math.max(1, table.viewWidth - table.thumbWidth);
    const maxScroll = Math.max(1, table.contentWidth - table.viewWidth);
    const thumbLeft = Math.min(maxThumb, Math.max(0, (table.startLeft || 0) + dx));
    this.setData({
      [`tables.${key}.thumbLeft`]: thumbLeft,
      [`tables.${key}.scrollLeft`]: (thumbLeft / maxThumb) * maxScroll
    });
  },

  onLoad(options = {}) {
    this.loadApprovalFlow('construction_log');
    // 默认填入今日日期
    this.setData({ 'form.date': this.formatToday() });

    if (options.id) {
      const isCopy = options.mode === 'copy';
      this.setData({
        // 复制模式：不绑定原记录 id，提交时走新增
        editingId: isCopy ? '' : options.id,
        editMode: options.mode === 'edit'
      });
      this.loadLogForEdit(options.id, isCopy);
      return;
    }

    // 尝试读取草稿
    const draft = wx.getStorageSync('construction_log_draft');
    if (draft) {
      this.setData({ form: draft }, () => this.measureTables());
    }

  },

  formatToday() {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
  },

  loadLogForEdit(id, isCopy = false) {
    wx.showLoading({ title: '加载中...', mask: true });
    const db = wx.cloud.database();
    db.collection('construction_log').doc(id).get({
      success: (res) => {
        wx.hideLoading();
        const log = res.data || {};
        // 复制模式不改原单，任何审批状态都允许复制，跳过状态校验
        if (!isCopy) {
          const status = log.approvalStatus || log.status || 'pending';
          if (status !== 'pending' && status !== 'rejected') {
            wx.showToast({ title: '当前状态不可修改', icon: 'none' });
            delayedSafeBack('/pages/index/index');
            return;
          }
        }
        const form = this.normalizeEditForm(log);
        if (isCopy) {
          form.date = this.formatToday();
        }
        this.setData({
          form
        }, () => this.measureTables());
        if (isCopy) {
          wx.showToast({ title: '已复制，请修改后提交', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('加载施工日志失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
        delayedSafeBack('/pages/index/index');
      },
      complete: () => wx.hideLoading()
    });
  },

  normalizeEditForm(log) {
    const form = { ...this.data.form, ...log };
    delete form._id;
    delete form.id;
    delete form.collection;
    delete form.status;
    delete form.approvalStatus;
    delete form.approvalTime;
    delete form.approvalRemark;
    delete form.approvalLevels;
    delete form.approvalFlowSnapshot;
    delete form.approvalHistory;
    delete form.currentApprovalStep;
    delete form.currentApprovalType;
    delete form.currentApprovers;
    delete form.currentApproverOpenids;
    delete form.currentApproverNames;
    delete form.approvalStatusText;
    delete form.approverOpenid;
    delete form.approver;
    delete form.approverName;
    delete form.participants;
    delete form.participantOpenids;
    delete form.submitTime;
    delete form.createTime;
    delete form.updateTime;
    delete form.deletedBy;
    delete form.deletedTime;
    delete form.deleteReason;
    delete form.totalArea;      // 已移除：至今累计施工总面积
    delete form.contractTotal;  // 已移除：合同量
    form.structureLayers = this.ensureRows(form.structureLayers, [{ type: '', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' }]);
    form.shuiwenLayers = this.ensureRows(form.shuiwenLayers, [{ name: '水稳层', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' }]);
    form.funcLayers = this.ensureRows(form.funcLayers, [{ type: '', designQty: '', funcArea: '', cumQty: '' }]);
    form.machines = this.ensureRows(form.machines, [{ name: '', area: '', fuel: '', image: '', remark: '' }]);
    form.materials = this.ensureRows(form.materials, [{ name: '', dayQty: '', totalQty: '', remark: '' }]);
    form.workers = this.ensureRows(form.workers, [{ name: '', team: '' }]);
    form.photos = Array.isArray(form.photos) ? form.photos : [];
    form.attachments = Array.isArray(form.attachments) ? form.attachments.filter((item) => item && (item.name || item.path)) : [];
    return form;
  },

  ensureRows(value, fallback) {
    return Array.isArray(value) && value.length ? value : fallback;
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onWeatherTap(e) {
    this.setData({ 'form.weather': e.currentTarget.dataset.val });
  },

  onRadioTap(e) {
    const { field, val } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: val });
  },

  onSafetyCheck(e) {
    const { field, val } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: val });
  },

  // 结构层
  onLayerInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.structureLayers[${idx}].${field}`]: e.detail.value });
  },
  addLayer() {
    const layers = this.data.form.structureLayers;
    layers.push({ type: '', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' });
    this.setData({ 'form.structureLayers': layers }, () => this.measureTables());
  },
  deleteLayer(e) {
    const { idx } = e.currentTarget.dataset;
    const layers = this.data.form.structureLayers;
    if (layers.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    layers.splice(idx, 1);
    this.setData({ 'form.structureLayers': layers }, () => this.measureTables());
  },

  // 水稳层
  onShuiwenInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.shuiwenLayers[${idx}].${field}`]: e.detail.value });
  },
  addShuiwen() {
    const layers = this.data.form.shuiwenLayers;
    layers.push({ name: '水稳层', designQty: '', designThickness: '', constructArea: '', avgThickness: '', cumQty: '' });
    this.setData({ 'form.shuiwenLayers': layers }, () => this.measureTables());
  },
  deleteShuiwen(e) {
    const { idx } = e.currentTarget.dataset;
    const layers = this.data.form.shuiwenLayers;
    if (layers.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    layers.splice(idx, 1);
    this.setData({ 'form.shuiwenLayers': layers }, () => this.measureTables());
  },

  // 功能层
  onFuncLayerInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.funcLayers[${idx}].${field}`]: e.detail.value });
  },
  addFuncLayer() {
    const layers = this.data.form.funcLayers;
    layers.push({ type: '', designQty: '', funcArea: '', cumQty: '' });
    this.setData({ 'form.funcLayers': layers }, () => this.measureTables());
  },
  deleteFuncLayer(e) {
    const { idx } = e.currentTarget.dataset;
    const layers = this.data.form.funcLayers;
    if (layers.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    layers.splice(idx, 1);
    this.setData({ 'form.funcLayers': layers }, () => this.measureTables());
  },

  // 机械
  onMachineInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.machines[${idx}].${field}`]: e.detail.value });
  },
  addMachine() {
    const machines = this.data.form.machines;
    machines.push({ name: '', area: '', fuel: '', image: '', remark: '' });
    this.setData({ 'form.machines': machines });
  },
  // 删除机械
  deleteMachine(e) {
    const { idx } = e.currentTarget.dataset;
    const machines = this.data.form.machines;
    if (machines.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    machines.splice(idx, 1);
    this.setData({ 'form.machines': machines });
  },

  // 上传机械图片
  onUploadMachineImg(e) {
    const { idx } = e.currentTarget.dataset;
    const currentImage = this.data.form.machines[idx]?.image;
    if (currentImage) {
      wx.showActionSheet({
        itemList: ['预览图片', '重新上传', '删除图片'],
        success: (sheetRes) => {
          if (sheetRes.tapIndex === 0) {
            wx.previewImage({ urls: [currentImage], current: currentImage });
          } else if (sheetRes.tapIndex === 1) {
            this.chooseAndUploadMachineImg(idx);
          } else if (sheetRes.tapIndex === 2) {
            this.setData({ [`form.machines[${idx}].image`]: '' });
          }
        }
      });
      return;
    }
    this.chooseAndUploadMachineImg(idx);
  },

  chooseAndUploadMachineImg(idx) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        wx.showLoading({ title: '上传中...', mask: true });
        compressLocalImage(tempFilePath)
          .then((compressedPath) => uploadImage(compressedPath, 'construction-log', `machine-${idx}`))
          .then((imageUrl) => {
            this.setData({ [`form.machines[${idx}].image`]: imageUrl });
            wx.showToast({ title: '上传成功', icon: 'success' });
          })
          .catch((err) => {
            console.error('上传图片失败', err);
            wx.showToast({ title: '上传失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      }
    });
  },

  // 材料
  onMaterialInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.materials[${idx}].${field}`]: e.detail.value });
  },
  addMaterial() {
    const materials = this.data.form.materials;
    materials.push({ name: '', dayQty: '', totalQty: '', remark: '' });
    this.setData({ 'form.materials': materials });
  },
  // 删除材料
  deleteMaterial(e) {
    const { idx } = e.currentTarget.dataset;
    const materials = this.data.form.materials;
    if (materials.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    materials.splice(idx, 1);
    this.setData({ 'form.materials': materials });
  },

  // 人员
  onWorkerInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ [`form.workers[${idx}].${field}`]: e.detail.value });
  },
  addWorker() {
    const workers = this.data.form.workers;
    workers.push({ name: '', team: '' });
    this.setData({ 'form.workers': workers });
  },
  deleteWorker(e) {
    const { idx } = e.currentTarget.dataset;
    const workers = this.data.form.workers;
    if (workers.length <= 1) {
      wx.showToast({ title: '至少保留一行', icon: 'none' });
      return;
    }
    workers.splice(idx, 1);
    this.setData({ 'form.workers': workers });
  },

  // ===== 施工照片上传 =====
  addPhoto() {
    const remain = 9 - (this.data.form.photos || []).length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const temps = res.tempFilePaths || [];
        if (!temps.length) return;
        const photos = this.data.form.photos || [];
        const start = photos.length;
        // 先用本地临时图占位并立刻显示，不用等服务器返回
        this.setData({ 'form.photos': photos.concat(temps) });
        wx.showLoading({ title: '上传中 0%', mask: true });
        let lastPercent = 0;
        uploadImages(temps, 'construction-log', 'photo', {
          onProgress: (percent) => {
            if (percent - lastPercent < 5 && percent < 100) return;
            lastPercent = percent;
            wx.showLoading({ title: `上传中 ${percent}%`, mask: true });
          }
        })
          .then((photoUrls) => {
            const nextPhotos = [...this.data.form.photos];
            temps.forEach((_, index) => {
              nextPhotos[start + index] = photoUrls[index];
            });
            wx.hideLoading();
            this.setData({ 'form.photos': nextPhotos });
            wx.showToast({ title: '上传成功', icon: 'success' });
          })
          .catch((err) => {
            console.error('上传照片失败', err);
            const nextPhotos = this.data.form.photos.filter((item) => temps.indexOf(item) === -1);
            wx.hideLoading();
            this.setData({ 'form.photos': nextPhotos });
            wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          });
      }
    });
  },

  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const list = [...(this.data.form.photos || [])];
    list.splice(index, 1);
    this.setData({ 'form.photos': list });
  },

  previewPhoto(e) {
    const url = e.currentTarget.dataset.src;
    const urls = this.data.form.photos || [];
    if (url) wx.previewImage({ urls, current: url });
  },

  // ===== 附件上传（Excel / Word / PDF） =====
  addAttachment() {
    const remain = 9 - (this.data.form.attachments || []).length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9个附件', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: remain,
      type: 'file',
      extension: ['xls', 'xlsx', 'doc', 'docx', 'pdf'],
      success: (res) => {
        const files = (res.tempFiles || []).filter((file) => this.isSupportedAttachment(file.name || file.path));
        if (!files.length) {
          wx.showToast({ title: '仅支持 Excel/Word/PDF', icon: 'none' });
          return;
        }
        const list = (this.data.form.attachments || []).concat(files.map((file) => this.normalizeAttachment(file)));
        this.setData({ 'form.attachments': list });
        wx.showToast({ title: '已添加附件', icon: 'success' });
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          console.error('选择附件失败', err);
          wx.showToast({ title: '选择附件失败', icon: 'none' });
        }
      }
    });
  },

  isSupportedAttachment(name) {
    return ['xls', 'xlsx', 'doc', 'docx', 'pdf'].indexOf(this.getFileExt(name)) > -1;
  },

  getFileExt(name) {
    const text = String(name || '');
    return text.indexOf('.') > -1 ? text.split('.').pop().toLowerCase() : '';
  },

  normalizeAttachment(file = {}) {
    const name = file.name || this.getFileNameFromPath(file.path) || '附件';
    const ext = this.getFileExt(name);
    return {
      name,
      ext,
      size: file.size || 0,
      sizeText: this.formatFileSize(file.size || 0),
      type: this.mapOpenFileType(ext),
      path: file.path || ''
    };
  },

  getFileNameFromPath(path) {
    const text = String(path || '');
    if (!text) return '';
    return text.split('/').pop() || text;
  },

  formatFileSize(size) {
    const bytes = Number(size) || 0;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  },

  mapOpenFileType(ext) {
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'].indexOf(ext) > -1 ? ext : 'pdf';
  },

  deleteAttachment(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = [...(this.data.form.attachments || [])];
    list.splice(index, 1);
    this.setData({ 'form.attachments': list });
  },

  openAttachment(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = (this.data.form.attachments || [])[index];
    if (!item || !item.path) {
      wx.showToast({ title: '附件暂无法打开', icon: 'none' });
      return;
    }
    wx.openDocument({
      filePath: item.path,
      fileType: item.type || this.mapOpenFileType(item.ext),
      showMenu: true,
      fail: () => wx.showToast({ title: '无法打开该附件', icon: 'none' })
    });
  },

  // 查看施工记录
  goToRecord() {
    wx.navigateTo({ url: '/pages/construction-log-record/construction-log-record' })
  },

  // 暂存草稿
  saveDraft() {
    wx.setStorageSync('construction_log_draft', { ...this.data.form, saveTime: new Date().toISOString() });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  // 提交
  async submitForm() {
    const form = this.data.form;
    if (!form.projectName) {
      wx.showToast({ title: '请填写项目名称', icon: 'none' }); return;
    }
    if (!form.roadSection) {
      wx.showToast({ title: '请填写施工路段', icon: 'none' }); return;
    }
    if (!form.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' }); return;
    }
    if (!form.weather) {
      wx.showToast({ title: '请选择天气', icon: 'none' }); return;
    }
    if (!form.recorder) {
      wx.showToast({ title: '请填写记录人', icon: 'none' }); return;
    }
    const approvalFields = await this.prepareApprovalFields('construction_log');
    if (!approvalFields) return;

    // 申请订阅消息授权：用于接收「审批结果通知」（授权失败不影响提交）
    await requestSubscribe('result');

    wx.showModal({
      title: this.data.editMode ? '确认修改' : '确认提交',
      content: this.data.editMode
        ? '修改后将重新提交为待审批状态，确认提交？'
        : '确认提交施工日志？',
      success: (res) => {
        if (res.confirm) {
          this.doCloudSubmit(form, approvalFields);
        }
      }
    });
  },

  // 云开发提交
  doCloudSubmit(form, approvalFields = {}) {
    wx.showLoading({ title: '提交中...', mask: true });
    const db = wx.cloud.database();
    const openid = currentOpenid();
    const userInfo = wx.getStorageSync('userInfo') || {};
    const submitterName = userInfo.name || userInfo.nickName || form.recorder || '微信用户';
    const logData = {
      ...form,
      status: 'pending', // pending=待审批, approved=已通过, rejected=已拒绝
      approvalStatus: 'pending',
      ...approvalFields,
      submitterOpenid: openid,  // 保存提交人openid
      submitterName,
      submitter: submitterName,
      submitTime: db.serverDate(),
      approvalTime: null,
      approvalRemark: '',
      deletedBy: '',
      deletedTime: '',
      deleteReason: ''
    };
    if (!this.data.editMode) {
      logData.createTime = db.serverDate();
    }
    if (this.data.editMode && this.data.editingId) {
      db.collection('construction_log').doc(this.data.editingId).update({
        data: logData,
        success: () => {
          wx.hideLoading();
          wx.showToast({ title: '修改已提交', icon: 'success' });
          delayedSafeBack('/pages/index/index');
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('修改失败', err);
          wx.showToast({ title: formatErrorMessage(err, '修改失败'), icon: 'none' });
        }
      });
      return;
    }
    db.collection('construction_log').add({
      data: logData,
      success: () => {
        wx.hideLoading();
        wx.removeStorageSync('construction_log_draft');
        wx.showToast({ title: '提交成功', icon: 'success' });
        delayedSafeBack('/pages/index/index');
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: formatErrorMessage(err), icon: 'none' });
      }
    });
  }
});
