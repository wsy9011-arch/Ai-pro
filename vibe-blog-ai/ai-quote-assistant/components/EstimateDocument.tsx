"use client";

type BusinessProfile = {
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  address: string | null;
};

type EstimateDocumentProps = {
  estimateNumber: string | null;
  customerName: string;
  phone: string | null;
  region: string | null;
  workDescription: string | null;
  materialCost: number | null;
  laborCost: number | null;
  otherCost: number | null;
  totalAmount: number | null;
  createdAt: string;
  businessProfile: BusinessProfile | null;
  onSent?: () => void;
  onClose: () => void;
};

export default function EstimateDocument({
  estimateNumber,
  customerName,
  phone,
  region,
  workDescription,
  materialCost,
  laborCost,
  otherCost,
  totalAmount,
  createdAt,
  businessProfile,
  onSent,
  onClose,
}: EstimateDocumentProps) {
  function formatPrice(amount: number | null) {
    return `${Number(amount || 0).toLocaleString(
      "ko-KR"
    )}원`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
      "ko-KR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  }

 function savePdf() {
  window.print();
}

async function shareEstimate() {
  const shareText = [
    `[${businessName} 견적서]`,
    "",
    `${customerName} 고객님`,
    estimateNumber ? `견적번호: ${estimateNumber}` : "",
    `견적일: ${formatDate(createdAt)}`,
    "",
    `작업 내용`,
    workDescription || "작업 내용 없음",
    "",
    `총 견적금액: ${formatPrice(totalAmount)}`,
    "",
    "※ 현장 상태 또는 추가 작업 발생 시 최종 금액이 달라질 수 있습니다.",
    "",
    businessProfile?.phone
      ? `문의: ${businessProfile.phone}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${businessName} 견적서`,
        text: shareText,
      });
    } else {
      await navigator.clipboard.writeText(shareText);
      alert(
        "견적 내용이 복사되었습니다. 카카오톡이나 문자에 붙여넣어 보내주세요."
      );
    }

    onSent?.();
    alert("견적 발송 처리가 완료되었습니다.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return;
    }

    console.error("ESTIMATE SHARE ERROR:", error);
    alert("견적 공유 중 오류가 발생했습니다.");
  }
}

  const businessName =
    businessProfile?.business_name || "견적AI";

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #estimate-print-area,
          #estimate-print-area * {
            visibility: visible !important;
          }

          #estimate-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[99999] bg-black/70">
        <div className="flex h-[100dvh] w-full flex-col">
          {/* 상단 버튼 */}
          <div className="no-print sticky top-0 z-[100000] shrink-0 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
              <p className="text-sm font-black text-white">
                견적서 미리보기
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={shareEstimate}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow hover:bg-emerald-700 sm:px-5 sm:text-sm"
                >
                  📤 견적 공유
                </button>

                <button
                  type="button"
                  onClick={savePdf}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow hover:bg-blue-700 sm:px-5 sm:text-sm"
                >
                  ⬇ PDF 저장
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900 shadow sm:px-5 sm:text-sm"
                >
                  ✕ 닫기
                </button>
              </div>
            </div>
          </div>

          {/* 견적서 스크롤 영역 */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-3xl">
              <div
                id="estimate-print-area"
                className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
              >
                {/* 헤더 */}
                <div className="bg-slate-950 px-6 py-7 text-white sm:px-12 sm:py-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-blue-400 sm:text-sm">
                        ESTIMATE
                      </p>

                      <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                        견 적 서
                      </h1>
                    </div>

                    <div className="sm:text-right">
                      <p className="break-words text-xl font-black">
                        {businessName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        견적 · 상담 관리
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-12">
                  {/* 고객정보 */}
                  <div className="grid gap-6 border-b border-slate-200 pb-7 sm:grid-cols-2 sm:pb-8">
                    <div>
                      <p className="text-xs font-bold text-slate-400">
                        고객정보
                      </p>

                      <p className="mt-2 break-words text-xl font-black sm:text-2xl">
                        {customerName} 고객님
                      </p>

                      <p className="mt-3 text-sm text-slate-500">
                        {phone || "전화번호 미등록"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {region || "지역 미등록"}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs font-bold text-slate-400">
                        견적번호
                      </p>

                      <p className="mt-2 text-sm font-black text-blue-600">
                        {estimateNumber || "-"}
                      </p>

                      <p className="mt-4 text-xs font-bold text-slate-400">
                        견적일
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {formatDate(createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* 작업 내용 */}
                  <div className="py-7 sm:py-8">
                    <p className="text-xs font-bold text-slate-400">
                      작업 내용
                    </p>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-slate-800 sm:text-base">
                      {workDescription ||
                        "작업 내용 없음"}
                    </p>
                  </div>

                  {/* 금액 */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-4 py-3 text-sm font-black sm:px-5">
                      <span>항목</span>
                      <span>금액</span>
                    </div>

                    <PriceRow
                      label="자재비"
                      amount={materialCost}
                    />

                    <PriceRow
                      label="인건비"
                      amount={laborCost}
                    />

                    <PriceRow
                      label="기타비용"
                      amount={otherCost}
                    />
                  </div>

                  {/* 총액 */}
                  <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-blue-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
                    <div>
                      <p className="text-xs font-bold text-blue-500">
                        TOTAL
                      </p>

                      <p className="mt-1 text-base font-black text-blue-900 sm:text-lg">
                        총 견적금액
                      </p>
                    </div>

                    <p className="break-words text-2xl font-black text-blue-700 sm:text-3xl">
                      {formatPrice(totalAmount)}
                    </p>
                  </div>

                  {/* 공급자 정보 */}
                  <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:mt-8 sm:p-5">
                    <p className="text-sm font-black text-slate-800">
                      공급자 정보
                    </p>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <BusinessInfo
                        label="업체명"
                        value={
                          businessProfile?.business_name
                        }
                      />

                      <BusinessInfo
                        label="대표자"
                        value={
                          businessProfile?.owner_name
                        }
                      />

                      <BusinessInfo
                        label="연락처"
                        value={
                          businessProfile?.phone
                        }
                      />

                      <BusinessInfo
                        label="사업자번호"
                        value={
                          businessProfile?.business_number
                        }
                      />

                      <div className="sm:col-span-2">
                        <BusinessInfo
                          label="주소"
                          value={
                            businessProfile?.address
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 안내사항 */}
                  <div className="mt-7 border-t border-slate-200 pt-6 sm:mt-8 sm:pt-7">
                    <p className="text-sm font-bold text-slate-700">
                      안내사항
                    </p>

                    <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                      <p>
                        · 본 견적은 입력된 상담 및
                        작업 내용을 기준으로
                        작성되었습니다.
                      </p>

                      <p>
                        · 현장 상태 또는 추가 작업
                        발생 시 최종 금액이 달라질 수
                        있습니다.
                      </p>

                      <p>
                        · 세부 작업 범위와 일정은 고객과
                        최종 협의 후 확정됩니다.
                      </p>
                    </div>
                  </div>

                  {/* 마무리 */}
                  <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center sm:mt-10">
                    <p className="text-sm font-black text-slate-800">
                      감사합니다.
                    </p>

                    <p className="mt-1 break-words text-xs text-slate-400">
                      {businessName}
                    </p>
                  </div>

                  <div className="h-6 sm:h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PriceRow({
  label,
  amount,
}: {
  label: string;
  amount: number | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-slate-100 px-4 py-4 text-sm sm:px-5">
      <span>{label}</span>

      <span className="font-black">
        {Number(amount || 0).toLocaleString(
          "ko-KR"
        )}
        원
      </span>
    </div>
  );
}

function BusinessInfo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="shrink-0 text-xs text-slate-400">
        {label}
      </span>

      <span className="break-words text-sm font-bold text-slate-800 sm:text-right">
        {value || "-"}
      </span>
    </div>
  );
}