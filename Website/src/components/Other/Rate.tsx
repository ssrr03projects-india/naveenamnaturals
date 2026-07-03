import React from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface RateProps {
    currentRate: number | undefined
    size: number
}

const Rate: React.FC<RateProps> = ({ currentRate, size }) => {
    const rate = currentRate || 0;
    const arrOfStar = [];
    
    for (let i = 0; i < 5; i++) {
        // Show filled star if current index is less than the rating (rounded)
        // For example: rate 4.5 → show 5 filled stars, rate 4.2 → show 4 filled stars
        if (i < Math.round(rate)) {
            arrOfStar.push(<Icon.Star key={i} size={size} color="var(--yellow)" weight="fill" />);
        } else {
            arrOfStar.push(<Icon.Star key={i} size={size} color="var(--secondary2)" weight="fill" />);
        }
    }
    
    return <div className="rate flex items-center gap-0.5">{arrOfStar}</div>;
}

export default Rate
