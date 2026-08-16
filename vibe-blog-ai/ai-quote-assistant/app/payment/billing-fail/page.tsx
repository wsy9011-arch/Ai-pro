"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");

  const message =
    searchParams.get("message") ||
    "카드 등록이 취소되었거나 실패했습니다.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">❌</div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          정기결제 등록 실패
        </h1>

        <p className="mt-4 whitespace-pre-line text-sm font-bold leading-6 text-slate-500">
          {message}
        </p>

        {code && (
          <p className="mt-2 text-xs text-slate-400">
            오류 코드: {code}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-7 w-full rounded-xl bg-slate-900 px-5 py-4 text-sm font-black text-white"
        >
          견적AI로 돌아가기
        </button>
      </div>
    </main>
  );
}

function BillingFailLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-500">
          결제 상태를 확인하고 있습니다...
        </p>
      </div>
    </main>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense fallback={<BillingFailLoading />}>
      <BillingFailContent />
    </Suspense>
  );
}