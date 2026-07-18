import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard/topics", label: "Topics" },
  { href: "/dashboard/creators", label: "Creators" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-white/10 p-4">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold">Tweety</span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
            prototype
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="mt-8 block rounded-md px-3 py-2 text-sm text-white/40 hover:bg-white/5 hover:text-white/70"
        >
          Log out
        </Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
