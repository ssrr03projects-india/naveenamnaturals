import React from "react";
import "@/styles/layout/newsletter.scss";

interface Props {
  props?: string;
}

const Newsletter = ({ props = "" }: Props) => {
  return (
    <>
      <div
        className={`container md:py-20 sm:py-14 py-10 rounded-3xl border border-dotted border-black/25 my-10 relative overflow-hidden ${props}`}
      >
        {/* Abstract Background */}
        <div
          className="absolute inset-0 opacity-[60%] pointer-events-none z-[1]"
          style={{
            backgroundImage: "url('/images/abstract/bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className={`newsletter-block sm:px-8 px-6 sm:rounded-[32px] rounded-3xl flex flex-col items-center relative z-[2]`}
        >
          <div className="heading3 text-black text-center">About Naveenam</div>
          <div className="text-black text-center mt-3 max-w-2xl">
            Naveenam Naturals brings simple, honest personal care made with
            thoughtfully chosen ingredients for everyday wellness.
          </div>
        </div>
      </div>
    </>
  );
};

export default Newsletter;
