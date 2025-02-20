import React from 'react';
import { ExtNode } from 'relatives-tree/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye } from 'lucide-react';

interface Props {
  node: ExtNode & {
    attributes?: {
      displayName?: string;
      imageUrl?: string;
      isBloodRelated?: boolean;
    };
  };
  style?: React.CSSProperties;
  isSelected?: boolean;
}

const FamilyNode: React.FC<Props> = ({ node, style, isSelected }) => {
  const nodeStyle: React.CSSProperties = {
    ...style,
    backgroundColor: node.gender === 'male' ? '#e3f2fd' : '#fce4ec',
    border: isSelected ? '2px solid rgb(20 83 45)' : '1px solid #ccc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px',
    boxShadow: isSelected 
      ? '0 4px 12px rgba(20, 83, 45, 0.2)' 
      : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
    cursor: 'pointer',
    gap: '8px',
    transform: isSelected ? 'scale(1.05)' : undefined,
    position: 'relative',
  };

  const initials = node.attributes?.displayName
    ? node.attributes.displayName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div style={nodeStyle}>
      {/* Non-blood relationship indicator */}
      {node.attributes?.isBloodRelated === false && (
        <div 
          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md"
          title="Non-blood relationship"
        >
          <Eye className="h-3 w-3 text-gray-500" />
        </div>
      )}
      <Avatar className="h-12 w-12">
        <AvatarImage src={node.attributes?.imageUrl} alt={node.attributes?.displayName || 'Member'} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="text-center">
        <div className="font-medium text-sm truncate max-w-[120px]" title={node.attributes?.displayName}>
          {node.attributes?.displayName || 'Unknown'}
        </div>
      </div>
    </div>
  );
};

export default FamilyNode; 