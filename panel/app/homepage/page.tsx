"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { HomepageSlidersTable } from "@/components/homepage-sliders-table";
import { HomepageSliderFormModal } from "@/components/homepage-slider-form-modal";
import { ProtectedRoute } from "@/components/protected-route";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  fetchSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  type HomeSlider,
  type CreateSliderData,
  type UpdateSliderData,
} from "@/lib/homepage-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import { useAuth } from "@/components/providers/auth-provider";

function HomepagePageContent() {
  const [mounted, setMounted] = useState(false);
  const [sliders, setSliders] = useState<HomeSlider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<HomeSlider | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadSliders();
    }
  }, [mounted]);

  const loadSliders = async () => {
    try {
      setLoading(true);
      const response = await fetchSliders(token);
      if (response.success) {
        setSliders(response.data);
      }
    } catch (error) {
      console.error("Error loading sliders:", error);
      toast.error("Failed to load sliders");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlider = async (data: CreateSliderData | UpdateSliderData) => {
    try {
      if (editingSlider) {
        await updateSlider(editingSlider.id.toString(), data as UpdateSliderData, token);
        toast.success("Slider updated successfully");
      } else {
        await createSlider(data as CreateSliderData, token);
        toast.success("Slider created successfully");
      }
      setIsAddModalOpen(false);
      setEditingSlider(null);
      loadSliders();
    } catch (error: any) {
      console.error("Error saving slider:", error);
      toast.error(error.message || "Failed to save slider");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSlider(id, token);
      toast.success("Slider deleted successfully");
      loadSliders();
    } catch (error: any) {
      console.error("Error deleting slider:", error);
      toast.error(error.message || "Failed to delete slider");
    }
  };

  const handleEdit = (slider: HomeSlider) => {
    setEditingSlider(slider);
    setIsAddModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingSlider(null);
    setIsAddModalOpen(true);
  };

  const handleMoveUp = async (id: string) => {
    const slider = sliders.find((s) => s.id.toString() === id);
    if (!slider) return;

    const currentIndex = sliders
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .findIndex((s) => s.id === slider.id);
    if (currentIndex <= 0) return;

    const prevSlider = sliders
      .sort((a, b) => a.sortOrder - b.sortOrder)
      [currentIndex - 1];

    try {
      // Swap sort orders
      await updateSlider(id, { sortOrder: prevSlider.sortOrder }, token);
      await updateSlider(prevSlider.id.toString(), { sortOrder: slider.sortOrder }, token);
      toast.success("Slider order updated");
      loadSliders();
    } catch (error: any) {
      console.error("Error moving slider:", error);
      toast.error(error.message || "Failed to update slider order");
    }
  };

  const handleMoveDown = async (id: string) => {
    const slider = sliders.find((s) => s.id.toString() === id);
    if (!slider) return;

    const sorted = [...sliders].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sorted.findIndex((s) => s.id === slider.id);
    if (currentIndex < 0 || currentIndex >= sorted.length - 1) return;

    const nextSlider = sorted[currentIndex + 1];

    try {
      // Swap sort orders
      await updateSlider(id, { sortOrder: nextSlider.sortOrder }, token);
      await updateSlider(nextSlider.id.toString(), { sortOrder: slider.sortOrder }, token);
      toast.success("Slider order updated");
      loadSliders();
    } catch (error: any) {
      console.error("Error moving slider:", error);
      toast.error(error.message || "Failed to update slider order");
    }
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
                    <h1 className="text-2xl font-bold">Homepage</h1>
                    <p className="text-muted-foreground mt-2">
                      Manage homepage sliders and content
                    </p>
                  </div>
                  <Button onClick={handleAddClick}>
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Slider
                  </Button>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <HomepageSlidersTable
                  sliders={sliders}
                  loading={loading}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <HomepageSliderFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSlider(null);
        }}
        onSubmit={handleCreateSlider}
        slider={editingSlider}
      />
    </SidebarProvider>
  );
}

export default function HomepagePage() {
  return (
    <ProtectedRoute>
      <HomepagePageContent />
    </ProtectedRoute>
  );
}
