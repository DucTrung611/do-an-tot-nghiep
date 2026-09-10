import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState<boolean>(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(MOBILE_BREAKPOINT).matches,
    );

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_BREAKPOINT);
        const onChange = () => setIsMobile(mql.matches);
        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isMobile;
};
