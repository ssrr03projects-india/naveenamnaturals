"use client";
import React from "react";
import { Leaf, Truck, ShieldCheck, Users, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import "@/styles/layout/benefit.scss";

interface Props {
  props: string;
}

const Benefit: React.FC<Props> = ({ props }) => {
  const benefits = [
    {
      icon: Leaf,
      title: "Ayurvedic Formulas",
      description: "Crafted from time-tested herbs for healthy skin & hair.",
      color: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      icon: Truck,
      title: "Fast Shipping",
      description:
        "Nationwide delivery in 3-5 days. Free shipping on all prepaid orders.",
      color: "from-blue-400 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: ShieldCheck,
      title: "100% Natural & Safe",
      description:
        "No parabens, sulfates, silicones, artificial colors, or harmful chemicals—just pure, effective care.",
      color: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      icon: Users,
      title: "Trusted by Thousands",
      description:
        "5,000+ customers love our authentic, natural ayurvedic and scientific products.",
      color: "from-orange-400 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <section
      className={`py-16 bg-gradient-to-br from-surface/30 to-white ${props}`}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-black mb-4">
            Our Commitment to You
          </h2>
          <p className="text-lg text-secondary max-w-3xl mx-auto">
            Experience the difference with our commitment to Ayurvedic and
            Scientific ingredients, 100% Safe and Natural products.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group"
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: "fadeInUp 0.6s ease-out forwards",
                opacity: 0,
                transform: "translateY(20px)",
              }}
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center text-center group-hover:scale-105">
                {/* Icon Container */}
                <div
                  className={`w-20 h-20 rounded-full ${benefit.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <benefit.icon
                    size={40}
                    className={`${benefit.iconColor} group-hover:scale-110 transition-transform duration-300`}
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-black mb-4 group-hover:text-success transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-sm text-secondary leading-relaxed flex-1">
                  {benefit.description}
                </p>

                {/* Decorative Element */}
                <div
                  className={`w-12 h-1 bg-gradient-to-r ${benefit.color} rounded-full mt-6 group-hover:w-16 transition-all duration-300`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-success/10 to-success/5 rounded-2xl p-8 border border-success/20">
            <h3 className="text-2xl font-bold text-black mb-4">
              Ready to Experience Natural Beauty?
            </h3>
            <p className="text-secondary mb-6 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have discovered the
              power of natural, ayurvedic skincare.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle size={20} className="text-success" />
                <span>Free Shipping on Orders Above ₹5000</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle size={20} className="text-success" />
                <span>Ayurvedic and Scientific ingredients</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle size={20} className="text-success" />
                <span>100% Safe and Natural</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default Benefit;
