"use client";

import React, { useEffect, useState } from "react";
import { trackingApi } from "@/lib/api";
import {
  Truck,
  Package,
  AlertCircle,
  Clock,
  MapPin,
} from "lucide-react";

interface TrackingEvent {
  status?: string;
  label?: string;
  location?: string;
  timestamp?: string;
  remarks?: string;
}

interface TrackingPayload {
  awbNumber?: string;
  carrier?: string;
  latestStatus?: string;
  latestStatusLabel?: string;
  events?: TrackingEvent[];
}

interface TrackingStatusProps {
  awbNumber: string;
}

const TrackingStatus: React.FC<TrackingStatusProps> = ({ awbNumber }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingPayload | null>(null);

  useEffect(() => {
    if (awbNumber) {
      loadTracking();
    }
  }, [awbNumber]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await trackingApi.getTracking(awbNumber);

      if (response.data.success && response.data.data) {
        setData(response.data.data as TrackingPayload);
      } else {
        setError(response.data.message || "No tracking information found");
      }
    } catch (err: any) {
      console.error("Tracking Error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load tracking details";
      if (
        /failed to track shipment/i.test(msg) ||
        /failed to fetch tracking details/i.test(msg) ||
        /no shipment found/i.test(msg) ||
        /not found/i.test(msg)
      ) {
        setError("Tracking is unavailable for this shipment.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return timestamp;
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-secondary">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Fetching tracking status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600 font-medium mb-1">Tracking Unavailable</p>
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button
          onClick={loadTracking}
          className="text-xs font-semibold underline text-red-600 hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface-variant/50 rounded-lg p-6 text-center text-secondary">
        <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No tracking details available yet.</p>
      </div>
    );
  }

  const latestStatusLabel = data.latestStatusLabel || "Unknown";
  const statusLower = latestStatusLabel.toLowerCase();
  const isDelivered = statusLower.includes("delivered");
  const isReturned = statusLower.includes("return") || statusLower.includes("rto");

  const statusColor = isDelivered
    ? "text-green-600 bg-green-50 border-green-200"
    : isReturned
      ? "text-red-600 bg-red-50 border-red-200"
      : "text-blue-600 bg-blue-50 border-blue-200";

  return (
    <div className="bg-white rounded-xl border border-outline overflow-hidden">
      <div className="bg-surface-variant/30 p-4 border-b border-outline flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">
              AWB: {data.awbNumber || awbNumber}
            </span>
          </div>
          <div className="text-xs text-secondary flex gap-2">
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {data.carrier || "Shiprocket"}
            </span>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor} uppercase tracking-wide`}
        >
          {latestStatusLabel}
        </div>
      </div>

      <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
        {Array.isArray(data.events) && data.events.length > 0 ? (
          <div className="relative pl-4 border-l-2 border-outline space-y-8 ml-2">
            {data.events.map((event, index) => {
              const isFirst = index === 0;
              return (
                <div
                  key={`${event.timestamp || "event"}-${index}`}
                  className="relative"
                >
                  <div
                    className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      isFirst
                        ? "bg-primary ring-2 ring-primary/20 scale-125"
                        : "bg-gray-400"
                    }`}
                  ></div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-4">
                      <span
                        className={`font-semibold text-sm ${isFirst ? "text-primary" : "text-gray-700"}`}
                      >
                        {event.label || event.status || "Update"}
                      </span>
                      <span className="text-xs text-secondary whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    {event.location ? (
                      <div className="text-xs text-secondary">
                        {event.location}
                      </div>
                    ) : null}

                    {event.remarks ? (
                      <div className="text-xs italic mt-1 text-gray-500 bg-gray-50 p-1.5 rounded inline-block">
                        {event.remarks}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-secondary">No tracking scan history available yet.</div>
        )}
      </div>
    </div>
  );
};

export default TrackingStatus;
