"use client";
import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

const CancelRefund = () => {
  return (
    <div className="bg-white/60">
      <TopNavOne
        props="style-one bg-black"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
        <Breadcrumb
          heading="Cancel & Refund Policy"
          subHeading="Cancel & Refund"
        />
      </div>
      <div className="policy-page md:py-20 py-10">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Cancel & Refund Policy
            </h1>
            <div className="text-sm text-secondary mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </div>

            <div className="prose max-w-none space-y-8 text-base text-secondary leading-relaxed">
              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  1.1 We Provide Returns, Replacements & Refunds For:
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Wrong product delivered.</li>
                  <li>Expired product delivered.</li>
                  <li>
                    Damaged product delivered (physical damage/tampered product,
                    or packaging).
                  </li>
                  <li>Incomplete order (missing products).</li>
                  <li>Non-delivery of product.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  1.2 We Do Not Provide Returns, Replacements Or Refunds For:
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Opened, used, or altered products.</li>
                  <li>
                    Missing original packaging (mono cartons, labels, etc.).
                  </li>
                  <li>Requests generated after 48 hours of delivery.</li>
                  <li>Any damages that occur after delivery.</li>
                </ul>
              </section>

              <section>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
                  <h3 className="font-semibold text-black mb-3">Note:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    
                    <li>
                      You cannot cancel the order once it is ready to be
                      shipped.
                    </li>
                    <li>
                      Shipping charges are subject to change. Naveenam Naturals
                      holds the right to update the same as we deem fit.
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  2. Shipping & Payment Information
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                 
                  <li>
                    <strong>Shipping Cost:</strong> Shipping charges vary based
                    on location and order value.
                  </li>
                  
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  3. Returns and Replacements
                </h2>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    If a wrong, expired, damaged, or missing product is
                    received, a return/replacement request must be raised within{" "}
                    <strong>48 hours of delivery</strong>. Images of the
                    received products are required for reference.
                  </li>
                  <li>
                    Requests can be made by emailing{" "}
                    <a
                      href="mailto:naveenamnaturals@gmail.com"
                      className="text-success hover:underline"
                    >
                      naveenamnaturals@gmail.com
                    </a>{" "}
                    with the order ID or registered phone number.
                  </li>
                  <li>
                    The request will be reviewed and processed within{" "}
                    <strong>2 business days</strong>.
                  </li>
                  <li>
                    Once approved, a courier partner will pick up the products
                    from your location, based on the product condition and
                    concern raised.
                  </li>
                  <li>
                    A replacement product will be sent or a refund initiated
                    after the returned product is received at our warehouse and
                    passes a quality check. This entire process typically takes{" "}
                    <strong>7-9 business days</strong> after the return pick-up.
                  </li>
                 
                </ul>
              </section>

          

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  4. Time Period For A Refund
                </h2>
                <p>
                  Refunds are normally processed within{" "}
                  <strong>4-7 working days</strong> based on the product status
                  and payment process. The refund also depends on various
                  banking and payment channels. Interest charged by the bank
                  providing EMI schemes until a return/cancellation request is
                  raised will not be refunded. Naveenam Naturals is not
                  responsible for any errors or delays in refunds due to banks
                  or third-party service providers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  5. Cancellation, Refund & Replacement Policy
                </h2>
                <p className="mb-3">
                  This policy applies exclusively to products purchased directly
                  from the Naveenam Naturals website.
                </p>
                <p className="mb-3">
                  Refunds, cancellations, and replacements are{" "}
                  <strong>not available</strong> for products purchased through
                  unauthorized resellers, dealers, or distributors.
                </p>
                <p>
                  To qualify for a refund, cancellation, or replacement for
                  purchases made on our website, customers must adhere to the
                  policy details mentioned above.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-black mt-8 mb-4">
                  6. Contact Us
                </h2>
                <p>For any queries, please contact us:</p>
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

export default CancelRefund;
