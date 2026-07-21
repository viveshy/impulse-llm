import type { Metadata } from "next";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Settings</span>
      </Topbar>
      <SettingsPanel />
    </>
  );
}
