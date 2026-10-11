// "use client";

// import { useState } from "react";
// import { useParams } from "next/navigation";

// import AddTaskModal from "@/components/AddTaskModal";
// import EmptyProjectTasksDesktopLayout from "@/components/EmptyProjectTasksDesktopLayout";
// import EmptyProjectTasksMobileLayout from "@/components/EmptyProjectTasksMobileLayout";

// export default function ProjectTasksPage() {
//   const params = useParams();
//   const projectId = String(params.id ?? "");

//   const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

//   return (
//     <section>
//       <EmptyProjectTasksDesktopLayout
//         onAddTask={() => setIsAddTaskOpen(true)}
//       />

//       <EmptyProjectTasksMobileLayout
//         onAddTask={() => setIsAddTaskOpen(true)}
//       />

//       <AddTaskModal
//         projectId={projectId}
//         isOpen={isAddTaskOpen}
//         onClose={() => setIsAddTaskOpen(false)}
//       />
//     </section>
//   );
// }



"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import AddTaskModal from "@/components/AddTaskModal";
import EmptyProjectTasksDesktopLayout from "@/components/EmptyProjectTasksDesktopLayout";
import EmptyProjectTasksMobileLayout from "@/components/EmptyProjectTasksMobileLayout";
import useProjectTasks from "@/app/hooks/useProjectTasks";

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = String(params.id ?? params.projectID ?? params.projectId ?? "");

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const { columns, retryColumn, refreshAll } = useProjectTasks(projectId);

  return (
    <section>
      <EmptyProjectTasksDesktopLayout
        columns={columns}
        onRetry={retryColumn}
        onAddTask={() => setIsAddTaskOpen(true)}
      />

      <EmptyProjectTasksMobileLayout
        columns={columns}
        onRetry={retryColumn}
        onAddTask={() => setIsAddTaskOpen(true)}
      />

      <AddTaskModal
        projectId={projectId}
        isOpen={isAddTaskOpen}
        onClose={() => {
          setIsAddTaskOpen(false);
          refreshAll();
        }}
      />
    </section>
  );
}