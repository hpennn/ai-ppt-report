import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt, style } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = import.meta.env.ARK_API_KEY;
    const modelId = import.meta.env.ARK_MODEL_ID;

    if (!apiKey || !modelId) {
      return new Response(JSON.stringify({ error: 'API configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
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
          { role: 'user', content: prompt }
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `API request failed: ${response.status}`, details: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a transform stream for SSE
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Process the upstream SSE stream and forward it
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                await writer.write(encoder.encode(`data: [DONE]\n\n`));
                continue;
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content || '';
                if (delta) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
        // Ensure DONE is sent
        await writer.write(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        // Send error as SSE event
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
      } finally {
        try {
          await writer.close();
        } catch {}
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
