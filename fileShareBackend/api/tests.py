import base64
import random
from django.urls import reverse
from django.core.cache import cache
from django.core import mail
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import EncryptedFile, FileShare
import os
from .utlis import derive_backend_key
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from datetime import timedelta

User = get_user_model()


class EncryptedViews(APITestCase):

    def setUp(self):
        self.register_url = reverse(
            'register')  # Adjust to your RegisterView URL name
        self.login_url = reverse('login')  # Adjust to your LoginView URL name
        self.profile_url = reverse(
            'profile')  # Adjust to your ProfileView URL name
        self.logout_url = reverse(
            'logout')  # Adjust to your LogoutView URL name
        self.owner = User.objects.create_user(username='owner',
                                              password='ownerpass',
                                              email='owner@example.com')
        self.shared_user = User.objects.create_user(username='shared',
                                                    password='sharedpass',
                                                    email='shared@example.com')
        self.client = APIClient()
        # For tests that require authentication, we can force authentication.
        self.client.force_authenticate(user=self.owner)
        # Create a sample user using registration
        self.user_data = {
            "username": "testuser",
            "password": "TestPass123!",
            "email": "testuser@example.com"
        }

        # We'll use the register endpoint to create a user.
        response = self.client.post(self.register_url,
                                    self.user_data,
                                    format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.user = User.objects.get(username=self.user_data["username"])
        self.admin_user = User.objects.create_superuser(
            username='adminuser',
            password='AdminPass123!',
            email='admin@example.com')
        self.test_file1 = EncryptedFile.objects.create(
            owner=self.user,
            file_data=b"Dummy encrypted data 1",
            file_name="file1.pdf",
            salt=base64.b64encode(os.urandom(16)).decode(),
            iv=base64.b64encode(os.urandom(12)).decode(),
        )
        self.test_file2 = EncryptedFile.objects.create(
            owner=self.admin_user,
            file_data=b"Dummy encrypted data 2",
            file_name="file2.pdf",
            salt=base64.b64encode(os.urandom(16)).decode(),
            iv=base64.b64encode(os.urandom(12)).decode(),
        )
        # Clear the cache before each test to avoid stale MFA codes.
        cache.clear()

        # Create an APIClient that includes credentials.
        self.client = APIClient()

    def test_register_success(self):
        # Test registration with a new user
        new_user_data = {
            "username": "newuser",
            "password": "NewPass123!",
            "email": "newuser@example.com"
        }
        response = self.client.post(self.register_url,
                                    new_user_data,
                                    format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("message"),
                         "User registered successfully")
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_validation_error(self):
        # Test registration with missing data (e.g., missing password)
        invalid_data = {
            "username": "invaliduser",
            "email": "invalid@example.com"
        }
        response = self.client.post(self.register_url,
                                    invalid_data,
                                    format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_login_with_invalid_mfa_code(self):
        # Simulate login where an MFA code is provided, but it's invalid.
        # First, generate and store a valid code.
        valid_code = random.randint(100000, 999999)
        cache_key = f"mfa_code_{self.user.id}"
        cache.set(cache_key, valid_code, timeout=300)
        login_data = {
            "username": "testuser",
            "password": "TestPass123!",
            "email_code": "000000"  # an invalid code
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Invalid MFA code", response.data.get("error", ""))

    def test_login_with_valid_mfa_code(self):
        # First login without MFA code to trigger sending
        login_data = {
            "username": "testuser",
            "password": "TestPass123!",
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # Retrieve the MFA code from the cache
        cache_key = f"mfa_code_{self.user.id}"
        valid_code = cache.get(cache_key)
        self.assertIsNotNone(valid_code, "MFA code not set in cache")

        # Now, login with the MFA code
        login_data["email_code"] = str(valid_code)
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_profile_view_authenticated(self):
        # Log in the user first (simulate successful login by setting a JWT cookie manually)
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        self.client.cookies['access_token'] = access_token

        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("user"), self.user.username)
        self.assertEqual(response.data.get("email"), self.user.email)

    def test_profile_view_unauthenticated(self):
        # Without authentication, profile view should return something different.
        self.client.cookies.clear()  # Remove cookies
        response = self.client.get(self.profile_url)
        # Since ProfileView uses IsAuthenticated, we expect a 403 or 401.
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_logout_view(self):
        # Log in first, then logout.
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        self.client.cookies['access_token'] = access_token
        self.client.cookies['refresh_token'] = str(refresh)

        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("message"), "Logout successful")
        # Check that the cookies have been cleared (empty string).
        self.assertEqual(response.cookies.get('access_token').value, '')
        self.assertEqual(response.cookies.get('refresh_token').value, '')

    def _generate_base64_bytes(self, length):
        """Generate random bytes of given length and return as Base64-encoded string."""
        random_bytes = os.urandom(length)
        return base64.b64encode(random_bytes).decode()

    def _upload_file(self, file_content, filename="test.pdf"):
        """
        Simulate file upload using FileUploadView.
        Encrypt the file on the backend using the provided salt and IV.
        """
        # Generate dummy salt and iv (Base64 encoded)
        self.client.force_authenticate(user=self.owner)
        salt_b64 = self._generate_base64_bytes(16)
        iv_b64 = self._generate_base64_bytes(12)

        # Create a SimpleUploadedFile with the given file_content.
        uploaded_file = SimpleUploadedFile(filename,
                                           file_content,
                                           content_type="application/pdf")
        url = reverse('upload')
        data = {
            'file': uploaded_file,
            'salt': salt_b64,
            'iv': iv_b64,
        }

        response = self.client.post(url, data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['file_id'], salt_b64, iv_b64

    def test_get_file_list(self):
        """
        Test that GetFileList returns files that are owned by the user.
        """
        # Upload two files as owner.
        file_id1, _, _ = self._upload_file(b"File one content", "file1.pdf")
        file_id2, _, _ = self._upload_file(b"File two content", "file2.pdf")
        url = reverse('allFiles')  # Adjust URL name for GetFileList view
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        files_data = response.data.get("files")
        self.assertIsInstance(files_data, list)
        # Check that both file IDs appear in the list.
        returned_ids = {f["id"] for f in files_data}
        self.assertIn(file_id1, returned_ids)
        self.assertIn(file_id2, returned_ids)

    def test_file_metadata_view_owner(self):
        """
        Test that FileMetadataView returns all metadata for the owner.
        """
        original_content = b"Owner file content"
        file_id, salt_b64, iv_b64 = self._upload_file(original_content,
                                                      "ownerfile.pdf")
        url = reverse('file-metadata', args=[file_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("file_name"), "ownerfile.pdf")
        self.assertEqual(data.get("salt"), salt_b64)
        self.assertEqual(data.get("iv"), iv_b64)
        self.assertEqual(data.get("mimeType"), "application/pdf")
        self.assertEqual(data.get("access_type"), "owner")

    def test_file_metadata_view_shared(self):
        """
        Test that a file shared with a user returns metadata with full decryption data for download access,
        and possibly limited data for view-only access.
        """
        # Upload a file as owner.
        original_content = b"Shared file content"
        file_id, salt_b64, iv_b64 = self._upload_file(original_content,
                                                      "sharedfile.pdf")

        # Create a FileShare record: share the file with shared_user with "view" access.
        file_obj = EncryptedFile.objects.get(id=file_id)
        FileShare.objects.create(file=file_obj,
                                 user=self.shared_user,
                                 access_type="view")

        # Now, simulate the shared user accessing FileMetadataView.
        self.client.force_authenticate(user=self.shared_user)
        url = reverse('file-metadata', args=[file_id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = (response.json())

        self.assertEqual(data.get("file_name"), "sharedfile.pdf")
        self.assertEqual(data.get("access_type"), "view")

    def test_file_view_shared(self):
        """
        Test that a file shared with a user returns decrypted content when accessed via FileView.
        """
        original_content = b"Shared file download content"
        file_id, salt_b64, iv_b64 = self._upload_file(original_content,
                                                      "shareddownload.pdf")

        # Share the file with shared_user with "download" access.
        file_obj = EncryptedFile.objects.get(id=file_id)
        FileShare.objects.create(file=file_obj,
                                 user=self.shared_user,
                                 access_type="download")

        self.client.force_authenticate(user=self.shared_user)
        url = reverse('filesView', args=[file_id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The decrypted content should match the original content.
        self.assertEqual(response.content, original_content)

    def _encrypt_test_file(self, plaintext, filename="test.pdf"):
        """
        Helper method to simulate file encryption on the backend.
        It generates a random salt (16 bytes) and iv (12 bytes), derives the key using derive_backend_key,
        encrypts the plaintext with AESGCM, and returns:
            - ciphertext (bytes)
            - salt (Base64 encoded string)
            - iv (Base64 encoded string)
        """
        salt_bytes = os.urandom(16)
        iv_bytes = os.urandom(12)
        salt_b64 = base64.b64encode(salt_bytes).decode()
        iv_b64 = base64.b64encode(iv_bytes).decode()
        key = derive_backend_key(salt_bytes)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv_bytes, plaintext, None)
        return ciphertext, salt_b64, iv_b64

    def _create_encrypted_file(self, plaintext, filename="test.pdf"):
        """
        Creates an EncryptedFile instance using the simulated encryption.
        """
        ciphertext, salt_b64, iv_b64 = self._encrypt_test_file(
            plaintext, filename)
        file_instance = EncryptedFile.objects.create(owner=self.owner,
                                                     file_data=ciphertext,
                                                     file_name=filename,
                                                     salt=salt_b64,
                                                     iv=iv_b64)
        return file_instance, salt_b64, iv_b64

    def test_generate_public_link_view(self):
        """
        Test that GeneratePublicLinkView generates a public link with an expiration date.
        """
        self.client.force_authenticate(user=self.owner)
        file_instance, _, _ = self._create_encrypted_file(
            b"Public file content", "public.pdf")
        url = reverse('generate-public-link', args=[file_instance.id])
        data = {"hours_valid": 1}  # public link valid for 1 hour
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("public_url", response.data)
        self.assertIn("expires", response.data)
        # Verify that the file instance now has a public_token set.
        file_instance.refresh_from_db()
        self.assertIsNotNone(file_instance.public_token)
        # Also, expires should be in the future.
        self.assertGreater(file_instance.public_token_expires, timezone.now())

    def test_public_view_metadata(self):
        """
        Test that PublicViewMetaData returns metadata for a file with a valid public token.
        """
        # Create a file and generate a public link.
        file_instance, salt_b64, iv_b64 = self._create_encrypted_file(
            b"Metadata test", "metadata.pdf")
        # Generate a public link (simulate 24-hour validity)
        file_instance.generate_public_link(hours_valid=24)
        public_token = file_instance.public_token

        url = reverse('public-metadata', args=[public_token])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("file_name"), "metadata.pdf")
        self.assertEqual(data.get("salt"), salt_b64)
        self.assertEqual(data.get("iv"), iv_b64)
        self.assertEqual(data.get("mimeType"), "application/pdf")

    def test_public_file_retrieve_view_expired(self):
        """
        Test that PublicFileRetrieveView returns a 410 error if the public link is expired.
        """
        plaintext = b"Expired content"
        file_instance, _, _ = self._create_encrypted_file(
            plaintext, "expired.pdf")
        # Generate a public link and manually set expiration to the past.
        file_instance.generate_public_link(hours_valid=1)
        file_instance.public_token_expires = timezone.now() - timedelta(
            minutes=1)
        file_instance.save()
        public_token = file_instance.public_token

        url = reverse('public-file', args=[public_token])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
        self.assertIn("expired", response.json().get("error", "").lower())

    def test_share_file_view_success(self):
        """
        Test that ShareFileView shares a file with specified users.
        """
        # Create a file owned by self.owner.
        self.client.force_authenticate(user=self.owner)
        file_instance, _, _ = self._create_encrypted_file(
            b"Share test content", "share.pdf")
        url = reverse('share-file', args=[file_instance.id])
        payload = {"shares": [{"user": "shared", "access_type": "download"}]}
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json().get("message"),
                         "File shared successfully.")
        # Verify that file_instance is now shared with the user 'shared'
        file_instance.refresh_from_db()
        self.assertTrue(
            file_instance.shared_with.filter(username="shared").exists())

    def test_share_file_view_invalid(self):
        """
        Test that ShareFileView returns errors when provided invalid share data.
        """
        self.client.force_authenticate(user=self.owner)
        file_instance, _, _ = self._create_encrypted_file(
            b"Invalid share test", "invalid_share.pdf")

        url = reverse('share-file', args=[file_instance.id])
        payload = {
            "shares": [
                {
                    "user": "",
                    "access_type": "view"
                },  # Missing username
                {
                    "user": "nonexistent",
                    "access_type": "download"
                },
                {
                    "user": "shared",
                    "access_type": "invalid"
                }  # Invalid access type
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.json().get("error")
        self.assertTrue(len(errors) >= 1)

    def test_admin_login_success(self):
        """
            Test that an admin user can successfully log in via AdminLoginView.
            Check that the response status is 200 and that the access and refresh tokens are present,
            as well as that HTTP-only cookies are set.
            """
        url = reverse('admin-login')  # Ensure your URL name matches
        data = {"username": "adminuser", "password": "AdminPass123!"}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify response message and user data.
        self.assertEqual(response.data.get("message"),
                         "Admin login successful")
        self.assertIn("user", response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        # Check cookies (simulate checking cookie headers)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)
        # For local testing, secure might be False if you adjust accordingly.

    def test_admin_login_non_admin(self):
        """
        Test that a normal (non-admin) user cannot log in via AdminLoginView.
        Expect a 403 Forbidden response.
        """
        self.client.force_authenticate(user=self.owner)
        url = reverse('admin-login')
        data = {"username": "testuser", "password": "TestPass123!"}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get("error"), "User is not an admin")

    def test_admin_files_view(self):
        """
        Test that the AdminFilesView returns a list of all files when accessed by an admin.
        """
        # Authenticate as admin.
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin-files'
                      )  # Ensure this matches your URL name for AdminFilesView
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The response should be a list of files.
        files_data = response.data
        self.assertIsInstance(files_data, list)
        # Check that both test files (created in setUp) are returned.
        returned_ids = {f['id'] for f in files_data}
        self.assertIn(self.test_file1.id, returned_ids)
        self.assertIn(self.test_file2.id, returned_ids)
        # Optionally, check that the serializer includes owner and shared users.
        for file in files_data:
            self.assertIn("file_name", file)
            self.assertIn("owner", file)
            self.assertIn("shared_with", file)
