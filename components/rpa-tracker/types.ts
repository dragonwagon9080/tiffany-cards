export type RegistryGroup = {
  Slug: string;

  Card_Title: string;
  Card_Title_Display: string;

  Player: string;
  Year: string;
  Brand: string;
  Set: string;
  Variation: string;
  Sport: string;
  Material: string;

  Description: string;

  Main_Page_Image: string;

  Count: number;

  HighestGrade?: string;
  LastUpdated?: string;
};

export type FilterOptions = {
  sports: string[];
  players: string[];
  years: string[];
  brands: string[];
  variations: string[];
};

export type TrackerMeta = {
  total: number;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  cardCount: number;
  groupCount: number;

  refreshedAt: string;
};

export type TrackerTheme = {
  filter_bg_color?: string;
  filter_hover_color?: string;
  filter_border_color?: string;
  filter_text_color?: string;

  reset_bg_color?: string;
  reset_hover_color?: string;
  reset_border_color?: string;
  reset_text_color?: string;

  button_bg_color?: string;
  button_hover_color?: string;
  button_text_color?: string;

  report_bg_color?: string;
  report_hover_color?: string;
  report_border_color?: string;
  report_text_color?: string;

  page_bg_color?: string;

  card_bg_color?: string;
  card_hover_color?: string;
  card_border_color?: string;
  card_hover_border_color?: string;
  card_glow_color?: string;

  stats_text_color?: string;
  stats_number_color?: string;

  link_color?: string;
  link_hover_color?: string;

  heading_color?: string;
  subheading_color?: string;
};