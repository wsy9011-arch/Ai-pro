import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ConfirmBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfirmBody;
    const paymentKey = body.paymentKey?.trim();
    const orderId = body.orderId?.trim();
    const amount = Number(body.amount);

    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, message: "잘못된 결제 승인 요청입니다." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!supabaseUrl || !serviceRoleKey || !tossSecretKey) {
      return NextResponse.json(
        { ok: false, message: "서버 결제 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: paymentRow, error: paymentError } = await admin
      .from("booking_payments")
      .select(
        "id, booking_id, order_id, amount, status, bookings!inner(booking_number, status, payment_status, deposit_amount)"
      )
      .eq("order_id", orderId)
      .maybeSingle();

    if (paymentError || !paymentRow) {
      return NextResponse.json(
        { ok: false, message: "결제 주문정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const bookingJoin = Array.isArray(paymentRow.bookings)
      ? paymentRow.bookings[0]
      : paymentRow.bookings;

    if (paymentRow.status === "DONE") {
      return NextResponse.json({
        ok: true,
        bookingNumber: bookingJoin?.booking_number ?? "",
      });
    }

    if (Number(paymentRow.amount) !== amount) {
      return NextResponse.json(
        { ok: false, message: "결제 금액이 예약금과 일치하지 않습니다." },
        { status: 400 }
      );
    }

    if (
      !bookingJoin ||
      bookingJoin.status !== "예약금대기" ||
      bookingJoin.payment_status !== "미결제" ||
      Number(bookingJoin.deposit_amount) !== amount
    ) {
      return NextResponse.json(
        { ok: false, message: "현재 결제할 수 있는 예약 상태가 아닙니다." },
        { status: 409 }
      );
    }

    const encodedSecret = Buffer.from(`${tossSecretKey}:`).toString("base64");

    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      await admin
        .from("booking_payments")
        .update({
          last_error: JSON.stringify(tossData).slice(0, 3000),
        })
        .eq("order_id", orderId);

      return NextResponse.json(
        {
          ok: false,
          message:
            tossData?.message ||
            "토스페이먼츠 결제 승인에 실패했습니다.",
        },
        { status: tossResponse.status }
      );
    }

    const { data: finalized, error: finalizeError } = await admin.rpc(
      "finalize_booking_deposit_payment",
      {
        p_order_id: orderId,
        p_payment_key: paymentKey,
        p_amount: amount,
      }
    );

    if (finalizeError) {
      console.error("FINALIZE ERROR:", finalizeError);
      return NextResponse.json(
        {
          ok: false,
          message:
            "결제는 승인되었지만 예약 상태 저장에 실패했습니다. 관리자에게 문의해주세요.",
        },
        { status: 500 }
      );
    }

    const result = Array.isArray(finalized) ? finalized[0] : finalized;

    return NextResponse.json({
      ok: true,
      bookingNumber: result?.booking_number ?? bookingJoin.booking_number,
    });
  } catch (error) {
    console.error("DEPOSIT CONFIRM ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "결제 승인 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
