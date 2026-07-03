import React, { useEffect, useState } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { couponApi } from "@/lib/api";

interface Coupon {
  id: number;
  code: string;
  description: string;
  value: number;
  type: "percentage" | "fixed";
  minimumAmount: number;
  expiresAt: string | null;
  applicableProducts?: number[];
}

interface CouponListProps {
  onApply: (code: string) => void;
  appliedCouponCode?: string;
  orderTotal: number;
  cartProductIds?: number[];
}

const CouponList: React.FC<CouponListProps> = ({
  onApply,
  appliedCouponCode,
  orderTotal,
  cartProductIds = [],
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await couponApi.getAllActiveCoupons();
        if (response.data.success) {
          setCoupons(response.data.data.coupons);
        }
      } catch (error) {
        console.error("Failed to fetch coupons", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  if (loading) return null;

  if (coupons.length === 0) return null;

  const normalizeIds = (ids: unknown): number[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) {
      return ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);
    }
    if (typeof ids === "string") {
      try {
        const parsed = JSON.parse(ids);
        if (Array.isArray(parsed)) {
          return parsed
            .map((id: unknown) => Number(id))
            .filter((id: number) => Number.isInteger(id) && id > 0);
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShowCoupons(!showCoupons)}
        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
      >
        <Icon.Tag size={16} />
        {showCoupons ? "Hide available coupons" : "View available coupons"}
      </button>

      {showCoupons && (
        <div className="mt-3 space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {coupons.map((coupon) => {
            const isAmountMet = orderTotal >= coupon.minimumAmount;
            const isApplied = appliedCouponCode === coupon.code;

            const applicableIds = normalizeIds(coupon.applicableProducts);
            const hasProductRestriction = applicableIds.length > 0;
            const hasApplicableProduct =
              !hasProductRestriction ||
              cartProductIds.some((pid) => applicableIds.includes(pid));

            const isApplicable = isAmountMet && hasApplicableProduct;

            let statusText = "";
            if (!isAmountMet) {
              statusText = "Min. order not met";
            } else if (!hasApplicableProduct) {
              statusText = "No matching products in cart";
            }

            return (
              <div
                key={coupon.id}
                className={`border rounded-lg p-3 transition-colors ${isApplied
                    ? "bg-success/5 border-success"
                    : "bg-surface border-outline hover:border-secondary/30"
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-black border-2 border-dashed border-gray/30 px-2 py-0.5 rounded bg-white inline-block text-sm">
                      {coupon.code}
                    </div>
                    <p className="text-xs text-secondary mt-1">
                      {coupon.description}
                    </p>
                  </div>
                  {isApplied ? (
                    <span className="text-xs font-bold text-success flex items-center gap-1">
                      <Icon.Check size={12} weight="bold" /> Applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApply(coupon.code)}
                      disabled={!isApplicable}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isApplicable
                          ? "bg-black text-white hover:bg-secondary"
                          : "bg-gray/20 text-gray cursor-not-allowed"
                        }`}
                    >
                      {isApplicable ? "Apply" : statusText}
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray uppercase tracking-wide font-medium border-t border-dashed border-gray/20 pt-2 mt-2">
                  <span>
                    Min. Order: <span className="numeric-contrast">₹{coupon.minimumAmount}</span>
                  </span>
                  {coupon.expiresAt && (
                    <span>
                      Exp:{" "}
                      {new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CouponList;
