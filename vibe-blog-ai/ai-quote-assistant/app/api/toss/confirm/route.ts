import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const QUOTE_PLANS = {
  starter: {
    amount: 29900,
    plan: "starter",
    remainingCount: 30,
    unlimited: false,
  },
  pro: {
    amount: 49900,
    plan: "pro",
    remainingCount: 100,
    unlimited: false,
  },
} as const;

const AD_PLANS = {
  light: {
    amount: 9900,
    name: "라이트",
  },
  best: {
    amount: 29900,
    name: "베스트",
  },
  premium_1: {
    amount: 59900,
    name: "프리미엄",
  },
  premium_3: {
    amount: 149000,
    name: "프리미엄 3지역",
  },
  premium_5: {
    amount: 229000,
    name: "프리미엄 5지역",
  },
  nationwide: {
    amount: 399000,
    name: "전국 프리미엄",
  },
} as const;

type AdPlanCode = keyof typeof AD_PLANS;

async function confirmTossPayment({
  tossSecretKey,
  paymentKey,
  orderId,
  amount,
}: {
  tossSecretKey: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const encodedSecretKey = Buffer.from(`${tossSecretKey}:`).toString(
    "base64"
  );

  const response = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message || "토스 결제 승인에 실패했습니다."
    );
  }

  return {
    result,
    encodedSecretKey,
  };
}

async function cancelTossPayment({
  encodedSecretKey,
  paymentKey,
  reason,
}: {
  encodedSecretKey: string;
  paymentKey: string;
  reason: string;
}) {
  try {
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(
        paymentKey
      )}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: reason,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("TOSS AUTO CANCEL FAILED:", result);
      return false;
    }

    return true;
  } catch (error) {
    console.error("TOSS AUTO CANCEL ERROR:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const paymentKey = String(body.paymentKey || "");
    const orderId = String(body.orderId || "");
    const amount = Number(body.amount || 0);

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { message: "결제 승인에 필요한 정보가 없습니다." },
        { status: 400 }
      );
    }

    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!tossSecretKey) {
      return NextResponse.json(
        { message: "TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          message:
            "Supabase 서버 환경변수가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =========================================================
    // 해결소 광고상품 결제
    // =========================================================
    if (
      orderId.startsWith("adplan_") ||
      orderId.startsWith("premiumad_")
    ) {
      const { data: adOrders, error: adOrderError } =
        await supabaseAdmin
          .from("premium_ad_slots")
          .select(
            "id,business_user_id,amount,status,reserved_until,starts_at,ends_at,payment_key,region,business_type,plan_code,ad_tier,duration_days"
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

      if (adOrderError) {
        console.error("AD ORDER LOAD ERROR:", adOrderError);

        return NextResponse.json(
          { message: "광고 주문 정보를 확인하지 못했습니다." },
          { status: 500 }
        );
      }

      if (!adOrders || adOrders.length === 0) {
        return NextResponse.json(
          { message: "광고 주문 정보를 찾을 수 없습니다." },
          { status: 400 }
        );
      }

      const first = adOrders[0];
      const rawPlanCode =
        String(first.plan_code || "premium_1") as AdPlanCode;
      const planInfo = AD_PLANS[rawPlanCode];

      if (!planInfo) {
        return NextResponse.json(
          { message: "올바르지 않은 광고 상품입니다." },
          { status: 400 }
        );
      }

      const invalidRow = adOrders.some(
        (row) =>
          String(row.plan_code || "premium_1") !== rawPlanCode ||
          Number(row.amount) !== planInfo.amount
      );

      if (invalidRow || amount !== planInfo.amount) {
        return NextResponse.json(
          {
            message:
              "광고 결제 금액 또는 상품 정보가 주문 정보와 일치하지 않습니다.",
          },
          { status: 400 }
        );
      }

      const allActive = adOrders.every(
        (row) =>
          row.status === "active" &&
          row.ends_at &&
          new Date(row.ends_at).getTime() > Date.now()
      );

      // 성공 페이지 새로고침 등 재호출 시 중복 승인 방지
      if (allActive) {
        const startsAt = adOrders
          .map((row) => row.starts_at)
          .filter(Boolean)
          .sort()[0];

        const endsAt = adOrders
          .map((row) => row.ends_at)
          .filter(Boolean)
          .sort()
          .at(-1);

        return NextResponse.json({
          success: true,
          product: "ad_plan",
          planCode: rawPlanCode,
          planName: planInfo.name,
          regions: adOrders.map((row) => row.region),
          activatedCount: adOrders.length,
          startsAt,
          endsAt,
          paymentKey: first.payment_key || paymentKey,
        });
      }

      const invalidStatus = adOrders.some(
        (row) => row.status !== "reserved"
      );

      if (invalidStatus) {
        return NextResponse.json(
          { message: "현재 결제할 수 없는 광고 주문입니다." },
          { status: 409 }
        );
      }

      const reservationExpired = adOrders.some(
        (row) =>
          !row.reserved_until ||
          new Date(row.reserved_until).getTime() <= Date.now()
      );

      if (reservationExpired) {
        await supabaseAdmin
          .from("premium_ad_slots")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", orderId)
          .eq("status", "reserved");

        return NextResponse.json(
          {
            message:
              "광고 자리 예약 시간이 만료되었습니다. 다시 자리를 확인하고 신청해주세요.",
          },
          { status: 409 }
        );
      }

      const { result: tossResult, encodedSecretKey } =
        await confirmTossPayment({
          tossSecretKey,
          paymentKey,
          orderId,
          amount,
        });

      const { data: activatedRows, error: activationError } =
        await supabaseAdmin.rpc("activate_ad_order", {
          p_order_id: orderId,
          p_payment_key: paymentKey,
        });

      if (activationError || !activatedRows?.[0]) {
        console.error("AD ACTIVATION ERROR:", activationError);

        const cancelled = await cancelTossPayment({
          encodedSecretKey,
          paymentKey,
          reason: "해결소 광고상품 적용 실패 자동 취소",
        });

        return NextResponse.json(
          {
            message: cancelled
              ? "광고 적용 중 문제가 발생해 결제가 자동 취소되었습니다. 다시 신청해주세요."
              : "결제는 승인됐지만 광고 적용에 실패했습니다. 관리자 확인이 필요합니다.",
          },
          { status: 500 }
        );
      }

      const activated = activatedRows[0] as {
        activated_count: number | string;
        starts_at: string;
        ends_at: string;
      };

      return NextResponse.json({
        success: true,
        product: "ad_plan",
        planCode: rawPlanCode,
        planName: planInfo.name,
        regions: adOrders.map((row) => row.region),
        activatedCount: Number(activated.activated_count || adOrders.length),
        startsAt: activated.starts_at,
        endsAt: activated.ends_at,
        paymentKey: tossResult.paymentKey,
      });
    }

    // =========================================================
    // 기존 견적AI 이용권 결제
    // =========================================================
    const orderMatch = orderId.match(
      /^quote_(starter|pro)_([0-9a-fA-F-]{36})_([A-Za-z0-9-]+)$/
    );

    if (!orderMatch) {
      return NextResponse.json(
        { message: "올바르지 않은 주문번호입니다." },
        { status: 400 }
      );
    }

    const planKey = orderMatch[1] as keyof typeof QUOTE_PLANS;
    const userId = orderMatch[2];
    const planInfo = QUOTE_PLANS[planKey];

    if (amount !== planInfo.amount) {
      return NextResponse.json(
        { message: "결제 금액이 상품 금액과 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const { result: tossResult } = await confirmTossPayment({
      tossSecretKey,
      paymentKey,
      orderId,
      amount,
    });

    const { error: planError } = await supabaseAdmin
      .from("user_plans")
      .upsert(
        {
          user_id: userId,
          plan: planInfo.plan,
          remaining_count: planInfo.remainingCount,
          unlimited: planInfo.unlimited,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (planError) {
      console.error("PLAN UPDATE ERROR:", planError);

      return NextResponse.json(
        {
          message:
            "결제는 승인됐지만 이용권 적용에 실패했습니다. 관리자에게 문의해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: "quote_plan",
      plan: planInfo.plan,
      remainingCount: planInfo.remainingCount,
      paymentKey: tossResult.paymentKey,
    });
  } catch (error) {
    console.error("TOSS CONFIRM ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "결제 승인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
