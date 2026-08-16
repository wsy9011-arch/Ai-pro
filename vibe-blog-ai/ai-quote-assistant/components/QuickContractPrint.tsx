"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  user_id: string;
  customer_id: string;
  contract_date: string;
  amount: number;
  status: string;
  memo: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  region: string | null;
};

type BusinessProfile = {
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  address: string | null;
};

export default function QuickContractPrint() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [business, setBusiness] =
    useState<BusinessProfile | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedContract, setSelectedContract] =
    useState<Contract | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const [
        { data: contractData, error: contractError },
        { data: customerData, error: customerError },
        { data: businessData, error: businessError },
      ] = await Promise.all([
        supabase
          .from("contracts")
          .select(
            "id,user_id,customer_id,contract_date,amount,status,memo"
          )
          .eq("user_id", user.id)
          .order("contract_date", { ascending: false }),

        supabase
          .from("customers")
          .select("id,name,phone,region")
          .eq("user_id", user.id),

        supabase
          .from("business_profiles")
          .select(
            "business_name,owner_name,phone,business_number,address"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (contractError) throw contractError;
      if (customerError) throw customerError;
      if (businessError) throw businessError;

      setContracts((contractData ?? []) as Contract[]);
      setCustomers((customerData ?? []) as Customer[]);
      setBusiness(
        (businessData ?? null) as BusinessProfile | null
      );
    } catch (err) {
      console.error("QUICK CONTRACT PRINT LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "계약서를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getCustomer = (customerId: string) =>
    customers.find((customer) => customer.id === customerId) ??
    null;

  const filteredContracts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return contracts.slice(0, 8);

    return contracts.filter((contract) => {
      const customer = getCustomer(contract.customer_id);

      return (
        customer?.name.toLowerCase().includes(keyword) ||
        customer?.phone?.toLowerCase().includes(keyword) ||
        customer?.region?.toLowerCase().includes(keyword)
      );
    });
  }, [contracts, customers, search]);

  function formatPrice(amount: number) {
    return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600">
            QUICK CONTRACT PRINT
          </p>

          <h3 className="mt-2 text-xl font-black">
            계약서 빠른 인쇄
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            계약자명을 입력하면 등록된 계약서를 바로 찾아
            문서 형태로 열고 인쇄할 수 있습니다.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                filteredContracts.length === 1
              ) {
                setSelectedContract(filteredContracts[0]);
              }
            }}
            placeholder="계약자명 입력 예) 홍길동"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={() => {
              if (filteredContracts.length === 1) {
                setSelectedContract(filteredContracts[0]);
              }
            }}
            disabled={filteredContracts.length !== 1}
            className="shrink-0 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            계약서 열기
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
            계약 정보를 불러오는 중...
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {search.trim() && filteredContracts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
                해당 계약자를 찾을 수 없습니다.
              </div>
            ) : (
              filteredContracts.map((contract) => {
                const customer = getCustomer(contract.customer_id);

                return (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => setSelectedContract(contract)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">
                        {customer?.name || "고객 정보 없음"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {contract.contract_date} ·{" "}
                        {customer?.region || "지역 미입력"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-blue-700">
                        {formatPrice(contract.amount)}
                      </p>

                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        계약서 보기 →
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedContract && (
        <QuickContractDocument
          contract={selectedContract}
          customer={getCustomer(selectedContract.customer_id)}
          business={business}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </>
  );
}

function QuickContractDocument({
  contract,
  customer,
  business,
  onClose,
}: {
  contract: Contract;
  customer: Customer | null;
  business: BusinessProfile | null;
  onClose: () => void;
}) {
  const contractNumber =
    `CT-${contract.id.slice(0, 8).toUpperCase()}`;

  const customerName =
    customer?.name || "고객 정보 없음";

  const phone = customer?.phone || "-";
  const region = customer?.region || "-";
  const contractDate =
    contract.contract_date || "-";

  const memo =
    contract.memo?.trim() ||
    "별도 기재된 계약 내용이 없습니다.";

  const documentRef = useRef<HTMLDivElement | null>(null);
  const [sharing, setSharing] = useState(false);

  async function createContractPdfFile() {
    if (!documentRef.current) {
      throw new Error("계약서 화면을 찾을 수 없습니다.");
    }

    const [{ jsPDF }, html2canvasModule] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    const html2canvas = html2canvasModule.default;

    const canvas = await html2canvas(documentRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imageData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imageHeight =
      (canvas.height * printableWidth) / canvas.width;

    let heightLeft = imageHeight;
    let position = margin;

    pdf.addImage(
      imageData,
      "JPEG",
      margin,
      position,
      printableWidth,
      imageHeight
    );

    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      pdf.addPage();

      position =
        margin - (imageHeight - heightLeft);

      pdf.addImage(
        imageData,
        "JPEG",
        margin,
        position,
        printableWidth,
        imageHeight
      );

      heightLeft -= printableHeight;
    }

    const blob = pdf.output("blob");
    const safeCustomerName = customerName.replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    return new File(
      [blob],
      `${safeCustomerName}_계약서_${contractNumber}.pdf`,
      { type: "application/pdf" }
    );
  }

  function downloadPdfFile(file: File) {
    const url = URL.createObjectURL(file);
    const anchorElement = document.createElement("a");

    anchorElement.href = url;
    anchorElement.download = file.name;
    document.body.appendChild(anchorElement);
    anchorElement.click();
    anchorElement.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function shareToKakao() {
    if (sharing) return;

    setSharing(true);

    try {
      const file = await createContractPdfFile();

      const shareData: ShareData = {
        title: `${customerName}님 공사계약서`,
        text: `${
          business?.business_name || "시공업체"
        }에서 계약서를 보내드립니다. 계약번호 ${contractNumber}`,
        files: [file],
      };

      const canShareFile =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (!navigator.canShare ||
          navigator.canShare({ files: [file] }));

      if (canShareFile) {
        await navigator.share(shareData);
        return;
      }

      downloadPdfFile(file);

      alert(
        "이 브라우저에서는 PDF를 앱으로 바로 공유할 수 없어 계약서 PDF를 다운로드했습니다. 카카오톡에서 파일 첨부로 보내주세요."
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error("CONTRACT PDF SHARE ERROR:", error);

      alert(
        error instanceof Error
          ? `카카오톡 공유 준비 중 오류가 발생했습니다.\n${error.message}`
          : "카카오톡 공유 준비 중 오류가 발생했습니다."
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="quick-contract-print fixed inset-0 z-[1000000] overflow-y-auto bg-black/60 p-3 sm:p-6">
      <div className="mx-auto min-h-full max-w-5xl py-3 sm:py-6">
        <div className="rounded-3xl bg-white shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7 print:hidden">
            <div>
              <p className="text-sm font-bold text-blue-600">
                CONTRACT DOCUMENT
              </p>

              <h3 className="mt-1 text-2xl font-black">
                업무용 계약서
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                계약번호 {contractNumber}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                🖨️ 인쇄 / PDF
              </button>

              <button
                type="button"
                onClick={() => void shareToKakao()}
                disabled={sharing}
                className="rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-black text-[#191919] hover:bg-[#F5DC00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharing ? "PDF 만드는 중..." : "💬 카카오톡 보내기"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-200"
              >
                닫기
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-10 print:p-0">
            <div
              ref={documentRef}
              className="mx-auto max-w-4xl border-2 border-slate-900 bg-white p-5 sm:p-10 print:border print:p-8"
            >
              <header className="border-b-2 border-slate-900 pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.25em] text-slate-500">
                      SERVICE AGREEMENT
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                      공 사 계 약 서
                    </h1>
                  </div>

                  <div className="text-left text-xs leading-6 sm:text-right">
                    <p>
                      <span className="font-bold text-slate-500">
                        계약번호
                      </span>{" "}
                      {contractNumber}
                    </p>

                    <p>
                      <span className="font-bold text-slate-500">
                        계약일
                      </span>{" "}
                      {contractDate}
                    </p>
                  </div>
                </div>
              </header>

              <section className="mt-7">
                <h2 className="mb-3 text-base font-black">
                  1. 계약 당사자
                </h2>

                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <div className="grid sm:grid-cols-2">
                    <div className="border-b border-slate-300 p-4 sm:border-r">
                      <p className="text-xs font-bold text-slate-400">
                        고객
                      </p>

                      <p className="mt-2 font-black">
                        {customerName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {phone}
                      </p>
                    </div>

                    <div className="border-b border-slate-300 p-4">
                      <p className="text-xs font-bold text-slate-400">
                        시공업체
                      </p>

                      <p className="mt-2 font-black">
                        {business?.business_name ||
                          "시공업체"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        대표자:{" "}
                        {business?.owner_name || "-"}
                      </p>
                    </div>

                    <div className="border-b border-slate-300 p-4 sm:border-b-0 sm:border-r">
                      <p className="text-xs font-bold text-slate-400">
                        현장 지역
                      </p>

                      <p className="mt-2 font-black">
                        {region}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-bold text-slate-400">
                        계약 상태
                      </p>

                      <p className="mt-2 font-black">
                        {contract.status}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <h2 className="mb-3 text-base font-black">
                  2. 공사 및 계약 내용
                </h2>

                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <div className="grid sm:grid-cols-2">
                    <div className="border-b border-slate-300 p-4 sm:border-r">
                      <p className="text-xs font-bold text-slate-400">
                        공사 내용
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6">
                        {memo}
                      </p>
                    </div>

                    <div className="border-b border-slate-300 p-4">
                      <p className="text-xs font-bold text-slate-400">
                        공사 기간
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        현장 협의 후 확정
                      </p>
                    </div>

                    <div className="p-4 sm:border-r">
                      <p className="text-xs font-bold text-slate-400">
                        계약 금액
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {Number(
                          contract.amount || 0
                        ).toLocaleString("ko-KR")}
                        원
                      </p>
                    </div>

                    <div className="border-t border-slate-300 p-4">
                      <p className="text-xs font-bold text-slate-400">
                        업체 연락처
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {business?.phone || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <h2 className="mb-3 text-base font-black">
                  3. 업체 정보
                </h2>

                <div className="rounded-xl border border-slate-300 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PrintInfo
                      label="업체명"
                      value={
                        business?.business_name || "-"
                      }
                    />

                    <PrintInfo
                      label="대표자"
                      value={
                        business?.owner_name || "-"
                      }
                    />

                    <PrintInfo
                      label="사업자등록번호"
                      value={
                        business?.business_number || "-"
                      }
                    />

                    <PrintInfo
                      label="주소"
                      value={
                        business?.address || "-"
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <h2 className="mb-3 text-base font-black">
                  4. 계약 조건
                </h2>

                <ol className="space-y-2 rounded-xl border border-slate-300 p-5 text-sm leading-7">
                  <li>
                    1. 공사 내용과 범위는 계약 당사자가
                    확인한 내용을 기준으로 합니다.
                  </li>

                  <li>
                    2. 추가 공사 또는 공사 내용의 변경이
                    발생하는 경우 사전에 협의합니다.
                  </li>

                  <li>
                    3. 현장 상태 및 자재 수급 등의 사정에
                    따라 공사 일정은 상호 협의하여
                    변경할 수 있습니다.
                  </li>

                  <li>
                    4. 기존 시설물의 노후, 파손, 부식 등
                    현장 상태에 따른 추가 작업은 별도
                    협의합니다.
                  </li>

                  <li>
                    5. 계약 해지, 일정 변경 및 환불에
                    관한 사항은 실제 계약 조건과
                    당사자 간 협의 내용을 우선합니다.
                  </li>
                </ol>
              </section>

              <section className="mt-7">
                <h2 className="mb-3 text-base font-black">
                  5. 특약 및 메모
                </h2>

                <div className="min-h-28 rounded-xl border border-slate-300 p-5 text-sm leading-7">
                  {memo}
                </div>
              </section>

              <section className="mt-8 border-t-2 border-slate-900 pt-7">
                <p className="text-sm leading-7 text-slate-700">
                  위 계약 내용을 확인하고 상호 동의하여
                  계약을 체결합니다.
                </p>

                <div className="mt-10 grid gap-10 sm:grid-cols-2">
                  <div>
                    <p className="font-black">고객</p>

                    <p className="mt-1 text-sm text-slate-500">
                      성명: {customerName}
                    </p>

                    <div className="mt-10 border-b border-slate-500 pb-2 text-center font-black">
                      (서명)
                    </div>
                  </div>

                  <div>
                    <p className="font-black">
                      시공업체
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      담당자:{" "}
                      {business?.owner_name || "-"}
                    </p>

                    <div className="mt-10 border-b border-slate-500 pb-2 text-center font-black">
                      (서명)
                    </div>
                  </div>
                </div>

                <div className="mt-10 text-center text-sm font-bold text-slate-500">
                  계약일: {contractDate}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .quick-contract-print,
          .quick-contract-print * {
            visibility: visible;
          }

          .quick-contract-print {
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }

          .quick-contract-print > div {
            max-width: none !important;
            min-height: auto !important;
            padding: 0 !important;
          }

          .quick-contract-print > div > div {
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

function PrintInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}