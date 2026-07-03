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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CreateCustomerData } from "@/lib/customers-api";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerData) => Promise<void>;
  isLoading?: boolean;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AddCustomerModalProps) {
  const [formData, setFormData] = React.useState<CreateCustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
    },
    tag: "",
    subscribedToNewsletter: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith("address")) {
      const fieldName = name.replace(/^address/, "").toLowerCase();

      setFormData((prev) => ({
        ...prev,
        address: {
          ...(prev.address || {
            address: "",
            city: "",
            state: "",
            pincode: "",
            country: "",
          }),
          [fieldName]: value,
        },
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.email) {
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: {
          address: "",
          city: "",
          state: "",
          pincode: "",
          country: "",
        },
        tag: "",
        subscribedToNewsletter: false,
      });
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer account with their information and address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
              />
            </div>
            <div>
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 1234567890"
              />
            </div>
            <div>
              <Label htmlFor="tag">Tag</Label>
              <Select
                name="tag"
                value={formData.tag || undefined}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tag: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="loyal">Loyal</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-center space-x-2">
              <Checkbox
                id="subscribedToNewsletter"
                name="subscribedToNewsletter"
                checked={formData.subscribedToNewsletter}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, subscribedToNewsletter: !!checked }))
                }
              />
              <Label htmlFor="subscribedToNewsletter" className="cursor-pointer">
                Subscribe to Newsletter
              </Label>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-semibold">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address?.address || ""}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Enter address"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  name="addressCity"
                  value={formData.address?.city || ""}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="addressState">State</Label>
                <Input
                  id="addressState"
                  name="addressState"
                  value={formData.address?.state || ""}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <Label htmlFor="addressPincode">Pincode</Label>
                <Input
                  id="addressPincode"
                  name="addressPincode"
                  value={formData.address?.pincode || ""}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                />
              </div>
              <div>
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  name="addressCountry"
                  value={formData.address?.country || ""}
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>



          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
