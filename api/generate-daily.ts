import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────────

type Difficulty = 1 | 2 | 3

type QuizCategory =
  | 'indicator-words'
  | 'formal-logic'
  | 'argument-analysis'
  | 'flaw-detection'
  | 'assumption'
  | 'strengthen-weaken'
  | 'inference'

interface QuizQuestion {
  id: string
  category: QuizCategory
  difficulty: Difficulty
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface DailyChallenge {
  challenge_date: string
  category: string
  questions: QuizQuestion[]
  generated_by: string
}

// ── Category rotation (by day-of-week, 0 = Sunday) ────────────────────────────

const CATEGORY_ROTATION: Record<number, QuizCategory | 'all'> = {
  0: 'inference',           // Sunday
  1: 'assumption',          // Monday  (most tested LSAT type ~15%)
  2: 'strengthen-weaken',   // Tuesday
  3: 'inference',           // Wednesday
  4: 'flaw-detection',      // Thursday
  5: 'formal-logic',        // Friday
  6: 'argument-analysis',   // Saturday
}

const CATEGORY_LABELS: Record<string, string> = {
  'indicator-words':   'Indicator Words',
  'formal-logic':      'Formal Logic',
  'argument-analysis': 'Argument Analysis',
  'flaw-detection':    'Flaw Detection',
  'assumption':        'Assumption',
  'strengthen-weaken': 'Strengthen & Weaken',
  'inference':         'Inference',
  'all':               'All Topics',
}

// ── Claude prompt ──────────────────────────────────────────────────────────────

function buildPrompt(category: QuizCategory | 'all', dateStr: string): string {
  const seed = dateStr // Use date as implicit seed for variety

  const categoryInstructions: Record<string, string> = {
    'assumption': `Generate REQUIRED ASSUMPTION questions. Each presents a short argument and asks which answer choice is an assumption the argument depends on. The argument fails if the assumption is false. Easy: obvious logical gap. Medium: subtle unstated premise. Hard: complex argument with formal logic gap (contrapositive or quantifier-based).`,

    'strengthen-weaken': `Generate a MIX of STRENGTHEN and WEAKEN questions (5 strengthen, 5 weaken). Each presents an argument and asks which answer, if true, most strengthens OR weakens it. Label each clearly in the question stem. Easy: direct causal relationship. Medium: statistical/correlation reasoning. Hard: analogical reasoning or formal logic chain disruption.`,

    'inference': `Generate MUST BE TRUE / INFERENCE questions. Each presents premises and asks what MUST logically follow. Easy: simple conditional deduction. Medium: combining 2-3 premises. Hard: formal logic — use contrapositive chains (P→Q therefore ¬Q→¬P), quantifier reasoning (All X are Y; Some Z are X; therefore some Z are Y), or biconditional traps. Reference Open Logic Project principles.`,

    'flaw-detection': `Generate IDENTIFY THE FLAW questions. Each presents a flawed argument and asks which answer describes the reasoning error. Include: hasty generalization, false dichotomy, ad hominem, appeal to authority, circular reasoning, correlation/causation, and formal fallacies. Hard: subtle formal logic errors.`,

    'formal-logic': `Generate FORMAL LOGIC questions testing conditional reasoning, contrapositives, and argument validity. Hard questions should use: transitive conditionals (A→B, B→C), biconditionals (A↔B), quantifier logic (All/Some/None), and negation (¬). Use standard LSAT notation conventions.`,

    'argument-analysis': `Generate ARGUMENT STRUCTURE questions testing ability to identify conclusions, premises, and the role of statements. Include: Main Point, Role of Statement, Method of Reasoning, and Point at Issue question types.`,

    'indicator-words': `Generate questions testing recognition of logical indicator words. Premise indicators (because, since, given that, as evidenced by), conclusion indicators (therefore, thus, hence, consequently, it follows that), and contrast indicators (however, although, but, yet).`,

    'all': `Generate a MIXED SET of LSAT Logical Reasoning questions across all types. Include: 2 Assumption, 2 Strengthen/Weaken, 2 Inference/Must Be True, 2 Flaw Detection, 1 Formal Logic, 1 Argument Analysis. Vary difficulty across the 10 questions.`,
  }

  const instruction = categoryInstructions[category] || categoryInstructions['all']

  return `You are generating a single HARD LSAT Logical Reasoning question for date ${seed}.

Category: ${CATEGORY_LABELS[category] || category}
Instructions: ${instruction}

Generate exactly 1 question in this JSON format (no markdown, just a raw JSON array with one item):
[
  {
    "id": "daily-${dateStr}-1",
    "category": "${category === 'all' ? 'flaw-detection' : category}",
    "difficulty": 3,
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]

Requirements:
- Exactly 1 question, difficulty 3 (hard)
- This must be the hardest possible LSAT question for this category — graduate-level reasoning
- Use a realistic argumentative passage (3-5 sentences) with subtle logical traps
- Each question has EXACTLY 4 options (A, B, C, D)
- correctIndex is 0-3 (0=A, 1=B, 2=C, 3=D)
- All 4 options must be highly plausible — each wrong answer should exploit a specific LSAT trap
- Explanation must: (1) explain WHY the correct answer is right, (2) explain why each wrong answer fails
- Use formal logic where applicable: contrapositives, quantifier chains, biconditionals
- The question must be original and would appear on an actual scored LSAT section
- Do NOT include question numbers or letters in the question text itself

Return ONLY the JSON array. No preamble, no explanation, no markdown code blocks.`
}

// ── Main handler ───────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for same-origin calls from the frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Today's date (UTC) ──────────────────────────────────────────────────────
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const dayOfWeek = now.getUTCDay()
  const category = CATEGORY_ROTATION[dayOfWeek] ?? 'assumption'

  // ── Supabase admin client (bypasses RLS to insert) ──────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // ── Check if today's challenge already exists ───────────────────────────────
  const { data: existing, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('challenge_date', todayStr)
    .maybeSingle()

  if (fetchError) {
    console.error('Supabase fetch error:', fetchError)
    return res.status(500).json({ error: 'Database error' })
  }

  if (existing) {
    // Already generated — return cached result
    return res.status(200).json({
      date: todayStr,
      category: existing.category,
      questions: existing.questions,
      cached: true,
    })
  }

  // ── Generate via Claude API ─────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })
  }

  const anthropic = new Anthropic({ apiKey })

  let questions: QuizQuestion[]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: buildPrompt(category as QuizCategory | 'all', todayStr),
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown code fences
    const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    questions = JSON.parse(jsonText) as QuizQuestion[]

    // Validate shape
    if (!Array.isArray(questions) || questions.length < 1) {
      throw new Error(`Expected array of questions, got: ${typeof questions}`)
    }
    // Take only the first question (daily is 1 hard question)
    questions = [questions[0]]

    // Ensure IDs are unique per day
    questions = questions.map((q, i) => ({
      ...q,
      id: `daily-${todayStr}-${i + 1}`,
      // Normalize category for 'all' mode (Claude might vary the category field)
      category: (category === 'all' ? q.category : category) as QuizCategory,
    }))

  } catch (err) {
    console.error('Claude API or parse error:', err)
    return res.status(500).json({ error: 'Failed to generate questions', detail: String(err) })
  }

  // ── Store in Supabase ───────────────────────────────────────────────────────
  const challenge: DailyChallenge = {
    challenge_date: todayStr,
    category: category as string,
    questions,
    generated_by: 'claude-haiku-4-5',
  }

  const { error: insertError } = await supabase
    .from('daily_challenges')
    .insert(challenge)

  if (insertError) {
    // Non-fatal: could be a race condition (another request already inserted)
    console.warn('Insert warning (possible race):', insertError.message)
  }

  return res.status(200).json({
    date: todayStr,
    category,
    questions,
    cached: false,
  })
}
