import { useState, useEffect } from "react";
import { DownloadIcon, DatabaseIcon, CpuIcon, BoxIcon, CheckCircle2Icon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";

// Base environments definition with styling
const baseEnvironments = [
  {
    id: "nodejs",
    name: "Node.js",
    icon: <BoxIcon className="w-6 h-6 text-green-500" />,
    description: "Chrome'un V8 JavaScript motoru üzerine kurulu JavaScript çalışma ortamı.",
    apiId: "nodejs",
  },
  {
    id: "python",
    name: "Python",
    icon: <CpuIcon className="w-6 h-6 text-blue-500" />,
    description: "Python, genel amaçlı programlama dili.",
    apiId: "python",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: <DatabaseIcon className="w-6 h-6 text-indigo-500" />,
    description: "Güçlü, açık kaynaklı nesne-ilişkisel veritabanı sistemi.",
    apiId: "postgresql",
  },
  {
    id: "sqlite",
    name: "SQLite",
    icon: <DatabaseIcon className="w-6 h-6 text-sky-400" />,
    description: "Küçük, hızlı, bağımsız ve yüksek güvenilirlik sağlayan SQL veritabanı motoru.",
    apiId: "sqlite",
  }
];

interface LocalStatus {
  id: string;
  installed: boolean;
  version: string | null;
}

interface EnvState {
  id: string;
  name: string;
  icon: JSX.Element;
  description: string;
  versions: string[];
  status: "yükleniyor" | "yüklendi" | "yüklü değil" | "indiriliyor" | "hata";
  currentVersion: string | null;
  errorMessage?: string;
}

export function EnvironmentManager() {
  const [envs, setEnvs] = useState<EnvState[]>(
    baseEnvironments.map(e => ({ ...e, versions: ["Yükleniyor..."], status: "yükleniyor", currentVersion: null }))
  );

  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch local installation statuses from Rust backend
        const localStatuses: LocalStatus[] = await invoke("check_local_installations");

        // Fetch remote versions from endoflife.date
        const updatedEnvs = await Promise.all(
          baseEnvironments.map(async (baseEnv) => {
            let versions = ["En güncel"];
            try {
              const res = await fetch(`https://endoflife.date/api/${baseEnv.apiId}.json`);
              if (res.ok) {
                const data = await res.json();
                versions = data.slice(0, 5).map((d: any) => d.latest); // Get 5 latest minor/major versions
              }
            } catch (err) {
              console.error(`${baseEnv.apiId} için versiyonlar yüklenemedi`, err);
            }

            const local = localStatuses.find(s => s.id === baseEnv.id);
            const isInstalled = local?.installed ?? false;

            setSelectedVersions(prev => ({ ...prev, [baseEnv.id]: versions[0] }));

            return {
              ...baseEnv,
              versions,
              status: isInstalled ? "yüklendi" as const : "yüklü değil" as const,
              currentVersion: local?.version ?? null,
            };
          })
        );

        setEnvs(updatedEnvs);
      } catch (err) {
        console.error("Ortam verileri yüklenemedi", err);
      }
    }

    loadData();
  }, []);

  const handleDownload = async (id: string) => {
    const versionToInstall = selectedVersions[id];

    setEnvs(prev => prev.map(env => {
      if (env.id === id) {
        return { ...env, status: "indiriliyor", errorMessage: undefined };
      }
      return env;
    }));

    try {
      // Invoke the Tauri command to perform silent installation via winget
      await invoke("install_environment", { id, version: versionToInstall });

      // Wait a moment then re-check local installations
      const localStatuses: LocalStatus[] = await invoke("check_local_installations");
      const local = localStatuses.find(s => s.id === id);

      setEnvs(prev => prev.map(env => {
        if (env.id === id) {
          return {
            ...env,
            status: local?.installed ? "yüklendi" : "yüklü değil",
            currentVersion: local?.version ?? versionToInstall,
            errorMessage: local?.installed ? undefined : "Kurulum tamamlanmasına rağmen doğrulama başarısız oldu."
          };
        }
        return env;
      }));
    } catch (error: any) {
      console.error(`${id} için kurulum başarısız oldu:`, error);
      setEnvs(prev => prev.map(env => {
        if (env.id === id) {
          return { ...env, status: "hata", errorMessage: error.toString() };
        }
        return env;
      }));
    }
  };

  const handleVersionChange = (id: string, version: string) => {
    setSelectedVersions(prev => ({ ...prev, [id]: version }));
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 w-full max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Ortam Yönetimi</h1>
        <p className="text-muted-foreground">
          Yerel çalışma ortamlarınızı ve veritabanlarınızı yönetin..
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {envs.map((env) => (
          <div key={env.id} className="flex flex-col p-6 bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-start justify-between mb-4 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  {env.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{env.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {env.status === "yükleniyor" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                        Tarama yapılıyor...
                      </span>
                    ) : env.status === "yüklendi" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2Icon className="w-3.5 h-3.5" />
                        Kurulu ({env.currentVersion})
                      </span>
                    ) : env.status === "indiriliyor" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                        Kurulum Başlatıldı...
                      </span>
                    ) : env.status === "hata" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircleIcon className="w-3.5 h-3.5" />
                        Kurulum Hatası
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                        Kurulu Değil
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 z-10 flex-grow">
              {env.description}
            </p>

            {env.errorMessage && (
              <div className="mb-4 text-xs text-red-400 bg-red-500/10 p-2 rounded z-10 break-words">
                {env.errorMessage}
              </div>
            )}

            <div className="flex items-center gap-3 mt-auto z-10">
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedVersions[env.id] || ""}
                onChange={(e) => handleVersionChange(env.id, e.target.value)}
                disabled={env.status === "indiriliyor" || env.status === "yükleniyor"}
              >
                {env.versions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <Button
                onClick={() => handleDownload(env.id)}
                disabled={env.status === "indiriliyor" || env.status === "yükleniyor"}
                className="gap-2 min-w-[120px]"
                variant={env.status === "yüklendi" ? "secondary" : "default"}
              >
                {env.status === "indiriliyor" ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    Bekle
                  </>
                ) : env.status === "yüklendi" ? (
                  <>
                    <DownloadIcon className="w-4 h-4" />
                    Güncelle
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-4 h-4" />
                    Kur
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
