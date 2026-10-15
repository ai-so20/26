export const metadata = {
  title: "VIP 이벤트 · 혜택",
  description: "매시간 이벤트와 출석 혜택을 만나는 VIP 공간",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/avatars/admin.png.png", shortcut: "/avatars/admin.png.png", apple: "/avatars/admin.png.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          background: "#ffffff",
          color: "#17233f",
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif',
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
        }}
      >
        {children}
      </body>
    </html>
  );
}
