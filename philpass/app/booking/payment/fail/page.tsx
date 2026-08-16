"use client";

import { useEffect, useState } from "react";

export default function DepositPaymentFailPage() {
  const [code, setCode] = useState("PAYMENT_FAILED");
  const [message, setMessage] = useState("결제가 완료되지 않았습니다.");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get("code") || "PAYMENT_FAILED");
    setMessage(params.get("message") || "결제가 완료되지 않았습니다.");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-[30px] bg-white p-7 text-center shadow-xl">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-5 text-2xl font-black">결제가 완료되지 않았어요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
        <p className="mt-2 text-[10px] font-bold text-slate-400">{code}</p>

        <button
          type="button"
          onClick={() => (window.location.href = "/booking")}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white"
        >
          예약 확인으로 돌아가기
        </button>
      </div>
    </main>
  );
}
