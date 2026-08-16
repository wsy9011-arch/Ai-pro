import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUBSCRIPTION_AMOUNT = 99000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authKey = String(body.authKey || "");
    const customerKey = String(body.customerKey || "");
    const orderId = String(body.orderId || "");

    if (!authKey || !customerKey || !orderId) {
      return NextResponse.json(
        {
          message: "정기결제 인증 정보가 없습니다.",
        },
        { status: 400 }
      );
    }

    const tossSecretKey =
      process.env.TOSS_SECRET_KEY;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!tossSecretKey) {
      return NextResponse.json(
        {
          message:
            "TOSS_SECRET_KEY 환경변수가 없습니다.",
        },
        { status: 500 }
      );
    }

    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      return NextResponse.json(
        {
          message:
            "Supabase 서버 환경변수가 없습니다.",
        },
        { status: 500 }
      );
    }

    const authorization =
      Buffer.from(
        `${tossSecretKey}:`
      ).toString("base64");

    // 1. 카드 인증 결과로 빌링키 발급
    const billingKeyResponse =
      await fetch(
        "https://api.tosspayments.com/v1/billing/authorizations/issue",
        {
          method: "POST",
          headers: {
            Authorization:
              `Basic ${authorization}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            authKey,
            customerKey,
          }),
        }
      );

    const billingResult =
      await billingKeyResponse.json();

    if (!billingKeyResponse.ok) {
      return NextResponse.json(
        {
          message:
            billingResult?.message ||
            "카드 자동결제 등록에 실패했습니다.",
        },
        {
          status:
            billingKeyResponse.status,
        }
      );
    }

    const billingKey =
      billingResult?.billingKey;

    if (!billingKey) {
      return NextResponse.json(
        {
          message:
            "빌링키를 발급받지 못했습니다.",
        },
        { status: 500 }
      );
    }

    // 2. 첫 달 99,000원 결제
    const paymentResponse =
      await fetch(
        `https://api.tosspayments.com/v1/billing/${encodeURIComponent(
          billingKey
        )}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Basic ${authorization}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            customerKey,
            amount:
              SUBSCRIPTION_AMOUNT,
            orderId,
            orderName:
              "견적AI 무제한 월 구독",
          }),
          signal:
            AbortSignal.timeout(65000),
        }
      );

    const paymentResult =
      await paymentResponse.json();

    if (!paymentResponse.ok) {
      return NextResponse.json(
        {
          message:
            paymentResult?.message ||
            "첫 달 정기결제 승인에 실패했습니다.",
        },
        {
          status:
            paymentResponse.status,
        }
      );
    }

    // 다음 결제일 = 한 달 후
    const nextPayment =
      new Date();

    nextPayment.setMonth(
      nextPayment.getMonth() + 1
    );

    // Supabase 관리자 클라이언트
    const supabaseAdmin =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // 3. 무제한 플랜 적용
    const { error: planError } =
      await supabaseAdmin
        .from("user_plans")
        .upsert(
          {
            user_id: customerKey,
            plan: "unlimited",
            remaining_count: 0,
            unlimited: true,

            subscription_status:
              "active",

            billing_customer_key:
              customerKey,

            billing_key:
              billingKey,

            subscription_started_at:
              new Date().toISOString(),

            subscription_next_payment_at:
              nextPayment.toISOString(),

            subscription_cancelled_at:
              null,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

    if (planError) {
      console.error(
        "SUBSCRIPTION PLAN UPDATE ERROR:",
        planError
      );

      return NextResponse.json(
        {
          message:
            "결제는 승인됐지만 무제한 플랜 적용에 실패했습니다. 관리자에게 문의해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentKey:
        paymentResult.paymentKey,
      nextPaymentAt:
        nextPayment.toISOString(),
    });
  } catch (error) {
    console.error(
      "TOSS BILLING ISSUE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "정기결제 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}