"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { saveAs } from "file-saver";
import * as xmind from 'xmind';
import { MindMapViewer } from "@/components/mindmap-viewer";
import JSZip from 'jszip';

interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResults: string[];
  type: "functional" | "boundary" | "performance";
  priority: "P0" | "P1" | "P2";
}

interface XMindNode {
  title: string;
  children?: XMindNode[];
  notes?: {
    plain: {
      content: string;
    };
  };
  markers?: string[];
}

function convertTestCasesToXMind(testCases: TestCase[]): XMindNode {
  const root: XMindNode = {
    title: "测试用例",
    children: testCases.map((testCase) => ({
      title: testCase.title,
      children: [
        {
          title: "描述",
          notes: {
            plain: {
              content: testCase.description,
            },
          },
        },
        {
          title: "测试步骤",
          children: testCase.steps.map((step) => ({
            title: step,
          })),
        },
        {
          title: "预期结果",
          children: testCase.expectedResults.map((result) => ({
            title: result,
          })),
        },
      ],
      markers: [`priority-${testCase.priority}`, testCase.type],
    })),
  };

  return root;
}

function generateXMindContent(testCases: TestCase[]) {
  // XMind 工作表结构
  const workbook = {
    version: "2.0",
    sheets: [
      {
        id: "sheet-1",
        title: "测试用例",
        rootTopic: {
          id: "root",
          title: "测试用例",
          children: {
            attached: testCases.map((testCase, index) => ({
              id: `topic-${index}`,
              title: testCase.title,
              children: {
                attached: [
                  {
                    id: `desc-${index}`,
                    title: "描述",
                    notes: {
                      plain: {
                        content: testCase.description,
                      },
                    },
                  },
                  {
                    id: `steps-${index}`,
                    title: "测试步骤",
                    children: {
                      attached: testCase.steps.map((step, stepIndex) => ({
                        id: `step-${index}-${stepIndex}`,
                        title: step,
                      })),
                    },
                  },
                  {
                    id: `results-${index}`,
                    title: "预期结果",
                    children: {
                      attached: testCase.expectedResults.map(
                        (result, resultIndex) => ({
                          id: `result-${index}-${resultIndex}`,
                          title: result,
                        })
                      ),
                    },
                  },
                ],
              },
              markers: [
                `priority-${testCase.priority.toLowerCase()}`,
                testCase.type,
              ],
            })),
          },
        },
      },
    ],
  };

  // 创建 XMind 压缩包结构
  const content = {
    "content.json": JSON.stringify(workbook, null, 2),
    "metadata.json": JSON.stringify({
      creator: {
        name: "Test Case Generator",
        version: "1.0",
      },
      created: new Date().toISOString(),
    }),
  };

  return content;
}

export function TestCaseGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file) return;

    setIsLoading(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;

        const response = await fetch("/api/generate-test-cases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: content }),
        });

        if (!response.ok) {
          throw new Error("生成测试用例失败");
        }

        setProgress(50);

        const result = await response.json();
        // 确保数据结构正确
        setTestCases(result.topics || result); // 如果是数组就直接使用，否则使用 topics 字段

        setProgress(100);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("生成测试用例时出错:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportXMind = async () => {
    try {
      const zip = new JSZip();

      // 1. content.xml - 使用实际的测试用例数据
      const contentXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink" timestamp="${Date.now()}" version="2.0">
          <sheet id="sheet-1">
            <topic id="root">
              <title>测试用例</title>
              <children>
                <topics type="attached">
                  ${testCases.map((testCase, index) => `
                    <topic id="topic-${index}">
                      <title>${testCase.title}</title>
                      <children>
                        <topics type="attached">
                          <topic id="desc-${index}">
                            <title>描述</title>
                            <notes>
                              <plain>${testCase.description}</plain>
                            </notes>
                          </topic>
                          <topic id="steps-${index}">
                            <title>测试步骤</title>
                            <children>
                              <topics type="attached">
                                ${testCase.steps.map((step, stepIndex) => `
                                  <topic id="step-${index}-${stepIndex}">
                                    <title>${step}</title>
                                  </topic>
                                `).join('')}
                              </topics>
                            </children>
                          </topic>
                          <topic id="results-${index}">
                            <title>预期结果</title>
                            <children>
                              <topics type="attached">
                                ${testCase.expectedResults.map((result, resultIndex) => `
                                  <topic id="result-${index}-${resultIndex}">
                                    <title>${result}</title>
                                  </topic>
                                `).join('')}
                              </topics>
                            </children>
                          </topic>
                        </topics>
                      </children>
                    </topic>
                  `).join('')}
                </topics>
              </children>
            </topic>
          </sheet>
        </xmap-content>`;

      // 2. meta.xml
      const metaXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <meta xmlns="urn:xmind:xmap:xmlns:meta:2.0" version="2.0">
          <Creator>
            <Name>Test Case Generator</Name>
            <Version>1.0</Version>
          </Creator>
          <Create>
            <Time>${new Date().toISOString()}</Time>
          </Create>
        </meta>`;

      // 3. manifest.xml
      const manifestXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">
          <file-entry full-path="content.xml" media-type="text/xml"/>
          <file-entry full-path="meta.xml" media-type="text/xml"/>
        </manifest>`;

      // 添加文件到 ZIP
      zip.file("content.xml", contentXml);
      zip.file("meta.xml", metaXml);
      zip.file("META-INF/manifest.xml", manifestXml);

      const zipContent = await zip.generateAsync({ 
        type: "blob",
        mimeType: "application/vnd.xmind.workbook"
      });
      
      saveAs(zipContent, "test-cases.xmind");
    } catch (error) {
      console.error("导出失败:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".md"
              onChange={handleFileUpload}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <Button onClick={handleGenerate} disabled={!file || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "生成测试用例"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportXMind}
            >
              导出到 XMind
            </Button>
          </div>
          {isLoading && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-right">
                {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {testCases && testCases.length > 0 && (
        <>
          <MindMapViewer data={{ 
            title: "测试用例",
            topics: Array.isArray(testCases) ? testCases : []
          }} />
        </>
      )}
    </div>
  );
}

