const SERVER_API_BASE_URL = 'https://www.gdyd.top/api';

// 上传前压缩：宽度限制到 1280px（长边），画质 60 —— 单张通常能从 2MB 降到 200~400KB
const COMPRESS_WIDTH = 1280;
const COMPRESS_QUALITY = 60;
// 同时进行的 wx.uploadFile 数量（小程序并发有限，且过多会互相抢带宽导致失败）
const DEFAULT_CONCURRENCY = 3;

function getFileExt(filePath) {
  const cleanPath = String(filePath || '').split('?')[0];
  const ext = cleanPath.includes('.') ? cleanPath.split('.').pop() : '';
  return ext && ext.length <= 8 ? ext : 'jpg';
}

// 压缩单张本地图片；失败时回退用原图，保证上传不中断
function compressLocalImage(filePath) {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality: COMPRESS_QUALITY,
      compressedWidth: COMPRESS_WIDTH,
      success: (res) => resolve(res.tempFilePath || filePath),
      fail: () => resolve(filePath)
    });
  });
}

function uploadImage(filePath, cloudDir, prefix = 'image', onProgress) {
  return new Promise((resolve, reject) => {
    const ext = getFileExt(filePath);
    const app = typeof getApp === 'function' ? getApp() : null;
    if (app?.globalData?.useLocalBackend) {
      const baseUrl = app.globalData.baseUrl || SERVER_API_BASE_URL;
      const task = wx.uploadFile({
        url: `${baseUrl}/upload/image`,
        filePath,
        name: 'file',
        formData: { cloudDir, prefix },
        success(res) {
          let body = {};
          try {
            body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data || {};
          } catch (err) {
            reject(err);
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 0) {
            const origin = baseUrl.replace(/\/api$/, '');
            resolve(`${origin}${body.data.url}`);
          } else {
            reject(new Error(body.message || `HTTP ${res.statusCode}`));
          }
        },
        fail: reject
      });
      // 实时进度回调（0~100）
      if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
        task.onProgressUpdate((res) => onProgress(res && res.progress ? res.progress : 0));
      }
      return;
    }
    wx.cloud.uploadFile({
      cloudPath: `${cloudDir}/${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`,
      filePath,
      success: (res) => resolve(res.fileID || res.url || filePath),
      fail: reject
    });
  });
}

// 多张上传：先逐张压缩，再限制并发数量上传，并把整体进度回调出去
async function uploadImages(filePaths, cloudDir, prefix = 'image', options = {}) {
  const { concurrency = DEFAULT_CONCURRENCY, onProgress } = options || {};
  const list = filePaths || [];
  const total = list.length;
  if (!total) return [];

  const results = new Array(total);
  const progressList = new Array(total).fill(0);
  let cursor = 0;

  const emitProgress = () => {
    if (typeof onProgress !== 'function') return;
    const sum = progressList.reduce((acc, cur) => acc + cur, 0);
    const percent = Math.min(100, Math.floor(sum / total));
    onProgress(percent);
  };

  const worker = async () => {
    while (cursor < total) {
      const index = cursor;
      cursor += 1;
      const compressedPath = await compressLocalImage(list[index]);
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadImage(compressedPath, cloudDir, `${prefix}-${index}`, (progress) => {
        progressList[index] = progress;
        emitProgress();
      });
      progressList[index] = 100;
      emitProgress();
      results[index] = url;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
  return results;
}

module.exports = {
  uploadImage,
  uploadImages,
  compressLocalImage
};
