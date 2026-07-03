"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchContacts,
  updateContactStatus,
  deleteContact,
  type ContactSubmission,
  type ContactStatus,
  type ContactStats,
} from "@/lib/email-api";

const statusOptions: Array<{ value: ContactStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

function EmailNotificationContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !token) return;
    loadContacts();
  }, [mounted, token, statusFilter, search]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await fetchContacts(
        { status: statusFilter, search },
        token
      );
      if (response.success) {
        setContacts(response.data);
        setStats(response.stats);
      }
    } catch (error: any) {
      console.error("Failed to load contacts:", error);
      toast.error(error.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = useMemo(
    () => [
      { label: "Total", value: stats?.total ?? 0 },
      { label: "New", value: stats?.new ?? 0 },
      { label: "Read", value: stats?.read ?? 0 },
      { label: "Replied", value: stats?.replied ?? 0 },
      { label: "Archived", value: stats?.archived ?? 0 },
    ],
    [stats]
  );

  const handleStatusUpdate = async (
    id: number,
    status: ContactStatus
  ) => {
    try {
      await updateContactStatus(id, { status }, token);
      toast.success("Status updated");
      loadContacts();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteContact(id, token);
      toast.success("Contact deleted");
      loadContacts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
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
                <h1 className="text-2xl font-bold">Email & Notification</h1>
                <p className="text-muted-foreground mt-2">
                  Manage contact submissions and customer messages
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-5 lg:px-6">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border bg-card p-4"
                  >
                    <div className="text-sm text-muted-foreground">
                      {card.label}
                    </div>
                    <div className="text-2xl font-semibold">{card.value}</div>
                  </div>
                ))}
              </div>

              <div className="px-4 lg:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input
                    placeholder="Search name, email, subject..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-[320px]"
                  />
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as ContactStatus | "all")
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={loadContacts}>
                  Refresh
                </Button>
              </div>

              <div className="px-4 lg:px-6">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            Loading contacts...
                          </TableCell>
                        </TableRow>
                      ) : contacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            No contacts found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="font-medium">
                              {contact.name}
                            </TableCell>
                            <TableCell>{contact.email}</TableCell>
                            <TableCell className="max-w-[240px] truncate">
                              {contact.subject}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {contact.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelected(contact)}
                                >
                                  View
                                </Button>
                                <Select
                                  value={contact.status}
                                  onValueChange={(value) =>
                                    handleStatusUpdate(
                                      contact.id,
                                      value as ContactStatus
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions
                                      .filter((opt) => opt.value !== "all")
                                      .map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(contact.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected?.subject}</DialogTitle>
              <DialogDescription>
                {selected?.name} • {selected?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Message</div>
                <div className="mt-1 whitespace-pre-wrap">
                  {selected?.message}
                </div>
              </div>
              {selected?.phone && (
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="mt-1">{selected.phone}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge variant="secondary">{selected?.status}</Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function EmailNotificationPage() {
  return (
    <ProtectedRoute>
      <EmailNotificationContent />
    </ProtectedRoute>
  );
}
