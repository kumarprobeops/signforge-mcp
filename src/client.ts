/**
 * SignForge API client — lightweight HTTP wrapper for V1 endpoints.
 */

import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.SIGNFORGE_API_KEY || "";
const BASE_URL = (process.env.SIGNFORGE_API_URL || "https://signforge.io/api/v1").replace(/\/$/, "");

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}
    throw new Error(`SignForge API error (${res.status}): ${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function downloadDocument(endpoint: string, outputPath: string): Promise<string> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY },
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}
    throw new Error(`SignForge API error (${res.status}): ${detail || "Failed to download document"}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const resolvedPath = path.resolve(outputPath);
  fs.writeFileSync(resolvedPath, buffer);
  return resolvedPath;
}

export function readPdfAsBase64(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return fs.readFileSync(resolved).toString("base64");
}
