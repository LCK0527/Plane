# Python imports
import json

# Django imports
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from .. import BaseAPIView
from plane.api.serializers.issue import IssueChecklistItemSerializer
from plane.db.models import IssueChecklistItem, Workspace
from plane.bgtasks.issue_activities_task import issue_activity
from plane.app.permissions import allow_permission, ROLE
from plane.utils.host import base_host


class IssueChecklistEndpoint(BaseAPIView):
    serializer_class = IssueChecklistItemSerializer
    model = IssueChecklistItem

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, issue_id):
        """List all checklist items for an issue"""
        checklist_items = IssueChecklistItem.objects.filter(
            issue_id=issue_id,
            issue__project_id=project_id,
            issue__project__workspace__slug=slug
        ).order_by("sort_order", "created_at")
        
        serializer = IssueChecklistItemSerializer(checklist_items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def post(self, request, slug, project_id, issue_id):
        """Create a new checklist item"""
        # Get the issue first
        from plane.db.models import Issue
        try:
            issue = Issue.objects.get(
                id=issue_id,
                project_id=project_id,
                project__workspace__slug=slug
            )
        except Issue.DoesNotExist:
            return Response(
                {"error": "Issue not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Debug: Log the incoming data
        print(f"[DEBUG] Received request.data: {request.data}")
        print(f"[DEBUG] Type of request.data: {type(request.data)}")
        print(f"[DEBUG] Keys in request.data: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
        
        # Ensure title/name is provided and not empty
        data = request.data.copy()
        
        # Backend model uses 'title', but accept 'name' from frontend for compatibility
        # Priority: name > title
        title_value = data.get("name") or data.get("title", "")
        
        # Handle case where title/name might be an array (defensive programming)
        if isinstance(title_value, list):
            print(f"[DEBUG] Title/name is an array: {title_value}")
            title_value = title_value[0].strip() if len(title_value) > 0 and title_value[0] else ""
        elif title_value:
            title_value = str(title_value).strip()
        else:
            title_value = ""
        
        print(f"[DEBUG] Final title value: {title_value}, type: {type(title_value)}")
        
        if not title_value:
            return Response(
                {"name": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean data - only include allowed fields
        # Map 'name' to 'title' for the model
        cleaned_data = {
            "title": title_value,  # Model field is 'title'
            "is_completed": data.get("is_completed", False),
        }
        
        # Add assignee if provided
        if data.get("assignee"):
            cleaned_data["assignee"] = data.get("assignee")
        
        # Pass issue through context
        serializer = IssueChecklistItemSerializer(
            data=cleaned_data,
            context={"request": request, "issue": issue}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Create activity
            issue_activity.delay(
                type="checklist_item.activity.created",
                requested_data=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                current_instance=None,
                issue_id=str(issue_id),
                project_id=str(project_id),
                actor_id=str(request.user.id),
                epoch=int(timezone.now().timestamp()),
                notification=False,
                origin=base_host(request=request, is_app=True),
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def patch(self, request, slug, project_id, issue_id, pk):
        """Update a checklist item"""
        try:
            checklist_item = IssueChecklistItem.objects.get(
                pk=pk,
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__project__workspace__slug=slug
            )
        except IssueChecklistItem.DoesNotExist:
            return Response(
                {"error": "Checklist item not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_instance = IssueChecklistItemSerializer(checklist_item).data
        
        # If marking as completed, set completed_by and completed_at
        if request.data.get("is_completed") is True and not checklist_item.is_completed:
            request.data["completed_by"] = request.user.id
            request.data["completed_at"] = timezone.now()
        elif request.data.get("is_completed") is False and checklist_item.is_completed:
            request.data["completed_by"] = None
            request.data["completed_at"] = None
        
        serializer = IssueChecklistItemSerializer(checklist_item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Create activity and send notification if completed
            if request.data.get("is_completed") is True and not old_instance.get("is_completed"):
                issue_activity.delay(
                    type="checklist_item.activity.completed",
                    requested_data=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                    current_instance=json.dumps(old_instance, cls=DjangoJSONEncoder),
                    issue_id=str(issue_id),
                    project_id=str(project_id),
                    actor_id=str(request.user.id),
                    epoch=int(timezone.now().timestamp()),
                    notification=True,
                    origin=base_host(request=request, is_app=True),
                )
            else:
                issue_activity.delay(
                    type="checklist_item.activity.updated",
                    requested_data=json.dumps(serializer.data, cls=DjangoJSONEncoder),
                    current_instance=json.dumps(old_instance, cls=DjangoJSONEncoder),
                    issue_id=str(issue_id),
                    project_id=str(project_id),
                    actor_id=str(request.user.id),
                    epoch=int(timezone.now().timestamp()),
                    notification=False,
                    origin=base_host(request=request, is_app=True),
                )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def delete(self, request, slug, project_id, issue_id, pk):
        """Delete a checklist item"""
        try:
            checklist_item = IssueChecklistItem.objects.get(
                pk=pk,
                issue_id=issue_id,
                issue__project_id=project_id,
                issue__project__workspace__slug=slug
            )
        except IssueChecklistItem.DoesNotExist:
            return Response(
                {"error": "Checklist item not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_instance = IssueChecklistItemSerializer(checklist_item).data
        checklist_item.delete()
        
        issue_activity.delay(
            type="checklist_item.activity.deleted",
            requested_data=None,
            current_instance=json.dumps(old_instance, cls=DjangoJSONEncoder),
            issue_id=str(issue_id),
            project_id=str(project_id),
            actor_id=str(request.user.id),
            epoch=int(timezone.now().timestamp()),
            notification=False,
            origin=base_host(request=request, is_app=True),
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)

