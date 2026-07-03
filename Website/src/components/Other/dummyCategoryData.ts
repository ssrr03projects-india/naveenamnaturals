import { CategoryCardData } from "./CategoryCardGrid";

export const sampleCards: CategoryCardData[] = [
  {
    image: "/images/offers/1.png",
    title: "Flat 10% Off",
    url: "/product?type=skincare",
    gradient: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
  },
  {
    image: "/images/offers/2.jpg",
    title: "Under ₹199",
    url: "/product?type=hair-care",
    gradient: "linear-gradient(135deg, var(--accent) 0%, var(--red) 100%)",
  },
  {
    image: "/images/offers/3.jpg",
    title: "Under ₹299",
    url: "/product?type=body-care",
    gradient: "linear-gradient(135deg, var(--primary) 0%, var(--surface) 100%)",
  },
  {
    image: "/images/offers/4.jpg",
    title: "Under ₹599",
    url: "/product?type=wellness",
    gradient: "linear-gradient(135deg, var(--accent) 0%, var(--surface) 100%)",
  },
];
