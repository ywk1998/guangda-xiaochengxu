// utils/local-db.js - Node 后端模式下的 wx.cloud.database 兼容层

const SERVER_API_BASE_URL = 'https://www.gdyd.top/api';

function getBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.baseUrl) || SERVER_API_BASE_URL;
}

function request(path, method = 'GET', data) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    wx.request({
      url: getBaseUrl() + path,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && (body.code === 0 || body.code === 200)) {
          resolve(body.data);
        } else {
          reject(new Error(body.message || `HTTP ${res.statusCode}`));
        }
      },
      fail: reject
    });
  });
}

function buildQuery(params) {
  const parts = [];
  if (params.where && Object.keys(params.where).length) {
    parts.push(`where=${encodeURIComponent(JSON.stringify(params.where))}`);
  }
  if (params.orderBy) parts.push(`orderBy=${encodeURIComponent(params.orderBy)}`);
  if (params.order) parts.push(`order=${encodeURIComponent(params.order)}`);
  if (params.limit !== undefined) parts.push(`limit=${params.limit}`);
  if (params.skip !== undefined) parts.push(`skip=${params.skip}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function applyField(rows, fields) {
  if (!fields) return rows;
  const enabled = Object.keys(fields).filter(key => fields[key]);
  if (!enabled.length) return rows;
  return rows.map(row => {
    const next = { _id: row._id, id: row.id };
    enabled.forEach(key => {
      next[key] = row[key];
    });
    return next;
  });
}

class LocalQuery {
  constructor(collectionName, docId = '') {
    this.collectionName = collectionName;
    this.docId = docId;
    this.params = {};
  }

  where(where) {
    this.params.where = where || {};
    return this;
  }

  orderBy(field, order) {
    this.params.orderBy = field;
    this.params.order = order;
    return this;
  }

  field(fields) {
    this.params.fields = fields;
    return this;
  }

  skip(value) {
    this.params.skip = value;
    return this;
  }

  limit(value) {
    this.params.limit = value;
    return this;
  }

  async get(options) {
    try {
      if (this.docId) {
        const data = await request(`/collections/${this.collectionName}/${this.docId}`);
        const result = { data };
        if (options && options.success) options.success(result);
        if (options && options.complete) options.complete(result);
        return result;
      }
      const result = await request(`/collections/${this.collectionName}${buildQuery(this.params)}`);
      const data = applyField(result.data || [], this.params.fields);
      const response = { data, total: result.total || data.length };
      if (options && options.success) options.success(response);
      if (options && options.complete) options.complete(response);
      return response;
    } catch (err) {
      if (options && options.fail) options.fail(err);
      if (options && options.complete) options.complete(err);
      throw err;
    }
  }

  async add(options) {
    const data = options && options.data ? options.data : {};
    try {
      const doc = await request(`/collections/${this.collectionName}`, 'POST', data);
      const result = { _id: doc._id, id: doc._id, data: doc };
      if (options && options.success) options.success(result);
      if (options && options.complete) options.complete(result);
      return result;
    } catch (err) {
      if (options && options.fail) options.fail(err);
      if (options && options.complete) options.complete(err);
      throw err;
    }
  }

  async update(options) {
    const data = options && options.data ? options.data : {};
    try {
      if (this.docId) {
        const doc = await request(`/collections/${this.collectionName}/${this.docId}`, 'PUT', data);
        const result = { stats: { updated: 1 }, data: doc };
        if (options && options.success) options.success(result);
        if (options && options.complete) options.complete(result);
        return result;
      }
      const list = await request(`/collections/${this.collectionName}${buildQuery({ ...this.params, limit: 500 })}`);
      const docs = list.data || [];
      await Promise.all(docs.map(doc => request(`/collections/${this.collectionName}/${doc._id}`, 'PUT', data)));
      const result = { stats: { updated: docs.length } };
      if (options && options.success) options.success(result);
      if (options && options.complete) options.complete(result);
      return result;
    } catch (err) {
      if (options && options.fail) options.fail(err);
      if (options && options.complete) options.complete(err);
      throw err;
    }
  }

  async remove(options = {}) {
    try {
      const data = options.data || {};
      await request(`/collections/${this.collectionName}/${this.docId}`, 'DELETE', data);
      const result = { stats: { removed: 1 } };
      if (options.success) options.success(result);
      if (options.complete) options.complete(result);
      return result;
    } catch (err) {
      if (options.fail) options.fail(err);
      if (options.complete) options.complete(err);
      throw err;
    }
  }

  doc(id) {
    return new LocalQuery(this.collectionName, id);
  }
}

function createDatabase() {
  return {
    collection(name) {
      return new LocalQuery(name);
    },
    serverDate() {
      return new Date().toISOString();
    }
  };
}

function installLocalDatabase() {
  if (!wx.cloud) wx.cloud = {};
  wx.cloud.database = createDatabase;
  wx.cloud.uploadFile = function uploadFile(options = {}) {
    const app = typeof getApp === 'function' ? getApp() : null;
    const baseUrl = (app && app.globalData && app.globalData.baseUrl) || SERVER_API_BASE_URL;
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/upload/image`,
        filePath: options.filePath,
        name: 'file',
        formData: options.formData || {},
        success(res) {
          let body = {};
          try {
            body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data || {};
          } catch (err) {
            if (options.fail) options.fail(err);
            reject(err);
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 0) {
            const origin = baseUrl.replace(/\/api$/, '');
            const fileID = `${origin}${body.data.url}`;
            const result = { fileID, url: body.data.url, data: body.data };
            if (options.success) options.success(result);
            resolve(result);
          } else {
            const err = new Error(body.message || `HTTP ${res.statusCode}`);
            if (options.fail) options.fail(err);
            reject(err);
          }
        },
        fail(err) {
          if (options.fail) options.fail(err);
          reject(err);
        }
      });
    });
  };
  wx.cloud.callFunction = function callFunction(options = {}) {
    if (options.name === 'login') {
      const result = { result: { openid: wx.getStorageSync('openid') || 'local-openid' } };
      if (options.success) options.success(result);
      return Promise.resolve(result);
    }
    const err = new Error(`本地后端未实现云函数：${options.name}`);
    if (options.fail) options.fail(err);
    return Promise.reject(err);
  };
}

module.exports = { installLocalDatabase };
