# Python imports
import json
import re
from typing import List, Dict, Any

# Django imports
from rest_framework import status
from rest_framework.response import Response

# Third party imports
from openai import OpenAI

# Module imports
from plane.app.permissions import allow_permission, ROLE
from plane.app.views.base import BaseAPIView
from plane.db.models import Page, Profile, Project
from plane.utils.exception_logger import log_exception


class PageAIModularizeEndpoint(BaseAPIView):
    """
    AI endpoint to break down a page description into modules.
    Returns a list of modules in JSON format that can be used to create modules.
    """

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug, project_id, page_id):
        try:
            # Get the page
            page = Page.objects.get(
                pk=page_id,
                workspace__slug=slug,
                projects__id=project_id,
                projects__project_projectmember__member=request.user,
                projects__project_projectmember__is_active=True,
            )

            # Get page description (HTML or text)
            page_content = ""
            if page.description_html:
                # Convert HTML to plain text for better AI processing
                # Remove HTML tags but keep text content
                import re
                from html import unescape
                page_content = unescape(re.sub(r'<[^>]+>', '', str(page.description_html)))
            elif page.description:
                # If description is JSON, extract text
                if isinstance(page.description, dict):
                    page_content = json.dumps(page.description)
                else:
                    page_content = str(page.description)

            if not page_content or page_content.strip() == "":
                return Response(
                    {"error": "Page description is empty. Please add content to the page first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get user's LLM API key from profile
            try:
                profile = Profile.objects.get(user=request.user)
                user_llm_api_key = profile.theme.get("llm_api_key") if profile.theme else None
            except Profile.DoesNotExist:
                user_llm_api_key = None

            if not user_llm_api_key:
                return Response(
                    {"error": "LLM API key not configured. Please set your API key in account settings."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get project for context
            project = Project.objects.get(pk=project_id, workspace__slug=slug)

            # Create AI prompt
            prompt = f"""You are a project manager breaking down a project into actionable sub-tasks. Analyze the following project page content and split it into specific, executable sub-tasks.

Page Title: {page.name}
Page Content:
{page_content[:4000]}

CRITICAL REQUIREMENTS:
1. LANGUAGE: Use the SAME LANGUAGE as the page content above. If the content is in Chinese, respond in Chinese. If it's in English, respond in English.

2. SUB-TASK NAMES: Each sub-task name should be:
   - SPECIFIC and ACTIONABLE (e.g., "設計登入頁面", "實作 API 端點", "撰寫測試用例")
   - NOT abstract concepts (e.g., avoid "專案目標", "評分指標", "模型與資料集")
   - NOT include words like "模組", "Module", "模塊", "任務", "Task"
   - Clear about WHAT needs to be done
   Examples:
   - WRONG: "專案目標", "Project Goals", "評分指標模組"
   - CORRECT: "定義專案目標文件", "Define Project Goals Document", "設計評分指標系統"

3. DESCRIPTION: You MUST provide a detailed description for EVERY sub-task. The description field is MANDATORY and CANNOT be empty, null, or blank. Each description should be 2-4 sentences explaining:
   - What specific work needs to be done
   - What deliverables or outputs are expected
   - What steps or components are involved
   - Any dependencies or requirements

4. DATES - CRITICAL: You MUST extract timeline information from the page content and set dates accordingly:
   - CAREFULLY READ the page content for any mentioned dates, deadlines, timelines, or time constraints
   - If the page mentions a final deadline (e.g., "截止日期", "deadline", "due date", "提交日期", "submission date", "交付日期"), ALL sub-task target_date MUST be BEFORE that deadline
   - If the page mentions a start date or project start time, use that as reference for the first sub-task's start_date
   - If the page mentions specific milestones or phases with dates, align sub-task dates accordingly
   - start_date: The suggested start date in YYYY-MM-DD format (REQUIRED, cannot be null)
   - target_date: The suggested completion date in YYYY-MM-DD format (REQUIRED, cannot be null)
   - Dates should be realistic, sequential, and based on the timeline mentioned in the page content
   - If no specific dates are mentioned in the content, estimate reasonable dates based on the project scope
   - IMPORTANT: If a final deadline is mentioned, ensure ALL target_date values are BEFORE that deadline

5. Each sub-task should be:
   - A concrete, executable work item
   - Independent enough to be assigned and tracked separately
   - Specific enough that someone can understand what needs to be done

Based on this content, create a JSON array of sub-tasks. Each sub-task MUST have ALL of these fields:
- name: A specific, actionable sub-task name in the same language as the page content. Should describe WHAT needs to be done, not abstract concepts. DO NOT include "模組", "Module", "任務", "Task" or similar words. (REQUIRED)
- description: A detailed description (2-4 sentences) explaining what specific work needs to be done, expected deliverables, and key steps. Must be in the same language as the page content. This field is MANDATORY and cannot be empty, null, or blank. (REQUIRED)
- start_date: Suggested start date in YYYY-MM-DD format. This field is MANDATORY and cannot be null. (REQUIRED)
- target_date: Suggested completion date in YYYY-MM-DD format. This field is MANDATORY and cannot be null. (REQUIRED)
- status: One of ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] (optional, default: "planned")

Return ONLY a valid JSON array, no other text, no markdown, no explanations. Example format (if content is in English):
[
  {{
    "name": "Design login page UI",
    "description": "Create the user login page interface with email/password input fields, remember me checkbox, and forgot password link. Design should follow the application's design system and be responsive for mobile and desktop. Include form validation and error message display.",
    "start_date": "2025-12-01",
    "target_date": "2025-12-05",
    "status": "planned"
  }},
  {{
    "name": "Implement authentication API endpoints",
    "description": "Develop backend API endpoints for user login, registration, and password reset. Include JWT token generation, password hashing using bcrypt, and session management. Add rate limiting and security measures to prevent brute force attacks.",
    "start_date": "2025-12-03",
    "target_date": "2025-12-10",
    "status": "planned"
  }},
  {{
    "name": "Write unit tests for authentication",
    "description": "Create comprehensive unit tests for all authentication functions including login, registration, password reset, and token validation. Test edge cases, error handling, and security scenarios. Achieve at least 90% code coverage.",
    "start_date": "2025-12-08",
    "target_date": "2025-12-12",
    "status": "planned"
  }}
]

Example format (if content is in Chinese):
[
  {{
    "name": "設計登入頁面介面",
    "description": "創建用戶登入頁面介面，包含電子郵件/密碼輸入欄位、記住我選項和忘記密碼連結。設計應遵循應用程式的設計系統，並支援手機和桌面版的響應式設計。包含表單驗證和錯誤訊息顯示。",
    "start_date": "2025-12-01",
    "target_date": "2025-12-05",
    "status": "planned"
  }},
  {{
    "name": "實作認證 API 端點",
    "description": "開發後端 API 端點，用於用戶登入、註冊和密碼重置。包含 JWT 令牌生成、使用 bcrypt 進行密碼加密，以及會話管理。添加速率限制和安全措施以防止暴力破解攻擊。",
    "start_date": "2025-12-03",
    "target_date": "2025-12-10",
    "status": "planned"
  }},
  {{
    "name": "撰寫認證功能的單元測試",
    "description": "為所有認證功能創建全面的單元測試，包括登入、註冊、密碼重置和令牌驗證。測試邊界情況、錯誤處理和安全場景。達到至少 90% 的程式碼覆蓋率。",
    "start_date": "2025-12-08",
    "target_date": "2025-12-12",
    "status": "planned"
  }}
]

Generate 5-10 specific, actionable sub-tasks based on the content. Break down the project into concrete work items that can be assigned and executed.
CRITICAL: Every sub-task MUST have ALL of these fields:
1. A specific, actionable name (NOT abstract concepts, NOT including "模組", "Module", "任務", "Task")
2. A detailed description with 2-4 sentences (NOT empty, NOT null, NOT blank)
3. A start_date in YYYY-MM-DD format (NOT null, NOT empty)
4. A target_date in YYYY-MM-DD format (NOT null, NOT empty)
Make sure the JSON is valid and parseable. Every field must be present in every sub-task."""

            # Call LLM
            try:
                client = OpenAI(api_key=user_llm_api_key)
                chat_completion = client.chat.completions.create(
                    model="gpt-4o-mini",  # Use cost-effective model
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a project manager breaking down projects into specific, actionable sub-tasks. CRITICAL RULES: 1) Always use the SAME LANGUAGE as the input content. 2) Sub-task names MUST be SPECIFIC and ACTIONABLE (e.g., '設計登入頁面', '實作 API 端點'), NOT abstract concepts (e.g., avoid '專案目標', '評分指標'). 3) Sub-task names MUST NOT include words like '模組', 'Module', '任務', 'Task', '模塊'. 4) Every sub-task MUST have a detailed description field (2-4 sentences) that is NOT empty, NOT null, NOT blank. 5) Every sub-task MUST have start_date and target_date in YYYY-MM-DD format, both are REQUIRED and cannot be null. 6) CRITICAL: Extract timeline information from the content. If a final deadline is mentioned, ALL sub-task target_date MUST be BEFORE that deadline. Dates must be realistic and based on the timeline mentioned in the content. 7) Always return valid JSON arrays only, no markdown code blocks, no explanations, no additional text."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,  # Lower temperature for more consistent results
                )
                ai_response = chat_completion.choices[0].message.content.strip()
            except Exception as e:
                log_exception(e)
                return Response(
                    {"error": f"Failed to call LLM API: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Parse AI response - try to extract JSON from markdown code blocks if present
            try:
                # Remove markdown code blocks if present
                json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', ai_response, re.DOTALL)
                if json_match:
                    ai_response = json_match.group(1)
                else:
                    # Try to find JSON array in the response
                    json_match = re.search(r'(\[.*?\])', ai_response, re.DOTALL)
                    if json_match:
                        ai_response = json_match.group(1)

                modules_data = json.loads(ai_response)
                
                # Validate modules data
                if not isinstance(modules_data, list):
                    return Response(
                        {"error": "AI returned invalid format. Expected a JSON array."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Validate and clean each module
                validated_modules = []
                from datetime import datetime, timedelta
                
                # Calculate base dates for auto-generation
                today = datetime.now().date()
                base_start_date = today + timedelta(days=1)  # Start tomorrow
                
                for idx, module in enumerate(modules_data):
                    if not isinstance(module, dict):
                        continue
                    
                    # Clean sub-task name - remove unwanted suffixes
                    raw_name = module.get("name", "").strip()
                    # Remove common suffixes that shouldn't be in task names
                    name = raw_name.replace("模組", "").replace("Module", "").replace("模塊", "").replace("任務", "").replace("Task", "").strip()
                    # If name becomes empty after removing suffix, use original
                    if not name:
                        name = raw_name
                    
                    # Get description - must not be empty
                    description = module.get("description", "").strip() if module.get("description") else ""
                    
                    # If description is empty, generate a meaningful one based on the name
                    if not description:
                        # Try to detect language from name
                        if any(ord(char) > 127 for char in name):
                            # Likely Chinese
                            description = f"完成 {name} 相關的工作。包括具體實作步驟、所需資源和預期交付成果。"
                        else:
                            # Likely English
                            description = f"Complete work related to {name}. Includes specific implementation steps, required resources, and expected deliverables."
                    
                    # Get and validate start_date
                    start_date = module.get("start_date")
                    llm_provided_start = bool(start_date and start_date.strip() != "")
                    
                    if not start_date or start_date.strip() == "":
                        # Auto-generate start date: stagger tasks by 2 days each
                        auto_start = base_start_date + timedelta(days=idx * 2)
                        start_date = auto_start.strftime("%Y-%m-%d")
                    else:
                        # Validate date format
                        try:
                            datetime.strptime(start_date, "%Y-%m-%d")
                        except ValueError:
                            # Invalid format, use auto-generated
                            auto_start = base_start_date + timedelta(days=idx * 2)
                            start_date = auto_start.strftime("%Y-%m-%d")
                            llm_provided_start = False
                    
                    # Get and validate target_date
                    target_date = module.get("target_date")
                    llm_provided_target = bool(target_date and target_date.strip() != "")
                    
                    if not target_date or target_date.strip() == "":
                        # Auto-generate target date: 5-7 days after start date
                        try:
                            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                            auto_target = start_dt + timedelta(days=5 + (idx % 3))  # 5-7 days
                            target_date = auto_target.strftime("%Y-%m-%d")
                        except:
                            # Fallback if start_date parsing fails
                            auto_target = base_start_date + timedelta(days=idx * 2 + 5)
                            target_date = auto_target.strftime("%Y-%m-%d")
                            llm_provided_target = False
                    else:
                        # Validate date format
                        try:
                            datetime.strptime(target_date, "%Y-%m-%d")
                        except ValueError:
                            # Invalid format, use auto-generated
                            try:
                                start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                                auto_target = start_dt + timedelta(days=5)
                                target_date = auto_target.strftime("%Y-%m-%d")
                            except:
                                auto_target = base_start_date + timedelta(days=idx * 2 + 5)
                                target_date = auto_target.strftime("%Y-%m-%d")
                            llm_provided_target = False
                    
                    # Validate date logic: target_date should be after start_date
                    try:
                        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                        target_dt = datetime.strptime(target_date, "%Y-%m-%d").date()
                        if target_dt < start_dt:
                            # If target is before start, fix it
                            target_dt = start_dt + timedelta(days=5)
                            target_date = target_dt.strftime("%Y-%m-%d")
                            llm_provided_target = False
                    except:
                        pass
                    
                    validated_module = {
                        "name": name,
                        "description": description,
                        "start_date": start_date,
                        "target_date": target_date,
                        "status": module.get("status", "planned") if module.get("status") in ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] else "planned",
                    }
                    
                    # Only add if name is not empty (all other fields are guaranteed to have values now)
                    if validated_module["name"]:
                        validated_modules.append(validated_module)

                if not validated_modules:
                    return Response(
                        {"error": "AI did not generate any valid modules. Please try again or edit manually."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Debug: Log the response to ensure description is included
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Returning {len(validated_modules)} modules with descriptions")
                for idx, mod in enumerate(validated_modules):
                    logger.info(f"Module {idx+1}: name={mod['name']}, description_length={len(mod.get('description', ''))}, has_description={bool(mod.get('description'))}")

                return Response(
                    {
                        "modules": validated_modules,
                        "page_id": str(page.id),
                        "page_name": page.name,
                    },
                    status=status.HTTP_200_OK,
                )

            except json.JSONDecodeError as e:
                log_exception(e)
                return Response(
                    {
                        "error": "AI returned invalid JSON. Please try again or edit manually.",
                        "raw_response": ai_response[:500],  # Include first 500 chars for debugging
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Page.DoesNotExist:
            return Response(
                {"error": "Page not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

