"use client";
import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="bg-white/60">
      <TopNavOne
        props="style-one bg-black"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb heading="Privacy Policy" subHeading="Privacy Policy" />
      </div>
      <div className="policy-page md:py-20 py-10">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Privacy Policy
            </h1>
            <div className="text-sm text-secondary mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </div>

            <div className="prose max-w-none space-y-6 text-base text-secondary leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  1. Introduction
                </h2>
                <p>
                  Welcome to Naveenam Naturals Store. We are committed to protecting
                  your personal data and respecting your privacy. This Privacy
                  Policy explains how we collect, use, and safeguard your
                  information when you visit our website or make a purchase.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  2. Information We Collect
                </h2>
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Personal Information:</strong> Name, email address,
                    phone number, billing and shipping addresses
                  </li>
                  <li>
                    <strong>Payment Information:</strong> Credit/debit card
                    details processed securely through Razorpay
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Information about how you use
                    our website and services
                  </li>
                  <li>
                    <strong>Device Information:</strong> IP address, browser
                    type, device identifiers
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  3. How We Use Your Information
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To process and fulfill your orders</li>
                  <li>
                    To communicate with you about your orders and inquiries
                  </li>
                  <li>To improve our products and services</li>
                  <li>
                    To send you marketing communications (with your consent)
                  </li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  4. Payment Processing
                </h2>
                <p>
                  All payment transactions are processed securely through
                  Razorpay. We do not store your complete payment card
                  information on our servers. Razorpay complies with PCI-DSS
                  security standards.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  5. Data Security
                </h2>
                <p>
                  We implement appropriate technical and organizational measures
                  to protect your personal data against unauthorized access,
                  alteration, disclosure, or destruction.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  6. Your Rights
                </h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Request data portability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  7. Contact Us
                </h2>
                <p>
                  If you have any questions about this Privacy Policy, please
                  contact us:
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

export default PrivacyPolicy;
