"use client";

type MobileBottomNavProps = {
  activeMenu: string;
  onChange: (menu: string) => void;
};

const menus = [
  ["🏠", "대시보드"],
  ["👤", "고객 관리"],
  ["💬", "상담 관리"],
  ["📄", "견적 관리"],
  ["🤖", "AI 상담"],
  ["📊", "매출 분석"],
  ["🤝", "계약 관리"],
  ["💳", "미수금 관리"],
  ["⚙️", "설정"],
];

export default function MobileBottomNav({
  activeMenu,
  onChange,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[99999] border-t border-slate-200 bg-white md:hidden">
      <div className="overflow-x-auto">
        <div className="flex min-w-max px-1 pb-[env(safe-area-inset-bottom)]">
          {menus.map(([icon, name]) => {
            const active = activeMenu === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={`flex min-h-[68px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-1 transition ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 active:bg-slate-100"
                }`}
              >
                <span className="text-xl leading-none">
                  {icon}
                </span>

                <span
                  className={`whitespace-nowrap text-[10px] ${
                    active ? "font-black" : "font-semibold"
                  }`}
                >
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}