import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      businessType,
      serviceType,
      name,
      phone,
      region,
      inquiry,
    } = body;

    if (!businessType) {
      return NextResponse.json(
        { error: "서비스 업종을 선택해주세요." },
        { status: 400 }
      );
    }

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "이름과 연락처를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!region?.trim()) {
      return NextResponse.json(
        { error: "서비스 지역을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!inquiry?.trim()) {
      return NextResponse.json(
        { error: "원하시는 작업 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        business_type: businessType,
        service_type: serviceType?.trim() || null,
        name: name.trim(),
        phone: phone.trim(),
        region: region.trim(),
        inquiry: inquiry.trim(),
        status: "접수",
      })
      .select("id")
      .single();

    if (error) {
      console.error("SERVICE REQUEST INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error("SERVICE REQUEST API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "문의 접수 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}