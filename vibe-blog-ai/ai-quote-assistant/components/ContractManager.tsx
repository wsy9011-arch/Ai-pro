"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  estimate_id: string | null;
  customer_id: string;
  user_id: string;
  contract_amount: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  contract_date: string | null;
  construction_date: string | null;
  status: string | null;
  memo: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
};

const STATUS_OPTIONS = [
  "전체",
  "계약대기",
  "계약진행",
  "계약완료",
  "계약취소",
];

const EDIT_STATUS_OPTIONS = [
  "계약대기",
  "계약진행",
  "계약완료",
  "계약취소",
];

export default function ContractManager({
  onNavigate,
}: {
  onNavigate?: (menu: string) => void;
}) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const [editingContract, setEditingContract] =
    useState<Contract | null>(null);

  const [editContractAmount, setEditContractAmount] = useState("");
  const [editDepositAmount, setEditDepositAmount] = useState("");
  const [editContractDate, setEditContractDate] = useState("");
  const [editConstructionDate, setEditConstructionDate] = useState("");
  const [editStatus, setEditStatus] = useState("계약진행");
  const [editMemo, setEditMemo] = useState("");

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

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(
          "id,estimate_id,customer_id,user_id,contract_amount,deposit_amount,balance_amount,contract_date,construction_date,status,memo,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (contractError) throw contractError;

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id,name,phone,region,service_type")
        .eq("user_id", user.id);

      if (customerError) throw customerError;

      setContracts((contractData ?? []) as Contract[]);
      setCustomers((customerData ?? []) as Customer[]);
    } catch (err) {
      console.error("CONTRACT LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "계약 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function getCustomer(customerId: string) {
    return customers.find((customer) => customer.id === customerId);
  }

  function toNumber(value: string) {
    const number = Number(value.replace(/,/g, ""));
    return Number.isNaN(number) ? 0 : number;
  }

  function formatPrice(value: number | null | undefined) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const filteredContracts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const customer = customers.find(
        (item) => item.id === contract.customer_id
      );

      const matchesStatus =
        statusFilter === "전체" ||
        (contract.status || "계약진행") === statusFilter;

      if (!matchesStatus) return false;
      if (!keyword) return true;

      const values = [
        customer?.name,
        customer?.phone,
        customer?.region,
        customer?.service_type,
        contract.status,
        contract.memo,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [contracts, customers, search, statusFilter]);

  const totalContractAmount = useMemo(
    () =>
      contracts
        .filter((contract) => contract.status !== "계약취소")
        .reduce(
          (sum, contract) =>
            sum + Number(contract.contract_amount || 0),
          0
        ),
    [contracts]
  );

  const totalDepositAmount = useMemo(
    () =>
      contracts
        .filter((contract) => contract.status !== "계약취소")
        .reduce(
          (sum, contract) =>
            sum + Number(contract.deposit_amount || 0),
          0
        ),
    [contracts]
  );

  const totalBalanceAmount = useMemo(
    () =>
      contracts
        .filter((contract) => contract.status !== "계약취소")
        .reduce(
          (sum, contract) =>
            sum + Number(contract.balance_amount || 0),
          0
        ),
    [contracts]
  );

  const progressingCount = contracts.filter(
    (contract) => contract.status === "계약진행"
  ).length;

  const completedCount = contracts.filter(
    (contract) => contract.status === "계약완료"
  ).length;

  const upcomingConstructionCount = contracts.filter((contract) => {
    if (!contract.construction_date) return false;
    if (contract.status === "계약취소") return false;

    const date = new Date(`${contract.construction_date}T23:59:59`);
    return date.getTime() >= Date.now();
  }).length;

  function openEdit(contract: Contract) {
    setEditingContract(contract);
    setEditContractAmount(
      String(Number(contract.contract_amount || 0))
    );
    setEditDepositAmount(
      String(Number(contract.deposit_amount || 0))
    );
    setEditContractDate(contract.contract_date || "");
    setEditConstructionDate(contract.construction_date || "");
    setEditStatus(contract.status || "계약진행");
    setEditMemo(contract.memo || "");
    setError("");
  }

  function closeEdit() {
    if (saving) return;
    setEditingContract(null);
    setError("");
  }

  async function saveContract() {
    if (!editingContract) return;

    const contractAmount = toNumber(editContractAmount);
    const depositAmount = toNumber(editDepositAmount);

    if (contractAmount <= 0) {
      setError("총 계약금액을 입력해주세요.");
      return;
    }

    if (depositAmount < 0) {
      setError("계약금은 0원 이상이어야 합니다.");
      return;
    }

    if (depositAmount > contractAmount) {
      setError("계약금은 총 계약금액보다 클 수 없습니다.");
      return;
    }

    const balanceAmount = contractAmount - depositAmount;

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: updatedContract, error: updateError } =
        await supabase
          .from("contracts")
          .update({
            contract_amount: contractAmount,
            deposit_amount: depositAmount,
            balance_amount: balanceAmount,
            contract_date: editContractDate || null,
            construction_date: editConstructionDate || null,
            status: editStatus,
            memo: editMemo.trim() || null,
          })
          .eq("id", editingContract.id)
          .eq("user_id", user.id)
          .select(
            "id,estimate_id,customer_id,user_id,contract_amount,deposit_amount,balance_amount,contract_date,construction_date,status,memo,created_at"
          )
          .single();

      if (updateError) throw updateError;

      const customerStatus =
        editStatus === "계약완료"
          ? "계약완료"
          : editStatus === "계약취소"
            ? "후속관리"
            : "계약진행";

      const { error: customerUpdateError } = await supabase
        .from("customers")
        .update({ status: customerStatus })
        .eq("id", editingContract.customer_id)
        .eq("user_id", user.id);

      if (customerUpdateError) {
        console.warn(
          "CUSTOMER STATUS UPDATE WARNING:",
          customerUpdateError
        );
      }

      setContracts((current) =>
        current.map((contract) =>
          contract.id === editingContract.id
            ? (updatedContract as Contract)
            : contract
        )
      );

      setEditingContract(null);
      alert("계약 정보가 저장되었습니다.");
    } catch (err) {
      console.error("CONTRACT UPDATE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "계약 정보 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteContract(contract: Contract) {
    const customer = getCustomer(contract.customer_id);

    const confirmed = window.confirm(
      `${customer?.name || "해당 고객"}의 계약을 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { error: deleteError } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contract.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setContracts((current) =>
        current.filter((item) => item.id !== contract.id)
      );

      alert("계약이 삭제되었습니다.");
    } catch (err) {
      console.error("CONTRACT DELETE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "계약 삭제에 실패했습니다."
      );
    }
  }

  return (
    <>
      <div className="pb-28">
        <div className="mb-7">
          <p className="text-sm font-bold text-emerald-600">
            CONTRACT MANAGEMENT
          </p>

          <h2 className="mt-1 text-3xl font-black text-slate-950">
            계약 관리
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            계약금, 잔금, 계약일과 시공 예정일을 한곳에서 관리하세요.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="전체 계약"
            value={`${contracts.length}건`}
          />

          <SummaryCard
            label="계약 진행"
            value={`${progressingCount}건`}
          />

          <SummaryCard
            label="계약 완료"
            value={`${completedCount}건`}
          />

          <SummaryCard
            label="예정 시공"
            value={`${upcomingConstructionCount}건`}
          />

          <SummaryCard
            label="총 계약금액"
            value={formatPrice(totalContractAmount)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-xs font-black text-emerald-600">
              받은 계약금
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-800">
              {formatPrice(totalDepositAmount)}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-xs font-black text-amber-600">
              남은 잔금
            </p>
            <p className="mt-2 text-2xl font-black text-amber-800">
              {formatPrice(totalBalanceAmount)}
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="고객명, 연락처, 지역, 메모 검색"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("견적 관리")}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                🧾 견적 관리
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">
                계약 목록
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                계약을 눌러 금액과 일정을 수정할 수 있습니다.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black">
              {filteredContracts.length}건
            </div>
          </div>

          {loading ? (
            <div className="py-14 text-center text-sm text-slate-400">
              계약 정보를 불러오는 중...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-4xl">🤝</div>
              <p className="mt-3 font-black text-slate-600">
                등록된 계약이 없습니다.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                승인된 견적에서 계약을 등록하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredContracts.map((contract) => {
                const customer = getCustomer(contract.customer_id);

                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-slate-950">
                              {customer?.name || "고객 정보 없음"}
                            </p>

                            <StatusBadge
                              status={contract.status || "계약진행"}
                            />
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {customer?.phone || "연락처 없음"}
                            {customer?.region
                              ? ` · ${customer.region}`
                              : ""}
                          </p>

                          {customer?.service_type && (
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {customer.service_type}
                            </p>
                          )}
                        </div>

                        <p className="text-xl font-black text-emerald-600">
                          {formatPrice(contract.contract_amount)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoBox
                          label="계약금"
                          value={formatPrice(contract.deposit_amount)}
                        />
                        <InfoBox
                          label="잔금"
                          value={formatPrice(contract.balance_amount)}
                        />
                        <InfoBox
                          label="계약일"
                          value={formatDate(contract.contract_date)}
                        />
                        <InfoBox
                          label="시공 예정일"
                          value={formatDate(contract.construction_date)}
                        />
                      </div>

                      {contract.memo && (
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold text-slate-400">
                            메모
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {contract.memo}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => openEdit(contract)}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                        >
                          ✏️ 계약 정보 수정
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteContract(contract)}
                          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"
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

      {editingContract && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-600">
                  CONTRACT EDIT
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  계약 정보 수정
                </h3>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">
                {getCustomer(editingContract.customer_id)?.name ||
                  "고객 정보 없음"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                총 계약금액에서 계약금을 빼면 잔금이 자동 계산됩니다.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FormField label="총 계약금액 *">
                <input
                  type="number"
                  min="0"
                  value={editContractAmount}
                  onChange={(event) =>
                    setEditContractAmount(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </FormField>

              <FormField label="계약금">
                <input
                  type="number"
                  min="0"
                  value={editDepositAmount}
                  onChange={(event) =>
                    setEditDepositAmount(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </FormField>

              <FormField label="잔금">
                <div className="rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-700">
                  {formatPrice(
                    Math.max(
                      0,
                      toNumber(editContractAmount) -
                        toNumber(editDepositAmount)
                    )
                  )}
                </div>
              </FormField>

              <FormField label="상태">
                <select
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold"
                >
                  {EDIT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="계약일">
                <input
                  type="date"
                  value={editContractDate}
                  onChange={(event) =>
                    setEditContractDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </FormField>

              <FormField label="시공 예정일">
                <input
                  type="date"
                  value={editConstructionDate}
                  onChange={(event) =>
                    setEditConstructionDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </FormField>
            </div>

            <div className="mt-5">
              <FormField label="메모">
                <textarea
                  value={editMemo}
                  onChange={(event) =>
                    setEditMemo(event.target.value)
                  }
                  rows={5}
                  placeholder="계약 특이사항, 결제 약속, 시공 관련 메모 등을 적어주세요."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </FormField>
            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-4 text-sm font-black text-slate-600 disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={() => void saveContract()}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-4 text-sm font-black text-white disabled:bg-emerald-300"
              >
                {saving ? "저장 중..." : "💾 계약 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 break-words text-xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-800">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "bg-blue-50 text-blue-700";

  if (status === "계약완료") {
    className = "bg-emerald-50 text-emerald-700";
  } else if (status === "계약대기") {
    className = "bg-amber-50 text-amber-700";
  } else if (status === "계약취소") {
    className = "bg-red-50 text-red-600";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {status}
    </span>
  );
}