export const getBackendAssetUrl = (
  assetPath: string | null | undefined,
  fallback = "/images/product/default.png",
): string => {
  if (!assetPath || typeof assetPath !== "string") {
    return fallback;
  }

  const trimmedPath = assetPath.trim();

  if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
    return trimmedPath;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api";

  // Extract backendUrl by removing the trailing /api
  let backendUrl = apiBaseUrl.trim();
  if (backendUrl.endsWith("/api")) {
    backendUrl = backendUrl.slice(0, -4);
  }

  if (backendUrl.endsWith("/")) {
    backendUrl = backendUrl.slice(0, -1);
  }

  if (!backendUrl) {
    backendUrl = "http://localhost:5005";
  }

  if (trimmedPath.startsWith("/uploads")) {
    return `${backendUrl}${trimmedPath}`;
  }

  if (trimmedPath.startsWith("/images")) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith("/")) {
    return `${backendUrl}${trimmedPath}`;
  }

  return `${backendUrl}/uploads/${trimmedPath}`;
};
