import React from "react";

import { HttpError, useList, useNavigation, useUpdate } from "@refinedev/core";
import { GetFieldsFromList } from "@refinedev/nestjs-query";

import { DragEndEvent } from "@dnd-kit/core";

import { TaskUpdateInput } from "@/graphql/schema.types";
import { TasksQuery, TaskStagesQuery } from "@/graphql/types";

import { KanbanAddCardButton } from "@/components/tasks/kanban/add-card-button";
import { ProjectCardMemo, ProjectCardSkeleton } from "@/components/tasks/kanban/card";
import { KanbanColumn, KanbanColumnSkeleton } from "@/components/tasks/kanban/column";
import { KanbanItem } from "@/components/tasks/kanban/item";
import { TASK_STAGES_QUERY, TASKS_QUERY } from "@/graphql/queries";
import { UPDATE_TASK_STAGE_MUTATION } from "@/graphql/mutations";
import { KanbanBoard, KanbanBoardContainer } from "@/components/tasks/kanban/board";

type Task = GetFieldsFromList<TasksQuery>;
type TaskStage = GetFieldsFromList<TaskStagesQuery> & { tasks: Task[] };

export const TasksListPage = ({ children }: React.PropsWithChildren) => {
  const { replace } = useNavigation();

  const { data: stages, isLoading: isLoadingStages } = useList<TaskStage>({
    resource: "taskStages",
    filters: [
      {
        field: "title",
        operator: "in",
        value: ["TODO", "IN PROGRESS", "IN REVIEW", "DONE"],
      },
    ],
    sorters: [
      {
        field: "createdAt",
        order: "asc",
      },
    ],
    meta: {
      gqlQuery: TASK_STAGES_QUERY,
    },
  });

  const { data: tasks, isLoading: isLoadingTasks } = useList<
    GetFieldsFromList<TasksQuery>
  >({
    resource: "tasks",
    sorters: [
      {
        field: "dueDate",
        order: "asc",
      },
    ],
    queryOptions: {
      enabled: !!stages,
    },
    pagination: {
      mode: "off",
    },
    meta: {
      gqlQuery: TASKS_QUERY,
    },
  });

  const taskStages = React.useMemo(() => {
    if (!tasks?.data || !stages?.data)
      return {
        unassignedStage: [],
        stages: [],
      };

    const unassignedStage = tasks.data.filter((task) => task.stageId === null);

    // prepare unassigned stage
    const grouped: TaskStage[] = stages.data.map((stage) => ({
      ...stage,
      tasks: tasks.data.filter((task) => task.stageId?.toString() === stage.id),
    }));

    return {
      unassignedStage,
      columns: grouped,
    };
  }, [tasks, stages]);

  const { mutate: updateTask } = useUpdate<Task, HttpError, TaskUpdateInput>();

  const handleOnDragEnd = (event: DragEndEvent) => {
    let stageId = event.over?.id as undefined | string | null;
    const taskId = event.active.id as string;
    const taskStageId = event.active.data.current?.stageId;

    if (taskStageId === stageId) {
      return;
    }

    if (stageId === "unassigned") {
      stageId = null;
    }

    updateTask({
      resource: "tasks",
      id: taskId,
      values: {
        stageId: stageId,
      },
      successNotification: false,
      mutationMode: "optimistic",
      meta: {
        gqlMutation: UPDATE_TASK_STAGE_MUTATION,
      },
    });
  };

  const handleAddCard = (args: { stageId: string }) => {
    const path =
      args.stageId === "unassigned"
        ? "/tasks/new"
        : `/tasks/new?stageId=${args.stageId}`;

    replace(path);
  };

  const isLoading = isLoadingTasks || isLoadingStages;

  if (isLoading) return <PageSkeleton />;

  return (
    <>
      <KanbanBoardContainer>
        <KanbanBoard onDragEnd={handleOnDragEnd}>
          <KanbanColumn
            id={"unassigned"}
            title={"unassigned"}
            count={taskStages?.unassignedStage?.length || 0}
            onAddClick={() => handleAddCard({ stageId: "unassigned" })}
          >
            {taskStages.unassignedStage?.map((task) => {
              return (
                <KanbanItem
                  key={task.id}
                  id={task.id}
                  data={{ ...task, stageId: "unassigned" }}
                >
                  <ProjectCardMemo
                    {...task}
                    dueDate={task.dueDate || undefined}
                  />
                </KanbanItem>
              );
            })}
            {!taskStages.unassignedStage?.length && (
              <KanbanAddCardButton
                onClick={() => handleAddCard({ stageId: "unassigned" })}
              />
            )}
          </KanbanColumn>
          {taskStages.columns?.map((column) => {
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                count={column.tasks.length}
                onAddClick={() => handleAddCard({ stageId: column.id })}
              >
                {isLoading && <ProjectCardSkeleton />}
                {!isLoading &&
                  column.tasks.map((task) => {
                    return (
                      <KanbanItem key={task.id} id={task.id} data={task}>
                        <ProjectCardMemo
                          {...task}
                          dueDate={task.dueDate || undefined}
                        />
                      </KanbanItem>
                    );
                  })}
                {!column.tasks.length && (
                  <KanbanAddCardButton
                    onClick={() =>
                      handleAddCard({
                        stageId: column.id,
                      })
                    }
                  />
                )}
              </KanbanColumn>
            );
          })}
        </KanbanBoard>
      </KanbanBoardContainer>
      {children}
    </>
  );
};

const PageSkeleton = () => {
  const columnCount = 6;
  const itemCount = 4;

  return (
    <KanbanBoardContainer>
      {Array.from({ length: columnCount }).map((_, index) => {
        return (
          <KanbanColumnSkeleton key={index}>
            {Array.from({ length: itemCount }).map((_, index) => {
              return <ProjectCardSkeleton key={index} />;
            })}
          </KanbanColumnSkeleton>
        );
      })}
    </KanbanBoardContainer>
  );
};