import React from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import styled from 'styled-components';

interface MindMapProps {
  data: {
    title: string;
    topics: Array<{
      title: string;
      description: string;
      steps: string[];
      expectedResults: string[];
      type: string;
      priority: string;
    }>;
  };
}

// 添加样式组件
const StyledNode = styled.div`
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: inline-block;
  background: white;
  min-width: 150px;
  margin: 10px 0;
`;

const StyledTree = styled(Tree)`
  padding: 20px;
  width: 100%;
  overflow-x: auto;

  // 根节点容器
  & > div {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  // 所有层级的容器
  & ul {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    padding: 0 !important;
    margin: 0 20px !important;
    list-style: none !important;
  }

  // 节点容器
  & li {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    padding: 0 10px !important;
    position: relative !important;
  }

  // 连接线
  & .oc-line {
    transform: rotate(-90deg);
  }
`;

const StepsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
  
  & > div {
    padding: 4px;
    border-bottom: 1px solid #eee;
    white-space: normal;
    word-break: break-word;
  }
`;

export function MindMapViewer({ data }: MindMapProps) {
  return (
    <StyledTree
      lineWidth={'2px'}
      lineColor={'#bbb'}
      lineBorderRadius={'10px'}
      label={<StyledNode>{data.title}</StyledNode>}
    >
      {data.topics.map((topic) => (
        <TreeNode 
          key={topic.title}
          label={
            <StyledNode>
              <div className="font-bold">{topic.title}</div>
              <div className="text-sm text-gray-600">
                {topic.type} | {topic.priority}
              </div>
            </StyledNode>
          }
        >
          <TreeNode label={
            <StyledNode>
              <div>描述:</div>
              <div className="text-sm">{topic.description}</div>
            </StyledNode>
          } />
          <TreeNode label={
            <StyledNode>
              <div>测试步骤:</div>
              <StepsList>
                {topic.steps.map((step, i) => (
                  <div key={i}>
                    {i + 1}. {step}
                  </div>
                ))}
              </StepsList>
            </StyledNode>
          } />
          <TreeNode label={
            <StyledNode>
              <div>预期结果:</div>
              <StepsList>
                {topic.expectedResults.map((result, i) => (
                  <div key={i}>
                    {i + 1}. {result}
                  </div>
                ))}
              </StepsList>
            </StyledNode>
          } />
        </TreeNode>
      ))}
    </StyledTree>
  );
} 