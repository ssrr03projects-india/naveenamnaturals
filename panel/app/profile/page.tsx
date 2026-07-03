"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { API_ENDPOINTS, getAuthHeaders, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
type ProfileData = {
  id: number;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  mobile_number: string;
  is_active: number;
  roles: string[];
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Settings state
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  const { logout, user, token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      fetchProfile();
      fetchSettings();
    }
  }, [mounted, token]);

  const fetchSettings = async () => {
    try {
      setFetchingSettings(true);
      const authToken =
        token ||
        (typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null);
      if (!authToken) return;

      const response = await fetch(
        `${API_BASE_URL}/api/settings/keys/free_shipping_threshold`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setFreeShippingThreshold(String(result.data.value ?? ""));
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setFetchingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth_token")
        : null);
    if (!authToken) return;

    try {
      setSettingsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          key: "free_shipping_threshold",
          value: freeShippingThreshold,
          type: "number",
          description: "Minimum cart total for free shipping",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error(data.message || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("An error occurred");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const authToken =
        token ||
        (typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null);
      if (!authToken) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      const response = await fetch(API_ENDPOINTS.ADMIN.PROFILE, {
        method: "GET",
        headers: getAuthHeaders(authToken),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load profile");
      }
      const admin = result.data;
      setProfileData({
        id: admin.id,
        email: admin.email ?? "",
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        mobile_number: admin.phone ?? admin.username ?? "",
        is_active: admin.isActive === true ? 1 : 0,
        roles: admin.role ? [admin.role] : [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile data",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setIsChangingPassword(true);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      setIsChangingPassword(false);
      return;
    }

    try {
      const authToken =
        token ||
        (typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null);
      if (!authToken) {
        setPasswordError("Not authenticated");
        setIsChangingPassword(false);
        return;
      }
      const response = await fetch(API_ENDPOINTS.ADMIN.CHANGE_PASSWORD, {
        method: "PUT",
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to change password");
      }
      setPasswordSuccess(result.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setIsChangingPassword(false);
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
                <h1 className="text-2xl font-bold">Profile</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your profile and account settings
                </p>
              </div>

              <div className="px-4 lg:px-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList>
                    <TabsTrigger value="profile">
                      Profile Information
                    </TabsTrigger>
                    <TabsTrigger value="password">Change Password</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>
                          View your account details
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Loading...</p>
                          </div>
                        ) : error ? (
                          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={fetchProfile}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : profileData ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">
                                  User ID
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.id}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Email
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.email}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Mobile Number
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.mobile_number}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Status
                                </Label>
                                <div className="mt-1">
                                  <Badge
                                    variant={
                                      profileData.is_active === 1
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {profileData.is_active === 1
                                      ? "Active"
                                      : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-muted-foreground">
                                  Roles
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {profileData.roles.map((role, index) => (
                                    <Badge key={index} variant="outline">
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="password" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>
                          Update your password to keep your account secure
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleChangePassword}>
                          <div className="space-y-4">
                            {passwordError && (
                              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                {passwordError}
                              </div>
                            )}
                            {passwordSuccess && (
                              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                                {passwordSuccess}
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="current_password">
                                Current Password
                              </Label>
                              <Input
                                id="current_password"
                                type="password"
                                placeholder="Enter your current password"
                                value={currentPassword}
                                onChange={(e) =>
                                  setCurrentPassword(e.target.value)
                                }
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new_password">New Password</Label>
                              <Input
                                id="new_password"
                                type="password"
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm_password">
                                Confirm New Password
                              </Label>
                              <Input
                                id="confirm_password"
                                type="password"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) =>
                                  setConfirmPassword(e.target.value)
                                }
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <Button
                              type="submit"
                              disabled={isChangingPassword}
                              className="w-full"
                            >
                              {isChangingPassword
                                ? "Changing Password..."
                                : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                        <CardDescription>
                          Manage your account preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Shipping Settings inside Profile */}
                          <div className="p-4 border rounded-lg bg-muted/30">
                            <h3 className="font-medium mb-4">
                              Shipping Configuration
                            </h3>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="threshold">
                                  Free Shipping Threshold (₹)
                                </Label>
                                <Input
                                  id="threshold"
                                  type="number"
                                  value={freeShippingThreshold}
                                  onChange={(e) =>
                                    setFreeShippingThreshold(e.target.value)
                                  }
                                  placeholder="e.g. 1000"
                                  disabled={fetchingSettings || settingsLoading}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Leave this empty or set it to 0 to disable
                                  free shipping. Customers will get free
                                  shipping only on orders above this amount.
                                </p>
                              </div>
                              <Button
                                onClick={handleSaveSettings}
                                disabled={fetchingSettings || settingsLoading}
                                size="sm"
                              >
                                {settingsLoading
                                  ? "Saving..."
                                  : "Save Shipping Settings"}
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <h3 className="font-medium">Logout</h3>
                              <p className="text-sm text-muted-foreground">
                                Sign out of your account on this device
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              onClick={() => setLogoutDialogOpen(true)}
                            >
                              <IconLogout className="h-4 w-4 mr-2" />
                              Logout
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Logout Confirmation Dialog */}
                <AlertDialog
                  open={logoutDialogOpen}
                  onOpenChange={setLogoutDialogOpen}
                >
                  <AlertDialogContent>
                    <div className="grid gap-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Logout</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to logout? You will need to sign
                          in again to access the dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={logout}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Logout
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
