function currentOpenid() {
  const app = typeof getApp === 'function' ? getApp() : null;
  const userInfo = app?.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
  return userInfo.openid || wx.getStorageSync('openid') || '';
}

function collectOpenidsFromList(list = []) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.openid || item.approverOpenid || item.userId || item._id || item.id || '';
  }).filter(Boolean);
}

function legacyOpenids(record = {}) {
  return [
    record.submitterOpenid,
    record.approverOpenid,
    ...collectOpenidsFromList(record.currentApprovers),
    ...collectOpenidsFromList(record.approvalHistory),
    ...collectOpenidsFromList(record.visibleUsers || record.extraVisibleUsers),
    ...collectTraceParticipants(record.participants)
  ].filter(Boolean);
}

function isVisibleOnlyParticipant(item = {}) {
  const role = String(item.role || '');
  const action = String(item.action || '');
  return role === '参与人' || role === '额外可见人' || action === 'visible';
}

function collectTraceParticipants(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && typeof item === 'object' && !isVisibleOnlyParticipant(item))
    .map(item => item.openid || item.approverOpenid || item.userId || item._id || item.id || '')
    .filter(Boolean);
}

function canViewRecord(record = {}) {
  const visibleOpenids = legacyOpenids(record);
  if (!visibleOpenids.length) return true;
  const openid = currentOpenid();
  return Boolean(openid && visibleOpenids.includes(openid));
}

function filterVisibleRecords(records = []) {
  return records.filter(canViewRecord);
}

module.exports = {
  canViewRecord,
  filterVisibleRecords,
  currentOpenid
};
