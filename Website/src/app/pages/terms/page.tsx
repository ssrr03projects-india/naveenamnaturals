"use client";
import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

const TermsConditions = () => {
  return (
    <div className="bg-white/60">
      <TopNavOne
        props="style-one bg-black"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb
          heading="Terms & Conditions"
          subHeading="Terms & Conditions"
        />
      </div>
      <div className="policy-page md:py-20 py-10">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Terms & Conditions
            </h1>
            <div className="text-sm text-secondary mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </div>

            <div className="prose max-w-none space-y-6 text-base text-secondary leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing and using Naveenam Naturals website, you accept
                  and agree to be bound by the terms and conditions set forth in
                  this document. If you do not agree with any part of these
                  terms, you may not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  2. Products and Pricing
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All products are subject to availability</li>
                  <li>
                    We reserve the right to modify prices without prior notice
                  </li>
                  <li>
                    Product images are for illustrative purposes and may vary
                  </li>
                  <li>All prices are in Indian Rupees (₹)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  3. Orders and Payment
                </h2>
                <p>We accept payments through:</p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Credit/Debit Cards</li>
                  <li>Net Banking</li>
                  <li>UPI</li>
                  <li>Wallet Payments</li>
                </ul>
                <p className="mt-4">
                  All payments are processed securely through Razorpay. Orders
                  are subject to verification and acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  4. Shipping and Delivery
                </h2>
                <p>
                  Delivery timelines vary based on location and shipping method
                  selected. We are not responsible for delays due to unforeseen
                  circumstances or carrier issues. 
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  5. Returns and Refunds
                </h2>
                <p>
                  Please review our Shipping & Cancellation policy for detailed
                  information on returns and refunds. All return requests must
                  be made within the specified time frame.
                </p>
              </section>

             

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  6. Limitation of Liability
                </h2>
                <p>
                  Naveenam Naturals shall not be liable for any indirect,
                  incidental, special, or consequential damages arising out of
                  or in connection with the use of our products or services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  7. Contact Information
                </h2>
                <p>
                  For any questions regarding these Terms & Conditions, please
                  contact:
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

export default TermsConditions;
