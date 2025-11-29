"use client";

import React, { useState, useRef } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { PriorityIcon, StateGroupIcon, WorkItemsIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssue, THomeWidgetProps } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { calculateTimeAgo, generateWorkItemLink } from "@plane/utils";
// components
import { ContentOverflowWrapper } from "@/components/core/content-overflow-HOC";
import { ListItem } from "@/components/core/list";
import { Button } from "@plane/propel/button";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useUser } from "@/hooks/store/user/user-user";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// services
import { WorkspaceService } from "@/services/workspace.service";
import { EWidgetKeys, WidgetLoader } from "../loaders/loader";

const WIDGET_KEY = EWidgetKeys.UNASSIGNED_WORK;
const workspaceService = new WorkspaceService();

const fetchUnassignedIssues = async (workspaceSlug: string): Promise<TIssue[]> => {
  try {
    // Fetch workspace-level issues with assignees filter set to None (unassigned)
    const response = await workspaceService.getViewIssues(workspaceSlug, {
      assignees: "None",
      page_size: 50, // Limit to 50 for the widget
    });
    
    // Handle paginated response
    if (response?.results && Array.isArray(response.results)) {
      // Filter to ensure we only get issues with no assignees
      // The backend filter might not catch all cases, so we double-check
      return response.results.filter((issue: TIssue) => 
        !issue.assignee_ids || issue.assignee_ids.length === 0
      );
    }
    
    // Handle direct array response (shouldn't happen but just in case)
    if (Array.isArray(response)) {
      return response.filter((issue: TIssue) => 
        !issue.assignee_ids || issue.assignee_ids.length === 0
      );
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching unassigned issues:", error);
    return [];
  }
};

type UnassignedWorkItemProps = {
  issue: TIssue;
  workspaceSlug: string;
  ref: React.RefObject<HTMLDivElement>;
  onClaim: (issueId: string) => Promise<void>;
};

const UnassignedWorkItem = observer((props: UnassignedWorkItemProps) => {
  const { issue, workspaceSlug, ref, onClaim } = props;
  const { getStateById } = useProjectState();
  const { setPeekIssue } = useIssueDetail();
  const { getProjectIdentifierById } = useProject();
  const { t } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);

  const projectIdentifier = getProjectIdentifierById(issue?.project_id);
  const state = getStateById(issue?.state_id);

  const workItemLink = generateWorkItemLink({
    workspaceSlug: workspaceSlug?.toString(),
    projectId: issue?.project_id,
    issueId: issue?.id,
    projectIdentifier,
    sequenceId: issue?.sequence_id,
    isEpic: issue?.is_epic || false,
  });

  const handlePeekOverview = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const peekDetails = {
      workspaceSlug,
      projectId: issue?.project_id,
      issueId: issue?.id,
    };
    setPeekIssue(peekDetails);
  };

  const handleClaim = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClaiming(true);
    try {
      await onClaim(issue.id);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("toast.success"),
        message: "Work item claimed successfully",
      });
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: "Failed to claim work item",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <ListItem
      key={issue.id}
      id={`unassigned-issue-${issue.id}`}
      itemLink={workItemLink}
      title={issue.name}
      prependTitleElement={
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleClaim}
            disabled={isClaiming}
            className="flex-shrink-0"
          >
            {isClaiming ? "Claiming..." : "Claim"}
          </Button>
          {issue.type_id ? (
            <IssueIdentifier
              size="lg"
              issueTypeId={issue.type_id}
              projectId={issue.project_id || ""}
              projectIdentifier={projectIdentifier || ""}
              issueSequenceId={issue.sequence_id || ""}
              textContainerClassName="text-custom-sidebar-text-400 text-sm whitespace-nowrap"
            />
          ) : (
            <div className="flex gap-2 items-center justify-center">
              <div className="flex-shrink-0 grid place-items-center rounded bg-custom-background-80 size-8">
                <WorkItemsIcon className="size-4 text-custom-text-350" />
              </div>
              <div className="font-medium text-custom-text-400 text-sm whitespace-nowrap">
                {projectIdentifier}-{issue.sequence_id}
              </div>
            </div>
          )}
        </div>
      }
      quickActionElement={
        <div className="flex gap-4">
          {state && (
            <Tooltip tooltipHeading={t("common.state")} tooltipContent={state.name}>
              <div>
                <StateGroupIcon
                  stateGroup={state.group ?? "backlog"}
                  color={state.color}
                  className="h-4 w-4 my-auto"
                  percentage={state.sequence}
                />
              </div>
            </Tooltip>
          )}
          {issue.priority && (
            <Tooltip tooltipHeading={t("common.priority")} tooltipContent={issue.priority}>
              <div>
                <PriorityIcon priority={issue.priority} withContainer size={12} />
              </div>
            </Tooltip>
          )}
        </div>
      }
      parentRef={ref}
      disableLink={false}
      className="bg-transparent my-auto !px-2 border-none py-3"
      itemClassName="my-auto"
      onItemClick={handlePeekOverview}
      preventDefaultProgress
    />
  );
});

export const UnassignedWorkItemsWidget: React.FC<THomeWidgetProps> = observer((props) => {
  const { workspaceSlug } = props;
  const { t } = useTranslation();
  const { projectId } = useParams();
  const { data: currentUser } = useUser();
  const { updateIssue } = useIssuesActions(EIssueServiceType.ISSUES);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unassignedIssues, isLoading, mutate } = useSWR(
    workspaceSlug ? `UNASSIGNED_ISSUES_${workspaceSlug}` : null,
    workspaceSlug ? () => fetchUnassignedIssues(workspaceSlug) : null,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const handleClaim = async (issueId: string) => {
    if (!currentUser?.id || !workspaceSlug) return;
    
    const issue = unassignedIssues?.find((i) => i.id === issueId);
    if (!issue?.project_id) return;

    await updateIssue(issue.project_id, issueId, {
      assignee_ids: [currentUser.id],
    });

    // Revalidate the list to remove the claimed issue
    mutate();
  };

  if (!isLoading && (!unassignedIssues || unassignedIssues.length === 0))
    return (
      <div ref={ref} className="max-h-[500px] overflow-y-scroll">
        <div className="text-base font-semibold text-custom-text-350 mb-4">
          Unassigned Works
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-custom-text-400">
            No unassigned work items available
          </p>
        </div>
      </div>
    );

  return (
    <ContentOverflowWrapper
      maxHeight={415}
      containerClassName="box-border min-h-[250px]"
      fallback={<></>}
      buttonClassName="bg-custom-background-90/20"
    >
      <div className="text-base font-semibold text-custom-text-350 mb-2">
        Unassigned Works
      </div>
      <div className="min-h-[250px] flex flex-col">
        {isLoading && <WidgetLoader widgetKey={WIDGET_KEY} />}
        {!isLoading &&
          unassignedIssues &&
          unassignedIssues.length > 0 &&
          unassignedIssues.map((issue) => (
            <UnassignedWorkItem
              key={issue.id}
              issue={issue}
              workspaceSlug={workspaceSlug}
              ref={ref}
              onClaim={handleClaim}
            />
          ))}
      </div>
    </ContentOverflowWrapper>
  );
});

