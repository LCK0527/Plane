"use client";
import type { FC } from "react";
import React, { useMemo } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import type { TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { CollapsibleButton } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { IssueChecklistActionButton } from "./quick-action-button";

type Props = {
  isOpen: boolean;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
};

export const IssueChecklistCollapsibleTitle: FC<Props> = observer((props) => {
  const { isOpen, workspaceSlug, projectId, issueId, disabled, issueServiceType = EIssueServiceType.ISSUES } = props;
  const { t } = useTranslation();
  // store hooks
  const {
    checklist: { getChecklistProgress },
  } = useIssueDetail(issueServiceType);

  // derived values
  const progress = getChecklistProgress(issueId);
  const { completed, total } = progress;

  // indicator element
  const indicatorElement = useMemo(
    () => (
      <span className="flex items-center justify-center gap-1">
        <p className="text-base text-custom-text-300 !leading-3">{`${completed}/${total}`}</p>
      </span>
    ),
    [completed, total]
  );

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={t("common.checklist")}
      indicatorElement={indicatorElement}
      actionItemElement={
        !disabled && (
          <IssueChecklistActionButton
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            issueId={issueId}
            disabled={disabled}
            issueServiceType={issueServiceType}
          />
        )
      }
    />
  );
});

