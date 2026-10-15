export const metadata = {
  title: "(EVENT) 1:1 고객센터",
  description: "회원들과 함께하는 실시간 VIP 이벤트 커뮤니티",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/avatars/admin.png.png", shortcut: "/avatars/admin.png.png", apple: "/avatars/admin.png.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          background: "#0c0d10",
        }}
      >
        {children}
      </body>
    </html>
  );
}
