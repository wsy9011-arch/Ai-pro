"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "결제를 확인하고 상품을 적용하는 중입니다..."
  );
  const [loading, setLoading] = useState(true);
  const [isAdProduct, setIsAdProduct] = useState(false);

  useEffect(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");
    const product = searchParams.get("product");

    setIsAdProduct(
      product === "ad_plan" || product === "premium_ad"
    );

    if (!paymentKey || !orderId || !amount) {
      setMessage("결제 결과 정보가 없습니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function confirmPayment() {
      try {
        const response = await fetch("/api/toss/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "결제 승인에 실패했습니다."
          );
        }

        if (cancelled) return;

        if (
          data.product === "ad_plan" ||
          data.product === "premium_ad"
        ) {
          setIsAdProduct(true);

          const endText = formatDateTime(data.endsAt);
          const regions = Array.isArray(data.regions)
            ? data.regions.join(", ")
            : data.region || "";

          setMessage(
            `${data.planName || "상위노출 광고"}가 시작되었습니다.${
              regions ? `\n광고 지역: ${regions}` : ""
            }${
              data.activatedCount
                ? `\n적용 광고: ${data.activatedCount}개`
                : ""
            }${endText ? `\n광고 종료: ${endText}` : ""}`
          );
        } else {
          setMessage(
            data.plan === "starter"
              ? "스타터 플랜 30회가 적용되었습니다."
              : "프로 플랜 100회가 적용되었습니다."
          );
        }

        setLoading(false);

        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 2500);
      } catch (error) {
        if (cancelled) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "결제 승인 중 오류가 발생했습니다."
        );
        setLoading(false);
      }
    }

    void confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">{isAdProduct ? "📢" : "💳"}</div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          {loading ? "결제 확인 중" : "결제 처리 결과"}
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
            해결소로 돌아가기
          </button>
        )}
      </div>
    </main>
  );
}

function PaymentSuccessFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">💳</div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          결제 확인 중
        </h1>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-500">
          결제 정보를 불러오는 중입니다...
        </p>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
