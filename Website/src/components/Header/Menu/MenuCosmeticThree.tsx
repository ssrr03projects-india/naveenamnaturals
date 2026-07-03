"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  List,
  MagnifyingGlass,
  User,
  Handbag,
  X,
} from "@phosphor-icons/react/dist/ssr";
import "@/styles/header.scss";
import { usePathname } from "next/navigation";
import useLoginPopup from "@/store/useLoginPopup";
import useMenuMobile from "@/store/useMenuMobile";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useModalWishlistContext } from "@/context/ModalWishlistContext";
import { useModalSearchContext } from "@/context/ModalSearchContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LogoutModal from "@/components/Account/LogoutModal";

const MenuCosmeticThree = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { openLoginPopup, handleLoginPopup, closeLoginPopup } = useLoginPopup();
  const { openMenuMobile, handleMenuMobile } = useMenuMobile();
  const [openSubNavMobile, setOpenSubNavMobile] = useState<number | null>(null);
  const { openModalCart } = useModalCartContext();
  const { cartState } = useCart();
  const { openModalWishlist } = useModalWishlistContext();
  const { openModalSearch } = useModalSearchContext();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    // We only close the login popover if it's open
    if (openLoginPopup) {
      handleLoginPopup();
    }
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    router.push("/");
  };

  const handleSupportClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    closeLoginPopup();
    router.push("/contact");
  };

  const handleOurStoryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    closeLoginPopup();
    if (openMenuMobile) {
      handleMenuMobile();
    }
    router.push("/ourstory");
  };

  const handleOpenSubNavMobile = (index: number) => {
    setOpenSubNavMobile(openSubNavMobile === index ? null : index);
  };

  const [fixedHeader, setFixedHeader] = useState(false);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setFixedHeader(scrollPosition > 0 && scrollPosition < lastScrollPosition);
      setLastScrollPosition(scrollPosition);
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Clean up event listener
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollPosition]);

  return (
    <>
      <div
        className={`header-menu style-one ${
          fixedHeader ? " fixed" : "relative"
        } bg-white w-full md:h-[74px] h-[56px]`}
      >
        <div className="container mx-auto h-full">
          <div className="header-main flex justify-between h-full">
            <div
              className="menu-mobile-icon lg:hidden flex items-center"
              role="button"
              tabIndex={0}
              onClick={handleMenuMobile}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMenuMobile(); }}
            >
              <List size={24} weight="bold" />
            </div>
            <Link href={"/"} className="flex items-center">
              <Image
                src="/images/NaveenamNaturalsLogo.png"
                alt="Naveenam Naturals"
                width={120}
                height={60}
                className="h-10 w-auto"
              />
            </Link>
            <div className="menu-main h-full max-lg:hidden">
              <ul className="flex items-center gap-8 h-full font-staler-bold">
                <li className="h-full">
                  <Link
                    href="/"
                    className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${
                      pathname === "/" ? "active" : ""
                    }`}
                  >
                    Home
                  </Link>
                </li>

                <li className="h-full">
                  <Link
                    href="/product"
                    className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${
                      pathname.includes("/product") ? "active" : ""
                    }`}
                  >
                    Shop
                  </Link>
                </li>

                <li className="h-full">
                  <Link
                    href="/ourstory"
                    className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${
                      pathname === "/ourstory" ? "active" : ""
                    }`}
                    onClick={handleOurStoryClick}
                  >
                    Our Story
                  </Link>
                </li>
                <li className="h-full">
                  <Link
                    href="/contact"
                    className={`text-button-uppercase duration-300 h-full flex items-center justify-center ${
                      pathname === "/contact" ? "active" : ""
                    }`}
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            <div className="right flex gap-12">
              <div className="max-md:hidden search-icon flex items-center cursor-pointer relative">
                <MagnifyingGlass
                  size={24}
                  color="black"
                  onClick={openModalSearch}
                />
                <div className="line absolute bg-line w-px h-6 -right-6"></div>
              </div>
              <div className="list-action flex items-center gap-4">
                <div className="user-icon flex items-center justify-center cursor-pointer relative">
                  <User size={24} color="black" onClick={handleLoginPopup} />
                  <div
                    suppressHydrationWarning
                    className={`login-popup absolute top-[74px] w-[320px] p-7 rounded-xl bg-white box-shadow-sm ${
                      openLoginPopup ? "open" : ""
                    }`}
                  >
                    {isAuthenticated && user ? (
                      <>
                        <div className="mb-4">
                          <div className="text-sm text-secondary">
                            Welcome back,
                          </div>
                          <div className="font-semibold text-lg">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-secondary">
                            {user.email}
                          </div>
                        </div>
                        <Link
                          href={"/my-account"}
                          className="button-main bg-primary text-white border border-green w-full text-center"
                          onClick={() => closeLoginPopup()}
                        >
                          My Account
                        </Link>
                        <button
                          onClick={handleLogoutClick}
                          className="button-main w-full text-center mt-3"
                        >
                          Logout
                        </button>
                        <div className="bottom mt-4 pt-4 border-t border-line"></div>
                        <Link
                          href={"/contact"}
                          className="body1 hover:underline"
                          onClick={handleSupportClick}
                        >
                          Support
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={"/login"}
                          className="button-main w-full text-center"
                          onClick={() => closeLoginPopup()}
                        >
                          Login
                        </Link>
                        <div className="text-secondary text-center mt-3 pb-4">
                          Don't have an account?
                          <Link
                            href={"/register"}
                            className="text-black pl-1 hover:underline"
                            onClick={() => closeLoginPopup()}
                          >
                            Register
                          </Link>
                        </div>
                        <div className="bottom mt-4 pt-4 border-t border-line"></div>
                        <Link
                          href={"/contact"}
                          className="body1 hover:underline"
                          onClick={handleSupportClick}
                        >
                          Support
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {/* <div
                  className="max-md:hidden wishlist-icon flex items-center cursor-pointer"
                  onClick={openModalWishlist}
                >
                  <Icon.Heart size={24} color="black" />
                </div> */}
                <div
                  className="cart-icon flex items-center relative cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={openModalCart}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModalCart(); }}
                >
                  <Handbag size={24} color="black" />
                  <span suppressHydrationWarning className="quantity cart-quantity absolute -right-1.5 -top-1.5 text-xs text-white bg-black w-4 h-4 flex items-center justify-center rounded-full">
                    {cartState.cartArray.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />

      <div id="menu-mobile" className={`${openMenuMobile ? "open" : ""}`}>
        <div className="menu-container bg-white h-full">
          <div className="container h-full">
            <div className="menu-main h-full overflow-hidden">
              <div className="heading py-2 relative flex items-center justify-center">
                <div
                  className="close-menu-mobile-btn absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface flex items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onClick={handleMenuMobile}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMenuMobile(); }}
                >
                  <X size={14} />
                </div>
                
                <Image
                className="logo"
                width={150}
                height={150}
                  src="/images/NaveenamNaturalsLogo.png"
                  alt="Naveenam Naturals"/>
              </div>
              {/* <div
                className="form-search relative mt-2 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  handleMenuMobile();
                  openModalSearch();
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleMenuMobile(); openModalSearch(); } }}
              >
                <MagnifyingGlass
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer"
                />
                <input
                  type="text"
                  readOnly
                  placeholder="What are you looking for?"
                  className=" h-12 rounded-lg border border-line text-sm w-full pl-10 pr-4 cursor-pointer"
                />
              </div> */}
              <div className="list-nav mt-6">
                <ul>
                  <li>
                    <Link
                      href="/"
                      className={`text-xl font-bold flex items-center justify-between ${
                        pathname === "/" ? "active" : ""
                      }`}
                      onClick={handleMenuMobile}
                    >
                      Home
                    </Link>
                  </li>

                  <li>
                    <Link
                      href="/product"
                      className={`text-xl font-bold flex items-center justify-between mt-5 ${
                        pathname === "/product" ? "active" : ""
                      }`}
                      onClick={handleMenuMobile}
                    >
                      Shop All
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/ourstory"
                      className={`text-xl font-bold flex items-center justify-between mt-5 ${
                        pathname === "/ourstory" ? "active" : ""
                      }`}
                      onClick={handleOurStoryClick}
                    >
                      Our Story
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className={`text-xl font-bold flex items-center justify-between mt-5 ${
                        pathname === "/contact" ? "active" : ""
                      }`}
                      onClick={handleMenuMobile}
                    >
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuCosmeticThree;
