from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .serializers import UserSerializer, FileShareSerializer, EncryptedFileListSerializer, AdminFileSerializer
from rest_framework import generics, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.parsers import MultiPartParser, FormParser
from .models import EncryptedFile, FileShare
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
import mimetypes
from urllib.parse import quote
import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import Q, Case, When, Value, CharField, Subquery, OuterRef
from .utlis import derive_backend_key
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Register View
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):

        try:

            super().create(request, *args, **kwargs)

            user = User.objects.get(username=request.data["username"])

            return Response(
                {
                    "message": "User registered successfully",
                },
                status=status.HTTP_201_CREATED,
            )

        except ValidationError as ve:
            # Handle validation errors (e.g., incorrect data format)
            key = next(iter(ve.detail))

            return Response(
                {
                    "error": "Validation Error",
                    "details": ve.detail[key][0]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            # Handle other exceptions like database errors

            return Response(
                {
                    "error": "An error occurred",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Login View
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        email_code = request.data.get(
            "email_code")  # MFA code provided by the user

        # Authenticate username and password
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Invalid credentials"},
                            status=status.HTTP_401_UNAUTHORIZED)

        # # Email-based MFA: We'll use email as the second factor.
        # # For simplicity, we assume all users have email MFA enabled.
        # # In a real app, you might check a user field (e.g., user.mfa_enabled)
        cache_key = f"mfa_code_{user.id}"

        # If no email_code provided, generate and send one.
        if not email_code:
            # Generate a 6-digit numeric code
            mfa_code = random.randint(100000, 999999)
            # Store the code in the cache for 5 minutes (300 seconds)
            cache.set(cache_key, mfa_code, timeout=300)
            # Send the code to the user's email
            send_mail(
                subject="Your MFA Code",
                message=f"Your multi-factor authentication code is: {mfa_code}",
                from_email="no-reply@yourdomain.com",
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response(
                {
                    "message":
                    "MFA code sent to your email. Please enter the code."
                },
                status=status.HTTP_202_ACCEPTED)

        # If an email_code is provided, verify it.
        cached_code = cache.get(cache_key)
        if not cached_code or str(cached_code) != str(email_code):
            return Response({"error": "Invalid MFA code."},
                            status=status.HTTP_401_UNAUTHORIZED)

        # If the MFA code is valid, delete it from the cache
        cache.delete(cache_key)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "message": "Login successful",
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK)

        # Set tokens in HTTP-only cookies
        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=True,  # Set True in production
            samesite="None",
            max_age=86400)
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=True,  # Set True in production
            samesite="None",
            max_age=86400)

        return response


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        if not request.user.is_authenticated:
            return Response({
                "message": "Welcome!",
                "user": "Guest",
            })

        return Response({
            "message": "Welcome!",
            "user": request.user.username,
            "email": request.user.email,
        })


class LogoutView(APIView):

    def get(self, request):
        response = Response({"message": "Logout successful"})

        response.set_cookie(
            key="access_token",
            value="",
            httponly=True,
            secure=True,
            samesite="None",
        )
        response.set_cookie(
            key="refresh_token",
            value="",
            httponly=True,
            secure=True,
            samesite="None",
        )
        return response


class FileUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        iv = request.data.get('iv')
        salt = request.data.get('salt')
        if not file or not iv or not salt:
            return Response({'message': 'File, IV, and salt are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:

            raw_data = file.read()

            salt_bytes = base64.b64decode(salt)
            iv_bytes = base64.b64decode(iv)

            key = derive_backend_key(salt_bytes)

            aesgcm = AESGCM(key)
            encrypted_data = aesgcm.encrypt(iv_bytes, raw_data, None)
        except Exception as e:
            return Response({'message': 'Encryption failed: ' + str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create and store the EncryptedFile instance
        encrypted_file = EncryptedFile.objects.create(
            owner=request.user,
            file_data=encrypted_data,
            iv=iv,  # store as provided (Base64 string)
            file_name=file.name,
            salt=salt  # store as provided (Base64 string)
        )

        return Response(
            {
                'message': 'File uploaded successfully',
                'file_id': encrypted_file.id,
            },
            status=status.HTTP_201_CREATED)


class GetFileList(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EncryptedFileListSerializer

    def get_queryset(self):
        user = self.request.user
        # Return files where the owner is the user or the file is shared with the user.
        # distinct() avoids duplicate results if a file is both owned and shared.
        queryset = EncryptedFile.objects.filter(
            Q(owner=user) | Q(shared_with=user)).distinct().select_related(
                'owner').prefetch_related('shared_with')
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        # Wrap the serialized data in a "files" key, similar to your original response.
        return Response({"files": serializer.data}, status=200)


class FileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # Optimize query: allow if owner or shared with the user
        qs = EncryptedFile.objects.select_related('owner').prefetch_related(
            'shared_with').annotate(access_type=Case(
                When(owner=request.user, then=Value("owner")),
                default=Subquery(
                    FileShare.objects.filter(file=OuterRef('pk'),
                                             user=request.user).values(
                                                 'access_type')[:1]),
                output_field=CharField())).filter(id=pk,
                                                  access_type__isnull=False)

        file_instance = get_object_or_404(qs)

        file_name = file_instance.file_name
        content_type, _ = mimetypes.guess_type(file_name)
        if not content_type:
            content_type = "application/octet-stream"
        encoded_filename = quote(file_name)

        # Decrypt the file data:
        try:
            salt_bytes = base64.b64decode(file_instance.salt)
            iv_bytes = base64.b64decode(file_instance.iv)
            key = derive_backend_key(salt_bytes)
            aesgcm = AESGCM(key)
            decrypted_data = aesgcm.decrypt(iv_bytes, file_instance.file_data,
                                            None)
        except Exception as e:
            return Response({'error': 'Decryption failed: ' + str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = HttpResponse(decrypted_data, content_type=content_type)
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        response[
            "Content-Disposition"] = f'attachment; filename="{encoded_filename}"'
        return response


class FileMetadataView(APIView):
    """
    Returns metadata for the requested file:
    - file_name (original file name)
    - salt (Base64 encoded)
    - iv (Base64 encoded)
    - mimeType (guessed from the file name, defaults to application/pdf)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        # Retrieve the file instance ensuring it is owned by the authenticated user.
        qs = EncryptedFile.objects.select_related('owner').prefetch_related(
            'shared_with').annotate(access_type=Case(
                When(owner=request.user, then=Value("owner")),
                default=Subquery(
                    FileShare.objects.filter(file=OuterRef('pk'),
                                             user=request.user).values(
                                                 'access_type')[:1]),
                output_field=CharField())).filter(id=pk,
                                                  access_type__isnull=False)

        file_instance = get_object_or_404(qs)
        # file_share = FileShare.objects.filter(file=file_instance,
        #                                       user=request.user).first()
        # Guess MIME type; if unknown, default to PDF since we only allow PDFs.
        mime_type, _ = mimetypes.guess_type(file_instance.file_name)
        if not mime_type:
            mime_type = "application/pdf"

        data = {
            "file_name": file_instance.file_name,
            "salt": file_instance.salt,
            "iv": file_instance.iv,
            "mimeType": mime_type,
            "access_type": file_instance.access_type
        }
        return JsonResponse(data)


class GeneratePublicLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # Retrieve the file ensuring that the user is the owner.
        file_instance = get_object_or_404(EncryptedFile,
                                          id=pk,
                                          owner=request.user)

        # Optional: Check if a public token already exists and if it's still valid.
        if file_instance.public_token and not file_instance.is_public_link_expired(
        ):
            # Optionally, you can update the expiration or return the existing link.
            public_token = file_instance.public_token
            expires = file_instance.public_token_expires
        else:
            # Generate a new public link valid for the given hours (default 24)
            hours_valid = int(request.data.get('hours_valid', 24))
            file_instance.generate_public_link(hours_valid=hours_valid)
            public_token = file_instance.public_token
            expires = file_instance.public_token_expires

        # Build the public URL. In production, you might include the full domain.
        public_url = public_token
        return Response(
            {
                "message": "Public link generated successfully",
                "public_url": public_url,
                "expires": expires,
            },
            status=status.HTTP_200_OK)


class PublicViewMetaData(APIView):
    """
    Returns metadata for the requested file:
    - file_name (original file name)
    - salt (Base64 encoded)
    - iv (Base64 encoded)
    - mimeType (guessed from the file name, defaults to application/pdf)
    """

    def get(self, request, public_token):
        # Retrieve the file instance ensuring it is owned by the authenticated user.
        file_instance = get_object_or_404(
            EncryptedFile,
            public_token=public_token,
        )
        if file_instance.is_public_link_expired():
            return Response({"error": "This public link has expired."},
                            status=status.HTTP_410_GONE)
        # Guess MIME type; if unknown, default to PDF since we only allow PDFs.
        mime_type, _ = mimetypes.guess_type(file_instance.file_name)
        if not mime_type:
            mime_type = "application/pdf"

        data = {
            "file_name": file_instance.file_name,
            "salt": file_instance.salt,
            "iv": file_instance.iv,
            "mimeType": mime_type,
        }
        return JsonResponse(data)


class PublicFileRetrieveView(APIView):
    permission_classes = []  # No authentication required for public links

    def get(self, request, public_token):
        # Retrieve the file by public token
        file_instance = get_object_or_404(EncryptedFile,
                                          public_token=public_token)

        # Check expiration
        if file_instance.is_public_link_expired():
            return Response({"error": "This public link has expired."},
                            status=status.HTTP_410_GONE)

        # Determine content type (default to PDF)
        file_name = file_instance.file_name
        content_type, _ = mimetypes.guess_type(file_name)
        if not content_type:
            content_type = "application/octet-stream"

        # Encode filename for Content-Disposition
        encoded_filename = quote(file_name)

        try:
            salt_bytes = base64.b64decode(file_instance.salt)
            iv_bytes = base64.b64decode(file_instance.iv)
            key = derive_backend_key(salt_bytes)
            aesgcm = AESGCM(key)
            decrypted_data = aesgcm.decrypt(iv_bytes, file_instance.file_data,
                                            None)
        except Exception as e:
            return Response({'error': 'Decryption failed: ' + str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = HttpResponse(decrypted_data, content_type=content_type)
        file_instance.revoke_public_link()
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        response[
            "Content-Disposition"] = f'attachment; filename="{encoded_filename}"'
        return response


class RevokePublicLinkView(APIView):

    def post(self, request, public_token):
        file_instance = get_object_or_404(EncryptedFile,
                                          public_token=public_token)
        file_instance.revoke_public_link()
        return Response({"message": "Public link revoked successfully."},
                        status=status.HTTP_200_OK)


class ShareFileView(APIView):
    """
    Share a file with specific users by accepting a JSON payload:
    {
      "shares": [
          {"user": "username1", "access_type": "view"},
          {"user": "username2", "access_type": "download"}
      ]
    }
    Only the file owner can share the file.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # Ensure that the file exists and is owned by the authenticated user
        file_instance = get_object_or_404(EncryptedFile,
                                          id=pk,
                                          owner=request.user)
        shares = request.data.get("shares", [])

        if not shares:
            return Response({"error": "No share data provided."},
                            status=status.HTTP_400_BAD_REQUEST)

        errors = []
        for share_data in shares:
            username = share_data.get("user")
            if not username:
                errors.append({"user": "Username is required."})
                continue

            # Look up the user by username
            try:
                target_user = User.objects.get(username=username)
            except User.DoesNotExist:
                errors.append({"user": f"User '{username}' does not exist."})
                continue

            access_type = share_data.get("access_type")
            if access_type not in ['view', 'download']:
                errors.append({
                    "access_type":
                    "Access type must be 'view' or 'download'."
                })
                continue

            # Create or update the share record
            FileShare.objects.update_or_create(
                file=file_instance,
                user=target_user,
                defaults={'access_type': access_type})

        if errors:
            return Response({"error": errors},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "File shared successfully."},
                        status=status.HTTP_200_OK)


class AdminLoginView(APIView):
    """
    Login view for admin staff users. Only a user with is_staff or is_superuser True can log in via this view.
    JWT tokens are set in HTTP‑only cookies.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        # Authenticate user using Django's built-in authenticate function.
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Invalid credentials"},
                            status=status.HTTP_401_UNAUTHORIZED)

        # Ensure the user is an admin (staff or superuser).
        if not (user.is_staff or user.is_superuser):
            return Response({"error": "User is not an admin"},
                            status=status.HTTP_403_FORBIDDEN)

        # Generate JWT tokens using Simple JWT.
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "message": "Admin login successful",
                "user": UserSerializer(user).data,
                "access": access_token,
                "refresh": refresh_token,
            },
            status=status.HTTP_200_OK)

        response.set_cookie(key="access_token",
                            value=access_token,
                            httponly=True,
                            secure=True,
                            samesite="None")
        response.set_cookie(key="refresh_token",
                            value=refresh_token,
                            httponly=True,
                            secure=False,
                            samesite="None")

        return response


class AdminFilesView(APIView):
    # Only superusers can access this view
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # Use select_related and prefetch_related for efficient querying.
        files = EncryptedFile.objects.select_related('owner').prefetch_related(
            'shared_with').all()
        print(files)
        serializer = AdminFileSerializer(files, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
