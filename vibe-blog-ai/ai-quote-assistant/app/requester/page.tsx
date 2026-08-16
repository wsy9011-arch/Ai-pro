"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const services = [
  ["❄️", "에어컨", "air_conditioner"],
  ["🏠", "인테리어필름", "interior_film"],
  ["🧱", "도배·장판", "wallpaper"],
  ["🧹", "청소", "cleaning"],
  ["🚚", "이사", "moving"],
  ["⚡", "전기", "electrical"],
  ["🔧", "설비", "plumbing"],
  ["🛠️", "수리", "field_repair"],
  ["📦", "설치", "other"],
  ["➕", "기타", "other"],
];

export default function RequesterPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredServices = services.filter(([, name]) =>
    name.includes(search.trim())
  );

  function selectService(value: string) {
    router.push(`/request?businessType=${value}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/requester")}
            className="text-left"
          >
            <div className="text-xl font-black tracking-tight text-blue-600">
              견적AI
            </div>

            <div className="text-[10px] font-bold tracking-widest text-slate-400">
              REQUESTER
            </div>
          </button>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <button
              type="button"
              onClick={() => router.push("/requester")}
              className="hover:text-blue-600"
            >
              서비스 찾기
            </button>

            <button
              type="button"
              className="hover:text-blue-600"
            >
              내 요청
            </button>

            <button
              type="button"
              className="hover:text-blue-600"
            >
              채팅
            </button>
          </nav>

          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            로그인
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 pb-14 pt-16 text-center lg:px-8">
          <span className="inline-flex rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600">
            AI가 도와주는 간편 견적
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            어떤 서비스가 필요하신가요?
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            필요한 서비스를 선택하고 요청 내용을 작성하면
            <br className="hidden sm:block" />
            적합한 업체의 견적을 받아 비교할 수 있습니다.
          </p>

          {/* SEARCH */}
          <div className="mx-auto mt-8 flex max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="찾으시는 서비스를 입력하세요. 예: 에어컨 설치"
              className="min-w-0 flex-1 px-5 py-4 text-sm outline-none"
            />

            <button
              type="button"
              onClick={() => {
                if (filteredServices.length > 0) {
                  selectService(filteredServices[0][2]);
                }
              }}
              className="m-1.5 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700"
            >
              검색
            </button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600">
              POPULAR SERVICES
            </p>

            <h2 className="mt-2 text-2xl font-black">
              인기 서비스
            </h2>
          </div>

          <span className="text-sm font-bold text-slate-400">
            원하는 서비스를 선택하세요
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredServices.map(([icon, name, value]) => (
            <button
              key={`${value}-${name}`}
              type="button"
              onClick={() => selectService(value)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl transition group-hover:bg-blue-50">
                {icon}
              </div>

              <div className="mt-4 text-sm font-black">
                {name}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                견적 요청하기 →
              </div>
            </button>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <div className="text-3xl">🔎</div>

            <p className="mt-3 text-sm font-bold">
              찾으시는 서비스가 없습니다.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              다른 서비스명을 입력해보세요.
            </p>
          </div>
        )}
      </section>

      {/* QUICK ACTIONS */}
      <section className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => router.push("/request")}
            className="rounded-2xl bg-blue-600 p-6 text-left text-white shadow-lg shadow-blue-200"
          >
            <div className="text-2xl">📝</div>

            <h3 className="mt-4 text-lg font-black">
              견적 요청하기
            </h3>

            <p className="mt-2 text-sm leading-5 text-blue-100">
              원하는 서비스를 입력하고
              <br />
              업체의 견적을 받아보세요.
            </p>
          </button>

          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-blue-300"
          >
            <div className="text-2xl">📋</div>

            <h3 className="mt-4 text-lg font-black">
              내 요청 확인
            </h3>

            <p className="mt-2 text-sm leading-5 text-slate-400">
              요청한 견적과 업체의 답변을
              <br />
              한곳에서 확인하세요.
            </p>
          </button>

          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-blue-300"
          >
            <div className="text-2xl">💬</div>

            <h3 className="mt-4 text-lg font-black">
              업체와 상담
            </h3>

            <p className="mt-2 text-sm leading-5 text-slate-400">
              궁금한 내용을 업체와
              <br />
              직접 상담할 수 있습니다.
            </p>
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest text-blue-600">
              HOW IT WORKS
            </p>

            <h2 className="mt-2 text-2xl font-black">
              견적AI는 이렇게 이용해요
            </h2>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              ["01", "서비스 선택", "필요한 서비스를 선택하세요."],
              ["02", "견적 요청", "작업 내용을 간단하게 알려주세요."],
              ["03", "업체 견적 비교", "여러 업체의 견적을 비교하세요."],
              ["04", "업체 선택", "상담 후 원하는 업체를 선택하세요."],
            ].map(([number, title, description]) => (
              <div key={number} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
                  {number}
                </div>

                <h3 className="mt-4 text-base font-black">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECOMMENDED */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <p className="text-xs font-bold tracking-widest text-blue-600">
          RECOMMENDED
        </p>

        <h2 className="mt-2 text-2xl font-black">
          추천 업체
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          앞으로 지역과 서비스에 맞는 업체를 추천해드릴게요.
        </p>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="text-4xl">🏪</div>

          <p className="mt-4 text-sm font-bold text-slate-600">
            아직 추천 업체가 없습니다.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            견적 요청을 시작하면 적합한 업체를 찾아드릴게요.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <span className="font-black text-slate-600">
              견적AI
            </span>

            <span className="ml-2">
              의뢰자 서비스
            </span>
          </div>

          <div>
            © 2026 견적AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {[
            ["🏠", "홈"],
            ["🔎", "서비스"],
            ["📝", "내 요청"],
            ["💬", "채팅"],
            ["👤", "내 정보"],
          ].map(([icon, name]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                if (name === "홈") {
                  router.push("/requester");
                }

                if (name === "서비스") {
                  router.push("/requester");
                }

                if (name === "내 요청") {
                  alert("내 요청 기능은 다음 단계에서 연결합니다.");
                }

                if (name === "채팅") {
                  alert("채팅 기능은 다음 단계에서 연결합니다.");
                }

                if (name === "내 정보") {
                  alert("회원 기능은 다음 단계에서 연결합니다.");
                }
              }}
              className="flex min-w-16 flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold text-slate-400"
            >
              <span className="text-lg">{icon}</span>
              {name}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}