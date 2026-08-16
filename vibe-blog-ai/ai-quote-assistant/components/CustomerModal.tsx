"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomerModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function CustomerModal({
  onClose,
  onSaved,
}: CustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [status, setStatus] = useState("신규문의");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setError("고객 이름을 입력해주세요.");
      return;
    }

    if (!inquiry.trim()) {
      setError("문의 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
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

      const { error: insertError } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name: name.trim(),
          phone: phone.trim() || null,
          region: region.trim() || null,
          service_type: serviceType.trim() || null,
          inquiry: inquiry.trim(),
          status,
          estimate_amount: estimateAmount
            ? Number(estimateAmount.replace(/,/g, ""))
            : null,
        });

      if (insertError) {
        throw insertError;
      }

      alert("고객이 등록되었습니다.");

      onSaved();
      onClose();
    } catch (err) {
      console.error("CUSTOMER SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "고객 등록 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              NEW CUSTOMER
            </p>

            <h2 className="mt-1 text-2xl font-black">
              고객 등록
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              상담 고객 정보를 등록해주세요.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                고객 이름 *
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 김민수"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                전화번호
              </label>

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                지역
              </label>

              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예) 의정부"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                서비스 종류
              </label>

              <input
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="예) 싱크대 필름"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              문의 내용 *
            </label>

            <textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              placeholder="고객 문의 내용을 입력해주세요."
              className="min-h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                예상 견적
              </label>

              <input
                type="number"
                min="0"
                value={estimateAmount}
                onChange={(e) => setEstimateAmount(e.target.value)}
                placeholder="예) 850000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                상담 상태
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="신규문의">신규문의</option>
                <option value="상담중">상담중</option>
                <option value="견적발송">견적발송</option>
                <option value="계약대기">계약대기</option>
                <option value="계약완료">계약완료</option>
                <option value="보류">보류</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold hover:bg-slate-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-[2] rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "저장 중..." : "고객 등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}