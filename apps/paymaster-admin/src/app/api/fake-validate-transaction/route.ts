import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export async function POST(_req: NextRequest) {
  try {
    const scriptPath = join(process.cwd(), "scripts", "valid.sh");
    const { stdout } = await execFileAsync(scriptPath);
    return NextResponse.json({ success: true, message: stdout.trim() });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Error: ${(error as Error).message}`,
    });
  }
}