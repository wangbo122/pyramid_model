import { TestCaseGenerator } from "@/components/test-case-generator";

export default function TestCasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">AI 测试用例生成器</h1>
        <TestCaseGenerator />
      </div>
    </div>
  );
} 