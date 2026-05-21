"use client";

import React from "react";
import SettingsSidebar from "../SettingsSidebar";
import ManageUsersContent from "@/components/manage-users/ManageUsersContent";

export default function SettingsManageUsersPage() {
  return (
    <div className="flex bg-white min-h-[85vh] border border-gray-200 rounded-lg overflow-hidden shadow-sm font-sans">
      <SettingsSidebar />
      <ManageUsersContent />
    </div>
  );
}
