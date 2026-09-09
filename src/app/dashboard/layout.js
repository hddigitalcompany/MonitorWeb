import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";

export default async function DashboardLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <DashboardChrome user={user}>{children}</DashboardChrome>;
}
