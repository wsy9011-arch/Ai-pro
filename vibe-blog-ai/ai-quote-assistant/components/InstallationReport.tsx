"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

type BusinessProfile = {
  business_name: string | null;
  business_type?: string | null;
  owner_name: string | null;
  phone: string | null;
  business_number: string | null;
  address: string | null;
};

type Customer = {
  name: string;
  phone: string | null;
  region: string | null;
  service_type: string | null;
};

type InstallationReportProps = {
  businessProfile?: BusinessProfile | null;
  customer: Customer;
  contractDate: string | null;
  installationDate: string | null;
  installationNote: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  onClose?: () => void;
};

const PAGE_W = 1240;
const PAGE_H = 1754;
const BLUE = "#2563eb";
const NAVY = "#0f172a";
const SLATE = "#64748b";
const LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";
const PALE_BLUE = "#eff6ff";
const WHITE = "#ffffff";
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "")
    .trim();
}

async function loadImage(url: string) {
  if (!url) return null;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();

  if (stroke) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;

  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 8
) {
  const text = value || "-";
  let line = "";
  let row = 0;

  for (const char of text) {
    const next = line + char;

    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      row += 1;
      line = char;

      if (row >= maxLines - 1) break;
    } else {
      line = next;
    }
  }

  if (line && row < maxLines) {
    ctx.fillText(line, x, y + row * lineHeight);
  }
}

function basePage() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("보고서 페이지를 만들 수 없습니다.");

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  return { canvas, ctx };
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, addPage = false) {
  if (addPage) pdf.addPage("a4", "portrait");

  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.94),
    "JPEG",
    0,
    0,
    210,
    297,
    undefined,
    "FAST"
  );
}

function sectionLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  title: string
) {
  ctx.fillStyle = BLUE;
  ctx.font = `800 23px ${FONT}`;
  ctx.fillText(label, 80, 92);

  ctx.fillStyle = NAVY;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(title, 80, 160);
}

function footer(
  ctx: CanvasRenderingContext2D,
  businessName: string,
  page: number
) {
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 1648);
  ctx.lineTo(1160, 1648);
  ctx.stroke();

  ctx.fillStyle = SLATE;
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText(businessName, 80, 1688);

  ctx.textAlign = "right";
  ctx.fillText(String(page), 1160, 1688);
  ctx.textAlign = "left";
}

function drawEmptyPhoto(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  message: string
) {
  roundedRect(ctx, x, y, width, height, 28, LIGHT, BORDER);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `800 25px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(message, x + width / 2, y + height / 2);
  ctx.textAlign = "left";
}

export default function InstallationReport({
  businessProfile: initialBusinessProfile = null,
  customer,
  contractDate,
  installationDate,
  installationNote,
  beforePhotos,
  afterPhotos,
  onClose,
}: InstallationReportProps) {
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(initialBusinessProfile);

  const [loadingProfile, setLoadingProfile] = useState(!initialBusinessProfile);
  const [creating, setCreating] = useState(false);
  const [reportUrl, setReportUrl] = useState("");

  useEffect(() => {
    if (initialBusinessProfile) {
      setBusinessProfile(initialBusinessProfile);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;

    async function loadBusinessProfile() {
      setLoadingProfile(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("로그인이 필요합니다.");

        const { data, error } = await supabase
          .from("business_profiles")
          .select(
            "business_name,business_type,owner_name,phone,business_number,address,updated_at"
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setBusinessProfile((data ?? null) as BusinessProfile | null);
        }
      } catch (error) {
        console.error("INSTALLATION REPORT PROFILE ERROR:", error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    void loadBusinessProfile();

    return () => {
      cancelled = true;
    };
  }, [initialBusinessProfile]);

  const businessName =
    businessProfile?.business_name?.trim() || "업체명 미등록";

  const beforePhoto = beforePhotos?.[0] || "";
  const afterPhoto = afterPhotos?.[0] || "";

  const customerCards = useMemo(
    () => [
      ["고객명", customer.name || "-"],
      ["연락처", customer.phone || "-"],
      ["지역", customer.region || "-"],
      ["시공 유형", customer.service_type || "-"],
      ["계약일", formatDate(contractDate)],
      ["시공일", formatDate(installationDate)],
    ],
    [customer, contractDate, installationDate]
  );

  async function createPdf(downloadFile = true): Promise<string | null> {
    if (creating) return null;

    setCreating(true);

    try {
      await document.fonts?.ready;

      const [beforeImage, afterImage] = await Promise.all([
        loadImage(beforePhoto),
        loadImage(afterPhoto),
      ]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // 1페이지 - 고급 표지
      {
        const { canvas, ctx } = basePage();

        ctx.fillStyle = NAVY;
        ctx.fillRect(0, 0, PAGE_W, PAGE_H);

        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, 22, PAGE_H);

        ctx.fillStyle = "#60a5fa";
        ctx.font = `800 24px ${FONT}`;
        ctx.fillText("INSTALLATION COMPLETION REPORT", 90, 120);

        ctx.fillStyle = WHITE;
        ctx.font = `900 64px ${FONT}`;
        ctx.fillText("시공 완료 보고서", 90, 235);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = `500 24px ${FONT}`;
        ctx.fillText(
          "시공 전·후 현장 상태와 작업 내용을 정리한 고객용 완료 보고서",
          90,
          292
        );

        roundedRect(ctx, 90, 405, 1060, 285, 34, "#172033", "#263244");

        ctx.fillStyle = "#93c5fd";
        ctx.font = `800 18px ${FONT}`;
        ctx.fillText("COMPANY", 130, 465);

        ctx.fillStyle = WHITE;
        ctx.font = `900 42px ${FONT}`;
        ctx.fillText(businessName, 130, 530);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = `500 22px ${FONT}`;
        ctx.fillText(
          `대표자  ${businessProfile?.owner_name || "-"}`,
          130,
          595
        );
        ctx.fillText(
          `연락처  ${businessProfile?.phone || "-"}`,
          130,
          642
        );

        roundedRect(ctx, 90, 760, 1060, 360, 34, WHITE);

        ctx.fillStyle = BLUE;
        ctx.font = `800 18px ${FONT}`;
        ctx.fillText("CUSTOMER", 130, 825);

        ctx.fillStyle = NAVY;
        ctx.font = `900 40px ${FONT}`;
        ctx.fillText(customer.name || "-", 130, 895);

        ctx.fillStyle = SLATE;
        ctx.font = `600 22px ${FONT}`;
        ctx.fillText(
          customer.service_type || "시공 유형 미입력",
          130,
          950
        );

        ctx.fillStyle = NAVY;
        ctx.font = `800 22px ${FONT}`;
        ctx.fillText("시공일", 130, 1030);

        ctx.fillStyle = BLUE;
        ctx.font = `900 31px ${FONT}`;
        ctx.fillText(formatDate(installationDate), 250, 1030);

        ctx.fillStyle = "#94a3b8";
        ctx.font = `500 17px ${FONT}`;
        ctx.fillText(
          `사업자번호  ${businessProfile?.business_number || "-"}`,
          90,
          1530
        );
        ctx.fillText(
          `주소  ${businessProfile?.address || "-"}`,
          90,
          1575
        );

        ctx.fillStyle = "#64748b";
        ctx.font = `500 15px ${FONT}`;
        ctx.fillText(
          "AI 견적 어시스턴트 자동 생성 문서",
          90,
          1660
        );

        addCanvasToPdf(pdf, canvas);
      }

      // 2페이지 - 고객/시공 정보
      {
        const { canvas, ctx } = basePage();

        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, PAGE_W, 18);

        sectionLabel(ctx, "PROJECT INFORMATION", "고객 · 시공 정보");

        const cardW = 520;
        const cardH = 128;
        const gapX = 40;
        const startY = 245;

        customerCards.forEach(([label, value], index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = 80 + col * (cardW + gapX);
          const y = startY + row * 158;

          roundedRect(ctx, x, y, cardW, cardH, 24, WHITE, BORDER);

          ctx.fillStyle = "#94a3b8";
          ctx.font = `800 16px ${FONT}`;
          ctx.fillText(label, x + 28, y + 38);

          ctx.fillStyle = NAVY;
          ctx.font = `900 25px ${FONT}`;
          ctx.fillText(String(value), x + 28, y + 84);
        });

        roundedRect(ctx, 80, 760, 1080, 410, 30, PALE_BLUE, "#dbeafe");

        ctx.fillStyle = BLUE;
        ctx.font = `900 22px ${FONT}`;
        ctx.fillText("시공 메모", 120, 820);

        ctx.fillStyle = "#1e293b";
        ctx.font = `500 24px ${FONT}`;
        wrapText(
          ctx,
          installationNote || "등록된 시공 메모가 없습니다.",
          120,
          880,
          1000,
          40,
          7
        );

        roundedRect(ctx, 80, 1230, 1080, 260, 30, LIGHT, BORDER);

        ctx.fillStyle = NAVY;
        ctx.font = `900 23px ${FONT}`;
        ctx.fillText("업체 정보", 120, 1288);

        ctx.fillStyle = "#475569";
        ctx.font = `600 20px ${FONT}`;
        ctx.fillText(
          `대표자  ${businessProfile?.owner_name || "-"}`,
          120,
          1345
        );
        ctx.fillText(
          `연락처  ${businessProfile?.phone || "-"}`,
          120,
          1390
        );
        ctx.fillText(
          `사업자번호  ${businessProfile?.business_number || "-"}`,
          620,
          1345
        );
        ctx.fillText(
          `주소  ${businessProfile?.address || "-"}`,
          620,
          1390
        );

        footer(ctx, businessName, 2);
        addCanvasToPdf(pdf, canvas, true);
      }

      // 3페이지 - 시공 전
      {
        const { canvas, ctx } = basePage();

        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, PAGE_W, 18);

        sectionLabel(ctx, "BEFORE", "시공 전 현장");

        roundedRect(ctx, 60, 220, 1120, 1320, 32, LIGHT, BORDER);

        if (beforeImage) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(60, 220, 1120, 1320, 32);
          ctx.clip();
          drawImageContain(ctx, beforeImage, 60, 220, 1120, 1320);
          ctx.restore();
        } else {
          drawEmptyPhoto(
            ctx,
            60,
            220,
            1120,
            1320,
            "등록된 시공 전 사진이 없습니다."
          );
        }

        footer(ctx, businessName, 3);
        addCanvasToPdf(pdf, canvas, true);
      }

      // 4페이지 - 시공 후
      {
        const { canvas, ctx } = basePage();

        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, PAGE_W, 18);

        sectionLabel(ctx, "AFTER", "시공 완료 현장");

        roundedRect(ctx, 60, 220, 1120, 1320, 32, LIGHT, BORDER);

        if (afterImage) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(60, 220, 1120, 1320, 32);
          ctx.clip();
          drawImageContain(ctx, afterImage, 60, 220, 1120, 1320);
          ctx.restore();
        } else {
          drawEmptyPhoto(
            ctx,
            60,
            220,
            1120,
            1320,
            "등록된 시공 후 사진이 없습니다."
          );
        }

        footer(ctx, businessName, 4);
        addCanvasToPdf(pdf, canvas, true);
      }

      // 5페이지 - 비교 + 감사/A/S
      {
        const { canvas, ctx } = basePage();

        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, PAGE_W, 18);

        sectionLabel(ctx, "BEFORE / AFTER", "시공 전·후 비교");

        ctx.fillStyle = NAVY;
        ctx.font = `900 21px ${FONT}`;
        ctx.fillText("BEFORE", 80, 235);

        ctx.fillStyle = BLUE;
        ctx.fillText("AFTER", 640, 235);

        roundedRect(ctx, 80, 270, 520, 820, 28, LIGHT, BORDER);
        roundedRect(ctx, 640, 270, 520, 820, 28, LIGHT, BORDER);

        if (beforeImage) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(80, 270, 520, 820, 28);
          ctx.clip();
          drawImageContain(ctx, beforeImage, 80, 270, 520, 820);
          ctx.restore();
        }

        if (afterImage) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(640, 270, 520, 820, 28);
          ctx.clip();
          drawImageContain(ctx, afterImage, 640, 270, 520, 820);
          ctx.restore();
        }

        roundedRect(ctx, 80, 1160, 1080, 380, 34, NAVY);

        ctx.fillStyle = "#93c5fd";
        ctx.font = `800 18px ${FONT}`;
        ctx.fillText("THANK YOU", 120, 1220);

        ctx.fillStyle = WHITE;
        ctx.font = `900 37px ${FONT}`;
        ctx.fillText("시공을 맡겨 주셔서 감사합니다.", 120, 1290);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = `600 22px ${FONT}`;
        ctx.fillText(businessName, 120, 1355);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = `500 20px ${FONT}`;
        ctx.fillText(
          `A/S 문의  ${businessProfile?.phone || "업체로 문의해 주세요."}`,
          120,
          1412
        );

        ctx.fillStyle = "#94a3b8";
        ctx.font = `500 17px ${FONT}`;
        ctx.fillText(
          "시공 후 불편한 점이 있으시면 언제든 연락해 주세요.",
          120,
          1460
        );

        footer(ctx, businessName, 5);
        addCanvasToPdf(pdf, canvas, true);
      }

      const fileBusinessName = safeFileName(businessName || "시공");
      const fileCustomerName = safeFileName(customer.name || "고객");
      const fileName = `${Date.now()}_report.pdf`;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const pdfBlob = pdf.output("blob");
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`보고서 업로드 실패: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("reports").getPublicUrl(filePath);

      setReportUrl(publicUrl);

      if (downloadFile) {
        pdf.save(fileName);
      }

      return publicUrl;
    } catch (error) {
      console.error("INSTALLATION REPORT PDF ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "시공 완료 보고서 PDF 생성에 실패했습니다."
      );
      return null;
    } finally {
      setCreating(false);
    }
  }


  async function shareReport() {
    const url = reportUrl || (await createPdf(false));
    if (!url) return;

    const text = `${businessName} ${customer.name} 고객님의 시공 완료 보고서입니다.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${businessName} 시공 완료 보고서`,
          text,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("보고서 링크가 복사되었습니다. 카카오톡에 붙여넣어 전송하세요.");
    } catch (error) {
      console.error("REPORT SHARE ERROR:", error);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110000,
        overflowY: "auto",
        background:
          "linear-gradient(135deg, rgba(2,6,23,.96), rgba(15,23,42,.92))",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            position: "sticky",
            top: 16,
            zIndex: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: 18,
            borderRadius: 18,
            background: "#0f172a",
            color: WHITE,
            border: "1px solid #1e293b",
            boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          }}
        >
          <div>
            <div
              style={{
                color: "#60a5fa",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              INSTALLATION COMPLETION REPORT
            </div>

            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {loadingProfile
                ? "업체 정보를 불러오는 중..."
                : `${businessName} · ${customer.name} 시공 완료 보고서`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                style={{
                  border: "1px solid #334155",
                  background: "#111827",
                  color: WHITE,
                  borderRadius: 12,
                  padding: "12px 17px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            )}

            <button
              type="button"
              onClick={() => void createPdf()}
              disabled={creating || loadingProfile}
              style={{
                border: 0,
                background:
                  creating || loadingProfile ? "#93c5fd" : BLUE,
                color: WHITE,
                borderRadius: 12,
                padding: "12px 19px",
                fontWeight: 900,
                cursor:
                  creating || loadingProfile ? "default" : "pointer",
              }}
            >
              {creating ? "PDF 만드는 중..." : "📄 5페이지 PDF 다운로드"}
            </button>
            <button
              type="button"
              onClick={() => void shareReport()}
              style={{border:0,background:"#FEE500",color:"#000",borderRadius:12,padding:"12px 19px",fontWeight:900,cursor:"pointer"}}
            >
              💬 카카오톡으로 보고서 공유
            </button>
          </div>
        </div>

        <div
          style={{
            width: 794,
            minHeight: 1123,
            margin: "22px auto",
            overflow: "hidden",
            background: NAVY,
            color: WHITE,
            boxShadow: "0 28px 80px rgba(0,0,0,.4)",
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              height: 8,
              background: BLUE,
            }}
          />

          <div
            style={{
              minHeight: 1115,
              padding: "72px 62px 58px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#60a5fa",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 2.5,
                }}
              >
                INSTALLATION COMPLETION REPORT
              </div>

              <h1
                style={{
                  margin: "24px 0 0",
                  fontSize: 54,
                  lineHeight: 1.15,
                }}
              >
                시공 완료
                <br />
                보고서
              </h1>

              <p
                style={{
                  marginTop: 22,
                  color: "#cbd5e1",
                  fontSize: 17,
                  lineHeight: 1.7,
                }}
              >
                고객에게 바로 전달할 수 있도록 시공 정보와
                <br />
                전·후 현장 사진을 정리한 완료 보고서입니다.
              </p>
            </div>

            <div
              style={{
                padding: 30,
                borderRadius: 24,
                background: "#172033",
                border: "1px solid #263244",
              }}
            >
              <div
                style={{
                  color: "#93c5fd",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                }}
              >
                COMPANY
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {businessName}
              </div>

              <div
                style={{
                  marginTop: 26,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <PreviewInfo
                  label="고객명"
                  value={customer.name || "-"}
                />
                <PreviewInfo
                  label="시공 유형"
                  value={customer.service_type || "-"}
                />
                <PreviewInfo
                  label="시공일"
                  value={formatDate(installationDate)}
                />
                <PreviewInfo
                  label="연락처"
                  value={businessProfile?.phone || "-"}
                />
              </div>
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              PDF 구성 · 표지 / 고객·시공 정보 / 시공 전 / 시공 후 / 전·후 비교
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#111827",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: WHITE,
          fontSize: 16,
          fontWeight: 900,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}