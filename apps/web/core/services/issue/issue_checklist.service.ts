import { API_BASE_URL } from "@plane/constants";
import type { TIssueChecklistItem, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { APIService } from "@/services/api.service";

export class IssueChecklistService extends APIService {
  private serviceType: TIssueServiceType;

  constructor(serviceType: TIssueServiceType = EIssueServiceType.ISSUES) {
    super(API_BASE_URL);
    this.serviceType = serviceType;
  }

  async getIssueChecklist(
    workspaceSlug: string,
    projectId: string,
    issueId: string
  ): Promise<TIssueChecklistItem[]> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/checklist/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueChecklistItem>
  ): Promise<TIssueChecklistItem> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/checklist/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string,
    data: Partial<TIssueChecklistItem>
  ): Promise<TIssueChecklistItem> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/checklist/${checklistItemId}/`,
      data
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteChecklistItem(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/checklist/${checklistItemId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

