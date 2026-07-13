import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { reportType, points, style, plan, problems, support } = body;

    const apiKey = import.meta.env.ARK_API_KEY || (locals as any).runtime?.env?.ARK_API_KEY;
    const modelId = import.meta.env.ARK_MODEL_ID || (locals as any).runtime?.env?.ARK_MODEL_ID;

    if (!apiKey || !modelId) {
      return new Response(JSON.stringify({ error: '请在 Cloudflare 环境变量中配置 ARK_API_KEY 和 ARK_MODEL_ID' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const typeMap: Record<string, string> = {
      weekly: '周报',
      monthly: '月报',
      quarterly: '季度工作总结',
      yearly: '年度工作总结'
    };

    const styleMap: Record<string, string> = {
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

    const typeDesc = typeMap[reportType] || '周报';
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
${points.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`;

    if (plan) userPrompt += `\n\n下期计划：\n${plan}`;
    if (problems) userPrompt += `\n\n遇到的问题：\n${problems}`;
    if (support) userPrompt += `\n\n需要的支持：\n${support}`;

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `AI 服务请求失败: ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stream response back
    const reader = response.body!.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += new TextDecoder().decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {}
              }
            }
          }
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
