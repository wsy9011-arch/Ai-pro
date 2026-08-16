"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "카드 등록을 확인하고 무제한 플랜을 적용하는 중입니다..."
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const orderId = searchParams.get("orderId");

    if (!authKey || !customerKey || !orderId) {
      setMessage("정기결제 인증 결과가 없습니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function issueBilling() {
      try {
        const response = await fetch("/api/toss/billing/issue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authKey,
            customerKey,
            orderId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "정기결제 등록에 실패했습니다."
          );
        }

        if (cancelled) return;

        setMessage(
          "무제한 플랜이 활성화되었습니다.\n월 99,000원 정기결제가 등록되었습니다."
        );

        setLoading(false);

        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 1800);
      } catch (error) {
        if (cancelled) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "정기결제 등록 중 오류가 발생했습니다."
        );

        setLoading(false);
      }
    }

    void issueBilling();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">♾️</div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          {loading ? "구독 등록 중" : "구독 처리 결과"}
        </h1>

        <p className="mt-4 whitespace-pre-line text-sm font-bold leading-6 text-slate-500">
          {message}
        </p>

        {!loading && (
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white"
          >
            견적AI로 돌아가기
          </button>
        )}
      </div>
    </main>
  );
}

function BillingSuccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">♾️</div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          구독 등록 중
        </h1>

        <p className="mt-4 text-sm font-bold leading-6 text-slate-500">
          결제 인증 결과를 확인하고 있습니다...
        </p>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<BillingSuccessLoading />}>
      <BillingSuccessContent />
    </Suspense>
  );
}