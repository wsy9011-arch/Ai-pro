"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import QuickContractPrint from "./QuickContractPrint";

export default function SettingsManager() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [address, setAddress] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImagePath, setProfileImagePath] = useState("");
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [removingProfileImage, setRemovingProfileImage] = useState(false);

  const [plan, setPlan] = useState("free");
  const [remainingCount, setRemainingCount] = useState(3);
  const [unlimited, setUnlimited] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
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

      setEmail(user.email || "");

      // 이용 플랜 불러오기
      const { data: planData, error: planError } =
        await supabase
          .from("user_plans")
          .select("plan,remaining_count,unlimited")
          .eq("user_id", user.id)
          .maybeSingle();

      if (planError) throw planError;

      if (!planData) {
        const {
          data: createdPlan,
          error: createPlanError,
        } = await supabase
          .from("user_plans")
          .insert({
            user_id: user.id,
            plan: "free",
            remaining_count: 3,
            unlimited: false,
          })
          .select("plan,remaining_count,unlimited")
          .single();

        if (createPlanError) throw createPlanError;

        setPlan(createdPlan.plan || "free");
        setRemainingCount(
          Number(createdPlan.remaining_count ?? 3)
        );
        setUnlimited(Boolean(createdPlan.unlimited));
      } else {
        setPlan(planData.plan || "free");
        setRemainingCount(
          Number(planData.remaining_count ?? 0)
        );
        setUnlimited(Boolean(planData.unlimited));
      }

      // 업체 기본정보 불러오기
      const {
        data,
        error: profileError,
      } = await supabase
        .from("business_profiles")
        .select(
          "business_name,business_type,owner_name,phone,business_number,address,profile_image_url,profile_image_path"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (data) {
        setBusinessName(data.business_name || "");
        setBusinessType(data.business_type || "");
        setOwnerName(data.owner_name || "");
        setPhone(data.phone || "");
        setBusinessNumber(data.business_number || "");
        setAddress(data.address || "");
        setProfileImageUrl(data.profile_image_url || "");
        setProfileImagePath(data.profile_image_path || "");
      }
    } catch (err) {
      console.error(
        "BUSINESS PROFILE LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "업체정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handlePlanPayment(
    planKey: "starter" | "pro"
  ) {
    const planInfo = {
      starter: {
        name: "스타터",
        amount: 29900,
        orderName: "견적AI 스타터 30회",
      },
      pro: {
        name: "프로",
        amount: 49900,
        orderName: "견적AI 프로 100회",
      },
    }[planKey];

    try {
      setError("");
      setMessage("");

      const clientKey =
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

      if (!clientKey) {
        throw new Error(
          "토스 결제 클라이언트 키가 설정되지 않았습니다."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "로그인 세션을 확인할 수 없습니다."
        );
      }

      const orderId =
        `quote_${planKey}_${user.id}_${Date.now()}`;

      const tossPayments =
        await loadTossPayments(clientKey);

      const payment = tossPayments.payment({
        customerKey: user.id,
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: planInfo.amount,
        },
        orderId,
        orderName: planInfo.orderName,
        customerEmail: user.email || undefined,
        successUrl:
          `${window.location.origin}/payment/success` +
          `?plan=${planKey}`,
        failUrl:
          `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      console.error("TOSS PAYMENT ERROR:", err);

      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code ===
          "USER_CANCEL"
      ) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : `${planInfo.name} 결제를 시작하지 못했습니다.`
      );
    }
  }

  async function saveProfileImageFields({
    userId,
    imageUrl,
    imagePath,
  }: {
    userId: string;
    imageUrl: string | null;
    imagePath: string | null;
  }) {
    const { data: updatedRows, error: updateError } = await supabase
      .from("business_profiles")
      .update({
        profile_image_url: imageUrl,
        profile_image_path: imagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("user_id");

    if (updateError) throw updateError;

    if ((updatedRows ?? []).length > 0) {
      return;
    }

    if (!businessName.trim()) {
      throw new Error(
        "업체 기본정보를 먼저 저장한 뒤 프로필 사진을 등록해주세요."
      );
    }

    if (!businessType) {
      throw new Error(
        "업종을 먼저 선택하고 업체정보를 저장해주세요."
      );
    }

    const { error: insertError } = await supabase
      .from("business_profiles")
      .insert({
        user_id: userId,
        business_name: businessName.trim(),
        business_type: businessType,
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        business_number: businessNumber.trim() || null,
        address: address.trim() || null,
        profile_image_url: imageUrl,
        profile_image_path: imagePath,
        updated_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
  }

  async function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    if (!allowedTypes.has(file.type)) {
      setError("JPG, PNG, WEBP 형식의 이미지만 등록할 수 있습니다.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("프로필 사진은 5MB 이하만 등록할 수 있습니다.");
      return;
    }

    setUploadingProfileImage(true);
    setMessage("");
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const newPath =
        `${user.id}/profile-${Date.now()}-` +
        `${Math.random().toString(36).slice(2, 10)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("business-profile-images")
        .upload(newPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("business-profile-images")
        .getPublicUrl(newPath);

      try {
        await saveProfileImageFields({
          userId: user.id,
          imageUrl: publicUrl,
          imagePath: newPath,
        });
      } catch (saveImageError) {
        await supabase.storage
          .from("business-profile-images")
          .remove([newPath]);

        throw saveImageError;
      }

      const previousPath = profileImagePath;

      setProfileImageUrl(publicUrl);
      setProfileImagePath(newPath);

      if (previousPath && previousPath !== newPath) {
        const { error: oldDeleteError } = await supabase.storage
          .from("business-profile-images")
          .remove([previousPath]);

        if (oldDeleteError) {
          console.error(
            "OLD PROFILE IMAGE DELETE ERROR:",
            oldDeleteError
          );
        }
      }

      setMessage(
        "업체 프로필 사진이 저장되었습니다. 고객 광고 카드에 표시됩니다."
      );
    } catch (err) {
      console.error("PROFILE IMAGE UPLOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "프로필 사진 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setUploadingProfileImage(false);
    }
  }

  async function handleRemoveProfileImage() {
    if (!profileImageUrl || removingProfileImage) return;

    const confirmed = window.confirm(
      "업체 프로필 사진을 삭제할까요?"
    );

    if (!confirmed) return;

    setRemovingProfileImage(true);
    setMessage("");
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      await saveProfileImageFields({
        userId: user.id,
        imageUrl: null,
        imagePath: null,
      });

      if (profileImagePath) {
        const { error: removeError } = await supabase.storage
          .from("business-profile-images")
          .remove([profileImagePath]);

        if (removeError) {
          console.error(
            "PROFILE IMAGE STORAGE DELETE ERROR:",
            removeError
          );
        }
      }

      setProfileImageUrl("");
      setProfileImagePath("");
      setMessage("업체 프로필 사진을 삭제했습니다.");
    } catch (err) {
      console.error("PROFILE IMAGE REMOVE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "프로필 사진 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setRemovingProfileImage(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!businessName.trim()) {
      setError("업체명을 입력해주세요.");
      return;
    }

    if (!businessType) {
      setError("업종을 선택해주세요.");
      return;
    }

    setSaving(true);
    setMessage("");
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

      const profilePayload = {
        business_name: businessName.trim(),
        business_type: businessType,
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        business_number: businessNumber.trim() || null,
        address: address.trim() || null,
        profile_image_url: profileImageUrl || null,
        profile_image_path: profileImagePath || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("business_profiles")
        .update(profilePayload)
        .eq("user_id", user.id)
        .select("user_id");

      if (updateError) throw updateError;

      if ((updatedRows ?? []).length === 0) {
        const { error: insertError } = await supabase
          .from("business_profiles")
          .insert({
            user_id: user.id,
            ...profilePayload,
          });

        if (insertError) throw insertError;
      }

      // 업종 변경 사실을 단가표에 즉시 전달
      window.dispatchEvent(
        new CustomEvent("business-type-changed", {
          detail: {
            businessType,
          },
        })
      );

      setMessage("업체정보가 저장되었습니다.");

      // 저장 후 실제 DB 값을 다시 확인
      await loadProfile();
    } catch (err) {
      console.error(
        "BUSINESS PROFILE SAVE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "업체정보 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-400 shadow-sm">
          업체정보를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* 헤더 */}
      <div className="mb-7">
        <p className="text-sm font-bold text-blue-600">
          BUSINESS SETTINGS
        </p>

        <h2 className="mt-1 text-3xl font-black">
          설정
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          업체정보와 이용 플랜, 계약서 출력을 관리하세요.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* 업체정보 입력 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div>
            <p className="text-sm font-bold text-blue-600">
              COMPANY PROFILE
            </p>

            <h3 className="mt-1 text-xl font-black">
              업체 기본정보
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              저장한 정보는 견적서에 사용할 수 있습니다.
            </p>
          </div>

          <div className="mt-7 space-y-5">
            {/* 업체 프로필 사진 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="업체 프로필"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      🏢
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">
                    업체 프로필 사진
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    고객이 보는 상위노출 광고 카드에 표시됩니다.
                    로고나 대표 시공사진을 등록해보세요.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <label
                      htmlFor="business-profile-image"
                      className={`cursor-pointer rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white ${
                        uploadingProfileImage
                          ? "pointer-events-none opacity-50"
                          : ""
                      }`}
                    >
                      {uploadingProfileImage
                        ? "업로드 중..."
                        : profileImageUrl
                          ? "사진 변경"
                          : "사진 등록"}
                    </label>

                    <input
                      id="business-profile-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProfileImageChange}
                      className="hidden"
                      disabled={uploadingProfileImage}
                    />

                    {profileImageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleRemoveProfileImage()
                        }
                        disabled={removingProfileImage}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 disabled:opacity-50"
                      >
                        {removingProfileImage
                          ? "삭제 중..."
                          : "사진 삭제"}
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] font-bold text-slate-400">
                    JPG · PNG · WEBP / 최대 5MB / 정사각형 사진 권장
                  </p>
                </div>
              </div>
            </div>

            {/* 업체명 */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                업체명 *
              </label>

              <input
                value={businessName}
                onChange={(e) =>
                  setBusinessName(e.target.value)
                }
                placeholder="예) 바꾸다필름"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* 업종 */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                업종 *
              </label>

              <select
                value={businessType}
                onChange={(e) =>
                  setBusinessType(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-blue-500"
              >
                <option value="">
                  업종을 선택해주세요
                </option>

                <option value="interior_film">
                  인테리어필름
                </option>

                <option value="air_conditioner">
                  에어컨
                </option>

                <option value="cleaning">
                  청소
                </option>

                <option value="wallpaper">
                  도배/장판
                </option>

                <option value="moving">
                  이사
                </option>

                <option value="plumbing">
                  설비/배관
                </option>

                <option value="electric">
                  전기
                </option>

                <option value="painting">
                  도장/페인트
                </option>

                <option value="other">
                  기타
                </option>
              </select>

              <p className="mt-2 text-xs text-slate-400">
                선택한 업종에 맞는 견적 항목과 단가표가 표시됩니다.
              </p>
            </div>

            {/* 대표자 / 연락처 / 이메일 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-bold">
                  대표자명
                </label>

                <input
                  value={ownerName}
                  onChange={(e) =>
                    setOwnerName(e.target.value)
                  }
                  placeholder="대표자 이름"
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-bold">
                  연락처
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="010-0000-0000"
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-bold">
                  이메일 주소
                </label>

                <input
                  type="email"
                  value={email}
                  readOnly
                  placeholder="example@email.com"
                  className="w-full min-w-0 cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* 사업자등록번호 */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                사업자등록번호
              </label>

              <input
                inputMode="numeric"
                value={businessNumber}
                onChange={(e) =>
                  setBusinessNumber(e.target.value)
                }
                placeholder="000-00-00000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* 업체 주소 */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                업체 주소
              </label>

              <input
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                placeholder="사업장 주소"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-700">
              {message}
            </div>
          )}

          <div className="mt-7">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving
                ? "저장 중..."
                : "💾 업체정보 저장"}
            </button>
          </div>
        </form>

        {/* 견적서 미리보기 */}
        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="text-xs font-bold tracking-widest text-blue-600">
                PREVIEW
              </p>

              <h3 className="mt-2 text-xl font-black text-slate-900">
                견적서 업체정보 미리보기
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                저장된 업체정보가 견적서에 표시되는 형태를 확인할 수 있습니다.
              </p>
            </div>

            <div className="mt-5 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="min-h-[520px] rounded-2xl bg-slate-950 p-4 text-white sm:p-6">
                <div className="flex items-center justify-between gap-5">
                  <p className="break-words text-2xl font-black">
                    {businessName || "업체명"}
                  </p>

                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
                    {getBusinessTypeLabel(businessType)}
                  </span>
                </div>

                <div className="mt-7 space-y-1 text-sm">
                  <Info
                    label="대표자"
                    value={ownerName}
                  />

                  <Info
                    label="연락처"
                    value={phone}
                  />

                  <Info
                    label="이메일"
                    value={email}
                  />

                  <Info
                    label="사업자번호"
                    value={businessNumber}
                  />

                  <Info
                    label="주소"
                    value={address}
                  />
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                저장한 업체정보는 견적서에 자동으로 표시할 수 있습니다.
              </p>
            </div>
          </div>
      </div>

      {/* 계약서 빠른 인쇄 */}
      <div className="mt-6">
        <QuickContractPrint />
      </div>

      {/* 이용 플랜 */}
      <div className="mt-6">
          {/* 이용 플랜 */}
          <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-blue-600">
                  PLAN
                </p>

                <h3 className="mt-2 text-xl font-black">
                  이용 플랜
                </h3>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                {unlimited
                  ? "UNLIMITED"
                  : plan.toUpperCase()}
              </span>
            </div>

            {unlimited ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm font-bold text-emerald-700">
                  AI 견적 무제한 이용 중
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-700">
                  ∞
                </p>

                <p className="mt-2 text-xs leading-5 text-emerald-600">
                  사용 횟수 제한 없이 AI 견적 기능을 이용할 수
                  있습니다.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400">
                        AI 견적 남은 횟수
                      </p>

                      <p className="mt-2 text-3xl font-black text-slate-950">
                        {remainingCount}회
                      </p>
                    </div>

                    <p className="text-sm font-black text-blue-600">
                      {remainingCount} / 3
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (remainingCount / 3) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <p className="font-black">
                    FREE 플랜
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    무료 AI 견적을 모두 사용하면 AI 생성 기능이
                    제한됩니다. 고객·상담·저장된 견적 데이터는
                    그대로 유지됩니다.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <p className="text-sm font-black text-slate-900">
                    AI 견적 이용권
                  </p>

                  <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
                    <PlanCard
                      name="스타터"
                      originalPrice="39,900원"
                      price="29,900원"
                      discount="25% 할인"
                      description="AI 견적 30회"
                      features={[
                        "AI 견적 30회",
                        "고객 관리",
                        "상담 관리",
                        "견적 관리",
                      ]}
                      onClick={() =>
                        void handlePlanPayment(
                          "starter"
                        )
                      }
                    />

                    <PlanCard
                      name="프로"
                      originalPrice="69,900원"
                      price="49,900원"
                      discount="29% 할인"
                      description="AI 견적 100회"
                      recommended
                      features={[
                        "AI 견적 100회",
                        "고객 관리",
                        "상담 관리",
                        "견적 관리",
                        "계약 관리",
                        "미수금 관리",
                        "매출 분석",
                      ]}
                      onClick={() =>
                        void handlePlanPayment("pro")
                      }
                    />

                    <PlanCard
                      name="무제한"
                      originalPrice="129,000원 / 월"
                      price="99,000원 / 월"
                      discount="23% 할인"
                      description="AI 견적 무제한"
                      features={[
                        "AI 견적 무제한",
                        "전체 업무관리 기능",
                        "향후 추가 AI 기능 포함",
                      ]}
                    />
                  </div>

                  <p className="text-xs leading-5 text-slate-400">
                    스타터와 프로는 현재 테스트 결제를 연결했습니다.
                    테스트 환경에서는 실제 돈이 출금되지 않습니다.
                    무제한 99,000원/월은 정기결제(빌링) 연동 후
                    활성화합니다.
                  </p>
                </div>
              </>
            )}
          </div>


      </div>
    </div>
  );
}

function getBusinessTypeLabel(
  businessType: string
) {
  const labels: Record<string, string> = {
    interior_film: "인테리어필름",
    air_conditioner: "에어컨",
    cleaning: "청소",
    wallpaper: "도배/장판",
    moving: "이사",
    plumbing: "설비/배관",
    electric: "전기",
    painting: "도장/페인트",
    other: "기타",
  };

  return labels[businessType] || "-";
}

function PlanCard({
  name,
  originalPrice,
  price,
  discount,
  description,
  features,
  recommended = false,
  onClick,
}: {
  name: string;
  originalPrice?: string;
  price: string;
  discount?: string;
  description: string;
  features: string[];
  recommended?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`relative min-w-[86%] shrink-0 snap-center rounded-2xl border p-5 sm:min-w-[72%] md:min-w-0 md:shrink ${
        recommended
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-slate-200 bg-white"
      }`}
    >
      {recommended && (
        <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
          추천
        </span>
      )}

      <div className="flex min-w-0 items-center gap-2 pr-14">
        <p className="shrink-0 whitespace-nowrap text-sm font-black text-slate-900">
          {name}
        </p>

        {discount && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
            {discount}
          </span>
        )}
      </div>

      {originalPrice && (
        <p className="mt-3 whitespace-nowrap text-sm font-bold text-slate-400 line-through">
          {originalPrice}
        </p>
      )}

      <p className="mt-0.5 whitespace-nowrap text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        {price}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-500">
        {description}
      </p>

      <div className="mt-4 space-y-2">
        {features.map((feature) => (
          <p
            key={feature}
            className="text-xs font-medium text-slate-600"
          >
            ✓ {feature}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-xs font-black transition ${
          onClick
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-slate-200 text-slate-500"
        }`}
      >
        {onClick
          ? "할인받고 시작하기"
          : "정기결제 준비 중"}
      </button>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 border-b border-white/10 py-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-x-8">
      <span className="shrink-0 text-slate-400">
        {label}
      </span>

      <span className="min-w-0 break-words text-right font-bold text-white [overflow-wrap:anywhere]">
        {value || "-"}
      </span>
    </div>
  );
}