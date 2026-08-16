"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { supabase } from "@/lib/supabase";

type PlanCode =
  | "light"
  | "best"
  | "premium_1"
  | "premium_3"
  | "premium_5"
  | "nationwide";

type AdTier = "light" | "best" | "premium" | "nationwide";

type Availability = {
  capacity: number;
  occupied: number;
  remaining: number;
  sold_out: boolean;
};

type RegionSelection = {
  province: string;
  district: string;
};

type AdSlot = {
  id: string;
  business_user_id: string;
  region: string;
  region_key: string;
  business_type: string;
  status: "reserved" | "active" | "expired" | "cancelled";
  amount: number;
  order_id: string | null;
  reserved_until: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  plan_code: PlanCode | null;
  ad_tier: AdTier | null;
  duration_days: number | null;
};

type PositionInfo = {
  slotPosition: number | null;
  capacity: number | null;
};

type PlanConfig = {
  code: PlanCode;
  name: string;
  badge: string;
  price: number;
  duration: number;
  regionCount: number;
  capacity: number;
  tier: AdTier;
  description: string;
};

const AD_PLANS: PlanConfig[] = [
  {
    code: "nationwide",
    name: "전국 프리미엄",
    badge: "NATIONWIDE 👑",
    price: 399000,
    duration: 30,
    regionCount: 0,
    capacity: 5,
    tier: "nationwide",
    description: "지역과 관계없이 해당 업종 고객에게 전국 최상단 노출",
  },
  {
    code: "premium_5",
    name: "프리미엄 5지역",
    badge: "MULTI 5",
    price: 229000,
    duration: 30,
    regionCount: 5,
    capacity: 10,
    tier: "premium",
    description: "서로 다른 지역 5곳에서 프리미엄 최상단 노출",
  },
  {
    code: "premium_3",
    name: "프리미엄 3지역",
    badge: "MULTI 3",
    price: 149000,
    duration: 30,
    regionCount: 3,
    capacity: 10,
    tier: "premium",
    description: "서로 다른 지역 3곳에서 프리미엄 최상단 노출",
  },
  {
    code: "premium_1",
    name: "내 지역 프리미엄",
    badge: "PREMIUM 👑",
    price: 59900,
    duration: 30,
    regionCount: 1,
    capacity: 10,
    tier: "premium",
    description: "선택한 지역·업종 프리미엄 최상단 1~10자리",
  },
  {
    code: "best",
    name: "베스트",
    badge: "BEST ⭐",
    price: 29900,
    duration: 30,
    regionCount: 1,
    capacity: 20,
    tier: "best",
    description: "추천 배지와 함께 일반 업체보다 상단 노출",
  },
  {
    code: "light",
    name: "라이트",
    badge: "START",
    price: 9900,
    duration: 7,
    regionCount: 1,
    capacity: 30,
    tier: "light",
    description: "지역·업종 추천업체 상단에 7일 노출",
  },
]

const PLAN_BY_CODE = Object.fromEntries(
  AD_PLANS.map((plan) => [plan.code, plan])
) as Record<PlanCode, PlanConfig>;

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function buildRegion(selection: RegionSelection) {
  if (!selection.province || !selection.district) return "";
  return `${selection.province} ${selection.district}`;
}

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

const REGION_OPTIONS: Record<string, string[]> = {
  "서울": ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"],
  "부산": ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군"],
  "대구": ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  "인천": ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"],
  "광주": ["동구", "서구", "남구", "북구", "광산구"],
  "대전": ["동구", "중구", "서구", "유성구", "대덕구"],
  "울산": ["중구", "남구", "동구", "북구", "울주군"],
  "세종": ["세종시"],
  "경기": ["수원시", "성남시", "의정부시", "안양시", "부천시", "광명시", "평택시", "동두천시", "안산시", "고양시", "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시", "의왕시", "하남시", "용인시", "파주시", "이천시", "안성시", "김포시", "화성시", "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군"],
  "강원": ["춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "고성군", "양양군"],
  "충북": ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"],
  "충남": ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"],
  "전북": ["전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군", "무주군", "장수군", "임실군", "순창군", "고창군", "부안군"],
  "전남": ["목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군", "함평군", "영광군", "장성군", "완도군", "진도군", "신안군"],
  "경북": ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"],
  "경남": ["창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시", "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군"],
  "제주": ["제주시", "서귀포시"],
};

const PROVINCE_ALIASES: Record<string, string[]> = {
  서울: ["서울", "서울특별시"],
  부산: ["부산", "부산광역시"],
  대구: ["대구", "대구광역시"],
  인천: ["인천", "인천광역시"],
  광주: ["광주", "광주광역시"],
  대전: ["대전", "대전광역시"],
  울산: ["울산", "울산광역시"],
  세종: ["세종", "세종특별자치시"],
  경기: ["경기", "경기도"],
  강원: ["강원", "강원도", "강원특별자치도"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  전북: ["전북", "전라북도", "전북특별자치도"],
  전남: ["전남", "전라남도"],
  경북: ["경북", "경상북도"],
  경남: ["경남", "경상남도"],
  제주: ["제주", "제주도", "제주특별자치도"],
};

function inferRegion(address: string) {
  const value = address.trim();
  if (!value) return { province: "", district: "" };

  for (const [province, aliases] of Object.entries(PROVINCE_ALIASES)) {
    if (!aliases.some((alias) => value.includes(alias))) continue;

    const districts = REGION_OPTIONS[province] || [];
    const district =
      districts.find((item) => value.includes(item)) ||
      (province === "세종" ? "세종시" : "");

    return { province, district };
  }

  return { province: "", district: "" };
}

function formatDateTime(value: string | null) {
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

function getRemainingDays(value: string | null) {
  if (!value) return 0;
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-emerald-400">✓</span>
      <span>{text}</span>
    </div>
  );
}


export default function PremiumAdManager() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const [selectedPlanCode, setSelectedPlanCode] =
    useState<PlanCode>("nationwide");
  const [regionSelections, setRegionSelections] = useState<RegionSelection[]>([
    { province: "", district: "" },
  ]);

  const [availabilityByRegion, setAvailabilityByRegion] = useState<
    Record<string, Availability>
  >({});
  const [myAds, setMyAds] = useState<AdSlot[]>([]);
  const [positionByAdId, setPositionByAdId] = useState<
    Record<string, PositionInfo>
  >({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedPlan = PLAN_BY_CODE[selectedPlanCode];
  const businessLabel =
    BUSINESS_TYPE_LABELS[businessType] || "업종 미설정";

  const selectedRegions = useMemo(
    () => regionSelections.map(buildRegion).filter(Boolean),
    [regionSelections]
  );

  const activeAds = useMemo(() => {
    const now = Date.now();

    return myAds.filter((ad) => {
      if (ad.status === "active") {
        return Boolean(ad.ends_at && new Date(ad.ends_at).getTime() > now);
      }

      if (ad.status === "reserved") {
        return Boolean(
          ad.reserved_until &&
            new Date(ad.reserved_until).getTime() > now
        );
      }

      return false;
    });
  }, [myAds]);

  const activeAdGroups = useMemo(() => {
    const groups = new Map<string, AdSlot[]>();

    for (const ad of activeAds) {
      const key = ad.order_id || ad.id;
      const rows = groups.get(key) || [];
      rows.push(ad);
      groups.set(key, rows);
    }

    return Array.from(groups.entries())
      .map(([key, rows]) => ({
        key,
        rows: rows.sort((a, b) => a.region.localeCompare(b.region, "ko")),
      }))
      .sort((a, b) => {
        const aTime = new Date(a.rows[0]?.created_at || 0).getTime();
        const bTime = new Date(b.rows[0]?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [activeAds]);

  const loadMyAds = useCallback(async (userId: string) => {
    const { data, error: adError } = await supabase
      .from("premium_ad_slots")
      .select(
        "id,business_user_id,region,region_key,business_type,status,amount,order_id,reserved_until,starts_at,ends_at,created_at,plan_code,ad_tier,duration_days"
      )
      .eq("business_user_id", userId)
      .order("created_at", { ascending: false });

    if (adError) throw adError;

    const rows = (data ?? []) as AdSlot[];
    setMyAds(rows);

    const activeRows = rows.filter(
      (row) =>
        row.status === "active" &&
        row.ends_at &&
        new Date(row.ends_at).getTime() > Date.now()
    );

    const entries = await Promise.all(
      activeRows.map(async (ad) => {
        const { data: positionData, error: positionError } =
          await supabase.rpc("get_ad_position", {
            p_ad_id: ad.id,
          });

        if (positionError) {
          console.error("AD POSITION ERROR:", positionError);
          return [
            ad.id,
            {
              slotPosition: null,
              capacity: null,
            } satisfies PositionInfo,
          ] as const;
        }

        const row = positionData?.[0] as
          | {
              slot_position?: number | string;
              capacity?: number | string;
            }
          | undefined;

        return [
          ad.id,
          {
            slotPosition: row?.slot_position
              ? Number(row.slot_position)
              : null,
            capacity: row?.capacity ? Number(row.capacity) : null,
          } satisfies PositionInfo,
        ] as const;
      })
    );

    setPositionByAdId(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("로그인이 필요합니다.");

        const { data: profile, error: profileError } = await supabase
          .from("business_profiles")
          .select("business_name,business_type,address")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!mounted) return;

        const nextAddress = profile?.address || "";
        setBusinessName(profile?.business_name || "");
        setBusinessType(profile?.business_type || "");
        setBusinessAddress(nextAddress);

        const inferred = inferRegion(nextAddress);
        setRegionSelections([
          {
            province: inferred.province,
            district: inferred.district,
          },
        ]);

        await loadMyAds(user.id);
      } catch (err) {
        console.error("AD LOAD ERROR:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "상위노출 광고 정보를 불러오지 못했습니다."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [loadMyAds]);

  function choosePlan(code: PlanCode) {
    const plan = PLAN_BY_CODE[code];
    setSelectedPlanCode(code);
    setAvailabilityByRegion({});
    setError("");
    setMessage("");

    if (plan.regionCount === 0) {
      setRegionSelections([]);
      return;
    }

    setRegionSelections((current) => {
      const next = Array.from({ length: plan.regionCount }, (_, index) => {
        return current[index] || { province: "", district: "" };
      });

      if (
        next[0] &&
        !next[0].province &&
        !next[0].district &&
        businessAddress
      ) {
        next[0] = inferRegion(businessAddress);
      }

      return next;
    });
  }

  function updateRegionSelection(
    index: number,
    field: "province" | "district",
    value: string
  ) {
    setRegionSelections((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "province") {
          return {
            province: value,
            district: "",
          };
        }

        return {
          ...item,
          district: value,
        };
      })
    );

    setAvailabilityByRegion({});
    setError("");
    setMessage("");
  }

  function validateRegions(plan: PlanConfig) {
    if (plan.regionCount === 0) return ["전국"];

    if (selectedRegions.length !== plan.regionCount) {
      throw new Error(
        `${plan.name} 상품은 서로 다른 지역 ${plan.regionCount}곳을 모두 선택해주세요.`
      );
    }

    const unique = new Set(selectedRegions);
    if (unique.size !== plan.regionCount) {
      throw new Error("같은 지역을 중복해서 선택할 수 없습니다.");
    }

    return selectedRegions;
  }

  async function checkAvailabilityForPlan(
    plan = selectedPlan,
    silent = false
  ) {
    if (!businessType) {
      if (!silent) setError("설정에서 업체 업종을 먼저 선택해주세요.");
      return null;
    }

    setChecking(true);

    if (!silent) {
      setError("");
      setMessage("");
    }

    try {
      const regions = validateRegions(plan);
      const next: Record<string, Availability> = {};

      for (const region of regions) {
        const { data, error: rpcError } = await supabase.rpc(
          "get_ad_plan_availability",
          {
            p_plan_code: plan.code,
            p_region: region,
            p_business_type: businessType,
          }
        );

        if (rpcError) throw rpcError;

        const row = data?.[0] as
          | {
              capacity?: number | string;
              occupied?: number | string;
              remaining?: number | string;
              sold_out?: boolean;
            }
          | undefined;

        if (!row) {
          throw new Error(`${region} 자리 정보를 확인하지 못했습니다.`);
        }

        next[region] = {
          capacity: Number(row.capacity || plan.capacity),
          occupied: Number(row.occupied || 0),
          remaining: Number(row.remaining || 0),
          sold_out: Boolean(row.sold_out),
        };
      }

      setAvailabilityByRegion(next);

      const soldOutRegions = Object.entries(next)
        .filter(([, item]) => item.sold_out || item.remaining <= 0)
        .map(([region]) => region);

      if (soldOutRegions.length > 0 && !silent) {
        setError(
          `현재 모집 마감 지역: ${soldOutRegions.join(", ")}`
        );
      } else if (!silent) {
        setMessage(
          plan.regionCount === 0
            ? `전국 ${businessLabel} 광고 신청이 가능합니다.`
            : `${regions.join(", ")} 광고 신청이 가능합니다.`
        );
      }

      return { regions, availability: next, soldOutRegions };
    } catch (err) {
      console.error("AD AVAILABILITY ERROR:", err);

      if (!silent) {
        setError(
          err instanceof Error
            ? err.message
            : "광고 자리 확인 중 오류가 발생했습니다."
        );
      }

      return null;
    } finally {
      setChecking(false);
    }
  }

  async function startAdPayment() {
    if (paying) return;

    setError("");
    setMessage("");

    try {
      if (!businessType) {
        throw new Error("설정에서 업체 업종을 먼저 선택해주세요.");
      }

      const checked = await checkAvailabilityForPlan(selectedPlan, true);
      if (!checked) {
        throw new Error("광고 자리 정보를 확인하지 못했습니다.");
      }

      if (checked.soldOutRegions.length > 0) {
        throw new Error(
          `현재 모집 마감 지역이 포함되어 있습니다: ${checked.soldOutRegions.join(
            ", "
          )}`
        );
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error("토스 결제 클라이언트 키가 설정되지 않았습니다.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const randomPart = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 16);

      // Toss Payments orderId는 6~64자만 허용됩니다.
      // UUID 전체를 넣으면 64자를 넘기므로 사용자 ID 일부만 사용합니다.
      const shortUserId = user.id.replace(/-/g, "").slice(0, 12);
      const orderId = `adplan_${shortUserId}_${selectedPlan.code}_${randomPart}`;

      setPaying(true);

      const { data: reservationData, error: reservationError } =
        await supabase.rpc("reserve_ad_plan", {
          p_plan_code: selectedPlan.code,
          p_regions:
            selectedPlan.regionCount === 0 ? [] : checked.regions,
          p_business_type: businessType,
          p_order_id: orderId,
        });

      if (reservationError) {
        const rawMessage = reservationError.message || "";

        if (
          rawMessage.includes("AD_SOLD_OUT") ||
          rawMessage.includes("마감")
        ) {
          throw new Error(
            "방금 마지막 광고 자리가 마감되었습니다. 다시 자리를 확인해주세요."
          );
        }

        throw reservationError;
      }

      const reservation = reservationData?.[0] as
        | {
            reservation_count?: number | string;
            reserved_until?: string;
            remaining_min?: number | string;
          }
        | undefined;

      if (reservation) {
        setMessage(
          `광고 자리 ${Number(
            reservation.reservation_count || 1
          )}개를 결제 대기 상태로 확보했습니다. 결제를 완료해주세요.`
        );
      }

      const tossPayments = await loadTossPayments(clientKey);
      const widgets = tossPayments.widgets({
        customerKey: user.id,
      });

      await widgets.setAmount({
        currency: "KRW",
        value: selectedPlan.price,
      });

      const paymentWindow = await widgets.renderPaymentWindow();

      paymentWindow.on("paymentRequest", async () => {
        try {
          const regionText =
            selectedPlan.regionCount === 0
              ? "전국"
              : checked.regions.join(", ");

          await widgets.requestPayment({
            orderId,
            orderName: `해결소 ${selectedPlan.name} 광고 - ${regionText}`,
            customerEmail: user.email || undefined,
            successUrl: `${window.location.origin}/payment/success?product=ad_plan`,
            failUrl: `${window.location.origin}/payment/fail`,
            windowTarget: "self",
          });
        } catch (paymentError) {
          console.error("AD WIDGET REQUEST ERROR:", paymentError);

          const paymentMessage =
            paymentError &&
            typeof paymentError === "object" &&
            "message" in paymentError &&
            typeof (paymentError as { message?: unknown }).message ===
              "string"
              ? (paymentError as { message: string }).message
              : "토스 결제 요청 중 오류가 발생했습니다.";

          setError(paymentMessage);
          window.alert(`결제 요청 오류: ${paymentMessage}`);
          setPaying(false);
        }
      });
    } catch (err) {
      console.error("AD PAYMENT ERROR:", err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === "object" &&
              "message" in err &&
              typeof (err as { message?: unknown }).message === "string"
            ? (err as { message: string }).message
            : "광고 결제를 시작하지 못했습니다.";

      setError(errorMessage);
    } finally {
      setPaying(false);
    }
  }

  async function cancelPendingAdOrder(orderId: string | null) {
    if (!orderId || cancellingOrderId) return;

    const confirmed = window.confirm(
      "결제 대기 중인 광고 예약을 취소할까요?\n선택한 광고 자리가 즉시 다시 열립니다."
    );

    if (!confirmed) return;

    setCancellingOrderId(orderId);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const { data, error: cancelError } = await supabase.rpc(
        "cancel_my_ad_order",
        {
          p_order_id: orderId,
        }
      );

      if (cancelError) throw cancelError;

      const cancelledCount = Number(data?.[0]?.cancelled_count || 0);

      if (cancelledCount <= 0) {
        throw new Error(
          "취소할 결제 대기 광고가 없습니다. 이미 만료되었거나 처리된 예약일 수 있습니다."
        );
      }

      setMessage(
        `결제 대기 광고 ${cancelledCount}개를 취소했습니다. 광고 자리가 즉시 다시 열렸습니다.`
      );
      setAvailabilityByRegion({});
      await loadMyAds(user.id);
    } catch (err) {
      console.error("AD RESERVATION CANCEL ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "결제 대기 광고 취소 중 오류가 발생했습니다."
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-400 shadow-sm">
          상위노출 광고 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  const availabilityEntries = Object.entries(availabilityByRegion);
  const hasSoldOut = availabilityEntries.some(
    ([, item]) => item.sold_out || item.remaining <= 0
  );

  return (
    <div className="mx-auto max-w-7xl pb-28 lg:pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-blue-600">
              ADVERTISING PLANS
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              해결소 상위노출 광고
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              전국에서 원하는 광고 지역을 직접 선택할 수 있습니다.
              같은 등급 안에서는 광고 시작이 빠른 업체부터 앞자리에
              노출되고, 앞 업체의 광고가 종료되면 뒤 업체가 자동으로
              한 자리씩 올라갑니다.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-[11px] font-black text-slate-400">
              내 업체
            </p>
            <p className="mt-1 text-sm font-black">
              {businessName || "업체명 미설정"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {businessLabel}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold leading-6 text-emerald-700">
          {message}
        </div>
      )}

      {activeAdGroups.length > 0 && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-emerald-600">
            MY ADS
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            이용 중인 광고
          </h3>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {activeAdGroups.map((group) => {
              const first = group.rows[0];
              const planCode =
                first.plan_code && PLAN_BY_CODE[first.plan_code]
                  ? first.plan_code
                  : "premium_1";
              const plan = PLAN_BY_CODE[planCode];

              return (
                <div
                  key={group.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                        {plan.badge}
                      </span>
                      <h4 className="mt-3 text-lg font-black text-slate-950">
                        {plan.name}
                      </h4>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatPrice(Number(first.amount || plan.price))}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400">
                        {first.status === "active"
                          ? "이용 중"
                          : "결제 대기"}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {first.status === "active"
                          ? `남은 ${getRemainingDays(first.ends_at)}일`
                          : "15분 예약"}
                      </p>

                      {first.status === "reserved" && (
                        <button
                          type="button"
                          onClick={() =>
                            void cancelPendingAdOrder(first.order_id)
                          }
                          disabled={
                            !first.order_id ||
                            cancellingOrderId === first.order_id
                          }
                          className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingOrderId === first.order_id
                            ? "취소 중..."
                            : "결제 대기 취소"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {group.rows.map((ad) => {
                      const position = positionByAdId[ad.id];

                      return (
                        <div
                          key={ad.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {ad.region}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-slate-400">
                              {ad.status === "active"
                                ? `종료 ${formatDateTime(ad.ends_at)}`
                                : `예약 ${formatDateTime(
                                    ad.reserved_until
                                  )}까지`}
                            </p>
                          </div>

                          {ad.status === "active" &&
                            position?.slotPosition && (
                              <div className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                                현재 {position.slotPosition}번 자리
                                {position.capacity
                                  ? ` / ${position.capacity}`
                                  : ""}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6">
        <p className="text-xs font-black tracking-[0.18em] text-blue-600">
          SELECT PLAN
        </p>
        <h3 className="mt-2 text-xl font-black text-slate-950">
          광고 상품 선택
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AD_PLANS.map((plan) => {
            const selected = selectedPlanCode === plan.code;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => choosePlan(plan.code)}
                className={`rounded-3xl border p-5 text-left transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-black tracking-[0.16em] ${
                        selected ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {plan.badge}
                    </p>
                    <h4 className="mt-2 text-lg font-black text-slate-950">
                      {plan.name}
                    </h4>
                  </div>

                  {selected && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
                      선택됨
                    </span>
                  )}
                </div>

                <p className="mt-4 text-2xl font-black text-slate-950">
                  {formatPrice(plan.price)}
                </p>

                <p className="mt-1 text-xs font-black text-slate-500">
                  {plan.duration}일 ·{" "}
                  {plan.regionCount === 0
                    ? "전국"
                    : `지역 ${plan.regionCount}곳`}
                </p>

                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                  {plan.tier === "nationwide"
                    ? `업종별 최대 ${plan.capacity}업체`
                    : `지역·업종별 최대 ${plan.capacity}업체`}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-blue-600">
            APPLY
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            {selectedPlan.name} 신청
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <StatusBox
              label="내 업체"
              value={businessName || "업체명 미설정"}
            />
            <StatusBox label="업종" value={businessLabel} />
          </div>

          {selectedPlan.regionCount === 0 ? (
            <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <p className="text-sm font-black text-violet-900">
                전국 프리미엄
              </p>
              <p className="mt-2 text-sm leading-6 text-violet-700">
                고객 지역과 관계없이 <strong>{businessLabel}</strong>을
                선택한 고객에게 전국 프리미엄 영역으로 노출됩니다.
                업종별 최대 5개 업체만 이용할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {regionSelections.map((selection, index) => {
                const districts =
                  REGION_OPTIONS[selection.province] || [];

                return (
                  <div
                    key={`${selectedPlan.code}-${index}`}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="mb-3 text-xs font-black text-slate-500">
                      광고 지역 {index + 1}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={selection.province}
                        onChange={(event) =>
                          updateRegionSelection(
                            index,
                            "province",
                            event.target.value
                          )
                        }
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="">시/도 선택</option>
                        {Object.keys(REGION_OPTIONS).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selection.district}
                        onChange={(event) =>
                          updateRegionSelection(
                            index,
                            "district",
                            event.target.value
                          )
                        }
                        disabled={!selection.province}
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-300 focus:border-blue-500"
                      >
                        <option value="">시/군/구 선택</option>
                        {districts.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {businessAddress && (
            <p className="mt-4 text-xs font-bold text-slate-400">
              업체 주소: {businessAddress}
            </p>
          )}

          <button
            type="button"
            onClick={() => void checkAvailabilityForPlan()}
            disabled={checking}
            className="mt-5 w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-sm font-black text-blue-700 disabled:opacity-50"
          >
            {checking ? "자리 확인 중..." : "선택한 상품 자리 확인"}
          </button>

          {availabilityEntries.length > 0 && (
            <div className="mt-5 space-y-3">
              {availabilityEntries.map(([region, item]) => (
                <div
                  key={region}
                  className={`rounded-2xl border p-4 ${
                    item.sold_out || item.remaining <= 0
                      ? "border-red-200 bg-red-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-black ${
                          item.sold_out || item.remaining <= 0
                            ? "text-red-700"
                            : "text-emerald-800"
                        }`}
                      >
                        {region} · {businessLabel}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        현재 {item.occupied} / {item.capacity} 업체 이용 중
                      </p>
                    </div>

                    <p
                      className={`text-lg font-black ${
                        item.sold_out || item.remaining <= 0
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {item.remaining <= 0
                        ? "모집 마감"
                        : `잔여 ${item.remaining}자리`}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-10 gap-1">
                    {Array.from(
                      { length: Math.min(item.capacity, 30) },
                      (_, index) => (
                        <span
                          key={index}
                          className={`h-2 rounded-full ${
                            index < item.occupied
                              ? "bg-slate-400"
                              : "bg-white ring-1 ring-slate-200"
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void startAdPayment()}
            disabled={paying || hasSoldOut}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {hasSoldOut
              ? "현재 모집 마감"
              : paying
                ? "결제 준비 중..."
                : `${formatPrice(
                    selectedPlan.price
                  )} 결제하고 광고 시작`}
          </button>

          <p className="mt-3 text-center text-[11px] font-bold leading-5 text-slate-400">
            결제 시작 시 선택한 광고 자리는 최대 15분 동안 임시 확보됩니다.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-amber-400">
            SELECTED PLAN
          </p>

          <h3 className="mt-3 text-2xl font-black">
            {selectedPlan.name}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {selectedPlan.description}
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-5">
            <p className="text-[11px] font-bold text-slate-400">
              광고 가격
            </p>
            <p className="mt-1 text-3xl font-black">
              {formatPrice(selectedPlan.price)}
            </p>
            <p className="mt-1 text-xs font-black text-amber-400">
              {selectedPlan.duration}일 ·{" "}
              {selectedPlan.regionCount === 0
                ? "전국"
                : `지역 ${selectedPlan.regionCount}곳`}
            </p>
          </div>

          <div className="mt-6 space-y-4 text-sm font-bold leading-6 text-slate-200">
            <Benefit
              text={
                selectedPlan.regionCount === 0
                  ? "고객 지역과 관계없이 해당 업종 고객에게 전국 노출"
                  : "전국 모든 시/도에서 원하는 광고 지역 직접 선택"
              }
            />
            <Benefit
              text={`동일 등급 내 광고 시작 빠른 순으로 자리 배정`}
            />
            <Benefit
              text="앞 업체 종료 시 뒤 업체가 자동으로 한 자리씩 상승"
            />
            <Benefit
              text={
                selectedPlan.tier === "nationwide"
                  ? "업종별 전국 프리미엄 최대 5개 업체 한정"
                  : selectedPlan.tier === "premium"
                    ? "지역·업종별 프리미엄 최대 10개 업체 한정"
                    : selectedPlan.tier === "best"
                      ? "지역·업종별 베스트 최대 20개 업체"
                      : "지역·업종별 라이트 최대 30개 업체"
              }
            />
            <Benefit text="기간 종료 시 자동으로 노출 종료 및 자리 재오픈" />
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black text-slate-300">
              고객 화면 노출 순서
            </p>
            <p className="mt-2 text-sm font-black leading-7 text-white">
              전국 프리미엄
              <br />
              ↓
              <br />
              지역 프리미엄
              <br />
              ↓
              <br />
              베스트
              <br />
              ↓
              <br />
              라이트
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
