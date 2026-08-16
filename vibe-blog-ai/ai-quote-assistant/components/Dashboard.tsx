"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
  status: string | null;
  created_at?: string;
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
  customer_id?: string | null;
  status?: string | null;
  inquiry?: string | null;
  next_contact_date?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

type ServiceRequest = {
  id: string;
  business_type: string;
  service_type: string | null;
  name: string;
  phone: string;
  region: string;
  inquiry: string;
  status: string;
  created_at: string;
};

export default function Dashboard({ onNavigate }: { onNavigate?: (menu: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [consultations, setConsultations] =
    useState<Consultation[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [accountType, setAccountType] = useState<"business" | "customer">("business");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
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

      const detectedAccountType =
        user.user_metadata?.account_type === "customer"
          ? "customer"
          : "business";

      setAccountType(detectedAccountType);

      if (detectedAccountType === "customer") {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id,name,phone,region,service_type,status,inquiry,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (customerError) throw customerError;
        setCustomers((customerData ?? []) as Customer[]);

        const { data: requestData, error: requestError } = await supabase
          .from("service_requests")
          .select("id,business_type,service_type,name,phone,region,inquiry,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (requestError) {
          console.warn("CUSTOMER SERVICE REQUEST WARNING:", requestError);
          setServiceRequests([]);
        } else {
          setServiceRequests((requestData ?? []) as ServiceRequest[]);
        }

        const { data: consultationData, error: consultationError } = await supabase
          .from("consultations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (consultationError) {
          console.warn("CUSTOMER CONSULTATION WARNING:", consultationError);
          setConsultations([]);
        } else {
          setConsultations((consultationData ?? []) as Consultation[]);
        }

        const customerId = (customerData?.[0] as { id?: string } | undefined)?.id;
        if (customerId) {
          const { data: estimateData, error: estimateError } = await supabase
            .from("estimates")
            .select("id,customer_id,total_amount,status,created_at")
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false });

          if (estimateError) {
            console.warn("CUSTOMER ESTIMATE WARNING:", estimateError);
            setEstimates([]);
          } else {
            setEstimates((estimateData ?? []) as Estimate[]);
          }
        } else {
          setEstimates([]);
        }

        return;
      }

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id,name,phone,region,service_type,status,created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (customerError) throw customerError;

      const { data: estimateData, error: estimateError } =
        await supabase
          .from("estimates")
          .select(
            "id,customer_id,total_amount,status,created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (estimateError) throw estimateError;

      const {
        data: consultationData,
        error: consultationError,
      } = await supabase
        .from("consultations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (consultationError) {
        console.warn(
          "CONSULTATION LOAD WARNING:",
          consultationError
        );
      }

      setCustomers(
        (customerData ?? []) as Customer[]
      );

      setEstimates(
        (estimateData ?? []) as Estimate[]
      );

      setConsultations(
        (consultationData ?? []) as Consultation[]
      );
      setServiceRequests([]);
    } catch (err) {
      console.error(
        "DASHBOARD LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "대시보드 데이터를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const approvedEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) => estimate.status === "승인"
    );
  }, [estimates]);

  const approvedSales = useMemo(() => {
    return approvedEstimates.reduce(
      (sum, estimate) =>
        sum + Number(estimate.total_amount || 0),
      0
    );
  }, [approvedEstimates]);

  const waitingEstimates = useMemo(() => {
    return estimates.filter(
      (estimate) =>
        estimate.status === "작성중" ||
        estimate.status === "발송완료"
    );
  }, [estimates]);

  const todayContactCount = useMemo(() => {
    const today = new Date();

    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    return consultations.filter(
      (consultation) => {
        const value =
          consultation.next_contact_date;

        if (!value) return false;

        return String(value).slice(0, 10) ===
          todayString;
      }
    ).length;
  }, [consultations]);

  const recentCustomers = useMemo(() => {
    return customers.slice(0, 5);
  }, [customers]);

  const recentEstimates = useMemo(() => {
    return estimates.slice(0, 5);
  }, [estimates]);

  function getCustomerName(customerId: string) {
    return (
      customers.find(
        (customer) => customer.id === customerId
      )?.name || "고객 정보 없음"
    );
  }

  function formatPrice(amount: number) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }

  function formatDate(date?: string) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "ko-KR"
    );
  }

  function getStatusClass(status: string | null) {
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-400 shadow-sm">
          대시보드를 불러오는 중...
        </div>
      </div>
    );
  }

  if (accountType === "customer") {
    const customer = customers[0];
    const recentRequests = serviceRequests.slice(0, 5);
    const activeRequests = serviceRequests.filter(
      (request) => request.status !== "완료" && request.status !== "거절"
    );

    return (
      <div className="pb-32">
        <div className="mb-7">
          <p className="text-sm font-bold text-emerald-600">CUSTOMER ACCOUNT</p>
          <h2 className="mt-1 text-3xl font-black">
            {customer?.name || "고객"}님, 안녕하세요 👋
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            내 문의부터 견적, 상담, 예약 진행 상황을 한곳에서 확인하세요.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-700">
            일부 정보는 아직 준비되지 않았습니다. 문의 내역은 계속 이용할 수 있습니다.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CustomerCard title="내 문의" value={`${serviceRequests.length}건`} description="신청한 서비스 문의" icon="📋" />
          <CustomerCard title="받은 견적" value={`${estimates.length}건`} description="업체에서 받은 견적" icon="💰" />
          <CustomerCard title="상담" value={`${consultations.length}건`} description="진행 중인 상담" icon="💬" />
          <CustomerCard title="진행 중" value={`${activeRequests.length}건`} description="아직 완료되지 않은 요청" icon="📅" />
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:p-6">
          <p className="text-sm font-black text-emerald-600">MY PROFILE</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">내 정보</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ProfileItem label="이름" value={customer?.name || "-"} />
            <ProfileItem label="전화번호" value={customer?.phone || "-"} />
            <ProfileItem label="지역" value={customer?.region || "-"} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400">MY REQUESTS</p>
                <h3 className="mt-1 text-xl font-black">최근 문의</h3>
              </div>
              <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                {serviceRequests.length}건
              </span>
            </div>

            {recentRequests.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                아직 문의한 서비스가 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black">{request.service_type || request.business_type}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(request.created_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{request.inquiry}</p>
                    <p className="mt-2 text-xs text-slate-400">📍 {request.region}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400">MY ESTIMATES</p>
                <h3 className="mt-1 text-xl font-black">받은 견적</h3>
              </div>
              <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                {estimates.length}건
              </span>
            </div>

            {estimates.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">아직 받은 견적이 없습니다.</div>
            ) : (
              <div className="mt-5 space-y-3">
                {estimates.slice(0, 5).map((estimate) => (
                  <div key={estimate.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">업체 견적</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(estimate.created_at)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(estimate.status)}`}>
                        {estimate.status || "작성중"}
                      </span>
                    </div>
                    <p className="mt-4 text-right text-xl font-black text-blue-600">
                      {formatPrice(Number(estimate.total_amount || 0))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold text-slate-400">CUSTOMER GUIDE</p>
          <h3 className="mt-1 text-xl font-black">내 계정에서 관리하는 정보</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <GuideCard icon="📋" title="서비스 문의" description="신청한 서비스와 진행 상태를 확인합니다." />
            <GuideCard icon="💰" title="견적 확인" description="업체에서 받은 견적을 확인합니다." />
            <GuideCard icon="📅" title="상담·예약" description="상담 기록과 예약 일정을 확인합니다." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* 헤더 */}
      <div className="mb-7">
        <p className="text-sm font-bold text-blue-600">
          AI QUOTE ASSISTANT
        </p>

        <h2 className="mt-1 text-3xl font-black">
          대시보드
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          오늘의 업무와 매출 현황을 한눈에
          확인하세요.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
          {error}
        </div>
      )}

      {/* 핵심 숫자 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="전체 고객"
          value={`${customers.length}명`}
          description="등록된 전체 고객"
          icon="👥"
          onClick={() => onNavigate?.("고객 관리")}
        />

        <DashboardCard
          title="상담 관리"
          value={`${consultations.length}건`}
          description={`오늘 연락 ${todayContactCount}건`}
          icon="💬"
          onClick={() => onNavigate?.("상담 관리")}
        />

        <DashboardCard
          title="견적 대기"
          value={`${waitingEstimates.length}건`}
          description={`전체 견적 ${estimates.length}건`}
          icon="📄"
          onClick={() => onNavigate?.("견적 관리")}
        />

        <DashboardCard
          title="승인 매출"
          value={formatPrice(approvedSales)}
          description={`${approvedEstimates.length}건 계약 완료`}
          icon="💰"
          onClick={() => onNavigate?.("계약 관리")}
        />
      </div>

      {/* 오늘 해야 할 일 */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-sm font-bold text-blue-600">
            TODAY
          </p>

          <h3 className="mt-1 text-xl font-black">
            오늘 해야 할 일
          </h3>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <TodoCard
            icon="📞"
            title="오늘 연락"
            value={`${todayContactCount}건`}
            description="다음 연락 예정 고객"
            onClick={() => onNavigate?.("상담 관리")}
          />

          <TodoCard
            icon="📄"
            title="견적 대기"
            value={`${waitingEstimates.length}건`}
            description="확인해야 할 견적"
            onClick={() => onNavigate?.("견적 관리")}
          />

          <TodoCard
            icon="👥"
            title="전체 고객"
            value={`${customers.length}명`}
            description="현재 등록 고객"
            onClick={() => onNavigate?.("고객 관리")}
          />

          <TodoCard
            icon="🔔"
            title="후속관리"
            value={`${todayContactCount}건`}
            description="연락 예정 고객 확인"
            onClick={() => onNavigate?.("후속 관리")}
          />
        </div>
      </div>

      {/* 최근 고객 + 최근 견적 */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* 최근 고객 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-400">
                CUSTOMERS
              </p>

              <h3 className="mt-1 text-xl font-black">
                최근 고객
              </h3>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">
              {customers.length}명
            </div>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              아직 등록된 고객이 없습니다.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentCustomers.map(
                (customer) => (
                  <div
                    key={customer.id}
                    className="rounded-2xl border border-slate-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black">
                          {customer.name}
                        </p>

                        <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                          {customer.region ||
                            "지역 미등록"}
                          {customer.service_type
                            ? ` · ${customer.service_type}`
                            : ""}
                        </p>
                      </div>

                      {customer.status && (
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      )}
                    </div>

                    {customer.phone && (
                      <p className="mt-3 text-xs font-bold text-slate-500">
                        📞 {customer.phone}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* 최근 견적 */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-400">
                ESTIMATES
              </p>

              <h3 className="mt-1 text-xl font-black">
                최근 견적
              </h3>
            </div>

            <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
              {estimates.length}건
            </div>
          </div>

          {recentEstimates.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              아직 저장된 견적이 없습니다.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentEstimates.map(
                (estimate) => (
                  <div
                    key={estimate.id}
                    className="rounded-2xl border border-slate-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black">
                          {getCustomerName(
                            estimate.customer_id
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            estimate.created_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          estimate.status
                        )}`}
                      >
                        {estimate.status ||
                          "작성중"}
                      </span>
                    </div>

                    <p className="mt-4 text-right text-lg font-black text-blue-600">
                      {formatPrice(
                        Number(
                          estimate.total_amount || 0
                        )
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* 매출 요약 */}
      <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
        <div>
          <p className="text-sm font-bold text-blue-400">
            SALES OVERVIEW
          </p>

          <h3 className="mt-1 text-xl font-black">
            현재 사업 현황
          </h3>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-3">
          <OverviewItem
            label="전체 견적금액"
            value={formatPrice(
              estimates.reduce(
                (sum, estimate) =>
                  sum +
                  Number(
                    estimate.total_amount || 0
                  ),
                0
              )
            )}
          />

          <OverviewItem
            label="승인 매출"
            value={formatPrice(approvedSales)}
          />

          <OverviewItem
            label="계약 전환율"
            value={
              estimates.length === 0
                ? "0%"
                : `${Math.round(
                    (approvedEstimates.length /
                      estimates.length) *
                      100
                  )}%`
            }
          />
        </div>

        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-xs leading-6 text-slate-400">
            승인된 견적은 계약 완료 매출로 계산됩니다.
            견적 상태가 변경되면 대시보드의 매출
            현황도 자동으로 변경됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}


function CustomerCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-400">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 font-black text-slate-900">{value}</p>
    </div>
  );
}

function GuideCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function DashboardCard({
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
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-400">
          {title}
        </p>

        <span className="text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-4 break-words text-2xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </button>
  );
}

function TodoCard({
  icon,
  title,
  value,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-blue-200"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>

          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>
        </div>

        <span className="text-xs font-bold text-blue-500">
          확인 →
        </span>
      </div>

      <p className="mt-3 text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </button>
  );
}

function OverviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5">
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black">
        {value}
      </p>
    </div>
  );
}