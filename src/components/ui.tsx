import Link from "next/link";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { HeaderAccount } from "@/components/HeaderAccount";

const NAV = [
  { href: "/products", label: "Товары" },
  { href: "/orders", label: "Заказы" },
  { href: "/digital", label: "Электронные товары" },
  { href: "/inventory", label: "Остатки" },
  { href: "/settings", label: "Настройки" },
];

export async function AppHeader({ active }: { active?: string }) {
  const user = await getCurrentUser();
  if (!user) {
    await clearSessionCookie();
    redirect("/login");
  }

  const settings = await getSettings();
  const pendingDigital = await prisma.order.count({
    where: {
      isDigital: true,
      digitalDelivered: false,
      status: "PROCESSING",
    },
  });

  const nav = [
    ...NAV,
    ...(user.role === "admin" ? [{ href: "/users", label: "Пользователи" }] : []),
  ];

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-[#1a1a1a]">
            YM
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--text)]">
              Digital Seller
            </div>
            <div className="text-xs text-[var(--muted)]">
              {settings.shopName || "Яндекс Маркет"}
            </div>
          </div>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {nav.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
                {item.href === "/orders" && pendingDigital > 0 ? (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warn)] px-1.5 text-[11px] font-semibold text-white">
                    {pendingDigital}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <HeaderAccount login={user.login} role={user.role} />
      </div>
    </header>
  );
}

export function PageShell({
  title,
  description,
  actions,
  children,
  tabs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tabs?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="mb-4">{tabs}</div> : null}
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "danger" | "info";
}) {
  const tones = {
    default: "bg-[var(--surface)] text-[var(--text)]",
    ok: "bg-[#e8f6ec] text-[#1a7f37]",
    warn: "bg-[#fff4e5] text-[#b35c00]",
    danger: "bg-[#fdeceb] text-[#c62828]",
    info: "bg-[#e8f1ff] text-[#1a5fb4]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="text-base font-medium text-[var(--text)]">{title}</div>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
