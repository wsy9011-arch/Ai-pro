"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
  inquiry: string | null;
  estimate_amount: number | null;
  status: string | null;
};

type Estimate = {
  id: string;
  customer_id: string;
  total_amount: number | null;
  status: string | null;
  created_at: string;
};

type Consultation = {
  id: string;
  user_id: string;
  customer_id: string;
  consultation_date: string;
  content: string | null;
  memo: string | null;
  next_contact_date: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerDetailProps = {
  customer: Customer;
  onClose: () => void;
};

export default function CustomerDetail({
  customer,
  onClose,
}: CustomerDetailProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  const [loading, setLoading] = useState(true);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEstimates = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error: estimateError } = await supabase
        .from("estimates")
        .select(
          "id,customer_id,total_amount,status,created_at"
        )
        .eq("user_id", user.id)
        .eq("customer_id", customer.id)
        .order("created_at", {
          ascending: false,
        });

      if (estimateError) throw estimateError;

      setEstimates((data ?? []) as Estimate[]);
    } catch (err) {
      console.error("CUSTOMER ESTIMATE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 이력을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [customer.id]);

  const loadConsultations = useCallback(async () => {
    setConsultationsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error: consultationError } = await supabase
        .from("consultations")
        .select(
          "id,user_id,customer_id,consultation_date,content,memo,next_contact_date,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .eq("customer_id", customer.id)
        .order("consultation_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (consultationError) throw consultationError;

      setConsultations((data ?? []) as Consultation[]);
    } catch (err) {
      console.error("CUSTOMER CONSULTATION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "상담 이력을 불러오지 못했습니다."
      );
    } finally {
      setConsultationsLoading(false);
    }
  }, [customer.id]);

  useEffect(() => {
    void loadEstimates();
    void loadConsultations();
  }, [loadEstimates, loadConsultations]);

  function formatPrice(amount: number | null) {
    return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("ko-KR");
  }

  function getEstimateStatusClass(status: string | null) {
    if (status === "승인") {
      return "bg-green-50 text-green-700";
    }

    if (status === "거절") {
      return "bg-red-50 text-red-700";
    }

    if (status === "발송완료") {
      return "bg-violet-50 text-violet-700";
    }

    return "bg-blue-50 text-blue-700";
  }

  const approvedAmount = estimates
    .filter((estimate) => estimate.status === "승인")
    .reduce(
      (sum, estimate) =>
        sum + Number(estimate.total_amount || 0),
      0
    );

  const approvedEstimateCount = estimates.filter(
    (estimate) => estimate.status === "승인"
  ).length;

  const latestConsultation = consultations[0];

  return (
    <div className="fixed inset-0 z-[999999] bg-black/60">
      <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center sm:p-4">
        <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl">
          {/* 헤더 */}
          <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-7">
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-600">
                CUSTOMER DETAIL
              </p>

              <h2 className="mt-1 break-words text-2xl font-black">
                {customer.name} 고객
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                고객정보부터 상담, 견적, 계약 진행상황까지 확인하세요.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold"
            >
              ✕
            </button>
          </div>

          {/* 내용 */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-10 sm:p-7">
            {/* 고객 기본정보 */}
            <section>
              <div>
                <p className="text-xs font-bold text-slate-400">
                  CUSTOMER PROFILE
                </p>

                <h3 className="mt-1 text-lg font-black">
                  고객 기본정보
                </h3>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  label="고객명"
                  value={customer.name}
                />

                <InfoCard
                  label="전화번호"
                  value={customer.phone || "등록되지 않음"}
                />

                <InfoCard
                  label="지역"
                  value={customer.region || "등록되지 않음"}
                />

                <InfoCard
                  label="서비스"
                  value={customer.service_type || "일반 상담"}
                />

                <InfoCard
                  label="현재 상태"
                  value={customer.status || "신규문의"}
                />

                <InfoCard
                  label="예상 견적"
                  value={formatPrice(customer.estimate_amount)}
                />
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">
                  문의 내용
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {customer.inquiry ||
                    "등록된 문의 내용이 없습니다."}
                </p>
              </div>
            </section>

            {/* 고객 진행 요약 */}
            <section className="mt-7">
              <p className="text-xs font-bold text-slate-400">
                CUSTOMER SUMMARY
              </p>

              <h3 className="mt-1 text-lg font-black">
                고객 진행 요약
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <SummaryCard
                  label="상담"
                  value={`${consultations.length}건`}
                />

                <SummaryCard
                  label="전체 견적"
                  value={`${estimates.length}건`}
                />

                <SummaryCard
                  label="승인 견적"
                  value={`${approvedEstimateCount}건`}
                />

                <SummaryCard
                  label="승인 금액"
                  value={formatPrice(approvedAmount)}
                />
              </div>
            </section>

            {/* 최근 상담 */}
            <section className="mt-7">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  LATEST CONSULTATION
                </p>

                <h3 className="mt-1 text-lg font-black">
                  최근 상담
                </h3>
              </div>

              {consultationsLoading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">
                  상담 이력을 불러오는 중...
                </div>
              ) : !latestConsultation ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-10 text-center">
                  <p className="text-sm font-bold text-slate-500">
                    아직 상담 기록이 없습니다.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    상담 관리에서 상담을 등록하면 이곳에 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-600">
                        상담일
                      </p>

                      <p className="mt-1 font-black">
                        {latestConsultation.consultation_date}
                      </p>
                    </div>

                    {latestConsultation.next_contact_date && (
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="text-xs font-bold text-slate-400">
                          다음 연락
                        </p>

                        <p className="mt-1 text-sm font-black text-amber-600">
                          {latestConsultation.next_contact_date}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold text-slate-400">
                      상담 내용
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {latestConsultation.content ||
                        "상담 내용이 없습니다."}
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold text-slate-400">
                      상담 메모
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {latestConsultation.memo ||
                        "메모가 없습니다."}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 상담 전체 이력 */}
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    CONSULTATION HISTORY
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    상담 이력
                  </h3>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {consultations.length}건
                </span>
              </div>

              {consultationsLoading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">
                  상담 이력을 불러오는 중...
                </div>
              ) : consultations.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-10 text-center">
                  <p className="text-sm font-bold text-slate-500">
                    상담 이력이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {consultations.map((consultation, index) => (
                    <div
                      key={consultation.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {index === 0 ? "최근 상담" : "상담 기록"}
                            </span>

                            <span className="text-xs text-slate-400">
                              {consultation.consultation_date}
                            </span>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {consultation.content ||
                              "상담 내용이 없습니다."}
                          </p>

                          {consultation.memo && (
                            <div className="mt-3 rounded-xl bg-slate-50 p-3">
                              <p className="text-xs font-bold text-slate-400">
                                메모
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-600">
                                {consultation.memo}
                              </p>
                            </div>
                          )}

                          {consultation.next_contact_date && (
                            <p className="mt-3 text-xs font-bold text-amber-600">
                              다음 연락 예정일:{" "}
                              {consultation.next_contact_date}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 견적 요약 */}
            <section className="mt-7">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  ESTIMATE SUMMARY
                </p>

                <h3 className="mt-1 text-lg font-black">
                  견적 요약
                </h3>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  label="전체 견적"
                  value={`${estimates.length}건`}
                />

                <SummaryCard
                  label="승인 견적"
                  value={`${approvedEstimateCount}건`}
                />

                <SummaryCard
                  label="승인 금액"
                  value={formatPrice(approvedAmount)}
                />
              </div>
            </section>

            {/* 견적 이력 */}
            <section className="mt-7">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  ESTIMATE HISTORY
                </p>

                <h3 className="mt-1 text-lg font-black">
                  견적 이력
                </h3>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400">
                  견적 이력을 불러오는 중...
                </div>
              ) : estimates.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 py-12 text-center">
                  <p className="text-sm font-bold text-slate-500">
                    아직 등록된 견적이 없습니다.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    견적을 등록하면 이곳에서 확인할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {estimates.map((estimate) => (
                    <div
                      key={estimate.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-400">
                            견적일
                          </p>

                          <p className="mt-1 font-bold">
                            {formatDate(estimate.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getEstimateStatusClass(
                              estimate.status
                            )}`}
                          >
                            {estimate.status || "작성중"}
                          </span>

                          <p className="font-black text-blue-600">
                            {formatPrice(estimate.total_amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 고객 진행 흐름 */}
            <section className="mt-7 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold text-blue-400">
                CUSTOMER JOURNEY
              </p>

              <h3 className="mt-1 text-lg font-black">
                고객 진행 흐름
              </h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <JourneyItem
                  number="01"
                  label="문의"
                  active
                />

                <JourneyItem
                  number="02"
                  label="상담"
                  active={
                    consultations.length > 0 ||
                    customer.status !== "신규문의"
                  }
                />

                <JourneyItem
                  number="03"
                  label="견적"
                  active={estimates.length > 0}
                />

                <JourneyItem
                  number="04"
                  label="계약"
                  active={estimates.some(
                    (estimate) =>
                      estimate.status === "승인"
                  )}
                />
              </div>
            </section>
          </div>

          {/* 하단 닫기 */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom)+5rem)] sm:p-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function JourneyItem({
  number,
  label,
  active,
}: {
  number: string;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        active
          ? "bg-blue-600"
          : "bg-white/10"
      }`}
    >
      <p className="text-xs font-bold opacity-60">
        {number}
      </p>

      <p className="mt-2 font-black">
        {label}
      </p>

      <p className="mt-1 text-xs opacity-70">
        {active ? "진행됨" : "대기"}
      </p>
    </div>
  );
}