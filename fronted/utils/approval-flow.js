const db = wx.cloud.database();

function selectorState() {
  return {
    visible: false,
    title: '选择审批人',
    multiple: false,
    keyword: '',
    approvers: [],
    filteredApprovers: [],
    selected: {},
    selectedCount: 0
  };
}

function normalizeApprovers(list = []) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item) return null;
    if (typeof item === 'string') return { openid: item, name: item };
    const openid = item.openid || item.userId || item._id || item.id || '';
    const name = item.name || item.nickName || item.username || openid;
    return openid ? { openid, name } : null;
  }).filter(Boolean);
}

function normalizeApprovalLevels(levels = []) {
  if (!Array.isArray(levels)) return [];
  return levels.map(level => ({
    type: level.type === '联合审批' || level.type === 'joint' ? '联合审批' : '单人审批',
    approvers: normalizeApprovers(level.approvers || level.users || level.approvalUsers || [])
  })).filter(level => level.approvers.length);
}

function currentOpenid() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const userInfo = app?.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
  return userInfo.openid || wx.getStorageSync('openid') || '';
}

const approvalSelectorMethods = {
  loadApprovalFlow(collectionName = this.data.collectionName) {
    if (!collectionName) return Promise.resolve([]);
    return db.collection('form_registry')
      .where({ collectionName })
      .limit(1)
      .get()
      .then(res => {
        const setting = (res.data || [])[0] || {};
        const approvalFlow = normalizeApprovalLevels(setting.approvalLevels || []);
        const visibleUsers = normalizeApprovers(setting.visibleUsers || setting.extraVisibleUsers || []);
        this.setData({ approvalFlow, visibleUsers, approvalFlowLoaded: true });
        return approvalFlow;
      })
      .catch(err => {
        console.warn('加载审批流程失败', collectionName, err);
        this.setData({ approvalFlow: [], visibleUsers: [], approvalFlowLoaded: true });
        return [];
      });
  },

  chooseApproversFromLevel(level, title = '选择审批人') {
    const openid = currentOpenid();
    const approvers = normalizeApprovers(level?.approvers || [])
      .filter(user => !openid || user.openid !== openid);
    if (!approvers.length) {
      wx.showToast({ title: '没有其他审批人', icon: 'none' });
      return Promise.resolve([]);
    }
    const multiple = (level?.type || '单人审批') === '联合审批';
    return new Promise(resolve => {
      this.approvalSelectorResolve = resolve;
      const list = approvers.map(item => ({ ...item, checked: false }));
      this.setData({
        approvalSelector: {
          ...selectorState(),
          visible: true,
          title,
          multiple,
          approvers: list,
          filteredApprovers: list
        }
      });
    });
  },

  async prepareApprovalFields(collectionName = this.data.collectionName) {
    const app = typeof getApp === 'function' ? getApp() : null;
    const token = wx.getStorageSync('token');
    if (!token || !currentOpenid()) {
      if (app?.checkLogin) await app.checkLogin();
      else wx.showToast({ title: '请先登录', icon: 'none' });
      return null;
    }
    let approvalFlow = this.data.approvalFlow || [];
    if (!this.data.approvalFlowLoaded) {
      wx.showLoading({ title: '读取审批流程...', mask: true });
      approvalFlow = await this.loadApprovalFlow(collectionName);
      wx.hideLoading();
    }
    const firstLevel = approvalFlow[0];
    let currentApprovers = [];
    if (firstLevel) {
      currentApprovers = await this.chooseApproversFromLevel(firstLevel);
      if (!currentApprovers.length) {
        wx.showToast({ title: '请选择审批人', icon: 'none' });
        return null;
      }
    }
    return {
      approvalFlowSnapshot: approvalFlow,
      visibleUsers: this.data.visibleUsers || [],
      participants: (this.data.visibleUsers || []).map(item => ({
        ...item,
        role: '额外可见人',
        action: 'visible'
      })),
      currentApprovalStep: 0,
      currentApprovalType: firstLevel?.type || '单人审批',
      currentApprovers,
      currentApproverOpenids: currentApprovers.map(item => item.openid),
      currentApproverNames: currentApprovers.map(item => item.name),
      approvalStatusText: currentApprovers.length ? `待${currentApprovers.map(item => item.name).join('、')}审批` : '待审批'
    };
  },

  updateApprovalSelectorFilter() {
    const selector = this.data.approvalSelector || selectorState();
    const keyword = String(selector.keyword || '').trim().toLowerCase();
    const filteredApprovers = (selector.approvers || []).filter(item => {
      const text = `${item.name || ''}${item.openid || ''}`.toLowerCase();
      return !keyword || text.includes(keyword);
    });
    this.setData({ 'approvalSelector.filteredApprovers': filteredApprovers });
  },

  onApprovalSelectorSearch(e) {
    this.setData({ 'approvalSelector.keyword': e.detail.value || '' }, () => this.updateApprovalSelectorFilter());
  },

  toggleApprovalSelectorUser(e) {
    const openid = e.currentTarget.dataset.openid;
    const selector = this.data.approvalSelector || selectorState();
    let selected = { ...(selector.selected || {}) };
    if (selector.multiple) {
      if (selected[openid]) delete selected[openid];
      else selected[openid] = true;
    } else {
      selected = selected[openid] ? {} : { [openid]: true };
    }
    const approvers = (selector.approvers || []).map(item => ({ ...item, checked: Boolean(selected[item.openid]) }));
    const filteredApprovers = (selector.filteredApprovers || []).map(item => ({ ...item, checked: Boolean(selected[item.openid]) }));
    this.setData({
      'approvalSelector.selected': selected,
      'approvalSelector.selectedCount': Object.keys(selected).length,
      'approvalSelector.approvers': approvers,
      'approvalSelector.filteredApprovers': filteredApprovers
    });
  },

  closeApprovalSelector() {
    if (this.approvalSelectorResolve) {
      this.approvalSelectorResolve([]);
      this.approvalSelectorResolve = null;
    }
    this.setData({ approvalSelector: selectorState() });
  },

  confirmApprovalSelector() {
    const selector = this.data.approvalSelector || selectorState();
    const selectedApprovers = (selector.approvers || []).filter(item => selector.selected?.[item.openid]);
    if (!selectedApprovers.length) {
      wx.showToast({ title: '请选择审批人', icon: 'none' });
      return;
    }
    if (this.approvalSelectorResolve) {
      this.approvalSelectorResolve(selector.multiple ? selectedApprovers : [selectedApprovers[0]]);
      this.approvalSelectorResolve = null;
    }
    this.setData({ approvalSelector: selectorState() });
  }
};

module.exports = {
  selectorState,
  normalizeApprovers,
  normalizeApprovalLevels,
  approvalSelectorMethods
};
