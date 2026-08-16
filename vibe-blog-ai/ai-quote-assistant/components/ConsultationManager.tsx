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

const statuses = [
  "신규문의",
  "상담중",
  "견적발송",
  "계약대기",
  "계약완료",
  "보류",
];

export default function ConsultationManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  const [loading, setLoading] = useState(true);
  const [consultationsLoading, setConsultationsLoading] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState("전체");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");

  const [consultationDate, setConsultationDate] =
    useState(new Date().toISOString().slice(0, 10));

  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [nextContactDate, setNextContactDate] = useState("");

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

      setCustomers((data ?? []) as Customer[]);
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

      const { data, error: fetchError } = await supabase
        .from("consultations")
        .select(
          "id,user_id,customer_id,consultation_date,content,memo,next_contact_date,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .order("consultation_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setConsultations((data ?? []) as Consultation[]);
    } catch (err) {
      console.error("CONSULTATION LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "상담 기록을 불러오지 못했습니다."
      );
    } finally {
      setConsultationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadConsultations();
  }, [loadCustomers, loadConsultations]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const status = customer.status || "신규문의";

      const matchesStatus =
        selectedStatus === "전체" || status === selectedStatus;

      const matchesSearch =
        !keyword ||
        [
          customer.name,
          customer.phone,
          customer.region,
          customer.service_type,
          customer.inquiry,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword)
        );

      return matchesStatus && matchesSearch;
    });
  }, [customers, search, selectedStatus]);

  const customerOptions = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();

    if (!keyword) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.phone,
        customer.region,
        customer.service_type,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [customers, customerSearch]);

  function getCount(status: string) {
    if (status === "전체") return customers.length;

    return customers.filter(
      (customer) => (customer.status || "신규문의") === status
    ).length;
  }

  async function changeStatus(
    customerId: string,
    newStatus: string
  ) {
    setUpdatingId(customerId);
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
        .update({ status: newStatus })
        .eq("id", customerId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? { ...customer, status: newStatus }
            : customer
        )
      );
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "상담 상태 변경에 실패했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function resetConsultationForm() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setConsultationDate(
      new Date().toISOString().slice(0, 10)
    );
    setContent("");
    setMemo("");
    setNextContactDate("");
    setError("");
  }

  function openAddModal() {
    resetConsultationForm();
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (saving) return;

    setShowAddModal(false);
    setError("");
  }

  async function saveConsultation() {
    if (!selectedCustomer) {
      setError("상담할 고객을 먼저 선택해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("상담 내용을 입력해주세요.");
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

      const { error: insertError } = await supabase
        .from("consultations")
        .insert({
          user_id: user.id,
          customer_id: selectedCustomer.id,
          consultation_date: consultationDate,
          content: content.trim(),
          memo: memo.trim() || null,
          next_contact_date: nextContactDate || null,
        });

      if (insertError) throw insertError;

      await loadConsultations();
      await loadCustomers();

      setShowAddModal(false);
      resetConsultationForm();

      alert("상담 기록이 저장되었습니다.");
    } catch (err) {
      console.error("CONSULTATION SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "상담 기록 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteConsultation(
    consultation: Consultation
  ) {
    const confirmed = window.confirm(
      "이 상담 기록을 삭제하시겠습니까?"
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
        .from("consultations")
        .delete()
        .eq("id", consultation.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setSelectedConsultation(null);

      await loadConsultations();

      alert("상담 기록이 삭제되었습니다.");
    } catch (err) {
      console.error("CONSULTATION DELETE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "상담 기록 삭제에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  function getCustomer(customerId: string) {
    return customers.find(
      (customer) => customer.id === customerId
    );
  }

  function formatPrice(amount: number | null) {
    if (amount === null || amount === undefined) return "-";

    return `${amount.toLocaleString("ko-KR")}원`;
  }

  return (
    <>
      <div>
        {/* 헤더 */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              CONSULTATION MANAGEMENT
            </p>

            <h2 className="mt-1 text-3xl font-black">
              상담 관리
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              고객별 상담 진행 상황과 상담 기록을 관리하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-sm hover:bg-blue-700 lg:w-auto"
          >
            + 상담 등록
          </button>
        </div>

        {/* 상태 */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setSelectedStatus((current) =>
                  current === status ? "전체" : status
                )
              }
              className={`rounded-2xl border p-5 text-left transition ${
                selectedStatus === status
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <p className="text-xs font-bold">
                {status}
              </p>

              <p className="mt-2 text-2xl font-black">
                {getCount(status)}
              </p>
            </button>
          ))}
        </div>

        {/* 고객 상담 현황 */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-black">
                {selectedStatus === "전체"
                  ? "전체 상담"
                  : `${selectedStatus} 고객`}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                총 {filteredCustomers.length}건
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="고객명, 지역, 서비스 검색"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 lg:max-w-sm"
            />
          </div>

          {error && !showAddModal && !selectedConsultation && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          {/* PC */}
          <div className="mt-6 hidden space-y-4 md:block">
            {loading && (
              <div className="py-12 text-center text-sm text-slate-400">
                상담 정보를 불러오는 중...
              </div>
            )}

            {!loading && filteredCustomers.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                해당하는 고객이 없습니다.
              </div>
            )}

            {!loading &&
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                    <div className="min-w-[180px]">
                      <p className="text-lg font-black">
                        {customer.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {customer.phone || "전화번호 없음"}
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                          📍 {customer.region || "지역 미등록"}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {customer.service_type || "일반 상담"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {customer.inquiry ||
                          "문의 내용이 없습니다."}
                      </p>
                    </div>

                    <div className="min-w-[130px]">
                      <p className="text-xs text-slate-400">
                        예상 견적
                      </p>

                      <p className="mt-1 font-black">
                        {formatPrice(
                          customer.estimate_amount
                        )}
                      </p>
                    </div>

                    <div className="min-w-[170px]">
                      <p className="mb-2 text-xs font-bold text-slate-400">
                        상담 상태
                      </p>

                      <select
                        value={customer.status || "신규문의"}
                        disabled={
                          updatingId === customer.id
                        }
                        onChange={(e) =>
                          void changeStatus(
                            customer.id,
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
                      >
                        {statuses.slice(1).map((option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* 모바일 */}
          <div className="mt-6 space-y-3 md:hidden">
            {loading && (
              <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400">
                상담 정보를 불러오는 중...
              </div>
            )}

            {!loading && filteredCustomers.length === 0 && (
              <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400">
                해당하는 고객이 없습니다.
              </div>
            )}

            {!loading &&
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
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
                      <p className="text-xs text-slate-400">
                        지역
                      </p>

                      <p className="mt-1 font-semibold">
                        {customer.region || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        서비스
                      </p>

                      <p className="mt-1 font-semibold">
                        {customer.service_type ||
                          "일반 상담"}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">
                        문의
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {customer.inquiry ||
                          "문의 내용이 없습니다."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold text-slate-400">
                      상담 상태
                    </p>

                    <select
                      value={customer.status || "신규문의"}
                      disabled={
                        updatingId === customer.id
                      }
                      onChange={(e) =>
                        void changeStatus(
                          customer.id,
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"
                    >
                      {statuses.slice(1).map((option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 상담 기록 */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">
                상담 기록
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                저장된 상담 이력을 확인하세요.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {consultations.length}건
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {consultationsLoading && (
              <div className="py-10 text-center text-sm text-slate-400">
                상담 기록을 불러오는 중...
              </div>
            )}

            {!consultationsLoading &&
              consultations.length === 0 && (
                <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">
                  아직 저장된 상담 기록이 없습니다.
                </div>
              )}

            {!consultationsLoading &&
              consultations.map((consultation) => {
                const customer = getCustomer(
                  consultation.customer_id
                );

                return (
                  <div
                    key={consultation.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black">
                          {customer?.name ||
                            "알 수 없는 고객"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          상담일{" "}
                          {consultation.consultation_date}
                        </p>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                          {consultation.content}
                        </p>

                        {consultation.next_contact_date && (
                          <p className="mt-2 text-xs font-bold text-amber-600">
                            다음 연락 예정일:{" "}
                            {consultation.next_contact_date}
                          </p>
                        )}
                      </div>

                      {/* ★ 별도 상세보기 버튼 */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConsultation(
                            consultation
                          );
                        }}
                        className="w-full shrink-0 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white active:bg-slate-700 sm:w-auto"
                      >
                        상담 상세보기
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 상담 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 pointer-events-auto">
          <div className="flex h-[100dvh] items-end justify-center sm:items-center sm:p-4">
            <div className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-sm font-bold text-blue-600">
                    ADD CONSULTATION
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    상담 등록
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    고객 상담 내용을 기록하세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <label className="mb-2 block text-sm font-bold">
                  고객 선택 *
                </label>

                <input
                  value={customerSearch}
                  onChange={(e) =>
                    setCustomerSearch(e.target.value)
                  }
                  placeholder="고객명, 전화번호, 지역 검색"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {customerOptions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        setSelectedCustomer(customer)
                      }
                      className={`w-full rounded-xl border p-4 text-left ${
                        selectedCustomer?.id === customer.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="font-black">
                        {customer.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {customer.phone || "전화번호 없음"}
                        {" · "}
                        {customer.region || "지역 미등록"}
                      </p>
                    </button>
                  ))}
                </div>

                {selectedCustomer && (
                  <div className="mt-3 rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-bold text-blue-600">
                      선택된 고객
                    </p>

                    <p className="mt-1 font-black">
                      {selectedCustomer.name}
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    상담 날짜 *
                  </label>

                  <input
                    type="date"
                    value={consultationDate}
                    onChange={(e) =>
                      setConsultationDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    상담 내용 *
                  </label>

                  <textarea
                    value={content}
                    onChange={(e) =>
                      setContent(e.target.value)
                    }
                    placeholder="고객과 상담한 내용을 입력하세요."
                    className="min-h-36 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    상담 메모
                  </label>

                  <textarea
                    value={memo}
                    onChange={(e) =>
                      setMemo(e.target.value)
                    }
                    placeholder="내부 메모를 입력하세요."
                    className="min-h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">
                    다음 연락 예정일
                  </label>

                  <input
                    type="date"
                    value={nextContactDate}
                    onChange={(e) =>
                      setNextContactDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                  </div>
                )}
              </div>

              <div className="relative z-[100000] shrink-0 border-t border-slate-200 bg-white px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(0,0,0,0.08)] sm:pb-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={saving}
                    className="relative z-[100001] touch-manipulation rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold active:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void saveConsultation();
                    }}
                    disabled={saving}
                    className="relative z-[100001] touch-manipulation rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white active:bg-blue-800 disabled:bg-blue-300"
                  >
                    {saving ? "저장 중..." : "상담 저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상담 상세 */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-[99999] bg-black/60">
          <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center sm:p-4">
            <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-8">
                <div>
                  <p className="text-sm font-bold text-blue-600">
                    CONSULTATION DETAIL
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    상담 상세
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedConsultation(null)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
                {(() => {
                  const customer = getCustomer(
                    selectedConsultation.customer_id
                  );

                  return (
                    <>
                      <div className="rounded-2xl bg-slate-50 p-5">
                        <p className="text-xs text-slate-400">
                          고객
                        </p>

                        <p className="mt-1 text-xl font-black">
                          {customer?.name ||
                            "알 수 없는 고객"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {customer?.phone ||
                            "전화번호 없음"}
                        </p>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-bold text-slate-400">
                          상담 날짜
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedConsultation.consultation_date}
                        </p>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-bold text-slate-400">
                          상담 내용
                        </p>

                        <div className="mt-2 rounded-2xl border border-slate-200 p-4 text-sm leading-7 text-slate-700">
                          {selectedConsultation.content}
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-bold text-slate-400">
                          상담 메모
                        </p>

                        <div className="mt-2 rounded-2xl border border-slate-200 p-4 text-sm leading-7 text-slate-700">
                          {selectedConsultation.memo ||
                            "메모가 없습니다."}
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-bold text-slate-400">
                          다음 연락 예정일
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedConsultation.next_contact_date ||
                            "지정하지 않음"}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="z-[100000] shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom)+5rem)] shadow-[0_-8px_20px_rgba(0,0,0,0.08)] sm:p-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedConsultation(null)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-4 text-sm font-bold"
                  >
                    닫기
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void deleteConsultation(
                        selectedConsultation
                      )
                    }
                    disabled={saving}
                    className="rounded-xl bg-red-50 px-4 py-4 text-sm font-black text-red-600"
                  >
                    {saving ? "삭제 중..." : "상담 삭제"}
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