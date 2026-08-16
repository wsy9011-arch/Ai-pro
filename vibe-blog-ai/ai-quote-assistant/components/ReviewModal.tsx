"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReviewModalProps = {
  estimateId: string;
  estimateNumber?: string | null;
  customerName?: string | null;
  onClose: () => void;
  onSubmitted?: () => void | Promise<void>;
};

const FEEDBACK_TAGS = [
  "견적 작성이 빨라졌어요",
  "금액 계산이 편해요",
  "고객 상담에 도움이 됐어요",
  "고객에게 바로 보내기 좋아요",
  "수정이 조금 필요해요",
];

export default function ReviewModal({
  estimateId,
  estimateNumber,
  customerName,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [feedbackTag, setFeedbackTag] = useState("");
  const [usedForCustomer, setUsedForCustomer] = useState(false);
  const [reuseIntent, setReuseIntent] = useState(true);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("로그인이 필요합니다.");

        const { data, error: reviewError } = await supabase
          .from("reviews")
          .select("rating,feedback_tag,used_for_customer,reuse_intent,comment")
          .eq("user_id", user.id)
          .eq("estimate_id", estimateId)
          .maybeSingle();

        if (reviewError) throw reviewError;
        if (cancelled) return;

        if (data) {
          setHasExistingReview(true);
          setRating(Number(data.rating || 0));
          setFeedbackTag(data.feedback_tag || "");
          setUsedForCustomer(Boolean(data.used_for_customer));
          setReuseIntent(data.reuse_intent !== false);
          setComment(data.comment || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "후기 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReview();
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  async function submitReview() {
    if (rating < 1 || rating > 5) {
      setError("별점을 1점 이상 선택해주세요.");
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
      if (!user) throw new Error("로그인이 필요합니다.");

      const { error: saveError } = await supabase
        .from("reviews")
        .upsert(
          {
            user_id: user.id,
            estimate_id: estimateId,
            rating,
            feedback_tag: feedbackTag || null,
            used_for_customer: usedForCustomer,
            reuse_intent: reuseIntent,
            comment: comment.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,estimate_id" }
        );

      if (saveError) throw saveError;

      if (onSubmitted) await onSubmitted();

      alert(
        hasExistingReview
          ? "후기가 수정되었습니다."
          : "후기가 등록되었습니다. 감사합니다."
      );
      onClose();
    } catch (err) {
      console.error("REVIEW SAVE ERROR:", err);
      setError(
        err instanceof Error ? err.message : "후기를 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100000] overflow-y-auto bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-blue-600">
                AI ESTIMATE REVIEW
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-900">
                이번 AI 견적은 어떠셨나요?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                실제 사용 경험을 알려주시면 더 좋은 견적 기능을 만드는 데
                반영됩니다.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-500"
            >
              ✕
            </button>
          </div>

          {(estimateNumber || customerName) && (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              {estimateNumber && (
                <span className="font-black text-slate-700">
                  {estimateNumber}
                </span>
              )}
              {estimateNumber && customerName && (
                <span className="mx-2 text-slate-300">·</span>
              )}
              {customerName && (
                <span className="font-bold text-slate-500">
                  {customerName} 고객
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-14 text-center text-sm font-bold text-slate-400">
              후기 정보를 불러오는 중...
            </div>
          ) : (
            <>
              <div className="mt-7">
                <p className="text-sm font-black text-slate-800">별점 *</p>
                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star}점`}
                      className="text-4xl leading-none transition-transform hover:scale-110"
                    >
                      <span
                        className={
                          star <= rating ? "text-amber-400" : "text-slate-200"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  {rating > 0 ? `${rating}점 선택` : "별을 눌러 평가해주세요."}
                </p>
              </div>

              <div className="mt-7">
                <p className="text-sm font-black text-slate-800">
                  가장 좋았던 점
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((tag) => {
                    const selected = feedbackTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFeedbackTag(selected ? "" : tag)}
                        className={
                          selected
                            ? "rounded-full border border-blue-600 bg-blue-600 px-3.5 py-2 text-xs font-black text-white"
                            : "rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600"
                        }
                      >
                        {selected ? "✓ " : ""}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  title="실제 고객 상담에 사용했나요?"
                  value={usedForCustomer}
                  onChange={setUsedForCustomer}
                />
                <ChoiceCard
                  title="다시 사용할 의향이 있나요?"
                  value={reuseIntent}
                  onChange={setReuseIntent}
                />
              </div>

              <div className="mt-7">
                <label className="text-sm font-black text-slate-800">
                  한줄 후기
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={500}
                  placeholder="예: 상담 내용을 넣으니 견적 초안이 빨리 나와서 편했어요."
                  className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500"
                />
                <div className="mt-1 text-right text-xs font-bold text-slate-300">
                  {comment.length}/500
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-black text-slate-600 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void submitReview()}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white disabled:bg-blue-300"
                >
                  {saving
                    ? "저장 중..."
                    : hasExistingReview
                      ? "후기 수정 저장"
                      : "후기 등록"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-black leading-5 text-slate-700">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            value
              ? "rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white"
              : "rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500"
          }
        >
          예
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            !value
              ? "rounded-xl bg-slate-700 px-3 py-2.5 text-xs font-black text-white"
              : "rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500"
          }
        >
          아니오
        </button>
      </div>
    </div>
  );
}
