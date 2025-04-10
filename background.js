// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitLab AI Code Review 扩展已安装');
});

// 创建右键菜单
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'createContextMenu') {
    chrome.contextMenus.create({
      id: 'reviewSelectedCode',
      title: 'AI 代码评审',
      contexts: ['selection']
    });
  }

  // 处理 API 请求
  if (message.type === 'apiRequest') {
    const { url, headers, body } = message.data;

    // 如果是 Anthropic API，添加特殊头部
    if (url.includes('anthropic.com')) {
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(`API错误: ${errorData.error?.message || JSON.stringify(errorData)}`);
          });
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道开放，以便异步响应
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'reviewSelectedCode') {
    chrome.tabs.sendMessage(tab.id, { type: 'reviewSelectedCode' });
  }
});
