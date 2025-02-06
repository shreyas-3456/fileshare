from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response


class CookieJWTAuthentication(JWTAuthentication):
    """Custom JWT authentication that reads the token from an HTTP-only cookie."""

    def authenticate(self, request):

        try:
            token = request.COOKIES.get(
                "access_token")  # Get token from cookies
            if not token:
                return None  # No token found, return None so DRF continues checking

            validated_token = self.get_validated_token(token)  # Validate token

            user = self.get_user(validated_token)  # Get user from token

            return (user, validated_token)
        except AuthenticationFailed:
            # If token is invalid or expired, delete the invalid cookie
            response = Response({"error": "Authentication failed"}, status=401)
            response.delete_cookie("access_token")
            response.delete_cookie("refresh_token")
            return response
