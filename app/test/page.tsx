"use client";

import { useState } from "react";
import { CustomButton } from "../design-system/components/button";
import { AdminThemePanel } from "../design-system/components/admin-theme-panel";
import { UserThemePanel } from "../design-system/components/user-theme-panel";
import { CustomInput } from "../design-system/components/input";
import { CustomSelect } from "../design-system/components/select";
import { CustomSwitch } from "../design-system/components/switch";
import { CustomCard } from "../design-system/components/card";
import { CustomModal } from "../design-system/components/modal";
import { FloatButton } from "../design-system/components/float-button";
import { useTheme } from "../design-system/theme/provider";

export default function TestThemePage() {
  const { mode, setMode, style, setStyle } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(false);

  const examples: string[] = [
    "bg-blue-dark-800",
    "bg-green-dark-700",
    "bg-admin-light-300",
    "bg-user-dark-500",
    "bg-admin-admin-600",
    "bg-user-user-400",
    "bg-admin-admin-admin",   
    "bg-user-user-user",
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <CustomCard title="Theme Controls" variant="info">
          <div className="mb-4 flex flex-wrap gap-3">
            <CustomButton variant="secondary" onClick={() => setMode("light")}>
              mode: light
            </CustomButton>
            <CustomButton variant="neutral" onClick={() => setMode("dark")}>
              mode: dark
            </CustomButton>
            <CustomButton variant="primary" onClick={() => setStyle("light")}>
              style: light
            </CustomButton>
            <CustomButton variant="warning" onClick={() => setStyle("dark")}>
              style: dark
            </CustomButton>
            <CustomButton variant="success" onClick={() => setStyle("fantasy")}>
              style: fantasy
            </CustomButton>
          </div>
          <p className="text-text-secondary">
            Current mode: <b>{mode}</b> | Current style: <b>{style}</b>
          </p>
        </CustomCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CustomCard title="Inputs & Select" variant="primary">
            <div className="flex flex-col gap-3">
              <CustomInput placeholder="Type your name..." variant="primary" />
              <CustomInput placeholder="Disabled input" variant="warning" disabled />
              <CustomSelect variant="success" defaultValue="one">
                <option value="one">Option One</option>
                <option value="two">Option Two</option>
                <option value="three">Option Three</option>
              </CustomSelect>
            </div>
          </CustomCard>

          <CustomCard title="Switch & Modal" variant="secondary">
            <div className="flex flex-col gap-4">
              <CustomSwitch
                checked={isSwitchOn}
                onChange={setIsSwitchOn}
                variant="info"
                label={`Switch is ${isSwitchOn ? "ON" : "OFF"}`}
              />
              <CustomButton
                variant="danger"
                hover="lift"
                shadow="md"
                onClick={() => setIsModalOpen(true)}
              >
                Open Modal
              </CustomButton>
            </div>
          </CustomCard>
        </div>

        <CustomCard title="Token Classes Preview" variant="warning">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {examples.map((token) => (
              <div key={token} className={`rounded-lg border border-ui-primary/30 bg-bg-surface p-4 ${token}`}>
                {token}
              </div>
            ))}
          </div>
        </CustomCard>

        <AdminThemePanel />
        <UserThemePanel />
      </div>

      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Custom Modal Demo"
        variant="primary"
      >
        This modal uses the same shared variant system as all UI components.
      </CustomModal>

      <FloatButton
        label="Quick Action"
        variant="success"
        position="bottom-right"
        onClick={() => setIsModalOpen(true)}
      />
    </div>
  );
}