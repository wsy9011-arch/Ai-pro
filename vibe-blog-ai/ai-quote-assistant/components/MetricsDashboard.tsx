"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type BetaMetricsRow = {
  business_user_count: number | string | null;
  estimate_count: number | string | null;
  contract_count: number | string | null;
  review_count: number | string | null;
  reviewer_count: number | string | null;
  average_rating: number | string | null;
  five_star_rate: number | string | null;
  customer_use_rate: number | string | null;
  reuse_rate: number | string | null;
};

type BetaMetrics = {
  businessUserCount: number;
  estimateCount: number;
  contractCount: number;
  reviewCount: number;
  reviewerCount: number;
  averageRating: number;
  fiveStarRate: number;
  customerUseRate: number;
  reuseRate: number;
};

const EMPTY_METRICS: BetaMetrics = {
  businessUserCount: 0,
  estimateCount: 0,
  contractCount: 0,
  reviewCount: 0,
  reviewerCount: 0,
  averageRating: 0,
  fiveStarRate: 0,
  customerUseRate: 0,
  reuseRate: 0,
};

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<BetaMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data, error: metricsError } =
        await supabase.rpc("get_beta_metrics");

      if (metricsError) throw metricsError;

      const row = (Array.isArray(data) ? data[0] : data) as
        | BetaMetricsRow
        | null
        | undefined;

      setMetrics({
        businessUserCount: toNumber(row?.business_user_count),
        estimateCount: toNumber(row?.estimate_count),
        contractCount: toNumber(row?.contract_count),
        reviewCount: toNumber(row?.review_count),
        reviewerCount: toNumber(row?.reviewer_count),
        averageRating: toNumber(row?.average_rating),
        fiveStarRate: toNumber(row?.five_star_rate),
        customerUseRate: toNumber(row?.customer_use_rate),
        reuseRate: toNumber(row?.reuse_rate),
      });
    } catch (err) {
      console.error("BETA METRICS LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "통계 데이터를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const contractConversionRate = useMemo(() => {
    if (metrics.estimateCount <= 0) return 0;

    return (
      (metrics.contractCount / metrics.estimateCount) *
      100
    );
  }, [metrics.contractCount, metrics.estimateCount]);

  const reviewParticipationRate = useMemo(() => {
    if (metrics.businessUserCount <= 0) return 0;

    return (
      (metrics.reviewerCount / metrics.businessUserCount) *
      100
    );
  }, [metrics.businessUserCount, metrics.reviewerCount]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm font-bold text-slate-400">
              실제 서비스 데이터를 집계하고 있습니다...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-8">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-blue-400">
              BETA VALIDATION DASHBOARD
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              서비스 검증 통계
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              견적AI의 실제 가입·견적·계약·후기 데이터를 자동 집계합니다.
              창업지원사업의 사용자 검증 및 성과 증빙 자료로 활용할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMetrics()}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
          >
            ↻ 최신 데이터 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="🏢"
          label="등록 업체"
          value={`${metrics.businessUserCount.toLocaleString("ko-KR")}곳`}
          description="business_profiles 기준"
        />
        <MetricCard
          icon="🧾"
          label="누적 견적"
          value={`${metrics.estimateCount.toLocaleString("ko-KR")}건`}
          description="실제 저장된 견적"
        />
        <MetricCard
          icon="🤝"
          label="누적 계약"
          value={`${metrics.contractCount.toLocaleString("ko-KR")}건`}
          description={`견적 대비 ${toPercent(contractConversionRate)}`}
        />
        <MetricCard
          icon="⭐"
          label="평균 만족도"
          value={`${metrics.averageRating.toFixed(1)} / 5`}
          description={`후기 ${metrics.reviewCount.toLocaleString("ko-KR")}건`}
          emphasize
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-xs font-black tracking-wide text-blue-600">
              USER VALIDATION
            </p>
            <h3 className="mt-1 text-xl font-black">
              사용자 검증 지표
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              지원사업 발표에서 “실제 사용자가 만족했는가”를 보여주는 핵심 수치입니다.
            </p>
          </div>

          <div className="mt-7 space-y-6">
            <RateRow
              label="재사용 의향"
              value={metrics.reuseRate}
              description="다시 사용할 의향이 있다고 응답한 비율"
            />
            <RateRow
              label="실제 고객 상담 사용률"
              value={metrics.customerUseRate}
              description="생성한 견적을 실제 고객 상담에 활용한 비율"
            />
            <RateRow
              label="5점 만족 비율"
              value={metrics.fiveStarRate}
              description="전체 후기 중 별점 5점 비율"
            />
            <RateRow
              label="후기 참여율"
              value={reviewParticipationRate}
              description={`${metrics.reviewerCount.toLocaleString("ko-KR")}개 업체가 평가 참여`}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black tracking-wide text-emerald-600">
            STARTUP SUPPORT
          </p>
          <h3 className="mt-1 text-xl font-black">
            지원사업용 핵심 숫자
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            사업계획서와 발표자료에 넣기 좋은 수치를 한곳에서 확인하세요.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <EvidenceBox
              label="실사용 업체"
              value={`${metrics.businessUserCount.toLocaleString("ko-KR")}곳`}
            />
            <EvidenceBox
              label="누적 견적 생성"
              value={`${metrics.estimateCount.toLocaleString("ko-KR")}건`}
            />
            <EvidenceBox
              label="계약 전환"
              value={`${metrics.contractCount.toLocaleString("ko-KR")}건`}
            />
            <EvidenceBox
              label="후기 확보"
              value={`${metrics.reviewCount.toLocaleString("ko-KR")}건`}
            />
            <EvidenceBox
              label="평균 별점"
              value={`${metrics.averageRating.toFixed(1)}점`}
            />
            <EvidenceBox
              label="재사용 의향"
              value={toPercent(metrics.reuseRate)}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-black text-emerald-700">
              현재 자동 계산
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              견적 → 계약 전환율{" "}
              <strong>{toPercent(contractConversionRate)}</strong>
              {" · "}
              실제 고객 사용률{" "}
              <strong>{toPercent(metrics.customerUseRate)}</strong>
              {" · "}
              재사용 의향{" "}
              <strong>{toPercent(metrics.reuseRate)}</strong>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  emphasize = false,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        emphasize
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
            emphasize ? "bg-white" : "bg-slate-50"
          }`}
        >
          {icon}
        </div>
        <p className="text-xs font-black text-slate-400">
          LIVE DATA
        </p>
      </div>

      <p className="mt-5 text-sm font-bold text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function RateRow({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-800">
            {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>
        <p className="shrink-0 text-lg font-black text-blue-600">
          {toPercent(safeValue)}
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function EvidenceBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
