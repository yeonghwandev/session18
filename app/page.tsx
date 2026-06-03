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
}

type ConvStep = 'companion' | 'budget' | 'vibe' | 'popup' | 'generating' | 'done'

const QUESTIONS: Record<ConvStep, { text: string; chips: string[] }> = {
  companion: {
    text: '안녕하세요! 성수동 주말 코스 AI예요 🗺️\n누구랑 가시나요?',
    chips: ['연인과 둘이', '친구들이랑', '혼자'],
  },
  budget: {
    text: '좋아요! 1인 예산은 어떻게 되세요?',
    chips: ['1만원대', '3만원대', '5만원+'],
  },
  vibe: {
    text: '어떤 분위기를 원하세요?',
    chips: ['핫플 위주', '감성적인', '조용한', '활동적인'],
  },
  popup: {
    text: '성수에는 정말 다양한 팝업들이 열리고 있어요!\n팝업도 넣어드릴까요?',
    chips: ['네, 넣어주세요!', '아니요, 괜찮아요'],
  },
  generating: { text: '', chips: [] },
  done: { text: '', chips: [] },
}

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
    { role: 'assistant', text: QUESTIONS.companion.text },
  ])
  const [convStep, setConvStep] = useState<ConvStep>('companion')
  const [collected, setCollected] = useState({ companion: '', budget: '', vibe: '', popup: '' })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleAnswer = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', text }
    setMessages((prev) => [...prev, userMsg])

    if (convStep === 'companion') {
      const next = { ...collected, companion: text }
      setCollected(next)
      setConvStep('budget')
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', text: QUESTIONS.budget.text }])
      }, 400)

    } else if (convStep === 'budget') {
      const next = { ...collected, budget: text }
      setCollected(next)
      setConvStep('vibe')
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', text: QUESTIONS.vibe.text }])
      }, 400)

    } else if (convStep === 'vibe') {
      const next = { ...collected, vibe: text }
      setCollected(next)
      setConvStep('popup')
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', text: QUESTIONS.popup.text }])
      }, 400)

    } else if (convStep === 'popup') {
      const next = { ...collected, popup: text }
      setCollected(next)
      setConvStep('generating')
      setLoading(true)
      setLoadingStep(0)

      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', text: '잠깐만요! 최적의 코스를 찾아드릴게요 ✨' }])
      }, 400)

      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
      }, 2500)

      const wantPopup = text.includes('네') || text.toLowerCase().includes('y')
      try {
        const message = `${next.companion}, 예산 ${next.budget}, ${next.vibe} 분위기로 성수동 주말 코스 짜줘${wantPopup ? '. 현재 진행중인 팝업스토어도 꼭 포함해줘.' : '. 팝업은 빼고 카페, 식당, 바 위주로 짜줘.'}`
        const res = await fetch('/api/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        const data = await res.json()
        if (data.course) {
          setMessages((prev) => [...prev, { role: 'assistant', course: data.course }])
          setMessages((prev) => [...prev, { role: 'assistant', text: '다른 코스가 필요하면 아래 버튼을 눌러주세요!' }])
          setConvStep('done')
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', text: '코스 생성에 실패했어요. 다시 시도해주세요.' }])
          setConvStep('vibe')
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', text: '오류가 발생했어요. 다시 시도해주세요.' }])
        setConvStep('vibe')
      } finally {
        clearInterval(interval)
        setLoading(false)
      }
    }
  }

  const handleRestart = () => {
    setMessages([{ role: 'assistant', text: QUESTIONS.companion.text }])
    setConvStep('companion')
    setCollected({ companion: '', budget: '', vibe: '', popup: '' })
    setInput('')
  }

  const currentChips = convStep !== 'generating' && convStep !== 'done'
    ? QUESTIONS[convStep].chips
    : []

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

      {/* 다시하기 버튼 */}
      {convStep === 'done' && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={handleRestart}
              className="w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              🔄 처음부터 다시 하기
            </button>
          </div>
        </div>
      )}

      {/* 빠른 선택 칩 */}
      {currentChips.length > 0 && !loading && (
        <div className="px-4 pb-2">
          <div className="mx-auto max-w-2xl flex gap-2 flex-wrap">
            {currentChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleAnswer(chip)}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      {convStep !== 'done' && (
        <div className="border-t border-zinc-800 px-4 py-4 flex-shrink-0">
          <div className="mx-auto max-w-2xl flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnswer(input)}
              placeholder={
                convStep === 'companion' ? '예) 연인이랑, 친구 3명이랑...' :
                convStep === 'budget' ? '예) 3만원대, 5만원 정도...' :
                convStep === 'vibe' ? '예) 감성적인, 핫플 위주...' : ''
              }
              disabled={loading}
              className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
            />
            <button
              onClick={() => handleAnswer(input)}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
