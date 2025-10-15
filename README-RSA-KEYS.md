# RSA Key Management for Encrypted Environment Variables

## Setup (One-time)

### 1. Generate RSA Key Pair
```bash
# Generate private key (2048-bit)
openssl genrsa -out rsa_private.pem 2048

# Extract public key from private key
openssl rsa -in rsa_private.pem -pubout -out rsa_public.pem
```

### 2. Store Keys Securely
- **`rsa_private.pem`** - Keep SECRET! Store outside project directory
- **`rsa_public.pem`** - Safe to share, can be committed to git

## Usage

### Encrypt Secrets
```bash
# Set path to your public key
set RSA_PUBLIC_KEY_PATH=C:\path\to\rsa_public.pem

# Encrypt a secret
node scripts/encrypt-env.js "your-database-password"
# Output: Z2VuZXJhdGVkQmFzZTY0Q2lwaGVydGV4dA...
```

### Update .env File
```env
# Non-secret config
PORTAL_BASE_URL=http://localhost:3001
SUGARCRM_USERNAME=your-username
SUGARCRM_API_URL=https://your-sugarcrm-instance.com

# Encrypted secrets (use *_ENC suffix)
DB_PASSWORD_ENC=Tah7IQHaL8H3wz20Nb2pDaIE5LdUbfqJoe3vHaGjtMgty9g3/0hzMTPERcXHETk8VTYRDta3y5GFCaYvPcFHfQnfXfZ7bIsEmTFJ4dLfnqmz2SQnaElUYyirbX85FlGHYPCfL/KrTymE8QcReRzdiiKVJlI6gSV+FZ1BEYJ/Oztc6KOqJ2sE6bd7WeB6/i+m2QxqL3HU9M5VNjDIkct8TNhaBVRw75CBg8h80pxE4I/jMP2YJm2ZEz7BYrlOQhhNOkPteFPUxKJgFuKa4UTgX+5nG/N+47opMnDydXU/n21MqsJm5SPAcDJHXLl0PuBknMp/n8HX9fqyrGnaqEtzKg==
SUGARCRM_PASSWORD_ENC=BSzn0oAKlie3QDj925Qcrxza7RRr/LDSsCXpNy71BEaofX4tO+CwwoEE1dYOe5AH+KjsB4gOTPmKq1FGiGhPNdFyRn/cuFbxFlUgDcHdrmcdCYT5E4SWNmVKwpXC23cofJdsY7XRwlr5q5ebE9j4KqwGtpqpvcJ7FTr801a5qYv45zqqzLcFulYlbtkcFL3J3Qmpxq3+7y/8Xxbfi5//lcc5AfqqBALul084dkAcMA8C73MB+7/6oENYB5z7th6mJRfadl5g6PNT4fA+HP+3nSAvQi+o7aa3ecYukEPucUjPrr4WOQqGDFJapC307C4L7epoK1Qsqf3jnw3s2Uv7cA==
PORTAL_PASSWORD_ENC=YW5vdGhlckJhc2U2NEJsb2I...

# Private key path for runtime decryption
RSA_PRIVATE_KEY_PATH=C:\path\to\rsa_private.pem
RSA_PUBLIC_KEY_PATH=C:\path\to\rsa_public.pem
```

### Runtime Configuration
The application will automatically:
1. Read `*_ENC` environment variables
2. Decrypt them using the private key
3. Use decrypted values in the application

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RSA_PUBLIC_KEY_PATH` | Path to public key (for encryption) | `C:\keys\rsa_public.pem` |
| `RSA_PRIVATE_KEY_PATH` | Path to private key (for decryption) | `C:\keys\rsa_private.pem` |
| `RSA_PRIVATE_KEY` | Private key content (alternative to path) | `-----BEGIN PRIVATE KEY-----\n...` |

## Security Notes

- **Never commit `rsa_private.pem` to git**
- Store private key in secure location (secret manager, vault, etc.)
- Use different key pairs for different environments (dev/staging/prod)
- Rotate keys periodically

## Troubleshooting

### "Public key not found"
- Set `RSA_PUBLIC_KEY_PATH` environment variable
- Ensure the path is correct and file exists

### "Private key not found" 
- Set `RSA_PRIVATE_KEY_PATH` environment variable
- Or set `RSA_PRIVATE_KEY` with the full PEM content
- Ensure the path is correct and file exists

### "RSA_PRIVATE_KEY or RSA_PRIVATE_KEY_PATH must be set"
- Set one of these environment variables before running the application
