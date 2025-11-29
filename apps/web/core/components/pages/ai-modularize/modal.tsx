"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { X, Plus, Trash2 } from "lucide-react";
// plane imports
import { MODULE_STATUS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { ModuleStatusIcon } from "@plane/propel/icons";
import { EModalPosition, EModalWidth, ModalCore, Input, TextArea, CustomSelect } from "@plane/ui";
// components
import { DateRangeDropdown } from "@/components/dropdowns/date-range";
// hooks
import { useModule } from "@/hooks/store/use-module";
import { getDate, renderFormattedPayloadDate } from "@plane/utils";

type ModuleData = {
  name: string;
  description: string;
  start_date: string | null;
  target_date: string | null;
  status: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  modules: ModuleData[];
  workspaceSlug: string;
  projectId: string;
  pageName: string;
};

export const AIModularizeModal: React.FC<Props> = observer((props) => {
  const { isOpen, onClose, modules: initialModules, workspaceSlug, projectId, pageName } = props;
  // store hooks
  const { createModule } = useModule();
  const { t } = useTranslation();
  // form
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<{ modules: ModuleData[] }>({
    defaultValues: {
      modules: initialModules,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "modules",
  });

  useEffect(() => {
    if (isOpen && initialModules.length > 0) {
      // Debug: Log modules to ensure description is present
      console.log("Initial modules received:", initialModules);
      initialModules.forEach((mod, idx) => {
        console.log(`Module ${idx + 1}:`, {
          name: mod.name,
          description: mod.description,
          hasDescription: !!mod.description,
          descriptionLength: mod.description?.length || 0,
        });
      });
      reset({ modules: initialModules });
    }
  }, [isOpen, initialModules, reset]);

  const handleCreateModules = async (data: { modules: ModuleData[] }) => {
    if (!workspaceSlug || !projectId) return;

    const validModules = data.modules.filter((m) => m.name && m.name.trim() !== "");
    if (validModules.length === 0) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "錯誤",
        message: "請至少保留一個有效的模組。",
      });
      return;
    }

    try {
      // Create modules sequentially
      const createdModules = [];
      for (const module of validModules) {
        const payload = {
          name: module.name.trim(),
          description: module.description?.trim() || "",
          status: module.status || "planned",
          start_date: module.start_date || null,
          target_date: module.target_date || null,
        };
        const created = await createModule(workspaceSlug, projectId, payload);
        createdModules.push(created);
      }

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "成功",
        message: `成功創建 ${createdModules.length} 個模組。`,
      });

      onClose();
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "錯誤",
        message: error?.detail || error?.error || "創建模組時發生錯誤，請稍後再試。",
      });
    }
  };

  const handleAddModule = () => {
    append({
      name: "",
      description: "",
      start_date: null,
      target_date: null,
      status: "planned",
    });
  };

  if (!isOpen) return null;

  return (
    <ModalCore isOpen={isOpen} position={EModalPosition.TOP} width={EModalWidth.XXL} onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-custom-border-200">
          <div>
            <h2 className="text-xl font-semibold text-custom-text-100">AI 模組化預覽</h2>
            <p className="text-sm text-custom-text-300 mt-1">
              基於頁面「{pageName}」生成的模組，您可以編輯後再創建
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-custom-text-300 hover:text-custom-text-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(handleCreateModules)} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border border-custom-border-200 rounded-lg p-4 space-y-4 bg-custom-background-90"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-custom-text-200">模組 {index + 1}</h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-custom-text-300 hover:text-custom-text-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-custom-text-300 mb-1 block">模組名稱 *</label>
                    <Input
                      {...control.register(`modules.${index}.name` as const, {
                        required: "模組名稱是必填項",
                      })}
                      placeholder="輸入模組名稱"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-custom-text-300 mb-1 block">描述</label>
                    <Controller
                      control={control}
                      name={`modules.${index}.description` as const}
                      render={({ field: { value, onChange } }) => (
                        <TextArea
                          value={value || ""}
                          onChange={onChange}
                          placeholder="輸入模組描述"
                          rows={3}
                          className="w-full"
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-custom-text-300 mb-1 block">狀態</label>
                      <Controller
                        control={control}
                        name={`modules.${index}.status` as const}
                        render={({ field: { value, onChange } }) => {
                          const selectedStatus = MODULE_STATUS.find((s) => s.value === (value || "planned"));
                          return (
                            <CustomSelect
                              value={value || "planned"}
                              label={
                                <div className="flex items-center justify-center gap-2 text-xs py-0.5">
                                  <ModuleStatusIcon status={value || "planned"} />
                                  {selectedStatus ? t(selectedStatus.i18n_label) : "Status"}
                                </div>
                              }
                              onChange={onChange}
                              noChevron
                            >
                              {MODULE_STATUS.map((status) => (
                                <CustomSelect.Option key={status.value} value={status.value}>
                                  <div className="flex items-center gap-2">
                                    <ModuleStatusIcon status={status.value} />
                                    {t(status.i18n_label)}
                                  </div>
                                </CustomSelect.Option>
                              ))}
                            </CustomSelect>
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-custom-text-300 mb-1 block">時間範圍</label>
                    <Controller
                      control={control}
                      name={`modules.${index}.start_date` as const}
                      render={({ field: { value: startDateValue, onChange: onChangeStartDate } }) => (
                        <Controller
                          control={control}
                          name={`modules.${index}.target_date` as const}
                          render={({ field: { value: targetDateValue, onChange: onChangeTargetDate } }) => (
                            <DateRangeDropdown
                              value={{
                                from: getDate(startDateValue),
                                to: getDate(targetDateValue),
                              }}
                              onSelect={(val) => {
                                onChangeStartDate(val?.from ? renderFormattedPayloadDate(val.from) : null);
                                onChangeTargetDate(val?.to ? renderFormattedPayloadDate(val.to) : null);
                              }}
                              buttonVariant="border-with-text"
                              buttonClassName="w-full"
                              placeholder={{
                                from: "開始日期",
                                to: "目標日期",
                              }}
                            />
                          )}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddModule}
              className="w-full border-2 border-dashed border-custom-border-300 rounded-lg p-3 text-custom-text-300 hover:text-custom-text-100 hover:border-custom-border-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              添加模組
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-custom-border-200 px-5 py-4 flex items-center justify-end gap-3">
            <Button variant="neutral-primary" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>
              創建模組
            </Button>
          </div>
        </form>
      </div>
    </ModalCore>
  );
});

