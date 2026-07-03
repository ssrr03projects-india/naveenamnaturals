"use client";

import * as React from "react";
import {
  IconTrash,
  IconEdit,
  IconArrowUp,
  IconArrowDown,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { HomeSlider } from "@/lib/homepage-api";
import { getImageUrl } from "@/lib/homepage-api";

interface HomepageSlidersTableProps {
  sliders: HomeSlider[];
  loading: boolean;
  onDelete: (id: string) => void;
  onEdit: (slider: HomeSlider) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export function HomepageSlidersTable({
  sliders,
  loading,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}: HomepageSlidersTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [sliderToDelete, setSliderToDelete] = React.useState<{ id: string; image: string } | null>(null);

  const handleDeleteClick = (id: string, image: string) => {
    setSliderToDelete({ id, image });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sliderToDelete) {
      onDelete(sliderToDelete.id);
      setDeleteDialogOpen(false);
      setSliderToDelete(null);
    }
  };

  const sortedSliders = [...sliders].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage Sliders ({sliders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading sliders...</div>
          </div>
        ) : sortedSliders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sliders found. Add your first slider to get started.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSliders.map((slider, index) => (
                  <TableRow key={slider.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {onMoveUp && index > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onMoveUp(slider.id.toString())}
                            title="Move up"
                          >
                            <IconArrowUp className="h-3 w-3" />
                          </Button>
                        )}
                        {onMoveDown && index < sortedSliders.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onMoveDown(slider.id.toString())}
                            title="Move down"
                          >
                            <IconArrowDown className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <img
                          src={getImageUrl(slider.image)}
                          alt={`Slider ${slider.id}`}
                          className="h-20 w-32 rounded-md object-cover border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e0e0e0'%3E%3Crect width='24' height='24'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='8' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {slider.link ? (
                          <a
                            href={slider.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-xs block"
                          >
                            {slider.link}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No link</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{slider.sortOrder}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(slider)}
                          title="Edit Slider"
                        >
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteClick(slider.id.toString(), slider.image)}
                          title="Delete Slider"
                        >
                          <IconTrash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <div className="grid gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Slider</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this slider? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setSliderToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
