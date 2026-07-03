"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ReviewsTable } from "@/components/reviews-table";
import { ReviewFormModal } from "@/components/review-form-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  fetchReviews,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  rejectReview,
  type Review,
  type ReviewFilters,
  type CreateReviewData,
  type UpdateReviewData,
} from "@/lib/reviews-api";
import { toast } from "sonner";

function ReviewsPageContent() {
  const [mounted, setMounted] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState<ReviewFilters>({
    page: 1,
    limit: 20,
  });
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadReviews();
    }
  }, [mounted, filters]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await fetchReviews(filters, token);
      if (response.success) {
        setReviews(response.data.reviews);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (data: CreateReviewData | UpdateReviewData) => {
    try {
      if (editingReview) {
        await updateReview(editingReview.id.toString(), data as UpdateReviewData, token);
        toast.success("Review updated successfully");
      } else {
        await createReview(data as CreateReviewData, token);
        toast.success("Review created successfully");
      }
      setIsAddModalOpen(false);
      setEditingReview(null);
      loadReviews();
    } catch (error: any) {
      console.error("Error saving review:", error);
      toast.error(error.message || "Failed to save review");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReview(id, token);
      toast.success("Review deleted successfully");
      loadReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error(error.message || "Failed to delete review");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveReview(id, token);
      toast.success("Review approved successfully");
      loadReviews();
    } catch (error: any) {
      console.error("Error approving review:", error);
      toast.error(error.message || "Failed to approve review");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReview(id, token);
      toast.success("Review rejected successfully");
      loadReviews();
    } catch (error: any) {
      console.error("Error rejecting review:", error);
      toast.error(error.message || "Failed to reject review");
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setIsAddModalOpen(true);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Reviews</h1>
                    <p className="text-muted-foreground mt-2">
                      Manage product reviews and ratings
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <ReviewsTable
                  reviews={reviews}
                  loading={loading}
                  pagination={pagination}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <ReviewFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingReview(null);
        }}
        onSubmit={handleCreateReview}
        review={editingReview}
      />
    </SidebarProvider>
  );
}

export default function ReviewsPage() {
  return (
    <ProtectedRoute>
      <ReviewsPageContent />
    </ProtectedRoute>
  );
}
