"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  user_id: string;
  customer_id: string;
  contract_date: string;
  amount: number;
  status: string;
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

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
};

export default function UnpaidManager({
  onNavigate,
}: {
  onNavigate?: (menu: string) => void;
}) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

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

      const customerPromise = supabase
        .from("customers")
        .select("id,name,phone,region")
        .eq("user_id", user.id);

      const fullContractPromise = supabase
        .from("contracts")
        .select(
          "id,user_id,customer_id,contract_date,amount,status,deposit_amount,interim_amount,balance_amount,deposit_paid,interim_paid,balance_paid,deposit_paid_at,interim_paid_at,balance_paid_at"
        )
        .eq("user_id", user.id)
        .order("contract_date", { ascending: false });

      const [fullContractResult, customerResult] = await Promise.all([
        fullContractPromise,
        customerPromise,
      ]);

      if (customerResult.error) throw customerResult.error;

      let contractRows = fullContractResult.data;

      if (fullContractResult.error) {
        console.warn(
          "FULL CONTRACT PAYMENT FIELDS NOT AVAILABLE, USING BASE CONTRACT FIELDS:",
          fullContractResult.error
        );

        const fallbackResult = await supabase
          .from("contracts")
          .select(
            "id,user_id,customer_id,contract_date,amount,status"
          )
          .eq("user_id", user.id)
          .order("contract_date", { ascending: false });

        if (fallbackResult.error) throw fallbackResult.error;

        contractRows = (fallbackResult.data ?? []).map((contract) => ({
          ...contract,
          deposit_amount: null,
          interim_amount: null,
          balance_amount: null,
          deposit_paid: false,
          interim_paid: false,
          balance_paid: false,
          deposit_paid_at: null,
          interim_paid_at: null,
          balance_paid_at: null,
        }));
      }

      setContracts((contractRows ?? []) as Contract[]);
      setCustomers((customerResult.data ?? []) as Customer[]);
    } catch (err) {
      console.error("UNPAID LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "미수금 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const unpaidContracts = useMemo(() => {
    return contracts
      .map((contract) => {
        const total = Number(contract.amount || 0);
        const received =
          (contract.deposit_paid ? Number(contract.deposit_amount || 0) : 0) +
          (contract.interim_paid ? Number(contract.interim_amount || 0) : 0) +
          (contract.balance_paid ? Number(contract.balance_amount || 0) : 0);

        return {
          contract,
          customer: customerMap.get(contract.customer_id),
          total,
          received,
          unpaid: Math.max(total - received, 0),
        };
      })
      .filter((item) => item.unpaid > 0)
      .filter((item) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;

        const customer = item.customer;
        return [
          customer?.name,
          customer?.phone,
          customer?.region,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(keyword)
          );
      });
  }, [contracts, customerMap, search]);

  const summary = useMemo(
    () => ({
      contracts: unpaidContracts.length,
      total: unpaidContracts.reduce((sum, item) => sum + item.total, 0),
      received: unpaidContracts.reduce(
        (sum, item) => sum + item.received,
        0
      ),
      unpaid: unpaidContracts.reduce((sum, item) => sum + item.unpaid, 0),
    }),
    [unpaidContracts]
  );

  const money = (value: number) =>
    `${value.toLocaleString("ko-KR")}원`;

  async function savePaymentPlan(
  contract: Contract,
  values: {
    deposit_amount: number;
    interim_amount: number;
    balance_amount: number;
    deposit_paid: boolean;
    interim_paid: boolean;
    balance_paid: boolean;
  }
) {
  try {
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("로그인이 필요합니다.");

    const today = new Date().toISOString().slice(0, 10);

    // 실제 입금완료 처리된 금액만 합산
    const paidAmount =
      (values.deposit_paid
        ? Number(values.deposit_amount || 0)
        : 0) +
      (values.interim_paid
        ? Number(values.interim_amount || 0)
        : 0) +
      (values.balance_paid
        ? Number(values.balance_amount || 0)
        : 0);

    const contractAmount = Number(contract.amount || 0);

    // 계약금액 전액이 입금됐으면 자동 계약완료
    const isFullyPaid =
      contractAmount > 0 &&
      paidAmount >= contractAmount;

    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        deposit_amount: values.deposit_amount,
        interim_amount: values.interim_amount,
        balance_amount: values.balance_amount,

        deposit_paid: values.deposit_paid,
        interim_paid: values.interim_paid,
        balance_paid: values.balance_paid,

        deposit_paid_at: values.deposit_paid
          ? contract.deposit_paid_at || today
          : null,

        interim_paid_at: values.interim_paid
          ? contract.interim_paid_at || today
          : null,

        balance_paid_at: values.balance_paid
          ? contract.balance_paid_at || today
          : null,

        // 완납되면 자동으로 계약완료
        status: isFullyPaid
          ? "계약완료"
          : contract.status,

        updated_at: new Date().toISOString(),
      })
      .eq("id", contract.id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    setEditingContract(null);
    await loadData();
  } catch (err) {
    console.error("PAYMENT UPDATE ERROR:", err);

    setError(
      err instanceof Error
        ? err.message
        : "입금 정보를 저장하지 못했습니다."
    );
  }
}

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-red-500">RECEIVABLES</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">
            미수금 관리
          </h2>
          <p className="mt-2 text-slate-500">
            아직 입금되지 않은 계약금액을 한눈에 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void loadData();
            }}
            className="relative z-10 touch-manipulation rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 active:bg-slate-300"
          >
            {loading ? "↻ 불러오는 중..." : "↻ 새로고침"}
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("매출 분석")}
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
          >
            ← 매출 분석
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="미수 계약"
          value={`${summary.contracts}건`}
          icon="📋"
        />
        <SummaryCard
          label="계약금액"
          value={money(summary.total)}
          icon="💰"
        />
        <SummaryCard
          label="현재 입금"
          value={money(summary.received)}
          icon="🏦"
        />
        <SummaryCard
          label="총 미수금"
          value={money(summary.unpaid)}
          icon="🔴"
          danger
        />
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black">미수금 목록</h3>
            <p className="mt-1 text-xs text-slate-400">
              고객을 확인한 뒤 계약 관리에서 입금 상태를 수정할 수 있습니다.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="고객명 / 전화번호 / 지역 검색"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 sm:w-72"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            미수금 정보를 불러오는 중...
          </div>
        ) : unpaidContracts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 font-black">
              현재 미수금이 없습니다.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              모든 계약금액이 입금 완료되었습니다.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {unpaidContracts.map((item) => {
              const customer = item.customer;

              return (
                <div
                  key={item.contract.id}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">
                          {customer?.name || "고객 정보 없음"}
                        </p>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                          미수
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {customer?.phone || "-"} ·{" "}
                        {customer?.region || "-"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        계약일 {item.contract.contract_date || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-right lg:min-w-[420px]">
                      <AmountCell
                        label="계약"
                        value={money(item.total)}
                      />
                      <AmountCell
                        label="입금"
                        value={money(item.received)}
                        positive
                      />
                      <AmountCell
                        label="미수"
                        value={money(item.unpaid)}
                        danger
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingContract(item.contract)}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
                    >
                      💳 계약금·중도금·잔금 입금 관리
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate?.("계약 관리")}
                      className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
                    >
                      계약 관리로 이동
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingContract && (
        <PaymentModal
          contract={editingContract}
          customer={customerMap.get(editingContract.customer_id)}
          money={money}
          onClose={() => setEditingContract(null)}
          onSave={savePaymentPlan}
        />
      )}
    </div>
  );
}

function PaymentModal({
  contract,
  customer,
  money,
  onClose,
  onSave,
}: {
  contract: Contract;
  customer?: Customer;
  money: (value: number) => string;
  onClose: () => void;
  onSave: (
    contract: Contract,
    values: {
      deposit_amount: number;
      interim_amount: number;
      balance_amount: number;
      deposit_paid: boolean;
      interim_paid: boolean;
      balance_paid: boolean;
    }
  ) => Promise<void>;
}) {
  const total = Number(contract.amount || 0);
  const defaultDeposit = Number(contract.deposit_amount || 0);
  const defaultInterim = Number(contract.interim_amount || 0);
  const defaultBalance =
    Number(contract.balance_amount || 0) ||
    Math.max(total - defaultDeposit - defaultInterim, 0);

  const [depositAmount, setDepositAmount] = useState(String(defaultDeposit));
  const [interimAmount, setInterimAmount] = useState(String(defaultInterim));
  const [balanceAmount, setBalanceAmount] = useState(String(defaultBalance));
  const [depositPaid, setDepositPaid] = useState(Boolean(contract.deposit_paid));
  const [interimPaid, setInterimPaid] = useState(Boolean(contract.interim_paid));
  const [balancePaid, setBalancePaid] = useState(Boolean(contract.balance_paid));
  const [saving, setSaving] = useState(false);

  const numberValue = (value: string) => Number(value.replace(/,/g, "") || 0);
  const planned =
    numberValue(depositAmount) +
    numberValue(interimAmount) +
    numberValue(balanceAmount);
  const received =
    (depositPaid ? numberValue(depositAmount) : 0) +
    (interimPaid ? numberValue(interimAmount) : 0) +
    (balancePaid ? numberValue(balanceAmount) : 0);
  const unpaid = Math.max(total - received, 0);

  async function handleSave() {
    const deposit = numberValue(depositAmount);
    const interim = numberValue(interimAmount);
    const balance = numberValue(balanceAmount);

    if ([deposit, interim, balance].some((value) => !Number.isFinite(value) || value < 0)) {
      window.alert("입금 금액을 올바르게 입력해주세요.");
      return;
    }

    if (planned > total) {
      window.alert("계약금·중도금·잔금 합계가 계약금액보다 클 수 없습니다.");
      return;
    }

    setSaving(true);
    try {
      await onSave(contract, {
        deposit_amount: deposit,
        interim_amount: interim,
        balance_amount: balance,
        deposit_paid: depositPaid,
        interim_paid: interimPaid,
        balance_paid: balancePaid,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999999] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-600">PAYMENT MANAGEMENT</p>
            <h3 className="mt-1 text-2xl font-black">입금 관리</h3>
            <p className="mt-1 text-sm text-slate-500">
              {customer?.name || "고객"} · 계약금액 {money(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <PaymentRow
            label="계약금"
            amount={depositAmount}
            setAmount={setDepositAmount}
            paid={depositPaid}
            setPaid={setDepositPaid}
          />
          <PaymentRow
            label="중도금"
            amount={interimAmount}
            setAmount={setInterimAmount}
            paid={interimPaid}
            setPaid={setInterimPaid}
          />
          <PaymentRow
            label="잔금"
            amount={balanceAmount}
            setAmount={setBalanceAmount}
            paid={balancePaid}
            setPaid={setBalancePaid}
          />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center">
          <div>
            <p className="text-xs font-bold text-slate-400">계약금액</p>
            <p className="mt-1 text-sm font-black">{money(total)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">총 입금</p>
            <p className="mt-1 text-sm font-black text-emerald-600">{money(received)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">남은 미수</p>
            <p className="mt-1 text-sm font-black text-red-600">{money(unpaid)}</p>
          </div>
        </div>

        {planned < total && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            계약금·중도금·잔금 예정액 합계가 계약금액보다 {money(total - planned)} 적습니다.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "입금 정보 저장"}
        </button>
      </div>
    </div>
  );
}

function PaymentRow({
  label,
  amount,
  setAmount,
  paid,
  setPaid,
}: {
  label: string;
  amount: string;
  setAmount: (value: string) => void;
  paid: boolean;
  setPaid: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="font-black">{label}</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={paid}
            onChange={(event) => setPaid(event.target.checked)}
            className="h-5 w-5"
          />
          입금완료
        </label>
      </div>
      <input
        inputMode="numeric"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="0"
        className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
      />
    </div>
  );
}

function SummaryCard({
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
        danger ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p
        className={`mt-4 text-2xl font-black ${
          danger ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AmountCell({
  label,
  value,
  positive = false,
  danger = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          danger
            ? "text-red-600"
            : positive
            ? "text-emerald-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}