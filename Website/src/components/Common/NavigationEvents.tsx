"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationEvents() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const currentRoute = () => `${window.location.pathname}${window.location.search}`;

        const shouldTriggerNavigation = (nextUrl: URL): boolean => {
            if (nextUrl.origin !== window.location.origin) return false;
            if (nextUrl.hash && `${nextUrl.pathname}${nextUrl.search}` === currentRoute()) {
                return false;
            }
            return `${nextUrl.pathname}${nextUrl.search}` !== currentRoute();
        };

        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const anchor = target.closest("a");

            if (anchor && anchor instanceof HTMLAnchorElement) {
                const href = anchor.getAttribute("href");
                const isInternal = href && (href.startsWith("/") || href.startsWith(window.location.origin));
                const isDownload = anchor.hasAttribute("download");
                const isTargetBlank = anchor.target === "_blank";
                const isMailto = href?.startsWith("mailto:");
                const isTel = href?.startsWith("tel:");

                if (
                    isInternal &&
                    !isDownload &&
                    !isTargetBlank &&
                    !isMailto &&
                    !isTel &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    event.button === 0
                ) {
                    try {
                        const targetUrl = new URL(anchor.href, window.location.href);
                        if (shouldTriggerNavigation(targetUrl)) {
                            Promise.resolve().then(() => {
                                window.dispatchEvent(new Event("navigation-start"));
                            });
                        }
                    } catch {
                        // Ignore invalid URLs.
                    }
                }
            }
        };

        // Intercept programmatic navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            const nextUrl = args[2];
            if (typeof nextUrl === "string" || nextUrl instanceof URL) {
                const parsed = new URL(String(nextUrl), window.location.href);
                if (shouldTriggerNavigation(parsed)) {
                    Promise.resolve().then(() => {
                        window.dispatchEvent(new Event("navigation-start"));
                    });
                }
            }
            return originalPushState.apply(this, args);
        };

        history.replaceState = function (...args) {
            const nextUrl = args[2];
            if (typeof nextUrl === "string" || nextUrl instanceof URL) {
                const parsed = new URL(String(nextUrl), window.location.href);
                if (shouldTriggerNavigation(parsed)) {
                    Promise.resolve().then(() => {
                        window.dispatchEvent(new Event("navigation-start"));
                    });
                }
            }
            return originalReplaceState.apply(this, args);
        };

        document.addEventListener("click", handleAnchorClick);

        return () => {
            document.removeEventListener("click", handleAnchorClick);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, []);

    useEffect(() => {
        // When pathname or searchParams change, the navigation is "done"
        window.dispatchEvent(new Event("navigation-end"));
    }, [pathname, searchParams]);

    return null;
}
