import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Sparkles } from 'lucide-react';
import type { FoodEntry, WorkoutEntry, WeightEntry, GlucoseEntry, UserProfile, MoodEntry } from '../types';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  glucoseEntries: GlucoseEntry[];
  moodEntries: MoodEntry[];
  profile: UserProfile | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const STARTERS = [
  'How am I doing this week?',
  'What should I eat for more energy?',
  'Analyse my glucose patterns',
  'Am I on track for my weight goal?',
  'Suggest a workout for today',
  'How can I improve my macros?',
];

export default function AICoach({ foodEntries, workoutEntries, weightEntries, glucoseEntries, moodEntries, profile }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: '', streaming: true },
    ]);

    try {
      const res = await fetch('/api/health-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          recentFood:    foodEntries.slice(-30),
          recentWorkout: workoutEntries.slice(-20),
          recentWeight:  weightEntries.slice(-10),
          recentGlucose: glucoseEntries.slice(-20),
          recentMood:    moodEntries.slice(-7),
          question: q,
        }),
      });

      const data = await res.json();
      const reply = data.error
        ? `⚠️ ${data.error}`
        : (data.text || 'No response received.');

      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') { last.content = reply; delete last.streaming; }
        return next;
      });
    } catch (err: any) {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          last.content = `⚠️ Could not reach the AI Coach. Check your internet connection.`;
          delete last.streaming;
        }
        return next;
      });
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400, gap: 0 }}>
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 0 16px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, paddingTop: 40 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={32} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Your AI Health Coach</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 320 }}>
                Powered by Claude Opus — analysing your real nutrition, workout, glucose and mood data.
              </div>
            </div>

            {!profile && (
              <div style={{
                background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#fbbf24', maxWidth: 320, textAlign: 'center',
              }}>
                Complete your profile for better personalised advice.
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'var(--card2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--blue)'; (e.target as HTMLElement).style.color = 'var(--blue)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text2)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="chat-bubble-user">{msg.content}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--blue), var(--purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                  }}>
                    <Bot size={15} color="#fff" />
                  </div>
                  <div className="chat-bubble-ai">
                    {msg.content || (msg.streaming && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)' }}>
                        <Loader2 size={13} className="spin" /> Thinking…
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="card" style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
        <Sparkles size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          className="inp"
          style={{ border: 'none', background: 'transparent', padding: '6px 0', flex: 1 }}
          placeholder="Ask your health coach anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn btn-primary"
          style={{ padding: '8px 12px', flexShrink: 0 }}
        >
          {loading ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
