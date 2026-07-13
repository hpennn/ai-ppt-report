import { streamChat } from '../utils/ai';
// ========================================
// Report Generator - Client Script
// ========================================

// State
let currentReportType = 'weekly';
let currentStyle = 'structured';
let currentMarkdown = '';
let isEditing = false;
let isGenerating = false;
let lastInputData = null;

// ========================================
// Report Type Selection
// ========================================
function selectReportType(type) {
  currentReportType = type;
  document.querySelectorAll('.report-type-btn').forEach(btn => {
    const isActive = btn.dataset.type === type;
    btn.classList.toggle('border-emerald-500', isActive);
    btn.classList.toggle('bg-emerald-50', isActive);
    btn.classList.toggle('text-emerald-700', isActive);
    btn.classList.toggle('font-medium', isActive);
    btn.classList.toggle('border-transparent', !isActive);
    btn.classList.toggle('bg-gray-50', !isActive);
    btn.classList.toggle('text-gray-600', !isActive);
  });
}

// ========================================
// Points Management
// ========================================
function addPoint() {
  const container = document.getElementById('points-container');
  const div = document.createElement('div');
  div.className = 'flex gap-2';
  div.innerHTML = `
    <input type="text" placeholder="输入工作要点..." class="point-input flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
    <button onclick="removePoint(this)" class="p-2 text-gray-400 hover:text-red-500 transition-smooth">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;
  container.appendChild(div);
  updateRemoveButtons();
  div.querySelector('input').focus();
}

function removePoint(btn) {
  const container = document.getElementById('points-container');
  if (container.children.length > 1) {
    btn.closest('.flex').remove();
  }
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const container = document.getElementById('points-container');
  const items = container.children;
  items.forEach((item, i) => {
    const removeBtn = item.querySelector('button');
    if (removeBtn) {
      removeBtn.classList.toggle('hidden', items.length <= 1);
    }
  });
}

function getPoints() {
  const inputs = document.querySelectorAll('.point-input');
  return Array.from(inputs)
    .map(input => input.value.trim())
    .filter(v => v.length > 0);
}

// ========================================
// Generate Report
// ========================================
async function generateReport() {
  const points = getPoints();
  if (points.length === 0) {
    showToast('请至少输入一个工作要点');
    return;
  }

  const style = document.getElementById('report-style').value;
  currentStyle = style;
  const plan = document.getElementById('report-plan').value.trim();
  const problems = document.getElementById('report-problems').value.trim();
  const support = document.getElementById('report-support').value.trim();

  lastInputData = { points, style, plan, problems, support };

  const btn = document.getElementById('btn-gen-report');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 生成中...';
  isGenerating = true;

  // Show result section
  document.getElementById('result-section').classList.remove('hidden');
  const rendered = document.getElementById('report-rendered');
  rendered.innerHTML = '<div class="flex items-center gap-2 text-gray-500"><div class="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> 正在生成汇报内容...</div>';

  currentMarkdown = '';

  try {
    const typeMap = { weekly: '周报', monthly: '月报', quarterly: '季度工作总结', yearly: '年度工作总结' };
    const styleMap = {
      structured: `结构化风格：
- 使用清晰的标题层级（一级标题、二级标题）
- 每个工作项用"标题 + 要点 + 数据/成果"的格式
- 使用有序/无序列表组织内容
- 数据用加粗突出
- 段落之间逻辑清晰，层次分明`,
      natural: `自然表达风格：
- 用流畅的段落叙述，而非列表
- 口语化但保持专业性
- 适当使用过渡词和连接句
- 像在和领导面对面交流
- 语气温和自信，不卑不亢`,
      upward: `向上管理风格：
- 开头先总结核心成果和价值
- 突出对团队/公司的贡献和影响
- 用数据和成果说话，弱化过程描述
- 问题部分转化为"改进方向"和"优化空间"
- 展现主动思考和全局视角
- 适当体现工作的难度和自身的努力`,
      okr: `OKR 风格：
- 格式：Objective → Key Results → 进展
- 每个目标下明确关键结果（可量化的指标）
- 用进度百分比展示完成度
- 标注超额完成/达成/未达的情况
- 分析差距原因和下阶段策略`,
      star: `STAR 风格：
- 每项重要工作用 STAR 结构描述
- Situation（情境）：背景是什么
- Task（任务）：我的任务/目标是什么
- Action（行动）：我采取了什么行动
- Result（结果）：取得了什么成果（用数据说明）
- 突出个人贡献和关键决策`
    };

    const typeDesc = typeMap[currentReportType] || '周报';
    const styleDesc = styleMap[style] || styleMap.structured;

    const systemPrompt = `你是一个专业的工作汇报撰写助手。请根据用户提供的工作内容要点，生成一份高质量的工作汇报。

汇报类型：${typeDesc}
表达风格要求：
${styleDesc}

要求：
1. 输出格式为 Markdown
2. 内容要专业、真实、有深度
3. 适当补充合理的细节和数据（用 [数据] 标注需要用户填写的占位符）
4. 语言流畅，符合职场表达习惯
5. 不要输出与汇报内容无关的说明文字
6. 直接输出汇报正文，不需要额外的解释`;

    let userPrompt = `请帮我写一份${typeDesc}。

工作内容要点：
${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

    if (plan) userPrompt += `\n\n下期计划：\n${plan}`;
    if (problems) userPrompt += `\n\n遇到的问题：\n${problems}`;
    if (support) userPrompt += `\n\n需要的支持：\n${support}`;

    await new Promise((resolve) => {
      streamChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          onChunk: (text) => {
            currentMarkdown += text;
            rendered.innerHTML = renderMarkdown(currentMarkdown);
          },
          onDone: () => {
            rendered.innerHTML = renderMarkdown(currentMarkdown);
            updateStyleSwitcher();
            showToast('汇报生成完成');
            resolve();
          },
          onError: (err) => {
            showToast('生成失败：' + err);
            rendered.innerHTML = '';
            resolve();
          }
        }
      );
    });

  } catch (err) {
    showToast('请求失败：' + err.message);
    rendered.innerHTML = '';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 生成汇报';
    isGenerating = false;
  }
}

// ========================================
// Style Switching
// ========================================
function switchStyle(style) {
  if (isGenerating || !lastInputData) return;
  
  currentStyle = style;
  document.getElementById('report-style').value = style;
  
  // Update input data
  lastInputData.style = style;
  
  // Re-generate with new style
  const btn = document.getElementById('btn-gen-report');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 切换风格中...';
  
  const rendered = document.getElementById('report-rendered');
  currentMarkdown = '';
  
  const typeMap2 = { weekly: '周报', monthly: '月报', quarterly: '季度工作总结', yearly: '年度工作总结' };
  const styleMap2 = {
    structured: `结构化风格：
- 使用清晰的标题层级（一级标题、二级标题）
- 每个工作项用"标题 + 要点 + 数据/成果"的格式
- 使用有序/无序列表组织内容
- 数据用加粗突出
- 段落之间逻辑清晰，层次分明`,
    natural: `自然表达风格：
- 用流畅的段落叙述，而非列表
- 口语化但保持专业性
- 适当使用过渡词和连接句
- 像在和领导面对面交流
- 语气温和自信，不卑不亢`,
    upward: `向上管理风格：
- 开头先总结核心成果和价值
- 突出对团队/公司的贡献和影响
- 用数据和成果说话，弱化过程描述
- 问题部分转化为"改进方向"和"优化空间"
- 展现主动思考和全局视角
- 适当体现工作的难度和自身的努力`,
    okr: `OKR 风格：
- 格式：Objective → Key Results → 进展
- 每个目标下明确关键结果（可量化的指标）
- 用进度百分比展示完成度
- 标注超额完成/达成/未达的情况
- 分析差距原因和下阶段策略`,
    star: `STAR 风格：
- 每项重要工作用 STAR 结构描述
- Situation（情境）：背景是什么
- Task（任务）：我的任务/目标是什么
- Action（行动）：我采取了什么行动
- Result（结果）：取得了什么成果（用数据说明）
- 突出个人贡献和关键决策`
  };

  const typeDesc2 = typeMap2[currentReportType] || '周报';
  const styleDesc2 = styleMap2[style] || styleMap2.structured;

  const sysPrompt2 = `你是一个专业的工作汇报撰写助手。请根据用户提供的工作内容要点，生成一份高质量的工作汇报。

汇报类型：${typeDesc2}
表达风格要求：
${styleDesc2}

要求：
1. 输出格式为 Markdown
2. 内容要专业、真实、有深度
3. 适当补充合理的细节和数据（用 [数据] 标注需要用户填写的占位符）
4. 语言流畅，符合职场表达习惯
5. 不要输出与汇报内容无关的说明文字
6. 直接输出汇报正文，不需要额外的解释`;

  let usrPrompt2 = `请帮我写一份${typeDesc2}。

工作内容要点：
${lastInputData.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

  if (lastInputData.plan) usrPrompt2 += `\n\n下期计划：\n${lastInputData.plan}`;
  if (lastInputData.problems) usrPrompt2 += `\n\n遇到的问题：\n${lastInputData.problems}`;
  if (lastInputData.support) usrPrompt2 += `\n\n需要的支持：\n${lastInputData.support}`;

  streamChat(
    [
      { role: 'system', content: sysPrompt2 },
      { role: 'user', content: usrPrompt2 }
    ],
    {
      onChunk: (text) => {
        currentMarkdown += text;
        rendered.innerHTML = renderMarkdown(currentMarkdown);
      },
      onDone: () => {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 生成汇报';
        updateStyleSwitcher();
      },
      onError: (err) => {
        showToast('切换失败：' + err);
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 生成汇报';
      }
    }
  );
  
  updateStyleSwitcher();
}

function updateStyleSwitcher() {
  document.querySelectorAll('.style-switch-btn').forEach(btn => {
    const isActive = btn.dataset.style === currentStyle;
    btn.classList.toggle('border-emerald-500', isActive);
    btn.classList.toggle('bg-emerald-50', isActive);
    btn.classList.toggle('text-emerald-700', isActive);
    btn.classList.toggle('border-transparent', !isActive);
  });
}

// ========================================
// Markdown Renderer
// ========================================
function renderMarkdown(md) {
  if (!md) return '';
  
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-800 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-200">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 py-0.5">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 py-0.5 list-decimal">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200">')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="my-3 text-gray-700 leading-relaxed">')
    .replace(/\n/g, '<br>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
    if (match.includes('list-decimal')) {
      return `<ol class="my-3 space-y-1">${match}</ol>`;
    }
    return `<ul class="my-3 space-y-1">${match}</ul>`;
  });
  
  // Clean up
  html = '<div class="report-content">' + html + '</div>';
  
  return html;
}

// ========================================
// Edit Mode
// ========================================
function toggleEdit() {
  isEditing = !isEditing;
  const rendered = document.getElementById('report-rendered');
  const editor = document.getElementById('report-editor');
  const btn = document.getElementById('btn-edit');

  if (isEditing) {
    editor.value = currentMarkdown;
    rendered.classList.add('hidden');
    editor.classList.remove('hidden');
    btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> 完成编辑';
  } else {
    currentMarkdown = editor.value;
    rendered.innerHTML = renderMarkdown(currentMarkdown);
    editor.classList.add('hidden');
    rendered.classList.remove('hidden');
    btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> 编辑';
  }
}

// ========================================
// Copy
// ========================================
function copyReport() {
  const text = isEditing
    ? document.getElementById('report-editor').value
    : currentMarkdown;

  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板');
  });
}

// ========================================
// Export Markdown
// ========================================
function exportMarkdown() {
  const text = isEditing
    ? document.getElementById('report-editor').value
    : currentMarkdown;

  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const typeNames = { weekly: '周报', monthly: '月报', quarterly: '季度总结', yearly: '年度总结' };
  a.download = `${typeNames[currentReportType] || '工作汇报'}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Markdown 文件已下载');
}

// ========================================
// Export Word (HTML-based .doc)
// ========================================
function exportWord() {
  const content = isEditing
    ? renderMarkdown(document.getElementById('report-editor').value)
    : document.getElementById('report-rendered').innerHTML;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; font-size: 14px; line-height: 1.8; color: #333; padding: 40px; }
    h1 { font-size: 22px; font-weight: bold; margin: 20px 0 10px; }
    h2 { font-size: 18px; font-weight: bold; margin: 16px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 16px; font-weight: bold; margin: 12px 0 6px; }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    strong { font-weight: bold; }
    p { margin: 8px 0; }
  </style>
</head>
<body>${content}</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const typeNames = { weekly: '周报', monthly: '月报', quarterly: '季度总结', yearly: '年度总结' };
  a.download = `${typeNames[currentReportType] || '工作汇报'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Word 文件已下载');
}

// ========================================
// Toast
// ========================================
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
  }, 2500);
}
