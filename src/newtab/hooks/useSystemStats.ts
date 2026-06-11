import { useEffect, useRef, useState } from "react";

export type SystemStats = {
  /** 0–100, averaged across cores; null until two samples exist. */
  cpuPercent: number | null;
  cpuCores: number;
  cpuModel: string;
  /** 0–100. */
  ramPercent: number | null;
  ramUsedGB: number;
  ramTotalGB: number;
  /** GPU model string (live GPU usage is not exposed to extensions). */
  gpuModel: string | null;
  battery: { percent: number; charging: boolean } | null;
  /** Rolling CPU history (most recent last) for sparklines. */
  cpuHistory: number[];
};

type CpuSnapshot = { user: number; kernel: number; total: number }[];

const POLL_MS = 2000;
const HISTORY_LEN = 30;

function readGpuModel(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!gl || !("getExtension" in gl)) return null;
    const ext = (gl as WebGLRenderingContext).getExtension(
      "WEBGL_debug_renderer_info"
    );
    if (!ext) return null;
    const raw = (gl as WebGLRenderingContext).getParameter(
      ext.UNMASKED_RENDERER_WEBGL
    ) as string;
    // Strip ANGLE wrapper noise: "ANGLE (NVIDIA, NVIDIA GeForce ... Direct3D11 ...)"
    const angle = raw.match(/ANGLE \([^,]+,\s*([^,(]+?)(?:\s*\(|,)/);
    return (angle?.[1] ?? raw).trim();
  } catch {
    return null;
  }
}

/** Live machine stats for the System panel. CPU % is computed from deltas
 *  between successive chrome.system.cpu snapshots (cumulative counters). */
export function useSystemStats(): SystemStats {
  const [stats, setStats] = useState<SystemStats>({
    cpuPercent: null,
    cpuCores: 0,
    cpuModel: "",
    ramPercent: null,
    ramUsedGB: 0,
    ramTotalGB: 0,
    gpuModel: null,
    battery: null,
    cpuHistory: [],
  });
  const prevCpu = useRef<CpuSnapshot | null>(null);

  useEffect(() => {
    if (typeof chrome === "undefined") return;
    let alive = true;

    const gpuModel = readGpuModel();

    async function poll() {
      let cpuPercent: number | null = null;
      let cpuCores = 0;
      let cpuModel = "";
      try {
        if (chrome.system?.cpu) {
          const info = await chrome.system.cpu.getInfo();
          cpuCores = info.numOfProcessors;
          cpuModel = info.modelName?.trim() ?? "";
          const snap: CpuSnapshot = info.processors.map((p) => ({
            user: p.usage.user,
            kernel: p.usage.kernel,
            total: p.usage.total,
          }));
          const prev = prevCpu.current;
          if (prev && prev.length === snap.length) {
            let busy = 0;
            let total = 0;
            for (let i = 0; i < snap.length; i++) {
              busy +=
                snap[i].user - prev[i].user + (snap[i].kernel - prev[i].kernel);
              total += snap[i].total - prev[i].total;
            }
            if (total > 0) {
              cpuPercent = Math.min(100, Math.max(0, (busy / total) * 100));
            }
          }
          prevCpu.current = snap;
        }
      } catch {
        /* permission missing or API unavailable */
      }

      let ramPercent: number | null = null;
      let ramUsedGB = 0;
      let ramTotalGB = 0;
      try {
        if (chrome.system?.memory) {
          const mem = await chrome.system.memory.getInfo();
          const used = mem.capacity - mem.availableCapacity;
          ramPercent = (used / mem.capacity) * 100;
          ramUsedGB = used / 1024 ** 3;
          ramTotalGB = mem.capacity / 1024 ** 3;
        }
      } catch {
        /* unavailable */
      }

      let battery: SystemStats["battery"] = null;
      try {
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<{ level: number; charging: boolean }>;
        };
        if (nav.getBattery) {
          const b = await nav.getBattery();
          battery = { percent: Math.round(b.level * 100), charging: b.charging };
        }
      } catch {
        /* desktop without battery */
      }

      if (!alive) return;
      setStats((s) => ({
        cpuPercent,
        cpuCores,
        cpuModel,
        ramPercent,
        ramUsedGB,
        ramTotalGB,
        gpuModel,
        battery,
        cpuHistory:
          cpuPercent === null
            ? s.cpuHistory
            : [...s.cpuHistory, cpuPercent].slice(-HISTORY_LEN),
      }));
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return stats;
}
