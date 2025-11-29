"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// types
import type { EPageStoreType } from "@/plane-web/hooks/store";
import type { TPageInstance } from "@/store/pages/base-page";
// components
import { AIModularizeModal } from "./modal";
// services
import { ProjectPageService } from "@/services/page/project-page.service";

type Props = {
  page: TPageInstance;
  storeType: EPageStoreType;
};

const projectPageService = new ProjectPageService();

export const PageAIModularizeButton: React.FC<Props> = observer((props) => {
  const { page } = props;
  const { workspaceSlug, projectId, pageId } = useParams();
  // states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState<Array<{
    name: string;
    description: string;
    start_date: string | null;
    target_date: string | null;
    status: string;
  }>>([]);

  const handleClick = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    // Check if page has content
    if (!page.description_html || page.description_html.trim() === "") {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "錯誤",
        message: "頁面內容為空，請先添加內容再進行模組化。",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await projectPageService.aiModularize(
        workspaceSlug.toString(),
        projectId.toString(),
        pageId.toString()
      );
      setModules(response.modules);
      setIsModalOpen(true);
    } catch (error: any) {
      const errorMessage = error?.error || error?.detail || "AI 模組化失敗，請稍後再試。";
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "錯誤",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="neutral-primary"
        size="sm"
        onClick={handleClick}
        loading={isLoading}
        className="flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI 模組化
      </Button>
      <AIModularizeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModules([]);
        }}
        modules={modules}
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        projectId={projectId?.toString() ?? ""}
        pageName={page.name ?? ""}
      />
    </>
  );
});

