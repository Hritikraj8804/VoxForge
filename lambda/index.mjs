import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const polly = new PollyClient({});
const s3 = new S3Client({});

const BUCKET_NAME = "YOUR_BUCKET_NAME_HERE"; // TODO: replace with your bucket name

export const handler = async (event) => {
    try {
        // ✅ Handle CORS
        if (event.requestContext?.http?.method === "OPTIONS") {
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                body: ""
            };
        }

        const body = JSON.parse(event.body || "{}");
        const text = body.text;
        const voice = body.voice || "Joanna";
        const rate = body.rate || "medium";

        if (!text) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Text is required" })
            };
        }

        // 🎤 SSML (rate control)
        const ssmlText = `
        <speak>
            <prosody rate="${rate}">
                ${text}
            </prosody>
        </speak>`;

        // 🔑 Hash (include voice + rate)
        const hash = crypto
            .createHash("md5")
            .update(text + voice + rate)
            .digest("hex");

        const fileName = `audio-${hash}.mp3`;

        // 🚀 CACHE CHECK
        try {
            await s3.send(new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: fileName
            }));

            const signedUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: fileName
                }),
                { expiresIn: 300 }
            );

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    message: "Fetched from cache",
                    audioUrl: signedUrl
                })
            };

        } catch (err) {
            // not found → continue
        }

        // 🎤 Polly call
        const pollyRes = await polly.send(
            new SynthesizeSpeechCommand({
                Text: ssmlText,
                OutputFormat: "mp3",
                VoiceId: voice,
                TextType: "ssml"
            })
        );

        const audioStream = await pollyRes.AudioStream.transformToByteArray();

        // 📦 Upload
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: audioStream,
                ContentType: "audio/mpeg"
            })
        );

        // 🔐 Signed URL
        const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: fileName
            }),
            { expiresIn: 300 }
        );

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                message: "Audio generated",
                audioUrl: signedUrl
            })
        };

    } catch (err) {
        console.error(err);

        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};