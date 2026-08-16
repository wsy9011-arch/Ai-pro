"use client";

import { useMemo, useState } from "react";

type Offer = {
  vendor: string;
  price: number;
  badge?: string;
  benefit: string;
};

type Product = {
  id: number;
  city: string;
  category: string;
  title: string;
  subtitle: string;
  badge?: string;
  rating: number;
  reviews: number;
  image: string;
  offers: Offer[];
};

const destinations = [
  {
    name: "세부",
    en: "CEBU",
    image:
      "https://tourisme-monde.fr/wp-content/uploads/2025/01/activites_incontournables_a_cebu_8004.jpg",
    tagline: "호핑 · 캐녀닝 · 리조트",
  },
  {
    name: "보홀",
    en: "BOHOL",
    image:
      "https://i.natgeofe.com/n/9374480f-fe6c-489f-9dbd-5e7f43699271/philippines2_3x2.jpg",
    tagline: "초콜릿힐 · 발리카삭",
  },
  {
    name: "보라카이",
    en: "BORACAY",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    tagline: "화이트비치 · 선셋",
  },
  {
    name: "마닐라",
    en: "MANILA",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
    tagline: "시티투어 · 쇼핑 · 호텔",
  },
  {
    name: "팔라완",
    en: "PALAWAN",
    image:
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=85",
    tagline: "엘니도 · 라군 · 자연",
  },
];

const categories = [
  { label: "투어·액티비티", icon: "🤿" },
  { label: "호텔", icon: "🏨" },
  { label: "항공권", icon: "✈️" },
  { label: "공항픽업", icon: "🚐" },
  { label: "마사지", icon: "💆" },
  { label: "골프", icon: "⛳" },
];

const products: Product[] = [
  {
    id: 1,
    city: "세부",
    category: "투어·액티비티",
    title: "세부 호핑투어 올인원",
    subtitle: "스노클링 · 점심 · 픽드랍 포함",
    badge: "인기 1위",
    rating: 4.9,
    reviews: 328,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=85",
    offers: [
      { vendor: "세부블루투어", price: 54900, badge: "최저가", benefit: "픽드랍 무료" },
      { vendor: "오션세부", price: 57900, benefit: "수중사진 포함" },
      { vendor: "세부메이트", price: 59900, benefit: "한국인 가이드" },
    ],
  },
  {
    id: 2,
    city: "보홀",
    category: "투어·액티비티",
    title: "보홀 육상투어 핵심코스",
    subtitle: "초콜릿힐 · 안경원숭이 · 로복강",
    badge: "베스트",
    rating: 4.8,
    reviews: 214,
    image:
      "https://i.natgeofe.com/n/9374480f-fe6c-489f-9dbd-5e7f43699271/philippines2_3x2.jpg",
    offers: [
      { vendor: "보홀데이", price: 69900, badge: "최저가", benefit: "점심 포함" },
      { vendor: "보홀프렌즈", price: 72900, benefit: "단독 차량" },
      { vendor: "팡라오투어", price: 74900, benefit: "호텔 픽업" },
    ],
  },
  {
    id: 3,
    city: "세부",
    category: "공항픽업",
    title: "막탄공항 단독 픽업",
    subtitle: "우리 일행만 편하게 · 24시간",
    rating: 4.9,
    reviews: 541,
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=85",
    offers: [
      { vendor: "세부픽업", price: 21900, badge: "최저가", benefit: "24시간 운영" },
      { vendor: "막탄트랜스퍼", price: 23900, benefit: "카카오 안내" },
      { vendor: "세부밴", price: 24900, benefit: "대형 밴 선택" },
    ],
  },
  {
    id: 4,
    city: "보라카이",
    category: "투어·액티비티",
    title: "보라카이 선셋 세일링",
    subtitle: "화이트비치에서 즐기는 노을",
    badge: "추천",
    rating: 4.7,
    reviews: 167,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    offers: [
      { vendor: "보라카이온", price: 33900, badge: "최저가", benefit: "당일 예약 가능" },
      { vendor: "화이트비치투어", price: 36900, benefit: "사진 촬영" },
      { vendor: "보라선셋", price: 38900, benefit: "음료 포함" },
    ],
  },
  {
    id: 5,
    city: "마닐라",
    category: "호텔",
    title: "마닐라 베이 호텔 특가",
    subtitle: "조식 포함 · 무료 취소 가능",
    rating: 4.6,
    reviews: 93,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    offers: [
      { vendor: "필패스 호텔", price: 109000, badge: "최저가", benefit: "무료 취소" },
      { vendor: "마닐라스테이", price: 115000, benefit: "조식 2인" },
      { vendor: "베이호텔딜", price: 119000, benefit: "레이트 체크아웃" },
    ],
  },
  {
    id: 6,
    city: "세부",
    category: "마사지",
    title: "세부 프리미엄 스파",
    subtitle: "90분 마사지 · 픽드랍 선택",
    rating: 4.9,
    reviews: 389,
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
    offers: [
      { vendor: "세부힐링스파", price: 37900, badge: "최저가", benefit: "웰컴 드링크" },
      { vendor: "막탄스파", price: 39900, benefit: "픽업 선택" },
      { vendor: "필리핀릴렉스", price: 42900, benefit: "90분 아로마" },
    ],
  },
];

const money = new Intl.NumberFormat("ko-KR");

export default function Home() {
  const [city, setCity] = useState("전체");
  const [category, setCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [searched, setSearched] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products.filter((product) => {
      const cityMatch = city === "전체" || product.city === city;
      const categoryMatch = category === "전체" || product.category === category;
      const keywordMatch = !q || `${product.city} ${product.category} ${product.title} ${product.subtitle}`.toLowerCase().includes(q);
      return cityMatch && categoryMatch && keywordMatch;
    });
  }, [city, category, keyword]);

  function runSearch() {
    setSearched(true);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-xl font-black text-white shadow-lg shadow-blue-200">P</span>
            <div className="text-left">
              <p className="text-xl font-black tracking-[-0.04em] text-blue-700">필패스</p>
              <p className="-mt-1 text-[10px] font-bold tracking-[0.16em] text-slate-400">PHILPASS</p>
            </div>
          </button>
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            <a href="#destinations" className="transition hover:text-blue-600">지역</a>
            <a href="#products" className="transition hover:text-blue-600">투어·액티비티</a>
            <button className="transition hover:text-blue-600">호텔</button>
            <button className="transition hover:text-blue-600">항공권</button>
            <button className="transition hover:text-blue-600">여행정보</button>
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:block">로그인</button>
            <button
              type="button"
              onClick={() => (window.location.href = "/booking")}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              예약 확인
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white backdrop-blur">🇵🇭 필리핀 여행 전문 플랫폼</div>
            <h1 className="text-4xl font-black leading-[1.12] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
              필리핀 여행,<br />
              <span className="text-cyan-200">비교부터 예약까지 한 번에</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-blue-50 sm:text-lg">
              세부 · 보홀 · 보라카이 · 마닐라 · 팔라완의 투어, 호텔, 항공권, 픽업 상품을 한 곳에서 찾아보세요.
            </p>
          </div>

          <div className="mt-9 rounded-[28px] bg-white p-3 shadow-2xl shadow-blue-950/25 sm:p-4">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.5fr_auto]">
              <label className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">여행지역</span>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-black outline-none">
                  <option>전체</option>
                  {destinations.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </label>
              <label className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">상품유형</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-black outline-none">
                  <option>전체</option>
                  {categories.map((item) => <option key={item.label}>{item.label}</option>)}
                </select>
              </label>
              <label className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">검색</span>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="호핑투어, 호텔, 마사지..." className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300" />
              </label>
              <button type="button" onClick={runSearch} className="rounded-2xl bg-blue-600 px-7 py-4 text-sm font-black text-white transition hover:bg-blue-700">🔎 검색하기</button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-white/90">
            <span className="rounded-full bg-white/10 px-3 py-1.5">✓ 상품 비교</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">✓ 실제 후기</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">✓ 예약 한 번에</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-2 rounded-[28px] border border-white bg-white p-3 shadow-xl shadow-slate-200/70 sm:grid-cols-6 sm:p-4">
          {categories.map((item) => (
            <button key={item.label} type="button" onClick={() => { setCategory(item.label); setSearched(true); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="group rounded-2xl px-2 py-4 text-center transition hover:bg-blue-50">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition group-hover:bg-white">{item.icon}</span>
              <span className="mt-2 block text-xs font-black text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="destinations" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-blue-600">DESTINATIONS</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">어디로 떠나세요?</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">필리핀 인기 여행지를 바로 찾아보세요.</p>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {destinations.map((item) => (
            <button key={item.name} type="button" onClick={() => { setCity(item.name); setSearched(true); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="group relative min-h-52 overflow-hidden rounded-[26px] bg-slate-900 text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <img src={item.image} alt={`${item.name} 여행`} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
              <div className="relative flex min-h-52 flex-col justify-end p-5">
                <p className="text-[10px] font-black tracking-[0.2em] text-white/70">{item.en}</p>
                <p className="mt-1 text-2xl font-black text-white">{item.name}</p>
                <p className="mt-1 text-xs font-bold text-white/75">{item.tagline}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section id="products" className="scroll-mt-24 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-blue-600">BEST DEALS</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{searched ? "검색 결과" : "지금 인기 있는 필리핀 여행상품"}</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">여러 상품을 비교하고 나에게 맞는 여행을 골라보세요.</p>
            </div>
            {(city !== "전체" || category !== "전체" || keyword) && (
              <button type="button" onClick={() => { setCity("전체"); setCategory("전체"); setKeyword(""); setSearched(false); }} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">필터 초기화</button>
            )}
          </div>

          {filteredProducts.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const sortedOffers = [...product.offers].sort((a, b) => a.price - b.price);
                const cheapest = sortedOffers[0];

                return (
                  <article key={product.id} className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                      {product.badge && <span className="absolute left-4 top-4 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black text-white">{product.badge}</span>}
                      <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-slate-700 backdrop-blur">{product.city}</span>
                    </div>

                    <div className="p-5">
                      <p className="text-[11px] font-black text-blue-600">{product.category}</p>
                      <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-900">{product.title}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">{product.subtitle}</p>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-black text-amber-500">★ {product.rating}</span>
                          <span className="font-bold text-slate-400">후기 {money.format(product.reviews)}</span>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                          {sortedOffers.length}개 업체 비교
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-black tracking-wide text-slate-400">업체별 가격 비교</p>
                          <p className="text-[10px] font-bold text-slate-400">낮은 가격순</p>
                        </div>

                        <div className="space-y-2">
                          {sortedOffers.map((offer, index) => (
                            <div key={offer.vendor} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${index === 0 ? "border border-emerald-200 bg-emerald-50" : "bg-white"}`}>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-xs font-black text-slate-800">{offer.vendor}</p>
                                  {offer.badge && <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white">{offer.badge}</span>}
                                </div>
                                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{offer.benefit}</p>
                              </div>
                              <p className={`shrink-0 text-sm font-black ${index === 0 ? "text-emerald-700" : "text-slate-900"}`}>
                                {money.format(offer.price)}원
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">현재 최저가</p>
                          <p className="text-xl font-black text-slate-950">
                            {money.format(cheapest.price)}
                            <span className="ml-0.5 text-sm">원~</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/compare/${product.id}`;
                          }}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                        >
                          상세 비교
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <p className="text-4xl">🔎</p>
              <p className="mt-4 text-lg font-black text-slate-700">조건에 맞는 상품이 아직 없어요.</p>
              <p className="mt-2 text-sm font-medium text-slate-400">다른 지역이나 상품 유형으로 다시 검색해보세요.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-12">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-cyan-400">WHY PHILPASS</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">필리핀 여행, 발품 팔지 마세요.</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300">같은 여행상품을 가격, 포함사항, 후기까지 비교하고 예약하는 필리핀 전문 여행 플랫폼을 만들고 있습니다.</p>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 lg:mt-0 lg:min-w-[390px]">
            {[["01", "가격 비교"], ["02", "실제 후기"], ["03", "간편 예약"]].map(([number, label]) => (
              <div key={number} className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-cyan-300">{number}</p>
                <p className="mt-2 text-sm font-black">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <p className="text-xl font-black text-blue-700">필패스</p>
              <p className="mt-1 text-xs font-bold tracking-[0.12em] text-slate-400">PHILPASS · 필리핀 여행 패스</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
              <button>서비스 소개</button><button>입점 문의</button><button>이용약관</button><button>개인정보처리방침</button><button>고객센터</button>
            </div>
          </div>
          <p className="mt-8 text-[11px] leading-5 text-slate-400">현재 화면은 필패스 서비스 1차 개발용 데모입니다. 실제 판매 상품, 가격, 예약 및 결제 기능은 다음 단계에서 데이터베이스와 연결합니다.</p>
        </div>
      </footer>
    </main>
  );
}
