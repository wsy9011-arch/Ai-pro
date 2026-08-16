"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type VendorProfile = {
  vendor_id: string;
  vendor_code: string;
  business_name: string;
  city: string | null;
  phone: string | null;
};

type VendorBooking = {
  booking_id: string;
  booking_number: string;
  product_title: string;
  product_city: string;
  product_category: string;
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
};

const money = new Intl.NumberFormat("ko-KR");

const STATUS_LABEL: Record<string, string> = {
  예약요청: "새 예약",
  업체수락: "업체 수락",
  업체거절: "거절",
  예약금대기: "예약금 대기",
  예약확정: "예약 확정",
  이용완료: "이용 완료",
  고객취소: "고객 취소",
  업체취소: "업체 취소",
};

function statusStyle(status: string) {
  if (status === "예약요청") return "bg-amber-50 text-amber-700";
  if (status === "예약금대기") return "bg-blue-50 text-blue-700";
  if (status === "예약확정") return "bg-emerald-50 text-emerald-700";
  if (status === "이용완료") return "bg-slate-100 text-slate-700";
  if (status.includes("거절") || status.includes("취소"))
    return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

export default function VendorPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorCode, setVendorCode] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [claimMessage, setClaimMessage] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);

  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [filter, setFilter] = useState("전체");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [deposits, setDeposits] = useState<Record<string, string>>({});

  const loadVendor = useCallback(async () => {
    setVendorLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_vendor_profile");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setVendor(row ?? null);
      return row ?? null;
    } catch (error) {
      console.error(error);
      setVendor(null);
      return null;
    } finally {
      setVendorLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setBookingLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_vendor_bookings");
      if (error) throw error;
      setBookings((data ?? []) as VendorBooking[]);
    } catch (error) {
      console.error(error);
      setBookings([]);
    } finally {
      setBookingLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? "";
      setSessionEmail(email);

      if (data.session) {
        const profile = await loadVendor();
        if (profile) await loadBookings();
      }

      setAuthLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? "");
      if (!session) {
        setVendor(null);
        setBookings([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadBookings, loadVendor]);

  const filteredBookings = useMemo(() => {
    if (filter === "전체") return bookings;
    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    bookings.forEach((booking) => {
      next[booking.status] = (next[booking.status] ?? 0) + 1;
    });
    return next;
  }, [bookings]);

  async function signIn() {
    if (!userEmail.trim() || !password) {
      setAuthMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail.trim(),
        password,
      });
      if (error) throw error;

      setSessionEmail(userEmail.trim());
      setAuthMessage("로그인되었습니다.");
      const profile = await loadVendor();
      if (profile) await loadBookings();
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다."
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function signUp() {
    if (!userEmail.trim() || password.length < 6) {
      setAuthMessage("이메일과 6자 이상의 비밀번호를 입력해주세요.");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: userEmail.trim(),
        password,
      });
      if (error) throw error;

      if (data.session) {
        setSessionEmail(data.user?.email ?? userEmail.trim());
        setAuthMessage("업체 계정이 생성되었습니다.");
      } else {
        setAuthMessage(
          "가입되었습니다. 이메일 확인이 켜져 있다면 인증 메일을 확인한 뒤 로그인해주세요."
        );
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "회원가입에 실패했습니다."
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSessionEmail("");
    setVendor(null);
    setBookings([]);
    setAuthMessage("");
  }

  async function claimVendor() {
    if (!vendorCode.trim() || !claimCode.trim()) {
      setClaimMessage("업체 코드와 초대 코드를 모두 입력해주세요.");
      return;
    }

    setClaimBusy(true);
    setClaimMessage("");

    try {
      const { data, error } = await supabase.rpc("claim_vendor_account", {
        p_vendor_code: vendorCode.trim(),
        p_claim_code: claimCode.trim(),
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      setClaimMessage(
        row?.business_name
          ? `${row.business_name} 업체 계정 연결이 완료되었습니다.`
          : "업체 계정 연결이 완료되었습니다."
      );

      await loadVendor();
      await loadBookings();
      setVendorCode("");
      setClaimCode("");
    } catch (error) {
      setClaimMessage(
        error instanceof Error ? error.message : "업체 연결에 실패했습니다."
      );
    } finally {
      setClaimBusy(false);
    }
  }

  async function respondBooking(
    bookingId: string,
    action: "accept" | "reject"
  ) {
    const depositText = deposits[bookingId] ?? "0";
    const deposit = Number(depositText.replace(/,/g, "")) || 0;
    const message = messages[bookingId]?.trim() || null;

    if (action === "accept" && deposit < 0) {
      alert("예약금은 0원 이상으로 입력해주세요.");
      return;
    }

    if (
      action === "reject" &&
      !window.confirm("이 예약 요청을 거절할까요?")
    ) {
      return;
    }

    setActionBusy(bookingId);

    try {
      const { error } = await supabase.rpc("respond_vendor_booking", {
        p_booking_id: bookingId,
        p_action: action,
        p_vendor_message: message,
        p_deposit_amount: action === "accept" ? deposit : 0,
      });
      if (error) throw error;

      await loadBookings();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "예약 처리 중 오류가 발생했습니다."
      );
    } finally {
      setActionBusy(null);
    }
  }

  async function completeBooking(bookingId: string) {
    if (!window.confirm("이 예약을 이용 완료 처리할까요?")) return;

    setActionBusy(bookingId);
    try {
      const { error } = await supabase.rpc("complete_vendor_booking", {
        p_booking_id: bookingId,
      });
      if (error) throw error;
      await loadBookings();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "이용 완료 처리 중 오류가 발생했습니다."
      );
    } finally {
      setActionBusy(null);
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-bold text-slate-400">필패스 업체 페이지 준비 중...</p>
      </main>
    );
  }

  if (!sessionEmail) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-4 py-12">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="mb-6 text-sm font-black text-white/80"
          >
            ← 필패스 홈
          </button>

          <div className="rounded-[30px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white">
                P
              </span>
              <div>
                <p className="text-xl font-black text-blue-700">필패스 업체센터</p>
                <p className="text-xs font-bold text-slate-400">
                  PHILPASS PARTNER
                </p>
              </div>
            </div>

            <h1 className="mt-8 text-2xl font-black tracking-[-0.04em]">
              업체 로그인
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              예약 요청을 확인하고 수락·거절 및 예약금을 관리하세요.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void signIn();
              }}
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-black text-slate-600">이메일</span>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="partner@example.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-600">비밀번호</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="6자 이상"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              {authMessage && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                  {authMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="mt-5 w-full cursor-pointer rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {authBusy ? "로그인 중..." : "로그인"}
              </button>

              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signUp()}
                className="mt-2 w-full cursor-pointer rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                처음이라면 업체 계정 만들기
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (vendorLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-bold text-slate-400">업체 정보를 확인하고 있습니다...</p>
      </main>
    );
  }

  if (!vendor) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-[30px] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-blue-600">PARTNER SETUP</p>
                <h1 className="mt-1 text-2xl font-black">업체 연결</h1>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"
              >
                로그아웃
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              가입한 계정을 실제 여행업체와 연결합니다. 관리자가 전달한 업체
              코드와 초대 코드를 입력하세요.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-600">업체 코드</span>
                <input
                  value={vendorCode}
                  onChange={(e) => setVendorCode(e.target.value)}
                  placeholder="예: cebu-blue"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black text-slate-600">초대 코드</span>
                <input
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="관리자에게 받은 코드"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                />
              </label>
            </div>

            {claimMessage && (
              <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">
                {claimMessage}
              </div>
            )}

            <button
              type="button"
              disabled={claimBusy}
              onClick={() => void claimVendor()}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
            >
              {claimBusy ? "연결 중..." : "업체 계정 연결"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-black text-white">
              P
            </span>
            <div className="text-left">
              <p className="font-black text-blue-700">필패스 업체센터</p>
              <p className="text-[10px] font-bold text-slate-400">
                {vendor.business_name}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-gradient-to-r from-blue-700 to-cyan-500 p-6 text-white sm:p-8">
          <p className="text-xs font-black text-cyan-100">PARTNER DASHBOARD</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            {vendor.business_name}
          </h1>
          <p className="mt-2 text-sm font-medium text-blue-50">
            {vendor.city ?? "지역 미등록"} · {sessionEmail}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-xl">
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-[10px] font-black text-blue-100">새 예약</p>
              <p className="mt-1 text-2xl font-black">{counts["예약요청"] ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-[10px] font-black text-blue-100">예약금 대기</p>
              <p className="mt-1 text-2xl font-black">{counts["예약금대기"] ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4">
              <p className="text-[10px] font-black text-blue-100">예약 확정</p>
              <p className="mt-1 text-2xl font-black">{counts["예약확정"] ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {["전체", "예약요청", "예약금대기", "예약확정", "이용완료", "업체거절"].map(
            (item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black ${
                  filter === item
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-500"
                }`}
              >
                {item === "전체" ? "전체" : STATUS_LABEL[item] ?? item}
                {item !== "전체" && (
                  <span className="ml-1">({counts[item] ?? 0})</span>
                )}
              </button>
            )
          )}
        </div>

        {bookingLoading ? (
          <div className="mt-5 rounded-[28px] bg-white p-10 text-center font-bold text-slate-400">
            예약을 불러오는 중...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="mt-5 rounded-[28px] bg-white p-12 text-center">
            <p className="text-4xl">🧳</p>
            <p className="mt-3 font-black text-slate-700">
              해당 상태의 예약이 없습니다.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredBookings.map((booking) => (
              <article
                key={booking.booking_id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-blue-600">
                      {booking.booking_number}
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      {booking.product_title}
                    </h2>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {booking.product_city} · {booking.product_category}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${statusStyle(
                      booking.status
                    )}`}
                  >
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold text-slate-400">이용일</p>
                    <p className="mt-1 text-sm font-black">{booking.travel_date}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold text-slate-400">인원</p>
                    <p className="mt-1 text-sm font-black">{booking.people}명</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs font-black text-slate-700">예약자 정보</p>
                  <p className="mt-2 text-sm font-black">{booking.customer_name}</p>
                  <a
                    href={`tel:${booking.customer_phone}`}
                    className="mt-1 block text-sm font-bold text-blue-600"
                  >
                    📞 {booking.customer_phone}
                  </a>
                  {booking.customer_email && (
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {booking.customer_email}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">총 상품금액</p>
                    <p className="mt-1 text-xl font-black">
                      {money.format(booking.total_amount)}원
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">
                    접수 {new Date(booking.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>

                {booking.status === "예약요청" && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <label className="block">
                      <span className="text-xs font-black text-slate-600">
                        고객에게 보낼 안내 메시지
                      </span>
                      <textarea
                        value={messages[booking.booking_id] ?? ""}
                        onChange={(e) =>
                          setMessages((prev) => ({
                            ...prev,
                            [booking.booking_id]: e.target.value,
                          }))
                        }
                        placeholder="예: 예약 가능합니다. 예약금 확인 후 최종 확정됩니다."
                        rows={3}
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="mt-3 block">
                      <span className="text-xs font-black text-slate-600">
                        예약금 요청금액
                      </span>
                      <div className="relative mt-2">
                        <input
                          type="number"
                          min={0}
                          value={deposits[booking.booking_id] ?? ""}
                          onChange={(e) =>
                            setDeposits((prev) => ({
                              ...prev,
                              [booking.booking_id]: e.target.value,
                            }))
                          }
                          placeholder="예: 30000"
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-10 text-sm font-bold outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          원
                        </span>
                      </div>
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={actionBusy === booking.booking_id}
                        onClick={() =>
                          void respondBooking(booking.booking_id, "reject")
                        }
                        className="rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-black text-red-600 disabled:opacity-50"
                      >
                        예약 거절
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy === booking.booking_id}
                        onClick={() =>
                          void respondBooking(booking.booking_id, "accept")
                        }
                        className="rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50"
                      >
                        수락 + 예약금 요청
                      </button>
                    </div>
                  </div>
                )}

                {booking.status === "예약금대기" && (
                  <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-black text-blue-700">
                      예약금 결제 대기 중
                    </p>
                    <p className="mt-1 text-lg font-black text-blue-950">
                      {money.format(booking.deposit_amount)}원
                    </p>
                    {booking.vendor_message && (
                      <p className="mt-2 text-xs leading-5 text-blue-800">
                        {booking.vendor_message}
                      </p>
                    )}
                  </div>
                )}

                {booking.status === "예약확정" && (
                  <button
                    type="button"
                    disabled={actionBusy === booking.booking_id}
                    onClick={() => void completeBooking(booking.booking_id)}
                    className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50"
                  >
                    이용 완료 처리
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
