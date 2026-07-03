import Marquee from "react-fast-marquee";
import "@/styles/layout/banner.scss";

interface Props {
  props: string;
  textColor: string;
  bgLine: string;
}

const BannerTop: React.FC<Props> = ({ props, textColor, bgLine }) => {
  const textClass = `heading3 pl-[25px] pr-[100px] ${textColor}`;
  const leafClass = `icon-leaves text-[28px] md:text-[38px] leading-none ${textColor}`;
  const doubleLeafClass = `icon-double-leaves text-[30px] md:text-[42px] leading-none ${textColor}`;

  return (
    <>
      <div className={`banner-top ${props}`}>
        <Marquee speed={25}>
          <div className={textClass}>Get Glowing Skin</div>
          <div aria-hidden="true" className={`${leafClass} px-1.5 md:px-2`}></div>
          <div className={textClass}>For the real you</div>
          <div aria-hidden="true" className={`${doubleLeafClass} px-1 md:px-1.5`}></div>
          <div className={textClass}>Safe and Effective</div>
          <div aria-hidden="true" className={`${leafClass} px-1.5 md:px-2`}></div>
          <div className={textClass}>Pure and Natural</div>
          <div aria-hidden="true" className={`${doubleLeafClass} px-1 md:px-1.5`}></div>
          <div className={textClass}>Fast Shipping</div>
          <div aria-hidden="true" className={`${leafClass} px-1.5 md:px-2`}></div>
        </Marquee>
      </div>
    </>
  );
};

export default BannerTop;
