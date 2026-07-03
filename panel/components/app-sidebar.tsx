"use client";

import * as React from "react";
import {
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconUser,
  IconShoppingBag,
  IconShoppingCart,
  IconUsersGroup,
  IconTicket,
  IconStar,
  IconHome,
  IconMail,
  IconPackage,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/animate-ui/components/radix/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Products",
      url: "/products",
      icon: IconShoppingBag,
    },
    {
      title: "Pending Orders",
      url: "/pending-orders",
      icon: IconPackage,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconShoppingCart,
    },
    {
      title: "Customers",
      url: "/customers",
      icon: IconUsersGroup,
    },
    {
      title: "Coupons",
      url: "/coupons",
      icon: IconTicket,
    },
    {
      title: "Reviews",
      url: "/reviews",
      icon: IconStar,
    },
    {
      title: "Homepage",
      url: "/homepage",
      icon: IconHome,
    },
    {
      title: "Email & Notification",
      url: "/email-notification",
      icon: IconMail,
    },
  ],

  navSecondary: [
    {
      title: "Settings",
      url: "/profile",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  Naveenam Naturals
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  );
}
