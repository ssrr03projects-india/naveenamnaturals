import React from "react";
import CategoryCard from "./CategoryCard";

interface CategoryCardData {
  image: string;
  title: string;
  url: string;
  bgColor?: string; // Solid color (optional)
  gradient?: string; // CSS gradient (optional)
}

interface CategoryCardGridProps {
  cards: CategoryCardData[];
  className?: string;
}

const CategoryCardGrid: React.FC<CategoryCardGridProps> = ({
  cards,
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1 ${className}`}
    >
      {cards.map((card, index) => (
        <CategoryCard
          key={index}
          image={card.image}
          title={card.title}
          url={card.url}
          gradient={card.gradient}
        />
      ))}
    </div>
  );
};

export default CategoryCardGrid;
export type { CategoryCardData };
