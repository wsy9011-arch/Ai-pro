import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { inquiry } = await request.json();

    if (!inquiry || !inquiry.trim()) {
      return NextResponse.json(
        { error: "고객 문의 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",

      instructions: `
당신은 대한민국 소상공인을 위한 AI 견적·상담 비서입니다.

사용자가 입력한 고객 문의를 분석하세요.

특히 인테리어필름, 인테리어, 청소, 이사, 에어컨,
도배, 장판 등 현장 서비스업의 상담을 잘 처리해야 합니다.

반드시 다음 형식으로 답변하세요.

[문의 요약]
고객이 무엇을 원하는지 간단히 정리합니다.

[추가 확인사항]
정확한 상담이나 견적을 위해 사장님이 고객에게 추가로 확인해야 할 내용을
목록으로 작성합니다.

[고객에게 보낼 답변]
사장님이 고객에게 그대로 복사해서 보낼 수 있는
자연스럽고 친절한 한국어 상담 메시지를 작성합니다.

[견적 판단]
현재 정보만으로 금액을 확정할 수 있는지 판단합니다.
정보가 부족하면 임의로 가격을 만들어내지 말고
어떤 정보가 더 필요한지 설명합니다.

[추천 다음 행동]
사장님이 다음에 무엇을 해야 하는지 간단히 알려줍니다.

중요:
확인되지 않은 가격이나 사실을 만들어내지 마세요.
고객에게 과도한 영업 문구를 사용하지 마세요.
실제 현장 상태에 따라 견적이 달라질 수 있음을 고려하세요.
답변은 한국어로 작성하세요.
      `,

      input: inquiry,
    });

    return NextResponse.json({
      result: response.output_text,
    });
  } catch (error) {
    console.error("AI ANALYZE ERROR:", error);

    return NextResponse.json(
      {
        error:
          "AI 분석 중 오류가 발생했습니다. API 키와 사용 가능 상태를 확인해주세요.",
      },
      { status: 500 }
    );
  }
}