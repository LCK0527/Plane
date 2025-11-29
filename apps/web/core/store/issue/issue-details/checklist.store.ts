import { concat, uniq, set, update } from "lodash-es";
import { action, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TIssueChecklistItem, TIssueServiceType } from "@plane/types";
import { IssueChecklistService } from "@/services/issue/issue_checklist.service";
import type { IIssueRootStore } from "./root.store";
import type { IIssueDetail } from "./root.store";

export interface IIssueChecklistStore {
  checklistItems: Record<string, string[]>; // issueId -> checklistItemIds[]
  checklistItemMap: Record<string, TIssueChecklistItem>;
  
  getChecklistItemsByIssueId: (issueId: string) => TIssueChecklistItem[] | undefined;
  getChecklistProgress: (issueId: string) => { completed: number; total: number; percentage: number };
  fetchChecklist: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueChecklistItem[]>;
  createChecklistItem: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueChecklistItem>) => Promise<TIssueChecklistItem>;
  updateChecklistItem: (workspaceSlug: string, projectId: string, issueId: string, checklistItemId: string, data: Partial<TIssueChecklistItem>) => Promise<TIssueChecklistItem>;
  deleteChecklistItem: (workspaceSlug: string, projectId: string, issueId: string, checklistItemId: string) => Promise<void>;
  addChecklistItems: (issueId: string, items: TIssueChecklistItem[]) => void;
}

export class IssueChecklistStore implements IIssueChecklistStore {
  checklistItems: Record<string, string[]> = {};
  checklistItemMap: Record<string, TIssueChecklistItem> = {};
  
  rootIssueStore: IIssueRootStore;
  rootIssueDetailStore: IIssueDetail;
  issueChecklistService: IssueChecklistService;

  constructor(rootStore: IIssueRootStore, serviceType: TIssueServiceType) {
    makeObservable(this, {
      checklistItems: observable,
      checklistItemMap: observable,
      fetchChecklist: action,
      createChecklistItem: action,
      updateChecklistItem: action,
      deleteChecklistItem: action,
      addChecklistItems: action,
    });
    
    this.rootIssueStore = rootStore;
    this.rootIssueDetailStore = rootStore.issueDetail;
    this.issueChecklistService = new IssueChecklistService(serviceType);
  }

  getChecklistItemsByIssueId = computedFn((issueId: string) => {
    if (!issueId) return undefined;
    const itemIds = this.checklistItems[issueId] ?? [];
    return itemIds.map(id => this.checklistItemMap[id]).filter(Boolean);
  });

  getChecklistProgress = computedFn((issueId: string) => {
    const items = this.getChecklistItemsByIssueId(issueId) ?? [];
    const completed = items.filter(item => item.is_completed).length;
    const total = items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  });

  fetchChecklist = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const response = await this.issueChecklistService.getIssueChecklist(workspaceSlug, projectId, issueId);
    this.addChecklistItems(issueId, response);
    return response;
  };

  addChecklistItems = (issueId: string, items: TIssueChecklistItem[]) => {
    if (items && items.length > 0) {
      const newItemIds = items.map(item => item.id);
      update(this.checklistItems, [issueId], (itemIds = []) => uniq(concat(itemIds, newItemIds)));
      items.forEach(item => set(this.checklistItemMap, item.id, item));
    } else {
      // If no items, initialize empty array
      set(this.checklistItems, issueId, []);
    }
  };

  createChecklistItem = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueChecklistItem>
  ) => {
    const response = await this.issueChecklistService.createChecklistItem(workspaceSlug, projectId, issueId, data);
    this.addChecklistItems(issueId, [response]);
    return response;
  };

  updateChecklistItem = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string,
    data: Partial<TIssueChecklistItem>
  ) => {
    const response = await this.issueChecklistService.updateChecklistItem(
      workspaceSlug,
      projectId,
      issueId,
      checklistItemId,
      data
    );
    set(this.checklistItemMap, checklistItemId, response);
    return response;
  };

  deleteChecklistItem = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    checklistItemId: string
  ) => {
    await this.issueChecklistService.deleteChecklistItem(workspaceSlug, projectId, issueId, checklistItemId);
    const itemIds = this.checklistItems[issueId] ?? [];
    this.checklistItems[issueId] = itemIds.filter(id => id !== checklistItemId);
    delete this.checklistItemMap[checklistItemId];
  };
}

