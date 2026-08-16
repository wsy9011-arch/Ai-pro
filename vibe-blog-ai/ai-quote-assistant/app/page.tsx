"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import CustomerManager from "@/components/CustomerManager";
import OnlineRequestManager from "@/components/OnlineRequestManager";
import EstimateManager from "@/components/EstimateManager";
import ConsultationManager from "@/components/ConsultationManager";
import ContractManager from "@/components/ContractManager";
import SalesManager from "@/components/SalesManager";
import SettingsManager from "@/components/SettingsManager";
import PriceItemManager from "@/components/PriceItemManager";
import UnpaidManager from "@/components/UnpaidManager";
import InstallationManager from "@/components/InstallationManager";
import ASManager from "@/components/ASManager";
import MatchRequestManager from "@/components/MatchRequestManager";
import MetricsDashboard from "@/components/MetricsDashboard";
import PremiumAdManager from "@/components/PremiumAdManager";
import BusinessReviewManager from "@/components/BusinessReviewManager";

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  interior_film: "인테리어필름",
  wallpaper: "도배·장판",
  cleaning: "청소",
  air_conditioner: "에어컨",
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

type MenuItem = {
  icon: string;
  name: string;
  description: string;
};

function getMenus(businessType: string): MenuItem[] {
  const label =
    BUSINESS_TYPE_LABELS[businessType] || "내 업종";

  return [
    {
      icon: "🏠",
      name: "홈",
      description: `${label} 업무를 한곳에서 관리하세요.`,
    },
    {
      icon: "👥",
      name: "고객 관리",
      description: `${label} 고객 문의와 고객 정보를 관리하세요.`,
    },
    {
      icon: "🧾",
      name: "견적 관리",
      description: `${label} 등록 단가를 기준으로 AI 견적을 만들어보세요.`,
    },
    {
  icon: "🤝",
  name: "매칭 요청",
  description: `${label} 매칭을 원하는 신규 고객 요청을 확인하고 수락하세요.`,
},
    {
      icon: "💬",
      name: "AI 상담",
      description: `${label} 고객에게 보낼 상담 답변을 빠르게 만들어보세요.`,
    },
    {
      icon: "📋",
      name: "계약 관리",
      description: `${label} 견적부터 계약 완료까지 관리하세요.`,
    },
    {
      icon: "💵",
      name: "미수금 관리",
      description: `${label} 계약금액과 입금액, 남은 미수금을 관리하세요.`,
    },
    {
      icon: "🛠️",
      name: "시공 관리",
      description: `${label} 계약 이후 시공 진행 상태를 관리하세요.`,
    },
    {
      icon: "🧰",
      name: "AS 관리",
      description: `${label} AS 접수와 처리 상태를 관리하세요.`,
    },
    {
      icon: "💰",
      name: "매출 관리",
      description: `${label} 견적과 계약 매출을 확인하세요.`,
    },
    {
      icon: "💳",
      name: "단가 관리",
      description: `내 ${label} 서비스 단가만 등록하고 관리하세요.`,
    },
    {
      icon: "📈",
      name: "통계 대시보드",
      description: "실제 사용자·견적·계약·후기 성과를 확인하세요.",
    },
    {
      icon: "⭐",
      name: "후기 관리",
      description: "고객이 남긴 별점과 후기를 확인하고 업체 답글을 작성하세요.",
    },
    {
      icon: "📢",
      name: "상위노출 광고",
      description: `${label} 업체를 고객 홈 상단에 최대 30일 노출하세요.`,
    },
    {
      icon: "⚙️",
      name: "설정",
      description: "업체정보와 이용 플랜, 계약서 출력을 관리하세요.",
    },
  ];
}

export default function Home() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [accountType, setAccountType] = useState<"business" | "customer">("business");

  const [activeMenu, setActiveMenu] = useState("홈");
  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerRegion, setCustomerRegion] = useState("");
  const [customerService, setCustomerService] = useState("");
  const [customerInquiry, setCustomerInquiry] = useState("");
  const [customerUserId, setCustomerUserId] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSessionAndProfile() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      /*
       * 로그인 시 저장된 account_type을 최우선으로 사용합니다.
       * 고객 계정은 business_profiles가 없어도 고객 화면으로 들어가야 합니다.
       */
      const metadataType =
        session.user.user_metadata?.account_type === "customer"
          ? "customer"
          : session.user.user_metadata?.account_type === "business"
            ? "business"
            : null;

      const { data: businessProfile } = await supabase
        .from("business_profiles")
        .select("business_name,owner_name,business_type")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const { data: customerProfile } = await supabase
        .from("customers")
        .select("name,phone,region,service_type,inquiry")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      /*
       * 판단 우선순위:
       * 1. auth user_metadata.account_type
       * 2. customers에 본인 user_id가 있으면 고객
       * 3. business_profiles가 있으면 사장님
       */
      const resolvedType: "business" | "customer" =
        businessProfile
          ? "business"
          : metadataType || (customerProfile ? "customer" : "business");

      setAccountType(resolvedType);
      setCustomerUserId(session.user.id);

      if (resolvedType === "customer") {
        setCustomerName(
          customerProfile?.name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] ||
            "고객님",
        );
        setCustomerPhone(customerProfile?.phone || "");
        setCustomerEmail(session.user.email || "");
        setCustomerRegion(customerProfile?.region || "");
        setCustomerService(customerProfile?.service_type || "");
        setCustomerInquiry(customerProfile?.inquiry || "");
      } else {
        setBusinessName(businessProfile?.business_name || "");
        setOwnerName(
          businessProfile?.owner_name ||
            session.user.user_metadata?.name ||
            "",
        );
        setBusinessType(businessProfile?.business_type || "");
      }

      setAuthChecking(false);
    }

    void loadSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (accountType !== "business") return;

    function handleOpenEstimate() {
      setActiveMenu("견적 관리");
      setMoreOpen(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    window.addEventListener("open-estimate-manager", handleOpenEstimate);

    return () => {
      window.removeEventListener("open-estimate-manager", handleOpenEstimate);
    };
  }, [accountType]);

  async function handleBusinessLogout() {
    const confirmed = window.confirm("해결소에서 로그아웃하시겠습니까?");
    if (!confirmed) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했습니다."
      );
      setLoggingOut(false);
    }
  }

  function go(name: string) {
    setActiveMenu(name);
    setMoreOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-500">
          로그인 상태를 확인하고 있습니다...
        </div>
      </main>
    );
  }

  if (accountType === "customer") {
    return (
      <CustomerHome
        name={customerName}
        phone={customerPhone}
        email={customerEmail}
        region={customerRegion}
        serviceType={customerService}
        inquiry={customerInquiry}
        userId={customerUserId}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        }}
      />
    );
  }

  const businessLabel =
    BUSINESS_TYPE_LABELS[businessType] || "업종 미설정";

  const displayName = ownerName || "사장님";
  const menus = getMenus(businessType);

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <div className="flex min-h-screen min-w-0">
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 p-5 text-white md:flex">
          <button
            type="button"
            onClick={() => go("홈")}
            className="mb-8 text-left"
          >
            <div className="text-2xl font-black tracking-tight">
              해결<span className="text-blue-400">소</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              사장님을 위한 AI 업무비서
            </p>
          </button>

          <nav className="space-y-1.5">
            {menus.map((menu) => (
              <button
                key={menu.name}
                type="button"
                onClick={() => go(menu.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeMenu === menu.name
                    ? "bg-blue-600 font-bold text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="w-6 text-center text-base">{menu.icon}</span>
                <span>{menu.name}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-900 p-4">
            <p className="text-xs text-slate-500">현재 업종</p>
            <p className="mt-1 font-bold text-white">{businessLabel}</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {businessName || "업체정보를 설정해주세요."}
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-x-hidden">
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 lg:px-10">
            <div>
              <p className="text-xs font-bold tracking-wide text-blue-600">
                해결소 BUSINESS
              </p>
              <h1 className="mt-1 text-xl font-black">{activeMenu}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{displayName}</p>
                <p className="text-xs text-slate-400">{businessLabel}</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                {displayName.slice(0, 1)}
              </div>

              <button
                type="button"
                onClick={() => void handleBusinessLogout()}
                disabled={loggingOut}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50 sm:px-4"
              >
                {loggingOut ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          </header>

          <div className="p-5 pb-28 sm:p-7 lg:p-10 lg:pb-10">
            {activeMenu === "홈" && (
              <HomeMenu
                ownerName={displayName}
                businessName={businessName}
                businessLabel={businessLabel}
                menus={menus}
                onNavigate={go}
              />
            )}

            {activeMenu === "고객 관리" && (
              <>
                <OnlineRequestManager />
                <CustomerManager />
              </>
            )}

            {activeMenu === "견적 관리" && <EstimateManager />}
            {activeMenu === "매칭 요청" && <MatchRequestManager />}
            {activeMenu === "AI 상담" && <ConsultationManager />}
            {activeMenu === "계약 관리" && (
              <ContractManager onNavigate={go} />
            )}
            {activeMenu === "미수금 관리" && <UnpaidManager />}
            {activeMenu === "시공 관리" && <InstallationManager />}
            {activeMenu === "AS 관리" && <ASManager />}
            {activeMenu === "매출 관리" && <SalesManager onNavigate={go} />}
            {activeMenu === "단가 관리" && <PriceItemManager />}
            {activeMenu === "통계 대시보드" && <MetricsDashboard />}
            {activeMenu === "후기 관리" && <BusinessReviewManager />}
            {activeMenu === "상위노출 광고" && <PremiumAdManager />}
            {activeMenu === "설정" && <SettingsManager />}
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-stretch justify-around">
          {menus.slice(0, 4).map((menu) => (
            <button
              key={menu.name}
              type="button"
              onClick={() => go(menu.name)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-3 text-[11px] font-bold ${
                activeMenu === menu.name ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{menu.icon}</span>
              <span className="truncate">{menu.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-3 text-[11px] font-bold ${
              moreOpen ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg leading-none">☰</span>
            <span>더보기</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-x-3 bottom-24 z-50 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {menus.slice(4).map((menu) => (
              <button
                key={menu.name}
                type="button"
                onClick={() => go(menu.name)}
                className={`rounded-2xl p-4 text-left ${
                  activeMenu === menu.name
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-50"
                }`}
              >
                <div className="text-xl">{menu.icon}</div>
                <p className="mt-2 text-sm font-black">{menu.name}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">
                  {menu.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function CustomerHome({
  name,
  phone,
  email,
  region,
  serviceType,
  inquiry,
  userId,
  onLogout,
}: {
  name: string;
  phone: string;
  email: string;
  region: string;
  serviceType: string;
  inquiry: string;
  userId: string;
  onLogout: () => void;
}) {
  type ServiceRequest = {
    id: string;
    business_type: string;
    service_type: string | null;
    name: string;
    phone: string;
    region: string;
    inquiry: string;
    image_paths: string[] | null;
    image_urls?: string[];
    status: string;
    created_at: string;
  };

  type SelectedRequestImage = {
    id: string;
    file: File;
    previewUrl: string;
  };

  type CustomerEstimate = {
    id: string;
    user_id: string;
    customer_user_id: string | null;
    estimate_number: string | null;
    work_description: string | null;
    material_cost: number | null;
    labor_cost: number | null;
    other_cost: number | null;
    total_amount: number | null;
    status: string | null;
    created_at: string;
    sent_at: string | null;
    business_name: string | null;
    business_phone: string | null;
    business_profile_image_url: string | null;
    business_address: string | null;
  };

  type ReviewJob = {
    estimate_id: string;
    business_user_id: string;
    business_name: string;
    profile_image_url: string | null;
    work_description: string;
    total_amount: number | string | null;
    estimate_status: string;
    customer_status: string;
    completed_at: string;
    review_id: string | null;
    rating: number | null;
    comment: string | null;
    review_created_at: string | null;
    review_updated_at: string | null;
    business_reply: string | null;
    business_replied_at: string | null;
    business_reply_updated_at: string | null;
  };

  type MatchedBusiness = {
    match_request_id: string;
    business_user_id: string;
    business_name: string;
    business_type: string;
    business_phone: string | null;
    business_address: string | null;
    profile_image_url: string | null;
    request_source: string;
    is_direct: boolean;
    matched_at: string;
    service_type: string;
    inquiry: string;
    customer_status: string;
    latest_estimate_id: string | null;
    latest_estimate_number: string | null;
    latest_estimate_status: string | null;
    latest_estimate_total: number | string | null;
    average_rating: number | string | null;
    review_count: number | string | null;
  };

  type CustomerMenu =
    | "홈"
    | "내 문의"
    | "받은 견적"
    | "예약 정보"
    | "매칭 업체"
    | "후기"
    | "내 정보";

  type CustomerAdBusiness = {
    ad_id: string;
    business_user_id: string;
    business_name: string;
    business_type: string;
    address: string;
    profile_image_url: string | null;
    region: string;
    plan_code:
      | "light"
      | "best"
      | "premium_1"
      | "premium_3"
      | "premium_5"
      | "nationwide";
    ad_tier: "light" | "best" | "premium" | "nationwide";
    slot_position: number | string | null;
    average_rating: number | string | null;
    review_count: number | string | null;
    starts_at: string;
    ends_at: string;
  };

  type PublicBusinessReview = {
    review_id: string;
    rating: number;
    comment: string | null;
    customer_display_name: string;
    review_created_at: string;
    business_reply: string | null;
    business_replied_at: string | null;
    business_reply_updated_at: string | null;
  };

  const [requestOpen, setRequestOpen] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [receivedEstimates, setReceivedEstimates] = useState<CustomerEstimate[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [estimateReplyingId, setEstimateReplyingId] = useState<string | null>(null);
  const [expandedEstimateId, setExpandedEstimateId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu>("홈");
  const [homeBusinessType, setHomeBusinessType] = useState("interior_film");
  const [customerAdBusinesses, setCustomerAdBusinesses] = useState<CustomerAdBusiness[]>([]);
  const [loadingCustomerAds, setLoadingCustomerAds] = useState(true);
  const [selectedAdBusiness, setSelectedAdBusiness] =
    useState<CustomerAdBusiness | null>(null);
  const [reviewJobs, setReviewJobs] = useState<ReviewJob[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [matchedBusinesses, setMatchedBusinesses] = useState<MatchedBusiness[]>([]);
  const [loadingMatchedBusinesses, setLoadingMatchedBusinesses] = useState(true);
  const [reviewModalBusiness, setReviewModalBusiness] =
    useState<CustomerAdBusiness | null>(null);
  const [publicBusinessReviews, setPublicBusinessReviews] =
    useState<PublicBusinessReview[]>([]);
  const [loadingPublicBusinessReviews, setLoadingPublicBusinessReviews] =
    useState(false);
  const [publicBusinessReviewError, setPublicBusinessReviewError] = useState("");

  const [formName, setFormName] = useState(name);
  const [formPhone, setFormPhone] = useState(phone);
  const [formRegion, setFormRegion] = useState(region);
  const [formBusinessType, setFormBusinessType] = useState("interior_film");
  const [formServiceType, setFormServiceType] = useState(serviceType);
  const [formInquiry, setFormInquiry] = useState(inquiry);
  const [formImages, setFormImages] = useState<SelectedRequestImage[]>([]);

  const businessOptions = [
    ["interior_film", "인테리어필름"],
    ["wallpaper", "도배·장판"],
    ["cleaning", "청소"],
    ["air_conditioner", "에어컨"],
    ["moving", "이사"],
    ["demolition", "철거"],
    ["auto_repair", "자동차 정비"],
    ["sign_printing", "간판·인쇄"],
    ["window_screen", "방충망·샷시"],
    ["field_repair", "출장수리"],
    ["plumbing", "설비·배관"],
    ["electrical", "전기"],
    ["painting", "도장·페인트"],
    ["other", "기타"],
  ];

  useEffect(() => {
    setFormName(name);
    setFormPhone(phone);
    setFormRegion(region);
    setFormServiceType(serviceType);
    setFormInquiry(inquiry);
  }, [name, phone, region, serviceType, inquiry]);

  function clearFormImages() {
    setFormImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }

  function openRequestModal() {
    setSelectedAdBusiness(null);
    setFormName(name);
    setFormPhone(phone);
    setFormRegion(region);
    setFormBusinessType(homeBusinessType);
    setFormServiceType(serviceType);
    setFormInquiry("");
    clearFormImages();
    setRequestOpen(true);
  }

  function closeRequestModal() {
    if (saving) return;
    clearFormImages();
    setRequestOpen(false);
    setSelectedAdBusiness(null);
  }

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const pickedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (pickedFiles.length === 0) return;

    const remainingSlots = Math.max(0, 5 - formImages.length);

    if (remainingSlots === 0) {
      alert("사진은 최대 5장까지 첨부할 수 있습니다.");
      return;
    }

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const accepted: SelectedRequestImage[] = [];
    let rejectedCount = 0;

    for (const file of pickedFiles.slice(0, remainingSlots)) {
      if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
        rejectedCount += 1;
        continue;
      }

      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (pickedFiles.length > remainingSlots) {
      alert(`사진은 최대 5장까지 첨부할 수 있어 ${remainingSlots}장만 선택됩니다.`);
    } else if (rejectedCount > 0) {
      alert("JPG, PNG, WEBP 형식의 10MB 이하 사진만 첨부할 수 있습니다.");
    }

    if (accepted.length > 0) {
      setFormImages((current) => [...current, ...accepted].slice(0, 5));
    }
  }

  function removeFormImage(imageId: string) {
    setFormImages((current) => {
      const target = current.find((image) => image.id === imageId);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((image) => image.id !== imageId);
    });
  }

  async function uploadRequestImages() {
    if (formImages.length === 0) {
      return [] as string[];
    }

    const uploadedPaths: string[] = [];
    const folderId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    for (let index = 0; index < formImages.length; index += 1) {
      const image = formImages[index];
      const fileNameParts = image.file.name.split(".");
      const originalExtension =
        fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : "";

      const extension =
        originalExtension === "png"
          ? "png"
          : originalExtension === "webp"
            ? "webp"
            : "jpg";

      const path =
        `${userId}/${folderId}/` +
        `${index + 1}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("service-request-images")
        .upload(path, image.file, {
          cacheControl: "3600",
          contentType: image.file.type,
          upsert: false,
        });

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage
            .from("service-request-images")
            .remove(uploadedPaths);
        }

        throw new Error(`사진 업로드 실패: ${uploadError.message}`);
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function attachSignedImageUrls(
    requestRows: ServiceRequest[]
  ): Promise<ServiceRequest[]> {
    const allPaths = Array.from(
      new Set(
        requestRows.flatMap((request) =>
          Array.isArray(request.image_paths) ? request.image_paths : []
        )
      )
    );

    if (allPaths.length === 0) {
      return requestRows.map((request) => ({
        ...request,
        image_urls: [],
      }));
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("service-request-images")
      .createSignedUrls(allPaths, 60 * 60);

    if (signedError) {
      console.error("REQUEST IMAGE SIGN ERROR:", signedError);

      return requestRows.map((request) => ({
        ...request,
        image_urls: [],
      }));
    }

    const urlMap = new Map<string, string>();

    (signedData ?? []).forEach((item) => {
      if (item.path && item.signedUrl) {
        urlMap.set(item.path, item.signedUrl);
      }
    });

    return requestRows.map((request) => ({
      ...request,
      image_urls: (request.image_paths ?? [])
        .map((path) => urlMap.get(path))
        .filter((url): url is string => Boolean(url)),
    }));
  }

  useEffect(() => {
    if (!userId) return;

    async function loadCustomerData() {
      setLoadingRequests(true);
      setLoadingEstimates(true);
      setLoadingReviews(true);
      setLoadingMatchedBusinesses(true);

      const { data: requestData, error: requestError } = await supabase
        .from("service_requests")
        .select(
          "id,business_type,service_type,name,phone,region,inquiry,image_paths,status,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("CUSTOMER REQUEST LOAD ERROR:", requestError);
        setRequests([]);
      } else {
        const requestRows = (requestData ?? []) as ServiceRequest[];
        const requestRowsWithImages = await attachSignedImageUrls(requestRows);
        setRequests(requestRowsWithImages);
      }

      const { data: estimateData, error: estimateError } = await supabase.rpc(
        "get_my_received_estimates_v2"
      );

      if (estimateError) {
        console.error("CUSTOMER ESTIMATE LOAD ERROR:", estimateError);
        setReceivedEstimates([]);
      } else {
        setReceivedEstimates((estimateData ?? []) as CustomerEstimate[]);
      }

      const { data: reviewData, error: reviewError } = await supabase.rpc(
        "get_my_reviewable_jobs"
      );

      if (reviewError) {
        console.error("CUSTOMER REVIEW LOAD ERROR:", reviewError);
        setReviewJobs([]);
        setReviewRatings({});
        setReviewComments({});
      } else {
        const rows = (reviewData ?? []) as ReviewJob[];
        setReviewJobs(rows);
        setReviewRatings(
          Object.fromEntries(
            rows.map((job) => [job.estimate_id, Number(job.rating || 5)])
          )
        );
        setReviewComments(
          Object.fromEntries(
            rows.map((job) => [job.estimate_id, job.comment || ""])
          )
        );
      }

      const { data: matchedData, error: matchedError } = await supabase.rpc(
        "get_my_matched_businesses"
      );

      if (matchedError) {
        console.error("MATCHED BUSINESS LOAD ERROR:", matchedError);
        setMatchedBusinesses([]);
      } else {
        setMatchedBusinesses((matchedData ?? []) as MatchedBusiness[]);
      }

      setLoadingRequests(false);
      setLoadingEstimates(false);
      setLoadingReviews(false);
      setLoadingMatchedBusinesses(false);
    }

    void loadCustomerData();
  }, [userId]);


  useEffect(() => {
    if (!userId || customerMenu !== "후기") return;

    let mounted = true;

    async function refreshReviewJobs() {
      setLoadingReviews(true);

      const { data, error } = await supabase.rpc(
        "get_my_reviewable_jobs"
      );

      if (!mounted) return;

      if (error) {
        console.error("CUSTOMER REVIEW REFRESH ERROR:", error);
        setReviewJobs([]);
        setReviewRatings({});
        setReviewComments({});
      } else {
        const rows = (data ?? []) as ReviewJob[];

        setReviewJobs(rows);
        setReviewRatings(
          Object.fromEntries(
            rows.map((job) => [
              job.estimate_id,
              Number(job.rating || 5),
            ])
          )
        );
        setReviewComments(
          Object.fromEntries(
            rows.map((job) => [
              job.estimate_id,
              job.comment || "",
            ])
          )
        );
      }

      setLoadingReviews(false);
    }

    void refreshReviewJobs();

    return () => {
      mounted = false;
    };
  }, [customerMenu, userId]);


  useEffect(() => {
    const latestBusinessType = requests[0]?.business_type;

    if (latestBusinessType) {
      setHomeBusinessType(latestBusinessType);
    }
  }, [requests]);

  useEffect(() => {
    let mounted = true;

    async function loadCustomerAds() {
      if (!region.trim() || !homeBusinessType) {
        if (mounted) {
          setCustomerAdBusinesses([]);
          setLoadingCustomerAds(false);
        }
        return;
      }

      setLoadingCustomerAds(true);

      const { data, error } = await supabase.rpc(
        "get_customer_ad_businesses_v2",
        {
          p_region: region,
          p_business_type: homeBusinessType,
        }
      );

      if (!mounted) return;

      if (error) {
        console.error("CUSTOMER AD BUSINESS LOAD ERROR:", error);
        setCustomerAdBusinesses([]);
      } else {
        setCustomerAdBusinesses((data ?? []) as CustomerAdBusiness[]);
      }

      setLoadingCustomerAds(false);
    }

    void loadCustomerAds();

    return () => {
      mounted = false;
    };
  }, [region, homeBusinessType]);

  function getBusinessTypeLabel(value: string) {
    return (
      businessOptions.find(([optionValue]) => optionValue === value)?.[1] ||
      value ||
      "업종"
    );
  }

  const nationwideAds = customerAdBusinesses.filter(
    (business) => business.ad_tier === "nationwide"
  );
  const premiumAds = customerAdBusinesses.filter(
    (business) => business.ad_tier === "premium"
  );
  const bestAds = customerAdBusinesses.filter(
    (business) => business.ad_tier === "best"
  );
  const lightAds = customerAdBusinesses.filter(
    (business) => business.ad_tier === "light"
  );

  function getAdTierLabel(tier: CustomerAdBusiness["ad_tier"]) {
    if (tier === "nationwide") return "전국 프리미엄";
    if (tier === "premium") return "지역 프리미엄";
    if (tier === "best") return "베스트";
    return "라이트";
  }

  function getAdTierCapacity(tier: CustomerAdBusiness["ad_tier"]) {
    if (tier === "nationwide") return 5;
    if (tier === "premium") return 10;
    if (tier === "best") return 20;
    return 30;
  }

  function openRequestFromHome() {
    setFormBusinessType(homeBusinessType);
    openRequestModal();
  }

  async function openBusinessReviews(
    business: CustomerAdBusiness
  ) {
    setReviewModalBusiness(business);
    setPublicBusinessReviews([]);
    setPublicBusinessReviewError("");
    setLoadingPublicBusinessReviews(true);

    try {
      const { data, error } = await supabase.rpc(
        "get_public_business_reviews",
        {
          p_business_user_id: business.business_user_id,
        }
      );

      if (error) throw error;

      setPublicBusinessReviews(
        (data ?? []) as PublicBusinessReview[]
      );
    } catch (error) {
      console.error("PUBLIC BUSINESS REVIEW LOAD ERROR:", error);
      setPublicBusinessReviewError(
        error instanceof Error
          ? error.message
          : "업체 후기를 불러오지 못했습니다."
      );
    } finally {
      setLoadingPublicBusinessReviews(false);
    }
  }

  function closeBusinessReviewModal() {
    setReviewModalBusiness(null);
    setPublicBusinessReviews([]);
    setPublicBusinessReviewError("");
  }

  function openRequestFromAd(business: CustomerAdBusiness) {
    setSelectedAdBusiness(business);
    setFormName(name);
    setFormPhone(phone);
    setFormRegion(region);
    setFormBusinessType(business.business_type);
    setFormServiceType(serviceType);
    setFormInquiry("");
    clearFormImages();
    setRequestOpen(true);
  }

  async function submitRequest() {
    if (!userId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    if (!formName.trim() || !formPhone.trim() || !formRegion.trim()) {
      alert("이름, 연락처, 지역을 입력해주세요.");
      return;
    }

    if (!formServiceType.trim() || !formInquiry.trim()) {
      alert("원하는 서비스와 문의 내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      /*
       * 1. 고객 프로필을 최신 입력값으로 저장합니다.
       *    기존 고객이 있으면 업데이트하고, 없으면 새로 만듭니다.
       */
      const { data: existingCustomer, error: customerFindError } =
        await supabase
          .from("customers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

      if (customerFindError) {
        throw new Error(`고객 정보 확인 실패: ${customerFindError.message}`);
      }

      if (existingCustomer) {
        const { error: customerUpdateError } = await supabase
          .from("customers")
          .update({
            name: formName.trim(),
            phone: formPhone.trim(),
            region: formRegion.trim(),
            service_type: formServiceType.trim(),
            inquiry: formInquiry.trim(),
            status: "신규문의",
          })
          .eq("id", existingCustomer.id);

        if (customerUpdateError) {
          throw new Error(
            `고객 정보 저장 실패: ${customerUpdateError.message}`
          );
        }
      } else {
        const { error: customerInsertError } = await supabase
          .from("customers")
          .insert({
            user_id: userId,
            name: formName.trim(),
            phone: formPhone.trim(),
            region: formRegion.trim(),
            service_type: formServiceType.trim(),
            inquiry: formInquiry.trim(),
            status: "신규문의",
          });

        if (customerInsertError) {
          throw new Error(
            `고객 정보 저장 실패: ${customerInsertError.message}`
          );
        }
      }

      /*
       * 2. 선택한 현장 사진을 Supabase Storage에 업로드합니다.
       */
      const imagePaths = await uploadRequestImages();

      /*
       * 3. 업체 매칭의 출발점이 되는 온라인 문의를 생성합니다.
       */
      const { data: insertedRequest, error: requestError } = await supabase
        .from("service_requests")
        .insert({
          user_id: userId,
          business_type: formBusinessType,
          service_type: formServiceType.trim(),
          name: formName.trim(),
          phone: formPhone.trim(),
          region: formRegion.trim(),
          inquiry: formInquiry.trim(),
          image_paths: imagePaths,
          status: "신규문의",
        })
        .select(
          "id,business_type,service_type,name,phone,region,inquiry,image_paths,status,created_at"
        )
        .single();

      if (requestError) {
        if (imagePaths.length > 0) {
          await supabase.storage
            .from("service-request-images")
            .remove(imagePaths);
        }

        throw new Error(`문의 등록 실패: ${requestError.message}`);
      }

      if (!insertedRequest) {
        if (imagePaths.length > 0) {
          await supabase.storage
            .from("service-request-images")
            .remove(imagePaths);
        }

        throw new Error("문의 등록 결과를 확인할 수 없습니다.");
      }

      /*
       * 4. 사장님 매칭 요청에도 같은 사진 경로를 저장합니다.
       */
      const { error: matchRequestError } = await supabase.rpc(
        "create_customer_match_request",
        {
          p_service_request_id: insertedRequest.id,
          p_business_type: formBusinessType,
          p_customer_name: formName.trim(),
          p_customer_phone: formPhone.trim(),
          p_region: formRegion.trim(),
          p_service_type: formServiceType.trim(),
          p_inquiry: formInquiry.trim(),
          p_image_paths: imagePaths,
          p_target_business_user_id:
            selectedAdBusiness?.business_user_id || null,
          p_source_ad_id: selectedAdBusiness?.ad_id || null,
        }
      );

      if (matchRequestError) {
        throw new Error(
          `매칭 문의 등록 실패: ${matchRequestError.message}`
        );
      }

      const [requestWithImages] = await attachSignedImageUrls([
        insertedRequest as ServiceRequest,
      ]);

      setRequests((current) => [
        requestWithImages,
        ...current,
      ]);

      const directBusinessName = selectedAdBusiness?.business_name || "";

      clearFormImages();
      setRequestOpen(false);
      setFormInquiry("");
      setSelectedAdBusiness(null);

      alert(
        directBusinessName
          ? `${directBusinessName} 업체에 문의를 보냈습니다.`
          : "문의가 등록되었습니다. 업체 매칭을 준비합니다."
      );
    } catch (error) {
      console.error("CUSTOMER REQUEST SAVE ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "문의 등록 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest(request: ServiceRequest) {
    if (!userId) {
      alert("로그인 정보를 확인할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      "이 문의를 삭제하시겠습니까?\n삭제한 문의는 복구할 수 없습니다."
    );

    if (!confirmed) return;

    setDeletingRequestId(request.id);

    try {
      /*
       * 아직 업체가 수락하지 않은 매칭 요청이면 함께 제거합니다.
       * 이미 업체가 수락한 건은 사장님 업무 기록을 보존합니다.
       */
      const { error: matchDeleteError } = await supabase
        .from("match_requests")
        .delete()
        .eq("service_request_id", request.id)
        .eq("customer_user_id", userId)
        .eq("status", "문의접수");

      if (matchDeleteError) {
        throw new Error(`매칭 문의 삭제 실패: ${matchDeleteError.message}`);
      }

      const { error: requestDeleteError } = await supabase
        .from("service_requests")
        .delete()
        .eq("id", request.id)
        .eq("user_id", userId);

      if (requestDeleteError) {
        throw new Error(`문의 삭제 실패: ${requestDeleteError.message}`);
      }

      if ((request.image_paths?.length ?? 0) > 0) {
        const { error: imageDeleteError } = await supabase.storage
          .from("service-request-images")
          .remove(request.image_paths ?? []);

        if (imageDeleteError) {
          console.error("REQUEST IMAGE DELETE ERROR:", imageDeleteError);
        }
      }

      setRequests((current) =>
        current.filter((item) => item.id !== request.id)
      );

      alert("문의가 삭제되었습니다.");
    } catch (error) {
      console.error("CUSTOMER REQUEST DELETE ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "문의 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setDeletingRequestId(null);
    }
  }

  async function respondToEstimate(estimateId: string, nextStatus: "승인" | "거절") {
    const message =
      nextStatus === "승인"
        ? "이 견적을 승인하시겠습니까?"
        : "이 견적을 거절하시겠습니까?";

    if (!window.confirm(message)) return;

    setEstimateReplyingId(estimateId);

    try {
      const { data, error } = await supabase
        .from("estimates")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimateId)
        .eq("customer_user_id", userId)
        .select(
          "id,user_id,customer_user_id,estimate_number,work_description,material_cost,labor_cost,other_cost,total_amount,status,created_at,sent_at"
        )
        .single();

      if (error) throw error;

      setReceivedEstimates((current) =>
        current.map((estimate) =>
          estimate.id === estimateId
            ? {
                ...estimate,
                ...(data as Omit<
                  CustomerEstimate,
                  | "business_name"
                  | "business_phone"
                  | "business_profile_image_url"
                  | "business_address"
                >),
              }
            : estimate
        )
      );

      alert(nextStatus === "승인" ? "견적을 승인했습니다." : "견적을 거절했습니다.");
    } catch (error) {
      console.error("CUSTOMER ESTIMATE REPLY ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "견적 처리 중 오류가 발생했습니다."
      );
    } finally {
      setEstimateReplyingId(null);
    }
  }

  function normalizePhoneForLink(phone: string | null) {
    return (phone || "").replace(/[^0-9+]/g, "");
  }

  async function copyBusinessPhone(phone: string | null) {
    if (!phone) {
      alert("업체 연락처가 등록되어 있지 않습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(phone);
      alert("업체 연락처를 복사했습니다.");
    } catch {
      window.prompt("아래 연락처를 복사해주세요.", phone);
    }
  }

  const pendingReviewCount = reviewJobs.filter(
    (job) => !job.review_id
  ).length;

  async function submitBusinessReview(job: ReviewJob) {
    const rating = reviewRatings[job.estimate_id] || 0;
    const comment = reviewComments[job.estimate_id] || "";

    if (rating < 1 || rating > 5) {
      alert("별점을 1점부터 5점까지 선택해주세요.");
      return;
    }

    setSavingReviewId(job.estimate_id);

    try {
      const { error } = await supabase.rpc("submit_business_review", {
        p_estimate_id: job.estimate_id,
        p_rating: rating,
        p_comment: comment,
      });

      if (error) throw error;

      const { data: refreshedData, error: refreshError } = await supabase.rpc(
        "get_my_reviewable_jobs"
      );

      if (refreshError) throw refreshError;

      const rows = (refreshedData ?? []) as ReviewJob[];
      setReviewJobs(rows);
      setReviewRatings(
        Object.fromEntries(
          rows.map((item) => [
            item.estimate_id,
            Number(item.rating || reviewRatings[item.estimate_id] || 5),
          ])
        )
      );
      setReviewComments(
        Object.fromEntries(
          rows.map((item) => [
            item.estimate_id,
            item.comment || reviewComments[item.estimate_id] || "",
          ])
        )
      );

      alert(job.review_id ? "후기가 수정되었습니다." : "후기가 등록되었습니다.");
    } catch (error) {
      console.error("BUSINESS REVIEW SAVE ERROR:", error);
      alert(
        error instanceof Error
          ? error.message
          : "후기 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSavingReviewId(null);
    }
  }

  function formatEstimatePrice(value: number | null) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function statusClass(status: string) {
    if (status === "신규문의") {
      return "bg-blue-50 text-blue-700";
    }

    if (status === "매칭완료" || status === "계약완료") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (status === "보류" || status === "거절") {
      return "bg-red-50 text-red-600";
    }

    return "bg-slate-100 text-slate-600";
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <div className="flex min-h-screen min-w-0">
        {/* 고객 PC 왼쪽 메뉴 */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-100 p-6">
            <p className="text-xs font-black tracking-wide text-emerald-600">
              해결소 CUSTOMER
            </p>
            <h1 className="mt-1 text-2xl font-black">고객센터</h1>
          </div>

          <nav className="space-y-1.5 p-4">
            {[
              ["🏠", "홈"],
              ["📝", "내 문의"],
              ["💰", "받은 견적"],
              ["📅", "예약 정보"],
              ["🏢", "매칭 업체"],
              ["⭐", "후기"],
              ["👤", "내 정보"],
            ].map(([icon, menuName]) => {
              const active = customerMenu === menuName;
              const count =
                menuName === "내 문의"
                  ? requests.length
                  : menuName === "받은 견적"
                    ? receivedEstimates.length
                    : menuName === "매칭 업체"
                      ? matchedBusinesses.length
                      : menuName === "후기"
                        ? pendingReviewCount
                        : null;

              return (
                <button
                  key={menuName}
                  type="button"
                  onClick={() => setCustomerMenu(menuName as CustomerMenu)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-center text-base">{icon}</span>
                    <span>{menuName}</span>
                  </span>

                  {count !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="whitespace-nowrap text-[10px] font-bold text-slate-400 sm:text-xs">내 지역</p>
              <p className="mt-1 font-black text-slate-800">{region || "지역 미설정"}</p>
              <p className="mt-2 truncate text-xs text-slate-500">{email || "-"}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {/* 상단 헤더 */}
          <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8 lg:px-10">
            <div>
              <p className="text-xs font-black tracking-wide text-emerald-600 lg:hidden">
                해결소 CUSTOMER
              </p>
              <h2 className="mt-1 text-xl font-black">{customerMenu}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{name}</p>
                <p className="text-xs text-emerald-600">고객</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                {name.slice(0, 1)}
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 sm:px-4"
              >
                로그아웃
              </button>
            </div>
          </header>

          {/* 모바일 메뉴 */}
          <div className="sticky top-20 z-30 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
            <div className="flex min-w-max gap-2">
              {[
                ["🏠", "홈"],
                ["📝", "내 문의"],
                ["💰", "받은 견적"],
                ["📅", "예약 정보"],
                ["🏢", "매칭 업체"],
                ["⭐", "후기"],
                ["👤", "내 정보"],
              ].map(([icon, menuName]) => (
                <button
                  key={menuName}
                  type="button"
                  onClick={() => setCustomerMenu(menuName as CustomerMenu)}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                    customerMenu === menuName
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {icon} {menuName}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-7xl p-5 pb-12 sm:p-8 lg:p-10">
            {customerMenu === "홈" && (
              <>
                <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-emerald-600">CUSTOMER HOME</p>
                      <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                        안녕하세요, {name}님 👋
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                        {region || "내 지역"}에서 이용할 수 있는 추천 업체를 확인하세요.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openRequestFromHome}
                      className="shrink-0 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      + 업체에 문의하기
                    </button>
                  </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black tracking-wide text-amber-600">
                          SPONSORED BUSINESSES
                        </p>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                          광고
                        </span>
                      </div>
                      <h3 className="mt-2 text-2xl font-black">
                        추천 상위노출 업체
                      </h3>
                    </div>

                    <div className="w-full sm:w-56">
                      <label className="text-xs font-black text-slate-400">
                        업종 선택
                      </label>
                      <select
                        value={homeBusinessType}
                        onChange={(event) =>
                          setHomeBusinessType(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                      >
                        {businessOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                      📍 {region || "지역 미설정"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5">
                      {getBusinessTypeLabel(homeBusinessType)}
                    </span>
                  </div>

                  {loadingCustomerAds ? (
                    <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                      광고 업체를 불러오는 중입니다...
                    </div>
                  ) : customerAdBusinesses.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="font-black text-slate-700">
                        현재 노출 중인 광고 업체가 없습니다.
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        광고 업체가 등록되면 상품 등급과 광고 시작 순서에 따라
                        이곳에 표시됩니다.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-7 space-y-8">
                      {[
                        {
                          key: "nationwide",
                          title: "👑 전국 프리미엄",
                          description:
                            "지역과 관계없이 해당 업종 고객에게 가장 먼저 노출됩니다.",
                          businesses: nationwideAds,
                          accent: "violet",
                        },
                        {
                          key: "premium",
                          title: "👑 내 지역 프리미엄",
                          description:
                            `${region || "내 지역"}의 프리미엄 상위노출 업체입니다.`,
                          businesses: premiumAds,
                          accent: "amber",
                        },
                        {
                          key: "best",
                          title: "⭐ 베스트",
                          description:
                            "추천 배지와 함께 일반 업체보다 상단에 노출되는 업체입니다.",
                          businesses: bestAds,
                          accent: "blue",
                        },
                        {
                          key: "light",
                          title: "✨ 라이트",
                          description:
                            "지역·업종 추천 영역에 노출 중인 업체입니다.",
                          businesses: lightAds,
                          accent: "emerald",
                        },
                      ].map((group) => {
                        if (group.businesses.length === 0) return null;

                        return (
                          <div key={group.key}>
                            <div className="flex flex-wrap items-end justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-black text-slate-950">
                                  {group.title}
                                </h4>
                                <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                                  {group.description}
                                </p>
                              </div>

                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                                {group.businesses.length} /{" "}
                                {getAdTierCapacity(
                                  group.businesses[0].ad_tier
                                )}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                              {group.businesses.map((business) => {
                                const rating = Number(
                                  business.average_rating || 0
                                );
                                const reviewCount = Number(
                                  business.review_count || 0
                                );
                                return (
                                  <article
                                    key={business.ad_id}
                                    className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
                                  >
                                    <div>
                                      <div className="flex items-center">
                                        <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-amber-950">
                                          광고
                                        </span>
                                      </div>

                                      <div className="mt-3 flex items-start gap-3">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-16 sm:w-16">
                                          {business.profile_image_url ? (
                                            <img
                                              src={business.profile_image_url}
                                              alt={`${business.business_name} 프로필`}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xl sm:text-2xl">
                                              🏢
                                            </div>
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <p className="truncate whitespace-nowrap text-sm font-black text-slate-950 sm:text-lg">
                                            {business.business_name}
                                          </p>
                                          <p className="mt-1 truncate whitespace-nowrap text-[11px] font-bold text-slate-500 sm:text-xs">
                                            {getBusinessTypeLabel(
                                              business.business_type
                                            )}
                                          </p>
                                          <p className="mt-1 truncate whitespace-nowrap text-[10px] font-bold text-slate-400 sm:text-[11px]">
                                            {business.ad_tier === "nationwide"
                                              ? "전국 서비스"
                                              : business.region || region || "지역 업체"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void openBusinessReviews(business)
                                      }
                                      className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl text-left transition hover:bg-slate-50 sm:gap-2"
                                      aria-label={`${business.business_name} 후기 보기`}
                                    >
                                      <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-700 sm:px-3 sm:py-1.5 sm:text-sm">
                                        ★ {rating.toFixed(1)}
                                      </span>
                                      <span className="shrink-0 whitespace-nowrap text-[10px] font-black text-slate-500 underline decoration-slate-300 underline-offset-4 sm:text-xs">
                                        후기{" "}
                                        {reviewCount.toLocaleString("ko-KR")}개
                                        <span className="ml-1">›</span>
                                      </span>
                                    </button>

                                    <div className="mt-4 border-t border-slate-100 pt-3 sm:mt-5 sm:pt-4">
                                      <span className="truncate whitespace-nowrap text-[10px] font-black text-emerald-600 sm:text-xs">
                                        {getAdTierLabel(business.ad_tier)}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => openRequestFromAd(business)}
                                      className="mt-3 w-full rounded-xl bg-emerald-600 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-emerald-700 sm:mt-4 sm:px-3 sm:py-3 sm:text-sm"
                                    >
                                      견적 문의하기
                                    </button>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {customerMenu === "받은 견적" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-wide text-emerald-600">
                      RECEIVED ESTIMATES
                    </p>
                    <h3 className="mt-1 text-xl font-black">받은 견적</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      견적을 확인하고 승인할 수 있습니다. 승인 후에는 업체와 바로 연락해
                      시공 일정과 세부사항을 조율하세요.
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                    {receivedEstimates.length}건
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {loadingEstimates ? (
                    <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">
                      받은 견적을 불러오는 중입니다...
                    </div>
                  ) : receivedEstimates.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-7 text-center">
                      <p className="font-black text-slate-700">
                        아직 받은 견적이 없습니다.
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        업체가 견적을 발송하면 이곳에 표시됩니다.
                      </p>
                    </div>
                  ) : (
                    receivedEstimates.map((estimate) => {
                      const approved = estimate.status === "승인";
                      const rejected = estimate.status === "거절";
                      const pending =
                        estimate.status === "견적발송" ||
                        estimate.status === "발송완료";
                      const expanded = expandedEstimateId === estimate.id;
                      const phoneLink = normalizePhoneForLink(
                        estimate.business_phone
                      );

                      return (
                        <article
                          key={estimate.id}
                          className={`overflow-hidden rounded-3xl border ${
                            approved
                              ? "border-emerald-200 bg-emerald-50/50"
                              : rejected
                                ? "border-red-100 bg-red-50/30"
                                : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="p-5 sm:p-6">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    {estimate.business_profile_image_url ? (
                                      <img
                                        src={estimate.business_profile_image_url}
                                        alt={`${estimate.business_name || "업체"} 프로필`}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-2xl">
                                        🏢
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-lg font-black text-slate-950">
                                      {estimate.business_name || "견적 발송 업체"}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-bold text-slate-400">
                                        {estimate.estimate_number || "견적서"}
                                      </span>
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                          approved
                                            ? "bg-emerald-100 text-emerald-700"
                                            : rejected
                                              ? "bg-red-100 text-red-600"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {estimate.status || "작성중"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {estimate.work_description ||
                                    "작업 내용이 없습니다."}
                                </p>

                                <p className="mt-3 text-xs font-bold text-slate-400">
                                  {new Date(
                                    estimate.sent_at || estimate.created_at
                                  ).toLocaleDateString("ko-KR")}
                                </p>
                              </div>

                              <div className="shrink-0 lg:text-right">
                                <p className="text-2xl font-black text-emerald-700">
                                  {formatEstimatePrice(estimate.total_amount)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedEstimateId((current) =>
                                      current === estimate.id ? null : estimate.id
                                    )
                                  }
                                  className="mt-2 text-xs font-black text-slate-500 underline underline-offset-4"
                                >
                                  {expanded ? "상세 견적 닫기" : "상세 견적 보기"}
                                </button>
                              </div>
                            </div>

                            {expanded && (
                              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    자재비
                                  </p>
                                  <p className="mt-1 font-black text-slate-800">
                                    {formatEstimatePrice(estimate.material_cost)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    인건비
                                  </p>
                                  <p className="mt-1 font-black text-slate-800">
                                    {formatEstimatePrice(estimate.labor_cost)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    기타비용
                                  </p>
                                  <p className="mt-1 font-black text-slate-800">
                                    {formatEstimatePrice(estimate.other_cost)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    총 견적
                                  </p>
                                  <p className="mt-1 font-black text-emerald-700">
                                    {formatEstimatePrice(estimate.total_amount)}
                                  </p>
                                </div>
                              </div>
                            )}

                            {pending && (
                              <div className="mt-5">
                                <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
                                  견적 내용을 확인한 뒤 승인하면 업체 연락처가 열리고,
                                  바로 일정 조율을 시작할 수 있습니다.
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    disabled={
                                      estimateReplyingId === estimate.id
                                    }
                                    onClick={() =>
                                      void respondToEstimate(
                                        estimate.id,
                                        "거절"
                                      )
                                    }
                                    className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 disabled:opacity-50"
                                  >
                                    거절
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      estimateReplyingId === estimate.id
                                    }
                                    onClick={() =>
                                      void respondToEstimate(
                                        estimate.id,
                                        "승인"
                                      )
                                    }
                                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                                  >
                                    {estimateReplyingId === estimate.id
                                      ? "처리 중..."
                                      : "견적 승인"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {approved && (
                              <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                                    ✓
                                  </div>
                                  <div>
                                    <p className="font-black text-emerald-900">
                                      견적 승인이 완료되었습니다.
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                      이제 업체와 전화 또는 문자로 시공 날짜, 방문 시간,
                                      세부 작업 내용을 조율해주세요.
                                    </p>
                                  </div>
                                </div>

                                {estimate.business_phone ? (
                                  <>
                                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                                      <p className="text-[11px] font-bold text-slate-400">
                                        업체 연락처
                                      </p>
                                      <p className="mt-1 text-lg font-black text-slate-950">
                                        {estimate.business_phone}
                                      </p>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      <a
                                        href={`tel:${phoneLink}`}
                                        className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white"
                                      >
                                        📞 전화하기
                                      </a>

                                      <a
                                        href={`sms:${phoneLink}`}
                                        className="flex items-center justify-center rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white"
                                      >
                                        💬 문자하기
                                      </a>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void copyBusinessPhone(
                                            estimate.business_phone
                                          )
                                        }
                                        className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 sm:col-span-1"
                                      >
                                        📋 연락처 복사
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
                                    업체가 아직 연락처를 등록하지 않았습니다. 매칭 업체
                                    메뉴에서 업체 정보를 확인해주세요.
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setCustomerMenu("매칭 업체")}
                                  className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"
                                >
                                  매칭 업체 정보 보기
                                </button>
                              </div>
                            )}

                            {rejected && (
                              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                                거절한 견적입니다. 다른 업체에 새 문의를 보내려면 홈에서
                                업체를 선택해 다시 견적을 요청할 수 있습니다.
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {customerMenu === "내 문의" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-wide text-slate-400">
                      MY REQUESTS
                    </p>
                    <h3 className="mt-1 text-xl font-black">내 문의</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      내가 업체에 보낸 문의와 진행 상태를 확인하세요.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openRequestModal}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
                  >
                    + 문의 등록
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {loadingRequests ? (
                    <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">
                      문의 내역을 불러오는 중입니다...
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-7 text-center">
                      <p className="font-black text-slate-700">등록된 문의가 없습니다.</p>
                      <p className="mt-2 text-sm text-slate-400">
                        원하는 서비스를 입력하고 업체에 첫 문의를 보내보세요.
                      </p>
                    </div>
                  ) : (
                    requests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-900">
                                {request.service_type || "서비스 문의"}
                              </p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClass(
                                  request.status
                                )}`}
                              >
                                {request.status}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                              {request.region} · {getBusinessTypeLabel(request.business_type)}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-slate-700">
                              {request.inquiry}
                            </p>

                            {(request.image_urls?.length ?? 0) > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-black text-slate-400">
                                  첨부 사진 {request.image_urls?.length}장
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {request.image_urls?.map((imageUrl, index) => (
                                    <a
                                      key={`${request.id}-${index}`}
                                      href={imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`첨부 사진 ${index + 1} 크게 보기`}
                                      className="block h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition hover:opacity-90"
                                      style={{
                                        backgroundImage: `url("${imageUrl}")`,
                                        backgroundPosition: "center",
                                        backgroundSize: "cover",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                            <p className="text-xs text-slate-400">
                              {new Date(request.created_at).toLocaleDateString("ko-KR")}
                            </p>

                            <button
                              type="button"
                              onClick={() => void deleteRequest(request)}
                              disabled={deletingRequestId === request.id}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingRequestId === request.id
                                ? "삭제 중..."
                                : "삭제"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {customerMenu === "예약 정보" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="text-xs font-black tracking-wide text-emerald-600">RESERVATIONS</p>
                <h3 className="mt-2 text-2xl font-black">예약 정보</h3>
                <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="font-black text-slate-700">아직 등록된 예약 일정이 없습니다.</p>
                  <p className="mt-2 text-sm text-slate-400">
                    업체와 상담·예약 일정이 확정되면 이곳에 표시됩니다.
                  </p>
                </div>
              </section>
            )}

            {customerMenu === "매칭 업체" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-wide text-emerald-600">
                      MATCHED BUSINESSES
                    </p>
                    <h3 className="mt-2 text-2xl font-black">매칭 업체</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      내 문의를 수락한 업체의 연락처와 진행상태를 확인할 수 있습니다.
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                    {matchedBusinesses.length}곳
                  </div>
                </div>

                {loadingMatchedBusinesses ? (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                    매칭 업체 정보를 불러오는 중입니다...
                  </div>
                ) : matchedBusinesses.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                    <p className="text-3xl">🤝</p>
                    <p className="mt-3 font-black text-slate-700">
                      아직 연결된 업체가 없습니다.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      업체가 문의를 수락하면 이곳에서 업체 정보와 연락처를 확인할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    {matchedBusinesses.map((business) => {
                      const phoneLink = normalizePhoneForLink(
                        business.business_phone
                      );
                      const rating = Number(business.average_rating || 0);
                      const reviewCount = Number(business.review_count || 0);

                      return (
                        <article
                          key={business.match_request_id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                              {business.profile_image_url ? (
                                <img
                                  src={business.profile_image_url}
                                  alt={`${business.business_name} 프로필`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl">
                                  🏢
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xl font-black text-slate-950">
                                  {business.business_name}
                                </h4>

                                {business.is_direct && (
                                  <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-amber-950">
                                    광고 직접문의
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {getBusinessTypeLabel(business.business_type)}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-700">
                                  ★ {rating.toFixed(1)}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                  후기 {reviewCount.toLocaleString("ko-KR")}개
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-[11px] font-bold text-slate-400">
                                진행상태
                              </p>
                              <p className="mt-1 font-black text-emerald-700">
                                {business.customer_status || "매칭완료"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-[11px] font-bold text-slate-400">
                                문의 서비스
                              </p>
                              <p className="mt-1 truncate font-black text-slate-800">
                                {business.service_type || "서비스 문의"}
                              </p>
                            </div>
                          </div>

                          {business.business_address && (
                            <div className="mt-3 rounded-2xl bg-white p-4">
                              <p className="text-[11px] font-bold text-slate-400">
                                업체 지역
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-800">
                                {business.business_address}
                              </p>
                            </div>
                          )}

                          {business.business_phone ? (
                            <div className="mt-3 rounded-2xl bg-white p-4">
                              <p className="text-[11px] font-bold text-slate-400">
                                업체 연락처
                              </p>
                              <p className="mt-1 text-lg font-black text-slate-950">
                                {business.business_phone}
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <a
                                  href={`tel:${phoneLink}`}
                                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white"
                                >
                                  📞 전화하기
                                </a>

                                <a
                                  href={`sms:${phoneLink}`}
                                  className="flex items-center justify-center rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white"
                                >
                                  💬 문자하기
                                </a>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyBusinessPhone(
                                      business.business_phone
                                    )
                                  }
                                  className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 sm:col-span-1"
                                >
                                  📋 연락처 복사
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
                              업체가 아직 연락처를 등록하지 않았습니다.
                            </div>
                          )}

                          {business.latest_estimate_id && (
                            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-bold text-blue-500">
                                    최근 견적
                                  </p>
                                  <p className="mt-1 font-black text-blue-950">
                                    {business.latest_estimate_number || "견적서"}
                                    {business.latest_estimate_status
                                      ? ` · ${business.latest_estimate_status}`
                                      : ""}
                                  </p>
                                  <p className="mt-1 text-sm font-black text-emerald-700">
                                    {Number(
                                      business.latest_estimate_total || 0
                                    ).toLocaleString("ko-KR")}원
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setCustomerMenu("받은 견적")}
                                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
                                >
                                  받은 견적 보기
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="mt-4 text-[11px] font-bold text-slate-400">
                            매칭일{" "}
                            {new Date(business.matched_at).toLocaleDateString(
                              "ko-KR"
                            )}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {customerMenu === "후기" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black tracking-wide text-amber-600">
                      CUSTOMER REVIEWS
                    </p>
                    <h3 className="mt-2 text-2xl font-black">업체 후기</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      직접 문의 또는 매칭을 통해 이용한 업체 중, 견적 승인 후 시공이 완료된 업체에 별점과 후기를 남길 수 있습니다.
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
                    작성 대기 {pendingReviewCount}건
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                    후기 작성 가능한 거래를 확인하는 중입니다...
                  </div>
                ) : reviewJobs.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                    <p className="text-3xl">⭐</p>
                    <p className="mt-3 font-black text-slate-700">
                      아직 후기 작성 가능한 거래가 없습니다.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      업체가 시공 상태를 ‘시공완료’로 처리한 뒤 후기를 작성할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    {reviewJobs.map((job) => {
                      const selectedRating =
                        reviewRatings[job.estimate_id] || 5;

                      return (
                        <article
                          key={job.estimate_id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
                        >
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                              {job.profile_image_url ? (
                                <img
                                  src={job.profile_image_url}
                                  alt={`${job.business_name} 프로필`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl">
                                  🏢
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black text-slate-950">
                                  {job.business_name}
                                </h4>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                  시공완료
                                </span>
                                {job.review_id && (
                                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                                    작성완료
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                {job.work_description || "작업 내용"}
                              </p>

                              <p className="mt-2 text-sm font-black text-emerald-700">
                                {Number(job.total_amount || 0).toLocaleString("ko-KR")}원
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 border-t border-slate-200 pt-5">
                            <p className="text-sm font-black text-slate-800">
                              별점
                            </p>

                            <div className="mt-3 flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    setReviewRatings((current) => ({
                                      ...current,
                                      [job.estimate_id]: star,
                                    }))
                                  }
                                  className={`text-3xl leading-none transition ${
                                    star <= selectedRating
                                      ? "text-amber-400"
                                      : "text-slate-200"
                                  }`}
                                  aria-label={`${star}점`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>

                            <p className="mt-2 text-xs font-bold text-slate-400">
                              {selectedRating}점
                            </p>

                            <label className="mt-5 block text-sm font-black text-slate-800">
                              후기 내용
                            </label>
                            <textarea
                              value={reviewComments[job.estimate_id] || ""}
                              onChange={(event) =>
                                setReviewComments((current) => ({
                                  ...current,
                                  [job.estimate_id]: event.target.value,
                                }))
                              }
                              rows={4}
                              maxLength={1000}
                              placeholder="시공 품질, 친절도, 일정 등 실제 이용 경험을 작성해주세요."
                              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-amber-400"
                            />

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <p className="text-[11px] font-bold text-slate-400">
                                {job.review_id
                                  ? "작성한 후기는 언제든 수정할 수 있습니다."
                                  : "실제 이용 경험을 바탕으로 작성해주세요."}
                              </p>

                              <button
                                type="button"
                                disabled={savingReviewId === job.estimate_id}
                                onClick={() => void submitBusinessReview(job)}
                                className="shrink-0 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
                              >
                                {savingReviewId === job.estimate_id
                                  ? "저장 중..."
                                  : job.review_id
                                    ? "후기 수정"
                                    : "후기 등록"}
                              </button>
                            </div>

                            {job.business_reply && (
                              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-black text-emerald-900">
                                    업체 답글
                                  </p>
                                  {(job.business_reply_updated_at ||
                                    job.business_replied_at) && (
                                    <p className="text-[10px] font-bold text-emerald-600">
                                      {new Date(
                                        job.business_reply_updated_at ||
                                          job.business_replied_at ||
                                          ""
                                      ).toLocaleDateString("ko-KR")}
                                    </p>
                                  )}
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                                  {job.business_reply}
                                </p>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {customerMenu === "내 정보" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <div>
                  <p className="text-xs font-black tracking-wide text-slate-400">
                    MY INFORMATION
                  </p>
                  <h3 className="mt-1 text-xl font-black">내 고객 정보</h3>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoRow label="이름" value={name || "-"} />
                  <InfoRow label="연락처" value={phone || "-"} />
                  <InfoRow label="지역" value={region || "-"} />
                  <InfoRow label="이메일 주소" value={email || "-"} />
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold text-slate-400">최근 문의 내용</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {inquiry || "등록된 문의 내용이 없습니다."}
                  </p>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>

      {reviewModalBusiness && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {reviewModalBusiness.profile_image_url ? (
                    <img
                      src={reviewModalBusiness.profile_image_url}
                      alt={`${reviewModalBusiness.business_name} 프로필`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      🏢
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black tracking-wide text-amber-600">
                    BUSINESS REVIEWS
                  </p>
                  <h3 className="mt-1 truncate text-xl font-black text-slate-950 sm:text-2xl">
                    {reviewModalBusiness.business_name} 후기
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {getBusinessTypeLabel(reviewModalBusiness.business_type)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeBusinessReviewModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-slate-200"
                aria-label="후기 창 닫기"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-[11px] font-bold text-amber-600">
                    평균 별점
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-700">
                    ★ {Number(
                      reviewModalBusiness.average_rating || 0
                    ).toFixed(1)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold text-slate-400">
                    전체 후기
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {Number(
                      reviewModalBusiness.review_count || 0
                    ).toLocaleString("ko-KR")}개
                  </p>
                </div>
              </div>

              {loadingPublicBusinessReviews ? (
                <div className="py-14 text-center text-sm font-bold text-slate-400">
                  후기를 불러오는 중입니다...
                </div>
              ) : publicBusinessReviewError ? (
                <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                  {publicBusinessReviewError}
                </div>
              ) : publicBusinessReviews.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="text-3xl">⭐</p>
                  <p className="mt-3 font-black text-slate-700">
                    아직 작성된 후기가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {publicBusinessReviews.map((review) => (
                    <article
                      key={review.review_id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black tracking-wider text-amber-400">
                              {"★".repeat(Number(review.rating || 0))}
                              <span className="text-slate-200">
                                {"★".repeat(
                                  Math.max(
                                    0,
                                    5 - Number(review.rating || 0)
                                  )
                                )}
                              </span>
                            </span>
                            <span className="text-sm font-black text-slate-800">
                              {review.rating}.0
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-slate-400">
                            {review.customer_display_name} ·{" "}
                            {new Date(
                              review.review_created_at
                            ).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {review.comment || "후기 내용이 없습니다."}
                      </p>

                      {review.business_reply && (
                        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black text-emerald-800">
                              업체 답글
                            </p>
                            {(review.business_reply_updated_at ||
                              review.business_replied_at) && (
                              <p className="text-[10px] font-bold text-emerald-600">
                                {new Date(
                                  review.business_reply_updated_at ||
                                    review.business_replied_at ||
                                    ""
                                ).toLocaleDateString("ko-KR")}
                              </p>
                            )}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-950">
                            {review.business_reply}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const business = reviewModalBusiness;
                  closeBusinessReviewModal();
                  openRequestFromAd(business);
                }}
                className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                이 업체에 견적 문의하기
              </button>
            </div>
          </div>
        </div>
      )}

      {requestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-black tracking-wide text-emerald-600">
                  NEW SERVICE REQUEST
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {selectedAdBusiness
                    ? `${selectedAdBusiness.business_name}에 견적 문의`
                    : "업체에 문의하기"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeRequestModal}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6 sm:p-8">
              {selectedAdBusiness && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
                      {selectedAdBusiness.profile_image_url ? (
                        <img
                          src={selectedAdBusiness.profile_image_url}
                          alt={`${selectedAdBusiness.business_name} 프로필`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🏢
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-950">
                          {selectedAdBusiness.business_name}
                        </p>
                        <span className="rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-amber-950">
                          광고
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        이 문의는 선택한 업체에 직접 전달됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-black">이름 *</label>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="이름"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-black">연락처 *</label>
                  <input
                    value={formPhone}
                    onChange={(event) => setFormPhone(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="010-0000-0000"
                  />
                </div>

                <div>
                  <label className="text-sm font-black">지역 *</label>
                  <input
                    value={formRegion}
                    onChange={(event) => setFormRegion(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="예: 시흥"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-black">업종 *</label>
                <select
                  value={formBusinessType}
                  onChange={(event) => setFormBusinessType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >
                  {businessOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-black">원하는 서비스 *</label>
                <input
                  value={formServiceType}
                  onChange={(event) => setFormServiceType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="예: 싱크대 필름 시공"
                />
              </div>

              <div>
                <label className="text-sm font-black">문의 내용 *</label>
                <textarea
                  value={formInquiry}
                  onChange={(event) => setFormInquiry(event.target.value)}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                  placeholder="원하는 작업, 대략적인 수량, 희망 일정 등을 적어주세요."
                />
              </div>

              <div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <label className="text-sm font-black">
                      현장 사진 <span className="text-slate-400">(선택)</span>
                    </label>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      전체 모습과 문제 부위를 함께 올리면 더 정확한 견적에 도움이 됩니다.
                    </p>
                  </div>

                  <span className="text-xs font-black text-emerald-600">
                    {formImages.length} / 5장
                  </span>
                </div>

                <input
                  id="service-request-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="sr-only"
                />

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {formImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      style={{
                        backgroundImage: `url("${image.previewUrl}")`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }}
                    >
                      <div className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-black text-white">
                        {index + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFormImage(image.id)}
                        aria-label={`사진 ${index + 1} 삭제`}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-sm font-black text-white shadow-sm transition hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {formImages.length < 5 && (
                    <label
                      htmlFor="service-request-images"
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <span className="text-3xl font-light text-emerald-600">＋</span>
                      <span className="mt-1 text-xs font-black text-emerald-700">
                        사진 추가
                      </span>
                    </label>
                  )}
                </div>

                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  JPG, PNG, WEBP · 사진당 최대 10MB · 최대 5장
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                {selectedAdBusiness
                  ? `${selectedAdBusiness.business_name} 업체에 직접 문의가 전달됩니다. 업체가 수락하면 받은 견적과 매칭 정보에서 확인할 수 있습니다.`
                  : "문의를 등록하면 해당 지역과 업종에 맞는 업체 매칭을 준비합니다."}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  취소
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={submitRequest}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? formImages.length > 0
                      ? "사진 업로드 및 등록 중..."
                      : "등록 중..."
                    : selectedAdBusiness
                      ? "이 업체에 문의 보내기"
                      : "문의 등록하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}

function HomeMenu({
  ownerName,
  businessName,
  businessLabel,
  menus,
  onNavigate,
}: {
  ownerName: string;
  businessName: string;
  businessLabel: string;
  menus: MenuItem[];
  onNavigate: (name: string) => void;
}) {
  const [taskCounts, setTaskCounts] = useState({
    newInquiry: 0,
    draftEstimate: 0,
    contractProgress: 0,
    installationProgress: 0,
  });
  const [taskLoading, setTaskLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTaskCounts() {
      setTaskLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        const [
          { data: customerData, error: customerError },
          { data: estimateData, error: estimateError },
        ] = await Promise.all([
          supabase
            .from("customers")
            .select("status")
            .eq("user_id", user.id),

          supabase
            .from("estimates")
            .select("status")
            .eq("user_id", user.id),
        ]);

        if (customerError) throw customerError;
        if (estimateError) throw estimateError;
        if (!mounted) return;

        const customers = (customerData ?? []) as Array<{
          status: string | null;
        }>;

        const estimates = (estimateData ?? []) as Array<{
          status: string | null;
        }>;

        setTaskCounts({
          newInquiry: customers.filter(
            (customer) => customer.status === "신규문의"
          ).length,

          draftEstimate: estimates.filter(
            (estimate) => estimate.status === "작성중"
          ).length,

          contractProgress: customers.filter(
            (customer) =>
              customer.status === "계약대기" ||
              customer.status === "계약진행"
          ).length,

          installationProgress: customers.filter(
            (customer) =>
              customer.status === "계약완료" ||
              customer.status === "시공진행"
          ).length,
        });
      } catch (error) {
        console.error("HOME TASK COUNT ERROR:", error);
      } finally {
        if (mounted) {
          setTaskLoading(false);
        }
      }
    }

    void loadTaskCounts();

    return () => {
      mounted = false;
    };
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const calendarCells = Array(firstDay)
    .fill("")
    .concat(Array.from({ length: lastDay }, (_, index) => index + 1));

  const taskItems = [
    {
      icon: "📩",
      label: "신규 문의",
      count: taskCounts.newInquiry,
      menu: "고객 관리",
    },
    {
      icon: "🧾",
      label: "견적 작성 대기",
      count: taskCounts.draftEstimate,
      menu: "견적 관리",
    },
    {
      icon: "📋",
      label: "계약 진행",
      count: taskCounts.contractProgress,
      menu: "계약 관리",
    },
    {
      icon: "🛠️",
      label: "시공 대기·진행",
      count: taskCounts.installationProgress,
      menu: "시공 관리",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-blue-600">해결소</p>

        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          안녕하세요, {ownerName}님 👋
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          {businessLabel} 업무에 필요한 기능만 빠르게 사용하세요.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            현재 업종 · {businessLabel}
          </span>

          {businessName && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {businessName}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 p-5">
        <p className="text-xs font-black tracking-wide text-sky-600">
          현재 적용 업종
        </p>

        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="text-lg font-black text-slate-900">{businessLabel}</p>
          <p className="text-xs font-bold text-slate-500">
            견적·단가·AI 기능에 동일하게 적용됩니다.
          </p>
        </div>
      </div>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {menus.slice(1).map((menu) => (
          <button
            key={menu.name}
            type="button"
            onClick={() => onNavigate(menu.name)}
            className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition group-hover:bg-blue-50">
              {menu.icon}
            </div>

            <h3 className="mt-5 text-lg font-black">{menu.name}</h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {menu.description}
            </p>

            <p className="mt-5 text-sm font-black text-blue-600">
              바로가기 →
            </p>
          </button>
        ))}

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              ✅
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
              TODAY
            </span>
          </div>

          <h3 className="mt-5 text-lg font-black">오늘 할 일</h3>
          <p className="mt-1 text-xs font-bold text-slate-400">
            확인이 필요한 업무를 바로 열어보세요.
          </p>

          <div className="mt-4 space-y-2">
            {taskItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.menu)}
                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-blue-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="truncate text-xs font-bold text-slate-600">
                    {item.label}
                  </span>
                </div>

                <span className="ml-2 shrink-0 text-sm font-black text-blue-600">
                  {taskLoading ? "·" : `${item.count}건`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:col-span-2 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                📅
              </div>

              <div>
                <h3 className="text-lg font-black">작업 일정</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {year}.{String(month + 1).padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
              오늘 {month + 1}월 {today}일
            </div>
          </div>

          <div
            className="mt-5 flex-1 text-center text-xs"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: "0.35rem",
            }}
          >
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div
                key={day}
                className="flex min-h-7 items-center justify-center font-black text-slate-400"
              >
                {day}
              </div>
            ))}

            {calendarCells.map((day, index) => (
              <div
                key={index}
                className={`flex min-h-7 items-center justify-center rounded-lg ${
                  day === today
                    ? "bg-blue-600 font-black text-white"
                    : day
                      ? "font-bold text-slate-600"
                      : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <p className="text-xs font-bold tracking-widest text-blue-400">
          ONE STOP WORKFLOW
        </p>

        <h3 className="mt-2 text-2xl font-black">
          {businessLabel} 문의부터 견적·계약까지 한곳에서
        </h3>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["01", "고객 문의", "문의 내용을 빠르게 기록"],
            ["02", "AI 견적", "내 단가표로 견적 계산"],
            ["03", "계약", "진행 상태를 한눈에 관리"],
            ["04", "매출", "완료된 거래를 관리"],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-bold text-blue-300">{number}</p>
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-8 py-8 text-center">
        <p className="text-lg font-black text-slate-800">해결소 v1.0</p>
        <p className="mt-2 text-sm text-slate-500">
          © 2026 해결소. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
