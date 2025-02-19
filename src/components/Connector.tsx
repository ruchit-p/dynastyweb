import React from 'react';
import { Connector as ConnectorType } from 'relatives-tree/lib/types';

interface ConnectorProps {
  connector: ConnectorType;
  width: number;
  height: number;
}

const Connector: React.FC<ConnectorProps> = ({ connector, width, height }) => {
  const [x1, y1, x2, y2] = connector;

  return (
    <div
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
        }}
      >
        <line
          x1={x1 * width}
          y1={y1 * height}
          x2={x2 * width}
          y2={y2 * height}
          stroke="var(--border-color)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export default Connector;