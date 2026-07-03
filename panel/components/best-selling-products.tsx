"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface BestSellingProduct {
  productId: number;
  totalSold: number;
  totalRevenue: number;
  variantId?: number;
  variantName?: string;
  product: {
    id: number;
    name: string;
    sku: string;
    price: number;
    images: string | string[];
  };
}

interface BestSellingProductsProps {
  products?: BestSellingProduct[];
  loading?: boolean;
}

const chartConfig = {
  sales: {
    label: "Sold",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function BestSellingProducts({
  products = [],
  loading = false,
}: BestSellingProductsProps) {
  const chartData = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 6).map((item) => {
      const productName = item.product?.name || `Product ${item.productId}`;
      const variantName =
        item.variantName || item.variantId
          ? `${item.variantName || "Variant " + item.variantId}`
          : "";
      const displayName = variantName
        ? `${productName} - ${variantName}`
        : productName;

      return {
        product: displayName,
        sales: parseInt(item.totalSold?.toString() || "0"),
        revenue: parseFloat(item.totalRevenue?.toString() || "0"),
      };
    });
  }, [products]);

  // Calculate trend
  const totalSales = React.useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.sales, 0);
  }, [chartData]);

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Product Sales by Variant</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Product Sales by Variant</CardTitle>
          <CardDescription>No sales data available</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">No products to display</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Product Sales by Variant</CardTitle>
        <CardDescription>
          Showing sold counts for top {chartData.length} product variants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 10,
              right: 30,
              top: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="product"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                value.length > 25 ? value.slice(0, 25) + "..." : value
              }
              width={180}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="sales" fill="var(--color-sales)" radius={5}>
              <LabelList
                dataKey="sales"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `${value} sold`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Total units sold: {totalSales} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Products with variant breakdown
        </div>
      </CardFooter>
    </Card>
  );
}
