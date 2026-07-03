import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getBackendAssetUrl } from "@/lib/media";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBackendImageUrl(url: string | null | undefined) {
  return getBackendAssetUrl(url, "/images/NaveenamNaturalsLogo.png");
}
