"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Newsletter from "@/components/Cosmetic3/Newsletter";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";

const AboutUs = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } },
  };

  return (
    <div className="bg-white">
      <div
        className="fixed inset-0 w-full h-[100vh] opacity-5 pointer-events-none"
        style={{
          backgroundImage: "url('/images/abstract/bgshopall.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
      />
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        {/* <Breadcrumb heading="Our Story" subHeading="Our Story" /> */}
      </div>

      {/* Our Journey Section */}
      <section className="relative overflow-hidden pt-10 md:pt-20 pb-5 md:pb-6">
        <div className="container relative z-0">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-3xl mx-auto mb-10 md:mb-20"
          >
            <h2 className="heading3 mb-4 md:mb-8 tracking-tight">
              Our Story Starts Here <br />
              <span className="text-primary">With Nature and Science</span>
            </h2>
            <p className="body1 text-secondary leading-relaxed px-4 sm:px-0">
              Our journey began with one belief: skincare should be led by
              nature and guided by science. Every extract, percentage, and
              claim is chosen with clear purpose and precision.
            </p>
          </motion.div>

          {/* Images Grid */}
          {/* <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 px-4 sm:px-0"
          >
            {[1, 2, 3].map((num) => (
              <motion.div
                key={num}
                variants={fadeInUp}
                className="group relative overflow-hidden rounded-[30px] md:rounded-[40px] shadow-sm hover:shadow-xl transition-all duration-500 max-w-[320px] sm:max-w-none mx-auto w-full"
              >
                <div className="aspect-[4/5] relative">
                  <Image
                    src={`/images/about/${num}.png`}
                    fill
                    alt={`Story image ${num}`}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500" />
                </div>
              </motion.div>
            ))}
          </motion.div> */}
        </div>
      </section>

      {/* Founder's Letter Section */}
      <section className="bg-surface/30">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-16 lg:gap-24">
            {/* Image Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full sm:w-3/4 md:w-2/3 lg:w-5/12 relative px-4 sm:px-0"
            >
              <div className="relative aspect-[4/5] rounded-[30px] md:rounded-[50px] overflow-hidden shadow-2xl z-10">
                <Image
                  src="/images/about/founder.png"
                  fill
                  alt="Nature and Botanicals - Naveenam Naturals"
                  className="object-cover"
                />
              </div>
              <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-full blur-2xl md:blur-3xl -z-0 opacity-60" />
              <div className="absolute -bottom-6 -left-6 md:-bottom-10 md:-left-10 w-32 h-32 md:w-48 md:h-48 bg-purple/10 rounded-full blur-2xl md:blur-3xl -z-0 opacity-60" />
            </motion.div>

            {/* Content Section */}
            <motion.div {...fadeInUp} className="lg:w-7/12 w-full px-4 sm:px-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-6 md:mb-8 text-primary font-medium text-sm">
                <Icon.Leaf weight="fill" size={16} />
                <span>Rooted in Nature</span>
              </div>

              <h2 className="font-semibold mb-6 md:mb-8 text-xl md:text-2xl lg:text-3xl">
                A Note from the Heart
              </h2>

              <div className="space-y-6 md:space-y-8 text-secondary">
                <div className="relative">
                  <Icon.Quotes
                    weight="fill"
                    className="absolute -top-6 -left-6 md:-top-10 md:-left-10 text-primary/10 w-16 h-16 md:w-24 md:h-24 -z-0"
                  />
                  <p className=" italic relative z-10 text-md md:text-lg leading-relaxed text-title border-l-2 border-primary/30 pl-4 md:pl-8">
                    {`"For years, I carried the memory of quiet beauty rituals—herbs ground by hand, oils warmed with care, and the belief that what we place on our skin should be as thoughtful as what we place in our lives."`}
                  </p>
                </div>

                <p className="body1 leading-relaxed text-sm md:text-base">
                  Each botanical was selected not only for its heritage, but for
                  its documented ability to support skin health. Each active was
                  carefully integrated to work in harmony with the skin's
                  natural biology, ensuring performance without compromise.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-outline/30">
                  <div className="space-y-4">
                    <p className="font-bold text-title uppercase tracking-widest text-[10px] md:text-xs">
                      Our Promise
                    </p>
                    <ul className="space-y-2 md:space-y-3">
                      {[
                        "No unnecessary fillers",
                        "No scientific shortcuts",
                        "No blind trend-following",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-xs md:text-sm"
                        >
                          <Icon.CheckCircle
                            weight="fill"
                            className="text-primary flex-shrink-0"
                            size={18}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col justify-end mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-outline/30">
                    <div className="sm:pt-6 lg:border-t-0">
                      <p className="text-primary font-bold text-lg md:text-xl">
                        The Founder
                      </p>
                      <p className="text-secondary text-xs md:text-sm mt-1">
                        Naveenam Naturals
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-12 md:py-24 bg-white">
        <div className="container">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-3xl mx-auto mb-10 md:mb-16 px-4 sm:px-0"
          >
            <div className="inline-block px-4 py-1.5 bg-success/5 rounded-full mb-4 md:mb-6">
              <span className="text-success text-xs md:text-sm font-semibold tracking-wide uppercase">
                Our Philosophy
              </span>
            </div>
            <h2 className="heading3 mb-4 md:mb-6">
              Bridging Tradition & Science
            </h2>
            <p className="body1 text-secondary text-sm md:text-base leading-relaxed">
              We honor the wisdom of botanical rituals while embracing the
              precision of modern formulation science. Efficiency meets
              integrity in every drop.
            </p>
          </motion.div>

          {/* Values Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 px-4 sm:px-0"
          >
            <ValueCard
              icon={<Icon.Lightbulb weight="light" size={32} />}
              title="Intelligent Formulation"
              description="Every extract chosen for a reason, every percentage deliberate, every claim supported."
              color="bg-black/5 text-purple"
            />
            <ValueCard
              icon={<Icon.HandHeart weight="light" size={32} />}
              title="Honest Beauty"
              description="No shortcuts, no empty promises—just pure, effective skincare rooted in reality."
              color="bg-success/5 text-success"
            />
            <ValueCard
              icon={<Icon.Aperture weight="light" size={32} />}
              title="Enduring Quality"
              description="Rigorous testing ensures products that stand the test of time and provide lasting results."
              color="bg-accent/10 text-secondary"
            />
          </motion.div>
        </div>
      </section>

      <Newsletter props="bg-surface/50 py-16 md:py-20" />
      <Footer />
    </div>
  );
};

const ValueCard = ({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) => (
  <motion.div
    variants={{
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.5 }}
    className="group p-8 md:p-10 rounded-[30px] md:rounded-[40px] bg-white border border-primary/30 hover:border-primary transition-all duration-500 hover:shadow-xl hover:shadow-primary/5"
  >
    <div
      className={`w-12 h-12 md:w-16 md:h-16 ${color} rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500`}
    >
      {icon}
    </div>
    <h3 className="heading6 mb-3 md:mb-4 text-base md:text-lg">{title}</h3>
    <p className="text-secondary text-xs md:text-sm leading-relaxed">
      {description}
    </p>
  </motion.div>
);

export default AboutUs;
