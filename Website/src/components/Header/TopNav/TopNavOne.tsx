"use client";

import React from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import "@/styles/header.scss";

interface Props {
  props: string;
  slogan: string;
}

const TopNavOne: React.FC<Props> = ({ props, slogan }) => {
  return (
    <>
      <div className={`top-nav md:h-[44px] h-[30px] ${props}`}>
        <div className="container mx-auto h-full">
          <div className="top-nav-main flex justify-between max-md:justify-center h-full">
            <div className="left-content flex items-center gap-5 max-md:hidden"></div>
            <div className="text-center text-button text-white flex items-center font-staler-bold numeric-contrast">
              {slogan}
            </div>
            <div className="left-content flex items-center gap-5 max-md:hidden"></div>
            {/* <div className="right-content flex items-center gap-3 max-md:hidden">
              <Link
                href={"https://www.facebook.com/"}
                target="_blank"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label="Facebook"
              >
                <Icon.FacebookLogo size={18} weight="fill" />
              </Link>
              <Link
                href={"https://www.instagram.com/"}
                target="_blank"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label="Instagram"
              >
                <Icon.InstagramLogo size={18} weight="fill" />
              </Link>
              <Link
                href={"https://www.youtube.com/"}
                target="_blank"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label="YouTube"
              >
                <Icon.YoutubeLogo size={18} weight="fill" />
              </Link>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default TopNavOne;
