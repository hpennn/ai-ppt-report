import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { topic, pageCount, style, description, step } = body;

    // Get API credentials
    const apiKey = import.meta.env.ARK_API_KEY || (locals as any).runtime?.env?.ARK_API_KEY;
    const modelId = import.meta.env.ARK_MODEL_ID || (locals as any).runtime?.env?.ARK_MODEL_ID;

    if (!apiKey || !modelId) {
      return new Response(JSON.stringify({ error: '请在 Cloudflare 环境变量中配置 ARK_API_KEY 和 ARK_MODEL_ID' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const styleMap: Record<string, string> = {
      business: '商务简约风格，沉稳专业，适合正式场合',
      tech: '科技蓝色风格，现代感强，适合技术/互联网行业',
      fresh: '清新绿色风格，自然活力，适合创意/环保/健康主题',
      vibrant: '活力橙色风格，热情积极，适合营销/团建/活动',
      academic: '学术风格，严谨规范，适合学术/教育/研究场景'
    };

    const styleDesc = styleMap[style] || styleMap.business;

    let systemPrompt: string;
    let userPrompt: string;

    if (step === 'outline') {
      systemPrompt = `你是一个专业的 PPT 策划师。根据用户提供的主题和要求，生成 PPT 大纲。
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

      userPrompt = `请为以下主题生成 PPT 大纲：
主题：${topic}
页数：${pageCount}页
风格：${styleDesc}
额外要求：${description || '无'}`;
    } else {
      systemPrompt = `你是一个专业的 PPT 内容策划师。根据已确认的大纲，为每一页生成详细内容。
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

      userPrompt = `请根据以下大纲生成详细的 PPT 内容：
${JSON.stringify(body.outline)}

风格：${styleDesc}
要求：输出完整的 JSON 格式内容`;
    }

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
      return new Response(JSON.stringify({ error: `AI 服务请求失败: ${response.status}`, detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Collect streamed response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            fullContent += content;
          } catch {}
        }
      }
    }

    // Clean up potential markdown code block wrappers
    let cleanContent = fullContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    try {
      const parsed = JSON.parse(cleanContent);
      return new Response(JSON.stringify(parsed), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'AI 返回内容解析失败', raw: cleanContent.slice(0, 500) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
