"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Define the subpages we want to preload
const accountSubpages = [
  "/account-settings/personal-information",
  "/account-settings/notifications",
  "/account-settings/privacy-security",
  "/account-settings/help-support"
];

export default function AccountSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Preload all subpages first
    accountSubpages.forEach(path => {
      router.prefetch(path);
    });

    // Then redirect to personal information page by default
    // Using setTimeout to ensure prefetching has time to start
    const redirectTimer = setTimeout(() => {
      router.replace("/account-settings/personal-information");
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  // Show a minimal loading state while prefetching and redirecting
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-[#0A5C36] opacity-70">
        Loading account settings...
      </div>
    </div>
  );
} 