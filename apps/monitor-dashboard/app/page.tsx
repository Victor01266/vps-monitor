import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Home() {
  return (
    <MainLayout>
      <DashboardClient />
    </MainLayout>
  );
}
