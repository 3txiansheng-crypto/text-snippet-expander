// content.js — 极简文本替换引擎
// 触发方式：输入 / 后跟关键词，按空格或回车触发

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

// 核心：找到输入框中光标前的触发词
function findTrigger(text, cursorPos) {
  // 从光标往前找 TRIGGER 字符
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === TRIGGER) {
      const key = text.slice(i + 1, cursorPos);
      if (key && snippets[key]) {
        return {
          start: i,
          key: key,
          replacement: snippets[key]
        };
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
  
  const text = el.value !== undefined ? el.value : el.textContent;
  const cursorPos = el.selectionStart !== undefined ? el.selectionStart : text.length;
  
  const match = findTrigger(text, cursorPos);
  if (!match) return;
  
  const before = text.slice(0, match.start);
  const after = text.slice(cursorPos);
  
  if (el.value !== undefined) {
    el.value = before + match.replacement + after;
    el.selectionStart = el.selectionEnd = before.length + match.replacement.length;
  } else {
    el.textContent = before + match.replacement + after;
  }
  
  // 触发 input 事件让页面框架（React 等）感知变化
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

document.addEventListener('input', handleInput);
