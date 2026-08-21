"use client";

import Image from "next/image";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import type { Project } from "../types";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { MarkedToggleButton } from "./marked-toggle";

interface ActionResponse {
  success: boolean;
  error?: string;
}

interface EditProjectData {
  title: string;
  description: string;
}

interface ProjectTableProps {
  projects: Project[];
  onUpdateProject?: (
    id: string,
    data: EditProjectData,
  ) => Promise<ActionResponse>;
  onDeleteProject?: (id: string) => Promise<ActionResponse>;
  onDuplicateProject?: (id: string) => Promise<ActionResponse>;
  onMarkasFavorite?: (id: string) => Promise<ActionResponse>;
}

export default function ProjectTable({
  projects,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
  onMarkasFavorite,
}: ProjectTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editData, setEditData] = useState<EditProjectData>({
    title: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setEditData({
      title: project.title,
      description: project.description,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!onUpdateProject || !selectedProject) return;

    try {
      setIsLoading(true);

      const response = await onUpdateProject(selectedProject.id, editData);

      if (!response.success) {
        toast.error(response.error || "Failed to update project");
        return;
      }

      setEditDialogOpen(false);
      setSelectedProject(null);

      toast.success("Project updated successfully");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Something went wrong while updating the project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!onDeleteProject || !selectedProject) return;

    try {
      setIsLoading(true);

      const response = await onDeleteProject(selectedProject.id);

      if (!response.success) {
        toast.error(response.error || "Failed to delete project");
        return;
      }

      setDeleteDialogOpen(false);
      setSelectedProject(null);

      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Something went wrong while deleting the project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    if (!onDuplicateProject) return;

    try {
      setIsLoading(true);

      const response = await onDuplicateProject(project.id);

      if (!response.success) {
        toast.error(response.error || "Failed to duplicate project");
        return;
      }

      toast.success("Project duplicated successfully");
    } catch (error) {
      console.error("Error duplicating project:", error);
      toast.error("Something went wrong while duplicating the project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkasFavorite = async (project: Project) => {
    if (!onMarkasFavorite) return;

    try {
      setIsLoading(true);

      const response = await onMarkasFavorite(project.id);

      if (!response.success) {
        toast.error(response.error || "Failed to mark project as favorite");
        return;
      }

      toast.success("Project marked as favorite successfully");
    } catch (error) {
      console.error("Error marking project as favorite:", error);
      toast.error("Something went wrong while marking the project as favorite");
    } finally {
      setIsLoading(false);
    }
  };

  const copyProjectUrl = async (projectId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/playground/${projectId}`,
      );

      toast.success("Project URL copied to clipboard");
    } catch (error) {
      console.error("Error copying project URL:", error);
      toast.error("Failed to copy project URL");
    }
  };

  return (
    <>
      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>User</TableHead>
              <TableHead className='w-12.5'>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className='font-medium'>
                  <div className='flex flex-col'>
                    <Link
                      href={`/playground/${project.id}`}
                      className='hover:underline'>
                      <span className='font-semibold'>{project.title}</span>
                    </Link>

                    <span className='text-sm text-gray-500 line-clamp-1'>
                      {project.description}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant='outline'
                    className='bg-[#E93F3F15] text-[#E93F3F] border-[#E93F3F]'>
                    {project.template}
                  </Badge>
                </TableCell>

                <TableCell>
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </TableCell>

                <TableCell>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full overflow-hidden'>
                      <Image
                        src={project.user.image || "/placeholder.svg"}
                        alt={project.user.name}
                        width={32}
                        height={32}
                        className='object-cover'
                      />
                    </div>

                    <span className='text-sm'>{project.user.name}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='icon' className='h-8 w-8'>
                        <MoreHorizontal className='h-4 w-4' />
                        <span className='sr-only'>Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align='end' className='w-56'>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        asChild>
                        <MarkedToggleButton
                          markedForRevision={
                            project.starMarks?.[0]?.isMarked || false
                          }
                          id={project.id}
                        />
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          className='flex items-center'>
                          <Eye className='h-4 w-4 mr-2' />
                          Open Project
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href={`/playground/${project.id}`}
                          target='_blank'
                          className='flex items-center'>
                          <ExternalLink className='h-4 w-4 mr-2' />
                          Open in New Tab
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleEditClick(project)}>
                        <Edit3 className='h-4 w-4 mr-2' />
                        Edit Project
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDuplicateProject(project)}
                        disabled={isLoading}>
                        <Copy className='h-4 w-4 mr-2' />
                        Duplicate
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => copyProjectUrl(project.id)}>
                        <Download className='h-4 w-4 mr-2' />
                        Copy URL
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(project)}
                        disabled={isLoading}
                        className='text-destructive focus:text-destructive'>
                        <Trash2 className='h-4 w-4 mr-2' />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (isLoading) return;

          setEditDialogOpen(open);

          if (!open) {
            setSelectedProject(null);
          }
        }}>
        <DialogContent className='sm:max-w-106.25'>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>

            <DialogDescription>
              Make changes to your project details here. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Project Title</Label>

              <Input
                id='title'
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder='Enter project title'
                disabled={isLoading}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>

              <Textarea
                id='description'
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='Enter project description'
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedProject(null);
              }}
              disabled={isLoading}>
              Cancel
            </Button>

            <Button
              type='button'
              onClick={handleUpdateProject}
              disabled={isLoading || !editData.title.trim()}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isLoading) return;

          setDeleteDialogOpen(open);

          if (!open) {
            setSelectedProject(null);
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.title}"? This
              action cannot be undone. All files and data associated with this
              project will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              {isLoading ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



