"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
  status: string | null;
};

type Consultation = {
  id: string;
  customer_id: string | null;
  consultation_date: string;
  content: string | null;
  memo: string | null;
  next_contact_date: string | null;
  created_at: string;
};

type Estimate = {
  id: string;
  customer_id: string;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  sent_at: string | null;
};

type FollowUpItem = {
  consultation: Consultation;
  customer: Customer | undefined;
  daysOverdue: number;
};

export default function FollowUpManager({
  onNavigate,
}: {
  onNavigate?: (menu: string) => void;
}) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingCustomerId, setSavingCustomerId] = useState<string | null>(null);
  const [outcomeCustomerId, setOutcomeCustomerId] = useState<string | null>(null);
  const [rescheduleCustomerId, setRescheduleCustomerId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const [consultationResult, estimateResult, customerResult] =
        await Promise.all([
          supabase
            .from("consultations")
            .select(
              "id,customer_id,consultation_date,content,memo,next_contact_date,created_at"
            )
            .eq("user_id", user.id)
            .order("next_contact_date", {
              ascending: true,
            }),

          supabase
            .from("estimates")
            .select(
              "id,customer_id,total_amount,status,created_at,sent_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("customers")
            .select("id,name,phone,region,status")
            .eq("user_id", user.id),
        ]);

      if (consultationResult.error)
        throw consultationResult.error;
      if (estimateResult.error)
        throw estimateResult.error;
      if (customerResult.error)
        throw customerResult.error;

      setConsultations(
        (consultationResult.data ?? []) as Consultation[]
      );
      setEstimates(
        (estimateResult.data ?? []) as Estimate[]
      );
      setCustomers(
        (customerResult.data ?? []) as Customer[]
      );
    } catch (err) {
      console.error("FOLLOW UP LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "후속관리 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const customerMap = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          customer.id,
          customer,
        ])
      ),
    [customers]
  );

  const completedCustomerIds = useMemo<Set<string>>(() => {
    const ids = consultations
      .filter(
        (consultation) =>
          String(consultation.content ?? "").startsWith(
            "견적 후속 연락 -"
          )
      )
      .map((consultation) => consultation.customer_id)
      .filter(
        (customerId): customerId is string =>
          Boolean(customerId)
      );

    return new Set(ids);
  }, [consultations]);

  const todayText = new Date().toISOString().slice(0, 10);
  const today = new Date(`${todayText}T00:00:00`);

  const estimateFollowUps = useMemo(() => {
    return estimates
      .filter((estimate) => estimate.status === "발송완료")
      .filter((estimate) => Boolean(estimate.sent_at))
      .map((estimate) => {
        const sent = new Date(
          `${String(estimate.sent_at).slice(0, 10)}T00:00:00`
        );

        const daysSinceEstimate = Math.floor(
          (today.getTime() - sent.getTime()) / 86400000
        );

        return {
          estimate,
          customer: customerMap.get(estimate.customer_id),
          daysSinceEstimate,
        };
      })
      .filter((item) => item.daysSinceEstimate >= 3)
      .filter(
        (item) =>
          !completedCustomerIds.has(item.estimate.customer_id)
      )
      .filter((item, index, array) => {
        // 같은 고객에게 여러 발송완료 견적이 있으면 가장 최근 견적만 표시
        return (
          array.findIndex(
            (candidate) =>
              candidate.estimate.customer_id ===
              item.estimate.customer_id
          ) === index
        );
      })
      .sort(
        (a, b) =>
          b.daysSinceEstimate - a.daysSinceEstimate
      );
  }, [
    estimates,
    customerMap,
    completedCustomerIds,
    todayText,
  ]);

  const todayScheduledContacts = useMemo(() => {
    const today = todayText;

    return consultations
      .filter(
        (consultation) =>
          consultation.next_contact_date &&
          String(consultation.next_contact_date).slice(0, 10) === today
      )
      .map((consultation) => ({
        consultation,
        customer: customerMap.get(
          consultation.customer_id || ""
        ),
      }))
      .filter((item) => Boolean(item.customer));
  }, [consultations, customerMap, todayText]);

  const items = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return consultations
      .filter(
        (consultation) =>
          Boolean(consultation.next_contact_date)
      )
      .map((consultation) => {
        const customer = customerMap.get(
          consultation.customer_id || ""
        );

        const date = new Date(
          `${consultation.next_contact_date}T00:00:00`
        );

        const daysOverdue = Math.floor(
          (today.getTime() - date.getTime()) /
            86400000
        );

        return {
          consultation,
          customer,
          daysOverdue,
        };
      })
      .filter((item) => {
        if (!keyword) return true;

        return [
          item.customer?.name,
          item.customer?.phone,
          item.customer?.region,
          item.consultation.content,
          item.consultation.memo,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(keyword)
          );
      })
      .sort((a, b) => {
        const aDate =
          a.consultation.next_contact_date || "";
        const bDate =
          b.consultation.next_contact_date || "";
        return aDate.localeCompare(bDate);
      });
  }, [consultations, customerMap, search]);

  const overdue = items.filter(
    (item) => item.daysOverdue > 0
  );
  const todayItems = items.filter(
    (item) => item.daysOverdue === 0
  );
  const upcoming = items.filter(
    (item) => item.daysOverdue < 0
  );

  async function updateCustomerStatus(
    customerId: string,
    status: string
  ) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("로그인이 필요합니다.");

    const { error } = await supabase
      .from("customers")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("user_id", user.id);

    if (error) throw error;

    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? { ...customer, status }
          : customer
      )
    );
  }

  async function recordFollowUp(
    customerId: string,
    outcome: string,
    nextContactDate: string | null = null
  ) {
    setSavingCustomerId(customerId);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      if (outcome === "재연락 예정" && !nextContactDate) {
        throw new Error("재연락 날짜를 선택해주세요.");
      }

      const statusMap: Record<string, string> = {
        "통화됨": "상담 완료",
        "통화 안 됨": "후속 관리",
        "재연락 예정": "후속 관리",
        "계약 진행": "계약 진행",
      };

      const customerStatus =
        statusMap[outcome] || "후속 관리";

      const todayText = new Date().toISOString().slice(0, 10);

      const { error: insertError } = await supabase
        .from("consultations")
        .insert({
          user_id: user.id,
          customer_id: customerId,
          consultation_date: todayText,
          content: `견적 후속 연락 - ${outcome}`,
          memo:
            outcome === "재연락 예정"
              ? `후속관리에서 연락 결과: ${outcome} / 재연락일: ${nextContactDate}`
              : `후속관리에서 연락 결과: ${outcome}`,
          next_contact_date: nextContactDate,
        });

      if (insertError) throw insertError;

      await updateCustomerStatus(
        customerId,
        customerStatus
      );

      await loadData();
      setOutcomeCustomerId(null);
      setRescheduleCustomerId(null);
      setRescheduleDate("");

      if (outcome === "계약 진행") {
        onNavigate?.("계약 관리");
        return;
      }

      alert(
        outcome === "재연락 예정"
          ? `${nextContactDate}에 다시 연락할 일정이 등록되었습니다.`
          : `"${outcome}"으로 기록되고 고객 상태가 "${customerStatus}"로 변경되었습니다.`
      );
    } catch (err) {
      console.error("FOLLOW UP SAVE ERROR:", err);
      alert(
        err instanceof Error
          ? err.message
          : "후속 연락 결과 기록에 실패했습니다."
      );
    } finally {
      setSavingCustomerId(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const [year, month, day] = value.split("-");
    return `${year}.${month}.${day}`;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">
            FOLLOW UP
          </p>

          <h2 className="mt-1 text-3xl font-black">
            후속관리
          </h2>

          <p className="mt-2 text-slate-500">
            연락 예정 고객과 놓친 후속 연락을 한눈에 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("상담 관리")}
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            상담 관리 →
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("follow-up-schedule")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            예정 연락 →
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FollowUpSummary
          label="놓친 연락"
          value={`${overdue.length}건`}
          icon="🔴"
          danger
        />

        <FollowUpSummary
          label="오늘 연락"
          value={`${todayItems.length}건`}
          icon="🟡"
        />

        <FollowUpSummary
          label="예정 연락"
          value={`${upcoming.length}건`}
          icon="🔵"
        />
      </div>

      <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              TODAY FOLLOW-UP
            </p>
            <h3 className="mt-1 text-xl font-black">
              오늘 연락할 고객
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              재연락 날짜가 오늘로 지정된 고객입니다.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-200">
            {todayScheduledContacts.length}건
          </span>
        </div>

        {todayScheduledContacts.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-5 text-center text-sm text-slate-400">
            오늘 예정된 재연락 고객이 없습니다.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {todayScheduledContacts.map((item) => (
              <div
                key={item.consultation.id}
                className="rounded-2xl border border-blue-100 bg-white p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-black">
                      {item.customer?.name || "고객 정보 없음"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.customer?.phone || "-"} ·{" "}
                      {item.customer?.region || "-"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs font-bold text-blue-600">
                        오늘 재연락 예정
                      </span>

                      {item.customer?.status && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          현재 상태: {item.customer.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={!item.customer?.phone}
                      onClick={() => {
                        if (item.customer?.phone) {
                          window.location.href = `tel:${item.customer.phone}`;
                        }
                      }}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      📞 전화하기
                    </button>

                    <button
                      type="button"
                      disabled={!item.customer?.phone}
                      onClick={() => {
                        if (item.customer?.phone) {
                          window.location.href = `sms:${item.customer.phone}`;
                        }
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      💬 문자
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate?.("상담 관리")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      📝 상담
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-amber-600">
              AUTOMATIC FOLLOW-UP
            </p>
            <h3 className="mt-1 text-xl font-black">
              견적 후 3일 이상 미응답
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              발송완료 상태로 3일 이상 지난 견적을 자동으로 표시합니다.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200">
            {estimateFollowUps.length}건
          </span>
        </div>

        {estimateFollowUps.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-5 text-center text-sm text-slate-400">
            현재 후속 연락이 필요한 견적이 없습니다.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {estimateFollowUps.map((item) => (
              <div
                key={item.estimate.id}
                className="rounded-2xl border border-amber-100 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate?.("견적 관리")}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">
                        {item.customer?.name || "고객 정보 없음"}
                      </p>

                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                        {item.daysSinceEstimate}일 경과
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.customer?.phone || "-"} ·{" "}
                      {item.customer?.region || "-"}
                    </p>

                    <p className="mt-2 text-xs font-bold text-slate-400">
                      견적 발송일{" "}
                      {new Date(
                        item.estimate.sent_at as string
                      ).toLocaleDateString("ko-KR")}
                    </p>

                    <p className="mt-2 text-xs font-bold text-blue-500">
                      견적 관리에서 확인 →
                    </p>
                  </button>

                  <div className="shrink-0">
                    <p className="text-xs font-bold text-slate-400">
                      견적금액
                    </p>

                    <p className="mt-1 font-black">
                      {Number(item.estimate.total_amount || 0).toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={!item.customer?.phone}
                      onClick={() => {
                        if (item.customer?.phone) {
                          window.location.href = `tel:${item.customer.phone}`;
                        }
                      }}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      📞 전화하기
                    </button>

                    <button
                      type="button"
                      disabled={!item.customer?.phone}
                      onClick={() => {
                        if (item.customer?.phone) {
                          window.location.href = `sms:${item.customer.phone}`;
                        }
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      💬 문자 보내기
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate?.("상담 관리")}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      📝 상담 관리
                    </button>
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-black text-slate-500">
                        후속 연락 결과
                      </p>

                      <button
                        type="button"
                        disabled={
                          savingCustomerId === item.customer?.id ||
                          !item.customer?.id
                        }
                        onClick={() => {
                          if (item.customer?.id) {
                            setOutcomeCustomerId(
                              outcomeCustomerId === item.customer.id
                                ? null
                                : item.customer.id
                            );
                          }
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingCustomerId === item.customer?.id
                          ? "기록 중..."
                          : "결과 기록하기 →"}
                      </button>
                    </div>

                    {outcomeCustomerId === item.customer?.id && (
                      <>
                        <p className="mt-3 text-xs font-bold text-slate-400">
                          계약 진행을 선택하면 고객 상태를 변경한 뒤 계약 관리 화면으로 바로 이동합니다.
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          "통화됨",
                          "통화 안 됨",
                          "재연락 예정",
                          "계약 진행",
                        ].map((outcome) => (
                          <button
                            type="button"
                            key={outcome}
                            disabled={savingCustomerId === item.customer?.id}
                            onClick={() => {
                              if (!item.customer?.id) return;

                              if (outcome === "재연락 예정") {
                                setRescheduleCustomerId(
                                  rescheduleCustomerId === item.customer.id
                                    ? null
                                    : item.customer.id
                                );
                                setRescheduleDate("");
                                return;
                              }

                              void recordFollowUp(
                                item.customer.id,
                                outcome
                              );
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {outcome}
                          </button>
                        ))}
                        </div>
                      </>
                    )}

                    {rescheduleCustomerId === item.customer?.id && (
                      <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4">
                        <p className="text-sm font-black text-slate-700">
                          📅 재연락 날짜
                        </p>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="date"
                            value={rescheduleDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) =>
                              setRescheduleDate(e.target.value)
                            }
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          />

                          <button
                            type="button"
                            disabled={
                              !rescheduleDate ||
                              savingCustomerId === item.customer?.id
                            }
                            onClick={() => {
                              if (item.customer?.id && rescheduleDate) {
                                void recordFollowUp(
                                  item.customer.id,
                                  "재연락 예정",
                                  rescheduleDate
                                );
                              }
                            }}
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {savingCustomerId === item.customer?.id
                              ? "저장 중..."
                              : "재연락 일정 저장"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        id="follow-up-schedule"
        className="mt-6 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black">
              연락 일정
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              고객을 클릭하면 상담 관리 화면으로 이동합니다.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="고객명 / 전화번호 / 메모 검색"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 sm:w-72"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            후속관리 정보를 불러오는 중...
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 font-black">
              예정된 후속 연락이 없습니다.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              상담 관리에서 다음 연락일을 등록하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const status =
                item.daysOverdue > 0
                  ? "놓친 연락"
                  : item.daysOverdue === 0
                  ? "오늘 연락"
                  : "예정";

              const statusClass =
                item.daysOverdue > 0
                  ? "bg-red-50 text-red-600"
                  : item.daysOverdue === 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-600";

              return (
                <div
                  key={item.consultation.id}
                  className="rounded-2xl border border-slate-200 bg-white transition hover:border-blue-300"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedScheduleId(
                        selectedScheduleId === item.consultation.id
                          ? null
                          : item.consultation.id
                      )
                    }
                    className="w-full rounded-2xl p-4 text-left transition hover:bg-blue-50/30"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {item.customer?.name || "고객 정보 없음"}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}
                          >
                            {status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {item.customer?.phone || "-"} ·{" "}
                          {item.customer?.region || "-"}
                        </p>

                        {item.consultation.content && (
                          <p className="mt-2 max-w-2xl truncate text-sm text-slate-600">
                            {item.consultation.content}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-left lg:text-right">
                        <p className="text-xs font-bold text-slate-400">
                          다음 연락일
                        </p>

                        <p className="mt-1 text-lg font-black">
                          {formatDate(item.consultation.next_contact_date)}
                        </p>

                        {item.daysOverdue > 0 && (
                          <p className="mt-1 text-xs font-bold text-red-500">
                            {item.daysOverdue}일 지남
                          </p>
                        )}

                        <p className="mt-2 text-xs font-bold text-blue-500">
                          {selectedScheduleId === item.consultation.id
                            ? "상세 닫기 ↑"
                            : "상담 내용 보기 ↓"}
                        </p>
                      </div>
                    </div>
                  </button>

                  {selectedScheduleId === item.consultation.id && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black text-slate-400">
                            상담일
                          </p>
                          <p className="mt-1 font-black">
                            {formatDate(item.consultation.consultation_date)}
                          </p>

                          <p className="mt-4 text-xs font-black text-slate-400">
                            다음 연락일
                          </p>
                          <p className="mt-1 font-black">
                            {formatDate(item.consultation.next_contact_date)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs font-black text-slate-400">
                            상담 내용
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {item.consultation.content || "등록된 상담 내용이 없습니다."}
                          </p>
                        </div>
                      </div>

                      {item.consultation.memo && (
                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-xs font-black text-slate-400">
                            상담 메모
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {item.consultation.memo}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          disabled={savingCustomerId === item.customer?.id}
                          onClick={() => {
                            if (item.customer?.id) {
                              void recordFollowUp(item.customer.id, "통화됨");
                            }
                          }}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                        >
                          ✅ 통화 완료
                        </button>

                        <button
                          type="button"
                          disabled={savingCustomerId === item.customer?.id}
                          onClick={() => {
                            if (item.customer?.id) {
                              setRescheduleCustomerId(item.customer.id);
                              setRescheduleDate("");
                            }
                          }}
                          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
                        >
                          📅 재연락 일정
                        </button>

                        <button
                          type="button"
                          disabled={savingCustomerId === item.customer?.id}
                          onClick={() => {
                            if (item.customer?.id) {
                              void recordFollowUp(item.customer.id, "계약 진행");
                            }
                          }}
                          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-400"
                        >
                          🤝 계약 진행
                        </button>
                      </div>

                      {rescheduleCustomerId === item.customer?.id && (
                        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-sm font-black text-slate-700">
                            재연락 날짜를 선택하세요.
                          </p>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input
                              type="date"
                              value={rescheduleDate}
                              onChange={(event) =>
                                setRescheduleDate(event.target.value)
                              }
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                            />

                            <button
                              type="button"
                              disabled={
                                !rescheduleDate ||
                                savingCustomerId === item.customer?.id
                              }
                              onClick={() => {
                                if (item.customer?.id) {
                                  void recordFollowUp(
                                    item.customer.id,
                                    "재연락 예정",
                                    rescheduleDate
                                  );
                                }
                              }}
                              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:bg-blue-300"
                            >
                              일정 저장
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleCustomerId(null);
                                setRescheduleDate("");
                              }}
                              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-600"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => onNavigate?.("상담 관리")}
                          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                          상담 관리에서 전체 기록 보기 →
                        </button>

                        {item.customer?.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `tel:${item.customer?.phone}`;
                            }}
                            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
                          >
                            📞 바로 전화하기
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpSummary({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm ${
        danger
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400">
          {label}
        </p>
        <span className="text-xl">{icon}</span>
      </div>

      <p
        className={`mt-4 text-2xl font-black ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}