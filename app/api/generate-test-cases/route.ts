import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// 定义测试用例结构
const testCaseParser = StructuredOutputParser.fromZodSchema(
  z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      steps: z.array(z.string()),
      expectedResults: z.array(z.string()),
      type: z.enum(['functional', 'boundary', 'performance']),
      priority: z.enum(['P0', 'P1', 'P2'])
    })
  )
);

const PROMPT_TEMPLATE = `
<role>
  测试专家，擅长编写高质量测试用例
</role>

<task>
  请为以下功能生成测试用例："{input}"
</task>

<rules>
  1. 测试用例要包含功能测试、边界测试和性能测试
  2. 每个测试用例需要详细的步骤和预期结果
  3. 根据重要程度标注优先级(P0/P1/P2)
</rules>

<output_format>
  {format_instructions}
</output_format>
`;

const prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);

const model = new ChatOpenAI(
  {
    modelName: "qwen-max",
    temperature: 1,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
    verbose: true,
  },
  { baseURL: process.env.OPENAI_BASE_URL }
);

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    const formatInstructions = testCaseParser.getFormatInstructions();
    const promptInput = await prompt.format({
      input,
      format_instructions: formatInstructions,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const modelStream = await model.stream([["system", promptInput]]);

          let buffer = "";
          let inJsonBlock = false;

          for await (const chunk of modelStream) {
            const content = typeof chunk === "string" ? chunk : chunk.content || "";
            buffer += content;

            if (!inJsonBlock && buffer.includes("```json")) {
              inJsonBlock = true;
              buffer = buffer.slice(buffer.indexOf("```json") + 7);
              continue;
            }

            if (inJsonBlock) {
              const endIndex = buffer.indexOf("```");
              if (endIndex !== -1) {
                const jsonContent = buffer.slice(0, endIndex);
                for (const char of jsonContent) {
                  controller.enqueue(char);
                }
                inJsonBlock = false;
                break;
              } else {
                for (const char of buffer) {
                  controller.enqueue(char);
                }
                buffer = "";
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error('生成测试用例时出错:', error);
    return new Response(
      JSON.stringify({ error: '生成测试用例失败' }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
} 