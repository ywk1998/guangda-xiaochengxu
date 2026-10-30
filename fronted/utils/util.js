// utils/util.js - 通用工具函数

/**
 * 格式化日期
 * @param {string|Date} date
 * @param {string} fmt
 */
function formatDate(date, fmt = 'YYYY-MM-DD') {
  if (!date) return '';
  const d = parseDate(date);
  if (!d) return '';
  const map = {
    'YYYY': d.getFullYear(),
    'MM':   String(d.getMonth() + 1).padStart(2, '0'),
    'DD':   String(d.getDate()).padStart(2, '0'),
    'HH':   String(d.getHours()).padStart(2, '0'),
    'mm':   String(d.getMinutes()).padStart(2, '0'),
    'ss':   String(d.getSeconds()).padStart(2, '0')
  };
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (key) => map[key]);
}

function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  if (typeof date === 'object' && date.$date) return parseDate(date.$date);
  if (typeof date === 'object' && date.toDate) return parseDate(date.toDate());

  let value = date;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    value = trimmed.replace(/^(\d{4})-(\d{2})-(\d{2})\s+/, '$1-$2-$3T');
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(date) {
  return formatDate(date, 'YYYY-MM-DD HH:mm') || '-';
}

function getTimeValue(date) {
  const d = parseDate(date);
  return d ? d.getTime() : 0;
}

/**
 * 手机号脱敏
 */
function maskPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
function throttle(fn, interval = 500) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 复制文本到剪贴板
 */
function copyText(text) {
  wx.setClipboardData({
    data: text,
    success: () => wx.showToast({ title: '已复制', icon: 'success' })
  });
}

/**
 * 拨打电话
 */
function makeCall(phone) {
  wx.makePhoneCall({ phoneNumber: phone });
}

/**
 * 显示 loading
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏 loading
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 成功提示
 */
function showSuccess(title = '操作成功') {
  wx.showToast({ title, icon: 'success' });
}

/**
 * 错误提示
 */
function showError(title = '操作失败') {
  wx.showToast({ title, icon: 'none' });
}

module.exports = {
  formatDate,
  formatDateTime,
  getTimeValue,
  parseDate,
  maskPhone,
  debounce,
  throttle,
  copyText,
  makeCall,
  showLoading,
  hideLoading,
  showSuccess,
  showError
};
