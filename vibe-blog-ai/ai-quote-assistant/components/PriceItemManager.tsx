"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PriceItem = {
  id: string;
  item_name: string;
  unit: string;
  unit_price: number;
  category: string | null;
  description: string | null;
  is_active: boolean;
  business_type: string;
};

export default function PriceItemManager() {
  const [items, setItems] = useState<PriceItem[]>([]);

  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      // 현재 업체 업종 확인
      const { data: profile, error: profileError } =
        await supabase
          .from("business_profiles")
          .select("business_type")
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      const businessType = profile?.business_type;

      if (!businessType) {
        setItems([]);
        throw new Error(
          "설정에서 업종을 먼저 선택하고 저장해주세요."
        );
      }

      // 현재 업종의 단가만 불러오기
      const { data, error: loadError } =
        await supabase
          .from("price_items")
          .select(
            "id,item_name,unit,unit_price,category,description,is_active,business_type"
          )
          .eq("user_id", user.id)
          .eq("business_type", businessType)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      if (loadError) throw loadError;

      console.log("현재 업종:", businessType);
      console.log("DB에서 불러온 단가:", data);

      // DB 필터 + 클라이언트 필터를 함께 적용해서
      // 다른 업종 단가가 화면에 섞이지 않도록 한 번 더 검증합니다.
      const filteredItems = (data || []).filter(
        (item) => item.business_type === businessType
      );

      setItems(
        filteredItems.map((item) => ({
          ...item,
          unit_price: Number(item.unit_price || 0),
        }))
      );
    } catch (err) {
      console.error("PRICE ITEMS LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "단가표를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();

    const handleBusinessTypeChanged = () => {
      void loadItems();
    };

    window.addEventListener(
      "business-type-changed",
      handleBusinessTypeChanged
    );

    return () => {
      window.removeEventListener(
        "business-type-changed",
        handleBusinessTypeChanged
      );
    };
  }, [loadItems]);

  function resetForm() {
    setItemName("");
    setUnit("");
    setUnitPrice("");
    setCategory("");
    setDescription("");
    setEditingId(null);
  }

  function startEdit(item: PriceItem) {
    setEditingId(item.id);
    setItemName(item.item_name);
    setUnit(item.unit);
    setUnitPrice(String(item.unit_price));
    setCategory(item.category || "");
    setDescription(item.description || "");
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    resetForm();
    setError("");
    setMessage("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!itemName.trim()) {
      setError("견적 항목명을 입력해주세요.");
      return;
    }

    if (!unit.trim()) {
      setError("단위를 입력해주세요.");
      return;
    }

    const price = Number(unitPrice.replace(/,/g, ""));

    if (!Number.isFinite(price) || price < 0) {
      setError("기본단가를 올바르게 입력해주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      // 현재 업종 확인
      const { data: profile, error: profileError } =
        await supabase
          .from("business_profiles")
          .select("business_type")
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      const businessType = profile?.business_type;

      if (!businessType) {
        throw new Error(
          "설정에서 업종을 먼저 선택하고 저장해주세요."
        );
      }

      if (editingId) {
        const { error: updateError } =
          await supabase
            .from("price_items")
            .update({
              item_name: itemName.trim(),
              unit: unit.trim(),
              unit_price: price,
              category: category.trim() || null,
              description: description.trim() || null,
              business_type: businessType,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingId)
            .eq("user_id", user.id);

        if (updateError) throw updateError;

        resetForm();
        setMessage("견적 항목이 수정되었습니다.");
      } else {
        const { error: insertError } =
          await supabase
            .from("price_items")
            .insert({
              user_id: user.id,
              item_name: itemName.trim(),
              unit: unit.trim(),
              unit_price: price,
              category: category.trim() || null,
              description: description.trim() || null,
              business_type: businessType,
              is_active: true,
              updated_at: new Date().toISOString(),
            });

        if (insertError) throw insertError;

        resetForm();
        setMessage("견적 항목이 추가되었습니다.");
      }

      await loadItems();
    } catch (err) {
      console.error("PRICE ITEM SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 항목 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `"${name}" 항목을 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { error: deleteError } =
        await supabase
          .from("price_items")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      if (editingId === id) {
        resetForm();
      }

      setMessage("견적 항목이 삭제되었습니다.");

      await loadItems();
    } catch (err) {
      console.error("PRICE ITEM DELETE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "견적 항목 삭제 중 오류가 발생했습니다."
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-slate-400">
          단가표를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600">
          PRICE LIST
        </p>

        <h3 className="mt-2 text-xl font-black">
          업체별 견적 단가표
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          현재 선택한 업종에서 사용하는 견적 항목과 기본단가를
          직접 등록하고 수정할 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`mt-7 rounded-2xl p-4 sm:p-5 ${
          editingId
            ? "border border-blue-200 bg-blue-50"
            : "bg-slate-50"
        }`}
      >
        {editingId && (
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-600">
                EDIT MODE
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                견적 항목 수정 중
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
            >
              수정 취소
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold">
              견적 항목 *
            </label>

            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="예) 싱크대 문짝"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              분류
            </label>

            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예) 싱크대"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              단위 *
            </label>

            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="예) 개, m, ㎡, 평, 회"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              기본단가 *
            </label>

            <input
              inputMode="numeric"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="예) 30000"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold">
            설명
          </label>

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예) 기본 문짝 필름 시공 단가"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving
            ? editingId
              ? "수정 저장 중..."
              : "추가 중..."
            : editingId
              ? "💾 수정 저장"
              : "＋ 견적 항목 추가"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {message}
        </div>
      )}

      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-slate-900">
            등록된 견적 항목
          </h4>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            {items.length}개
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-7 text-center">
            <p className="text-sm font-bold text-slate-400">
              아직 등록된 견적 항목이 없습니다.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              위에서 첫 번째 단가를 등록해보세요.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">
                        {item.item_name}
                      </p>

                      {item.category && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-lg font-black text-blue-600">
                      {item.unit_price.toLocaleString("ko-KR")}원
                      <span className="ml-1 text-xs font-bold text-slate-400">
                        / {item.unit}
                      </span>
                    </p>

                    {item.description && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-100"
                    >
                      수정
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(item.id, item.item_name)
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                    >
                      삭제
                    </button>
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