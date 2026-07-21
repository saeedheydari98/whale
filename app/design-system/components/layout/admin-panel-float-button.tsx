"use client";

import { usePathname, useRouter } from "next/navigation";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import { useAppGlobal } from "@/lib/app-global-context";
import { hasAdminRole } from "@/lib/auth-client";
import { FloatButton } from "../ui/float-button";

export function AdminPanelFloatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: globalData } = useAppGlobal();

  if (!hasAdminRole(globalData?.user) || pathname.startsWith("/panel/admin")) {
    return null;
  }

  return (
    <FloatButton
      label="پنل مدیریت"
      icon={<IoShieldCheckmarkOutline />}
      position="bottom-right"
      shadow="lg"
      onClick={() => router.push("/panel/admin")}
    />
  );
}
