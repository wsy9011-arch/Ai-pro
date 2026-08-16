import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type PriceItem = {
  item_name?: string;
  unit?: string;
  unit_price?: number | string;
  category?: string;
  description?: string | null;
  business_type?: string;
};

export async function POST(request: Request) {
  try {
    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    // 요청 데이터
    const body = await request.json();

    const {
      customerName,
      region,
      serviceType,
      inquiry,
      businessType,
      priceItems,
    } = body as {
      customerName?: string;
      region?: string;
      serviceType?: string;
      inquiry?: string;
      businessType?: string;
      priceItems?: PriceItem[];
    };

    // 문의 내용 확인
    if (!inquiry?.trim()) {
      return NextResponse.json(
        {
          error: "고객 문의 내용이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 단가표 정리
    const normalizedPriceItems = Array.isArray(priceItems)
      ? priceItems.map((item) => ({
          item_name: item.item_name || "",
          unit: item.unit || "",
          unit_price: Number(item.unit_price) || 0,
          category: item.category || "",
          description: item.description || "",
          business_type: item.business_type || businessType || "",
        }))
      : [];

    const priceTableText =
      normalizedPriceItems.length > 0
        ? normalizedPriceItems
            .map(
              (item) =>
                `- 품목: ${item.item_name}
  단위: ${item.unit}
  단가: ${item.unit_price.toLocaleString("ko-KR")}원
  분류: ${item.category}
  설명: ${item.description}`
            )
            .join("\n")
        : "등록된 단가표가 없습니다.";

    // AI 프롬프트
    const prompt = `
당신은 대한민국 소규모 시공업체와 서비스업체를 위한
"AI 견적 및 상담 보조 전문가"입니다.

고객 문의를 분석하고,
해당 업체의 업종과 등록된 단가표를 최대한 활용해서
사장님이 검토 후 사용할 수 있는 견적 초안을 작성하세요.

━━━━━━━━━━━━━━━━━━
[업체 정보]
━━━━━━━━━━━━━━━━━━

업종:
${businessType || "미입력"}

━━━━━━━━━━━━━━━━━━
[고객 정보]
━━━━━━━━━━━━━━━━━━

고객명:
${customerName || "미입력"}

지역:
${region || "미입력"}

서비스:
${serviceType || "미입력"}

고객 문의:
${inquiry}

━━━━━━━━━━━━━━━━━━
[업체 등록 단가표]
━━━━━━━━━━━━━━━━━━

${priceTableText}

━━━━━━━━━━━━━━━━━━
[견적 작성 규칙]
━━━━━━━━━━━━━━━━━━

1. 고객 문의 내용을 먼저 정확하게 분석하세요.

2. 업체 업종을 기준으로 견적을 작성하세요.

3. 등록된 단가표가 있다면 가능한 경우 반드시 등록된 단가를 우선 사용하세요.

4. 등록된 단가표와 고객 문의가 직접적으로 연결되는 경우
   임의의 인터넷 가격이나 다른 업체 가격을 사용하지 마세요.

5. 등록된 단가표에 없는 항목이 필요한 경우에는
   합리적인 예상 금액을 사용할 수 있지만,
   확정 견적이 아니라 예상 견적이라는 점을 고객 답변에 포함하세요.

6. 고객이 제공하지 않은 면적, 수량, 재료, 현장 상태 등을
   사실처럼 만들어내지 마세요.

7. 정보가 부족하면 보수적으로 계산하세요.

8. 대한민국 원화 기준으로 작성하세요.

9. materialCost, laborCost, otherCost에는
   숫자만 넣으세요.
   예:
   300000
   "300,000원" 금지

10. totalAmount는
    materialCost + laborCost + otherCost의 합계입니다.

11. 고객에게 보내는 답변은 자연스러운 존댓말로 작성하세요.

12. 고객 답변에는
    "현장 상태, 실제 수량, 작업 범위 등에 따라 최종 금액이 달라질 수 있다"
    는 취지의 내용을 포함하세요.

13. 견적 금액을 지나치게 확정적으로 표현하지 마세요.

14. 결과는 반드시 JSON 하나만 반환하세요.

15. JSON 앞뒤에 설명이나 마크다운을 붙이지 마세요.

━━━━━━━━━━━━━━━━━━
[반드시 사용할 JSON 구조]
━━━━━━━━━━━━━━━━━━

{
  "workDescription": "추천 작업 내용",
  "materialCost": 0,
  "laborCost": 0,
  "otherCost": 0,
  "totalAmount": 0,
  "customerReply": "고객에게 보낼 상담 답변"
}
`;

    // OpenAI 호출
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    const text = response.output_text;

    if (!text) {
      throw new Error("AI 응답이 비어 있습니다.");
    }

    // JSON 앞뒤에 붙을 수 있는 코드블록 제거
    let cleanedText = text.trim();

    cleanedText = cleanedText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // JSON 파싱
    let result: {
      workDescription?: string;
      materialCost?: number | string;
      laborCost?: number | string;
      otherCost?: number | string;
      totalAmount?: number | string;
      customerReply?: string;
    };

    try {
      result = JSON.parse(cleanedText);
    } catch {
      console.error("AI RAW RESPONSE:", text);

      throw new Error(
        "AI가 올바른 견적 형식으로 응답하지 않았습니다."
      );
    }

    // 금액 숫자 변환
    const materialCost =
      Number(
        String(result.materialCost ?? 0).replace(/,/g, "")
      ) || 0;

    const laborCost =
      Number(
        String(result.laborCost ?? 0).replace(/,/g, "")
      ) || 0;

    const otherCost =
      Number(
        String(result.otherCost ?? 0).replace(/,/g, "")
      ) || 0;

    // 총액은 AI가 보내준 값을 믿지 않고 서버에서 다시 계산
    const totalAmount =
      materialCost +
      laborCost +
      otherCost;

    return NextResponse.json({
      workDescription:
        result.workDescription || "",

      materialCost,

      laborCost,

      otherCost,

      totalAmount,

      customerReply:
        result.customerReply || "",
    });
  } catch (error) {
    console.error("AI ESTIMATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 견적 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}