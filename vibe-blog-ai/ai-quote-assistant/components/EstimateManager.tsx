"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import EstimateDocument from "@/components/EstimateDocument";
import ReviewModal from "@/components/ReviewModal";

type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
  inquiry: string | null;
};

type Estimate = {
  id: string;
  user_id: string;
  customer_id: string;
  customer_user_id: string | null;
  estimate_number: string | null;
  work_description: string | null;
  material_cost: number | null;
  labor_cost: number | null;
  other_cost: number | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  sent_at: string | null;
};

type BusinessProfile = {
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  address: string | null;
};

type Contract = {
  id: string;
  estimate_id: string | null;
};

type ReviewSummary = {
  estimate_id: string | null;
  rating: number;
};

const STATUS_OPTIONS = [
  "작성중",
  "견적발송",
  "승인",
  "거절",
];

export default function EstimateManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [contractSavingId, setContractSavingId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingCount, setRemainingCount] = useState(0);

  const [customerId, setCustomerId] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [customerReply, setCustomerReply] = useState("");

  const [selectedEstimate, setSelectedEstimate] =
    useState<Estimate | null>(null);

  const [reviewEstimate, setReviewEstimate] =
    useState<Estimate | null>(null);

  const loadData = useCallback(async () => {
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

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
  "id,user_id,name,phone,region,service_type,inquiry"
)
          .eq("user_id", user.id);

      if (customerError) throw customerError;

      const { data: estimateData, error: estimateError } =
        await supabase
          .from("estimates")
          .select(
            "id,user_id,customer_id,customer_user_id,estimate_number,work_description,material_cost,labor_cost,other_cost,total_amount,status,created_at,sent_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (estimateError) throw estimateError;

      const { data: contractData, error: contractError } =
        await supabase
          .from("contracts")
          .select("id,estimate_id")
          .eq("user_id", user.id);

      if (contractError) throw contractError;

      const { data: reviewData, error: reviewError } =
        await supabase
          .from("reviews")
          .select("estimate_id,rating")
          .eq("user_id", user.id);

      if (reviewError) throw reviewError;

      const { data: profileData, error: profileError } =
        await supabase
          .from("business_profiles")
          .select(
            "business_name,owner_name,phone,business_number,address"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      setCustomers((customerData ?? []) as Customer[]);
      setEstimates((estimateData ?? []) as Estimate[]);
      setContracts((contractData ?? []) as Contract[]);
      setReviews((reviewData ?? []) as ReviewSummary[]);
      setBusinessProfile(
        (profileData ?? null) as BusinessProfile | null
      );
    } catch (err) {
      console.error("ESTIMATE LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function toNumber(value: string) {
    const number = Number(value.replace(/,/g, ""));
    return Number.isNaN(number) ? 0 : number;
  }

  const totalAmount = useMemo(() => {
    return (
      toNumber(materialCost) +
      toNumber(laborCost) +
      toNumber(otherCost)
    );
  }, [materialCost, laborCost, otherCost]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId
  );

  const documentCustomer = selectedEstimate
    ? customers.find(
        (customer) =>
          customer.id === selectedEstimate.customer_id
      )
    : undefined;

  function getCustomer(id: string) {
    return customers.find((customer) => customer.id === id);
  }

  function getReviewForEstimate(estimateId: string) {
    return reviews.find(
      (review) => review.estimate_id === estimateId
    );
  }

  async function resolveCustomerUserId(
    businessUserId: string,
    customer: Customer
  ) {
    // 1. 가장 정확한 연결: match_requests.matched_customer_id
    const { data: exactMatchRows, error: exactMatchError } = await supabase
      .from("match_requests")
      .select("customer_user_id,accepted_at,created_at")
      .eq("matched_business_id", businessUserId)
      .eq("matched_customer_id", customer.id)
      .not("customer_user_id", "is", null)
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (exactMatchError) throw exactMatchError;

    const exactCustomerUserId =
      exactMatchRows?.[0]?.customer_user_id || null;

    if (exactCustomerUserId) {
      return exactCustomerUserId;
    }

    const normalizedPhone = customer.phone?.trim() || "";

    // 2. 중복 customers 행이 생겨 matched_customer_id가 달라도,
    // 같은 업체 + 같은 전화번호의 최근 매칭 문의에서 실제 고객 계정을 찾습니다.
    if (normalizedPhone) {
      const { data: phoneMatchRows, error: phoneMatchError } = await supabase
        .from("match_requests")
        .select("customer_user_id,accepted_at,created_at")
        .eq("matched_business_id", businessUserId)
        .eq("customer_phone", normalizedPhone)
        .not("customer_user_id", "is", null)
        .order("accepted_at", { ascending: false, nullsFirst: false })
        .limit(1);

      if (phoneMatchError) throw phoneMatchError;

      const phoneMatchCustomerUserId =
        phoneMatchRows?.[0]?.customer_user_id || null;

      if (phoneMatchCustomerUserId) {
        return phoneMatchCustomerUserId;
      }

      // 3. 온라인 문의(service_requests)는 user_id가 실제 고객 로그인 계정입니다.
      const { data: serviceRequestRows, error: serviceRequestError } =
        await supabase
          .from("service_requests")
          .select("user_id,created_at")
          .eq("phone", normalizedPhone)
          .order("created_at", { ascending: false })
          .limit(1);

      if (serviceRequestError) throw serviceRequestError;

      const serviceRequestCustomerUserId =
        serviceRequestRows?.[0]?.user_id || null;

      if (serviceRequestCustomerUserId) {
        return serviceRequestCustomerUserId;
      }
    }

    return null;
  }

  function formatPrice(amount: number | null) {
    return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function resetEstimate() {
    setCustomerId("");
    setWorkDescription("");
    setMaterialCost("");
    setLaborCost("");
    setOtherCost("");
    setCustomerReply("");
    setError("");
  }

  async function generateAiEstimate() {
    if (!selectedCustomer) {
      setError("먼저 고객을 선택해주세요.");
      return;
    }

    if (!selectedCustomer.inquiry?.trim()) {
      setError(
        "선택한 고객의 문의 내용이 없습니다. 고객 정보에서 문의 내용을 먼저 등록해주세요."
      );
      return;
    }

    setAiLoading(true);
    setError("");
    setCustomerReply("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 현재 로그인한 사용자의 AI 이용권 확인
      const { data: planData, error: planError } =
        await supabase
          .from("user_plans")
          .select("remaining_count,unlimited")
          .eq("user_id", user.id)
          .maybeSingle();

      if (planError) throw planError;

      const unlimited = Boolean(planData?.unlimited);
      const remainingCount = Number(
        planData?.remaining_count ?? 0
      );

      setRemainingCount(remainingCount);

      // 무제한 계정이 아니고 이용 횟수가 없으면 생성 차단
if (!unlimited && remainingCount <= 0) {
  setRemainingCount(0);
  setError(
    "무료 AI 견적 3회를 모두 사용했습니다. 유료 플랜 출시 후 추가 이용할 수 있습니다."
  );
  setAiLoading(false);
  return;
}

// 현재 업체의 업종 확인
const { data: profileForEstimate, error: profileForEstimateError } =
  await supabase
    .from("business_profiles")
    .select("business_type")
    .eq("user_id", user.id)
    .maybeSingle();

if (profileForEstimateError) throw profileForEstimateError;

const businessType = profileForEstimate?.business_type;

if (!businessType) {
  throw new Error("설정에서 업종을 먼저 선택하고 저장해주세요.");
}

// 현재 선택된 업종의 활성 단가표만 불러오기
const { data: priceItems, error: priceItemsError } =
  await supabase
    .from("price_items")
    .select(
      "item_name,unit,unit_price,category,description,business_type"
    )
    .eq("user_id", user.id)
    .eq("business_type", businessType)
    .eq("is_active", true);

if (priceItemsError) {
  throw priceItemsError;
}
      // AI 견적 생성
      const response = await fetch("/api/ai-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  customerName: selectedCustomer.name,
  region: selectedCustomer.region,
  serviceType: selectedCustomer.service_type,
  inquiry: selectedCustomer.inquiry,
  priceItems: priceItems || [],
}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI 견적 생성에 실패했습니다."
        );
      }

      // AI 생성이 성공한 경우에만 1회 차감
      if (!unlimited) {
        const { error: deductError } =
          await supabase
            .from("user_plans")
            .update({
              remaining_count: remainingCount - 1,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

        if (deductError) throw deductError;
      }

      // AI 결과 반영
      setWorkDescription(data.workDescription || "");

      setMaterialCost(
        String(Number(data.materialCost) || 0)
      );

      setLaborCost(
        String(Number(data.laborCost) || 0)
      );

      setOtherCost(
        String(Number(data.otherCost) || 0)
      );

      setCustomerReply(data.customerReply || "");
    } catch (err) {
      console.error("AI ESTIMATE CLIENT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "AI 견적 생성 중 오류가 발생했습니다."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function saveEstimate() {
    if (!customerId) {
      setError("고객을 선택해주세요.");
      return;
    }

    if (!workDescription.trim()) {
      setError("작업 내용을 입력해주세요.");
      return;
    }

    if (totalAmount <= 0) {
      setError("견적 금액을 입력해주세요.");
      return;
    }

    setSaving(true);
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

      // 견적번호 자동 생성: EST-YYYYMMDD-001
      const today = new Date();
      const datePart =
        today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");

      const { data: todayEstimates, error: numberError } = await supabase
        .from("estimates")
        .select("estimate_number")
        .eq("user_id", user.id)
        .like("estimate_number", `EST-${datePart}-%`);

      if (numberError) throw numberError;

      const maxSequence = (todayEstimates ?? []).reduce(
        (max, item) => {
          const value = String(item.estimate_number || "");
          const match = value.match(/-(\d+)$/);
          const sequence = match ? Number(match[1]) : 0;
          return Math.max(max, sequence);
        },
        0
      );

      const estimateNumber = `EST-${datePart}-${String(
        maxSequence + 1
      ).padStart(3, "0")}`;

      const selectedCustomerData = customers.find(
        (customer) => customer.id === customerId
      );

      if (!selectedCustomerData) {
        throw new Error("선택한 고객 정보를 찾을 수 없습니다.");
      }

      const customerUserId = await resolveCustomerUserId(
  user.id,
  selectedCustomerData
);

// 고객 계정이 없어도 견적 저장 허용
const finalCustomerUserId =
  customerUserId || null;

      const { error: insertError } = await supabase
        .from("estimates")
        .insert({
          user_id: user.id,
          customer_id: customerId,
          customer_user_id: finalCustomerUserId,
          estimate_number: estimateNumber,
          work_description: workDescription.trim(),
          material_cost: toNumber(materialCost),
          labor_cost: toNumber(laborCost),
          other_cost: toNumber(otherCost),
          total_amount: totalAmount,
          status: "견적발송",
        });

      if (insertError) throw insertError;

      await supabase
        .from("customers")
        .update({
          estimate_amount: totalAmount,
          status: "견적발송",
        })
        .eq("id", customerId)
        .eq("user_id", user.id);

      await loadData();
      resetEstimate();

      alert("견적이 저장되었습니다.");
    } catch (err) {
      console.error("ESTIMATE SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeEstimateStatus(
    estimateId: string,
    newStatus: string
  ) {
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

      const currentEstimate = estimates.find(
        (estimate) => estimate.id === estimateId
      );

      if (!currentEstimate) {
        throw new Error("견적 정보를 찾을 수 없습니다.");
      }

      const updateData: {
        status: string;
        updated_at: string;
        sent_at?: string;
        customer_user_id?: string | null;
      } = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // 발송할 때 기존 견적의 customer_user_id가 NULL이면 자동으로 복구합니다.
     if (
  newStatus === "견적발송" &&
  !currentEstimate.customer_user_id
) {
  const customer = getCustomer(
    currentEstimate.customer_id
  );

  if (customer) {
    const resolvedCustomerUserId =
      await resolveCustomerUserId(
        user.id,
        customer
      );

    updateData.customer_user_id =
      resolvedCustomerUserId || null;
  }
}

      // 최초로 "견적발송"가 되는 순간에만 발송일을 기록합니다.
      // 이후 상태를 변경해도 기존 발송일은 유지합니다.
      if (
        newStatus === "견적발송" &&
        !currentEstimate.sent_at
      ) {
        updateData.sent_at =
          new Date().toISOString();
      }

      const { data: updatedEstimate, error: updateError } =
        await supabase
          .from("estimates")
          .update(updateData)
          .eq("id", estimateId)
          .eq("user_id", user.id)
          .select(
            "id,user_id,customer_id,customer_user_id,estimate_number,work_description,material_cost,labor_cost,other_cost,total_amount,status,created_at,sent_at"
          )
          .single();

      if (updateError) throw updateError;

      setEstimates((current) =>
        current.map((estimate) =>
          estimate.id === estimateId
            ? (updatedEstimate as Estimate)
            : estimate
        )
      );
    } catch (err) {
      console.error("ESTIMATE STATUS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 상태 변경에 실패했습니다."
      );
    }
  }

  async function registerContract(estimate: Estimate) {
    if (estimate.status !== "승인") {
      setError("승인된 견적만 계약 등록할 수 있습니다.");
      return;
    }

    if (contracts.some((contract) => contract.estimate_id === estimate.id)) {
      alert("이미 계약 등록된 견적입니다.");
      return;
    }

    const customer = getCustomer(estimate.customer_id);

    if (!customer) {
      setError("고객 정보를 찾을 수 없습니다.");
      return;
    }

    setContractSavingId(estimate.id);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: createdContract, error: contractError } =
        await supabase
          .from("contracts")
          .insert({
            user_id: user.id,
            customer_id: estimate.customer_id,
            estimate_id: estimate.id,
            amount: Number(estimate.total_amount || 0),
            status: "계약진행",
          })
          .select("id,estimate_id")
          .single();

      if (contractError) throw contractError;

      setContracts((current) => [
        createdContract as Contract,
        ...current,
      ]);

      await supabase
        .from("customers")
        .update({ status: "계약완료" })
        .eq("id", estimate.customer_id)
        .eq("user_id", user.id);

      alert(`${customer.name} 고객의 계약이 등록되었습니다.`);
    } catch (err) {
      console.error("CONTRACT REGISTER ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "계약 등록 중 오류가 발생했습니다."
      );
    } finally {
      setContractSavingId(null);
    }
  }

  async function deleteEstimate(estimate: Estimate) {
    const customer = getCustomer(estimate.customer_id);

    const confirmed = window.confirm(
      `${customer?.name || "해당 고객"}의 견적을 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { error: deleteError } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimate.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setEstimates((current) =>
        current.filter(
          (item) => item.id !== estimate.id
        )
      );

      setReviews((current) =>
        current.filter(
          (review) => review.estimate_id !== estimate.id
        )
      );

      alert("견적이 삭제되었습니다.");
    } catch (err) {
      console.error("ESTIMATE DELETE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 삭제 중 오류가 발생했습니다."
      );
    }
  }

  return (
    <>
      <div className="pb-28">
        {/* 헤더 */}
        <div className="mb-7">
          <p className="text-sm font-bold text-blue-600">
            ESTIMATE MANAGEMENT
          </p>

          <h2 className="mt-1 text-3xl font-black">
            견적 관리
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            고객 상담 내용을 AI가 분석해 견적 초안을 만들 수 있습니다.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* 견적 작성 */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm font-bold text-blue-600">
              NEW ESTIMATE
            </p>

            <h3 className="mt-1 text-xl font-black">
              새 견적 작성
            </h3>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold">
                고객 선택 *
              </label>

              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setCustomerReply("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5"
              >
                <option value="">
                  고객을 선택해주세요
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                    {customer.region
                      ? ` · ${customer.region}`
                      : ""}
                    {customer.service_type
                      ? ` · ${customer.service_type}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">
                  고객 문의내용
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selectedCustomer.inquiry ||
                    "등록된 문의 내용이 없습니다."}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={generateAiEstimate}
              disabled={
                aiLoading || !selectedCustomer
              }
              className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-4 text-sm font-black text-white hover:bg-violet-700 disabled:bg-slate-300"
            >
              {aiLoading
                ? "✨ AI가 견적을 작성하는 중..."
                : "✨ AI 견적 자동작성"}
            </button>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              AI 견적은 초안입니다. 실제 현장 상태와
              시공 조건을 확인한 후 금액을 수정해주세요.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold">
                작업 내용 *
              </label>

              <textarea
                value={workDescription}
                onChange={(e) =>
                  setWorkDescription(e.target.value)
                }
                className="min-h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="작업 내용을 입력하거나 AI 자동작성을 사용하세요."
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <CostInput
                label="자재비"
                value={materialCost}
                onChange={setMaterialCost}
              />

              <CostInput
                label="인건비"
                value={laborCost}
                onChange={setLaborCost}
              />

              <CostInput
                label="기타비용"
                value={otherCost}
                onChange={setOtherCost}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold text-slate-400">
                총 견적금액
              </p>

              <p className="mt-2 text-3xl font-black">
                {formatPrice(totalAmount)}
              </p>
            </div>

            {customerReply && (
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <p className="text-sm font-black text-violet-700">
                  ✨ AI 고객 상담 답변
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {customerReply}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      customerReply
                    )
                  }
                  className="mt-4 rounded-xl bg-white px-4 py-3 text-xs font-black text-violet-700 shadow-sm"
                >
                  📋 답변 복사
                </button>
              </div>
            )}

            {/* 모바일에서도 항상 보이는 버튼 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetEstimate}
                className="rounded-xl border border-slate-200 px-4 py-4 text-sm font-bold"
              >
                초기화
              </button>

              <button
                type="button"
                onClick={saveEstimate}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white disabled:bg-blue-300"
              >
                {saving
                  ? "저장 중..."
                  : "💾 견적 저장"}
              </button>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-sm font-bold text-slate-400">
              ESTIMATE PREVIEW
            </p>

            <h3 className="mt-1 text-xl font-black">
              견적서 미리보기
            </h3>

            {!selectedCustomer ? (
              <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-12 text-center">
                <p className="text-3xl">📄</p>

                <p className="mt-3 text-sm font-bold text-slate-500">
                  고객을 선택해주세요.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-blue-600">
                  견적서
                </p>

                <p className="mt-2 text-2xl font-black">
                  {selectedCustomer.name} 고객님
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {selectedCustomer.phone ||
                    "전화번호 미등록"}
                </p>

                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="text-xs font-bold text-slate-400">
                    작업 내용
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {workDescription ||
                      "작업 내용 없음"}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-4">
                  <span className="font-black text-blue-700">
                    총 견적금액
                  </span>

                  <span className="text-xl font-black text-blue-700">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 저장된 견적 */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">
                저장된 견적
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                저장된 견적을 관리하세요.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black">
              {estimates.length}건
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              견적을 불러오는 중...
            </div>
          ) : estimates.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              저장된 견적이 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {estimates.map((estimate) => {
                const customer = getCustomer(
                  estimate.customer_id
                );

                const review = getReviewForEstimate(
                  estimate.id
                );

                return (
                  <div
                    key={estimate.id}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black">
                            {customer?.name ||
                              "고객 정보 없음"}
                          </p>

                          <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                            {estimate.work_description ||
                              "작업 내용 없음"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                            <span>
                              작성일 {formatDate(estimate.created_at)}
                            </span>
                            {estimate.sent_at && (
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                                발송일 {formatDate(estimate.sent_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="shrink-0 font-black text-blue-600">
                          {formatPrice(
                            estimate.total_amount
                          )}
                        </p>
                      </div>

                      {/* 상태 변경 */}
                      <select
                        value={
                          estimate.status || "작성중"
                        }
                        onChange={(e) =>
                          void changeEstimateStatus(
                            estimate.id,
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold"
                      >
                        {STATUS_OPTIONS.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>

                      {/* 모바일/PC 모두 자연스럽게 줄바꿈되는 작업 버튼 */}
                      <div className="flex flex-wrap gap-3">
                        {estimate.status === "승인" && (
                          <button
                            type="button"
                            onClick={() => void registerContract(estimate)}
                            disabled={
                              contractSavingId === estimate.id ||
                              contracts.some(
                                (contract) =>
                                  contract.estimate_id === estimate.id
                              )
                            }
                            className="min-w-[140px] flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:bg-emerald-300 sm:flex-none"
                          >
                            {contracts.some(
                              (contract) =>
                                contract.estimate_id === estimate.id
                            )
                              ? "✓ 계약 등록완료"
                              : contractSavingId === estimate.id
                                ? "계약 등록 중..."
                                : "🤝 계약 등록"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setReviewEstimate(estimate)
                          }
                          className={
                            review
                              ? "min-w-[140px] flex-1 rounded-xl bg-amber-100 px-4 py-3 text-sm font-black text-amber-800 sm:flex-none"
                              : "min-w-[140px] flex-1 rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 sm:flex-none"
                          }
                        >
                          {review
                            ? `★ ${review.rating}점 · 후기 수정`
                            : "☆ AI 견적 평가"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedEstimate(
                              estimate
                            )
                          }
                          className="min-w-[140px] flex-1 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 sm:flex-none"
                        >
                          📄 견적서 보기
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteEstimate(
                              estimate
                            )
                          }
                          className="min-w-[100px] flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 sm:flex-none"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 견적서 */}
      {selectedEstimate && documentCustomer && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60">
          <div className="min-h-[100dvh] pb-24 pt-4 sm:flex sm:items-center sm:justify-center sm:p-6">
            <EstimateDocument
              businessProfile={businessProfile}
              estimateNumber={selectedEstimate.estimate_number}
              customerName={documentCustomer.name}
              phone={documentCustomer.phone}
              region={documentCustomer.region}
              workDescription={
                selectedEstimate.work_description
              }
              materialCost={
                selectedEstimate.material_cost
              }
              laborCost={
                selectedEstimate.labor_cost
              }
              otherCost={
                selectedEstimate.other_cost
              }
              totalAmount={
                selectedEstimate.total_amount
              }
              createdAt={selectedEstimate.created_at}
              onClose={() =>
                setSelectedEstimate(null)
              }
            />
          </div>
        </div>
      )}

      {/* AI 견적 사용자 후기 */}
      {reviewEstimate && (
        <ReviewModal
          estimateId={reviewEstimate.id}
          estimateNumber={reviewEstimate.estimate_number}
          customerName={
            getCustomer(reviewEstimate.customer_id)?.name
          }
          onClose={() => setReviewEstimate(null)}
          onSubmitted={loadData}
        />
      )}
    </>
  );
}

function CostInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        {label}
      </label>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder="0"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}