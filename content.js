// content.js
(function () {
  let isGitLabMergeRequestPage = false;
  let reviewPanel = null;
  let selectedCode = "";
  let selectionButton = null; // 添加选择按钮变量
  let isDarkMode = false; // 添加暗黑模式标志

  // 检查是否是GitLab MR页面
  function checkIfGitLabMRPage() {
    // 检查URL包含merge_requests或diffs
    return true;
    return window.location.href.includes('/merge_requests/') &&
      (window.location.href.includes('/diffs') ||
        document.querySelector('.diffs'));
  }

  // 检测是否为暗黑模式
  function detectDarkMode() {
    // 检查系统暗黑模式
    const systemDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 检查GitLab暗黑模式 (检查body上的类或其他暗黑模式指示器)
    const gitlabDarkMode = document.body.classList.contains('gl-dark') || 
                          document.body.classList.contains('dark-mode') ||
                          document.documentElement.classList.contains('dark-mode');
    
    return systemDarkMode || gitlabDarkMode;
  }

  // 创建选择按钮
  function createSelectionButton() {
    if (selectionButton) {
      return selectionButton;
    }

    selectionButton = document.createElement('div');
    selectionButton.className = 'gitlab-ai-selection-button hidden';
    selectionButton.innerHTML = `
      <button title="AI 代码评审">
        <img src="${chrome.runtime.getURL('images/icon16.png')}" alt="AI 代码评审" width="16" height="16">
      </button>
    `;

    document.body.appendChild(selectionButton);

    // 添加点击事件
    selectionButton.addEventListener('click', () => {
      reviewSelectedCode();
      hideSelectionButton();
    });

    return selectionButton;
  }

  // 显示选择按钮
  function showSelectionButton(x, y) {
    if (!selectionButton) {
      createSelectionButton();
    }

    selectionButton.style.left = `${x}px`;
    selectionButton.style.top = `${y}px`;
    selectionButton.classList.remove('hidden');
  }

  // 隐藏选择按钮
  function hideSelectionButton() {
    if (selectionButton) {
      selectionButton.classList.add('hidden');
    }
  }

  // 创建代码评审面板
  function createReviewPanel() {
    if (reviewPanel) {
      return reviewPanel;
    }

    reviewPanel = document.createElement('div');
    reviewPanel.className = 'gitlab-ai-review-panel hidden'; // 添加hidden类，初始隐藏面板
    
    // 添加暗黑模式类
    if (isDarkMode) {
      reviewPanel.classList.add('dark-mode');
    }
    
    reviewPanel.innerHTML = `
      <div class="review-header">
        <h3>AI 代码评审</h3>
        <div class="review-actions">
          <button class="refresh-btn" title="刷新评审">↻</button>
          <button class="close-btn" title="关闭">✕</button>
        </div>
      </div>
      <div class="review-content">
        <div class="loading hidden">
          <div class="spinner"></div>
          <p>正在分析代码...</p>
        </div>
        <div class="review-result"></div>
      </div>
    `;

    document.body.appendChild(reviewPanel);

    // 添加事件监听器
    reviewPanel.querySelector('.close-btn').addEventListener('click', () => {
      reviewPanel.classList.add('hidden');
    });

    reviewPanel.querySelector('.refresh-btn').addEventListener('click', () => {
      if (selectedCode) {
        reviewSelectedCode();
      }
    });

    return reviewPanel;
  }

  // 获取选中的代码
  function getSelectedCode() {
    const selection = window.getSelection();
    if (!selection.toString().trim()) {
      return "";
    }

    // 尝试扩展选择，获取完整的代码块
    let code = selection.toString();

    // 检查是否在代码视图中选择
    const codeElement = selection.anchorNode.parentElement.closest('.line_content, .code, pre, .diff-line');
    if (codeElement) {
      // 查找当前选择区域所在的diff-viewer元素
      const diffViewer = codeElement.closest('.diff-viewer');
      if (!diffViewer) {
        console.log("Selected code:", code);
        return code;
      }

      // 获取表格中的所有代码行
      const rows = diffViewer.querySelectorAll('table tbody tr.line_holder');

      // 直接使用数组存储行内容，不进行去重
      const lines = [];
      let insideSelection = false;

      // 遍历所有表格行
      for (const row of rows) {
        // 检查行是否在选择范围内
        const lineContent = row.querySelector('.line_content');

        // 特殊处理匹配行（上下文分隔符）
        if (row.classList.contains('match') && lineContent) {
          // 匹配行直接使用 lineContent 的文本内容
          if (selection.containsNode(lineContent, true)) {
            insideSelection = true;
            lines.push(lineContent.textContent.trim());
          }
          continue;
        }

        const lineSpan = lineContent ? lineContent.querySelector('.line') : null;

        if (!lineSpan) {
          continue;
        }

        // 判断是否在选择范围内
        if (selection.containsNode(lineSpan, true) || selection.containsNode(lineContent, true)) {
          insideSelection = true;

          // 获取行内容
          let lineText = lineSpan.textContent;

          // 获取行号
          let lineNumber = '';
          const oldLineNum = row.querySelector('.old_line a[data-linenumber]');
          const newLineNum = row.querySelector('.new_line a[data-linenumber]');

          // 确定是否是新增或删除的行
          const isNewLine = row.classList.contains('new') || lineContent.classList.contains('new_line');
          const isOldLine = row.classList.contains('old') || lineContent.classList.contains('old_line');

          // 添加前缀标记和行号
          if (isNewLine) {
            lineNumber = newLineNum ? newLineNum.getAttribute('data-linenumber') : '';
            lineText = "+ " + (lineNumber ? `[${lineNumber}] ` : '') + lineText;
          } else if (isOldLine) {
            lineNumber = oldLineNum ? oldLineNum.getAttribute('data-linenumber') : '';
            lineText = "- " + (lineNumber ? `[${lineNumber}] ` : '') + lineText;
          } else {
            // 对于上下文行，尝试获取任一行号
            lineNumber = (newLineNum || oldLineNum) ?
              (newLineNum ? newLineNum.getAttribute('data-linenumber') :
                oldLineNum.getAttribute('data-linenumber')) : '';
            if (lineNumber) {
              lineText = (lineNumber ? `[${lineNumber}] ` : '') + lineText;
            }
          }

          // 直接添加到数组中，不进行去重
          lines.push(lineText);
        } else if (insideSelection) {
          // 如果已经处理过选择范围内的行，并且当前行不在选择范围内，则结束遍历
          break;
        }
      }

      // 将收集到的行转换为代码字符串
      if (lines.length > 0) {
        code = lines.join('\n');
      }
    }

    console.log("Selected code:", code);
    return code;
  }

  // 使用LLM评审代码
  async function reviewCodeWithLLM(code) {
    try {
      // 从storage获取API密钥和模型
      const data = await new Promise(resolve => {
        chrome.storage.sync.get(['apiKey', 'model'], resolve);
      });

      if (!data.apiKey) {
        throw new Error("未设置API密钥，请在插件设置中配置");
      }

      // 判断使用哪个LLM API
      let apiUrl, headers, requestBody;

      let prompt = `您的任务是执行代码审查并提供专业的反馈。请遵循以下指南：

### 审查准则

- 理解上下文：意识到提供的代码可能不完整，某些变量、函数或方法可能未包含在审查范围内。
- 关注重点：特别注意已更改/新增的代码部分。
- 忽略静态分析问题：忽略那些可通过自动化代码检查工具轻易发现的问题（如格式、简单语法错误等）。
- 语言特定分析：识别代码的开发语言，并根据该语言的最佳实践和常见陷阱进行审查。
- 只关注重要问题：专注于以下关键领域的问题：
  * 潜在的错误或逻辑缺陷
  * 安全漏洞或数据保护问题
  * 性能瓶颈或优化机会
  * 代码可维护性与可扩展性问题
  * 边界情况和异常处理
  * 并发和资源管理问题
- 具体建议：提供明确、可操作的建议，而非笼统的评论。
- 简洁明了：保持反馈简洁而有针对性，避免冗长解释。
- 技术准确性：确保所有建议都技术准确且适用于特定编程语言和上下文。
- 注意复杂性：评估代码的复杂性是否合理，考虑是否有更简单的实现方式。
- 设计模式：适当情况下，建议合适的设计模式或架构改进。

### 输出格式

- 不提供表扬或正面评价。
- 仅当有改进建议时才提供评论，否则输出空。
- 使用Markdown格式编写评论，并添加行号。
- 重要：绝不建议添加代码注释，而是专注于代码本身的改进。
- 对于每个问题，明确说明：
  * 问题的严重程度（关键、高、中、低）
  * 问题的类型（bug、安全、性能、可维护性等）
  * 具体的改进建议
  * 如果适用，提供修正示例代码

### 审查深度

- 数据流分析：追踪输入如何在代码中流动和转换。
- 条件逻辑：检查条件语句是否覆盖所有可能的情况。
- 资源管理：识别是否正确释放资源（如文件句柄、数据库连接等）。
- 错误处理：确保适当处理异常和错误情况。
- 并发问题：检查多线程环境中的潜在问题（竞争条件、死锁等）。
- 安全实践：识别潜在的注入攻击、权限问题或敏感数据暴露。

### 重点：避免过多的输出
- 只输出问题验证程度为关键和高的问题

Git diff to review:

\`\`\`diff
${code}
\`\`\`
使用幽默地东北话并带点PUA风格进行回答，并使用Markdown格式输出。
`

      if (data.model && data.model.startsWith('claude')) {
        // Anthropic API
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': data.apiKey,
          'anthropic-version': '2023-06-01'
        };
        requestBody = {
          model: data.model || 'claude-3-7-sonnet-20250219',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            }
          ],
          temperature: 0.1
        };
      } else if (data.model && data.model.startsWith('qwen')) {
        // 通义千问 API (与OpenAI格式一致)
        apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`
        };
        requestBody = {
          model: data.model || 'qwen-max',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的代码审查助手，专注于提供有价值的代码审查意见。'
            },
            {
              role: 'user',
              content: prompt,
            }
          ],
          temperature: 0.1
        };
      } else {
        // 默认使用OpenAI API
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.apiKey}`
        };
        requestBody = {
          model: data.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的代码审查助手，专注于提供有价值的代码审查意见。'
            },
            {
              role: 'user',
              content: prompt,
            }
          ],
          temperature: 0.1
        };
      }

      // 通过 background.js 发送请求，避免 CORS 问题
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'apiRequest',
          data: {
            url: apiUrl,
            headers: headers,
            body: requestBody
          }
        }, response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response.success) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        });
      });

      // 提取回复内容
      let reviewContent;
      if (data.model && data.model.startsWith('claude')) {
        reviewContent = response.content[0].text;
      } else if (data.model && data.model.startsWith('qwen')) {
        reviewContent = response.choices[0].message.content;
      } else {
        reviewContent = response.choices[0].message.content;
      }

      return reviewContent;
    } catch (error) {
      console.error('代码评审错误:', error);
      return `评审失败: ${error.message}`;
    }
  }

  // 评审选中的代码
  async function reviewSelectedCode() {
    selectedCode = getSelectedCode();

    if (!selectedCode) {
      alert('请先选择要评审的代码');
      return;
    }

    // 确保评审面板已创建
    if (!reviewPanel) {
      createReviewPanel();
    }

    // 显示面板和加载状态
    reviewPanel.classList.remove('hidden');
    reviewPanel.querySelector('.loading').classList.remove('hidden');
    reviewPanel.querySelector('.review-result').innerHTML = '';

    // 进行代码评审
    const reviewResult = await reviewCodeWithLLM(selectedCode);
    console.log("reviewResult:", reviewResult);

    // 隐藏加载状态，显示结果
    reviewPanel.querySelector('.loading').classList.add('hidden');

    // 检查是否是错误消息
    if (reviewResult.startsWith('评审失败: 未设置API密钥')) {
      // 显示更友好的错误提示，包括设置指南
      reviewPanel.querySelector('.review-result').innerHTML = `
        <div class="error-message">
          <h3>⚠️ 未设置 API 密钥</h3>
          <p>请按照以下步骤配置您的 API 密钥：</p>
          <ol>
            <li>点击 Chrome 工具栏中的扩展图标</li>
            <li>在弹出的设置面板中，输入您的 OpenAI 或 Anthropic API 密钥</li>
            <li>选择您想使用的模型</li>
            <li>点击"保存设置"按钮</li>
          </ol>
          <p>配置完成后，请重新尝试评审代码。</p>
        </div>
      `;

      // 添加错误消息样式
      const errorStyle = document.createElement('style');
      errorStyle.textContent = `
        .error-message {
          background-color: #fff8f8;
          border-left: 4px solid #e74c3c;
          padding: 15px;
          border-radius: 4px;
        }
        .error-message h3 {
          color: #e74c3c;
          margin-top: 0;
        }
      `;
      document.head.appendChild(errorStyle);

      return;
    }

    // 处理嵌套代码块问题
    let processedResult = reviewResult;

    // 去除开头的 ```markdown 和结尾的 ``` 标记
    processedResult = processedResult.replace(/^```markdown\s*\n/, '').replace(/\n```\s*$/, '');
    processedResult = processedResult.replace(/^```\s*\n/, '').replace(/\n```\s*$/, ''); // 处理没有指定语言的情况

    // 替换嵌套的代码块标记，使用特殊标记避免冲突
    processedResult = processedResult.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
      // 将内部代码块的三个反引号替换为HTML标签
      return `<pre class="language-${language || 'plaintext'}"><code>${code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        }</code></pre>`;
    });

    // 不再使用 marked.js，直接使用增强的内置解析器
    const formattedResult = parseMarkdown(processedResult);
    reviewPanel.querySelector('.review-result').innerHTML = formattedResult;

    // 增强的 Markdown 解析函数
    function parseMarkdown(text) {
      return text
        // 段落
        .replace(/\n\n/g, '</p><p>')
        // 标题
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // 加粗和斜体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 列表
        .replace(/^\s*\n\* (.*)/gm, '<ul>\n<li>$1</li>')
        .replace(/^\s*\n- (.*)/gm, '<ul>\n<li>$1</li>')
        .replace(/^\* (.*)/gm, '<li>$1</li>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/^\s*\n\d+\. (.*)/gm, '<ol>\n<li>$1</li>')
        .replace(/^\d+\. (.*)/gm, '<li>$1</li>')
        .replace(/<\/ul>\s*\n<ul>/g, '')
        .replace(/<\/ol>\s*\n<ol>/g, '')
        .replace(/<\/li>\s*\n<\/ul>/g, '</li></ul>')
        .replace(/<\/li>\s*\n<\/ol>/g, '</li></ol>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // 代码块已经在前面处理过，这里不需要再处理
        // 行内代码
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 换行
        .replace(/\n/g, '<br>')
        // 包装在段落标签中
        .replace(/^(.+)$/, '<p>$1</p>');
    }
  }

  // 处理文本选择事件
  function handleTextSelection() {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
      // 获取选择区域的位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // 修改按钮位置，显示在选择区域的左侧而不是右侧
      const x = rect.left + window.scrollX - 20; // 向左偏移35px
      const y = rect.top + window.scrollY;

      showSelectionButton(x, y);
    } else {
      hideSelectionButton();
    }
  }

  // 添加右键菜单
  function createContextMenu() {
    chrome.runtime.sendMessage({ type: 'createContextMenu' });
  }

  // 添加快捷键处理程序
  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt+R 快捷键
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        reviewSelectedCode();
      }
    });
  }

  // 初始化
  function init() {
    isGitLabMergeRequestPage = checkIfGitLabMRPage();
    isDarkMode = detectDarkMode(); // 检测暗黑模式

    if (isGitLabMergeRequestPage) {
      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .gitlab-ai-review-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 350px;
          height: 100vh;
          background: white;
          color: #333;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        
        /* 暗黑模式样式 */
        .gitlab-ai-review-panel.dark-mode {
          background: #1f1f1f;
          color: #e0e0e0;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.5);
        }
        
        .gitlab-ai-review-panel.hidden {
          transform: translateX(100%);
        }
        
        .gitlab-ai-selection-button {
          position: absolute;
          z-index: 9998;
          transition: opacity 0.2s ease;
        }
        
        .gitlab-ai-selection-button.hidden {
          display: none;
        }
        
        .gitlab-ai-selection-button button {
          background: transparent;  /* 改为透明背景 */
          color: white;
          border: none;             /* 移除边框 */
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;               /* 移除内边距 */
          box-shadow: none;         /* 移除阴影 */
        }
        
        .gitlab-ai-selection-button button:hover {
          background: rgba(0, 0, 0, 0.1);  /* 悬停时显示轻微背景 */
        }
        
        .dark-mode .gitlab-ai-selection-button button:hover {
          background: rgba(255, 255, 255, 0.1);  /* 暗黑模式下悬停效果 */
        }
        
        .gitlab-ai-selection-button img {
          width: 24px;
          height: 24px;
        }
        
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #1f75cb;
          color: white;
          flex-shrink: 0;
        }
        
        .dark-mode .review-header {
          background: #0f3b66;  /* 暗黑模式下更深的蓝色 */
        }
        
        .review-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .review-actions {
          display: flex;
          gap: 8px;
        }
        
        .review-actions button {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        
        .review-actions button:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .review-content {
          padding: 16px;
          overflow-y: auto;
          flex-grow: 1;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          height: 100%;
        }
        
        .loading.hidden {
          display: none;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1f75cb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .dark-mode .spinner {
          border: 4px solid #333;
          border-top: 4px solid #1f75cb;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .review-result {
          line-height: 1.5;
          font-size: 14px;
        }
        
        .review-result pre {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
        }
        
        .dark-mode .review-result pre {
          background: #2a2a2a;
          color: #e0e0e0;
        }
        
        .review-result ul, .review-result ol {
          padding-left: 20px;
        }
        
        .dark-mode .review-result a {
          color: #6cb5ff;
        }
        
        .dark-mode .review-result code {
          background: #333;
          color: #f0f0f0;
        }
        
        .error-message {
          background-color: #fff8f8;
          border-left: 4px solid #e74c3c;
          padding: 15px;
          border-radius: 4px;
        }
        
        .dark-mode .error-message {
          background-color: #3a2a2a;
          border-left: 4px solid #e74c3c;
        }
        
        .error-message h3 {
          color: #e74c3c;
          margin-top: 0;
        }
      `;
      document.head.appendChild(style);

      // 创建评审面板，但不显示
      reviewPanel = createReviewPanel();

      // 创建选择按钮，但不显示
      selectionButton = createSelectionButton();

      // 监听文本选择事件
      document.addEventListener('mouseup', handleTextSelection);
      document.addEventListener('selectionchange', () => {
        // 延迟一点处理选择变化，确保选择已完成
        setTimeout(handleTextSelection, 10);
      });

      // 监听系统暗黑模式变化
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          updateDarkMode();
        });
      }

      // ... existing code ...
    }
  }

  // 更新暗黑模式
  function updateDarkMode() {
    const newDarkMode = detectDarkMode();
    if (newDarkMode !== isDarkMode) {
      isDarkMode = newDarkMode;
      if (reviewPanel) {
        if (isDarkMode) {
          reviewPanel.classList.add('dark-mode');
        } else {
          reviewPanel.classList.remove('dark-mode');
        }
      }
    }
  }

  // 使面板可拖动
  function makePanelDraggable() {
    let isDragging = false;
    let offsetX, offsetY;

    const header = reviewPanel.querySelector('.review-header');

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.review-actions')) {
        return;
      }

      isDragging = true;
      offsetX = e.clientX - reviewPanel.getBoundingClientRect().left;
      offsetY = e.clientY - reviewPanel.getBoundingClientRect().top;

      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      reviewPanel.style.left = `${Math.max(0, Math.min(window.innerWidth - reviewPanel.offsetWidth, x))}px`;
      reviewPanel.style.right = 'auto';
      reviewPanel.style.bottom = 'auto';
      reviewPanel.style.top = `${Math.max(0, Math.min(window.innerHeight - reviewPanel.offsetHeight, y))}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });

    header.style.cursor = 'grab';
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
