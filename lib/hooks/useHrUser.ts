"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useHrUser() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  return email;
}
