"use client";
import React, { useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { emailApi } from "@/lib/api";

const MAX_CONTACT_MESSAGE_LENGTH = 550;

const HelpPage = () => {
  const [activeQuestion, setActiveQuestion] = useState<string | undefined>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleActiveQuestion = (question: string) => {
    setActiveQuestion((prevQuestion) =>
      prevQuestion === question ? undefined : question,
    );
  };

  const handleContactChange = (
    field: keyof typeof contactForm,
    value: string,
  ) => {
    if (field === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 15);
      setContactForm((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }

    if (field === "message") {
      setContactForm((prev) => ({
        ...prev,
        message: value.slice(0, MAX_CONTACT_MESSAGE_LENGTH),
      }));
      return;
    }

    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);
    setIsSubmitting(true);

    try {
      const response = await emailApi.createContact({
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim() || undefined,
        subject: contactForm.subject.trim(),
        message: contactForm.message.trim(),
      });

      if (response.data?.success) {
        setFormStatus({
          type: "success",
          message:
            "Thanks! Your message has been sent. We will get back to you soon.",
        });
        setContactForm({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        throw new Error(response.data?.message || "Failed to submit the form");
      }
    } catch (error: any) {
      setFormStatus({
        type: "error",
        message: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const helpCategories = [
    {
      icon: <Icon.Package size={32} weight="duotone" />,
      title: "Shipping",
      description: "Track orders & delivery times",
    },
    {
      icon: <Icon.ArrowsClockwise size={32} weight="duotone" />,
      title: "Returns",
      description: "Easy 30-day grace period",
    },
    {
      icon: <Icon.Leaf size={32} weight="duotone" />,
      title: "Ingredients",
      description: "What's inside our serums",
    },
    {
      icon: <Icon.Gift size={32} weight="duotone" />,
      title: "Rewards",
      description: "Our points & rewards program",
    },
  ];

  const faqs = [
    {
      id: "1",
      question: "When will my order arrive?",
      answer:
        "Orders are typically delivered within 3-5 business days for standard shipping. Express shipping options are available at checkout for faster delivery. You'll receive a tracking number via email once your order ships.",
    },
    {
      id: "2",
      question: "Are your products vegan and cruelty-free?",
      answer:
        "Yes! All our products are 100% vegan and cruelty-free. We never test on animals and use only plant-based, natural ingredients sourced ethically from trusted suppliers.",
    },
    {
      id: "3",
      question: "Can I change my shipping address?",
      answer:
        "If your order hasn't shipped yet, you can update your shipping address by contacting our customer service team. Once the order has shipped, please contact the carrier directly to arrange delivery changes.",
    },
    {
      id: "4",
      question: "How do I track my order?",
      answer:
        "Once your order ships, you'll receive an email with a tracking number. Click the tracking link in the email or enter the number on our Track Order page to see real-time updates on your delivery status.",
    },
  ];

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>

      {/* Hero Section */}
      <div className="help-hero bg-surface py-10 md:py-10">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4">
            How can we help{" "}
            <span className="text-primary italic">your glow</span>?
          </h1>
        </div>
      </div>

      {/* Help Categories */}
      {/* <div className="help-categories py-12 md:py-16 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category, index) => (
              <div
                key={index}
                className="category-card bg-cream rounded-3xl p-8 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group"
              >
                <div className="icon-wrapper inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 text-primary group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="text-xl font-bold text-black mb-2">
                  {category.title}
                </h3>
                <p className="text-sm text-gray">{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Contact Form Section */}
      <div className="contact-form-section py-10 md:py-10 bg-white">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-cream rounded-3xl p-8 md:p-12 border-2 border-line">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Send us a message
            </h2>
            <p className="text-gray mb-8">
              Have a question about your order or a product? Drop us a note and
              our team will reply.
            </p>

            <form
              onSubmit={handleContactSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black">
                  Full name *
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => handleContactChange("name", e.target.value)}
                  required
                  className="border-2 border-line rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  placeholder="Your name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black">
                  Email *
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  required
                  className="border-2 border-line rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => handleContactChange("phone", e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  className="border-2 border-line rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black">
                  Subject *
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) =>
                    handleContactChange("subject", e.target.value)
                  }
                  required
                  className="border-2 border-line rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-white"
                  placeholder="Order help, ingredients, shipping..."
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-black">
                  Message *
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) =>
                    handleContactChange("message", e.target.value)
                  }
                  maxLength={MAX_CONTACT_MESSAGE_LENGTH}
                  required
                  rows={5}
                  className="border-2 border-line rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-white resize-none"
                  placeholder="Tell us how we can help."
                />
                <p className="text-xs text-gray text-right">
                  {contactForm.message.length}/{MAX_CONTACT_MESSAGE_LENGTH}
                </p>
              </div>

              {formStatus && (
                <div
                  className={`md:col-span-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                    formStatus.type === "success"
                      ? "bg-green/10 text-green"
                      : "bg-red/10 text-red"
                  }`}
                >
                  {formStatus.message}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-main w-full md:w-auto px-8 py-4 disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Send message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section py-12 md:py-20 bg-surface">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className={`faq-item bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  activeQuestion === faq.id
                    ? "border-primary shadow-lg"
                    : "border-primary/30 shadow-sm hover:shadow-md"
                }`}
                onClick={() => handleActiveQuestion(faq.id)}
              >
                <div className="flex items-center justify-between gap-4 p-4">
                  <h3 className="text-lg font-semibold text-black flex-1">
                    {faq.question}
                  </h3>
                  <Icon.CaretDown
                    size={24}
                    className={`text-primary transition-transform flex-shrink-0 ${
                      activeQuestion === faq.id ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <div
                  className={`faq-answer px-4 pb-4 text-gray transition-all duration-300 ${
                    activeQuestion === faq.id
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  }`}
                >
                  <p className="leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Still Have Questions Section */}
      <div className="contact-section py-10 md:py-16 bg-white">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-br from-cream to-white rounded-3xl p-8 md:p-12 text-center border-2 border-line">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Still have questions?
            </h2>
            <p className="text-lg text-gray mb-8 max-w-2xl mx-auto">
              Our customer happiness team is here to brighten your day and
              capture any concerns you might have.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:naveenamnaturals@gmail.com"
                className="inline-flex items-center gap-3 bg-white hover:bg-cream text-black font-semibold px-8 py-4 rounded-full transition-all border-2 border-line hover:border-primary"
              >
                <Icon.EnvelopeSimple size={24} weight="fill" />
                Email us
              </a>
            </div>

            {/* Contact Info */}
            <div className="mt-12 pt-8 border-t border-line">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex items-start gap-3">
                  <Icon.MapPin
                    size={24}
                    className="text-primary flex-shrink-0 mt-1"
                  />
                  <div className="">
                    <p className="font-semibold text-black mb-1">Address</p>
                    <p className="text-sm text-gray leading-relaxed">
                      Naveenam Naturals
                      <br />
                      17 Kelly’s Road, Sylvan Lodge Colony
                      <br />
                      Chennai-10, Tamil Nadu, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Icon.Phone
                    size={24}
                    className="text-primary flex-shrink-0 mt-1"
                  />
                  <div>
                    <p className="font-semibold text-black mb-1">Phone</p>
                    <a
                      href="tel:+918438989411"
                      className="text-sm text-gray hover:text-primary transition-colors"
                    >
                      +91 84389 89411
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Icon.EnvelopeSimple
                    size={24}
                    className="text-primary flex-shrink-0 mt-1"
                  />
                  <div>
                    <p className="font-semibold text-black mb-1">Email</p>
                    <a
                      href="mailto:naveenamnaturals@gmail.com`"
                      className="text-sm text-gray hover:text-primary transition-colors break-all"
                    >
                      naveenamnaturals@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default HelpPage;
