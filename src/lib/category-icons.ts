import { CupIcon, MenuCardIcon, PenIcon, ShirtIcon } from "@/components/icons";

/** Keyed by ProductCategory.key -- shared by the homepage and the per-category pages. */
export const categoryIcons = {
  apparel: ShirtIcon,
  print: MenuCardIcon,
  drinkware: CupIcon,
  retail: PenIcon,
} as const;
