export function getCardsAlertTheme(theme: any) {
  return {
    filter: {
      bg: theme.filter_bg_color || "#9c7a2d",
      hover: theme.filter_hover_color || "#b99236",
      border: theme.filter_border_color || "#d4af37",
      text: theme.filter_text_color || "#111111",
    },

    reset: {
      bg: theme.reset_bg_color || "#9c7a2d",
      hover: theme.reset_hover_color || "#b99236",
      border: theme.reset_border_color || "#d4af37",
      text: theme.reset_text_color || "#991b1b",
    },

    report: {
      bg: theme.report_bg_color || "#991b1b",
      hover: theme.report_hover_color || "#dc2626",
      border: theme.report_border_color || "#7f1d1d",
      text: theme.report_text_color || "#ffffff",
    },
  };
}