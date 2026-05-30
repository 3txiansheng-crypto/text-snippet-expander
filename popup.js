// popup.js — 管理 snippets

const keyInput = document.getElementById('keyInput');
const textInput = document.getElementById('textInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('snippetList');

function render(snippets) {
  const entries = Object.entries(snippets || {});
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty">还没有快捷短语<br>添加你的第一个吧</div>';
    return;
  }
  list.innerHTML = entries.map(([key, text]) => `
    <div class="snippet-item">
      <span class="snippet-key">/${key}</span>
      <span class="snippet-text">${escapeHtml(text)}</span>
      <button class="del-btn" data-key="${escapeHtml(key)}">×</button>
    </div>
  `).join('');
  
  // 绑定删除按钮
  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const { snippets } = await chrome.storage.local.get('snippets');
      delete snippets[key];
      await chrome.storage.local.set({ snippets });
      render(snippets);
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

addBtn.addEventListener('click', async () => {
  const key = keyInput.value.trim();
  const text = textInput.value.trim();
  if (!key || !text) return;
  
  const { snippets } = await chrome.storage.local.get('snippets');
  const updated = { ...(snippets || {}), [key]: text };
  await chrome.storage.local.set({ snippets: updated });
  
  keyInput.value = '';
  textInput.value = '';
  keyInput.focus();
  render(updated);
});

// 回车快捷添加
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

// 初始加载
(async () => {
  const { snippets } = await chrome.storage.local.get('snippets');
  render(snippets || {});
  keyInput.focus();
})();
