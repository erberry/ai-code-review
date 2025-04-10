# AI Code Review

AI Code Review 是一个Chrome浏览器扩展，它允许用户使用大语言模型对选中的代码进行评审。

## 功能特点

- 对选中的代码片段进行AI评审
- 支持上下文菜单操作
- 简洁直观的用户界面
- 可自定义API设置

## 安装指南

### 开发模式安装

1. 克隆或下载此仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的根目录

### 从Chrome商店安装（如已发布）

1. 访问Chrome网上应用店
2. 搜索"AI Code Review"
3. 点击"添加到Chrome"

## 使用方法

1. 在任意网页上选中代码片段
2. 右键点击，从上下文菜单中选择"AI代码评审"
3. 或者点击浏览器工具栏中的扩展图标，打开弹出窗口
4. 查看AI对所选代码的评审结果

## 配置设置

1. 点击扩展图标打开弹出窗口
2. 进入设置选项
3. 配置您的API密钥和其他相关设置
4. 保存设置

## 项目结构

chrome-code-review/

├── manifest.json        # 扩展配置文件

├── popup.html           # 弹出窗口HTML

├── popup.js             # 弹出窗口脚本

├── content.js           # 内容脚本

├── background.js        # 后台服务脚本

├── styles/              # CSS样式文件

└── images/              # 图标和图片资源


## 开发指南

### 环境设置

1. 确保您已安装最新版本的Chrome浏览器
2. 克隆仓库到本地：

git clone <仓库URL>
cd chrome-code-review


### 修改扩展

#### 修改UI

1. 编辑 `popup.html` 更改弹出窗口的HTML结构
2. 修改CSS文件自定义样式

#### 添加新功能

1. 在 `content.js` 中修改内容脚本以更改网页交互方式
2. 在 `background.js` 中添加新的后台功能
3. 更新 `popup.js` 以支持新的用户界面交互

#### 更新权限

如需添加新权限，请编辑 `manifest.json` 文件中的 "permissions" 数组。

### 调试扩展

1. 在Chrome扩展管理页面 (`chrome://extensions/`) 找到扩展
2. 点击"查看视图：背景页"以调试后台脚本
3. 右键点击扩展图标，选择"检查弹出内容"以调试弹出窗口
4. 使用Chrome开发者工具调试内容脚本

### 打包扩展

1. 在Chrome扩展管理页面点击"打包扩展程序"
2. 选择扩展目录和私钥文件（如果是更新现有扩展）
3. 生成的 `.crx` 文件可用于分发

## 贡献指南

1. Fork 此仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个Pull Request
