"use client";

import { usePathname, useRouter } from "next/navigation";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import { useAppUser } from "@/lib/app-user-context";
import { hasAdminRole } from "@/lib/auth-client";
import { FloatButton } from "../ui/float-button";
import { startRouteLoading } from "../loading/loading";

export function AdminPanelFloatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: appUserData } = useAppUser();

  if (!hasAdminRole(appUserData?.user) || pathname.startsWith("/panel/admin")) {
    return null;
  }

  return (
    <FloatButton
      label="پنل مدیریت"
      icon={<IoShieldCheckmarkOutline />}
      position="bottom-right"
      shadow="lg"
      onClick={() => {
        startRouteLoading();
        router.push("/panel/admin");
      }}
    />
  );
}
