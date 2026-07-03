"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuCosmeticThree from "@/components/Header/Menu/MenuCosmeticThree";
import Footer from "@/components/Footer/Footer";
import { useAuth } from "@/context/AuthContext";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import AuthShell from "@/components/Auth/AuthShell";

// Validation helper functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (
  password: string,
): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one special character (!@#$%^&*)",
    };
  }
  return { valid: true, message: "" };
};

const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name);
};

const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  // Strictly 10 digits, optionally starting with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectPath =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/my-account";
  const loginHref =
    redirectPath !== "/my-account"
      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/login";

  // Redirect if already authenticated (only after loading is complete)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, loading, router, redirectPath]);

  // Real-time validation on blur
  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "firstName":
        if (!value.trim()) {
          error = "First name is required";
        } else if (!validateName(value)) {
          error = "First name contains invalid characters";
        } else if (value.length > 100) {
          error = "First name must not exceed 100 characters";
        }
        break;
      case "lastName":
        if (!value.trim()) {
          error = "Last name is required";
        } else if (!validateName(value)) {
          error = "Last name contains invalid characters";
        } else if (value.length > 100) {
          error = "Last name must not exceed 100 characters";
        }
        break;
      case "email":
        if (!value.trim()) {
          error = "Email is required";
        } else if (!validateEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "password":
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.valid) {
          error = passwordValidation.message;
        }
        break;
      case "confirmPassword":
        if (value !== formData.password) {
          error = "Passwords do not match";
        }
        break;
      case "phone":
        if (!value.trim()) {
          error = "Phone number is required";
        } else if (!validatePhone(value)) {
          error = "Please enter a valid 10-digit Indian phone number";
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate all fields
    const validationErrors: { [key: string]: string } = {};

    // First name validation
    if (!formData.firstName.trim()) {
      validationErrors.firstName = "First name is required";
    } else if (!validateName(formData.firstName)) {
      validationErrors.firstName = "First name contains invalid characters";
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      validationErrors.lastName = "Last name is required";
    } else if (!validateName(formData.lastName)) {
      validationErrors.lastName = "Last name contains invalid characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      validationErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      validationErrors.email = "Please enter a valid email address";
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      validationErrors.password = passwordValidation.message;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      validationErrors.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      validationErrors.phone =
        "Please enter a valid 10-digit Indian phone number";
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      validationErrors.agreeToTerms = "Please agree to the Terms of User";
    }

    // If there are validation errors, show them and return
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Show the first error as a toast
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
      });
      toast.success("Registration successful! Welcome to Naveenam Naturals Store.");
      router.push(redirectPath);
    } catch (err: any) {
      // Handle API validation errors
      if (err.errors && Array.isArray(err.errors)) {
        const apiErrors: { [key: string]: string } = {};
        err.errors.forEach((error: { field: string; message: string }) => {
          apiErrors[error.field] = error.message;
        });
        setErrors(apiErrors);
        toast.error(err.errors[0]?.message || "Validation failed");
      } else {
        const errorMessage =
          err.message || "Registration failed. Please try again.";
        setErrors({ general: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // For phone number, only allow digits and max 10 chars
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <>
      <TopNavOne
        props="style-one bg-primary"
        slogan="Welcome to Naveenam Naturals Store"
      />
      <div id="header" className="relative w-full">
        <MenuCosmeticThree />
      </div>
      <AuthShell
        title="Create your account"
        subtitle="Join Naveenam Naturals for faster checkout and order tracking."
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
                {errors.general && (
                  <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg text-sm flex items-start gap-2">
                    <Icon.WarningCircle size={20} className="shrink-0 mt-0.5" />
                    <span>{errors.general}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="text-sm font-semibold text-primary mb-1.5 block"
                      htmlFor="firstName"
                    >
                      First Name
                    </label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${
                        errors.firstName
                          ? "border-error bg-error/5 focus:border-error"
                          : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                    {errors.firstName && (
                      <p className="text-error text-xs mt-1 flex items-center gap-1">
                        <Icon.WarningCircle size={12} /> {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="text-sm font-semibold text-primary mb-1.5 block"
                      htmlFor="lastName"
                    >
                      Last Name
                    </label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 outline-none transition-all ${
                        errors.lastName
                          ? "border-error bg-error/5 focus:border-error"
                          : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                    {errors.lastName && (
                      <p className="text-error text-xs mt-1 flex items-center gap-1">
                        <Icon.WarningCircle size={12} /> {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-primary mb-1.5 block"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Icon.EnvelopeSimple
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                    />
                    <input
                      className={`w-full border rounded-xl pl-12 pr-4 py-3 outline-none transition-all ${
                        errors.email
                          ? "border-error bg-error/5 focus:border-error"
                          : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-error text-xs mt-1 flex items-center gap-1">
                      <Icon.WarningCircle size={12} /> {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-primary mb-1.5 block"
                    htmlFor="phone"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Icon.Phone
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                    />
                    <input
                      className={`w-full border rounded-xl pl-12 pr-4 py-3 outline-none transition-all ${
                        errors.phone
                          ? "border-error bg-error/5 focus:border-error"
                          : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Your phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={10}
                      inputMode="numeric"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-error text-xs mt-1 flex items-center gap-1">
                      <Icon.WarningCircle size={12} /> {errors.phone}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="text-sm font-semibold text-primary mb-1.5 block"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Icon.LockKey
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                      />
                      <input
                        className={`w-full border rounded-xl pl-12 pr-12 py-3 outline-none transition-all ${
                          errors.password
                            ? "border-error bg-error/5 focus:border-error"
                            : formData.password &&
                                validatePassword(formData.password).valid
                              ? "border-green-500 focus:border-green-500 ring-1 ring-green-500/20"
                              : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                        }`}
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-primary transition-colors"
                      >
                        {showPassword ? (
                          <Icon.EyeSlash size={20} />
                        ) : (
                          <Icon.Eye size={20} />
                        )}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="text-error text-xs mt-1 flex items-center gap-1">
                        <Icon.WarningCircle size={12} /> {errors.password}
                      </p>
                    ) : (
                      formData.password &&
                      !validatePassword(formData.password).valid && (
                        <p className="text-secondary/60 text-[10px] mt-1 line-clamp-2 leading-tight">
                          Min 8 chars, uppercase, lowercase, number, special
                          char
                        </p>
                      )
                    )}
                  </div>
                  <div>
                    <label
                      className="text-sm font-semibold text-primary mb-1.5 block"
                      htmlFor="confirmPassword"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Icon.LockKey
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
                      />
                      <input
                        className={`w-full border rounded-xl pl-12 pr-12 py-3 outline-none transition-all ${
                          errors.confirmPassword
                            ? "border-error bg-error/5 focus:border-error"
                            : "border-line focus:border-primary focus:ring-1 focus:ring-primary"
                        }`}
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? (
                          <Icon.EyeSlash size={20} />
                        ) : (
                          <Icon.Eye size={20} />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-error text-xs mt-1 flex items-center gap-1">
                        <Icon.WarningCircle size={12} />{" "}
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start cursor-pointer gap-3 group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="peer sr-only"
                      />
                      <div
                        className={`w-5 h-5 border-2 rounded transition-colors peer-checked:bg-primary peer-checked:border-primary ${
                          errors.agreeToTerms
                            ? "border-error"
                            : "border-secondary/30 group-hover:border-primary/70"
                        }`}
                      ></div>
                      <Icon.Check
                        size={14}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                        weight="bold"
                      />
                    </div>
                    <div
                      className={`text-sm leading-tight select-none ${errors.agreeToTerms ? "text-error" : "text-secondary"}`}
                    >
                      I agree to the
                      <Link
                        href={"/pages/terms"}
                        className="text-primary font-bold hover:underline mx-1"
                      >
                        Terms of Use
                      </Link>
                      and Privacy Policy
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-secondary disabled:opacity-60 sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Registering...</span>
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <div className="text-center mt-6 pt-6 border-t border-line">
                  <p className="text-secondary text-sm">
                    Already have an account?{" "}
                    <Link
                      href={loginHref}
                      className="text-primary font-bold hover:underline"
                    >
                      Login here
                    </Link>
                  </p>
                </div>
        </form>
      </AuthShell>
      <Footer />
    </>
  );
};

export default Register;
