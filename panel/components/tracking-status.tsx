"use client";

import { useEffect, useState } from "react";
import { trackShipment } from "@/lib/shipping-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  IconTruck,
  IconX,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";

interface TrackingStatusProps {
  awbNumber: string;
  token?: string | null;
}

interface TrackingEvent {
  status?: string;
  label?: string;
  location?: string;
  timestamp?: string;
  remarks?: string;
}

interface TrackingData {
  awbNumber?: string;
  carrier?: string;
  latestStatus?: string;
  latestStatusLabel?: string;
  events?: TrackingEvent[];
}

export function TrackingStatus({ awbNumber, token }: TrackingStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  useEffect(() => {
    if (awbNumber) {
      loadTracking();
    }
  }, [awbNumber, token]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await trackShipment(awbNumber, token);

      if (response.success && response.data) {
        setTrackingData(response.data as TrackingData);
      } else {
        setError(response.message || "No tracking information found.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load tracking details";
      console.error("Tracking Error:", err);
      if (
        /failed to track shipment/i.test(msg) ||
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

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        <p className="text-sm">Loading tracking details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <IconX className="mx-auto h-8 w-8 mb-2 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={loadTracking}
          className="mt-2 text-sm text-primary underline flex items-center gap-1 mx-auto"
        >
          <IconRefresh className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No tracking details available yet.
      </div>
    );
  }

  const latestStatusLabel = trackingData.latestStatusLabel || "Unknown";
  const events = Array.isArray(trackingData.events) ? trackingData.events : [];
  const normalizedStatus = latestStatusLabel.toLowerCase();

  const badgeVariant = (): "default" | "secondary" | "destructive" => {
    if (normalizedStatus.includes("deliver")) return "default";
    if (
      normalizedStatus.includes("cancel") ||
      normalizedStatus.includes("rto") ||
      normalizedStatus.includes("return")
    ) {
      return "destructive";
    }
    return "secondary";
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

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <IconTruck className="h-4 w-4" />
            {trackingData.awbNumber || awbNumber}
          </CardTitle>
          <Badge variant={badgeVariant()}>{latestStatusLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Carrier: {trackingData.carrier || "Shiprocket"}
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <IconPackage className="h-4 w-4" />
            No tracking scan history is available yet.
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-4">
              {events.map((event, index) => (
                <div
                  key={`${event.timestamp || "event"}-${index}`}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {event.label || event.status || "Update"}
                      </p>
                      {event.location ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.location}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                  {event.remarks ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      {event.remarks}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
