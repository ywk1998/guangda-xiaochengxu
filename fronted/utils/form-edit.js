const { canViewRecord, currentOpenid } = require('./participants');

const approvalStatusValues = ['pending', 'approved', 'rejected', 'deleted'];

function isApprovalStatus(value) {
  return approvalStatusValues.includes(value);
}

function editableStatus(record = {}) {
  if (isApprovalStatus(record.approvalStatus) && record.approvalStatus !== 'pending') return record.approvalStatus;
  if (isApprovalStatus(record.status) && record.status !== 'pending') return record.status;
  if (isApprovalStatus(record.approvalStatus)) return record.approvalStatus;
  if (isApprovalStatus(record.status)) return record.status;
  return 'pending';
}

function canEditRecord(record = {}) {
  const status = editableStatus(record);
  if (status !== 'pending' && status !== 'rejected') return false;
  const openid = currentOpenid();
  return Boolean(openid && record.submitterOpenid && record.submitterOpenid === openid);
}

function isDeletedRecord(record = {}) {
  return editableStatus(record) === 'deleted';
}

function approvalStatusMeta(record = {}) {
  const status = editableStatus(record);
  const map = {
    pending: ['待审批', 'pending'],
    approved: ['已通过', 'approved'],
    rejected: ['已拒绝', 'rejected'],
    deleted: ['已删除', 'deleted']
  };
  return {
    status,
    label: status === 'pending' && record.approvalStatusText ? record.approvalStatusText : (map[status] || map.pending)[0],
    className: (map[status] || map.pending)[1]
  };
}

function stripSystemFields(record = {}) {
  const copy = { ...record };
  [
    '_id',
    'id',
    'collection',
    'status',
    'approvalStatus',
    'approvalTime',
    'approvalRemark',
    'approvalLevels',
    'approvalFlowSnapshot',
    'approvalHistory',
    'currentApprovalStep',
    'currentApprovalType',
    'currentApprovers',
    'currentApproverOpenids',
    'currentApproverNames',
    'approvalStatusText',
    'approverOpenid',
    'approver',
    'approverName',
    'participants',
    'participantOpenids',
    'submitTime',
    'createTime',
    'updateTime',
    'deletedBy',
    'deletedTime',
    'deleteReason'
  ].forEach(key => delete copy[key]);
  return copy;
}

function pendingPatch(db) {
  return {
    status: 'pending',
    approvalStatus: 'pending',
    approvalTime: null,
    approvalRemark: '',
    deletedBy: '',
    deletedTime: '',
    deleteReason: '',
    submitTime: db.serverDate()
  };
}

module.exports = {
  canEditRecord,
  editableStatus,
  approvalStatusMeta,
  isDeletedRecord,
  pendingPatch,
  stripSystemFields,
  canViewRecord
};
