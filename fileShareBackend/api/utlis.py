import base64
from django.conf import settings
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


def derive_backend_key(salt_bytes, iterations=100000):
    """
    Derive an AES-256 key using PBKDF2 with the given salt and the secret from settings.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 32 bytes = 256 bits
        salt=salt_bytes,
        iterations=iterations,
        backend=default_backend())
    return kdf.derive(settings.BACKEND_ENCRYPTION_SECRET)
