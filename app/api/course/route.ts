import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { tavily } from '@tavily/core'

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! })

async function searchPlaces(query: string, count: number = 6) {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const embedding = embeddingRes.data[0].embedding

  const { data, error } = await supabase.rpc('match_places', {
    query_embedding: embedding,
    match_count: count,
  })

  if (error) throw new Error(error.message)
  return data
}

async function searchCurrentEvents(query: string) {
  const result = await tvly.search(`성수동 ${query} 2026년 6월`, {
    maxResults: 5,
    includeAnswer: false,
    days: 30,
  })
  return result.results.map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    content: r.content.slice(0, 400),
  }))
}

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_places',
      description: '성수동의 카페, 식당, 바, 활동 장소를 RAG 데이터베이스에서 의미 기반으로 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 쿼리 (예: "분위기 좋은 데이트 저녁 식당")' },
          count: { type: 'number', description: '반환할 장소 수 (기본 6)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_current_events',
      description: '성수동에서 현재 진행 중인 팝업스토어, 전시회, 이벤트를 실시간 웹 검색으로 찾습니다.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색 쿼리 (예: "팝업스토어", "전시회", "이벤트")' },
        },
        required: ['query'],
      },
    },
  },
]

const JSON_FORMAT = `{
  "summary": "코스 한 줄 소개",
  "steps": [
    {
      "time": "14:00",
      "name": "장소명",
      "category": "카페",
      "emoji": "☕",
      "description": "이 장소 설명 및 추천 이유",
      "address": "주소",
      "google_maps_url": "http://place.map.kakao.com/아이디 또는 https://map.kakao.com/link/search/장소명",
      "tip": "방문 팁"
    }
  ],
  "total_budget": "예상 총 비용",
  "note": "추가 메모"
}`

const COMMON_RULES = (today: string) => `중요 규칙:
- search_current_events 결과에서 2026년 6월 현재 진행 중인 것만 포함하세요. 종료 날짜가 명시된 경우 ${today} 이전이면 절대 포함하지 마세요.
- 팝업/이벤트 스텝의 category는 반드시 정확히 "팝업" 으로 쓰세요 (팝업스토어 X).
- 팝업/이벤트 스텝의 google_maps_url은 search_current_events 결과의 실제 웹 URL(r.url)을 그대로 사용하세요.
- 카페/식당/바 등 일반 장소의 google_maps_url은 카카오맵 URL(http://place.map.kakao.com/아이디)을 사용하세요.
- 반드시 순수 JSON으로만 응답하세요 (마크다운 없이).`

export async function POST(req: NextRequest) {
  const { message, currentCourse } = await req.json()

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  let systemPrompt: string
  let userMessage: string

  if (currentCourse) {
    // 코스 수정 모드
    systemPrompt = `당신은 성수동 주말 코스 전문 AI입니다. 오늘 날짜는 ${today}입니다.

사용자가 기존 코스의 일부를 수정하길 원합니다. 사용자의 요청에 따라 해당 부분만 바꾸고 나머지는 유지하세요.
필요하면 search_places로 대체 장소를 검색하세요.

${COMMON_RULES(today)}

코스는 반드시 아래 JSON 형태로만 응답하세요:
${JSON_FORMAT}`

    userMessage = `현재 코스:\n${JSON.stringify(currentCourse, null, 2)}\n\n수정 요청: ${message}`
  } else {
    // 신규 코스 생성 모드
    systemPrompt = `당신은 성수동 주말 코스 전문 AI 챗봇입니다. 오늘 날짜는 ${today}입니다.

반드시 다음 순서로 진행하세요:
1. search_current_events로 현재 성수 팝업스토어/이벤트 검색 (팝업 포함 요청 시)
2. search_places로 조건에 맞는 장소 검색 (카페, 식당, 바 등 각각 검색)
3. 검색 결과를 바탕으로 코스 구성

${COMMON_RULES(today)}

코스는 반드시 아래 JSON 형태로만 응답하세요:
${JSON_FORMAT}`

    userMessage = `${message}\n\n(오늘 날짜: ${today}, 장소: 성수동)`
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  // Tool calling 루프
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    })

    const message = response.choices[0].message
    messages.push(message)

    if (response.choices[0].finish_reason === 'stop') {
      const content = message.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return NextResponse.json({ error: '코스 생성에 실패했습니다.' }, { status: 500 })
      }
      const course = JSON.parse(jsonMatch[0])
      return NextResponse.json({ course })
    }

    if (!message.tool_calls) break

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue
      const args = JSON.parse(toolCall.function.arguments)
      let result

      if (toolCall.function.name === 'search_places') {
        result = await searchPlaces(args.query, args.count)
      } else if (toolCall.function.name === 'search_current_events') {
        result = await searchCurrentEvents(args.query)
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  return NextResponse.json({ error: '코스 생성에 실패했습니다.' }, { status: 500 })
}
