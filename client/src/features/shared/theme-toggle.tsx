import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themeStore } from "@/features/shared/theme.store";

export function ThemeToggle() {
  const mode = themeStore((state) => state.mode);
  const toggleTheme = themeStore((state) => state.toggleTheme);

  return (
    <Button size="icon" variant="outline" onClick={toggleTheme} aria-label="Toggle theme">
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
