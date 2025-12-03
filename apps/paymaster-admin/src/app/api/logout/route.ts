import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const GET = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("sessionToken");
  return NextResponse.json({ message: "Logged out" });
};
