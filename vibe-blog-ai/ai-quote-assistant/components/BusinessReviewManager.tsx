"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type BusinessReview = {
  review_id: string;
  estimate_id: string;
  customer_user_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  review_created_at: string;
  review_updated_at: string;
  business_reply: string | null;
  business_replied_at: string | null;
  business_reply_updated_at: string | null;
  estimate_number: string | null;
  work_description: string;
  total_amount: number | string | null;
};

export default function BusinessReviewManager() {
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const unansweredCount = useMemo(
    () => reviews.filter((review) => !review.business_reply?.trim()).length,
    [reviews]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    return (
      reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      reviews.length
    );
  }, [reviews]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: loadError } = await supabase.rpc(
        "get_my_business_reviews"
      );

      if (loadError) throw loadError;

      const rows = (data ?? []) as BusinessReview[];
      setReviews(rows);
      setReplyDrafts(
        Object.fromEntries(
          rows.map((review) => [
            review.review_id,
            review.business_reply || "",
          ])
        )
      );
    } catch (err) {
      console.error("BUSINESS REVIEW LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "후기를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function saveReply(review: BusinessReview) {
    const reply = (replyDrafts[review.review_id] || "").trim();

    if (!reply) {
      setError("답글 내용을 입력해주세요.");
      return;
    }

    if (reply.length > 1000) {
      setError("답글은 1000자 이하로 작성해주세요.");
      return;
    }

    setSavingId(review.review_id);
    setError("");
    setMessage("");

    try {
      const { data, error: saveError } = await supabase.rpc(
        "save_business_review_reply",
        {
          p_review_id: review.review_id,
          p_reply: reply,
        }
      );

      if (saveError) throw saveError;

      const result = data?.[0] as
        | {
            business_reply?: string | null;
            business_replied_at?: string | null;
            business_reply_updated_at?: string | null;
          }
        | undefined;

      setReviews((current) =>
        current.map((item) =>
          item.review_id === review.review_id
            ? {
                ...item,
                business_reply: result?.business_reply ?? reply,
                business_replied_at:
                  result?.business_replied_at ??
                  item.business_replied_at ??
                  new Date().toISOString(),
                business_reply_updated_at:
                  result?.business_reply_updated_at ??
                  new Date().toISOString(),
              }
            : item
        )
      );

      setMessage(
        review.business_reply
          ? "후기 답글을 수정했습니다."
          : "후기 답글을 등록했습니다."
      );
    } catch (err) {
      console.error("BUSINESS REVIEW REPLY SAVE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "답글 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function deleteReply(review: BusinessReview) {
    if (!review.business_reply) return;

    const confirmed = window.confirm("작성한 업체 답글을 삭제할까요?");
    if (!confirmed) return;

    setDeletingId(review.review_id);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase.rpc(
        "save_business_review_reply",
        {
          p_review_id: review.review_id,
          p_reply: "",
        }
      );

      if (deleteError) throw deleteError;

      setReviews((current) =>
        current.map((item) =>
          item.review_id === review.review_id
            ? {
                ...item,
                business_reply: null,
                business_replied_at: null,
                business_reply_updated_at: null,
              }
            : item
        )
      );

      setReplyDrafts((current) => ({
        ...current,
        [review.review_id]: "",
      }));

      setMessage("후기 답글을 삭제했습니다.");
    } catch (err) {
      console.error("BUSINESS REVIEW REPLY DELETE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "답글 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

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
        <p className="text-sm font-black text-amber-500">REVIEW MANAGEMENT</p>
        <h2 className="mt-1 text-3xl font-black">후기 관리</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          고객이 남긴 별점과 후기를 확인하고 업체 답글을 작성할 수 있습니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400">전체 후기</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {reviews.length}건
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-bold text-amber-600">평균 별점</p>
          <p className="mt-2 text-2xl font-black text-amber-800">
            ★ {averageRating.toFixed(1)}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-bold text-blue-500">답글 대기</p>
          <p className="mt-2 text-2xl font-black text-blue-900">
            {unansweredCount}건
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {loading ? (
          <div className="py-16 text-center text-sm font-bold text-slate-400">
            고객 후기를 불러오는 중입니다...
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-10 text-center">
            <p className="text-4xl">⭐</p>
            <p className="mt-3 font-black text-slate-700">
              아직 등록된 고객 후기가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              시공완료 고객이 후기를 작성하면 이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => {
              const reply = replyDrafts[review.review_id] || "";

              return (
                <article
                  key={review.review_id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          {review.customer_name} 고객
                        </h3>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                          ★ {review.rating}.0
                        </span>
                        {!review.business_reply && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                            답글 대기
                          </span>
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {review.comment || "후기 내용이 없습니다."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-400">
                        <span>
                          {review.estimate_number || "견적"}
                        </span>
                        <span>
                          {Number(review.total_amount || 0).toLocaleString("ko-KR")}원
                        </span>
                        <span>{formatDate(review.review_created_at)}</span>
                      </div>

                      {review.work_description && (
                        <p className="mt-3 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-slate-500">
                          {review.work_description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">
                        업체 답글
                      </p>

                      {review.business_reply && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {formatDate(
                            review.business_reply_updated_at ||
                              review.business_replied_at
                          )}
                        </span>
                      )}
                    </div>

                    <textarea
                      value={reply}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [review.review_id]: event.target.value,
                        }))
                      }
                      rows={4}
                      maxLength={1000}
                      placeholder="고객에게 보여질 업체 답글을 작성해주세요."
                      className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-amber-400"
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-bold text-slate-400">
                        {reply.length.toLocaleString("ko-KR")} / 1,000자
                      </p>

                      <div className="flex gap-2">
                        {review.business_reply && (
                          <button
                            type="button"
                            disabled={deletingId === review.review_id}
                            onClick={() => void deleteReply(review)}
                            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 disabled:opacity-50"
                          >
                            {deletingId === review.review_id
                              ? "삭제 중..."
                              : "답글 삭제"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            savingId === review.review_id ||
                            reply.trim().length === 0
                          }
                          onClick={() => void saveReply(review)}
                          className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40"
                        >
                          {savingId === review.review_id
                            ? "저장 중..."
                            : review.business_reply
                              ? "답글 수정"
                              : "답글 등록"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
