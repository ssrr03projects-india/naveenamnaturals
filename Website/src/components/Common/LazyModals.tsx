"use client";

import dynamic from "next/dynamic";

// Lazy load modals for better performance (client component wrapper)
const ModalCart = dynamic(() => import("@/components/Modal/ModalCart"), {
  ssr: false,
});
const ModalWishlist = dynamic(
  () => import("@/components/Modal/ModalWishlist"),
  { ssr: false },
);
const ModalSearch = dynamic(() => import("@/components/Modal/ModalSearch"), {
  ssr: false,
});
const ModalQuickview = dynamic(
  () => import("@/components/Modal/ModalQuickview"),
  { ssr: false },
);
const ModalCompare = dynamic(() => import("@/components/Modal/ModalCompare"), {
  ssr: false,
});

export default function LazyModals() {
  return (
    <>
      <ModalCart />
      <ModalWishlist />
      <ModalSearch />
      <ModalQuickview />
      <ModalCompare />
    </>
  );
}
