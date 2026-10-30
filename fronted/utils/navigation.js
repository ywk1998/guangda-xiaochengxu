function safeNavigateBack(fallbackUrl = '/pages/index/index') {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  if (pages.length > 1) {
    wx.navigateBack();
    return;
  }
  wx.reLaunch({ url: fallbackUrl });
}

function delayedSafeBack(fallbackUrl, delay = 1500) {
  setTimeout(() => safeNavigateBack(fallbackUrl), delay);
}

module.exports = {
  delayedSafeBack,
  safeNavigateBack
};
