// popup.js — 管理 snippets (v1.2: 编辑 + 示例 + 键盘流)

const keyInput = document.getElementById('keyInput');
const textInput = document.getElementById('textInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('snippetList');

let editingKey = null; // 正在编辑的 snippet key，null = 新增模式

const DEFAULTS = {
  sig: '——这是你的签名，点击编辑修改',
  date: '今天是 {{date}}',
  email: '你好，\n\n这是我的邮件模板，点击编辑修改。\n\n祝好',
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateBtnState() {
  if (editingKey) {
    addBtn.textContent = '保存';
    addBtn.style.background = '#5f5';
    addBtn.style.color = '#1a1a2e';
    keyInput.readOnly = true;
    keyInput.style.opacity = '0.5';
  } else {
    addBtn.textContent = '添加';
    addBtn.style.background = '#4a9eff';
    addBtn.style.color = '#fff';
    keyInput.readOnly = false;
    keyInput.style.opacity = '1';
  }
}

function cancelEdit() {
  editingKey = null;
  keyInput.value = '';
  textInput.value = '';
  updateBtnState();
  keyInput.focus();
}

function startEdit(key, text) {
  editingKey = key;
  keyInput.value = key;
  textInput.value = text;
  updateBtnState();
  textInput.focus();
}

function render(snippets) {
  const entries = Object.entries(snippets || {});
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty">还没有快捷短语</div>';
    return;
  }
  list.innerHTML = entries.map(([key, text]) => {
    const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
    return `
      <div class="snippet-item ${editingKey === key ? 'editing' : ''}" data-key="${escapeHtml(key)}">
        <span class="snippet-key">/${escapeHtml(key)}</span>
        <span class="snippet-text">${escapeHtml(preview)}</span>
        <button class="edit-btn" data-key="${escapeHtml(key)}">✎</button>
        <button class="del-btn" data-key="${escapeHtml(key)}">×</button>
      </div>
    `;
  }).join('');

  // 绑定点击条目 = 编辑
  list.querySelectorAll('.snippet-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const key = item.dataset.key;
      const text = snippets[key];
      startEdit(key, text);
      render(snippets);
    });
  });

  // 绑定编辑按钮
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      const text = snippets[key];
      startEdit(key, text);
      render(snippets);
    });
  });

  // 绑定删除按钮
  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (editingKey === key) cancelEdit();
      const { snippets } = await chrome.storage.local.get('snippets');
      delete snippets[key];
      await chrome.storage.local.set({ snippets });
      render(snippets);
    });
  });
}

// 核心：保存逻辑（新增 or 更新）
async function save() {
  const key = editingKey || keyInput.value.trim();
  const text = textInput.value.trim();
  if (!key || !text) return;

  const { snippets } = await chrome.storage.local.get('snippets');
  const updated = { ...(snippets || {}), [key]: text };
  await chrome.storage.local.set({ snippets: updated });

  cancelEdit();
  render(updated);
}

// 按钮点击
addBtn.addEventListener('click', save);

// 键盘流：回车保存，Esc 取消
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); save(); }
  if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
});
keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); textInput.focus(); }
  if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
});

// 初始加载
(async () => {
  let { snippets } = await chrome.storage.local.get('snippets');
  if (!snippets || Object.keys(snippets).length === 0) {
    snippets = DEFAULTS;
    await chrome.storage.local.set({ snippets });
  }
  render(snippets);
  keyInput.focus();
})();
