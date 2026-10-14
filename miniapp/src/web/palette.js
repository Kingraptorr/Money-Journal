import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme } from "../utils/theme.js";

export function useDark() {
  const [theme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return theme === "dark";
}

export function palette(dark, variant = "login") {
  const landing = variant === "landing";
  return {
    bg: dark ? "#0d0d0d" : "#f0f0f0",
    cardBg: dark
      ? landing ? "rgba(30,30,30,.55)" : "rgba(30,30,30,.6)"
      : landing ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.65)",
    glassBorder: dark ? "rgba(255,255,255,.12)" : landing ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.75)",
    text: dark ? "#f2f2f2" : "#111111",
    hint: dark ? "#9a9a9a" : "#666666",
    divider: dark
      ? landing ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.12)"
      : landing ? "rgba(0,0,0,.08)" : "rgba(0,0,0,.1)",
    inputBg: dark ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.8)",
    inputBorder: dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)",
    subtleBg: dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)",
    softShadow: dark ? "0 10px 26px -16px rgba(0,0,0,.6)" : "0 10px 26px -16px rgba(0,0,0,.14)",
    tabActiveBg: dark ? "#2a2a2a" : "#ffffff",
    tabActiveText: dark ? "#f2f2f2" : "#111111",
  };
}

export const BRAND = { green: "#3DDC97", greenText: "#1FA870", greenInk: "#0d2a1d", telegram: "#2AABEE", danger: "#D9534F" };
