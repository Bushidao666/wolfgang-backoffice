import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col gap-6">
          <Header />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

