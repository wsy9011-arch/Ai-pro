"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type VendorOffer = {
  id: string;
  vendor: string;
  price: number;
  rating: number;
  reviews: number;
  response: string;
  benefit: string;
  included: string[];
  excluded: string[];
  cancelPolicy: string;
  badge?: string;
};

type ProductDetail = {
  id: number;
  city: string;
  category: string;
  title: string;
  subtitle: string;
  image: string;
  rating: number;
  reviews: number;
  duration: string;
  meeting: string;
  description: string;
  offers: VendorOffer[];
};

const products: ProductDetail[] = [
  {
    id: 1,
    city: "세부",
    category: "투어·액티비티",
    title: "세부 호핑투어 올인원",
    subtitle: "스노클링 · 점심 · 픽드랍 포함",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=88",
    rating: 4.9,
    reviews: 328,
    duration: "약 7시간",
    meeting: "막탄 주요 호텔 픽업",
    description:
      "세부에서 인기 있는 호핑투어를 업체별 가격, 포함사항, 후기, 취소규정까지 한눈에 비교해보세요.",
    offers: [
      {
        id: "cebu-blue",
        vendor: "세부블루투어",
        price: 54900,
        rating: 4.9,
        reviews: 186,
        response: "평균 5분 이내",
        benefit: "픽드랍 무료",
        badge: "최저가",
        included: ["왕복 픽드랍", "스노클링 장비", "현지식 점심", "구명조끼", "생수"],
        excluded: ["개인 경비", "매너팁", "수중 촬영 옵션"],
        cancelPolicy: "이용 3일 전까지 무료 취소",
      },
      {
        id: "ocean-cebu",
        vendor: "오션세부",
        price: 57900,
        rating: 4.8,
        reviews: 94,
        response: "평균 10분 이내",
        benefit: "수중사진 포함",
        included: ["왕복 픽드랍", "스노클링 장비", "점심", "수중사진", "간식"],
        excluded: ["개인 경비", "매너팁"],
        cancelPolicy: "이용 5일 전까지 무료 취소",
      },
      {
        id: "cebu-mate",
        vendor: "세부메이트",
        price: 59900,
        rating: 4.9,
        reviews: 48,
        response: "평균 15분 이내",
        benefit: "한국인 가이드",
        included: ["왕복 픽드랍", "한국인 가이드", "스노클링 장비", "점심", "생수"],
        excluded: ["개인 경비", "매너팁", "촬영 옵션"],
        cancelPolicy: "이용 7일 전까지 무료 취소",
      },
    ],
  },
  {
    id: 2,
    city: "보홀",
    category: "투어·액티비티",
    title: "보홀 육상투어 핵심코스",
    subtitle: "초콜릿힐 · 안경원숭이 · 로복강",
    image:
      "https://i.natgeofe.com/n/9374480f-fe6c-489f-9dbd-5e7f43699271/philippines2_3x2.jpg",
    rating: 4.8,
    reviews: 214,
    duration: "약 8시간",
    meeting: "팡라오 주요 호텔 픽업",
    description:
      "보홀 대표 명소를 하루에 둘러보는 육상투어를 업체별 조건으로 비교해보세요.",
    offers: [
      {
        id: "bohol-day",
        vendor: "보홀데이",
        price: 69900,
        rating: 4.8,
        reviews: 108,
        response: "평균 8분 이내",
        benefit: "점심 포함",
        badge: "최저가",
        included: ["호텔 픽업", "전용 차량", "입장료", "현지식 점심"],
        excluded: ["개인 경비", "매너팁"],
        cancelPolicy: "이용 3일 전까지 무료 취소",
      },
      {
        id: "bohol-friends",
        vendor: "보홀프렌즈",
        price: 72900,
        rating: 4.9,
        reviews: 72,
        response: "평균 12분 이내",
        benefit: "단독 차량",
        included: ["호텔 픽업", "단독 차량", "입장료", "생수"],
        excluded: ["점심", "개인 경비"],
        cancelPolicy: "이용 5일 전까지 무료 취소",
      },
      {
        id: "panglao-tour",
        vendor: "팡라오투어",
        price: 74900,
        rating: 4.7,
        reviews: 34,
        response: "평균 20분 이내",
        benefit: "호텔 픽업",
        included: ["왕복 픽업", "입장료", "가이드", "생수"],
        excluded: ["점심", "개인 경비", "매너팁"],
        cancelPolicy: "이용 7일 전까지 무료 취소",
      },
    ],
  },
  {
    id: 3,
    city: "세부",
    category: "공항픽업",
    title: "막탄공항 단독 픽업",
    subtitle: "우리 일행만 편하게 · 24시간",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=88",
    rating: 4.9,
    reviews: 541,
    duration: "약 30~60분",
    meeting: "막탄 세부 국제공항",
    description:
      "공항 도착 후 숙소까지 편하게 이동하는 단독 픽업 서비스를 비교해보세요.",
    offers: [
      {
        id: "cebu-pickup",
        vendor: "세부픽업",
        price: 21900,
        rating: 4.9,
        reviews: 271,
        response: "평균 3분 이내",
        benefit: "24시간 운영",
        badge: "최저가",
        included: ["공항 미팅", "단독 차량", "수하물 적재", "24시간 운영"],
        excluded: ["추가 경유", "유료 주차 추가분"],
        cancelPolicy: "이용 24시간 전까지 무료 취소",
      },
      {
        id: "mactan-transfer",
        vendor: "막탄트랜스퍼",
        price: 23900,
        rating: 4.8,
        reviews: 163,
        response: "평균 7분 이내",
        benefit: "카카오 안내",
        included: ["공항 미팅", "단독 차량", "카카오 안내"],
        excluded: ["추가 경유", "유료 주차 추가분"],
        cancelPolicy: "이용 48시간 전까지 무료 취소",
      },
      {
        id: "cebu-van",
        vendor: "세부밴",
        price: 24900,
        rating: 4.9,
        reviews: 107,
        response: "평균 10분 이내",
        benefit: "대형 밴 선택",
        included: ["공항 미팅", "대형 밴", "수하물 적재"],
        excluded: ["추가 경유", "기사 팁"],
        cancelPolicy: "이용 72시간 전까지 무료 취소",
      },
    ],
  },
  {
    id: 4,
    city: "보라카이",
    category: "투어·액티비티",
    title: "보라카이 선셋 세일링",
    subtitle: "화이트비치에서 즐기는 노을",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=88",
    rating: 4.7,
    reviews: 167,
    duration: "약 1시간",
    meeting: "화이트비치 지정 미팅포인트",
    description:
      "보라카이 대표 선셋 액티비티를 업체별 가격과 포함사항으로 비교해보세요.",
    offers: [
      {
        id: "boracay-on",
        vendor: "보라카이온",
        price: 33900,
        rating: 4.8,
        reviews: 86,
        response: "평균 6분 이내",
        benefit: "당일 예약 가능",
        badge: "최저가",
        included: ["세일링", "구명조끼", "현장 안내"],
        excluded: ["픽업", "개인 음료"],
        cancelPolicy: "이용 2일 전까지 무료 취소",
      },
      {
        id: "white-beach-tour",
        vendor: "화이트비치투어",
        price: 36900,
        rating: 4.7,
        reviews: 51,
        response: "평균 12분 이내",
        benefit: "사진 촬영",
        included: ["세일링", "구명조끼", "사진 촬영"],
        excluded: ["픽업", "개인 경비"],
        cancelPolicy: "이용 3일 전까지 무료 취소",
      },
      {
        id: "bora-sunset",
        vendor: "보라선셋",
        price: 38900,
        rating: 4.6,
        reviews: 30,
        response: "평균 18분 이내",
        benefit: "음료 포함",
        included: ["세일링", "구명조끼", "음료"],
        excluded: ["픽업"],
        cancelPolicy: "이용 5일 전까지 무료 취소",
      },
    ],
  },
  {
    id: 5,
    city: "마닐라",
    category: "호텔",
    title: "마닐라 베이 호텔 특가",
    subtitle: "조식 포함 · 무료 취소 가능",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=88",
    rating: 4.6,
    reviews: 93,
    duration: "1박 기준",
    meeting: "마닐라 베이",
    description:
      "같은 조건의 객실을 판매처별 가격과 취소조건으로 비교해보세요.",
    offers: [
      {
        id: "philpass-hotel",
        vendor: "필패스 호텔",
        price: 109000,
        rating: 4.7,
        reviews: 42,
        response: "즉시 확정",
        benefit: "무료 취소",
        badge: "최저가",
        included: ["객실 1박", "조식 2인", "무료 와이파이"],
        excluded: ["공항 픽업", "미니바"],
        cancelPolicy: "체크인 3일 전까지 무료 취소",
      },
      {
        id: "manila-stay",
        vendor: "마닐라스테이",
        price: 115000,
        rating: 4.6,
        reviews: 31,
        response: "즉시 확정",
        benefit: "조식 2인",
        included: ["객실 1박", "조식 2인", "수영장"],
        excluded: ["공항 픽업"],
        cancelPolicy: "체크인 5일 전까지 무료 취소",
      },
      {
        id: "bay-hotel-deal",
        vendor: "베이호텔딜",
        price: 119000,
        rating: 4.5,
        reviews: 20,
        response: "평균 10분 이내",
        benefit: "레이트 체크아웃",
        included: ["객실 1박", "조식 2인", "레이트 체크아웃"],
        excluded: ["미니바"],
        cancelPolicy: "체크인 7일 전까지 무료 취소",
      },
    ],
  },
  {
    id: 6,
    city: "세부",
    category: "마사지",
    title: "세부 프리미엄 스파",
    subtitle: "90분 마사지 · 픽드랍 선택",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=88",
    rating: 4.9,
    reviews: 389,
    duration: "90분",
    meeting: "업체별 지점 또는 픽업",
    description:
      "세부 인기 스파를 가격과 픽업 여부, 포함 서비스, 취소조건으로 비교해보세요.",
    offers: [
      {
        id: "cebu-healing",
        vendor: "세부힐링스파",
        price: 37900,
        rating: 4.9,
        reviews: 177,
        response: "평균 5분 이내",
        benefit: "웰컴 드링크",
        badge: "최저가",
        included: ["90분 아로마 마사지", "웰컴 드링크", "샤워"],
        excluded: ["픽업", "매너팁"],
        cancelPolicy: "이용 24시간 전까지 무료 취소",
      },
      {
        id: "mactan-spa",
        vendor: "막탄스파",
        price: 39900,
        rating: 4.8,
        reviews: 128,
        response: "평균 8분 이내",
        benefit: "픽업 선택",
        included: ["90분 마사지", "차량 픽업 선택", "차"],
        excluded: ["드랍 옵션", "매너팁"],
        cancelPolicy: "이용 48시간 전까지 무료 취소",
      },
      {
        id: "philippines-relax",
        vendor: "필리핀릴렉스",
        price: 42900,
        rating: 4.9,
        reviews: 84,
        response: "평균 12분 이내",
        benefit: "90분 아로마",
        included: ["90분 아로마 마사지", "족욕", "차"],
        excluded: ["픽업", "매너팁"],
        cancelPolicy: "이용 72시간 전까지 무료 취소",
      },
    ],
  },
];

const money = new Intl.NumberFormat("ko-KR");

export default function ComparePage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params?.id);
  const product = useMemo(
    () => products.find((item) => item.id === productId) ?? products[0],
    [productId]
  );

  const [selectedVendor, setSelectedVendor] = useState(product.offers[0].id);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [date, setDate] = useState("");
  const [people, setPeople] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const sortedOffers = useMemo(
    () => [...product.offers].sort((a, b) => a.price - b.price),
    [product]
  );

  const selectedOffer =
    product.offers.find((offer) => offer.id === selectedVendor) ?? sortedOffers[0];

  function openReservation(vendorId: string) {
    setSelectedVendor(vendorId);
    setReservationOpen(true);
    setBookingMessage("");
  }

  async function submitBooking() {
    if (!date) {
      setBookingMessage("이용일을 선택해주세요.");
      return;
    }

    if (!customerName.trim()) {
      setBookingMessage("예약자 이름을 입력해주세요.");
      return;
    }

    if (!customerPhone.trim()) {
      setBookingMessage("연락처를 입력해주세요.");
      return;
    }

    setBookingLoading(true);
    setBookingMessage("");

    try {
      const { data, error } = await supabase.rpc("create_booking_request", {
        p_product_code: String(product.id),
        p_vendor_code: selectedOffer.id,
        p_travel_date: date,
        p_people: people,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_customer_email: customerEmail.trim() || null,
        p_unit_price: selectedOffer.price,
      });

      if (error) throw error;

      const booking = Array.isArray(data) ? data[0] : data;

      setBookingMessage(
        booking?.booking_number
          ? `예약 요청이 접수되었습니다. 예약번호: ${booking.booking_number}`
          : "예약 요청이 접수되었습니다."
      );
    } catch (error) {
      console.error("BOOKING ERROR:", error);
      setBookingMessage(
        error instanceof Error
          ? error.message
          : "예약 요청 중 오류가 발생했습니다."
      );
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-xl font-black text-white shadow-lg shadow-blue-200">
              P
            </span>
            <div className="text-left">
              <p className="text-xl font-black tracking-[-0.04em] text-blue-700">
                필패스
              </p>
              <p className="-mt-1 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                PHILPASS
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-200"
          >
            ← 상품 목록
          </button>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-10">
          <div className="relative min-h-[300px] overflow-hidden rounded-[30px] bg-slate-900 lg:min-h-[420px]">
            <img
              src={product.image}
              alt={product.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 flex gap-2">
              <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800">
                {product.city}
              </span>
              <span className="rounded-full bg-blue-600/95 px-3 py-1.5 text-xs font-black text-white">
                {product.category}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-xs font-black tracking-[0.18em] text-blue-600">
              PHILPASS PRICE COMPARE
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              {product.title}
            </h1>
            <p className="mt-3 text-base font-medium text-slate-500">
              {product.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                ★ {product.rating} · 후기 {money.format(product.reviews)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                ⏱ {product.duration}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                📍 {product.meeting}
              </span>
            </div>

            <p className="mt-6 text-sm font-medium leading-7 text-slate-600">
              {product.description}
            </p>

            <div className="mt-7 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-[10px] font-black text-emerald-600">
                  현재 최저가
                </p>
                <p className="mt-1 text-xl font-black text-emerald-800">
                  {money.format(sortedOffers[0].price)}원
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[10px] font-black text-blue-600">
                  비교 업체
                </p>
                <p className="mt-1 text-xl font-black text-blue-800">
                  {sortedOffers.length}곳
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-[10px] font-black text-slate-500">
                  가격 차이
                </p>
                <p className="mt-1 text-xl font-black text-slate-800">
                  {money.format(
                    sortedOffers[sortedOffers.length - 1].price -
                      sortedOffers[0].price
                  )}
                  원
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-black tracking-[0.18em] text-blue-600">
            VENDOR COMPARISON
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
            업체 3곳을 한눈에 비교하세요
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            가격만 보지 말고 포함사항, 후기, 취소규정까지 확인해보세요.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {sortedOffers.map((offer, index) => (
            <article
              key={offer.id}
              className={`relative overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                index === 0
                  ? "border-emerald-300 ring-2 ring-emerald-100"
                  : "border-slate-200"
              }`}
            >
              {index === 0 && (
                <div className="absolute right-0 top-0 rounded-bl-2xl bg-emerald-600 px-4 py-2 text-[10px] font-black text-white">
                  최저가
                </div>
              )}

              <div className="pr-14">
                <p className="text-lg font-black text-slate-950">
                  {offer.vendor}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-black text-amber-500">
                    ★ {offer.rating}
                  </span>
                  <span className="font-bold text-slate-400">
                    후기 {offer.reviews}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold text-slate-400">
                  1인 기준
                </p>
                <p
                  className={`mt-1 text-3xl font-black ${
                    index === 0 ? "text-emerald-700" : "text-slate-950"
                  }`}
                >
                  {money.format(offer.price)}
                  <span className="ml-1 text-sm">원</span>
                </p>
                <p className="mt-2 text-xs font-black text-blue-600">
                  {offer.benefit}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-black text-slate-800">포함사항</p>
                <div className="mt-2 space-y-2">
                  {offer.included.map((item) => (
                    <p
                      key={item}
                      className="flex gap-2 text-xs font-medium text-slate-600"
                    >
                      <span className="font-black text-emerald-500">✓</span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-black text-slate-800">불포함</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {offer.excluded.join(" · ")}
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                <p className="text-[10px] font-black text-blue-600">
                  취소 규정
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-blue-950">
                  {offer.cancelPolicy}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400">응답 속도</span>
                <span className="font-black text-slate-700">
                  {offer.response}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openReservation(offer.id)}
                className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white transition ${
                  index === 0
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {offer.vendor} 예약하기
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <h3 className="text-lg font-black">한눈에 비교</h3>
            <p className="mt-1 text-xs font-medium text-slate-400">
              좌우로 스크롤해서 업체별 차이를 확인할 수 있어요.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-black text-slate-500">
                    비교 항목
                  </th>
                  {sortedOffers.map((offer) => (
                    <th
                      key={offer.id}
                      className="px-5 py-4 text-xs font-black text-slate-800"
                    >
                      {offer.vendor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">가격</td>
                  {sortedOffers.map((offer, index) => (
                    <td
                      key={offer.id}
                      className={`px-5 py-4 font-black ${
                        index === 0 ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {money.format(offer.price)}원
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">별점</td>
                  {sortedOffers.map((offer) => (
                    <td key={offer.id} className="px-5 py-4 font-bold">
                      ★ {offer.rating} ({offer.reviews})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">대표 혜택</td>
                  {sortedOffers.map((offer) => (
                    <td key={offer.id} className="px-5 py-4 font-bold">
                      {offer.benefit}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">포함사항</td>
                  {sortedOffers.map((offer) => (
                    <td
                      key={offer.id}
                      className="px-5 py-4 text-xs leading-6 text-slate-600"
                    >
                      {offer.included.join(" · ")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">취소규정</td>
                  {sortedOffers.map((offer) => (
                    <td
                      key={offer.id}
                      className="px-5 py-4 text-xs font-bold text-slate-700"
                    >
                      {offer.cancelPolicy}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-5 py-4 font-black text-slate-500">응답속도</td>
                  {sortedOffers.map((offer) => (
                    <td key={offer.id} className="px-5 py-4 font-bold">
                      {offer.response}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-400">
            PHILPASS GUIDE
          </p>
          <h3 className="mt-2 text-xl font-black">
            가장 싼 상품이 항상 가장 좋은 상품은 아니에요.
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            픽드랍, 식사, 촬영, 가이드, 취소규정을 함께 비교하면 실제 여행
            비용과 만족도를 더 정확하게 판단할 수 있습니다.
          </p>
        </div>
      </section>

      {reservationOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-blue-600">예약 요청</p>
                <h3 className="mt-1 text-xl font-black">
                  {selectedOffer.vendor}
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  {product.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReservationOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-600">이용일</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-600">인원</span>
                <select
                  value={people}
                  onChange={(e) => setPeople(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                    <option key={count} value={count}>
                      {count}명
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-xs font-black text-slate-600">예약자 이름</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-600">연락처</span>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-600">
                  이메일 <span className="font-medium text-slate-400">(선택)</span>
                </span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-500">1인 가격</span>
                <span className="font-black">
                  {money.format(selectedOffer.price)}원
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="font-black text-slate-700">예상 합계</span>
                <span className="text-xl font-black text-blue-700">
                  {money.format(selectedOffer.price * people)}원
                </span>
              </div>
            </div>

            {bookingMessage && (
              <div
                className={`mt-4 rounded-2xl p-4 text-sm font-bold ${
                  bookingMessage.includes("접수되었습니다")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {bookingMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => void submitBooking()}
              disabled={bookingLoading}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bookingLoading ? "예약 요청 중..." : "예약 요청하기"}
            </button>

            <p className="mt-3 text-center text-[10px] font-medium leading-5 text-slate-400">
              예약 요청 후 업체가 일정과 가능 여부를 확인합니다. 다음 단계에서
              예약금 결제와 자동 확정 기능을 연결합니다.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
