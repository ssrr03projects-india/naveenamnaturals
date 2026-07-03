"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FacebookLogo,
  InstagramLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import "@/styles/footer.scss";

const Footer = () => {
  const router = useRouter();

  const handleOurStoryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    router.push("/ourstory");
  };

  return (
    <>
      <div id="footer" className="footer border-t-2 border-black/10 pb-24 lg:pb-0">
        <div className="footer-main bg-white relative">
          <div
            className="absolute right-[0%] bottom-[0%] w-full h-full opacity-10 pointer-events-none"
            style={{
              backgroundImage: "url('/images/abstract/4.png')",
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              zIndex: 1,
            }}
          />
          <div className="container">
            <div className="content-footer py-12">
              <div className="flex flex-col lg:flex-row gap-12">
                {/* Left Section - Branding, Newsletter, Socials */}
                <div className="lg:w-1/3">
                  {/* Logo and App Icons */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3">
                      <Link href={"/"} className="logo mb-4">
                        <Image
                          src="/images/NaveenamNaturalsLogo.png"
                          alt="Naveenam Naturals"
                          width={120}
                          height={60}
                          className="h-10 w-auto"
                        />
                      </Link>
                    </div>
                  </div>

                  {/* About */}
                  <div className="mb-8">
                    <p className="text-black/80 text-sm leading-relaxed">
                      Our journey began with one belief: skincare should be led
                      by nature and guided by science. Every extract is chosen
                      for a reason, every percentage is deliberate, and every
                      claim is supported.
                    </p>
                  </div>

                  {/* Social Media Icons */}
                  {/* <div className="flex items-center gap-4">
                    <Link
                      href={"https://www.facebook.com/"}
                      target="_blank"
                      className="text-black hover:text-black/80 transition-colors"
                    >
                      <FacebookLogo size={20} weight="fill" />
                    </Link>

                    <Link
                      href={"https://www.instagram.com/"}
                      target="_blank"
                      className="text-black hover:text-black/80 transition-colors"
                    >
                      <InstagramLogo size={20} weight="fill" />
                    </Link>

                    <Link
                      href={"https://www.youtube.com/"}
                      target="_blank"
                      className="text-black hover:text-black/80 transition-colors"
                    >
                      <YoutubeLogo size={20} weight="fill" />
                    </Link>
                  </div> */}
                </div>

                {/* Right Section - Navigation Columns */}
                <div className="lg:w-2/3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {/* Shop */}
                    <div>
                      <h3 className="text-black font-bold text-sm uppercase mb-4">
                        Shop
                      </h3>
                      <ul className="space-y-2">
                        <li>
                          <Link
                            href="/product"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            All Products
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/product?category=face"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Face Care
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/product?category=hair"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Hair Care
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/product?category=body"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Body Care
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Policies */}
                    <div>
                      <h3 className="text-black font-bold text-sm uppercase mb-4">
                        Policies
                      </h3>
                      <ul className="space-y-2">
                        <li>
                          <Link
                            href="/pages/privacy"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Privacy Policy
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/pages/terms"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Terms &amp; Conditions
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/pages/shipping"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Shipping Policy
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/pages/cancel-refund"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Cancel &amp; Refund
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Info */}
                    <div>
                      <h3 className="text-black font-bold text-sm uppercase mb-4">
                        Info
                      </h3>
                      <ul className="space-y-2">
                        <li>
                          <Link
                            href="/ourstory"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                            onClick={handleOurStoryClick}
                          >
                            Our Story
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/contact"
                            className="text-black/80 hover:text-black text-sm transition-colors"
                          >
                            Contact Us
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copyright */}
              <div className="border-t border-black/20 mt-12 pt-6 px-3 text-center md:max-lg:px-6 md:max-lg:pt-5">
                <p
                  suppressHydrationWarning
                  className="text-black/70 text-xs leading-relaxed md:max-lg:text-sm md:max-lg:font-medium"
                >
                  &copy; {new Date().getFullYear()}, Naveenam Naturals Store
                </p>
                <p className="text-black/60 text-xs mt-1 leading-relaxed md:max-lg:text-sm md:max-lg:mt-2">
                  Developed by{" "}
                  <span className="text-success text-bold text-xs">
                    <Link
                      href="https://saitechnosolutions.com/"
                      target="_blank"
                    >
                      Sai Techno Solutions Pvt Ltd
                    </Link>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
