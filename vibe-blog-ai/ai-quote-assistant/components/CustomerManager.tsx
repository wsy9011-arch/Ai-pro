"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const STATUS_OPTIONS = [
  "신규문의",
  "상담중",
  "후속관리",
  "계약대기",
  "계약진행",
  "계약완료",
  "시공진행",
  "시공완료",
  "재방문",
  "AS접수",
  "AS처리중",
  "보류",
];

const NEXT_STATUS: Record<string, string> = {
  신규문의: "상담중",
  상담중: "후속관리",
  후속관리: "계약대기",
  계약대기: "계약진행",
  계약진행: "계약완료",
  계약완료: "시공진행",
  시공진행: "시공완료",
  시공완료: "재방문",
  재방문: "AS접수",
  AS접수: "AS처리중",
  AS처리중: "시공완료",
};

const normalizeCustomerStatus = (value: string | null) => {
  if (value === "견적발송") return "후속관리";
  return value || "신규문의";
};

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestSavingId, setRequestSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [status, setStatus] = useState("신규문의");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editServiceType, setEditServiceType] = useState("");
  const [editInquiry, setEditInquiry] = useState("");
  const [editEstimateAmount, setEditEstimateAmount] = useState("");
  const [editStatus, setEditStatus] = useState("신규문의");

  const loadCustomers = useCallback(async () => {
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

      const { data, error: fetchError } = await supabase
        .from("customers")
        .select(
          "id,user_id,name,phone,region,service_type,inquiry,estimate_amount,status"
        )
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (fetchError) throw fetchError;

      setCustomers(
        ((data ?? []) as Customer[]).map((customer) => ({
          ...customer,
          status: normalizeCustomerStatus(customer.status),
        }))
      );
    } catch (err) {
      console.error("CUSTOMER LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServiceRequests = useCallback(async () => {
    setRequestsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data, error: fetchError } = await supabase
        .from("service_requests")
        .select("id,business_type,service_type,name,phone,region,inquiry,status,created_at")
        .in("status", ["접수", "신규문의"])
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setServiceRequests((data ?? []) as ServiceRequest[]);
    } catch (err) {
      console.error("SERVICE REQUEST LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "새 고객 문의를 불러오지 못했습니다."
      );
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadServiceRequests();
  }, [loadCustomers, loadServiceRequests]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "전체" ||
        (customer.status ?? "신규문의") === statusFilter;

      if (!matchesStatus) return false;
      if (!keyword) return true;

      const values = [
        customer.name,
        customer.phone,
        customer.region,
        customer.service_type,
        customer.inquiry,
        customer.status,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [customers, search, statusFilter]);

  function resetAddForm() {
    setName("");
    setPhone("");
    setRegion("");
    setServiceType("");
    setInquiry("");
    setEstimateAmount("");
    setStatus("신규문의");
    setError("");
  }

  function openAddModal() {
    resetAddForm();
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (saving) return;

    setShowAddModal(false);
    setError("");
  }

  async function addCustomer() {
    if (!name.trim()) {
      setError("고객 이름을 입력해주세요.");
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

      const amount =
        estimateAmount.trim() === ""
          ? null
          : Number(estimateAmount.replace(/,/g, ""));

      if (amount !== null && Number.isNaN(amount)) {
        throw new Error("예상 견적을 숫자로 입력해주세요.");
      }

      const { error: insertError } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name: name.trim(),
          phone: phone.trim() || null,
          region: region.trim() || null,
          service_type: serviceType.trim() || null,
          inquiry: inquiry.trim() || null,
          estimate_amount: amount,
          status,
        });

      if (insertError) throw insertError;

      await loadCustomers();

      setShowAddModal(false);
      resetAddForm();

      alert("고객이 등록되었습니다.");
    } catch (err) {
      console.error("CUSTOMER INSERT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 등록 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);

    setEditName(customer.name ?? "");
    setEditPhone(customer.phone ?? "");
    setEditRegion(customer.region ?? "");
    setEditServiceType(customer.service_type ?? "");
    setEditInquiry(customer.inquiry ?? "");

    setEditEstimateAmount(
      customer.estimate_amount !== null
        ? String(customer.estimate_amount)
        : ""
    );

    setEditStatus(normalizeCustomerStatus(customer.status));
    setError("");
  }

  function closeCustomer() {
    if (saving) return;

    setSelectedCustomer(null);
    setError("");
  }

  function openEstimateManager() {
    if (!selectedCustomer) return;

    try {
      window.sessionStorage.setItem(
        "estimate-target-customer-id",
        selectedCustomer.id
      );
    } catch {
      // 저장 불가 환경에서는 메뉴 이동만 진행
    }

    setSelectedCustomer(null);
    window.dispatchEvent(new Event("open-estimate-manager"));
  }

  async function advanceCustomerStatus() {
    if (!selectedCustomer) return;

    const nextStatus = NEXT_STATUS[editStatus];

    if (!nextStatus) {
      alert("현재 상태에서는 자동 다음 단계가 없습니다.");
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

      const { error: updateError } = await supabase
        .from("customers")
        .update({
          status: nextStatus,
        })
        .eq("id", selectedCustomer.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setEditStatus(nextStatus);
      setSelectedCustomer({
        ...selectedCustomer,
        status: nextStatus,
      });

      await loadCustomers();

      alert(`고객 상태가 "${nextStatus}"로 변경되었습니다.`);
    } catch (err) {
      console.error("CUSTOMER STATUS ADVANCE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 상태 변경 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateCustomer() {
    if (!selectedCustomer) return;

    if (!editName.trim()) {
      setError("고객 이름을 입력해주세요.");
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

      const amount =
        editEstimateAmount.trim() === ""
          ? null
          : Number(editEstimateAmount.replace(/,/g, ""));

      if (amount !== null && Number.isNaN(amount)) {
        throw new Error("예상 견적을 숫자로 입력해주세요.");
      }

      const { error: updateError } = await supabase
        .from("customers")
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          region: editRegion.trim() || null,
          service_type: editServiceType.trim() || null,
          inquiry: editInquiry.trim() || null,
          estimate_amount: amount,
          status: editStatus,
        })
        .eq("id", selectedCustomer.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await loadCustomers();

      setSelectedCustomer(null);

      alert("고객 정보가 수정되었습니다.");
    } catch (err) {
      console.error("CUSTOMER UPDATE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 정보 수정 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer() {
    if (!selectedCustomer) return;

    const confirmed = window.confirm(
      `${selectedCustomer.name} 고객을 정말 삭제하시겠습니까?\n삭제한 고객은 복구하기 어렵습니다.`
    );

    if (!confirmed) return;

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

      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", selectedCustomer.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setSelectedCustomer(null);

      await loadCustomers();

      alert("고객이 삭제되었습니다.");
    } catch (err) {
      console.error("CUSTOMER DELETE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function registerServiceRequest(request: ServiceRequest) {
    if (requestSavingId !== null) return;

    setRequestSavingId(request.id);
    setError("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      // 이미 완료된 문의라면 고객을 다시 만들지 않고 화면에서만 정리합니다.
      const { data: latestRequest, error: latestRequestError } = await supabase
        .from("service_requests")
        .select("id,status")
        .eq("id", request.id)
        .maybeSingle();

      if (latestRequestError) {
        throw new Error(`문의 상태 확인 실패: ${latestRequestError.message}`);
      }

      if (!latestRequest) {
        throw new Error("해당 온라인 문의를 찾을 수 없습니다.");
      }

      if (latestRequest.status === "고객등록완료") {
        setServiceRequests((current) => current.filter((item) => item.id !== request.id));
        setError("");
        alert(`${request.name} 고객님은 이미 고객관리 목록에 등록되어 있습니다.`);
        return;
      }

      const phone = request.phone.trim();
      let savedCustomer: Customer | null = null;

      // 같은 업체에 이미 등록된 고객이면 기존 고객을 사용합니다.
      if (phone) {
        const { data: existingCustomers, error: existingError } = await supabase
          .from("customers")
          .select("id,user_id,name,phone,region,service_type,inquiry,estimate_amount,status")
          .eq("user_id", user.id)
          .eq("phone", phone)
          .limit(1);

        if (existingError) {
          throw new Error(`기존 고객 확인 실패: ${existingError.message}`);
        }

        const existingCustomer = existingCustomers?.[0] || null;

        if (existingCustomer) {
          savedCustomer = {
            ...(existingCustomer as Customer),
            status: normalizeCustomerStatus(existingCustomer.status),
          };
        }
      }

      // 기존 고객이 없을 때만 새 고객을 저장합니다.
      if (!savedCustomer) {
        const { data: insertedCustomer, error: insertError } = await supabase
          .from("customers")
          .insert({
            user_id: user.id,
            name: request.name.trim(),
            phone: phone || null,
            region: request.region.trim() || null,
            service_type: request.service_type?.trim() || null,
            inquiry: request.inquiry.trim() || null,
            estimate_amount: null,
            status: "신규문의",
          })
          .select("id,user_id,name,phone,region,service_type,inquiry,estimate_amount,status")
          .single();

        if (insertError) {
          throw new Error(`고객 저장 실패: ${insertError.message}`);
        }

        if (!insertedCustomer) {
          throw new Error("고객 저장 결과를 확인할 수 없습니다.");
        }

        savedCustomer = insertedCustomer as Customer;
      }

      // 고객 저장이 끝난 뒤 온라인 문의를 완료 처리합니다.
      const { data: updatedRequest, error: requestUpdateError } = await supabase
        .from("service_requests")
        .update({ status: "고객등록완료" })
        .eq("id", request.id)
        .in("status", ["접수", "신규문의"])
        .select("id,status")
        .maybeSingle();

      if (requestUpdateError) {
        throw new Error(
          `고객은 저장됐지만 문의 완료 처리에 실패했습니다: ${requestUpdateError.message}`
        );
      }

      // 동시에 다른 곳에서 처리된 경우에도 실제 상태가 완료라면 성공으로 처리합니다.
      if (!updatedRequest) {
        const { data: currentRequest, error: currentRequestError } = await supabase
          .from("service_requests")
          .select("id,status")
          .eq("id", request.id)
          .maybeSingle();

        if (currentRequestError) {
          throw new Error(`문의 상태 확인 실패: ${currentRequestError.message}`);
        }

        if (currentRequest?.status !== "고객등록완료") {
          throw new Error("고객은 저장됐지만 온라인 문의 완료 처리를 확인하지 못했습니다.");
        }
      }

      // 화면 즉시 반영
      setServiceRequests((current) => current.filter((item) => item.id !== request.id));

      setCustomers((current) => {
        const customer = savedCustomer as Customer;
        const exists = current.some((item) => item.id === customer.id);

        if (exists) {
          return current.map((item) => item.id === customer.id ? customer : item);
        }

        return [customer, ...current];
      });

      window.dispatchEvent(new Event("customers-updated"));
      setError("");
      alert(`${request.name} 고객님이 고객관리 목록에 등록되었습니다.`);
    } catch (err) {
      console.error("SERVICE REQUEST REGISTER ERROR:", err);

      const message = err instanceof Error
        ? err.message
        : "고객 등록 중 오류가 발생했습니다.";

      setError(message);
      alert(message);
    } finally {
      setRequestSavingId(null);
    }
  }

  function formatPrice(amount: number | null) {
    if (amount === null || amount === undefined) {
      return "-";
    }

    return `${amount.toLocaleString("ko-KR")}원`;
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              CUSTOMER MANAGEMENT
            </p>

            <h2 className="mt-1 text-2xl font-black">
              고객 관리
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              등록된 고객을 검색하고 상담 정보를 관리하세요.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">
                전체 고객
              </p>

              <p className="mt-1 text-xl font-black">
                {customers.length}명
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-blue-700 sm:w-auto"
            >
              + 고객 등록
            </button>
          </div>
        </div>

        {/* 온라인 고객 문의 */}
        <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-wide text-blue-600">
                NEW CUSTOMER REQUESTS
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                새 고객 문의
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                고객이 온라인에서 남긴 문의입니다. <b>고객 등록 완료</b>를 누르면 고객 관리에 실제 저장됩니다.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
              {serviceRequests.length}건 대기
            </span>
          </div>

          {requestsLoading ? (
            <div className="mt-4 rounded-xl bg-white py-7 text-center text-sm text-slate-400">
              새 문의를 불러오는 중...
            </div>
          ) : serviceRequests.length === 0 ? (
            <div className="mt-4 rounded-xl bg-white py-7 text-center text-sm text-slate-400">
              현재 새 고객 문의가 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {serviceRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-900">{request.name}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {request.phone}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {request.service_type || "일반 상담"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {request.region} · {request.inquiry}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => registerServiceRequest(request)}
                      disabled={requestSavingId !== null}
                      className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:bg-blue-300"
                    >
                      {requestSavingId === request.id
                        ? "등록 중..."
                        : "✓ 고객 등록 완료"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 전화번호, 지역, 서비스 검색"
          className="mt-7 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {["전체", ...STATUS_OPTIONS].map((option) => {
            const count =
              option === "전체"
                ? customers.length
                : customers.filter(
                    (customer) =>
                      (customer.status ?? "신규문의") === option
                  ).length;

            const active = statusFilter === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {option} {count}
              </button>
            );
          })}
        </div>

        {error && !selectedCustomer && !showAddModal && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="pb-4">고객</th>
                <th className="pb-4">지역</th>
                <th className="pb-4">서비스</th>
                <th className="pb-4">예상 견적</th>
                <th className="pb-4">상태</th>
                <th className="pb-4">관리</th>
              </tr>
            </thead>

            <tbody className="text-sm">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400"
                  >
                    고객 정보를 불러오는 중...
                  </td>
                </tr>
              )}

              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400"
                  >
                    {search
                      ? "검색 결과가 없습니다."
                      : "등록된 고객이 없습니다."}
                  </td>
                </tr>
              )}

              {!loading &&
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => openCustomer(customer)}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    <td className="py-5">
                      <p className="font-black">
                        {customer.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {customer.phone || "전화번호 없음"}
                      </p>
                    </td>

                    <td className="py-5 text-slate-500">
                      {customer.region || "-"}
                    </td>

                    <td className="py-5">
                      <p className="font-semibold">
                        {customer.service_type || "일반 상담"}
                      </p>

                      {customer.inquiry && (
                        <p className="mt-1 max-w-[250px] truncate text-xs text-slate-400">
                          {customer.inquiry}
                        </p>
                      )}
                    </td>

                    <td className="py-5 font-bold">
                      {formatPrice(customer.estimate_amount)}
                    </td>

                    <td className="py-5">
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        {customer.status || "신규문의"}
                      </span>
                    </td>

                    <td className="py-5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCustomer(customer);
                        }}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 고객 목록 */}
        <div className="mt-5 space-y-3 md:hidden">
          {loading && (
            <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              고객 정보를 불러오는 중...
            </div>
          )}

          {!loading && filteredCustomers.length === 0 && (
            <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              {search
                ? "검색 결과가 없습니다."
                : "등록된 고객이 없습니다."}
            </div>
          )}

          {!loading &&
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => openCustomer(customer)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {customer.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {customer.phone || "전화번호 없음"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {customer.status || "신규문의"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">지역</p>
                    <p className="mt-1 font-semibold">
                      {customer.region || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">서비스</p>
                    <p className="mt-1 font-semibold">
                      {customer.service_type || "일반 상담"}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">
                      예상 견적
                    </p>

                    <p className="mt-1 font-black">
                      {formatPrice(customer.estimate_amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs font-bold text-blue-600">
                  고객 상세보기 →
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* 고객 등록 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60">
          <div className="flex h-[100dvh] items-end justify-center sm:items-center sm:p-4">
            <div className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-sm font-bold text-blue-600">
                    ADD CUSTOMER
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    고객 등록
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    새로운 고객 정보를 등록하세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="고객 이름 *"
                    value={name}
                    onChange={setName}
                    placeholder="예) 홍길동"
                  />

                  <Field
                    label="전화번호"
                    value={phone}
                    onChange={setPhone}
                    placeholder="예) 010-1234-5678"
                  />

                  <Field
                    label="지역"
                    value={region}
                    onChange={setRegion}
                    placeholder="예) 의정부"
                  />

                  <Field
                    label="서비스 종류"
                    value={serviceType}
                    onChange={setServiceType}
                    placeholder="예) 싱크대 필름"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    문의 내용
                  </label>

                  <textarea
                    value={inquiry}
                    onChange={(e) => setInquiry(e.target.value)}
                    placeholder="고객 문의 내용을 입력하세요."
                    className="min-h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="예상 견적"
                    value={estimateAmount}
                    onChange={setEstimateAmount}
                    placeholder="예) 850000"
                    type="number"
                  />

                  <SelectField
                    label="상담 상태"
                    value={status}
                    onChange={setStatus}
                  />
                </div>

                {error && (
                  <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </div>
                )}
              </div>

              <div className="z-[10000] shrink-0 border-t border-slate-200 bg-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom)+5rem)] sm:pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 px-6 py-4 text-sm font-bold sm:w-auto"
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    onClick={addCustomer}
                    disabled={saving}
                    className="w-full rounded-xl bg-blue-600 px-7 py-4 text-sm font-black text-white disabled:bg-blue-300 sm:w-auto"
                  >
                    {saving ? "등록 중..." : "고객 등록"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 고객 상세 / 수정 */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[99999] bg-black/60">
          <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center sm:p-4">
            <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
              
              {/* 상단 */}
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-8">
                <div>
                  <p className="text-sm font-bold text-blue-600">
                    CUSTOMER DETAIL
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    고객 상세정보
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    고객 정보와 상담 진행 상태를 수정할 수 있습니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCustomer}
                  disabled={saving}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* 내용 */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-8 sm:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="고객 이름 *"
                    value={editName}
                    onChange={setEditName}
                  />

                  <Field
                    label="전화번호"
                    value={editPhone}
                    onChange={setEditPhone}
                  />

                  <Field
                    label="지역"
                    value={editRegion}
                    onChange={setEditRegion}
                  />

                  <Field
                    label="서비스 종류"
                    value={editServiceType}
                    onChange={setEditServiceType}
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    문의 내용
                  </label>

                  <textarea
                    value={editInquiry}
                    onChange={(e) => setEditInquiry(e.target.value)}
                    className="min-h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="예상 견적"
                    value={editEstimateAmount}
                    onChange={setEditEstimateAmount}
                    type="number"
                  />

                  <SelectField
                    label="상담 상태"
                    value={editStatus}
                    onChange={setEditStatus}
                  />
                </div>

                {(editStatus === "상담중" || editStatus === "후속관리") && (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black text-violet-700">
                          실제 견적서 작성
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          예상 견적은 고객 메모용입니다. 실제 견적은 견적 관리에서 작성·저장·발송합니다.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openEstimateManager}
                        disabled={saving}
                        className="shrink-0 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:bg-violet-300"
                      >
                        🧾 견적 작성하기
                      </button>
                    </div>
                  </div>
                )}

                {NEXT_STATUS[editStatus] && (
                  <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black text-blue-600">
                          다음 업무 단계
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {editStatus} → {NEXT_STATUS[editStatus]}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={advanceCustomerStatus}
                        disabled={saving}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:bg-blue-300"
                      >
                        다음 단계로 이동 →
                      </button>
                    </div>
                  </div>
                )}


                {error && (
                  <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </div>
                )}
              </div>

              {/* ★ 모바일 하단 버튼 */}
              <div className="z-[100000] shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom)+5rem)] shadow-[0_-8px_20px_rgba(0,0,0,0.08)] sm:p-5">
                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
                  
                  <button
                    type="button"
                    onClick={deleteCustomer}
                    disabled={saving}
                    className="rounded-xl bg-red-50 px-2 py-4 text-xs font-black text-red-600 sm:px-5 sm:text-sm"
                  >
                    🗑 삭제
                  </button>

                  <button
                    type="button"
                    onClick={closeCustomer}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-2 py-4 text-xs font-bold sm:px-5 sm:text-sm"
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    onClick={updateCustomer}
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-2 py-4 text-xs font-black text-white disabled:bg-blue-300 sm:px-6 sm:text-sm"
                  >
                    {saving ? "저장 중..." : "수정 저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function SelectField({
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

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}