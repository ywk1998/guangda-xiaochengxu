# YD小程序2.0 — 广东远大集团

> 微信小程序 · 云开发 · 施工日志管理

---

## 📁 项目结构

```
demo3/
├── app.js                    # 全局入口（云开发、登录态、登录拦截）
├── app.json                  # 全局配置（15个页面路由、4个TabBar）
├── app.wxss                  # 全局样式
├── project.config.json       # AppID: wxd87120634eec9b45
│
├── pages/                    # 页面（15个）
│   ├── index/                # 🏠 首页（轮播图、公司简介、快捷入口）
│   ├── products/             # 📦 产品列表（分类筛选）
│   ├── product-detail/       # 🔍 产品详情（轮播图、特性、案例）
│   ├── contact/              # 📞 联系我们（地图、留言表单）
│   ├── profile/              # 👤 个人中心（登录、菜单）
│   ├── construction-log/     # 📝 施工日志填写（多表格、审批人选择）
│   ├── log-list/             # 📋 日志列表
│   ├── log-detail/           # 📄 日志详情
│   ├── mixing-stations/      # 🏭 搅拌站列表
│   ├── station-detail/       # 🏗️ 搅拌站详情
│   ├── output-list/          # 📊 产量统计列表
│   ├── output-detail/        # 📈 产量详情
│   ├── approval/             # ✅ 审批管理
│   ├── approval-detail/      # 📑 审批详情
│   └── approval-list/        # 📋 审批记录
│
├── utils/                    # 工具模块
│   ├── request.js            # 请求封装（Token注入、Mock数据）
│   └── util.js               # 通用工具函数
│
├── images/                   # 静态图片
│   ├── tab/                  # TabBar 图标
│   ├── banner/               # 轮播图
│   ├── stations/             # 搅拌站图片
│   ├── products/             # 产品图片
│   ├── equipment/            # 设备图片
│   ├── cases/                # 案例图片
│   └── logo.png              # 公司Logo
│
└── cloudfunctions/           # 仅保留设计文档（云函数已移除，数据读写统一走 Node 后端 /api）
    ├── 施工日志数据说明.md    # 施工日志提交方式和数据结构
    └── 用户权限与消息通知设计.md  # 角色权限与站内消息表设计
```

---

## 🚀 快速开始

1. 用**微信开发者工具**导入项目，选择 `fronted/` 目录
2. AppID: `wxd87120634eec9b45`；数据走 Node 后端（`app.js` 的 `baseUrl`，默认 `https://www.gdyd.top/api`），**不依赖云开发环境**
3. 本地调试请在「详情 → 本地设置」勾选「不校验合法域名」
4. 编译即可预览

---

## 📖 文档

| 文档 | 位置 | 内容 |
|------|------|------|
| 施工日志数据说明 | `cloudfunctions/施工日志数据说明.md` | 施工日志提交方式和数据结构 |
| 用户权限与消息通知设计 | `cloudfunctions/用户权限与消息通知设计.md` | 角色权限、站内消息表（notifications）设计 |

---

## 🎨 TabBar 配置

| 位置 | 页面 | 图标 |
|------|------|------|
| 1 | 首页 (index) | home.png |
| 2 | 产品 (products) | product.png |
| 3 | 联系 (contact) | contact.png |
| 4 | 我的 (profile) | profile.png |

---

## 🔑 核心功能

- **产品展示**：分类浏览、详情轮播、标杆客户案例
- **搅拌站管理**：站点列表、详情展示
- **施工日志**：多表格填写（水稳层/结构层/功能层/机械/材料/安全/人员）
- **审批流程**：提交→审批人审核→通过/拒绝→消息通知
- **产量统计**：按时间段、按站点统计产量
- **登录系统**：微信一键登录、自动登录拦截

---

## ⚠️ 注意事项

- 包大小限制 2MB，大图片需压缩或上传云存储
- 产品轮播图仅支持本地路径（`/images/...`），不支持 `cloud://` 路径
- 用户由管理员在云数据库 `users` 集合手动配置，不支持自主注册
- 云函数 `login` 尚未创建，审批页获取 openid 会回退到本地缓存

---

*最后更新：2026-04-22*
