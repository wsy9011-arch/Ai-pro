"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BUSINESS_TYPES = [
  { value: "air_conditioner", label: "에어컨", icon: "❄️" },
  { value: "cleaning", label: "청소", icon: "🧹" },
  { value: "wallpaper_flooring", label: "도배·장판", icon: "🏠" },
  { value: "interior_film", label: "인테리어필름", icon: "✨" },
  { value: "moving", label: "이사", icon: "🚚" },
  { value: "demolition", label: "철거", icon: "🔨" },
  { value: "auto_repair", label: "자동차 정비", icon: "🚗" },
  { value: "sign_print", label: "간판·인쇄", icon: "🪧" },
  { value: "screen_sash", label: "방충망·샷시", icon: "🪟" },
  { value: "repair", label: "출장수리", icon: "🔧" },
  { value: "other", label: "기타", icon: "➕" },
];

function getBusinessLabel(value: string) {
  return (
    BUSINESS_TYPES.find((item) => item.value === value)?.label || value
  );
}

type AccountType = "business" | "customer";
type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<AccountType>("business");

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 사장님 정보
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessType, setBusinessType] = useState("");

  // 고객 정보
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "info" | "success" | "error"
  >("info");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted || !session?.user) {
          return;
        }

        await syncUserProfile(session.user);

        if (mounted) {
          router.replace("/");
          router.refresh();
        }
      } catch (error) {
        console.error("SESSION CHECK ERROR:", error);
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  function showMessage(
    text: string,
    type: "info" | "success" | "error" = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function resetMessage() {
    setMessage("");
    setMessageType("info");
  }

  async function saveBusinessProfile(
    userId: string,
    profileData: {
      businessName: string;
      ownerName: string;
      phone: string;
      businessType: string;
    }
  ) {
    const { error } = await supabase
      .from("business_profiles")
      .upsert(
        {
          user_id: userId,
          business_name: profileData.businessName,
          owner_name: profileData.ownerName,
          phone: profileData.phone,
          business_type: profileData.businessType,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw error;
    }
  }

  async function saveCustomerProfile(
    userId: string,
    profileData: {
      name: string;
      phone: string;
      region: string;
    }
  ) {
    const { data: existing, error: findError } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: profileData.name,
          phone: profileData.phone,
          region: profileData.region,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }

      return;
    }

    const { error } = await supabase.from("customers").insert({
      user_id: userId,
      name: profileData.name,
      phone: profileData.phone,
      region: profileData.region,
      service_type: null,
      inquiry: "",
      status: "신규문의",
      estimate_amount: null,
      ai_result: null,
      memo: null,
    });

    if (error) {
      throw error;
    }
  }

  async function syncUserProfile(user: {
    id: string;
    user_metadata?: Record<string, any>;
  }) {
    const metadata = user.user_metadata || {};

    const metadataAccountType =
      metadata.account_type || "";

    if (metadataAccountType === "customer") {
      const metadataName = metadata.customer_name || "";
      const metadataPhone = metadata.customer_phone || "";
      const metadataRegion = metadata.customer_region || "";

      if (metadataName && metadataPhone) {
        await saveCustomerProfile(user.id, {
          name: metadataName,
          phone: metadataPhone,
          region: metadataRegion,
        });
      }

      return;
    }

    const metadataBusinessType =
      metadata.business_type || "";

    const metadataBusinessName =
      metadata.business_name || "";

    const metadataOwnerName =
      metadata.owner_name || "";

    const metadataPhone =
      metadata.business_phone || metadata.phone || "";

    if (
      metadataBusinessType &&
      metadataBusinessName
    ) {
      try {
        await saveBusinessProfile(user.id, {
          businessName: metadataBusinessName,
          ownerName: metadataOwnerName,
          phone: metadataPhone,
          businessType: metadataBusinessType,
        });
      } catch (error) {
        console.error("BUSINESS PROFILE SYNC ERROR:", error);
      }
    }
  }

  async function handleSignup() {
    if (accountType === "business") {
      if (!businessName.trim()) {
        showMessage("업체명을 입력해주세요.", "error");
        return;
      }

      if (!ownerName.trim()) {
        showMessage("대표자명을 입력해주세요.", "error");
        return;
      }

      if (!businessPhone.trim()) {
        showMessage("연락처를 입력해주세요.", "error");
        return;
      }

      if (!businessType) {
        showMessage("업종을 선택해주세요.", "error");
        return;
      }

      const selectedBusinessType =
        getBusinessLabel(businessType);

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              account_type: "business",
              business_name: businessName.trim(),
              owner_name: ownerName.trim(),
              business_phone: businessPhone.trim(),
              business_type: businessType,
              business_type_label: selectedBusinessType,
            },
          },
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "회원가입은 완료되었지만 사용자 정보를 확인할 수 없습니다."
        );
      }

      if (data.session) {
        await saveBusinessProfile(data.user.id, {
          businessName,
          ownerName,
          phone: businessPhone,
          businessType,
        });

        showMessage(
          "사장님 회원가입이 완료되었습니다. 바로 시작합니다.",
          "success"
        );

        setTimeout(() => {
          window.location.replace("/");
        }, 800);

        return;
      }

      showMessage(
        "회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.",
        "success"
      );

      setMode("login");
      setPassword("");

      return;
    }

    // 고객 회원가입
    if (!customerName.trim()) {
      showMessage("고객 이름을 입력해주세요.", "error");
      return;
    }

    if (!customerPhone.trim()) {
      showMessage("전화번호를 입력해주세요.", "error");
      return;
    }

    if (!customerRegion.trim()) {
      showMessage("지역을 입력해주세요.", "error");
      return;
    }

    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            account_type: "customer",
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            customer_region: customerRegion.trim(),
          },
        },
      });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(
        "회원가입은 완료되었지만 사용자 정보를 확인할 수 없습니다."
      );
    }

    if (data.session) {
      await saveCustomerProfile(data.user.id, {
        name: customerName,
        phone: customerPhone,
        region: customerRegion,
      });

      showMessage(
        "고객 회원가입이 완료되었습니다. 바로 시작합니다.",
        "success"
      );

      setTimeout(() => {
        window.location.replace("/");
      }, 800);

      return;
    }

    showMessage(
      "회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.",
      "success"
    );

    setMode("login");
    setPassword("");
  }

  async function handleLogin() {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error("로그인 세션을 만들지 못했습니다.");
    }

    await syncUserProfile(data.user);

    window.location.replace("/");
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    resetMessage();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showMessage(
        "이메일과 비밀번호를 입력해주세요.",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      showMessage(
        "비밀번호는 6자 이상 입력해주세요.",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await handleSignup();
      } else {
        await handleLogin();
      }
    } catch (error) {
      console.error("AUTH ERROR:", error);

      if (error instanceof Error) {
        if (
          error.message.includes(
            "Invalid login credentials"
          )
        ) {
          showMessage(
            "이메일 또는 비밀번호가 올바르지 않습니다.",
            "error"
          );
        } else if (
          error.message.includes("Email not confirmed")
        ) {
          showMessage(
            "이메일 인증을 먼저 완료해주세요.",
            "error"
          );
        } else if (
          error.message.includes("User already registered")
        ) {
          showMessage(
            "이미 가입된 이메일입니다. 로그인해주세요.",
            "error"
          );
        } else {
          showMessage(error.message, "error");
        }
      } else {
        showMessage(
          "로그인 처리 중 오류가 발생했습니다.",
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const messageClass =
    messageType === "error"
      ? "bg-red-50 text-red-600"
      : messageType === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-sky-50 text-sky-700";

  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-full">

          {/* 브랜드 */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-3xl shadow-lg shadow-sky-200">
              🏠
            </div>

            <div className="text-3xl font-black tracking-tight text-slate-900">
              해결<span className="text-sky-500">소</span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              필요한 일, 해결소에서
            </p>
          </div>

          {/* 계정 종류 */}
          <div className="mx-auto mb-6 max-w-md rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccountType("business");
                  setMode("login");
                  resetMessage();
                }}
                className={`rounded-xl py-3 text-sm font-black transition ${
                  accountType === "business"
                    ? "bg-sky-500 !text-white shadow-md"
                    : "!text-slate-700 hover:bg-slate-50"
                }`}
              >
                🏢 사장님
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType("customer");
                  setMode("login");
                  resetMessage();
                }}
                className={`rounded-xl py-3 text-sm font-black transition ${
                  accountType === "customer"
                    ? "bg-emerald-500 !text-white shadow-md"
                    : "!text-slate-700 hover:bg-slate-50"
                }`}
              >
                👤 고객
              </button>
            </div>
          </div>

          <div
            className={
              mode === "signup" &&
              accountType === "business"
                ? "mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr]"
                : "mx-auto max-w-md"
            }
          >
            {/* 로그인 / 기본 계정 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-sky-100 sm:p-9">

              <div className="mb-7 flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    resetMessage();
                  }}
                  className={`flex-1 rounded-lg py-3 text-sm font-black transition ${
                    mode === "login"
                      ? "bg-white !text-sky-600 shadow-sm"
                      : "!text-slate-400"
                  }`}
                >
                  로그인
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    resetMessage();
                  }}
                  className={`flex-1 rounded-lg py-3 text-sm font-black transition ${
                    mode === "signup"
                      ? "bg-white !text-sky-600 shadow-sm"
                      : "!text-slate-400"
                  }`}
                >
                  회원가입
                </button>
              </div>

              <div className="mb-7">
                <p
                  className={`text-sm font-black ${
                    accountType === "customer"
                      ? "text-emerald-500"
                      : "text-sky-500"
                  }`}
                >
                  {accountType === "customer"
                    ? "CUSTOMER"
                    : "BUSINESS"}
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-900">
                  {mode === "login"
                    ? accountType === "customer"
                      ? "고객님, 다시 오셨어요 👋"
                      : "다시 만나서 반가워요 👋"
                    : accountType === "customer"
                      ? "고객 계정을 만들어주세요"
                      : "사장님 계정을 만들어주세요"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {mode === "login"
                    ? accountType === "customer"
                      ? "로그인하면 내 문의·견적·예약 정보를 확인할 수 있습니다."
                      : "해결소에 로그인하면 고객·견적·계약 정보를 관리할 수 있습니다."
                    : accountType === "customer"
                      ? "간편하게 가입하고 내 문의와 예약 정보를 한곳에서 관리하세요."
                      : "업체정보와 업종을 선택하면 해결소를 바로 시작할 수 있습니다."}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* 이메일 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    이메일 *
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="example@email.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    비밀번호 *
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="6자 이상 입력"
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {mode === "login" && (
                  <div className="-mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const query = email.trim()
                          ? `?email=${encodeURIComponent(email.trim())}`
                          : "";
                        router.push(`/forgot-password${query}`);
                      }}
                      className="text-xs font-black text-sky-600 transition hover:text-sky-700 hover:underline"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                )}

                {/* 고객 회원가입 */}
                {mode === "signup" &&
                  accountType === "customer" && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          이름 *
                        </label>

                        <input
                          value={customerName}
                          onChange={(e) =>
                            setCustomerName(
                              e.target.value
                            )
                          }
                          placeholder="홍길동"
                          autoComplete="name"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          전화번호 *
                        </label>

                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) =>
                            setCustomerPhone(
                              e.target.value
                            )
                          }
                          placeholder="010-0000-0000"
                          autoComplete="tel"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          지역 *
                        </label>

                        <input
                          value={customerRegion}
                          onChange={(e) =>
                            setCustomerRegion(
                              e.target.value
                            )
                          }
                          placeholder="예) 시흥시"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                    </>
                  )}

                {/* 사장님 회원가입 */}
                {mode === "signup" &&
                  accountType === "business" && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          업체명 *
                        </label>

                        <input
                          value={businessName}
                          onChange={(e) =>
                            setBusinessName(
                              e.target.value
                            )
                          }
                          placeholder="예) 바꾸다필름"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-800">
                            대표자명 *
                          </label>

                          <input
                            value={ownerName}
                            onChange={(e) =>
                              setOwnerName(
                                e.target.value
                              )
                            }
                            placeholder="대표자명"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-800">
                            연락처 *
                          </label>

                          <input
                            type="tel"
                            value={businessPhone}
                            onChange={(e) =>
                              setBusinessPhone(
                                e.target.value
                              )
                            }
                            placeholder="010-0000-0000"
                            autoComplete="tel"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>
                      </div>
                    </>
                  )}

                {message && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm font-bold leading-6 ${messageClass}`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-xl px-5 py-4 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    accountType === "customer"
                      ? "bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600"
                      : "bg-sky-500 shadow-sky-200 hover:bg-sky-600"
                  }`}
                >
                  {loading
                    ? "처리 중..."
                    : mode === "login"
                      ? accountType === "customer"
                        ? "고객 로그인"
                        : "해결소 로그인"
                      : accountType === "customer"
                        ? "고객 회원가입"
                        : "다음 단계 →"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                {accountType === "customer"
                  ? "고객 계정별로 내 문의·견적·예약 정보를 관리합니다."
                  : "사장님 계정별로 고객·상담·견적 데이터를 관리합니다."}
              </p>
            </div>

            {/* 사장님 업종 선택 */}
            {mode === "signup" &&
              accountType === "business" && (
                <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-sky-100 sm:p-9">
                  <div className="mb-7">
                    <p className="text-sm font-black text-sky-500">
                      BUSINESS TYPE
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      어떤 일을 하고 계신가요?
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      선택한 업종을 기준으로 견적과 서비스를 구성합니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {BUSINESS_TYPES.map((type) => {
                      const selected =
                        businessType === type.value;

                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setBusinessType(
                              type.value
                            );
                            resetMessage();
                          }}
                          className={`relative rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                              : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50"
                          }`}
                        >
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white">
                              ✓
                            </span>
                          )}

                          <div className="text-2xl">
                            {type.icon}
                          </div>

                          <div
                            className={`mt-3 text-sm font-black ${
                              selected
                                ? "text-sky-600"
                                : "text-slate-900"
                            }`}
                          >
                            {type.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl bg-sky-50 p-5">
                    {businessType ? (
                      <>
                        <p className="text-xs font-bold text-sky-500">
                          선택한 업종
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-900">
                          {
                            BUSINESS_TYPES.find(
                              (item) =>
                                item.value ===
                                businessType
                            )?.icon
                          }{" "}
                          {
                            BUSINESS_TYPES.find(
                              (item) =>
                                item.value ===
                                businessType
                            )?.label
                          }
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-black text-slate-800">
                          업종을 선택해주세요.
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          선택한 업종은 사장님 계정에 저장됩니다.
                        </p>
                      </>
                    )}

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      단가표는 자동으로 만들지 않습니다.
                      <br />
                      가입 후 사장님이 직접 필요한 단가를 등록합니다.
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-sm font-black text-slate-900">
                      해결소는 업종별로 다르게 작동합니다.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      예를 들어 에어컨 업체는 에어컨 단가를,
                      필름 업체는 필름 단가를 사용합니다.
                      <br />
                      다른 업종의 단가가 섞이지 않도록 관리합니다.
                    </p>
                  </div>
                </div>
              )}

            {/* 고객 가입 안내 */}
            {mode === "signup" &&
              accountType === "customer" && (
                <div className="mx-auto mt-6 max-w-md rounded-3xl border border-emerald-100 bg-white p-7 shadow-lg shadow-emerald-100">
                  <p className="text-sm font-black text-emerald-500">
                    CUSTOMER ACCOUNT
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    가입하면 이런 정보를 한곳에서 볼 수 있어요.
                  </h2>

                  <div className="mt-5 space-y-3">
                    {[
                      "📋 내가 문의한 서비스",
                      "💰 받은 견적",
                      "📅 예약 및 상담 일정",
                      "🏢 매칭된 업체 정보",
                      "🔔 진행 상태 확인",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <p className="mt-5 text-xs leading-5 text-slate-400">
                    업체를 이용할 때마다 정보를 다시 입력하지 않고
                    내 계정에서 관리할 수 있도록 확장됩니다.
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}