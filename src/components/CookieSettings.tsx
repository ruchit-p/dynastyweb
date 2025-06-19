"use client";

// MARK: CookieSettings component (simple placeholder)

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CookiePrefs {
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "dynasty_cookie_prefs";

export default function CookieSettings() {
  const [prefs, setPrefs] = useState<CookiePrefs>({ analytics: true, marketing: true });
  const [saved, setSaved] = useState(false);

  // Load saved prefs from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrefs(JSON.parse(raw));
      }
    } catch (_) {}
  }, []);

  const savePrefs = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (_) {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="analytics">Analytics Cookies</Label>
          <p className="text-sm text-gray-500 max-w-sm">
            Allow us to collect anonymous usage statistics to improve Dynasty.
          </p>
        </div>
        <Switch
          id="analytics"
          checked={prefs.analytics}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="marketing">Marketing Cookies</Label>
          <p className="text-sm text-gray-500 max-w-sm">
            Used for personalized offers and promotions.
          </p>
        </div>
        <Switch
          id="marketing"
          checked={prefs.marketing}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
        />
      </div>

      <Button onClick={savePrefs} className="mt-2">
        {saved ? "Saved!" : "Save Preferences"}
      </Button>
    </div>
  );
} 