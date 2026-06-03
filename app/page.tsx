'use client'

import { useState, useRef, useEffect } from 'react'

type CourseStep = {
  time: string
  name: string
  category: string
  emoji: string
  description: string
  address: string
  google_maps_url: string
  tip: string
}

type Course = {
  summary: string
  steps: CourseStep[]
  total_budget: string
  note: string
}

type Message = {
  role: 'user' | 'assistant'
  text?: string
  course?: Course
  loading?: boolean
}

const SUGGESTIONS = [
  '연인이랑 감성적인 저녁 코스 짜줘',
  '친구들이랑 핫플 위주로 3만원대',
  '혼자 조용히 즐길 수 있는 코스',
  '팝업스토어 포함한 데이트 코스',
]

const LOADING_STEPS = [
  '🔍 성수동 최신 팝업 검색 중...',
  '📍 장소 데이터 분석 중...',
  '✨ 코스 구성 중...',
]

function CourseCard({ course }: { course: Course }) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      카페: 'bg-amber-900/50 text-amber-300',
      식당: 'bg-orange-900/50 text-orange-300',
      바: 'bg-purple-900/50 text-purple-300',
      활동: 'bg-green-900/50 text-green-300',
      쇼핑: 'bg-pink-900/50 text-pink-300',
      팝업: 'bg-blue-900/50 text-blue-300',
    }
    return colors[category] || 'bg-zinc-800 text-zinc-300'
  }

  return (
    <div className="space-y-3 mt-2">
      <div className="rounded-xl bg-zinc-800 px-4 py-3">
        <p className="font-semibold text-white">{course.summary}</p>
        <p className="mt-1 text-xs text-zinc-400">💰 {course.total_budget} · 📍 성수동</p>
      </div>
      {course.steps.map((step, i) => (
        <div key={i} className="rounded-xl bg-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{step.emoji}</span>
            <span className="text-xs font-mono text-zinc-500">{step.time}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor(step.category)}`}>
              {step.category}
            </span>
          </div>
          <p className="font-semibold text-white">{step.name}</p>
          <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{step.description}</p>
          {step.tip && <p className="mt-1 text-xs text-zinc-500">💡 {step.tip}</p>}
          <p className="mt-1 text-xs text-zinc-500">📍 {step.address}</p>
          {step.google_maps_url && (
            <a
              href={step.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              {step.category.includes('팝업') ? '🔗 자세히 보기' : '🗺️ 카카오맵'}
            </a>
          )}
        </div>
      ))}
      {course.note && (
        <p className="text-xs text-zinc-500 px-1">📝 {course.note}</p>
      )}
    </div>
  )
}

function LoadingBubble({ step }: { step: number }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm flex-shrink-0">🗺️</div>
      <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3 max-w-xs space-y-2">
        {LOADING_STEPS.map((msg, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${i <= step ? 'text-white' : 'text-zinc-600'}`}>
            <span>{i < step ? '✅' : i === step ? '⏳' : '○'}</span>
            <span>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: '안녕하세요! 성수동 주말 코스 AI예요 🗺️\n\n어떤 코스를 원하시나요? 누구랑, 예산, 분위기를 알려주시면 지금 뜨는 팝업까지 포함해서 짜드릴게요.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    setLoadingStep(0)

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
    }, 2500)

    try {
      const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (data.course) {
        setMessages((prev) => [...prev, { role: 'assistant', course: data.course }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: '코스 생성에 실패했어요. 다시 시도해주세요.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: '오류가 발생했어요. 다시 시도해주세요.' }])
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-4 flex-shrink-0">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">🗺️</div>
          <div>
            <p className="font-semibold text-sm">성수동 코스 AI</p>
            <p className="text-xs text-zinc-500">RAG + 실시간 팝업 검색</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm flex-shrink-0">🗺️</div>
              )}
              <div className={`max-w-sm lg:max-w-lg ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.text && (
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-white text-zinc-900 rounded-tr-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
                {msg.course && <CourseCard course={msg.course} />}
              </div>
            </div>
          ))}

          {loading && <LoadingBubble step={loadingStep} />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-3">
          <div className="mx-auto max-w-2xl flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="flex-shrink-0 rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4 flex-shrink-0">
        <div className="mx-auto max-w-2xl flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="어떤 코스를 원하시나요?"
            disabled={loading}
            className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}
