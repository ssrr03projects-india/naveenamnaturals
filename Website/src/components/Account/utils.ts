// Get status badge color
export const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === "pending" || statusLower === "confirmed") {
    return "bg-yellow text-black";
  } else if (statusLower === "shipped" || statusLower === "processing") {
    return "bg-purple text-black";
  } else if (statusLower === "delivered") {
    return "bg-success text-black";
  } else if (statusLower === "cancelled" || statusLower === "canceled") {
    return "bg-red text-black";
  }
  return "bg-gray-500 text-gray-500";
};

// Format status for display
export const formatStatus = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === "shipped") return "Delivery";
  if (statusLower === "cancelled") return "Canceled";
  return status.charAt(0).toUpperCase() + status.slice(1);
};
