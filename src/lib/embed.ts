export type EmbedConfig = {
  theme?: "light" | "dark" | "auto";
  accentColor?: string;
  radius?: "sharp" | "soft" | "round";
  size?: "compact" | "standard" | "tall";
  showChapters?: boolean;
  showTranscript?: boolean;
  showOpenPlayer?: boolean;
};

export const defaultEmbedConfig: EmbedConfig = {
  theme: "auto",
  accentColor: "#111827",
  radius: "round",
  size: "standard",
  showChapters: false,
  showTranscript: false,
  showOpenPlayer: false,
};

export function normalizeEmbedConfig(_input: unknown): Partial<EmbedConfig> {
  return {};
}

export function mergeEmbedConfig(
  _base: unknown,
  _overrides: Partial<EmbedConfig> = {}
): EmbedConfig {
  return defaultEmbedConfig;
}

export function parseEmbedConfigSearchParams(
  _params: Record<string, string | string[] | undefined>
): Partial<EmbedConfig> {
  return {};
}

export function embedConfigToQuery(_config: EmbedConfig) {
  return "";
}

export function embedHeight(_config?: EmbedConfig) {
  return 96;
}
