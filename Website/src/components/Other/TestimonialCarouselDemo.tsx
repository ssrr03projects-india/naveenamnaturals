import React from "react";
import VideoTestimonialCarousel from "./VideoTestimonialCarousel";

const TestimonialCarouselDemo: React.FC = () => {
  const testimonials = [
    {
      id: "milk-mud-mask",
      title: "Milk Mud Mask",
      price: 499,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual YouTube URL
      thumbnail: "/images/testimonials/milk-mud-mask.jpg",
      testimonialText: "Instant brightness challenge IN 10 MINUTES",
      hashtag: "#RealResults",
      productImage: "/images/products/milk-mud-mask.png",
    },
    {
      id: "milk-powder-facewash",
      title: "Milk Powder Face Wash",
      price: 499,
      videoUrl: "https://www.instagram.com/reel/example1/", // Replace with actual Instagram Reel URL
      thumbnail: "/images/testimonials/milk-powder-facewash.jpg",
      testimonialText: "Powder-To-Foam Formula",
      hashtag: "#Transformation",
      productImage: "/images/products/milk-powder-facewash.png",
    },
    {
      id: "brightening-serum",
      title: "Milk Drops Brightening Serum",
      price: 640,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual YouTube URL
      thumbnail: "/images/testimonials/brightening-serum.jpg",
      testimonialText: "Vilvah made us use that 1 VIRAL SERUM",
      hashtag: "#ViralSerum",
      productImage: "/images/products/brightening-serum.png",
    },
    {
      id: "aloe-vera-gel",
      title: "Aloe Vera Gel",
      price: 379,
      originalPrice: 390,
      videoUrl: "https://www.instagram.com/reel/example2/", // Replace with actual Instagram Reel URL
      thumbnail: "/images/testimonials/aloe-vera-gel.jpg",
      testimonialText: "Use this gem ❤️✨😍",
      hashtag: "#NaturalBeauty",
      productImage: "/images/products/aloe-vera-gel.png",
    },
    {
      id: "under-eye-cream",
      title: "Under Eye Cream (Dark Circles Control)",
      price: 590,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual YouTube URL
      thumbnail: "/images/testimonials/under-eye-cream.jpg",
      testimonialText: "Under Eye Cream 2-Weeks Update",
      hashtag: "#RealPeopleRealStories",
      productImage: "/images/products/under-eye-cream.png",
    },
    {
      id: "hair-growth-oil",
      title: "Hair Growth Oil",
      price: 599,
      originalPrice: 625,
      videoUrl: "https://www.instagram.com/reel/example3/", // Replace with actual Instagram Reel URL
      thumbnail: "/images/testimonials/hair-growth-oil.jpg",
      testimonialText: "Real hair growth progress over time",
      hashtag: "#RealPeopleRealStories",
      productImage: "/images/products/hair-growth-oil.png",
    },
    {
      id: "ageing-serum",
      title: "Better Ageing Serum",
      price: 750,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual YouTube URL
      thumbnail: "/images/testimonials/ageing-serum.jpg",
      testimonialText: "Anti-ageing results you can see",
      hashtag: "#AgeDefying",
      productImage: "/images/products/ageing-serum.png",
    },
  ];

  return (
    <div className="py-12 bg-white">
      <VideoTestimonialCarousel testimonials={testimonials} />
    </div>
  );
};

export default TestimonialCarouselDemo;
