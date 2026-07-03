"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconUpload, IconX } from "@tabler/icons-react";
import type { HomeSlider, CreateSliderData, UpdateSliderData } from "@/lib/homepage-api";
import { getImageUrl } from "@/lib/homepage-api";
import { toast } from "sonner";

const REQUIRED_BANNER_WIDTH = 1920;
const REQUIRED_BANNER_HEIGHT = 800;

interface HomepageSliderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSliderData | UpdateSliderData) => Promise<void>;
  slider?: HomeSlider | null;
  isLoading?: boolean;
}

export function HomepageSliderFormModal({
  isOpen,
  onClose,
  onSubmit,
  slider,
  isLoading = false,
}: HomepageSliderFormModalProps) {
  const [formData, setFormData] = React.useState<{
    image: File | null;
    link: string;
    sortOrder: number;
  }>({
    image: null,
    link: "",
    sortOrder: 0,
  });

  const [imagePreview, setImagePreview] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        resolve({ width: image.width, height: image.height });
        URL.revokeObjectURL(objectUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to read image dimensions"));
      };

      image.src = objectUrl;
    });

  React.useEffect(() => {
    if (slider) {
      // Editing existing slider
      setFormData({
        image: null,
        link: slider.link || "",
        sortOrder: slider.sortOrder,
      });
      setImagePreview(getImageUrl(slider.image));
    } else {
      // Creating new slider
      setFormData({
        image: null,
        link: "",
        sortOrder: 0,
      });
      setImagePreview("");
    }
  }, [slider, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { width, height } = await getImageDimensions(file);
        if (width !== REQUIRED_BANNER_WIDTH || height !== REQUIRED_BANNER_HEIGHT) {
          toast.error(
            `Image must be exactly ${REQUIRED_BANNER_WIDTH}x${REQUIRED_BANNER_HEIGHT} pixels`,
          );
          e.target.value = "";
          setFormData((prev) => ({ ...prev, image: null }));
          setImagePreview(slider ? getImageUrl(slider.image) : "");
          return;
        }
      } catch {
        toast.error(
          `Unable to read image dimensions. Required: ${REQUIRED_BANNER_WIDTH}x${REQUIRED_BANNER_HEIGHT} pixels`,
        );
        e.target.value = "";
        setFormData((prev) => ({ ...prev, image: null }));
        setImagePreview(slider ? getImageUrl(slider.image) : "");
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(slider ? getImageUrl(slider.image) : "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "sortOrder" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (slider) {
      // Update slider
      const updateData: UpdateSliderData = {
        link: formData.link || undefined,
        sortOrder: formData.sortOrder,
      };
      if (formData.image) {
        updateData.image = formData.image;
      }
      await onSubmit(updateData);
    } else {
      // Create slider
      if (!formData.image) {
        return;
      }
      const createData: CreateSliderData = {
        image: formData.image,
        link: formData.link || undefined,
        sortOrder: formData.sortOrder || undefined,
      };
      await onSubmit(createData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {slider ? "Edit Slider" : "Add New Slider"}
          </DialogTitle>
          <DialogDescription>
            {slider
              ? "Update slider information and image"
              : "Create a new homepage slider"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image">
              Image {!slider && "*"}
            </Label>
            <div className="space-y-2">
              {imagePreview && (
                <div className="relative w-full h-48 border rounded-md overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!slider}
                  className="cursor-pointer"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconUpload className="h-4 w-4 mr-2" />
                  {imagePreview ? "Change Image" : "Upload Image"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPEG, PNG, GIF, WebP (Max 10MB). Required size: 1920x800px.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link (Optional)</Label>
            <Input
              id="link"
              name="link"
              type="url"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://example.com"
            />
            <p className="text-xs text-muted-foreground">
              URL to redirect when slider is clicked
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={handleChange}
              min="0"
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first. Leave empty to auto-assign.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!slider && !formData.image)}>
              {isLoading
                ? "Saving..."
                : slider
                ? "Update Slider"
                : "Create Slider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
