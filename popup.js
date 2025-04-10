// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // 加载保存的设置
  chrome.storage.sync.get(['apiKey', 'model', 'languageSpecific'], (data) => {
    if (data.apiKey) {
      document.getElementById('api-key').value = data.apiKey;
    }
    
    if (data.model) {
      document.getElementById('model-select').value = data.model;
    }
    
    if (data.languageSpecific !== undefined) {
      document.getElementById('language-specific').checked = data.languageSpecific;
    }
  });
  
  // 保存设置
  document.getElementById('save-settings').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key').value;
    const model = document.getElementById('model-select').value;
    const languageSpecific = document.getElementById('language-specific').checked;
    
    chrome.storage.sync.set({
      apiKey,
      model,
      languageSpecific
    }, () => {
      // 显示保存成功消息
      const saveBtn = document.getElementById('save-settings');
      const originalText = saveBtn.textContent;
      
      saveBtn.textContent = '已保存！';
      saveBtn.disabled = true;
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 1500);
    });
  });
  
  // 清除数据
  document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('确定要清除所有保存的数据吗？')) {
      chrome.storage.sync.clear(() => {
        document.getElementById('api-key').value = '';
        document.getElementById('model-select').value = 'gpt-4';
        document.getElementById('language-specific').checked = true;
      });
    }
  });
});
