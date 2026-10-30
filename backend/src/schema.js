const commonBusinessFields = [
  'createTime',
  'updateTime',
  'submitTime',
  'submitterOpenid',
  'submitterName',
  'submitter',
  'approvalStatus',
  'status',
  'approver',
  'approverName',
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
  'visibleUsers',
  'participants',
  'participantOpenids',
  'deletedBy',
  'deletedTime',
  'deleteReason'
];

export const collectionFieldSchemas = {
  construction_log: [
    ...commonBusinessFields,
    'projectName',
    'roadSection',
    'date',
    'weather',
    'recorder',
    'approverOpenid',
    'approverName',
    'shuiwenLayers',
    'structureLayers',
    'funcLayers',
    'totalArea',
    'contractTotal',
    'machines',
    'machineNote',
    'materials',
    'materialNote',
    'photos',
    'attachments',
    'safetyEdu',
    'safetyEduContent',
    'personalProtection',
    'trafficGuide',
    'envProtect',
    'hazardFound',
    'hazardFixed',
    'hazardUnfixed',
    'workers',
    'tomorrowPlan'
  ],
  output_record: [
    ...commonBusinessFields,
    'date',
    'category',
    'station',
    'projectName',
    'materialList',
    'totalWeight',
    'unit',
    'water',
    'electricity',
    'coal',
    'naturalGas',
    'otherConsumables',
    'remark'
  ],
  diesel_entry: [
    ...commonBusinessFields,
    'date',
    'station',
    'plateNumber',
    'volume',
    'price',
    'tankNumber',
    'handler',
    'image',
    'remark',
    'totalAmount'
  ],
  diesel_out: [
    ...commonBusinessFields,
    'date',
    'station',
    'tankNumber',
    'type',
    'equipment',
    'volume',
    'driver',
    'image',
    'remark'
  ],
  diesel_delivery: [
    ...commonBusinessFields,
    'date',
    'plateNumber',
    'projectLocation',
    'driver',
    'remark',
    'equipmentList',
    'totalVolume'
  ],
  TJform: [
    ...commonBusinessFields,
    'stationName',
    'productName',
    'OldPrice',
    'NewPrice',
    'TJReason',
    'TJtime',
    'boardSyncedAt'
  ],
  construction_log_summary: [
    ...commonBusinessFields,
    'projectName',
    'date',
    'subList'
  ],
  equipment_maintenance: [
    ...commonBusinessFields,
    'equipmentName',
    'equipmentCode',
    'spec',
    'currentHours',
    'maintenanceDate',
    'maintenanceType',
    'manager',
    'maintenanceItems',
    'partsList',
    'photos',
    'remark'
  ],
  mixing_tower_maintenance: [
    ...commonBusinessFields,
    'stationName',
    'towerModel',
    'maintenanceDate',
    'maintenanceType',
    'manager',
    'maintenanceItems',
    'partsList',
    'photos',
    'remark'
  ],
  price_board: [
    ...commonBusinessFields,
    'stationName',
    'productName',
    'OldPrice',
    'NewPrice',
    'unit',
    'remark'
  ]
};

const collectionFieldSets = Object.fromEntries(
  Object.entries(collectionFieldSchemas).map(([collection, fields]) => [collection, new Set(fields)])
);

export function sanitizeCollectionData(collection, data) {
  const allowed = collectionFieldSets[collection];
  if (!allowed || !data || typeof data !== 'object' || Array.isArray(data)) return data;
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.has(key))
  );
}
