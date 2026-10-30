// pages/approval-notifications/approval-notifications.js - 审批通知
const { formatDateTime } = require('../../utils/util')
const { currentOpenid } = require('../../utils/participants')

const db = wx.cloud.database()

Page({
  data: {
    notifications: [],
    totalCount: 0,
    loading: false
  },

  onLoad() {
    this.loadNotifications()
  },

  onPullDownRefresh() {
    this.loadNotifications().finally(() => wx.stopPullDownRefresh())
  },

  loadNotifications() {
    const openid = currentOpenid()
    if (!openid) {
      this.setData({ notifications: [], totalCount: 0 })
      return Promise.resolve()
    }

    this.setData({ loading: true })
    return db.collection('notifications')
      .where({ toOpenid: openid })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
      .then(res => {
        const notifications = (res.data || []).map(item => {
          const meta = this.notificationStatusMeta(item)
          return {
            ...item,
            statusClass: meta.className,
            statusLabel: meta.label,
            timeText: formatDateTime(item.createTime)
          }
        })
        this.setData({
          notifications,
          totalCount: res.total || notifications.length,
          loading: false
        })
        return this.markUnreadAsRead(notifications)
      })
      .catch(err => {
        console.error('加载审批通知失败', err)
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  notificationStatusMeta(item = {}) {
    if (item.type === 'approval_pending') return { className: 'pending', label: '待审批' }
    if (item.type === 'approval_rejected') return { className: 'rejected', label: '已拒绝' }
    if (item.type === 'approval_approved') return { className: 'approved', label: '已通过' }
    return item.isRead === 0 || item.isRead === '0' || item.isRead === false
      ? { className: 'pending', label: '未读' }
      : { className: 'approved', label: '已读' }
  },

  markUnreadAsRead(list) {
    const unread = (list || []).filter(item => item.isRead === 0 || item.isRead === '0' || item.isRead === false)
    if (!unread.length) return Promise.resolve()
    return Promise.all(unread.map(item => (
      db.collection('notifications').doc(item._id).update({
        data: {
          isRead: 1,
          readTime: db.serverDate()
        }
      }).catch(err => {
        console.warn('标记通知已读失败', err)
      })
    )))
  }
})
