"use client";

import { useEffect, useState } from "react";

type ConfirmResult = {
  ok: boolean;
  bookingNumber?: string;
  message?: string;
};

export default function DepositPaymentSuccessPage() {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("결제를 확인하고 있습니다...");
  const [bookingNumber, setBookingNumber] = useState("");

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amount = Number(params.get("amount"));

      if (!paymentKey || !orderId || !amount) {
        setState("error");
        setMessage("결제 승인 정보가 올바르지 않습니다.");
        return;
      }

      try {
        const response = await fetch("/api/toss/deposit/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        const data = (await response.json()) as ConfirmResult;

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "결제 승인에 실패했습니다.");
        }

        setBookingNumber(data.bookingNumber || "");
        setMessage("예약금 결제가 완료되어 예약이 확정되었습니다.");
        setState("success");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "결제 승인에 실패했습니다."
        );
        setState("error");
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-[30px] bg-white p-7 text-center shadow-xl">
        <p className="text-5xl">
          {state === "loading" ? "⏳" : state === "success" ? "✅" : "⚠️"}
        </p>
        <h1 className="mt-5 text-2xl font-black">
          {state === "loading"
            ? "결제 확인 중"
            : state === "success"
              ? "예약 확정 완료"
              : "결제 확인 오류"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>

        {bookingNumber && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold text-slate-400">예약번호</p>
            <p className="mt-1 font-black text-blue-700">{bookingNumber}</p>
          </div>
        )}

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
