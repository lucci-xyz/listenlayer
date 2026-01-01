export type EmbedTheme = "light" | "dark" | "auto";
export type EmbedRadius = "sharp" | "soft" | "round";
export type EmbedSize = "compact" | "standard" | "tall";

export type EmbedConfig = {
  theme: EmbedTheme;
  accentColor: string;
  radius: EmbedRadius;
  size: EmbedSize;
  showChapters: boolean;
  showTranscript: boolean;
  showOpenPlayer: boolean;
};

export const defaultEmbedConfig: EmbedConfig = {
  theme: "auto",
  accentColor: "#111827",
  radius: "soft",
  size: "standard",
  showChapters: true,
  showTranscript: true,
  showOpenPlayer: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeEmbedConfig(input: unknown): Partial<EmbedConfig> {
  if (!isRecord(input)) return {};
  const theme = input.theme;
  const radius = input.radius;
  const size = input.size;

  return {
    theme: theme === "light" || theme === "dark" || theme === "auto" ? theme : undefined,
    accentColor: typeof input.accentColor === "string" ? input.accentColor : undefined,
    radius: radius === "sharp" || radius === "soft" || radius === "round" ? radius : undefined,
    size: size === "compact" || size === "standard" || size === "tall" ? size : undefined,
    showChapters: typeof input.showChapters === "boolean" ? input.showChapters : undefined,
    showTranscript: typeof input.showTranscript === "boolean" ? input.showTranscript : undefined,
    showOpenPlayer: typeof input.showOpenPlayer === "boolean" ? input.showOpenPlayer : undefined,
  };
}

export function mergeEmbedConfig(
  base: unknown,
  overrides: Partial<EmbedConfig> = {}
): EmbedConfig {
  const normalizedBase = normalizeEmbedConfig(base);
  return {
    theme: overrides.theme ?? normalizedBase.theme ?? defaultEmbedConfig.theme,
    accentColor:
      overrides.accentColor ??
      normalizedBase.accentColor ??
      defaultEmbedConfig.accentColor,
    radius: overrides.radius ?? normalizedBase.radius ?? defaultEmbedConfig.radius,
    size: overrides.size ?? normalizedBase.size ?? defaultEmbedConfig.size,
    showChapters:
      overrides.showChapters ??
      normalizedBase.showChapters ??
      defaultEmbedConfig.showChapters,
    showTranscript:
      overrides.showTranscript ??
      normalizedBase.showTranscript ??
      defaultEmbedConfig.showTranscript,
    showOpenPlayer:
      overrides.showOpenPlayer ??
      normalizedBase.showOpenPlayer ??
      defaultEmbedConfig.showOpenPlayer,
  };
}

function parseBoolean(value: string | undefined) {
  if (value === undefined) return undefined;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

export function parseEmbedConfigSearchParams(
  params: Record<string, string | string[] | undefined>
): Partial<EmbedConfig> {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const theme = get("theme");
  const radius = get("radius");
  const size = get("size");

  return {
    theme: theme === "light" || theme === "dark" || theme === "auto" ? theme : undefined,
    accentColor: get("accent"),
    radius: radius === "sharp" || radius === "soft" || radius === "round" ? radius : undefined,
    size: size === "compact" || size === "standard" || size === "tall" ? size : undefined,
    showChapters: parseBoolean(get("chapters")),
    showTranscript: parseBoolean(get("transcript")),
    showOpenPlayer: parseBoolean(get("open")),
  };
}

export function embedConfigToQuery(config: EmbedConfig) {
  const params = new URLSearchParams();
  params.set("theme", config.theme);
  params.set("accent", config.accentColor);
  params.set("radius", config.radius);
  params.set("size", config.size);
  params.set("chapters", config.showChapters ? "1" : "0");
  params.set("transcript", config.showTranscript ? "1" : "0");
  params.set("open", config.showOpenPlayer ? "1" : "0");
  return params.toString();
}

export function embedHeight(config: EmbedConfig) {
  if (config.size === "compact") return 120;
  if (config.size === "tall") return 220;
  return 160;
}
