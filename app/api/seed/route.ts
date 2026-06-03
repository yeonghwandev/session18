import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

const KAKAO_API_KEY = process.env.KAKAO_API_KEY!

type KakaoPlace = {
  id: string
  place_name: string
  category_name: string
  category_group_name: string
  address_name: string
  road_address_name: string
  phone: string
  place_url: string
  x: string
  y: string
}

async function kakaoSearch(keyword: string, page = 1): Promise<KakaoPlace[]> {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', keyword)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', '15')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
  })
  const data = await res.json()
  return data.documents ?? []
}

function mapCategory(categoryName: string): string {
  if (categoryName.includes('카페') || categoryName.includes('커피')) return '카페'
  if (categoryName.includes('주점') || categoryName.includes('바') || categoryName.includes('술')) return '바'
  if (categoryName.includes('음식') || categoryName.includes('식당') || categoryName.includes('맛집')) return '식당'
  if (categoryName.includes('문화') || categoryName.includes('전시') || categoryName.includes('공원')) return '활동'
  if (categoryName.includes('쇼핑') || categoryName.includes('편의')) return '쇼핑'
  return '식당'
}

async function generateDescription(place: KakaoPlace): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `성수동 장소 정보를 보고 2-3문장의 자연스러운 한국어 소개글을 써줘. 분위기, 특징, 어떤 상황에 좋은지 포함해.

장소명: ${place.place_name}
카테고리: ${place.category_name}
주소: ${place.road_address_name || place.address_name}

소개글만 출력해 (JSON 없이):`,
      },
    ],
    max_tokens: 150,
  })
  return res.choices[0].message.content?.trim() ?? place.category_name
}

export async function POST() {
  try {
    // 기존 데이터 삭제
    await supabaseAdmin.from('places').delete().neq('id', 0)

    const keywords = [
      '성수동 카페',
      '성수동 맛집',
      '성수동 술집',
      '성수동 브런치',
      '성수동 바',
    ]

    // 카카오 검색 (키워드별 2페이지)
    const allPlaces: KakaoPlace[] = []
    const seenIds = new Set<string>()

    for (const keyword of keywords) {
      for (const page of [1, 2]) {
        const results = await kakaoSearch(keyword, page)
        for (const p of results) {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id)
            allPlaces.push(p)
          }
        }
      }
    }

    const results = []

    for (const place of allPlaces) {
      try {
        const description = await generateDescription(place)
        const category = mapCategory(place.category_name)
        const address = place.road_address_name || place.address_name
        const mapUrl = place.place_url

        const embeddingText = `${place.place_name} ${category} ${description} ${address}`
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: embeddingText,
        })
        const embedding = embeddingRes.data[0].embedding

        const { error } = await supabaseAdmin.from('places').insert({
          name: place.place_name,
          category,
          description,
          price_range: '미정',
          vibe: [],
          address,
          google_maps_url: mapUrl,
          embedding,
        })

        results.push({ name: place.place_name, status: error ? 'error' : 'ok', error: error?.message })
      } catch (e) {
        results.push({ name: place.place_name, status: 'error', error: String(e) })
      }
    }

    const ok = results.filter((r) => r.status === 'ok').length
    return NextResponse.json({ success: true, total: allPlaces.length, inserted: ok, results })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
