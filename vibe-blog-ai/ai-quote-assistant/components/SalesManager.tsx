"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Estimate = {
  id: string;
  customer_id: string;
  total_amount: number | null;
  status: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
};

type Contract = {
  id: string;
  customer_id: string;
  estimate_id: string | null;
  contract_date: string;
  amount: number;
  status: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deposit_amount: number | null;
  interim_amount: number | null;
  balance_amount: number | null;
  deposit_paid: boolean;
  interim_paid: boolean;
  balance_paid: boolean;
  deposit_paid_at: string | null;
  interim_paid_at: string | null;
  balance_paid_at: string | null;
};

const STATUS_OPTIONS = [
  "전체",
  "작성중",
  "발송완료",
  "승인",
  "거절",
];

// 계약 관리에 실제 등록된 계약만 매출로 집계합니다.
// 계약진행/계약완료/시공진행/시공완료는 모두 실제 계약이며,
// 계약대기/계약취소는 매출 집계에서 제외합니다.
function isActualContract(contract: Contract) {
  return (
    Boolean(contract.status) &&
    contract.status !== "계약대기" &&
    contract.status !== "계약취소"
  );
}

export default function SalesManager({
  onNavigate,
}: {
  onNavigate?: (menu: string) => void;
}) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSalesData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data: estimateData, error: estimateError } =
        await supabase
          .from("estimates")
          .select(
            "id,customer_id,total_amount,status,created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (estimateError) throw estimateError;

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id,name")
          .eq("user_id", user.id);

      if (customerError) throw customerError;

      const { data: contractData, error: contractError } =
        await supabase
          .from("contracts")
          .select(
            "id,customer_id,estimate_id,contract_date,amount,status,memo,created_at,updated_at,deposit_amount,interim_amount,balance_amount,deposit_paid,interim_paid,balance_paid,deposit_paid_at,interim_paid_at,balance_paid_at"
          )
          .eq("user_id", user.id)
          .order("contract_date", { ascending: false })
          .order("created_at", { ascending: false });

      if (contractError) throw contractError;

      setEstimates((estimateData ?? []) as Estimate[]);
      setCustomers((customerData ?? []) as Customer[]);
      setContracts((contractData ?? []) as Contract[]);
    } catch (err) {
      console.error("SALES LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "매출 데이터를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSalesData();
  }, [loadSalesData]);

  const totalEstimateAmount = useMemo(() => {
    return estimates.reduce(
      (sum, estimate) =>
        sum + Number(estimate.total_amount || 0),
      0
    );
  }, [estimates]);

  const completedEstimates = useMemo(() => {
    return estimates.filter((estimate) =>
      contracts.some(
        (contract) =>
          contract.estimate_id === estimate.id &&
          isActualContract(contract)
      )
    );
  }, [estimates, contracts]);

  const completedAmount = useMemo(() => {
    return contracts
      .filter((contract) => isActualContract(contract))
      .reduce(
        (sum, contract) => sum + Number(contract.amount || 0),
        0
      );
  }, [contracts]);

  const approvedButNotContractedEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) =>
        estimate.status === "승인" &&
        !contracts.some(
          (contract) => contract.estimate_id === estimate.id
        )
    );
  }, [estimates, contracts]);

  const waitingEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) =>
        estimate.status === "작성중" ||
        estimate.status === "발송완료"
    );
  }, [estimates]);

  const rejectedEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) => estimate.status === "거절"
    );
  }, [estimates]);

  const unpaidContractCount = useMemo(() => {
    return contracts.filter(
      (contract) =>
        isActualContract(contract) &&
        Number(contract.amount || 0) > 0
    ).length;
  }, [contracts]);

  const totalContractAmount = useMemo(() => {
    return contracts
      .filter((contract) => isActualContract(contract))
      .reduce(
        (sum, contract) => sum + Number(contract.amount || 0),
        0
      );
  }, [contracts]);



  const paymentSummary = useMemo(() => {
    let received = 0;
    let unpaid = 0;

    contracts.forEach((contract) => {
      const total = Number(contract.amount || 0);
      const paid =
        (contract.deposit_paid ? Number(contract.deposit_amount || 0) : 0) +
        (contract.interim_paid ? Number(contract.interim_amount || 0) : 0) +
        (contract.balance_paid ? Number(contract.balance_amount || 0) : 0);

      received += paid;
      unpaid += Math.max(total - paid, 0);
    });

    return { received, unpaid };
  }, [contracts]);

  const monthlyReceived = useMemo(() => {
    const map = new Map<string, number>();

    const add = (date: string | null, amount: number) => {
      if (!date || amount <= 0) return;
      const key = date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + amount);
    };

    contracts.forEach((contract) => {
      if (contract.deposit_paid) {
        add(contract.deposit_paid_at, Number(contract.deposit_amount || 0));
      }
      if (contract.interim_paid) {
        add(contract.interim_paid_at, Number(contract.interim_amount || 0));
      }
      if (contract.balance_paid) {
        add(contract.balance_paid_at, Number(contract.balance_amount || 0));
      }
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [contracts]);
  const conversionRate = useMemo(() => {
    if (estimates.length === 0) return 0;

    return Math.round(
      (contracts.filter(
        (contract) => isActualContract(contract)
      ).length /
        estimates.length) *
        100
    );
  }, [estimates.length, contracts]);

  const monthlySales = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        completed: number;
        count: number;
        contractCount: number;
      }
    >();

    estimates.forEach((estimate) => {
      const date = new Date(estimate.created_at);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const current = map.get(key) || {
        total: 0,
        completed: 0,
        count: 0,
        contractCount: 0,
      };

      const amount = Number(estimate.total_amount || 0);

      current.total += amount;
      current.count += 1;

      map.set(key, current);
    });

    contracts
      .filter((contract) => isActualContract(contract))
      .forEach((contract) => {
        const date = new Date(
          `${contract.contract_date}T00:00:00`
        );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        const current = map.get(key) || {
          total: 0,
          completed: 0,
          count: 0,
          contractCount: 0,
        };

        current.completed += Number(contract.amount || 0);
        current.contractCount += 1;

        map.set(key, current);
      });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [estimates, contracts]);

  const recentSixMonthSales = useMemo(() => {
    const salesByMonth = new Map(
      monthlySales.map(([month, data]) => [
        month,
        Number(data.completed || 0),
      ])
    );

    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      return {
        key,
        label: `${date.getMonth() + 1}월`,
        amount: Number(salesByMonth.get(key) || 0),
      };
    });
  }, [monthlySales]);

  const recentSixMonthMax = Math.max(
    ...recentSixMonthSales.map((item) => item.amount),
    0
  );

  const currentMonthSales =
    recentSixMonthSales[
      recentSixMonthSales.length - 1
    ]?.amount || 0;

  function formatPrice(amount: number) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }

  function getCustomerName(customerId: string) {
    return (
      customers.find(
        (customer) => customer.id === customerId
      )?.name || "고객 정보 없음"
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "ko-KR"
    );
  }

  function formatMonth(month: string) {
    const [year, monthNumber] = month.split("-");
    return `${year}년 ${Number(monthNumber)}월`;
  }

  function getStatusCount(status: string) {
    if (status === "전체") return estimates.length;

    return estimates.filter(
      (estimate) => estimate.status === status
    ).length;
  }

  return (
    <div className="pb-28">
      {/* 헤더 */}
      <div className="mb-7">
        <p className="text-sm font-bold text-blue-600">
          SALES ANALYTICS
        </p>

        <h2 className="mt-1 text-3xl font-black">
          매출 분석
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          실제 등록된 계약 데이터를 기준으로 매출 현황을
          확인합니다.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-sm">
          매출 데이터를 불러오는 중...
        </div>
      ) : (
        <>
          {/* 핵심 지표 */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SalesCard
              title="총 견적금액"
              value={formatPrice(totalEstimateAmount)}
              description={`${estimates.length}건의 견적`}
              icon="📄"
              onClick={() => onNavigate?.("견적 관리")}
            />

            <SalesCard
              title="실제 계약 금액"
              value={formatPrice(completedAmount)}
              description={`${contracts.filter((contract) => isActualContract(contract)).length}건 실제 계약`}
              icon="💰"
              onClick={() => onNavigate?.("계약 관리")}
            />

            <SalesCard
              title="계약 대기"
              value={`${approvedButNotContractedEstimates.length}건`}
              description="승인됐지만 계약 미등록"
              icon="⏳"
              onClick={() => onNavigate?.("계약 관리")}
            />

            <SalesCard
              title="계약 전환율"
              value={`${conversionRate}%`}
              description="견적 대비 실제 계약"
              icon="📈"
              onClick={() => onNavigate?.("계약 관리")}
            />

            <SalesCard
              title="실제 입금액"
              value={formatPrice(paymentSummary.received)}
              description="계약금·중도금·잔금 실제 입금"
              icon="🏦"
              onClick={() => onNavigate?.("미수금 관리")}
            />

            <SalesCard
              title="남은 미수금"
              value={formatPrice(paymentSummary.unpaid)}
              description={`${unpaidContractCount}건 계약 기준`}
              icon="💳"
              onClick={() => onNavigate?.("미수금 관리")}
            />
          </div>

          {/* 상태별 현황 */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-sm font-bold text-slate-400">
                ESTIMATE STATUS
              </p>

              <h3 className="mt-1 text-xl font-black">
                견적 상태 현황
              </h3>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold text-slate-400">
                    {status}
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {getStatusCount(status)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    건
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 월별 매출 */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-sm font-bold text-slate-400">
                MONTHLY SALES
              </p>

              <h3 className="mt-1 text-xl font-black">
                월별 매출 현황
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                contracts에 등록된 실제 계약 금액을
                매출로 계산합니다.
              </p>
            </div>

            {monthlySales.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                아직 매출 데이터가 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {monthlySales.map(
                  ([month, data]) => (
                    <div
                      key={month}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black">
                            {formatMonth(month)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            견적 {data.count}건 · 계약 {data.contractCount}건
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <p className="text-xs text-slate-400">
                              전체 견적
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {formatPrice(data.total)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              실제 계약 매출
                            </p>

                            <p className="mt-1 text-sm font-black text-blue-600">
                              {formatPrice(
                                data.completed
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm font-bold text-slate-400">CASH SALES</p>
            <h3 className="mt-1 text-xl font-black">월별 실제 입금 매출</h3>
            <p className="mt-1 text-xs text-slate-400">
              계약일이 아니라 실제 입금완료 처리된 날짜를 기준으로 계산합니다.
            </p>

            {monthlyReceived.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                아직 입금완료 처리된 금액이 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {monthlyReceived.map(([month, amount]) => (
                  <div
                    key={month}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="font-black">{formatMonth(month)}</p>
                    <p className="text-lg font-black text-emerald-600">
                      {formatPrice(amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 매출 요약 + 최근 6개월 추이 */}
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
              <p className="text-sm font-bold text-blue-400">
                SALES SUMMARY
              </p>

              <h3 className="mt-1 text-xl font-black">
                현재 매출 요약
              </h3>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <SummaryRow
                  label="전체 견적"
                  value={`${estimates.length}건`}
                />

                <SummaryRow
                  label="전체 견적금액"
                  value={formatPrice(
                    totalEstimateAmount
                  )}
                />

                <SummaryRow
                  label="실제 계약"
                  value={`${completedEstimates.length}건`}
                />

                <SummaryRow
                  label="실제 계약 금액"
                  value={formatPrice(completedAmount)}
                />

                <SummaryRow
                  label="계약 대기"
                  value={`${waitingEstimates.length}건`}
                />

                <SummaryRow
                  label="거절"
                  value={`${rejectedEstimates.length}건`}
                />

                <SummaryRow
                  label="계약 전환율"
                  value={`${conversionRate}%`}
                />

                <SummaryRow
                  label="실제 입금액"
                  value={formatPrice(paymentSummary.received)}
                />

                <SummaryRow
                  label="남은 미수금"
                  value={formatPrice(paymentSummary.unpaid)}
                />
              </div>

              <div className="mt-7 rounded-2xl bg-white/10 p-4">
                <p className="text-xs leading-6 text-slate-400">
                  현재 매출은 견적의
                  <strong className="text-white">
                    {" "}
                    승인
                  </strong>
                  상태가 아니라 실제로
                  <strong className="text-white">
                    {" "}
                    계약 등록
                  </strong>
                  된 금액을 기준으로 계산합니다.
                  계약을 등록하면 매출에 자동 반영됩니다.
                </p>
              </div>
            </div>

            {/* 최근 6개월 매출 추이 */}
            <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-bold text-blue-600">
                SALES TREND
              </p>

              <h3 className="mt-1 text-xl font-black">
                최근 6개월 매출 추이
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                실제 등록된 계약 금액을 월별로 비교합니다.
              </p>

              <div className="mt-6 flex-1 rounded-2xl bg-slate-50 p-4 sm:p-5">
                <div className="flex h-64 items-end gap-2 sm:gap-3">
                  {recentSixMonthSales.map((item) => {
                    const barHeight =
                      recentSixMonthMax <= 0
                        ? 4
                        : item.amount <= 0
                          ? 4
                          : Math.max(
                              12,
                              Math.round(
                                (item.amount /
                                  recentSixMonthMax) *
                                  100
                              )
                            );

                    return (
                      <div
                        key={item.key}
                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                      >
                        <p className="mb-2 min-h-8 break-words text-center text-[10px] font-black leading-4 text-slate-500">
                          {item.amount > 0
                            ? formatPrice(item.amount)
                            : ""}
                        </p>

                        <div className="flex h-44 items-end justify-center">
                          <div
                            className="w-full max-w-11 rounded-t-xl bg-blue-600 shadow-sm"
                            style={{
                              height: `${barHeight}%`,
                              minHeight: "4px",
                            }}
                          />
                        </div>

                        <p className="mt-3 text-center text-xs font-black text-slate-600">
                          {item.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                <div>
                  <p className="text-xs font-bold text-blue-500">
                    THIS MONTH
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-700">
                    이번 달 실제 계약 매출
                  </p>
                </div>

                <p className="text-xl font-black text-blue-600">
                  {formatPrice(currentMonthSales)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SalesCard({
  title,
  value,
  description,
  icon,
  onClick,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400">
          {title}
        </p>

        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-4 break-words text-2xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>

      {onClick && (
        <p className="mt-3 text-xs font-black text-blue-600">
          클릭해서 보기 →
        </p>
      )}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const isCompleted = status === "승인";
  const isRejected = status === "거절";

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
        isCompleted
          ? "bg-green-50 text-green-700"
          : isRejected
          ? "bg-red-50 text-red-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {status}
    </span>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="block text-xs font-bold text-slate-400">
        {label}
      </span>

      <span className="mt-2 block break-words text-lg font-black text-white">
        {value}
      </span>
    </div>
  );
}