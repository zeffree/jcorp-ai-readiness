import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardClient } from "@/app/admin/DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <>
      <AppHeader right={<SignOutButton />} />
      <DashboardClient />
    </>
  );
}
