import { NextRequest, NextResponse } from "next/server";
import { vectorSearch } from "@/lib/rag/search";
import { generateAnswer } from "@/lib/rag/generate";

export async function POST(request: NextRequest) {
  try {
    const { question, topK = 5, generateResponse = true } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Vector search
    const results = await vectorSearch(question, topK);

    let answer = null;
    let citations: string[] = [];

    if (generateResponse && results.length > 0) {
      const generated = await generateAnswer(question, results);
      answer = generated.answer;
      citations = generated.citations;
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      question,
      answer,
      citations,
      chunks: results,
      latencyMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
