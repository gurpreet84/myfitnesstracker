import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { profile, recentFood, recentWorkout, recentWeight, recentGlucose, recentMood, question } = req.body ?? {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API not configured on server' });

  const client = new Anthropic({ apiKey });

  const parts: string[] = [];

  if (profile) {
    parts.push(`## User Profile
Name: ${profile.name}, Age: ${profile.age}, Gender: ${profile.gender}
Height: ${profile.height}cm | Current: ${profile.currentWeight}kg | Target: ${profile.targetWeight}kg
Activity: ${profile.activityLevel} | Calorie goal: ${profile.dailyCalorieGoal} kcal/day`);
  }

  if (recentFood?.length) {
    const rows = recentFood.slice(-20).map((e: any) =>
      `${e.date} [${e.mealType}] ${e.name} — ${e.calories} kcal | P:${e.protein}g C:${e.carbs}g F:${e.fat}g`
    ).join('\n');
    parts.push(`## Recent Food Entries (last 20)\n${rows}`);
  }

  if (recentWorkout?.length) {
    const rows = recentWorkout.slice(-10).map((e: any) =>
      `${e.date}: ${e.name} ${e.duration}min, ${e.caloriesBurned} kcal burned [${e.intensity}]`
    ).join('\n');
    parts.push(`## Recent Workouts\n${rows}`);
  }

  if (recentWeight?.length) {
    const sorted = [...recentWeight].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const oldest = sorted[0];
    const delta = latest.weight - oldest.weight;
    parts.push(`## Weight\nLatest: ${latest.weight}kg on ${latest.date} | Change over period: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}kg`);
  }

  if (recentGlucose?.length) {
    const rows = recentGlucose.slice(-10).map((e: any) =>
      `${e.date} ${e.time} [${e.context}]: ${e.value} mg/dL`
    ).join('\n');
    parts.push(`## Recent Glucose Readings\n${rows}`);
  }

  if (recentMood?.length) {
    const latest = recentMood[recentMood.length - 1];
    parts.push(`## Latest Mood Check-in\nMood: ${latest.mood}/5, Energy: ${latest.energy}/5 on ${latest.date}${latest.notes ? ` — "${latest.notes}"` : ''}`);
  }

  const system = `You are an expert health and fitness coach with deep knowledge in nutrition, exercise physiology, glucose management, sleep science, and behavioral change. You have real access to this user's health data shown below.

Give warm, specific, data-driven advice. Reference actual numbers and patterns from their data. Keep responses concise — 2-4 paragraphs maximum. No bullet-point lists; write in a natural coaching voice. Use one or two emojis for warmth, not more. If you notice something concerning (e.g., high glucose, prolonged deficit, no workouts), mention it gently.

${parts.join('\n\n')}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: question || 'Give me a personalized health insight based on my data today.' }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
