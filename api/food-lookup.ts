import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { foodName } = req.body ?? {};
  if (!foodName || typeof foodName !== 'string') {
    return res.status(400).json({ error: 'foodName is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API not configured on server' });
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content: 'You are a nutritionist database. Always respond with ONLY a valid JSON object, no markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Return nutritional info for: "${foodName}".

Use this exact JSON structure:
{
  "name": "Full descriptive name with serving size",
  "calories": <number>,
  "glycemicIndex": <number 0-100>,
  "glycemicLoad": <number>,
  "carbs": <number in grams>,
  "protein": <number in grams>,
  "fat": <number in grams>,
  "servingSize": "standard serving description"
}

Use a standard serving size. If glycemic index is not applicable (pure protein/fat), use 0.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return res.status(500).json({ error: 'Could not parse AI response' });

  try {
    const data = JSON.parse(match[0]);
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Invalid JSON from AI' });
  }
}
