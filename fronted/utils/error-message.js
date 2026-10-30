function formatErrorMessage(err, fallback = '提交失败') {
  if (!err) return fallback;
  const raw = err.message || err.errMsg || err.msg || '';
  const text = String(raw).trim();
  if (!text) return fallback;
  if (text.includes('HTTP 401')) return '请先登录';
  if (text.includes('HTTP 403')) return '无权限操作';
  if (text.includes('HTTP 404')) return '记录不存在';
  return text.slice(0, 30);
}

module.exports = {
  formatErrorMessage
};
