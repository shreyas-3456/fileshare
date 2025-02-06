from django.contrib.auth.models import User
from django.db import models
import secrets
from datetime import timedelta
from django.utils import timezone

# Custom User Model

ACCESS_CHOICES = [
    ('view', 'View'),
    ('download', 'Download'),
]


# File Model
class EncryptedFile(models.Model):
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name="files")  # User who uploaded the file
    file_name = models.CharField(max_length=255)  # Original filename
    file_data = models.BinaryField(
    )  # Encrypted file data (stored as received)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Public access flag
    iv = models.CharField(max_length=16)
    salt = models.CharField(max_length=64, default='')
    # Users with whom this file is shared

    # Fields for public sharing
    public_token = models.CharField(max_length=64,
                                    blank=True,
                                    null=True,
                                    unique=True)
    public_token_expires = models.DateTimeField(blank=True, null=True)

    shared_with = models.ManyToManyField(User,
                                         through='FileShare',
                                         related_name="shared_files",
                                         blank=True)

    def generate_public_link(self, hours_valid=24):
        """
        Generate a unique public token and set the expiration time.
        """
        self.public_token = secrets.token_urlsafe(32)
        self.public_token_expires = timezone.now() + timedelta(
            hours=hours_valid)
        self.save()

    def is_public_link_expired(self):
        """
        Returns True if the public link is expired.
        """
        if self.public_token_expires:
            return timezone.now() > self.public_token_expires
        return True

    def revoke_public_link(self):
        """
        Revoke the public link by clearing the token and expiration.
        """
        self.public_token = None
        self.public_token_expires = None
        self.save()

    def __str__(self):
        return f"{self.file_name} (Owner: {self.owner.username})"


class FileShare(models.Model):
    file = models.ForeignKey(EncryptedFile, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_type = models.CharField(max_length=10,
                                   choices=ACCESS_CHOICES,
                                   default='view')
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('file', 'user')
