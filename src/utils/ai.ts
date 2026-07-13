const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = import.meta.env.ARK_API_KEY;
  const modelId = import.meta.env.ARK_MODEL_ID;

  if (!apiKey || !modelId) {
    callbacks.onError('API 配置缺失');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      callbacks.onError(`API 请求失败: ${response.status}`);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

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
            fullText += content;
            callbacks.onChunk(content);
          } catch {}
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (e: any) {
    callbacks.onError(e.message || '网络错误');
  }
}

export async function chatJSON(messages: ChatMessage[]): Promise<any> {
  const apiKey = import.meta.env.ARK_API_KEY;
  const modelId = import.meta.env.ARK_MODEL_ID;

  if (!apiKey || !modelId) {
    throw new Error('API 配置缺失');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  // Collect streamed response and parse as JSON
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
  let clean = fullContent.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  else if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  return JSON.parse(clean);
}
