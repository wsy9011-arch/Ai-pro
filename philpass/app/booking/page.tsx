"use client";

import Script from "next/script";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (request: {
          method: "CARD";
          amount: { currency: "KRW"; value: number };
          orderId: string;
          orderName: string;
          customerName?: string;
          customerEmail?: string;
          customerMobilePhone?: string;
          successUrl: string;
          failUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

type BookingDetail = {
  booking_id: string;
  booking_number: string;
  product_title: string;
  product_city: string;
  product_category: string;
  vendor_name: string;
  vendor_phone: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  travel_date: string;
  people: number;
  unit_price: number;
  total_amount: number;
  status: string;
  vendor_message: string | null;
  deposit_amount: number;
  payment_status: string;
  created_at: string;
  responded_at: string | null;
  confirmed_at: string | null;
};

type PreparedPayment = {
  order_id: string;
  amount: number;
  customer_key: string;
  order_name: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
};

const money = new Intl.NumberFormat("ko-KR");

const STATUS_TEXT: Record<string, string> = {
  예약요청: "업체 확인 중",
  업체수락: "업체 수락",
  업체거절: "업체에서 예약을 거절했습니다",
  예약금대기: "예약금 결제 대기",
  예약확정: "예약 확정",
  이용완료: "이용 완료",
  고객취소: "고객 취소",
  업체취소: "업체 취소",
};

function statusClass(status: string) {
  if (status === "예약확정") return "bg-emerald-50 text-emerald-700";
  if (status === "예약금대기") return "bg-blue-50 text-blue-700";
  if (status === "예약요청") return "bg-amber-50 text-amber-700";
  if (status === "이용완료") return "bg-slate-100 text-slate-700";
  if (status.includes("거절") || status.includes("취소"))
    return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-700";
}

export default function BookingLookupPage() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sdkReady, setSdkReady] = useState(false);

  async function lookupBooking() {
    if (!bookingNumber.trim() || !phone.trim()) {
      setMessage("예약번호와 예약자 연락처를 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");
    setBooking(null);

    try {
      const { data, error } = await supabase.rpc("get_public_booking_detail", {
        p_booking_number: bookingNumber.trim(),
        p_customer_phone: phone.trim(),
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        setMessage("예약정보를 찾지 못했습니다. 예약번호와 연락처를 확인해주세요.");
        return;
      }

      setBooking(row as BookingDetail);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "예약정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  async function requestDepositPayment() {
    if (!booking) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

    if (!clientKey) {
      alert("토스페이먼츠 클라이언트 키가 설정되지 않았습니다.");
      return;
    }

    if (!window.TossPayments || !sdkReady) {
      alert("결제 모듈을 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
      return;
    }

    setPayLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "prepare_booking_deposit_payment",
        {
          p_booking_number: booking.booking_number,
          p_customer_phone: phone.trim(),
        }
      );

      if (error) throw error;

      const prepared = (Array.isArray(data) ? data[0] : data) as
        | PreparedPayment
        | undefined;

      if (!prepared) {
        throw new Error("결제 정보를 준비하지 못했습니다.");
      }

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({
        customerKey: prepared.customer_key,
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: Number(prepared.amount),
        },
        orderId: prepared.order_id,
        orderName: prepared.order_name,
        customerName: prepared.customer_name,
        customerEmail: prepared.customer_email || undefined,
        customerMobilePhone: prepared.customer_phone.replace(/\D/g, ""),
        successUrl: `${window.location.origin}/booking/payment/success`,
        failUrl: `${window.location.origin}/booking/payment/fail`,
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다."
      );
      setPayLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f9fc] text-slate-950">
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
              P
            </span>
            <div className="text-left">
              <p className="text-lg font-black text-blue-700">필패스</p>
              <p className="-mt-1 text-[10px] font-bold text-slate-400">
                예약 확인
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"
          >
            ← 홈으로
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-9 sm:px-6 sm:py-12">
        <div className="rounded-[30px] bg-gradient-to-br from-blue-700 to-cyan-500 p-6 text-white sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-100">
            MY BOOKING
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">
            내 예약 확인
          </h1>
          <p className="mt-3 text-sm leading-6 text-blue-50">
            예약번호와 예약할 때 입력한 연락처로 예약 상태를 확인할 수 있어요.
          </p>
        </div>

        <div className="relative -mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1.15fr_1fr_auto]">
            <label>
              <span className="text-xs font-black text-slate-600">예약번호</span>
              <input
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="예: PP-20260816-XXXXXXXX"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500"
              />
            </label>

            <label>
              <span className="text-xs font-black text-slate-600">연락처</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void lookupBooking()}
                placeholder="010-1234-5678"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500"
              />
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => void lookupBooking()}
              className="self-end rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white disabled:opacity-50"
            >
              {loading ? "조회 중..." : "예약 조회"}
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
              {message}
            </div>
          )}
        </div>

        {booking && (
          <div className="mt-6 space-y-4">
            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black text-blue-600">
                    {booking.booking_number}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{booking.product_title}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {booking.product_city} · {booking.product_category}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(
                    booking.status
                  )}`}
                >
                  {STATUS_TEXT[booking.status] ?? booking.status}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400">이용일</p>
                  <p className="mt-1 text-sm font-black">{booking.travel_date}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400">인원</p>
                  <p className="mt-1 text-sm font-black">{booking.people}명</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400">총 금액</p>
                  <p className="mt-1 text-sm font-black">
                    {money.format(booking.total_amount)}원
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400">결제상태</p>
                  <p className="mt-1 text-sm font-black">
                    {booking.payment_status}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-black text-slate-800">예약 업체</p>
                <p className="mt-2 text-base font-black">{booking.vendor_name}</p>
                {booking.vendor_phone && booking.status === "예약확정" && (
                  <a
                    href={`tel:${booking.vendor_phone}`}
                    className="mt-1 block text-sm font-bold text-blue-600"
                  >
                    📞 {booking.vendor_phone}
                  </a>
                )}
              </div>

              {booking.vendor_message && (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-black text-blue-700">업체 안내</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-950">
                    {booking.vendor_message}
                  </p>
                </div>
              )}
            </article>

            {booking.status === "예약요청" && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <p className="text-sm font-black text-amber-800">
                  업체가 예약 가능 여부를 확인하고 있어요.
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  업체가 수락하면 예약금 결제 버튼이 활성화됩니다.
                </p>
              </div>
            )}

            {booking.status === "예약금대기" &&
              booking.payment_status === "미결제" && (
                <div className="rounded-[28px] border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-xs font-black tracking-[0.14em] text-blue-600">
                    DEPOSIT PAYMENT
                  </p>
                  <h3 className="mt-2 text-xl font-black">예약금을 결제해주세요</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    예약금 결제가 완료되면 예약 상태가 자동으로
                    <strong className="text-slate-800"> 예약 확정</strong>으로
                    변경됩니다.
                  </p>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-blue-50 p-5">
                    <span className="text-sm font-bold text-blue-700">
                      결제할 예약금
                    </span>
                    <span className="text-2xl font-black text-blue-900">
                      {money.format(booking.deposit_amount)}원
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={payLoading || !sdkReady}
                    onClick={() => void requestDepositPayment()}
                    className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {payLoading
                      ? "결제 준비 중..."
                      : sdkReady
                        ? `${money.format(booking.deposit_amount)}원 예약금 결제하기`
                        : "결제 모듈 준비 중..."}
                  </button>
                </div>
              )}

            {booking.status === "예약확정" && (
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <p className="text-lg font-black text-emerald-800">
                  ✅ 예약이 확정되었습니다.
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-700">
                  이용일과 업체 안내사항을 다시 한번 확인해주세요.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
