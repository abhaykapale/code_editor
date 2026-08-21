import {
  deleteProjectById,
  duplicateProjectById,
  editProjectById,
  getAllPlaygroundUser,
} from "@/modules/dashboard/actions";
import AddNewButton from "@/modules/dashboard/components/addnew";
import AddRepo from "@/modules/dashboard/components/addrepo";
import EmptyState from "@/modules/dashboard/components/empty-state";
import ProjectTable from "@/modules/dashboard/components/project-table";

async function Page() {
  const result = await getAllPlaygroundUser();

  // Narrow the array | error-object union.
  if (!Array.isArray(result)) {
    return (
      <div className='mx-auto flex min-h max-w-7xl items-center justify-center px-4 py-10'>
        <p className='text-sm text-red-500'>
          {result.error || "Failed to load projects"}
        </p>
      </div>
    );
  }

  // ProjectTable expects description to always be a string.
  const projects = result.map((project) => ({
    ...project,
    description: project.description ?? "",
    user: {
      ...project.user,
      name: project.user.name ?? "Unknown user",
      email: project.user.email ?? "",
      image: project.user.image ?? "",
    },
  }));

  return (
    <div className='mx-auto flex min-h max-w-7xl flex-col items-center justify-start px-4 py-10'>
      <div className='grid w-full grid-cols-1 gap-6 md:grid-cols-2'>
        <AddNewButton />
        <AddRepo />
      </div>

      <div className='mt-10 flex w-full flex-col items-center justify-center'>
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectTable
            projects={projects}
            onDeleteProject={deleteProjectById}
            onUpdateProject={editProjectById}
            onDuplicateProject={duplicateProjectById}
          />
        )}
      </div>
    </div>
  );
}

export default Page;
