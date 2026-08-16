"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUSINESS_TYPES = [
  { value: "interior_film", label: "인테리어필름", icon: "✨" },
  { value: "wallpaper", label: "도배·장판", icon: "🏠" },
  { value: "air_conditioner", label: "에어컨", icon: "❄️" },
  { value: "cleaning", label: "청소", icon: "🧹" },
  { value: "moving", label: "이사", icon: "🚚" },
  { value: "demolition", label: "철거", icon: "🔨" },
  { value: "auto_repair", label: "자동차 정비", icon: "🚗" },
  { value: "sign_printing", label: "간판·인쇄", icon: "🪧" },
  { value: "window_screen", label: "방충망·샷시", icon: "🪟" },
  { value: "field_repair", label: "출장수리", icon: "🛠️" },
  { value: "plumbing", label: "설비·배관", icon: "🚿" },
  { value: "electrical", label: "전기", icon: "⚡" },
  { value: "painting", label: "도장·페인트", icon: "🎨" },
  { value: "other", label: "기타", icon: "📌" },
];

export default function CustomerRequestPage() {
  const [businessType, setBusinessType] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [requestId, setRequestId] = useState("");

  async function submitRequest(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!businessType) {
    alert("서비스 업종을 선택해주세요.");
    return;
  }

  if (!name.trim() || !phone.trim()) {
    alert("이름과 연락처를 입력해주세요.");
    return;
  }

  if (!region.trim()) {
    alert("서비스 지역을 입력해주세요.");
    return;
  }

  if (!inquiry.trim()) {
    alert("원하시는 작업 내용을 입력해주세요.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/service-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessType,
        serviceType,
        name,
        phone,
        region,
        inquiry,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "문의 접수 중 오류가 발생했습니다."
      );
    }

    setRequestId(result.id);
    setCompleted(true);
  } catch (error) {
    console.error("CUSTOMER REQUEST ERROR:", error);

    alert(
      error instanceof Error
        ? error.message
        : "문의 접수 중 오류가 발생했습니다."
    );
  } finally {
    setLoading(false);
  }
}
  if (completed) {
    return (
      <main className="min-h-screen bg-sky-50 px-5 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-4xl">
              ✓
            </div>

            <p className="mt-6 text-sm font-black tracking-[0.18em] text-sky-600">
              SOLVE SO
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              문의가 접수됐어요!
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-500">
              선택하신 업종의 업체에게
              <br />
              고객님의 문의가 전달될 준비가 됐습니다.
            </p>

            <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
              <p className="text-xs font-bold text-slate-400">
                문의번호
              </p>
              <p className="mt-1 break-all text-lg font-black text-slate-900">
                {requestId}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-4 text-sm font-black text-white hover:bg-sky-600"
            >
              다른 문의하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-50 px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7">
          <p className="text-sm font-black tracking-[0.2em] text-sky-600">
            해결소
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            필요한 전문가를
            <br />
            한 번에 찾아보세요.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            원하는 서비스와 내용을 남겨주시면
            <br className="sm:hidden" />
            해당 업종의 업체가 확인할 수 있어요.
          </p>
        </header>

        <form
          onSubmit={submitRequest}
          className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-8"
        >
          <section>
            <p className="text-xs font-black tracking-[0.15em] text-sky-600">
              01 SERVICE
            </p>
            <h2 className="mt-1 text-xl font-black">
              어떤 서비스가 필요하세요?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BUSINESS_TYPES.map((item) => {
                const selected = businessType === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setBusinessType(item.value)}
                    className={`rounded-2xl border px-3 py-4 text-left transition ${
                      selected
                        ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                        : "border-slate-200 bg-white hover:border-sky-200"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="mt-2 block text-sm font-black">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-9">
            <p className="text-xs font-black tracking-[0.15em] text-sky-600">
              02 REQUEST
            </p>
            <h2 className="mt-1 text-xl font-black">
              필요한 내용을 알려주세요.
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="서비스명 (예: 싱크대 필름, 입주청소, 에어컨 설치)"
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-sky-500"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="서비스 지역 (예: 의정부)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-sky-500"
                />

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="고객님 성함"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="연락처"
                inputMode="tel"
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-sky-500"
              />

              <textarea
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                placeholder="원하시는 작업 내용을 자세히 적어주세요. 사진이 있다면 다음 단계에서 추가할 수 있도록 확장할 예정입니다."
                className="min-h-36 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 text-sm leading-6 outline-none focus:border-sky-500"
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-2xl bg-sky-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "문의 접수 중..." : "무료로 문의 접수하기 →"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            문의 접수 후 해당 업종 업체가 확인할 수 있습니다.
          </p>
        </form>
      </div>
    </main>
  );
}