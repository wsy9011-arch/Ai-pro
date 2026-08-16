"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchRequest = {
  id: string;
  customer_user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  region: string | null;
  business_type: string | null;
  service_type: string | null;
  inquiry: string | null;
  image_paths: string[] | null;
  image_urls?: string[];
  status: string;
  matched_business_id: string | null;
  matched_customer_id: string | null;
  accepted_at: string | null;
  created_at: string;
  target_business_user_id: string | null;
  source_ad_id: string | null;
  request_source: string | null;
  is_direct: boolean;
};

type BusinessProfile = {
  business_type: string | null;
  business_name: string | null;
};

export default function MatchRequestManager() {
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const directCount = useMemo(
    () => requests.filter((request) => request.is_direct).length,
    [requests]
  );

  async function attachSignedImageUrls(
    rows: MatchRequest[]
  ): Promise<MatchRequest[]> {
    const allPaths = Array.from(
      new Set(
        rows.flatMap((request) =>
          Array.isArray(request.image_paths) ? request.image_paths : []
        )
      )
    );

    if (allPaths.length === 0) {
      return rows.map((request) => ({
        ...request,
        image_urls: [],
      }));
    }

    const { data, error: signedError } = await supabase.storage
      .from("service-request-images")
      .createSignedUrls(allPaths, 60 * 60);

    if (signedError) {
      console.error("MATCH REQUEST IMAGE SIGN ERROR:", signedError);
      return rows.map((request) => ({
        ...request,
        image_urls: [],
      }));
    }

    const urlMap = new Map<string, string>();

    (data ?? []).forEach((item, index) => {
      const path = allPaths[index];
      if (path && item?.signedUrl) {
        urlMap.set(path, item.signedUrl);
      }
    });

    return rows.map((request) => ({
      ...request,
      image_urls: (request.image_paths ?? [])
        .map((path) => urlMap.get(path))
        .filter((url): url is string => Boolean(url)),
    }));
  }

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data: profileData, error: profileError } = await supabase
        .from("business_profiles")
        .select("business_type,business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData?.business_type) {
        throw new Error(
          "설정에서 업체 업종을 먼저 선택하고 저장해주세요."
        );
      }

      setBusinessProfile(profileData as BusinessProfile);

      const { data: requestData, error: requestError } =
        await supabase.rpc("get_my_pending_match_requests");

      if (requestError) throw requestError;

      const rows = (requestData ?? []) as MatchRequest[];
      const rowsWithImages = await attachSignedImageUrls(rows);
      setRequests(rowsWithImages);
    } catch (err) {
      console.error("MATCH REQUEST LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "매칭 문의를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function acceptRequest(request: MatchRequest) {
    if (!request.customer_user_id) {
      setError(
        "이 문의는 고객 계정 연결 정보가 없습니다. 새로 등록한 문의로 테스트해주세요."
      );
      return;
    }

    const confirmed = window.confirm(
      request.is_direct
        ? `${request.customer_name} 고객이 내 업체에 직접 보낸 문의입니다.\n수락하시겠습니까?`
        : `${request.customer_name} 고객의 매칭 문의를 수락하시겠습니까?`
    );

    if (!confirmed) return;

    setAcceptingId(request.id);
    setError("");

    try {
      const { error: acceptError } = await supabase.rpc(
        "accept_my_match_request",
        {
          p_request_id: request.id,
        }
      );

      if (acceptError) throw acceptError;

      setRequests((current) =>
        current.filter((item) => item.id !== request.id)
      );

      alert(
        `${request.customer_name} 고객의 문의를 수락했습니다.\n고객 관리에서 확인할 수 있습니다.`
      );
    } catch (err) {
      console.error("MATCH REQUEST ACCEPT ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "문의 수락 중 오류가 발생했습니다."
      );
    } finally {
      setAcceptingId(null);
    }
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="pb-28">
      <div className="mb-7">
        <p className="text-sm font-bold text-emerald-600">
          MATCHING REQUESTS
        </p>
        <h2 className="mt-1 text-3xl font-black">매칭 문의</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          내 업체에 직접 들어온 광고 문의와 내 업종의 일반 매칭
          문의를 확인하고 수락할 수 있습니다.
        </p>
      </div>

      {businessProfile && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-500">현재 업체</p>
            <p className="mt-1 font-black text-blue-900">
              {businessProfile.business_name || "업체명 미설정"}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-600">
              광고 직접문의
            </p>
            <p className="mt-1 text-xl font-black text-amber-900">
              {directCount}건
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-400">
              NEW REQUESTS
            </p>
            <h3 className="mt-1 text-xl font-black">신규 고객 문의</h3>
          </div>

          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            {requests.length}건
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm font-bold text-slate-400">
            매칭 문의를 불러오는 중...
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-14 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 font-black text-slate-700">
              현재 신규 매칭 문의가 없습니다.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              고객이 광고에서 직접 문의하거나 일반 문의를 등록하면
              이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`rounded-2xl border p-5 ${
                  request.is_direct
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black">
                        {request.service_type || "서비스 문의"}
                      </p>

                      {request.is_direct && (
                        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">
                          📢 광고 직접문의
                        </span>
                      )}

                      {!request.is_direct && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          일반 매칭문의
                        </span>
                      )}

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-500">
                      📍 {request.region || "지역 미등록"}
                    </p>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {request.inquiry || "문의 내용 없음"}
                    </p>

                    {(request.image_urls ?? []).length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {(request.image_urls ?? []).map((url, index) => (
                          <a
                            key={`${request.id}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={url}
                              alt={`문의 사진 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-400">
                      접수 {formatDate(request.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      acceptingId === request.id ||
                      !request.customer_user_id
                    }
                    onClick={() => void acceptRequest(request)}
                    className={`shrink-0 rounded-xl px-5 py-3 text-sm font-black text-white disabled:bg-slate-300 ${
                      request.is_direct
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {acceptingId === request.id
                      ? "수락 중..."
                      : request.customer_user_id
                        ? request.is_direct
                          ? "📢 직접문의 수락"
                          : "🤝 문의 수락"
                        : "연결정보 없음"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
