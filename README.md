# URL 管理器

基于 Cloudflare Workers 的 URL 和 URL Scheme 管理工具。可以方便地保存和管理常用的 URL 链接以及 URL Scheme。

## 功能特点

- 支持同时管理多个 URL 和 URL Scheme
- 使用 Cloudflare KV 存储数据，永久保存
- 支持为每个链接添加描述信息
- 一键打开保存的链接
- 自动处理 URL 格式（自动添加 https:// 前缀）
- 支持移动端响应式布局

## 使用方法

1. 访问地址：cf dev地址
2. URL 链接管理：
   - 输入 URL 描述和地址
   - 点击"保存"按钮保存
   - 点击"跳转"按钮在新标签页打开链接
3. URL Scheme 管理：
   - 输入 Scheme 描述和地址
   - 点击"保存"按钮保存
   - 点击"跳转"按钮直接打开应用

## 部署说明
环境变量设置，变量名TOKEN
绑定kv空间