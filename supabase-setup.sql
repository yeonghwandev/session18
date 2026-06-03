-- 1. pgvector 확장 활성화
create extension if not exists vector with schema extensions;

-- 2. places 테이블 생성
create table if not exists places (
  id bigserial primary key,
  name text not null,
  category text not null,
  description text not null,
  price_range text not null,
  vibe text[] not null default '{}',
  address text,
  google_maps_url text,
  embedding vector(1536)
);

-- 3. 벡터 검색 함수
create or replace function match_places(
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id bigint,
  name text,
  category text,
  description text,
  price_range text,
  vibe text[],
  address text,
  google_maps_url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.category,
    p.description,
    p.price_range,
    p.vibe,
    p.address,
    p.google_maps_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from places p
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
