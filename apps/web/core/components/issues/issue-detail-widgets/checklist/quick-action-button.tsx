"use client";
import type { FC, ReactNode } from "react";
import React from "react";
import { observer } from "mobx-react";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
  customButton?: ReactNode;
};

export const IssueChecklistActionButton: FC<Props> = observer((props) => {
  const { workspaceSlug, projectId, issueId, disabled, issueServiceType = EIssueServiceType.ISSUES, customButton } = props;
  // store hooks
  const {
    checklist: { createChecklistItem },
    toggleOpenWidget,
  } = useIssueDetail(issueServiceType);

  const handleQuickAdd = async () => {
    if (disabled) return;
    await createChecklistItem(workspaceSlug, projectId, issueId, {
      title: "",
      is_completed: false,
    });
    toggleOpenWidget("checklist");
  };

  if (customButton) {
    return (
      <div onClick={handleQuickAdd} className="cursor-pointer">
        {customButton}
      </div>
    );
  }

  return null;
});

