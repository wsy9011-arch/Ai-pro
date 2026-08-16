import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "필패스 | 필리핀 여행 패스",
  description:
    "세부, 보홀, 보라카이, 마닐라, 팔라완의 투어·호텔·항공·픽업을 비교하고 예약하는 필리핀 여행 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
