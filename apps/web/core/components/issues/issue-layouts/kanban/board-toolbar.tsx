"use client";

import { observer } from "mobx-react";
import { X } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { TIssueGroupByOptions, TIssueOrderByOptions } from "@plane/types";
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
// hooks
import { useUser } from "@/hooks/store/user/user-user";
// types

export type TCardSize = "compact" | "default" | "comfortable";
export type TSwimlanePreset = "none" | "assignee" | "priority" | "labels";

interface BoardToolbarProps {
  // Swimlanes
  groupBy: TIssueGroupByOptions | null;
  subGroupBy: TIssueGroupByOptions | null;
  onSwimlaneChange: (preset: TSwimlanePreset) => void;
  
  // Card size
  cardSize: TCardSize;
  onCardSizeChange: (size: TCardSize) => void;
  
  // Quick filters
  onQuickFilter: (filter: "my-issues" | "high-priority" | "due-this-week" | "clear") => void;
  activeQuickFilters: Set<string>;
  
  // Sort
  orderBy: TIssueOrderByOptions | undefined;
  onSortChange: (orderBy: TIssueOrderByOptions) => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = observer((props) => {
  const {
    groupBy,
    subGroupBy,
    onSwimlaneChange,
    cardSize,
    onCardSizeChange,
    onQuickFilter,
    activeQuickFilters,
    orderBy,
    onSortChange,
  } = props;
  
  const { t } = useTranslation();
  // Note: currentUser is available but not used in this component yet
  // const { data: currentUser } = useUser();
  
  // Determine current swimlane preset
  const getCurrentSwimlanePreset = (): TSwimlanePreset => {
    if (groupBy === "state" && subGroupBy === "assignees") return "assignee";
    if (groupBy === "state" && subGroupBy === "priority") return "priority";
    if (groupBy === "state" && subGroupBy === "labels") return "labels";
    return "none";
  };
  
  const currentSwimlane = getCurrentSwimlanePreset();
  
  const handleSwimlaneChange = (preset: TSwimlanePreset) => {
    onSwimlaneChange(preset);
  };
  
  const swimlaneOptions: { value: TSwimlanePreset; label: string }[] = [
    { value: "none", label: "None" },
    { value: "assignee", label: "Assignee" },
    { value: "priority", label: "Priority" },
    { value: "labels", label: "Labels" },
  ];
  
  const cardSizeOptions: { value: TCardSize; label: string }[] = [
    { value: "compact", label: "Compact" },
    { value: "default", label: "Default" },
    { value: "comfortable", label: "Comfortable" },
  ];
  
  const sortOptions: { value: TIssueOrderByOptions; label: string }[] = [
    { value: "-priority", label: "Priority" },
    { value: "-target_date", label: "Due date" },
    { value: "-updated_at", label: "Updated" },
  ];
  
  return (
    <div className="sticky top-0 z-[5] flex items-center gap-3 border-b border-custom-border-200 bg-custom-background-100 px-4 py-2">
      {/* Swimlanes Dropdown */}
      <select
        value={currentSwimlane}
        onChange={(e) => handleSwimlaneChange(e.target.value as TSwimlanePreset)}
        className="h-8 rounded border border-custom-border-300 bg-custom-background-100 px-3 pr-5 text-xs text-custom-text-200 outline-none hover:border-custom-border-400 focus:border-custom-primary-100 focus:ring-1 focus:ring-custom-primary-100 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        }}
      >
        {swimlaneOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Card Size Toggle */}
      <div className="flex items-center gap-1 rounded border border-custom-border-300 p-0.5">
        {cardSizeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onCardSizeChange(option.value)}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              cardSize === option.value
                ? "bg-custom-primary-100 text-white"
                : "text-custom-text-300 hover:bg-custom-background-80"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1" />
      
      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuickFilter("my-issues")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeQuickFilters.has("my-issues")
              ? "border-custom-primary-100 bg-custom-primary-100/10 text-custom-primary-100"
              : "border-custom-border-300 bg-custom-background-100 text-custom-text-300 hover:border-custom-border-400"
          )}
        >
          Only my issues
        </button>
        <button
          onClick={() => onQuickFilter("high-priority")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeQuickFilters.has("high-priority")
              ? "border-custom-primary-100 bg-custom-primary-100/10 text-custom-primary-100"
              : "border-custom-border-300 bg-custom-background-100 text-custom-text-300 hover:border-custom-border-400"
          )}
        >
          High priority
        </button>
        <button
          onClick={() => onQuickFilter("due-this-week")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeQuickFilters.has("due-this-week")
              ? "border-custom-primary-100 bg-custom-primary-100/10 text-custom-primary-100"
              : "border-custom-border-300 bg-custom-background-100 text-custom-text-300 hover:border-custom-border-400"
          )}
        >
          Due this week
        </button>
        {activeQuickFilters.size > 0 && (
          <button
            onClick={() => onQuickFilter("clear")}
            className="flex items-center gap-1 rounded-full border border-custom-border-300 bg-custom-background-100 px-3 py-1 text-xs font-medium text-custom-text-300 transition-colors hover:border-custom-border-400"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
      
      {/* Sort Dropdown */}
      <select
        value={orderBy || "-created_at"}
        onChange={(e) => onSortChange(e.target.value as TIssueOrderByOptions)}
        className="h-8 rounded border border-custom-border-300 bg-custom-background-100 px-3 pr-5 text-xs text-custom-text-200 outline-none hover:border-custom-border-400 focus:border-custom-primary-100 focus:ring-1 focus:ring-custom-primary-100 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        }}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

