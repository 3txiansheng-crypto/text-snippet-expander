// content.js — 极简文本替换引擎 v1.1
// 触发方式：输入 / 后跟关键词，按空格或回车触发
// 支持：Ctrl+Z 撤销 | 反馈动画 | 变量 {{date}} {{time}}

const TRIGGER = '/';
let snippets = {};

// 从 storage 加载 snippets
chrome.storage.local.get('snippets', (data) => {
  if (data.snippets) snippets = data.snippets;
});

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes) => {
  if (changes.snippets) {
    snippets = changes.snippets.newValue || {};
  }
});

// 解析变量
function resolveVariables(text) {
  const now = new Date();
  return text
    .replace(/\{\{date\}\}/g, now.toLocaleDateString('zh-CN'))
    .replace(/\{\{time\}\}/g, now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    .replace(/\{\{datetime\}\}/g, now.toLocaleString('zh-CN'))
    .replace(/\{\{year\}\}/g, now.getFullYear().toString())
    .replace(/\{\{month\}\}/g, (now.getMonth() + 1).toString().padStart(2, '0'))
    .replace(/\{\{day\}\}/g, now.getDate().toString().padStart(2, '0'));
}

// 反馈动画：输入框短暂闪蓝
function flashFeedback(el) {
  if (!el.style) return;
  const orig = el.style.boxShadow;
  el.style.transition = 'box-shadow 0.15s ease';
  el.style.boxShadow = '0 0 0 3px rgba(74,158,255,0.35)';
  setTimeout(() => {
    el.style.boxShadow = orig;
    setTimeout(() => { el.style.transition = ''; }, 200);
  }, 250);
}

// 核心：找到输入框中光标前的触发词
function findTrigger(text, cursorPos) {
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === TRIGGER) {
      const key = text.slice(i + 1, cursorPos);
      if (key && snippets[key]) {
        return { start: i, key, replacement: resolveVariables(snippets[key]) };
      }
      return null;
    }
    if (text[i] === ' ' || text[i] === '\n') return null;
  }
  return null;
}

function handleInput(e) {
  const el = e.target;
  if (!el.isContentEditable && el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return;
  if (el.readOnly) return;

  const text = el.value !== undefined ? el.value : el.textContent;
  const cursorPos = el.selectionStart !== undefined ? el.selectionStart : text.length;

  const match = findTrigger(text, cursorPos);
  if (!match) return;

  // === 处理 <input> 和 <textarea>（原生支持撤销）===
  if (el.value !== undefined) {
    el.focus();
    el.setSelectionRange(match.start, cursorPos);       // 选中 /关键词
    el.setRangeText(match.replacement, match.start, cursorPos, 'end'); // 替换（可撤销）
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // === 处理 contentEditable（用 execCommand 实现撤销）===
  else {
    el.focus();
    // 用 TreeWalker 找到 / 符号对应的文本节点位置
    const sel = window.getSelection();
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let currentPos = 0;
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.textContent.length;
      if (startNode === null && currentPos + len > match.start) {
        startNode = node;
        startOffset = match.start - currentPos;
      }
      if (currentPos + len >= cursorPos) {
        endNode = node;
        endOffset = cursorPos - currentPos;
        break;
      }
      currentPos += len;
    }

    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, match.replacement);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  flashFeedback(el);
}

document.addEventListener('input', handleInput);
