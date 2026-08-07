import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AccentPreset {
  id: string;
  label: string;
  from: string;
  via: string;
  to: string;
  bubble: string;
  shellFrom: string;
  shellVia: string;
  shellTo: string;
  border: string;
  soft: string;
  text: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "violet",
    label: "Tím",
    from: "139, 92, 246",
    via: "99, 102, 241",
    to: "168, 85, 247",
    bubble: "linear-gradient(135deg,#8b5cf6,#4f46e5)",
    shellFrom: "245, 243, 255",
    shellVia: "238, 242, 255",
    shellTo: "250, 245, 255",
    border: "221, 214, 254",
    soft: "245, 243, 255",
    text: "124, 58, 237"
  },
  {
    id: "blue",
    label: "Xanh dương",
    from: "56, 189, 248",
    via: "59, 130, 246",
    to: "37, 99, 235",
    bubble: "linear-gradient(135deg,#38bdf8,#3b82f6)",
    shellFrom: "240, 249, 255",
    shellVia: "239, 246, 255",
    shellTo: "219, 234, 254",
    border: "191, 219, 254",
    soft: "239, 246, 255",
    text: "37, 99, 235"
  },
  {
    id: "pink",
    label: "Hồng",
    from: "244, 114, 182",
    via: "244, 63, 94",
    to: "225, 29, 72",
    bubble: "linear-gradient(135deg,#f472b6,#f43f5e)",
    shellFrom: "253, 242, 248",
    shellVia: "255, 241, 242",
    shellTo: "252, 231, 243",
    border: "251, 207, 232",
    soft: "253, 242, 248",
    text: "219, 39, 119"
  },
  {
    id: "green",
    label: "Xanh lá",
    from: "52, 211, 153",
    via: "16, 185, 129",
    to: "13, 148, 136",
    bubble: "linear-gradient(135deg,#34d399,#0d9488)",
    shellFrom: "236, 253, 245",
    shellVia: "240, 253, 250",
    shellTo: "204, 251, 241",
    border: "167, 243, 208",
    soft: "236, 253, 245",
    text: "5, 150, 105"
  },
  {
    id: "orange",
    label: "Cam",
    from: "251, 146, 60",
    via: "245, 158, 11",
    to: "234, 88, 12",
    bubble: "linear-gradient(135deg,#fb923c,#f59e0b)",
    shellFrom: "255, 247, 237",
    shellVia: "255, 251, 235",
    shellTo: "254, 243, 199",
    border: "253, 230, 138",
    soft: "255, 247, 237",
    text: "234, 88, 12"
  }
];

const applyAccentToDocument = (preset: AccentPreset) => {
  const root = document.documentElement;
  root.dataset.accent = preset.id;
  root.style.setProperty("--accent-from", preset.from);
  root.style.setProperty("--accent-via", preset.via);
  root.style.setProperty("--accent-to", preset.to);
  root.style.setProperty("--accent-shell-from", preset.shellFrom);
  root.style.setProperty("--accent-shell-via", preset.shellVia);
  root.style.setProperty("--accent-shell-to", preset.shellTo);
  root.style.setProperty("--accent-border", preset.border);
  root.style.setProperty("--accent-soft", preset.soft);
  root.style.setProperty("--accent-text", preset.text);
};

interface AccentThemeState {
  accentId: string;
  setAccentId: (accentId: string) => void;
  applyAccent: () => void;
  getCurrentPreset: () => AccentPreset;
}

export const accentThemeStore = create<AccentThemeState>()(
  persist(
    (set, get) => ({
      accentId: "violet",
      setAccentId(accentId) {
        const preset = ACCENT_PRESETS.find((item) => item.id === accentId) ?? ACCENT_PRESETS[0];
        set({ accentId: preset.id });
        applyAccentToDocument(preset);
      },
      applyAccent() {
        const preset = get().getCurrentPreset();
        applyAccentToDocument(preset);
      },
      getCurrentPreset() {
        return ACCENT_PRESETS.find((item) => item.id === get().accentId) ?? ACCENT_PRESETS[0];
      }
    }),
    { name: "chat-accent-store" }
  )
);
