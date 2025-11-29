"use client";
import { useCallback } from "react";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TIssueChecklistItem, TIssueServiceType } from "@plane/types";

export const useChecklistOperations = (
  workspaceSlug: string,
  projectId: string,
  issueId: string,
  issueServiceType: TIssueServiceType
) => {
  const {
    checklist: { createChecklistItem, updateChecklistItem, deleteChecklistItem },
  } = useIssueDetail(issueServiceType);

  const handleCreateChecklistItem = useCallback(
    async (data: Partial<TIssueChecklistItem>) => {
      await createChecklistItem(workspaceSlug, projectId, issueId, data);
    },
    [workspaceSlug, projectId, issueId, createChecklistItem]
  );

  const handleUpdateChecklistItem = useCallback(
    async (checklistItemId: string, data: Partial<TIssueChecklistItem>) => {
      await updateChecklistItem(workspaceSlug, projectId, issueId, checklistItemId, data);
    },
    [workspaceSlug, projectId, issueId, updateChecklistItem]
  );

  const handleDeleteChecklistItem = useCallback(
    async (checklistItemId: string) => {
      await deleteChecklistItem(workspaceSlug, projectId, issueId, checklistItemId);
    },
    [workspaceSlug, projectId, issueId, deleteChecklistItem]
  );

  return {
    createChecklistItem: handleCreateChecklistItem,
    updateChecklistItem: handleUpdateChecklistItem,
    deleteChecklistItem: handleDeleteChecklistItem,
  };
};

