"use client";
import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

const ShippingPolicy = () => {
  return (
    <div className="bg-white/60">
      <TopNavOne
        props="style-one bg-black"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb
          heading="Shipping"
          subHeading="Shipping"
        />
      </div>
      <div className="policy-page md:py-20 py-10">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Shipping Policy
            </h1>
            <div className="text-sm text-secondary mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </div>

            <div className="prose max-w-none space-y-6 text-base text-secondary leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  1. Shipping Information
                </h2>
                <p className="font-semibold text-black mb-2">
                  Delivery Timeline:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Metro Cities: 3-5 business days</li>
                  <li>Tier 1 & 2 Cities: 5-7 business days</li>
                  <li>Other Locations: 7-10 business days</li>
                </ul>
                
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  2. Order Processing
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Orders are processed within 1-2 business days</li>
                  <li>
                    You will receive a confirmation email with tracking details
                  </li>
                  <li>We ship to all major cities and towns across India</li>
                  <li>International shipping is not currently available</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  3. Shipment Tracking
                </h2>
                <p>
                  Once your order is shipped, you will receive a tracking number
                  via email and SMS. You can track your order status on our
                  website or through the courier partner's website.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  4. Delayed Shipments
                </h2>
                <p>
                  In case of unexpected delays, we will keep you informed via
                  email and SMS. For any concerns about delayed shipments,
                  please contact our customer support team.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  5. Contact Us
                </h2>
                <p>
                  For any queries regarding shipping, please contact:
                </p>
                <div className="mt-4 space-y-2">
              
                  <p>
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:naveenamnaturals@gmail.com"
                      className="text-success hover:underline"
                    >
                      naveenamnaturals@gmail.com
                    </a>
                  </p>
                  <p>
                    <strong>Address:</strong> Kilpauk, Chennai - 600010
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ShippingPolicy;
