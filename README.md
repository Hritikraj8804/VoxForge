# Lambda Voice Generator

A serverless text-to-speech application powered by AWS Lambda and Amazon Polly, with intelligent caching and a responsive web frontend.

## Overview

This project provides a complete serverless solution for converting text to speech using AWS services. It combines a Node.js Lambda backend with Amazon Polly for speech synthesis and S3 for caching, all exposed through a modern web interface.

## Architecture

### System Architecture Diagram

<img width="1463" height="682" alt="diagram" src="https://github.com/user-attachments/assets/190d0763-590a-4152-ac92-a2bdf309dcaa" />


### Component Details

#### Frontend (index.html)
- **Technology:** HTML5 + Vanilla JavaScript
- **Features:**
  - Text input field for content to convert
  - Voice selection dropdown (Joanna, Matthew, Brian)
  - Speech rate control (slow, medium, fast)
  - Audio player for generated speech
  - Error handling and loading states

#### Backend (index.mjs)
- **Technology:** Node.js ES6 modules
- **Runtime:** AWS Lambda
- **Key Functions:**
  - Request validation and CORS handling
  - MD5-based cache key generation (text + voice + rate)
  - S3 cache lookup for previously generated audio
  - Amazon Polly integration for speech synthesis
  - Presigned URL generation for audio access

#### AWS Services

##### Amazon Polly
- Converts text to natural-sounding speech
- Supported voices:
  - **Joanna** - Female, Standard quality
  - **Matthew** - Male, Standard quality
  - **Brian** - Male, Standard quality
- Prosody rate control via SSML markup (0.5x to 2x speed)

##### Amazon S3
- Stores generated audio files (MP3 format)
- Cache validity: Permanent (based on MD5 hash of input)
- Access method: Presigned URLs (5-minute expiration)
- Bucket structure: Audio files named by MD5 hash

##### AWS Lambda
- Serverless compute platform
- Handles API requests and orchestrates services
- CORS-enabled for cross-origin requests

## Features

✅ **Intelligent Caching**
- MD5 hash-based cache keys prevent duplicate syntheses
- Reduces costs and improves response times for repeated requests

✅ **Multiple Voice Options**
- 3 professional voices to choose from
- Natural speech quality from AWS Polly

✅ **Speech Rate Control**
- Adjustable playback speed (slow, medium, fast)
- Uses SSML prosody tags for rate customization

✅ **Presigned URLs**
- Secure, time-limited access to audio files
- 5-minute expiration for generated audio

✅ **CORS Support**
- Cross-origin requests enabled
- Supports both preflight (OPTIONS) and direct (POST) requests

✅ **Error Handling**
- Comprehensive error messages
- Graceful failure states in frontend

## Setup & Deployment

### Prerequisites

- AWS Account with appropriate IAM permissions:
  - AWS Lambda access
  - Amazon Polly full access
  - Amazon S3 read/write access
- Node.js 18+ (for local testing)

### Configuration

1. **Update S3 Bucket Name**
   - In `index.mjs`, replace `YOUR_BUCKET_NAME_HERE` with your actual S3 bucket name
   - Line reference in code:
     ```javascript
     const bucketName = 'YOUR_BUCKET_NAME_HERE';
     ```

2. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://your-bucket-name --region us-east-1
   ```

3. **IAM Policy** (attach to Lambda execution role)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "polly:SynthesizeSpeech"
         ],
         "Resource": "*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:HeadObject"
         ],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

### Deployment Steps

1. **Create Lambda Function**
   - Go to AWS Lambda Console
   - Create new function (Node.js 18.x or later runtime)
   - Copy `index.mjs` code into the function editor

2. **Deploy Frontend**
   - Host `index.html` on:
     - AWS S3 (static website hosting)
     - AWS CloudFront (CDN)
     - Any web server or static hosting service
   - Update the Lambda URL in the frontend if using custom domain

3. **Create Function URL or API Gateway**
   - Enable Lambda Function URL for direct HTTP access
   - Or use API Gateway for more control

4. **Test Deployment**
   - Access the frontend URL
   - Enter text, select voice and rate
   - Click "Generate Speech" and verify audio plays

## API Specification

### Request Format

**Endpoint:** Lambda Function URL or API Gateway endpoint

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "text": "Hello, world!",
  "voice": "Joanna",
  "rate": "medium"
}
```

**Parameters:**
| Parameter | Type | Required | Options |
|-----------|------|----------|---------|
| `text` | string | Yes | Any text (max 3000 chars recommended) |
| `voice` | string | Yes | "Joanna", "Matthew", "Brian" |
| `rate` | string | Yes | "slow" (0.5x), "medium" (1x), "fast" (2x) |

### Response Format

**Success (200 OK):**
```json
{
  "url": "https://s3.amazonaws.com/your-bucket/hash.mp3?...signed-url...",
  "cacheHit": false,
  "message": "Speech generated successfully"
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | Presigned URL for the generated audio file |
| `cacheHit` | boolean | true if audio was retrieved from cache, false if newly generated |
| `message` | string | Status message |

**Error (400 Bad Request):**
```json
{
  "error": "Error description"
}
```

**Example Response with Cache Hit:**
```json
{
  "url": "https://s3.amazonaws.com/your-bucket/5d41402abc4b2a76b9719d911017c592.mp3?X-Amz-Algorithm=...",
  "cacheHit": true,
  "message": "Audio retrieved from cache"
}
```

## Project Structure

```
lambda/
├── README.md              # This file
├── index.mjs              # Lambda handler (backend)
├── index.html             # Frontend UI
├── test.txt               # Sample API request payload
└── sample.txt             # Sample poem for testing
```

## Testing

### Local Testing

1. **Install Dependencies** (for local testing only)
   ```bash
   npm install @aws-sdk/client-polly @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. **Test with Sample Payload**
   - Use `test.txt` as reference for request format
   - Send POST request with JSON body:
     ```bash
     curl -X POST https://your-lambda-url \
       -H "Content-Type: application/json" \
       -d '{"text": "Hello world", "voice": "Joanna", "rate": "medium"}'
     ```

3. **Browser Testing**
   - Open `index.html` in a web browser
   - Enter text, select voice and rate
   - Click "Generate Speech"
   - Verify audio plays correctly

## Performance Considerations

### Latency
- **Cache Hit:** 100-500ms (S3 retrieval)
- **Cache Miss:** 2-5s (Polly synthesis + S3 upload)

### Cost Optimization
- **Caching:** Prevents redundant Polly API calls
- **MD5 Hash:** Ensures identical inputs share cache
- **Presigned URLs:** Eliminates need for persistent storage access

### Scalability
- **Lambda Concurrency:** Configure based on expected load
- **S3 Throughput:** No limits for most use cases
- **Polly Quotas:** Standard account has sufficient quota for most workloads

## Troubleshooting

### Issue: "YOUR_BUCKET_NAME_HERE not found"
- **Solution:** Update the S3 bucket name in `index.mjs` with your actual bucket name

### Issue: "Access Denied" errors
- **Solution:** Verify Lambda execution role has required Polly and S3 permissions

### Issue: Audio file not accessible
- **Solution:** Check presigned URL expiration time and S3 bucket permissions

### Issue: CORS errors in browser
- **Solution:** Verify Lambda is returning correct CORS headers, or configure API Gateway CORS

### Issue: Polly speech quality issues
- **Solution:** Verify text doesn't exceed 3000 characters; use SSML markup for better prosody control

## Supported AWS Regions

- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)
- ap-southeast-1 (Singapore)

Verify Polly and S3 are available in your region.

## Security Considerations

⚠️ **Production Deployments:**
- Use VPC endpoints for S3 and Polly (no internet exposure)
- Implement authentication/authorization layer
- Add rate limiting to prevent abuse
- Use CloudWatch for monitoring and alerting
- Enable S3 bucket versioning and MFA delete
- Encrypt audio files at rest using KMS

## Future Enhancements

- [ ] Add user authentication
- [ ] Implement rate limiting
- [ ] Support additional Polly voices
- [ ] Add SSML markup editing
- [ ] Implement audio download feature
- [ ] Add usage analytics and cost tracking
- [ ] Support multiple output formats (MP3, OGG, PCM)
- [ ] Add webhook callbacks for async processing
- [ ] Implement audio file expiration and cleanup policies


## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review AWS Lambda and Polly documentation
3. Check CloudWatch logs for detailed error messages

---

**Last Updated:** April 2026
