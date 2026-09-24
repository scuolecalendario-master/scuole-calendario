import "server-only";

import { cookies } from "next/headers";

export const SCHOOL_CODE_COOKIE = "school_code";

export function normalizeSchoolCode(code: string) {
  return code.trim().toUpperCase();
}

export async function getSchoolCode() {
  const cookieStore = await cookies();
  return cookieStore.get(SCHOOL_CODE_COOKIE)?.value ?? null;
}
