# Django imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.views.base import BaseAPIView
from plane.db.models import Profile


class UserLLMApiKeyEndpoint(BaseAPIView):
    """
    Endpoint to get and update user's LLM API key.
    The API key is stored in the user's profile theme JSON field.
    """

    def get(self, request):
        """Get user's LLM API key"""
        try:
            profile = Profile.objects.get(user=request.user)
            llm_api_key = ""
            if profile.theme and isinstance(profile.theme, dict):
                llm_api_key = profile.theme.get("llm_api_key", "")
            
            return Response(
                {"llm_api_key": llm_api_key},
                status=status.HTTP_200_OK,
            )
        except Profile.DoesNotExist:
            return Response(
                {"llm_api_key": ""},
                status=status.HTTP_200_OK,
            )

    def patch(self, request):
        """Update user's LLM API key"""
        try:
            profile = Profile.objects.get(user=request.user)
            
            # Get the new API key from request
            llm_api_key = request.data.get("llm_api_key", "").strip()
            
            # Initialize theme if it doesn't exist
            if not profile.theme or not isinstance(profile.theme, dict):
                profile.theme = {}
            
            # Update the API key in theme
            profile.theme["llm_api_key"] = llm_api_key
            profile.save()
            
            return Response(
                {"llm_api_key": llm_api_key, "message": "API key updated successfully"},
                status=status.HTTP_200_OK,
            )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

