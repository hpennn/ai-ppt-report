import { chatJSON } from '../utils/ai';
// ========================================
// PPT Generator - Client Script
// ========================================

// State
let currentTheme = 'business';
let currentSlideIndex = 0;
let pptData = null;
let outlineData = null;
let isPresenting = false;
let selectedStyle = 'business';

// ========================================
// Style Selection
// ========================================
function selectStyle(style) {
  selectedStyle = style;
  document.querySelectorAll('.style-btn').forEach(btn => {
    const isActive = btn.dataset.style === style;
    btn.classList.toggle('border-primary-500', isActive);
    btn.classList.toggle('bg-primary-50', isActive);
    btn.classList.toggle('border-transparent', !isActive);
  });
}

// ========================================
// Theme Switching
// ========================================
function switchTheme(theme) {
  currentTheme = theme;
  renderCurrentSlide();
}

// ========================================
// Generation Flow
// ========================================
async function startGeneration() {
  const topic = document.getElementById('ppt-topic').value.trim();
  if (!topic) {
    showToast('请输入演示主题');
    return;
  }

  const pageCount = parseInt(document.getElementById('ppt-pages').value);
  const description = document.getElementById('ppt-desc').value.trim();

  showStatus('正在生成大纲...');
  setGenerating(true);

  try {
    const styleMap = {
      business: '商务简约风格，沉稳专业，适合正式场合',
      tech: '科技蓝色风格，现代感强，适合技术/互联网行业',
      fresh: '清新绿色风格，自然活力，适合创意/环保/健康主题',
      vibrant: '活力橙色风格，热情积极，适合营销/团建/活动',
      academic: '学术风格，严谨规范，适合学术/教育/研究场景'
    };
    const styleDesc = styleMap[selectedStyle] || styleMap.business;

    const systemPrompt = `你是一个专业的 PPT 策划师。根据用户提供的主题和要求，生成 PPT 大纲。
你必须严格输出 JSON 格式，不要输出任何其他内容（不要用 markdown 代码块包裹）。

JSON 格式如下：
{
  "title": "PPT整体标题",
  "slides": [
    {
      "type": "cover",
      "title": "封面标题",
      "subtitle": "副标题/日期/汇报人"
    },
    {
      "type": "content",
      "title": "页面标题",
      "points": ["要点1", "要点2", "要点3"],
      "notes": "演讲备注（50字以内）"
    },
    {
      "type": "summary",
      "title": "总结与展望",
      "points": ["关键结论1", "关键结论2", "下一步计划"]
    },
    {
      "type": "end",
      "title": "谢谢",
      "subtitle": "Q&A"
    }
  ]
}

要求：
1. 必须包含封面页(cover)和结束页(end)
2. 内容页类型为 content
3. 最后一页内容页之后是 summary，然后是 end
4. 每页要点 3-5 个，简洁有力
5. 总页数严格等于用户要求的页数
6. 内容专业、有深度、逻辑清晰`;

    const userPrompt = `请为以下主题生成 PPT 大纲：
主题：${topic}
页数：${pageCount}页
风格：${styleDesc}
额外要求：${description || '无'}`;

    let data;
    try {
      data = await chatJSON([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
    } catch (err) {
      showToast('生成失败：' + err.message);
      return;
    }

    outlineData = data;
    showOutline(data);
    hideStatus();
  } catch (err) {
    showToast('请求失败：' + err.message);
  } finally {
    setGenerating(false);
  }
}

async function regenerateOutline() {
  await startGeneration();
}

async function generateFullPPT() {
  if (!outlineData) return;

  showStatus('正在生成完整 PPT...');
  setGenerating(true);

  try {
    const topic = document.getElementById('ppt-topic').value.trim();
    const pageCount = parseInt(document.getElementById('ppt-pages').value);
    const description = document.getElementById('ppt-desc').value.trim();

    const styleMap2 = {
      business: '商务简约风格，沉稳专业，适合正式场合',
      tech: '科技蓝色风格，现代感强，适合技术/互联网行业',
      fresh: '清新绿色风格，自然活力，适合创意/环保/健康主题',
      vibrant: '活力橙色风格，热情积极，适合营销/团建/活动',
      academic: '学术风格，严谨规范，适合学术/教育/研究场景'
    };
    const styleDesc2 = styleMap2[selectedStyle] || styleMap2.business;

    const systemPrompt2 = `你是一个专业的 PPT 内容策划师。根据已确认的大纲，为每一页生成详细内容。
你必须严格输出 JSON 格式，不要输出任何其他内容（不要用 markdown 代码块包裹）。

JSON 格式如下：
{
  "title": "PPT整体标题",
  "slides": [
    {
      "type": "cover",
      "title": "封面标题",
      "subtitle": "副标题"
    },
    {
      "type": "content",
      "title": "页面标题",
      "points": [
        {"text": "要点文字", "detail": "详细说明（可选）"}
      ],
      "notes": "演讲备注"
    },
    {
      "type": "data",
      "title": "数据页标题",
      "points": [
        {"label": "指标名", "value": "数值", "trend": "up/down/flat"}
      ],
      "notes": "演讲备注"
    },
    {
      "type": "summary",
      "title": "总结",
      "points": ["关键结论1", "关键结论2"]
    },
    {
      "type": "end",
      "title": "谢谢",
      "subtitle": "Q&A"
    }
  ]
}

要求：
1. 保持大纲的结构，丰富每页内容
2. 要点文字要具体、有数据支撑
3. 每页要点 3-5 个
4. 内容页可以包含数据展示建议
5. 内容专业、逻辑清晰、有说服力`;

    const userPrompt2 = `请根据以下大纲生成详细的 PPT 内容：
${JSON.stringify(outlineData)}

风格：${styleDesc2}
要求：输出完整的 JSON 格式内容`;

    let data;
    try {
      data = await chatJSON([
        { role: 'system', content: systemPrompt2 },
        { role: 'user', content: userPrompt2 }
      ]);
    } catch (err) {
      showToast('生成失败：' + err.message);
      return;
    }

    pptData = data;
    currentTheme = selectedStyle;
    showPresentation(data);
    hideStatus();
  } catch (err) {
    showToast('请求失败：' + err.message);
  } finally {
    setGenerating(false);
  }
}

// ========================================
// UI State Management
// ========================================
function setGenerating(active) {
  const btn = document.getElementById('btn-generate');
  btn.disabled = active;
  btn.innerHTML = active
    ? '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 生成中...'
    : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 生成大纲';
}

function showStatus(text) {
  const el = document.getElementById('gen-status');
  el.classList.remove('hidden');
  document.getElementById('status-text').textContent = text;
}

function hideStatus() {
  document.getElementById('gen-status').classList.add('hidden');
}

function showOutline(data) {
  const panel = document.getElementById('outline-panel');
  const content = document.getElementById('outline-content');
  panel.classList.remove('hidden');

  let html = '';
  if (data.slides) {
    data.slides.forEach((slide, i) => {
      const typeLabel = {
        cover: '🎯 封面',
        content: '📄 内容',
        data: '📊 数据',
        summary: '📋 总结',
        end: '🔚 结束'
      }[slide.type] || slide.type;

      html += `
        <div class="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <span class="text-xs text-gray-400 w-6 pt-1">${i + 1}</span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs px-1.5 py-0.5 bg-gray-200 rounded">${typeLabel}</span>
              <span class="font-medium text-sm text-gray-900">${slide.title || ''}</span>
            </div>
            ${slide.subtitle ? `<p class="text-xs text-gray-500">${slide.subtitle}</p>` : ''}
            ${slide.points ? `<ul class="mt-1 space-y-0.5">${slide.points.map(p => `<li class="text-xs text-gray-600 flex items-center gap-1"><span class="w-1 h-1 bg-gray-400 rounded-full"></span>${typeof p === 'string' ? p : p.text || p.label || ''}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
      `;
    });
  }
  content.innerHTML = html;
}

// ========================================
// Presentation Rendering
// ========================================
function showPresentation(data) {
  // Hide outline, show preview
  document.getElementById('outline-panel').classList.add('hidden');
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('slide-container').classList.remove('hidden');
  document.getElementById('slide-nav').classList.remove('hidden');

  // Show toolbar buttons
  document.getElementById('btn-present').classList.remove('hidden');
  document.getElementById('btn-present').classList.add('flex');
  document.getElementById('theme-switcher').classList.remove('hidden');
  document.getElementById('theme-switcher').classList.add('flex');
  document.getElementById('btn-export').classList.remove('hidden');
  document.getElementById('btn-export').classList.add('flex');

  currentSlideIndex = 0;
  renderCurrentSlide();
  renderThumbnails();
}

function renderCurrentSlide() {
  if (!pptData || !pptData.slides) return;

  const container = document.getElementById('slide-container');
  const slide = pptData.slides[currentSlideIndex];
  const total = pptData.slides.length;

  container.innerHTML = `
    <div class="w-full h-full flex items-center justify-center p-4">
      <div class="theme-${currentTheme} w-full aspect-video max-h-full rounded-xl shadow-2xl overflow-hidden">
        ${renderSlide(slide, currentSlideIndex, total)}
      </div>
    </div>
  `;

  // Update counter
  document.getElementById('slide-counter').textContent = `${currentSlideIndex + 1} / ${total}`;

  // Update thumbnail active state
  document.querySelectorAll('.thumbnail').forEach((t, i) => {
    t.classList.toggle('active', i === currentSlideIndex);
  });
}

function renderSlide(slide, index, total) {
  const pageNum = index + 1;

  switch (slide.type) {
    case 'cover':
      return `
        <div class="ppt-slide slide-cover slide-animate">
          <div class="cover-dots">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </div>
          <h1 class="cover-title slide-animate slide-animate-delay-1">${slide.title || ''}</h1>
          <p class="cover-subtitle slide-animate slide-animate-delay-2">${slide.subtitle || ''}</p>
          <div class="cover-decoration"></div>
        </div>
      `;

    case 'content':
      const points = (slide.points || []).map((p, i) => {
        const text = typeof p === 'string' ? p : (p.text || '');
        const detail = typeof p === 'object' ? (p.detail || '') : '';
        return `
          <div class="point-item slide-animate slide-animate-delay-${Math.min(i + 1, 5)}">
            <div class="point-bullet"></div>
            <div>
              <div class="point-text">${text}</div>
              ${detail ? `<div class="point-detail">${detail}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="ppt-slide slide-content">
          <div class="slide-header">
            <span class="page-number">${String(pageNum).padStart(2, '0')}</span>
            <h2>${slide.title || ''}</h2>
          </div>
          <div class="slide-body">${points}</div>
          <div class="slide-footer">
            <span class="notes">${slide.notes || ''}</span>
            <span>${pageNum} / ${total}</span>
          </div>
        </div>
      `;

    case 'data':
      const dataCards = (slide.points || []).map((p, i) => {
        const label = typeof p === 'string' ? p : (p.label || '');
        const value = typeof p === 'object' ? (p.value || '') : '';
        const trend = typeof p === 'object' ? (p.trend || 'flat') : 'flat';
        const trendIcon = { up: '↑', down: '↓', flat: '→' }[trend] || '→';
        return `
          <div class="data-card slide-animate slide-animate-delay-${Math.min(i + 1, 5)}">
            <div class="data-value accent">${value}</div>
            <div class="data-label">${label}</div>
            <div class="data-trend ${trend}">${trendIcon}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="ppt-slide slide-content slide-data">
          <div class="slide-header">
            <span class="page-number">${String(pageNum).padStart(2, '0')}</span>
            <h2>${slide.title || ''}</h2>
          </div>
          <div class="slide-body">
            <div class="data-grid">${dataCards}</div>
          </div>
          <div class="slide-footer">
            <span class="notes">${slide.notes || ''}</span>
            <span>${pageNum} / ${total}</span>
          </div>
        </div>
      `;

    case 'summary':
      const summaryCards = (slide.points || []).map((p, i) => {
        const text = typeof p === 'string' ? p : (p.text || '');
        return `
          <div class="summary-card slide-animate slide-animate-delay-${Math.min(i + 1, 5)}" style="border-left-color: var(--accent-color)">
            <p>${text}</p>
          </div>
        `;
      }).join('');

      return `
        <div class="ppt-slide slide-summary">
          <h2 class="slide-animate accent slide-animate-delay-1">${slide.title || '总结'}</h2>
          <div class="summary-grid">${summaryCards}</div>
        </div>
      `;

    case 'end':
      return `
        <div class="ppt-slide slide-end slide-animate">
          <div class="end-title">${slide.title || '谢谢'}</div>
          <div class="end-subtitle">${slide.subtitle || 'Q&A'}</div>
        </div>
      `;

    default:
      return `<div class="ppt-slide slide-content"><div class="slide-body"><p>${JSON.stringify(slide)}</p></div></div>`;
  }
}

// ========================================
// Thumbnails
// ========================================
function renderThumbnails() {
  if (!pptData || !pptData.slides) return;

  const strip = document.getElementById('thumbnail-strip');
  strip.innerHTML = pptData.slides.map((slide, i) => `
    <div class="thumbnail ${i === currentSlideIndex ? 'active' : ''}" onclick="goToSlide(${i})">
      <div class="thumbnail-content theme-${currentTheme}">
        ${renderSlide(slide, i, pptData.slides.length)}
      </div>
      <span class="thumbnail-number">${i + 1}</span>
    </div>
  `).join('');
}

function goToSlide(index) {
  currentSlideIndex = index;
  renderCurrentSlide();
  if (isPresenting) {
    document.getElementById('present-counter').textContent = `${index + 1} / ${pptData.slides.length}`;
  }
}

function prevSlide() {
  if (currentSlideIndex > 0) {
    goToSlide(currentSlideIndex - 1);
  }
}

function nextSlide() {
  if (pptData && currentSlideIndex < pptData.slides.length - 1) {
    goToSlide(currentSlideIndex + 1);
  }
}

// ========================================
// Presentation Mode
// ========================================
function enterPresentation() {
  if (!pptData) return;
  isPresenting = true;

  const mode = document.getElementById('presentation-mode');
  mode.classList.remove('hidden');

  // Try fullscreen
  if (mode.requestFullscreen) {
    mode.requestFullscreen().catch(() => {});
  }

  renderPresentSlide();
  document.addEventListener('keydown', handlePresentKeys);
}

function exitPresentation() {
  isPresenting = false;
  document.getElementById('presentation-mode').classList.add('hidden');
  document.removeEventListener('keydown', handlePresentKeys);

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderPresentSlide() {
  if (!pptData) return;
  const slide = pptData.slides[currentSlideIndex];
  const total = pptData.slides.length;

  document.getElementById('present-slide').innerHTML = `
    <div class="w-full h-full flex items-center justify-center">
      <div class="theme-${currentTheme} w-full h-full">
        ${renderSlide(slide, currentSlideIndex, total)}
      </div>
    </div>
  `;
  document.getElementById('present-counter').textContent = `${currentSlideIndex + 1} / ${total}`;
}

function handlePresentKeys(e) {
  if (!isPresenting) return;

  switch (e.key) {
    case 'Escape':
      exitPresentation();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      prevSlide();
      renderPresentSlide();
      break;
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
      e.preventDefault();
      nextSlide();
      renderPresentSlide();
      break;
  }
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (isPresenting) return;

  if (e.key === 'f' || e.key === 'F') {
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      enterPresentation();
    }
  }
});

// ========================================
// Export HTML
// ========================================
function exportHTML() {
  if (!pptData) return;

  const slidesHTML = pptData.slides.map((slide, i) => `
    <div class="ppt-slide-wrapper" data-index="${i}">
      <div class="theme-${currentTheme}" style="width:100%;height:100%;">
        ${renderSlide(slide, i, pptData.slides.length)}
      </div>
    </div>
  `).join('');

  const themeCSS = document.querySelector('link[href*="ppt-themes"]') ? '' : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pptData.title || '演示文稿'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Noto Sans SC', system-ui, sans-serif; background: #1a1a2e; }
    .ppt-slide-wrapper {
      width: 100vw;
      height: 100vh;
      display: none;
    }
    .ppt-slide-wrapper.active { display: block; }
    .ppt-slide { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .slide-cover { justify-content: center; align-items: center; text-align: center; padding: 4rem; }
    .slide-cover .cover-title { font-size: 3rem; font-weight: 700; margin-bottom: 1rem; }
    .slide-cover .cover-subtitle { font-size: 1.4rem; opacity: 0.85; }
    .slide-cover .cover-decoration { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.3); }
    .slide-cover .cover-dots { position: absolute; top: 2rem; right: 2rem; display: grid; grid-template-columns: repeat(3, 8px); gap: 6px; opacity: 0.3; }
    .slide-cover .cover-dots span { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .slide-content .slide-header { padding: 1.5rem 3rem; display: flex; align-items: center; gap: 1rem; }
    .slide-content .slide-header .page-number { font-size: 0.8rem; opacity: 0.7; font-weight: 600; }
    .slide-content .slide-header h2 { font-size: 1.8rem; font-weight: 600; }
    .slide-content .slide-body { flex: 1; padding: 2rem 3rem; display: flex; flex-direction: column; justify-content: center; }
    .slide-content .point-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .slide-content .point-item:last-child { border-bottom: none; }
    .slide-content .point-bullet { width: 10px; height: 10px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }
    .slide-content .point-text { font-size: 1.2rem; line-height: 1.6; }
    .slide-content .point-detail { font-size: 0.95rem; color: #666; margin-top: 0.3rem; }
    .slide-content .slide-footer { padding: 1rem 3rem; border-top: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: space-between; font-size: 0.8rem; color: #999; }
    .slide-data .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; padding: 2rem; }
    .slide-data .data-card { background: rgba(0,0,0,0.03); border-radius: 12px; padding: 1.5rem; text-align: center; }
    .slide-data .data-value { font-size: 2.5rem; font-weight: 700; }
    .slide-data .data-label { font-size: 0.9rem; color: #666; margin-top: 0.5rem; }
    .slide-data .data-trend { font-size: 0.85rem; margin-top: 0.3rem; }
    .slide-data .data-trend.up { color: #16a34a; }
    .slide-data .data-trend.down { color: #dc2626; }
    .slide-data .data-trend.flat { color: #666; }
    .slide-summary { justify-content: center; padding: 3rem; }
    .slide-summary h2 { font-size: 2rem; font-weight: 700; margin-bottom: 2rem; text-align: center; }
    .slide-summary .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.2rem; max-width: 800px; margin: 0 auto; }
    .slide-summary .summary-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid; }
    .slide-end { justify-content: center; align-items: center; text-align: center; padding: 4rem; }
    .slide-end .end-title { font-size: 3.5rem; font-weight: 700; margin-bottom: 1rem; }
    .slide-end .end-subtitle { font-size: 1.5rem; opacity: 0.8; }
    .controls { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 30px; z-index: 100; opacity: 0; transition: opacity 0.3s; }
    .controls:hover { opacity: 1; }
    .controls button { background: none; border: none; color: white; cursor: pointer; padding: 6px; font-size: 16px; }
    .controls .counter { color: rgba(255,255,255,0.8); font-size: 14px; line-height: 32px; }
    /* Themes */
    .theme-business .slide-cover { background: linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%); color: white; }
    .theme-business .slide-content { background: #fff; color: #1a202c; }
    .theme-business .slide-content .slide-header { background: #1a365d; color: white; }
    .theme-business .slide-summary { background: linear-gradient(135deg, #ebf4ff 0%, #fff 100%); color: #1a202c; }
    .theme-business .slide-end { background: linear-gradient(135deg, #2c5282 0%, #1a365d 100%); color: white; }
    .theme-business .accent { color: #2b6cb0; }
    .theme-business .point-bullet { background: #2b6cb0; }
    .theme-tech .slide-cover { background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 30%, #0d47a1 70%, #1565c0 100%); color: white; }
    .theme-tech .slide-content { background: #f8fafc; color: #0f172a; }
    .theme-tech .slide-content .slide-header { background: linear-gradient(90deg, #0d47a1, #1565c0); color: white; }
    .theme-tech .slide-summary { background: linear-gradient(135deg, #e3f2fd 0%, #f8fafc 100%); color: #0f172a; }
    .theme-tech .slide-end { background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); color: white; }
    .theme-tech .accent { color: #0d47a1; }
    .theme-tech .point-bullet { background: #0d47a1; }
    .theme-fresh .slide-cover { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%); color: white; }
    .theme-fresh .slide-content { background: #fff; color: #1a2e1a; }
    .theme-fresh .slide-content .slide-header { background: linear-gradient(90deg, #1b5e20, #388e3c); color: white; }
    .theme-fresh .slide-summary { background: linear-gradient(135deg, #e8f5e9 0%, #fff 100%); color: #1a2e1a; }
    .theme-fresh .slide-end { background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); color: white; }
    .theme-fresh .accent { color: #2e7d32; }
    .theme-fresh .point-bullet { background: #2e7d32; }
    .theme-vibrant .slide-cover { background: linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ff9800 100%); color: white; }
    .theme-vibrant .slide-content { background: #fff; color: #2d1800; }
    .theme-vibrant .slide-content .slide-header { background: linear-gradient(90deg, #e65100, #f57c00); color: white; }
    .theme-vibrant .slide-summary { background: linear-gradient(135deg, #fff3e0 0%, #fff 100%); color: #2d1800; }
    .theme-vibrant .slide-end { background: linear-gradient(135deg, #f57c00 0%, #e65100 100%); color: white; }
    .theme-vibrant .accent { color: #e65100; }
    .theme-vibrant .point-bullet { background: #e65100; }
    .theme-academic .slide-cover { background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%); color: white; }
    .theme-academic .slide-content { background: #fafafa; color: #1a1a2e; }
    .theme-academic .slide-content .slide-header { background: #1a237e; color: white; }
    .theme-academic .slide-summary { background: linear-gradient(135deg, #e8eaf6 0%, #fafafa 100%); color: #1a1a2e; }
    .theme-academic .slide-end { background: linear-gradient(135deg, #283593 0%, #1a237e 100%); color: white; }
    .theme-academic .accent { color: #283593; }
    .theme-academic .point-bullet { background: #283593; }
  </style>
</head>
<body>
  ${slidesHTML}
  <div class="controls">
    <button onclick="go(-1)">◀</button>
    <span class="counter" id="counter">1 / ${pptData.slides.length}</span>
    <button onclick="go(1)">▶</button>
  </div>
  <script>
    let idx = 0;
    const total = ${pptData.slides.length};
    const slides = document.querySelectorAll('.ppt-slide-wrapper');
    function show(i) {
      slides.forEach(s => s.classList.remove('active'));
      slides[i].classList.add('active');
      document.getElementById('counter').textContent = (i+1) + ' / ' + total;
    }
    function go(d) { idx = Math.max(0, Math.min(total-1, idx+d)); show(idx); }
    show(0);
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pptData.title || 'presentation'}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('HTML 文件已下载');
}

// ========================================
// Toast
// ========================================
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg transition-smooth z-50';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
  }, 2500);
}
