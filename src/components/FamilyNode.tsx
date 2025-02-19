import React from 'react';
import { ExtNode } from 'relatives-tree/lib/types';
import { familyNames } from '../data/familyData';

interface Props {
  node: ExtNode;
  style?: React.CSSProperties;
}

const FamilyNode: React.FC<Props> = ({ node, style }) => {
  const nodeStyle: React.CSSProperties = {
    ...style,
    backgroundColor: node.gender === 'male' ? '#e3f2fd' : '#fce4ec',
    border: '1px solid #ccc',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  };

  return (
    <div style={nodeStyle}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
        {familyNames[node.id] || node.id}
      </div>
      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
        {node.gender === 'male' ? '♂' : '♀'}
      </div>
    </div>
  );
};

export default FamilyNode; 