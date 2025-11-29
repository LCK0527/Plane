"use client";
import type { FC } from "react";
import React, { useEffect } from "react";
import { observer } from "mobx-react";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { ChecklistItemList } from "./item-list";
import { useChecklistOperations } from "./helper";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
};

export const IssueChecklistCollapsibleContent: FC<Props> = observer((props) => {
  const { workspaceSlug, projectId, issueId, disabled, issueServiceType = EIssueServiceType.ISSUES } = props;
  // store hooks
  const {
    checklist: { getChecklistItemsByIssueId, fetchChecklist },
  } = useIssueDetail(issueServiceType);

  // fetch checklist on mount
  useEffect(() => {
    if (issueId) {
      fetchChecklist(workspaceSlug, projectId, issueId);
    }
  }, [issueId, workspaceSlug, projectId, fetchChecklist]);

  // helper
  const checklistHelpers = useChecklistOperations(workspaceSlug, projectId, issueId, issueServiceType);

  // derived values
  const checklistItems = getChecklistItemsByIssueId(issueId) ?? [];

  return (
    <ChecklistItemList
      workspaceSlug={workspaceSlug}
      projectId={projectId}
      issueId={issueId}
      disabled={disabled}
      checklistHelpers={checklistHelpers}
      checklistItems={checklistItems}
      issueServiceType={issueServiceType}
    />
  );
});

