"use client";
import type { FC } from "react";
import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { TIssueChecklistItem, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { Button, Input } from "@plane/ui";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  checklistItems: TIssueChecklistItem[];
  checklistHelpers: {
    createChecklistItem: (data: Partial<TIssueChecklistItem>) => Promise<void>;
    updateChecklistItem: (checklistItemId: string, data: Partial<TIssueChecklistItem>) => Promise<void>;
    deleteChecklistItem: (checklistItemId: string) => Promise<void>;
  };
  issueServiceType?: TIssueServiceType;
};

export const ChecklistItemList: FC<Props> = observer((props) => {
  const { workspaceSlug, projectId, issueId, disabled, checklistItems, checklistHelpers, issueServiceType = EIssueServiceType.ISSUES } = props;
  const { t } = useTranslation();
  const [newItemTitle, setNewItemTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = async () => {
    const trimmedTitle = newItemTitle.trim();
    if (!trimmedTitle) {
      // Focus input if empty
      inputRef.current?.focus();
      return;
    }
    
    setIsAdding(true);
    try {
      // Backend expects 'name' field, not 'title'
      const payload = {
        name: trimmedTitle,
        is_completed: false,
      };
      console.log("Creating checklist item with payload:", payload, "Type of name:", typeof payload.name, "Is array:", Array.isArray(payload.name));
      await checklistHelpers.createChecklistItem(payload);
      setNewItemTitle("");
      setIsAdding(false);
    } catch (error: any) {
      console.error("Error creating checklist item:", error);
      // Keep the input value if there's an error
      // Optionally show error message to user
      alert(error?.message || "Failed to create checklist item. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleItem = async (item: TIssueChecklistItem) => {
    try {
      await checklistHelpers.updateChecklistItem(item.id, {
        is_completed: !item.is_completed,
      });
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await checklistHelpers.deleteChecklistItem(itemId);
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {checklistItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 group hover:bg-custom-background-90 rounded px-2 py-1.5"
        >
          <button
            type="button"
            onClick={() => !disabled && handleToggleItem(item)}
            disabled={disabled}
            className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              item.is_completed
                ? "bg-custom-primary-100 border-custom-primary-100"
                : "border-custom-border-300 hover:border-custom-primary-100"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            {item.is_completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>
          <input
            type="text"
            value={item.name || item.title || ""}
            onChange={(e) => {
              if (!disabled) {
                checklistHelpers.updateChecklistItem(item.id, { name: e.target.value });
              }
            }}
            disabled={disabled}
            className={`flex-1 text-sm bg-transparent border-none outline-none ${
              item.is_completed ? "line-through text-custom-text-400" : "text-custom-text-200"
            } ${disabled ? "cursor-not-allowed" : ""}`}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-custom-background-80 rounded transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5 text-custom-text-400" />
            </button>
          )}
        </div>
      ))}
      
      {!disabled && (
        <div className="flex items-center gap-2 mt-1">
          <Input
            ref={inputRef}
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddItem();
              } else if (e.key === "Escape") {
                setNewItemTitle("");
                setIsAdding(false);
              }
            }}
            onFocus={() => setIsAdding(true)}
            placeholder={t("issue.checklist.add_item_placeholder")}
            className="flex-1 text-sm"
          />
          <Button
            variant="neutral-primary"
            size="sm"
            onClick={() => {
              if (!newItemTitle.trim()) {
                setIsAdding(true);
                // Focus the input after a short delay to ensure it's rendered
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 0);
              } else {
                handleAddItem();
              }
            }}
            disabled={isAdding && !newItemTitle.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
});

