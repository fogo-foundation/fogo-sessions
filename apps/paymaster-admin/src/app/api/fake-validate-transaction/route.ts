import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { stdout } = await execAsync('echo "Valid Success"');
    return NextResponse.json({ success: true, message: stdout.trim() });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Error: ${(error as Error).message}`,
    });
  }
}