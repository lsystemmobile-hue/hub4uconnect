import { createContext, useContext, useEffect, useState } from "react";
import {
  AI_STORAGE_KEY,
  clearAiConfig,
  getBrowserStorage,
  getDefaultAiConfig,
  getDefaultModel,
  hasConfiguredAi,
  loadAiConfig,
  normalizeAiConfig,
  saveAiConfig,
  type AiConfig,
  type AiProviderId,
} from "@/lib/assistant";

interface AssistantConfigContextValue {
  hydrated: boolean;
  config: AiConfig;
  setConfig: (config: AiConfig) => void;
  updateConfig: (patch: Partial<AiConfig>) => void;
  resetConfig: () => void;
  hasConfiguredAi: boolean;
}

const AssistantConfigContext = createContext<AssistantConfigContextValue | undefined>(undefined);

export function AssistantConfigProvider({ children }: { children: React.ReactNode }) {
  const storage = getBrowserStorage();
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfigState] = useState<AiConfig>(() => loadAiConfig(storage));

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveAiConfig(config, storage);
  }, [config, hydrated, storage]);

  useEffect(() => {
    if (!storage || typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== AI_STORAGE_KEY) {
        return;
      }

      setConfigState(loadAiConfig(storage));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storage]);

  const setConfig = (nextConfig: AiConfig) => {
    setConfigState(normalizeAiConfig(nextConfig));
  };

  const updateConfig = (patch: Partial<AiConfig>) => {
    setConfigState((currentConfig) => {
      const nextProvider = patch.provider && isAiProviderId(patch.provider) ? patch.provider : currentConfig.provider;
      const nextModel =
        patch.model?.trim() ?? currentConfig.model ?? getDefaultModel(nextProvider);

      return normalizeAiConfig({
        ...currentConfig,
        ...patch,
        provider: nextProvider,
        model: nextModel,
      });
    });
  };

  const resetConfig = () => {
    const defaults = getDefaultAiConfig();
    setConfigState(defaults);
    clearAiConfig(storage);
  };

  return (
    <AssistantConfigContext.Provider
      value={{
        hydrated,
        config,
        setConfig,
        updateConfig,
        resetConfig,
        hasConfiguredAi: hasConfiguredAi(config),
      }}
    >
      {children}
    </AssistantConfigContext.Provider>
  );
}

export function useAssistantConfig() {
  const context = useContext(AssistantConfigContext);
  if (!context) {
    throw new Error("useAssistantConfig must be used within AssistantConfigProvider.");
  }

  return context;
}

function isAiProviderId(value: string): value is AiProviderId {
  return value === "groq" || value === "openai" || value === "gemini";
}
