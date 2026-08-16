"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

const BUSINESS_LABELS: Record<string, string> = {
  interior_film: "인테리어필름",
  wallpaper_flooring: "도배·장판",
  air_conditioner: "에어컨",
  cleaning: "청소",
  moving: "이사",
  demolition: "철거",
  auto_repair: "자동차 정비",
  sign_printing: "간판·인쇄",
  window_screen: "방충망·샷시",
  field_repair: "출장수리",
  plumbing: "설비·배관",
  electrical: "전기",
  painting: "도장·페인트",
  other: "기타",
};

export default function OnlineRequestManager() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: requestError } = await supabase
  .from("service_requests")
  .select(
    "id,business_type,service_type,name,phone,region,inquiry,status,created_at"
  )
  .in("status", ["접수", "신규문의"])
  .order("created_at", { ascending: false });

      if (requestError) {
        throw requestError;
      }

      setRequests((data ?? []) as ServiceRequest[]);

      /*
       * 중요:
       * 처음 화면을 열 때 customers 테이블을 조회하지 않습니다.
       * 실제 고객 등록은 '고객으로 등록' 버튼을 누를 때만 처리합니다.
       */
      setRegisteredIds([]);
    } catch (err) {
      console.error("DIRECT REQUEST LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "직접 문의를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function registerCustomer(request: ServiceRequest) {
    if (savingId) return;

    setSavingId(request.id);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      /*
       * 이미 같은 전화번호의 고객이 있는지 확인
       */
      const { data: existingCustomers, error: existingError } =
        await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .eq("phone", request.phone.trim());

      if (existingError) {
        throw existingError;
      }

      const existingCustomer =
        existingCustomers && existingCustomers.length > 0
          ? existingCustomers[0]
          : null;

      /*
       * 없으면 실제 customers 테이블에 저장
       */
      if (!existingCustomer) {
        const { error: insertError } = await supabase
          .from("customers")
          .insert({
            user_id: user.id,
            name: request.name.trim(),
            phone: request.phone.trim(),
            region: request.region.trim() || null,
            service_type:
              request.service_type?.trim() || null,
            inquiry: request.inquiry.trim() || null,
            estimate_amount: null,
            status: "신규문의",
          });

        if (insertError) {
          console.error(
            "CUSTOMER INSERT ERROR:",
            insertError
          );

          throw new Error(
            `고객 저장 실패: ${insertError.message}`
          );
        }
      }

      /*
       * customers 저장이 성공한 뒤에만
       * service_requests 상태를 변경
       */
      const { error: updateError } = await supabase
        .from("service_requests")
        .update({
          status: "고객등록완료",
        })
        .eq("id", request.id);

      if (updateError) {
        throw new Error(
          `고객은 저장됐지만 문의 상태 변경에 실패했습니다: ${updateError.message}`
        );
      }

      setRegisteredIds((prev) =>
        prev.includes(request.id)
          ? prev
          : [...prev, request.id]
      );

      setRequests((prev) =>
        prev.filter((item) => item.id !== request.id)
      );

      window.dispatchEvent(
        new Event("customers-updated")
      );

      alert(
        `${request.name} 고객님이 고객관리 목록에 등록되었습니다.`
      );
    } catch (err) {
      console.error(
        "DIRECT REQUEST REGISTER ERROR:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "고객 등록 중 오류가 발생했습니다.";

      setError(message);
      alert(message);
    } finally {
      setSavingId(null);
    }
  }

  function openEstimate(request: ServiceRequest) {
    window.localStorage.setItem(
      "estimate-ai-pending-customer",
      request.phone.trim()
    );

    window.dispatchEvent(
      new Event("open-estimate-manager")
    );
  }

  function formatDate(value: string) {
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

  return (
    <section className="mb-6 w-full rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-600">
            DIRECT REQUEST
          </p>

          <h3 className="mt-1 text-xl font-black text-slate-950">
            직접 문의
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            내 업체로 직접 들어온 고객 견적 요청을 확인하고 고객으로 등록하세요.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-blue-50 px-5 py-3 text-center">
          <p className="text-xs text-blue-500">
            신규 문의
          </p>

          <p className="mt-1 text-xl font-black text-blue-700">
            {requests.length}건
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-5 rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-400">
          직접 문의를 불러오는 중...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <div className="text-3xl">📭</div>

          <p className="mt-3 text-sm font-bold text-slate-600">
            아직 직접 문의가 없습니다.
          </p>
        </div>
      ) : (
        <div className="mt-5 w-full space-y-4">
          {requests.map((request) => {
            const registered =
              registeredIds.includes(request.id);

            const saving =
              savingId === request.id;

            return (
              <div
                key={request.id}
                className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div className="w-full p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                      직접 문의
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {BUSINESS_LABELS[
                        request.business_type
                      ] || request.business_type}
                    </span>

                    <span className="text-xs text-slate-400">
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xl font-black text-slate-950">
                      {request.name} 고객님
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {request.phone}
                    </p>
                  </div>

                  <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs text-slate-400">
                        서비스 지역
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {request.region}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs text-slate-400">
                        서비스
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {request.service_type ||
                          "일반 문의"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold text-slate-400">
                      문의 내용
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {request.inquiry}
                    </p>
                  </div>

                  <div className="mt-4">
                    {registered ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-600">
                          ✓ 고객 등록완료
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openEstimate(request)
                          }
                          className="rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white hover:bg-blue-700"
                        >
                          🧾 견적 작성 →
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void registerCustomer(request)
                        }
                        disabled={saving}
                        className="w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {saving
                          ? "고객 등록 중..."
                          : "👤 고객으로 등록 →"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}