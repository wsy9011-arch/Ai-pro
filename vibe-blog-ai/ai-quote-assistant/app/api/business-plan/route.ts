import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM_PROMPT = `
?뱀떊? ??쒕?援?李쎌뾽쨌?뚯긽怨듭씤쨌?뺣?吏?먯궗???꾨Ц 而⑥꽕?댄듃?댁옄 ?ъ뾽怨꾪쉷???섏꽍 ?묒꽦?먮떎.
?뱀떊??紐⑺몴??'AI媛 ???덉걶 湲'???꾨땲???ㅼ젣 ?ъ궗?꾩썝???ъ뾽?굿룹떎?됯??μ꽦쨌?뺤콉?곹빀?깆쓣 鍮좊Ⅴ寃??먮떒?????덈뒗 ?쒖텧???ъ뾽怨꾪쉷?쒕? 留뚮뱶??寃껋씠??

諛섎뱶????寃?됱쓣 癒쇱? ?섑뻾?????묒꽦?쒕떎.
?뺣?쨌吏?먯껜쨌怨듦났湲곌?쨌怨듭떇 ?ъ뾽怨듦퀬쨌援???듦퀎쨌怨듭떇 ?곗뾽?먮즺瑜?理쒖슦?좎쑝濡?議곗궗?쒕떎.
?ъ슜?먭? ?쒓났??怨듦퀬 URL怨?怨듦퀬臾몄씠 ?덉쑝硫??대? 理쒖슦??洹쇨굅濡??쇰뒗??

?덈? 湲덉?:
- 議댁옱?섏? ?딅뒗 留ㅼ텧, 怨좉컼?? 怨꾩빟, ?뱁뿀, ?섏긽, 怨좎슜, ?ъ옄, ?쒖옣洹쒕え瑜?吏?대궡湲?- 異쒖쿂媛 ?뺤씤?섏? ?딆? ?レ옄瑜??ъ떎泥섎읆 ?곌린
- 吏?먭툑 ?섎졊??蹂댁옣?쒕떎怨??쒗쁽?섍린
- ?ㅻⅨ ?낆껜???ъ뾽怨꾪쉷?쒕? 踰좊겮湲?- 怨듦퀬???됯???ぉ???뺤씤?섏? ?딄퀬 ?쇰컲濡좎쑝濡쒕쭔 ?묒꽦?섍린

?묒꽦 ?먯튃:
1. 怨듭떇 洹쇨굅媛 ?덈뒗 ?섏튂??湲곗??곕룄? 異쒖쿂瑜??④퍡 ?곷뒗??
2. 誘몃옒 留ㅼ텧쨌怨좉컼쨌KPI??諛섎뱶??'?ъ뾽怨꾪쉷 媛??紐⑺몴'濡?援щ텇?쒕떎.
3. 怨듦퀬 紐⑹쟻 -> 怨좉컼 臾몄젣 -> ?닿껐諛⑹븞 -> ?ㅽ뻾怨꾪쉷 -> ?덉궛 -> KPI -> ?뺤콉?④낵媛 ?섎굹???쇰━濡??곌껐?섍쾶 ?쒕떎.
4. ??쒖옄??寃쎈젰쨌?꾩옱 MVP쨌湲곗〈 怨좉컼쨌蹂댁쑀?먯썝? ?ㅽ뻾媛?μ꽦??洹쇨굅濡??쒖슜?섎릺 ?낅젰???ъ떎留??ъ슜?쒕떎.
5. ?쏀븳 遺遺꾩쓣 ?④린吏 留먭퀬 [?뺤씤 ?꾩슂] ?먮뒗 [怨좉컼 ?낅젰 ?꾩슂]濡??쒖떆?쒕떎.
6. 吏?먭툑? ?⑥닚 鍮꾩슜?뚯쭊???꾨땲???ъ뾽??寃利씲룰퀬?꾪솕쨌留ㅼ텧?붋룰퀬?㈑룹깮?곗꽦 ?μ긽?쇰줈 ?곌껐?쒕떎.
7. ?쒖옣/寃쎌웳 遺꾩꽍? 洹쇨굅? ?ㅼ젣 李⑤퀎?붾? ?곌껐?쒕떎.
8. 留덉??낆? ?源?硫붿떆吏-梨꾨꼸-?ㅽ뻾-KPI 援ъ“濡??묒꽦?쒕떎.
9. ?ъ궗?꾩썝 ?덉긽吏덈Ц? ?좎뭅濡?쾶 ?묒꽦?섍퀬 ?ㅼ젣 ?듬? 諛⑺뼢???쒖떆?쒕떎.
10. ?ъ뾽怨꾪쉷??臾몄껜???꾨Ц?곸씠怨?援ъ껜?곸씠硫?怨쇱옣?섏? ?딅뒗??

諛섑솚 ?뺤떇:
?ㅼ쭅 JSON ?섎굹留?異쒕젰?쒕떎. 肄붾뱶釉붾줉, ?ㅻ챸臾? 留덊겕?ㅼ슫 ?쒖뒪???덈? ?ｌ? ?딅뒗??
?꾨옒 援ъ“??紐⑤뱺 ?ㅻ? 諛섎뱶???ы븿?쒕떎.

{
  "meta": {
    "documentTitle": "?뺣?吏?먯궗???쒖텧???ъ뾽怨꾪쉷??,
    "businessName": "",
    "programName": "",
    "applicant": "",
    "regionIndustry": "",
    "generatedDate": "YYYY.MM.DD"
  },
  "executive": {
    "oneLine": "",
    "summary": "",
    "supportNeed": "",
    "fundLeverage": ""
  },
  "fit": {
    "programPurpose": "",
    "fitAnalysis": "",
    "matchScore": 0,
    "eligibilityChecks": ["", ""],
    "evaluationFocus": ["", ""],
    "redFlags": ["", ""]
  },
  "announcement": {
    "supportTarget": "",
    "supportContent": "",
    "applicationPeriod": "",
    "evaluationMethod": "",
    "exclusions": ["", ""],
    "mustVerify": ["", ""]
  },
  "business": {
    "overview": "",
    "backgroundNeed": "",
    "problem": "",
    "solution": "",
    "targetCustomer": "",
    "differentiation": "",
    "businessModel": "",
    "readiness": "",
    "commercialization": "",
    "marketing": "",
    "representativeCapability": "",
    "policyImpact": ""
  },
  "marketFacts": [
    {"metric":"","value":"","year":"","source":"","meaning":""}
  ],
  "competitors": [
    {"name":"","strength":"","weakness":"","ourResponse":""}
  ],
  "revenueModel": [
    {"item":"","price":"","target":"","logic":""}
  ],
  "executionPlan": [
    {"period":"","task":"","deliverable":"","kpi":""}
  ],
  "budget": [
    {"item":"","amount":"","ratio":"","purpose":"","evidence":""}
  ],
  "kpis": [
    {"metric":"","baseline":"","target":"","method":"","note":""}
  ],
  "salesPlan": [
    {"year":"","revenue":"","customers":"","assumption":""}
  ],
  "risks": [
    {"risk":"","probability":"","impact":"","response":""}
  ],
  "reviewQuestions": [
    {"question":"","answerDirection":""}
  ],
  "missingInfo": [
    {"item":"","why":"","recommendedProof":""}
  ],
  "sources": [
    {"institution":"","title":"","date":"","url":"","usedFor":""}
  ]
}

遺꾨웾 洹쒖튃:
- executive.summary / supportNeed / fundLeverage: 媛곴컖 ?쒓뎅??500~900??- business 媛??쒖닠 ?꾨뱶: 媛곴컖 700~1,200??- eligibilityChecks / evaluationFocus: 媛곴컖 5媛??댁긽
- marketFacts: 5媛??댁긽, ?ㅼ젣 怨듭떇?섏튂媛 ?놁쑝硫??듭?濡?梨꾩슦吏 留먭퀬 "?뺤씤 媛?ν븳 怨듭떇?섏튂 遺議? 紐낆떆
- competitors: 3~5媛? ?ㅼ젣 ?뱀젙 寃쎌웳?щ? ?뺤씤 紐삵븯硫?寃쎌웳?좏삎/?泥댁옱濡??묒꽦?섍퀬 name??"寃쎌웳?좏삎: ..." ?ъ슜
- revenueModel: 3媛??댁긽
- executionPlan: 8媛??댁긽
- budget: 6媛??댁긽
- kpis: 8媛??댁긽
- salesPlan: 3媛쒕뀈
- risks: 8媛??댁긽
- reviewQuestions: ?뺥솗??10媛??댁긽
- missingInfo: ?ㅼ젣 ?꾨씫?뺣낫 以묒떖 5媛??댁긽
- sources: ?ㅼ젣 ?밴??됱쑝濡??뺤씤??怨듭떇 異쒖쿂 5媛??댁긽. URL???덈? 袁몃ŉ?댁? ?딅뒗??

理쒖쥌 臾몄꽌????20~25?섏씠吏濡??몄쭛?????덈뒗 異⑸텇??源딆씠濡??묒꽦?쒕떎.
- 媛숈? ?댁슜???щ윭 ?섏씠吏?먯꽌 諛섎났?섏? ?딅뒗??
- 臾몄옣??遺덊븘?뷀븯寃??섎━吏 留먭퀬 ?ъ궗???꾩슂??洹쇨굅? ?ㅽ뻾怨꾪쉷 以묒떖?쇰줈 ?묒꽦?쒕떎.
`;

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const out: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") out.push(content.text);
    }
  }
  return out.join("\n").trim();
}

function parseModelJson(text: string) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first >= 0 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }

  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  // YANGJI_BP_PAYMENT_GUARD
  // YANGJI_BP_GENERATION_RECOVERY_V1_1
  const bpToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bpToken) {
    return NextResponse.json({ error: "濡쒓렇?몄씠 ?꾩슂?⑸땲??" }, { status: 401 });
  }

  const bpUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bpPublicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // YANGJI_BP_SUPABASE_KEY_PRIORITY_FIX_V2
  // 寃곗젣 API?먯꽌 ?뺤긽 ?숈옉 以묒씤 SUPABASE_SECRET_KEY瑜??곗꽑 ?ъ슜
  const bpServiceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bpUrl || !bpServiceKey) {
    return NextResponse.json({ error: "?쒕쾭 ?몄쬆 ?ㅼ젙???놁뒿?덈떎." }, { status: 500 });
  }

  // YANGJI_BP_GENERATE_SERVER_AUTH_V3
  const bpAuth = createClient(bpUrl, bpServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user: bpUser }, error: bpUserError } = await bpAuth.auth.getUser(bpToken);
  if (bpUserError || !bpUser) {
    return NextResponse.json({ error: "濡쒓렇???뺣낫瑜??뺤씤?????놁뒿?덈떎." }, { status: 401 });
  }
  // YANGJI_BP_USER_ID_SAFE_V2
  const bpUserId = bpUser.id;

  const bpBody = await req.clone().json().catch(() => ({}));
  const bpOrderId = String(bpBody?.paymentOrderId || "").trim();
  if (!bpOrderId) {
    return NextResponse.json({ error: "29,900??寃곗젣 ?꾨즺 ???묒꽦?????덉뒿?덈떎." }, { status: 402 });
  }

  const bpDb = createClient(bpUrl, bpServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

      // YANGJI_BP_DIRECT_ORDER_STATE_V2
    // RPC 罹먯떆???섏〈?섏? ?딄퀬 service-role濡?寃곗젣 二쇰Ц??吏곸젒 ?좉렐??
    const { data: bpPaidOrder, error: bpPaidOrderError } = await bpDb
      .from("yangji_business_plan_orders")
      .select("id,attempt_count")
      .eq("order_id", bpOrderId)
      .eq("user_id", bpUserId)
      .eq("status", "paid")
      .is("consumed_at", null)
      .maybeSingle();

    if (bpPaidOrderError || !bpPaidOrder) {
      console.error("BP PAID ORDER LOOKUP ERROR", bpPaidOrderError);
      return NextResponse.json(
        { error: "?ъ슜 媛?ν븳 寃곗젣沅뚯씠 ?놁뒿?덈떎. 寃곗젣?댁뿭???뺤씤?댁＜?몄슂." },
        { status: 402 }
      );
    }

    const { data: bpStartedOrder, error: bpStartError } = await bpDb
      .from("yangji_business_plan_orders")
      .update({
        status: "generating",
        attempt_count: Number(bpPaidOrder.attempt_count || 0) + 1,
        failure_reason: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bpPaidOrder.id)
      .eq("status", "paid")
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();

    if (bpStartError || !bpStartedOrder) {
      console.error("BP ORDER START ERROR", bpStartError);
      return NextResponse.json(
        { error: "寃곗젣沅??ъ슜???쒖옉?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂." },
        { status: 409 }
      );
    }
let bpGenerationStarted = true;

  async function restoreBusinessPlanPayment(message: unknown) {
    const { error: restoreError } = await bpDb
      .from("yangji_business_plan_orders")
      .update({
        status: "paid",
        failure_reason: String(message || "?앹꽦 ?ㅽ뙣").slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", bpOrderId)
      .eq("user_id", bpUserId)
      .eq("status", "generating")
      .is("consumed_at", null);

    if (restoreError) {
      throw restoreError;
    }
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY媛 ?쒕쾭???ㅼ젙?섏? ?딆븯?듬땲??" },
        { status: 500 }
      );
    }

    const body = await req.json();

    if (!body?.programName?.trim()) {
      return NextResponse.json(
        { error: "吏?먯궗?낅챸 ?먮뒗 怨듦퀬紐낆쓣 ?낅젰?댁＜?몄슂." },
        { status: 400 }
      );
    }

    if (!body?.businessDescription?.trim()) {
      return NextResponse.json(
        { error: "?ъ뾽 ?꾩씠???ㅻ챸???낅젰?댁＜?몄슂." },
        { status: 400 }
      );
    }

    const userPrompt = `
?꾨옒 ?좎껌?먭? ?낅젰??理쒖냼?쒖쓽 ?ㅼ젣 ?뺣낫瑜?諛뷀깢?쇰줈 ?꾩껜 ?ъ뾽怨꾪쉷?쒕? ?꾩꽦?댁쨾. ?ъ슜?먭? 吏곸젒 ?ъ뾽怨꾪쉷 ??ぉ??紐⑤몢 ?묒꽦?섎룄濡??붽뎄?섏? 留먭퀬, 怨꾪쉷????ぉ? 怨듦퀬? 怨듭떇?먮즺 議곗궗 寃곌낵瑜??좊?濡?珥덉븞??援ъ꽦?댁쨾.
諛섎뱶????寃?됱쑝濡?怨듦퀬쨌?뺤콉쨌?쒖옣쨌寃쎌웳 洹쇨굅瑜??뺤씤????JSON ?뺤떇?쇰줈留?諛섑솚?댁쨾.
?뺤씤?섏? ?딆? ?ъ떎? ?덈? 留뚮뱾?대궡吏 留먭퀬 [?뺤씤 ?꾩슂]濡?泥섎━??

[吏?먯궗??
怨듦퀬紐? ${body.programName || ""}
怨듦퀬 URL: ${body.programUrl || ""}
怨듦퀬臾??댁슜:
${body.announcementText || "[誘몄엯??"}

[?ъ뾽??湲곕낯?뺣낫]
?ъ뾽紐??낆껜紐? ${body.businessName || "[誘몄엯??"}
??쒖옄: ${body.representative || "[誘몄엯??"}
吏?? ${body.region || "[誘몄엯??"}
?낆쥌: ${body.industry || "[誘몄엯??"}
?ъ뾽?④퀎: ${body.businessStage || "[誘몄엯??"}
?낅젰: ${body.businessPeriod || "[誘몄엯??"}

[?ъ뾽 ?꾩씠??
${body.businessDescription || ""}

[?닿껐?섎젮??臾몄젣]
${body.problem || "[誘몄엯??"}

[紐⑺몴怨좉컼]
${body.targetCustomer || "[誘몄엯??"}

[李⑤퀎??
${body.differentiator || "[誘몄엯??"}

[?꾩옱 以鍮꾩긽??蹂댁쑀?먯썝]
${body.currentStatus || "[誘몄엯??"}

[??쒖옄 寃쎈젰]
${body.representativeCareer || "[誘몄엯??"}

[?]
${body.team || "[誘몄엯??"}

[?먭툑]
?щ쭩 吏?먭툑: ${body.requestedAmount || "[誘몄엯??"}
?먮??? ${body.ownContribution || "[誘몄엯??"}
?덉궛 ?ъ슜怨꾪쉷: ${body.budgetPlan || "[誘몄엯??"}

[?꾩옱 留ㅼ텧/?ㅼ쟻]
${body.sales || "[誘몄엯??"}

[紐⑺몴]
${body.goals || "[誘몄엯??"}

[留덉????먮줈]
${body.marketing || "[誘몄엯??"}

[?뚭퀬 ?덈뒗 寃쎌웳??
${body.competitors || "[誘몄엯??"}

[媛뺤젏]
${body.strengths || "[誘몄엯??"}

[?쎌젏]
${body.weaknesses || "[誘몄엯??"}

[蹂댁쑀 利앸튃]
${body.evidence || "[誘몄엯??"}

[異붽? ?붿껌]
${body.extra || "[誘몄엯??"}

異붽? ?묒꽦吏移?
鍮덉뭏 ?먮룞?묒꽦 洹쒖튃:
- ?ъ슜?먮뒗 ?ъ뾽怨꾪쉷?쒕? 吏곸젒 ?곕뒗 ?щ엺???꾨땲???ъ뾽???ㅼ젣 ?ъ떎留??낅젰?섎뒗 ?щ엺?대떎.
- ?닿껐?섎젮??臾몄젣, ?ъ뾽 ?꾩슂?? 紐⑺몴怨좉컼, 李⑤퀎?? 寃쎌웳遺꾩꽍, ?섏씡紐⑤뜽, 留덉??? ?먮줈, ?ㅽ뻾?쇱젙, KPI, 由ъ뒪?щ뒗 ?낅젰??鍮꾩뼱 ?덉뼱???ъ뾽 ?꾩씠?쒓낵 怨듦퀬 諛???議곗궗 洹쇨굅瑜?諛뷀깢?쇰줈 ?곴레?곸쑝濡?珥덉븞???묒꽦?쒕떎.
- ????ぉ??鍮꾩썙?먯뿀?ㅻ뒗 ?댁쑀留뚯쑝濡?[怨좉컼 ?낅젰 ?꾩슂]瑜??⑤컻?섏? ?딅뒗??
- ?? 留ㅼ텧?ㅼ쟻, 怨좉컼?? 怨꾩빟嫄댁닔, ?뱁뿀, ?먭꺽利? 蹂댁쑀?몃젰, ?ㅼ젣 ?ъ옄湲덉쿂???좎껌?먮쭔 ?뺤씤?????덈뒗 '?꾩옱 ?ъ떎'? ?덈? 異붿젙?섏? ?딅뒗??
- 誘몃옒 留ㅼ텧, 怨좉컼?? KPI???꾩떎?곸씤 ?ъ뾽怨꾪쉷 紐⑺몴/媛?뺤쑝濡??묒꽦?섍퀬 諛섎뱶??紐⑺몴 ?먮뒗 媛?뺤엫??紐낇솗???쒖떆?쒕떎.
- 吏?먭툑 ?ъ슜怨꾪쉷??鍮꾩뼱 ?덉쑝硫??대떦 怨듦퀬?먯꽌 ?덉슜?섎뒗 鍮꾨ぉ怨??ъ뾽?④퀎瑜?怨좊젮??沅뚯옣 ?덉궛?덉쓣 ?묒꽦?쒕떎. ?뺥솗???쒕룄瑜??뺤씤?????놁쑝硫?湲덉븸??袁몃ŉ?댁? 留먭퀬 鍮꾩쨷 ?먮뒗 ?곗젙諛⑹떇???쒖븞?쒕떎.
- 紐⑺몴怨좉컼??鍮꾩뼱 ?덉쑝硫??ㅼ젣 ?쒕퉬???댁슜 媛?μ꽦???믪? 1李??듭떖怨좉컼怨?2李??뺤옣怨좉컼?쇰줈 援ъ껜?뷀븳??
- 李⑤퀎?깆씠 鍮꾩뼱 ?덉쑝硫???寃?됱쑝濡??뺤씤??寃쎌웳?좏삎/?泥댁옱? 鍮꾧탳??李⑤퀎???쇰━瑜?援ъ꽦?쒕떎.
- 留덉???怨꾪쉷??鍮꾩뼱 ?덉쑝硫?怨좉컼?띾뱷 寃쎈줈, 硫붿떆吏, 梨꾨꼸, ?꾪솚 KPI源뚯? ?곌껐???묒꽦?쒕떎.
- 寃곌낵臾쇱? ?ъ슜?먭? 鍮덉뭏??留롮씠 ?낅젰?섏? ?딆븯?붾씪???꾩꽦???ъ뾽怨꾪쉷???뺥깭媛 ?섏뼱???쒕떎.
- 怨듦퀬媛 ?뱀젙?섎㈃ 吏?먮??겶룹??먰븳?꽷룹옄遺?는룻삊?쎄린媛꽷룻룊媛??ぉ쨌媛?먃룹젣?몄슂嫄댁쓣 ?ㅼ젣 怨듦퀬 湲곗??쇰줈 遺꾩꽍??
- ?쒖옣洹쒕え ?섏튂??怨듭떇?먮즺媛 ?덉쓣 ?뚮쭔 ?ъ슜??
- 留ㅼ텧怨꾪쉷? ?낅젰???꾪솴??湲곗??쇰줈 '?ъ뾽怨꾪쉷 媛???꾩쓣 遺꾨챸???쒖떆??
- 吏?먭툑 ?ъ슜怨꾪쉷? 吏?먭툑??MVP/?쒗뭹/?쒕퉬?ㅻ? ?ㅼ젣 ?좊즺留ㅼ텧怨?諛섎났?ъ슜?쇰줈 ?곌껐?쒗궎???쇰━濡??ㅺ퀎??
- ?ъ궗?꾩썝?????ъ뾽???덉쓣 ?ъ엯?댁빞 ?섎뒗 ?댁쑀媛 紐낇솗?섍쾶 蹂댁씠寃??묒꽦??
`;

        // YANGJI_BP_HYBRID_LUNA_SOL_V1
    const hybridStartedAt = Date.now();
    const draftModel =
      process.env.OPENAI_BUSINESS_PLAN_DRAFT_MODEL || "gpt-5.6-luna";
    const finalModel =
      process.env.OPENAI_BUSINESS_PLAN_MODEL || "gpt-5.6-sol";
    const model = finalModel;

    const draftStartedAt = Date.now();

    const draftResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        model: draftModel,
        instructions: `${SYSTEM_PROMPT}

[1李?議곗궗 ?④퀎]
吏湲덉? 理쒖쥌 JSON??留뚮뱾吏 留먭퀬, ?ъ슜?먭? ?낅젰???ъ뾽怨?吏?먯궗?낆쓣 ?ㅼ젣 ?ъ궗?꾩썝 愿?먯뿉??寃?좏븯湲??꾪븳 議곗궗 釉뚮━?꾨? ?묒꽦?쒕떎.
??寃?됱쓣 ?곴레 ?ъ슜???쒖옣?? 寃쎌웳?섍꼍, ?뺤콉쨌吏?먯궗??留λ씫, ?源?怨좉컼, ?섏씡紐⑤뜽 洹쇨굅, ?ㅽ뻾 由ъ뒪?? KPI 洹쇨굅瑜?李얜뒗??
?뺤씤?섏? ?딆? 留ㅼ텧쨌怨좉컼?샕룰퀎?승룹닔?겶룹떆?κ퇋紐??섏튂瑜?留뚮뱾吏 ?딅뒗??
怨듭떇 ?먮즺媛 ?뺤씤?섎뒗 寃쎌슦 洹??ъ떎怨?異쒖쿂 ?깃꺽??援щ텇?쒕떎.
理쒖쥌 ?묒꽦 紐⑤뜽??諛붾줈 ?ъ슜?????덈룄濡??듭떖 洹쇨굅? 媛쒖꽑 諛⑺뼢???뺤텞?곸쑝濡??뺣━?쒕떎.`,
        input: userPrompt,
        reasoning: { effort: "none" },
        tools: [{ type: "web_search" }],
        max_output_tokens: 6000,
      }),
    });

    const draftData = await draftResponse.json();

    if (!draftResponse.ok) {
      console.error("BUSINESS_PLAN_LUNA_DRAFT_ERROR", draftData);
      throw new Error(
        draftData?.error?.message || "AI 1李?議곗궗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."
      );
    }

    const researchBrief = extractOutputText(draftData);
    if (!researchBrief) {
      throw new Error("AI 1李?議곗궗 寃곌낵媛 鍮꾩뼱 ?덉뒿?덈떎.");
    }

    const draftElapsedMs = Date.now() - draftStartedAt;
    const finalStartedAt = Date.now();

    const finalInput = `${userPrompt}

==============================
1李???議곗궗 釉뚮━??==============================
${researchBrief}

==============================
理쒖쥌 ?묒꽦 吏??==============================
??議곗궗 釉뚮━?꾨뒗 李멸퀬?먮즺??
?ъ슜?먭? 吏곸젒 ?낅젰???ъ떎怨?議곗궗濡??뺤씤 媛?ν븳 ?ъ떎??援щ텇?섍퀬,
?뺤씤?섏? ?딆? ?ㅼ쟻?대굹 ?섏튂???덈? ?ъ떎泥섎읆 留뚮뱾吏 ?딅뒗??
吏?먯궗???ъ궗?꾩썝???쎌뿀????臾몄젣?뺤쓽 ???닿껐諛⑹븞 ???쒖옣????李⑤퀎?????섏씡紐⑤뜽 ???ㅽ뻾怨꾪쉷 ???덉궛 ??KPI媛 ?쇰━?곸쑝濡??댁뼱吏?꾨줉 蹂닿컯?쒕떎.
理쒖쥌 異쒕젰? SYSTEM_PROMPT媛 ?붽뎄?섎뒗 JSON ?뺤떇留?諛섑솚?쒕떎.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        model: finalModel,
        instructions: `${SYSTEM_PROMPT}

[理쒖쥌 寃?샕룹옉???④퀎]
1李?議곗궗 釉뚮━?꾩쓽 洹쇨굅瑜??쒖슜?섎릺 怨쇱옣쨌?덉쐞쨌異붿젙 ?ㅼ쟻???쒓굅?쒕떎.
臾몄옣? ?⑥닚 ?붿빟???꾨땲???ㅼ젣 吏?먯궗???쒖텧 ?섏??쇰줈 援ъ껜?뷀븳??
?ъ궗?먭? '?????ъ뾽??吏?먭툑???꾩슂?쒖?'瑜??⑸뱷?????덈룄濡??꾩슂?굿룹떎?됯??μ꽦쨌?깃낵?곌껐?깆쓣 媛뺥솕?쒕떎.
JSON 援ъ“? ?꾨뱶紐낆? 湲곗〈 ?붽뎄 ?뺤떇???뺥솗??吏?⑤떎.`,
        input: finalInput,
        reasoning: { effort: "none" },
        max_output_tokens: 14000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("BUSINESS_PLAN_SOL_FINAL_ERROR", data);
      throw new Error(
        data?.error?.message || "AI 理쒖쥌 ?ъ뾽怨꾪쉷???묒꽦 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."
      );
    }

    const text = extractOutputText(data);

    const finalElapsedMs = Date.now() - finalStartedAt;
    const totalElapsedMs = Date.now() - hybridStartedAt;

    console.log("BUSINESS_PLAN_HYBRID_V1", {
      draft_model: draftModel,
      final_model: finalModel,
      draft_ms: draftElapsedMs,
      final_ms: finalElapsedMs,
      elapsed_ms: totalElapsedMs,
    });
    if (!text) {
      throw new Error("AI 寃곌낵媛 鍮꾩뼱 ?덉뒿?덈떎.");
    }

    try {
      const report = parseModelJson(text);
      const completedAt = new Date().toISOString();
      const { data: bpCompletedOrder, error: bpCompleteError } = await bpDb
        .from("yangji_business_plan_orders")
        .update({
          status: "completed",
          generated_at: completedAt,
          consumed_at: completedAt,
          failure_reason: "",
          updated_at: completedAt,
        })
        .eq("order_id", bpOrderId)
        .eq("user_id", bpUserId)
        .eq("status", "generating")
        .select("id")
        .maybeSingle();

      if (bpCompleteError || !bpCompletedOrder) {
        throw new Error("寃곌낵 ?앹꽦 ??寃곗젣沅??꾨즺 泥섎━???ㅽ뙣?덉뒿?덈떎.");
      }
      bpGenerationStarted = false;
return NextResponse.json({
        report,
        model,
        createdAt: new Date().toISOString(),
      });
    } catch (parseError) {
    if (typeof bpGenerationStarted !== "undefined" && bpGenerationStarted) {
      try {
        await restoreBusinessPlanPayment(parseError instanceof Error ? parseError.message : "?앹꽦 ?ㅽ뙣");
      } catch (bpRefundError) {
        console.error("BUSINESS PLAN CREDIT RESTORE ERROR", bpRefundError);
      }
    }
      console.error("JSON parse failed:", parseError, text.slice(0, 1000));
      return NextResponse.json(
        {
          error:
            "議곗궗 ?댁슜? ?앹꽦?섏뿀吏留?臾몄꽌 援ъ“?붿뿉 ?ㅽ뙣?덉뒿?덈떎. 媛숈? ?댁슜?쇰줈 ??踰????묒꽦?댁＜?몄슂.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (typeof bpGenerationStarted !== "undefined" && bpGenerationStarted) {
      try {
        await restoreBusinessPlanPayment(error instanceof Error ? error.message : "?앹꽦 ?ㅽ뙣");
      } catch (bpRecoveryError) {
        console.error("BUSINESS PLAN PAYMENT RIGHT RESTORE ERROR", bpRecoveryError);
      }
    }
    console.error("business-plan route error", error);
    return NextResponse.json(
      { error: error?.message || "?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." },
      { status: 500 }
    );
  }
}

