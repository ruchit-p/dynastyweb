import React from 'react';
import calcTree from 'relatives-tree';
import { ExtNode } from 'relatives-tree/lib/types';
import FamilyNode from '../components/FamilyNode';
import { familyData } from '../data/familyData';

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

const WIDTH = 150;
const HEIGHT = 100;

export default function Home() {
  const data = calcTree(familyData, {
    rootId: 'TsyAkbF89',
    placeholders: false,
  });

  return (
    <main className="family-tree-container">
      <div
        className="tree-wrapper"
        style={{
          position: 'relative',
          width: data.canvas.width * WIDTH,
          height: data.canvas.height * HEIGHT,
        }}
      >
        {/* Render connectors first so they appear behind nodes */}
        {data.connectors.map((connector, index) => {
          const [x1, y1, x2, y2] = connector;
          const key = `connector-${index}`;

          // Calculate centered coordinates
          const startX = x1 * WIDTH - (WIDTH / 2.5);
          const startY = y1 * HEIGHT - (HEIGHT / 2.5);
          const endX = x2 * WIDTH - (WIDTH / 2.5);
          const endY = y2 * HEIGHT - (HEIGHT / 2.5);

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
              }}
            >
              <svg
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
              >
                <path
                  d={`M ${startX} ${startY} L ${endX} ${endY}`}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>
          );
        })}

        {/* Render nodes on top of connectors */}
        {data.nodes.map((node: ExtNode) => (
          <FamilyNode
            key={node.id}
            node={node}
            style={{
              position: 'absolute',
              width: WIDTH - 20,
              height: HEIGHT - 10,
              transform: `translate(${node.left * WIDTH + 10}px, ${
                node.top * HEIGHT + 5
              }px)`,
            }}
          />
        ))}
      </div>
    </main>
  );
}