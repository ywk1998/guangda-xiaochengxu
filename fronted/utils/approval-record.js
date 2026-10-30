const { formatDateTime } = require('./util');

function normalizePeople(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item || typeof item !== 'object') return null;
    const openid = item.openid || item.approverOpenid || item.userOpenid || '';
    const name = item.name || item.approverName || item.username || item.nickName || openid;
    return name || openid ? { ...item, openid, name } : null;
  }).filter(Boolean);
}

function formatApprovalType(type) {
  if (type === '联合审批' || type === 'joint') return '联合审批';
  if (type === '单人审批' || type === 'single') return '单人审批';
  return '审批';
}

function avatarText(name = '') {
  const text = String(name || '').trim();
  return text ? text.slice(-2) : '审';
}

function isOpenidDisplayName(name, openid) {
  const text = String(name || '').trim();
  if (!text) return true;
  return text === openid || /^user-\d+/i.test(text);
}

function buildApprovalTimeline(data = {}, submitTimeStr = '') {
  const createTime = submitTimeStr || formatDateTime(data.createTime || data.submitTime);
  const nodes = [{
    key: 'submit',
    stage: '提交',
    statusText: '提交',
    statusClass: 'submit',
    dotText: '✓',
    title: data.submitterName || data.submitter || '提交人',
    subtitle: '发起审批',
    remark: '',
    time: createTime,
    avatar: avatarText(data.submitterName || data.submitter || '提交')
  }];

  const history = Array.isArray(data.approvalHistory) ? data.approvalHistory : [];
  history.forEach((item, index) => {
    const action = item.action === 'reject' ? 'reject' : 'approve';
    const name = item.approverName || item.name || item.username || '审批人';
    nodes.push({
      key: `history-${index}`,
      stage: `第${Number(item.stepIndex || 0) + 1}级`,
      statusText: action === 'reject' ? '拒绝' : '同意',
      statusClass: action === 'reject' ? 'reject' : 'approve',
      dotText: action === 'reject' ? '×' : '✓',
      title: name,
      subtitle: formatApprovalType(item.type),
      remark: item.remark || (action === 'reject' ? '已拒绝' : '同意'),
      time: formatDateTime(item.time || item.approvalTime),
      avatar: avatarText(name)
    });
  });

  if ((data.approvalStatus || data.status) === 'pending') {
    const approvers = normalizePeople(data.currentApprovers);
    const names = approvers.map(item => item.name).filter(Boolean);
    nodes.push({
      key: 'pending',
      stage: `第${Number(data.currentApprovalStep || 0) + 1}级`,
      statusText: '待审批',
      statusClass: 'pending',
      dotText: '…',
      title: names.join('、') || data.approvalStatusText || '待审批',
      subtitle: formatApprovalType(data.currentApprovalType),
      remark: data.approvalStatusText || '等待审批',
      time: '',
      avatar: '待'
    });
  }

  return nodes.map((node, index) => ({
    ...node,
    isLast: index === nodes.length - 1
  }));
}

function patchPeopleNames(list, nameMap) {
  if (!Array.isArray(list)) return list;
  return list.map(item => {
    if (!item || typeof item !== 'object') return item;
    const openid = item.openid || item.approverOpenid || item.userOpenid || '';
    const name = nameMap[openid];
    if (!openid || !name) return item;
    return {
      ...item,
      name: item.name && !isOpenidDisplayName(item.name, openid) ? item.name : name,
      approverName: item.approverName && !isOpenidDisplayName(item.approverName, openid) ? item.approverName : name
    };
  });
}

function collectUnknownNameOpenids(record = {}) {
  const openids = [];
  const collect = list => {
    normalizePeople(list).forEach(item => {
      if (item.openid && isOpenidDisplayName(item.name, item.openid)) {
        openids.push(item.openid);
      }
    });
  };
  collect(record.currentApprovers);
  collect(record.approvalHistory);
  if (record.approverOpenid && isOpenidDisplayName(record.approverName || record.approver, record.approverOpenid)) {
    openids.push(record.approverOpenid);
  }
  return openids;
}

function normalizeApprovalTimelineRecord(record = {}, submitTimeStr = '') {
  return {
    ...record,
    approvalTimeline: buildApprovalTimeline(record, submitTimeStr || record.submitTimeStr)
  };
}

async function enrichApprovalTimelineRecords(records = []) {
  const list = Array.isArray(records) ? records : [records];
  const unknownOpenids = Array.from(new Set(list.reduce((all, record) => (
    all.concat(collectUnknownNameOpenids(record))
  ), [])));

  if (!unknownOpenids.length) return records;

  try {
    const db = wx.cloud.database();
    const _ = db.command;
    const res = await db.collection('users')
      .where({ openid: _.in(unknownOpenids) })
      .limit(100)
      .get();
    const nameMap = {};
    (res.data || []).forEach(user => {
      if (!user.openid) return;
      const name = user.name || user.username || user.nickName || '';
      if (name) nameMap[user.openid] = name;
    });
    if (!Object.keys(nameMap).length) return records;

    const patched = list.map(record => {
      const next = {
        ...record,
        currentApprovers: patchPeopleNames(record.currentApprovers, nameMap),
        approvalHistory: patchPeopleNames(record.approvalHistory, nameMap)
      };
      return normalizeApprovalTimelineRecord(next, record.submitTimeStr);
    });
    return Array.isArray(records) ? patched : patched[0];
  } catch (err) {
    console.warn('补全审批人姓名失败', err);
    return records;
  }
}

module.exports = {
  buildApprovalTimeline,
  normalizeApprovalTimelineRecord,
  enrichApprovalTimelineRecords
};
