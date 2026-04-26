/**
 * Minimal stdio MCP JSON-RPC client — shared between probe.ts (read-path,
 * default `npm run probe`) and probe-write.ts (write-path, opt-in
 * `npm run probe:write` per AC-6.4).
 *
 * Why raw stdio instead of the MCP SDK client: full visibility into
 * stderr capture, JSON-RPC error shapes, and timeout behavior. The probe
 * is the test artifact for Phase 1; we keep it dependency-light.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/lib/ → scripts/ → project root → dist/server.js
export const SERVER_PATH = resolve(__dirname, "..", "..", "dist/server.js");

export const REQUEST_TIMEOUT_MS = 30_000;
export const PROTOCOL_VERSION = "2024-11-05";
export const EXPECTED_BOOT_LOG_PREFIX = "[salesmfast-ops] active_categories=";

export type JsonRpcId = number | string;
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}
export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}
export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}
export interface JsonRpcError {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: { code: number; message: string; data?: unknown };
}
export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

export class McpStdioClient {
  private proc: ChildProcessWithoutNullStreams;
  private buf = "";
  private nextId = 1;
  private pending = new Map<
    JsonRpcId,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  public stderr = "";
  public exited = false;

  constructor(env: Record<string, string>) {
    this.proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.stderr.on("data", (chunk: Buffer) => {
      this.stderr += chunk.toString("utf8");
    });
    this.proc.stdout.on("data", (chunk: Buffer) => this.handleChunk(chunk));
    this.proc.on("exit", () => {
      this.exited = true;
      for (const [, { reject, timeout }] of this.pending) {
        clearTimeout(timeout);
        reject(new Error("server process exited before response"));
      }
      this.pending.clear();
    });
  }

  private handleChunk(chunk: Buffer): void {
    this.buf += chunk.toString("utf8");
    const lines = this.buf.split("\n");
    this.buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg: JsonRpcResponse;
      try {
        msg = JSON.parse(trimmed) as JsonRpcResponse;
      } catch {
        continue;
      }
      if (msg.id === undefined || !this.pending.has(msg.id)) continue;
      const entry = this.pending.get(msg.id);
      if (!entry) continue;
      clearTimeout(entry.timeout);
      this.pending.delete(msg.id);
      if ("error" in msg) {
        const err = new Error(msg.error.message) as Error & {
          code?: number;
          data?: unknown;
        };
        err.code = msg.error.code;
        err.data = msg.error.data;
        entry.reject(err);
      } else {
        entry.resolve(msg.result);
      }
    }
  }

  request(
    method: string,
    params?: unknown,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<unknown> {
    const id = this.nextId++;
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.proc.stdin.write(JSON.stringify(msg) + "\n");
    });
  }

  notify(method: string, params?: unknown): void {
    const msg: JsonRpcNotification = { jsonrpc: "2.0", method, params };
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "salesmfast-probe", version: "0.1.0" },
    });
    this.notify("notifications/initialized");
  }

  async close(): Promise<void> {
    if (this.exited) return;
    this.proc.kill("SIGTERM");
    await new Promise<void>((res) => {
      const t = setTimeout(() => {
        this.proc.kill("SIGKILL");
        res();
      }, 2000);
      this.proc.once("exit", () => {
        clearTimeout(t);
        res();
      });
    });
  }
}
