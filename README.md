# AI PPT / 工作汇报生成器 ✨

一站式 AI 演示文稿和工作汇报生成工具，覆盖 PPT 演示文稿生成和工作汇报撰写两大场景。

## 🚀 技术栈

- **框架**: Astro + Tailwind CSS (CDN)
- **部署**: Cloudflare Pages
- **AI**: 火山引擎 ARK API (豆包)
- **域名**: ppt.hpenn.xyz

## 📦 功能模块

| 模块 | 说明 |
|---|---|
| 📊 AI PPT 生成 | 输入主题，AI 生成完整演示文稿，支持全屏演示、多主题切换、导出 HTML |
| 📝 工作汇报生成器 | 支持周报/月报/季度总结/年度总结，5 种表达风格，可导出 Markdown/Word |

### PPT 生成特性
- 🎨 5 种专业配色主题（商务简约/科技蓝/清新绿/活力橙/学术风）
- 📐 AI 生成大纲 → 用户确认 → 生成完整 PPT
- 🖥️ 全屏演示模式（F 键进入，ESC 退出，方向键翻页）
- 📄 导出为独立 HTML 文件，可直接用浏览器打开演示
- 🌊 流式输出，逐步展示每一页内容

### 工作汇报特性
- 📋 4 种汇报类型：周报/月报/季度总结/年度总结
- ✍️ 5 种表达风格：结构化/自然表达/向上管理/OKR/STAR
- 📑 支持一键复制、导出 Markdown/Word
- 🖨️ 打印友好样式
- ✏️ 生成后可直接编辑修改
- 🔄 可切换风格重新生成

## 🔧 本地开发

```bash
npm install
npm run dev
```

## 🌐 部署到 Cloudflare Pages

1. Fork 本项目
2. 在 Cloudflare Dashboard 创建 Pages 项目，连接 GitHub 仓库
3. 设置环境变量：
   - `ARK_API_KEY` - 火山引擎 ARK API Key
   - `ARK_MODEL_ID` - 模型 Endpoint ID
4. 构建配置：
   - Build command: `npm run build`
   - Output directory: `dist`

## ⚙️ 环境变量

| 变量名 | 说明 |
|---|---|
| `ARK_API_KEY` | 火山引擎 ARK API Key |
| `ARK_MODEL_ID` | 模型 Endpoint ID |

## 📄 License

MIT
