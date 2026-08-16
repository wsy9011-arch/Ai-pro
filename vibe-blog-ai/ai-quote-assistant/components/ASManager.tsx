"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
  status: string | null;
  inquiry: string | null;
};

const AS_STATUSES = [
  "AS접수",
  "AS처리중",
  "재방문",
];

export default function ASManager() {
  const [customers, setCustomers] = useState<Customer[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<
    "all" | "received" | "progress" | "visit"
  >("all");

  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(
    null
  );

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

      const { data, error: fetchError } =
        await supabase
          .from("customers")
          .select(
            "id,name,phone,region,service_type,status,inquiry"
          )
          .eq("user_id", user.id)
          .in("status", AS_STATUSES)
          .order("id", {
            ascending: false,
          });

      if (fetchError) {
        throw fetchError;
      }

      setCustomers((data ?? []) as Customer[]);
    } catch (err) {
      console.error("AS LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "AS 정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const counts = useMemo(() => {
    return {
      all: customers.length,

      received: customers.filter(
        (customer) => customer.status === "AS접수"
      ).length,

      progress: customers.filter(
        (customer) => customer.status === "AS처리중"
      ).length,

      visit: customers.filter(
        (customer) => customer.status === "재방문"
      ).length,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesView =
        view === "all" ||
        (view === "received" &&
          customer.status === "AS접수") ||
        (view === "progress" &&
          customer.status === "AS처리중") ||
        (view === "visit" &&
          customer.status === "재방문");

      if (!matchesView) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        customer.name,
        customer.phone,
        customer.region,
        customer.service_type,
        customer.inquiry,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(keyword)
        );
    });
  }, [customers, search, view]);

  async function changeStatus(
    customerId: string,
    status: "AS처리중" | "재방문"
  ) {
    setSavingId(customerId);
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

      const { error: updateError } =
        await supabase
          .from("customers")
          .update({ status })
          .eq("id", customerId)
          .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      await loadCustomers();
    } catch (err) {
      console.error("AS STATUS UPDATE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "AS 상태를 변경하지 못했습니다."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="pb-20">
      {/* 제목 */}
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-red-500">
            AFTER SERVICE
          </p>

          <h2 className="mt-1 text-3xl font-black text-slate-900">
            AS 관리
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            접수된 AS와 처리 진행 상황을 한눈에 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCustomers()}
          className="w-fit rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
        >
          ↻ 새로고침
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* 요약 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="전체 AS"
          value={`${counts.all}건`}
          icon="🛠️"
          active={view === "all"}
          onClick={() => setView("all")}
        />

        <SummaryCard
          title="AS 접수"
          value={`${counts.received}건`}
          icon="📥"
          active={view === "received"}
          onClick={() => setView("received")}
        />

        <SummaryCard
          title="AS 처리중"
          value={`${counts.progress}건`}
          icon="🔧"
          active={view === "progress"}
          onClick={() => setView("progress")}
        />

        <SummaryCard
          title="재방문"
          value={`${counts.visit}건`}
          icon="🚗"
          active={view === "visit"}
          onClick={() => setView("visit")}
        />
      </div>

      {/* 목록 */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-sm font-black text-slate-400">
            AFTER SERVICE LIST
          </p>

          <h3 className="mt-1 text-xl font-black text-slate-900">
            AS 목록
          </h3>
        </div>

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="고객명, 전화번호, 지역, 시공내용 검색"
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">
            AS 정보를 불러오는 중입니다...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-16 text-center">
            <div className="text-4xl">🛠️</div>

            <p className="mt-4 font-black text-slate-700">
              현재 AS 목록이 없습니다.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              고객 상태가 AS접수 또는 AS처리중이면
              이곳에서 관리할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black">
                        {customer.name}
                      </h4>

                      <StatusBadge
                        status={customer.status}
                      />
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                      <p>
                        📞 {customer.phone || "-"}
                      </p>

                      <p>
                        📍 {customer.region || "-"}
                      </p>

                      <p>
                        🏠{" "}
                        {customer.service_type ||
                          "시공 내용 미입력"}
                      </p>

                      <p>
                        📝 {customer.inquiry || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {customer.status === "AS접수" && (
                      <button
                        type="button"
                        disabled={
                          savingId === customer.id
                        }
                        onClick={() =>
                          void changeStatus(
                            customer.id,
                            "AS처리중"
                          )
                        }
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        🔧 처리 시작
                      </button>
                    )}

                    {customer.status ===
                      "AS처리중" && (
                      <button
                        type="button"
                        disabled={
                          savingId === customer.id
                        }
                        onClick={() =>
                          void changeStatus(
                            customer.id,
                            "재방문"
                          )
                        }
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                      >
                        🚗 재방문 처리
                      </button>
                    )}

                    {customer.status ===
                      "재방문" && (
                      <div className="rounded-xl bg-amber-50 px-5 py-3 text-sm font-black text-amber-700">
                        재방문
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const label = status || "AS접수";

  const className =
    label === "AS처리중"
      ? "bg-blue-50 text-blue-700"
      : label === "재방문"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  active,
  onClick,
}: {
  title: string;
  value: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition ${
        active
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">
          {title}
        </p>

        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-4 text-2xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        클릭해서 목록 보기
      </p>
    </button>
  );
}